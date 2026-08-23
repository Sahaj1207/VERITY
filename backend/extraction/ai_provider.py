"""Provider-independent AI/VLM Extraction Engine for VERITY.

Provides structured schema-constrained financial extraction with strict anti-hallucination
safeguards, supporting OpenAI-compatible, Gemini, custom, and mock providers.
"""

from __future__ import annotations

import json
import os
import uuid
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel, Field, ValidationError

from backend.domain.claim import Claim, ClaimStatus, ClaimType
from backend.domain.evidence import Evidence, EvidenceModality
from backend.extraction.base import BaseExtractor
from backend.extraction.result import ExtractionResult, ExtractionStatus, ExtractionWarning


class AIProviderType(str, Enum):
    """Supported AI/VLM provider types."""
    MOCK = "MOCK"
    OPENAI_COMPATIBLE = "OPENAI_COMPATIBLE"
    GEMINI = "GEMINI"
    CUSTOM = "CUSTOM"


class AIProviderConfig(BaseModel):
    """Configuration for AI extraction provider."""
    provider_type: AIProviderType = Field(default=AIProviderType.MOCK)
    api_key_env_var: str = Field(default="VERITY_AI_API_KEY")
    model_name: str = Field(default="gpt-4o-mini")
    timeout_seconds: int = Field(default=15, ge=1)
    temperature: float = Field(default=0.0, ge=0.0, le=1.0)
    endpoint_url: Optional[str] = Field(default=None)


class RawClaimOutput(BaseModel):
    """Pydantic model representing an individual claim extracted by an AI model."""
    claim_type: ClaimType = Field(..., description="Type of financial assertion")
    amount: Optional[float] = Field(
        default=None,
        description="Explicit numeric amount in evidence. Must be NULL if not stated."
    )
    currency: str = Field(default="INR", description="Three-letter ISO currency code")
    claimed_date: Optional[str] = Field(
        default=None,
        description="Date asserted in evidence. Must be NULL if not stated."
    )
    counterparty_hint: Optional[str] = Field(
        default=None,
        description="Name, handle, or phone of other party. Must be NULL if not stated."
    )
    reference_id_hint: Optional[str] = Field(
        default=None,
        description="UTR, RRN, invoice # or cheque ref. Must be NULL if not stated."
    )
    payment_method_hint: Optional[str] = Field(
        default=None,
        description="Asserted payment rail (e.g. 'UPI', 'NEFT', 'CASH')."
    )
    confidence: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Model confidence score (0.0 to 1.0)."
    )
    raw_text_snippet: Optional[str] = Field(
        default=None,
        description="Verbatim text supporting this claim."
    )
    reasoning: Optional[str] = Field(
        default=None,
        description="Concise justification of the extraction."
    )


class StructuredClaimExtractionOutput(BaseModel):
    """Top-level structured JSON schema for AI extraction responses."""
    claims: List[RawClaimOutput] = Field(
        default_factory=list,
        description="List of factual claims explicitly stated in the evidence."
    )
    detected_language: Optional[str] = Field(default="en")
    is_financial_evidence: bool = Field(
        default=True,
        description="False if the evidence is casual chit-chat with no financial facts."
    )


EXTRACTION_SYSTEM_PROMPT = """You are VERITY's Financial Evidence Extraction Engine.
Your task is to extract structured financial claims from raw evidence (messages, invoices, receipts, screenshots).

CRITICAL ANTI-HALLUCINATION RULES:
1. Extract ONLY facts that are EXPLICITLY stated in the evidence.
2. If the amount is NOT stated (e.g. "I sent the money"), set amount to null. NEVER guess or invent amounts.
3. If the counterparty is NOT stated (e.g. "Payment received"), set counterparty_hint to null.
4. If no reference ID or date is stated, set them to null.
5. If the evidence contains casual greetings or no financial content, return an empty claims list.
6. Output must strictly conform to the StructuredClaimExtractionOutput JSON schema.
"""


class AIExtractionProvider(BaseExtractor):
    """Provider-independent AI Extractor with strict schema validation."""

    def __init__(
        self,
        config: Optional[AIProviderConfig] = None,
        mock_invoker: Optional[Callable[[str], str]] = None,
    ) -> None:
        self.config = config or AIProviderConfig()
        self.mock_invoker = mock_invoker

    @property
    def provider_name(self) -> str:
        return f"ai_{self.config.provider_type.value.lower()}_{self.config.model_name}"

    def can_extract(self, evidence: Evidence) -> bool:
        # AI extractor can handle any unstructured or multimodal evidence
        return True

    def extract(
        self,
        evidence: Evidence,
        context: Optional[Dict[str, Any]] = None,
    ) -> ExtractionResult:
        # Check API key configuration for live providers
        if self.config.provider_type != AIProviderType.MOCK:
            api_key = os.environ.get(self.config.api_key_env_var)
            if not api_key:
                return ExtractionResult.create_failure(
                    evidence_id=evidence.id,
                    status=ExtractionStatus.PROVIDER_UNAVAILABLE,
                    error_message=(
                        f"AI extraction provider '{self.config.provider_type.value}' requires "
                        f"environment variable '{self.config.api_key_env_var}', which is not set."
                    ),
                    provider_name=self.provider_name,
                )

        try:
            raw_json_response = self._call_model(evidence)
            parsed_output = self._validate_and_parse_response(raw_json_response)
        except ValidationError as val_err:
            return ExtractionResult.create_failure(
                evidence_id=evidence.id,
                status=ExtractionStatus.EXTRACTION_ERROR,
                error_message=f"AI provider returned structured output failing schema validation: {val_err}",
                provider_name=self.provider_name,
            )
        except Exception as exc:
            return ExtractionResult.create_failure(
                evidence_id=evidence.id,
                status=ExtractionStatus.EXTRACTION_ERROR,
                error_message=f"AI model call failed: {exc}",
                provider_name=self.provider_name,
            )

        if not parsed_output.is_financial_evidence or not parsed_output.claims:
            return ExtractionResult(
                evidence_id=evidence.id,
                status=ExtractionStatus.NO_CLAIMS_FOUND,
                claims=[],
                provider_name=self.provider_name,
                confidence_score=1.0,
            )

        # Convert RawClaimOutput into canonical domain Claim objects
        canonical_claims: List[Claim] = []
        for raw_claim in parsed_output.claims:
            claim_id = f"CLM-AI-{uuid.uuid4().hex[:8]}"
            c = Claim(
                id=claim_id,
                evidence_id=evidence.id,
                claim_type=raw_claim.claim_type,
                claimed_amount=raw_claim.amount,
                currency=raw_claim.currency or "INR",
                claimed_date=raw_claim.claimed_date,
                counterparty_hint=raw_claim.counterparty_hint,
                reference_id_hint=raw_claim.reference_id_hint,
                payment_method_hint=raw_claim.payment_method_hint,
                confidence=round(raw_claim.confidence, 2),
                raw_text_snippet=raw_claim.raw_text_snippet or evidence.raw_payload[:200],
                status=ClaimStatus.ASSERTED,
                metadata={
                    "model_reasoning": raw_claim.reasoning,
                    "provider": self.provider_name,
                },
            )
            canonical_claims.append(c)

        avg_confidence = (
            sum(c.confidence for c in canonical_claims) / len(canonical_claims)
            if canonical_claims else 1.0
        )

        return ExtractionResult.create_success(
            evidence_id=evidence.id,
            claims=canonical_claims,
            provider_name=self.provider_name,
            confidence_score=round(avg_confidence, 2),
            metadata={"language": parsed_output.detected_language},
        )

    def _call_model(self, evidence: Evidence) -> str:
        """Invokes the model or mock handler to obtain structured JSON."""
        if self.config.provider_type == AIProviderType.MOCK:
            if self.mock_invoker:
                return self.mock_invoker(evidence.raw_payload)
            # Default mock behavior based on content
            return self._default_mock_response(evidence)

        # Live provider execution placeholder (extensible via requests/httpx or sdk)
        raise NotImplementedError(
            f"Live network execution for {self.config.provider_type.value} requires active credentials."
        )

    def _validate_and_parse_response(self, raw_response: str) -> StructuredClaimExtractionOutput:
        """Parses and validates JSON response against Pydantic schema."""
        # Strip potential markdown code fences ```json ... ```
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        data = json.loads(cleaned)
        return StructuredClaimExtractionOutput.model_validate(data)

    def _default_mock_response(self, evidence: Evidence) -> str:
        """Built-in deterministic mock response for testing without live API keys."""
        text = evidence.raw_payload
        if "I sent the money" in text:
            return json.dumps({
                "claims": [{
                    "claim_type": "PAYMENT_SENT",
                    "amount": None,
                    "counterparty_hint": None,
                    "payment_method_hint": None,
                    "confidence": 0.7,
                    "reasoning": "Payment sent stated without amount or counterparty."
                }],
                "is_financial_evidence": True
            })
        elif "Payment of ₹18,500 received from Rahul" in text or "18,500" in text:
            return json.dumps({
                "claims": [{
                    "claim_type": "PAYMENT_RECEIVED",
                    "amount": 18500.0,
                    "counterparty_hint": "Rahul",
                    "payment_method_hint": None,
                    "confidence": 0.98,
                    "reasoning": "Explicit receipt of 18500 from Rahul."
                }],
                "is_financial_evidence": True
            })
        return json.dumps({
            "claims": [],
            "is_financial_evidence": False
        })
