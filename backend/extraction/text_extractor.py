"""Deterministic Text and Multilingual Claim Extractor for VERITY.

Extracts financial assertions, Indian currency amounts, payment rails, and reference IDs
from natural language messages, WhatsApp exports, and multilingual text.
Never hallucinates missing amounts or counterparties.
"""

from __future__ import annotations

import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend.domain.claim import Claim, ClaimStatus, ClaimType
from backend.domain.evidence import Evidence, EvidenceModality
from backend.extraction.base import BaseExtractor
from backend.extraction.result import ExtractionResult, ExtractionStatus, ExtractionWarning


class TextClaimExtractor(BaseExtractor):
    """Deterministic extractor for unstructured messages, chat logs, and physical vouchers."""

    @property
    def provider_name(self) -> str:
        return "deterministic_text"

    def can_extract(self, evidence: Evidence) -> bool:
        return evidence.modality in (
            EvidenceModality.MESSAGING_CHAT,
            EvidenceModality.RECEIPT,
            EvidenceModality.CASH_VOUCHER,
            EvidenceModality.INVOICE,
            EvidenceModality.OTHER,
        )

    # Devanagari digit translation mapping: ० -> 0, १ -> 1, etc.
    DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

    # Word numerals in Hindi / Marathi / English with word boundaries
    WORD_PHRASES = [
        ("एक हजार", 1000), ("दोन हजार", 2000), ("वीस हजार", 20000),
        ("बीस हज़ार", 20000), ("बीस हजार", 20000), ("पंद्रह हज़ार", 15000), ("पंद्रह हजार", 15000),
        ("ek hazar", 1000), ("do hazar", 2000), ("bees hazar", 20000), ("pandrah hazar", 15000),
        ("twenty thousand", 20000), ("fifteen thousand", 15000), ("ten thousand", 10000),
        ("fifty thousand", 50000), ("one lakh", 100000), ("two lakh", 200000),
    ]

    def extract(
        self,
        evidence: Evidence,
        context: Optional[Dict[str, Any]] = None,
    ) -> ExtractionResult:
        raw_text = evidence.raw_payload.strip()
        if not raw_text:
            return ExtractionResult.create_failure(
                evidence_id=evidence.id,
                status=ExtractionStatus.NO_CLAIMS_FOUND,
                error_message="Evidence payload is empty.",
                provider_name=self.provider_name,
            )

        # 1. Detect Financial Intent & Claim Type
        claim_type = self._detect_claim_type(raw_text)
        if not claim_type:
            # Not a financial message (e.g. casual conversational greeting)
            return ExtractionResult(
                evidence_id=evidence.id,
                status=ExtractionStatus.NO_CLAIMS_FOUND,
                claims=[],
                provider_name=self.provider_name,
                confidence_score=1.0,
            )

        # 2. Extract Monetary Amount (strictly None if not explicitly stated)
        claimed_amount, amount_warning = self._extract_amount(raw_text)

        # 3. Extract Payment Method
        payment_method = self._extract_payment_method(raw_text)

        # 4. Extract Reference ID (UTR / RRN / Cheque / Invoice #)
        reference_id = self._extract_reference_id(raw_text)

        # 5. Extract Counterparty Hint
        counterparty = self._extract_counterparty(raw_text, evidence.metadata)

        # 6. Extract Date Hint
        date_hint = self._extract_date_hint(raw_text, evidence.metadata)

        # Confidence calculation
        confidence = 0.90 if claimed_amount is not None else 0.60
        if reference_id:
            confidence = min(1.0, confidence + 0.05)

        claim_id = f"CLM-TXT-{uuid.uuid4().hex[:8]}"
        claim = Claim(
            id=claim_id,
            evidence_id=evidence.id,
            claim_type=claim_type,
            claimed_amount=claimed_amount,
            claimed_date=date_hint,
            counterparty_hint=counterparty,
            reference_id_hint=reference_id,
            payment_method_hint=payment_method,
            confidence=round(confidence, 2),
            raw_text_snippet=raw_text,
            status=ClaimStatus.ASSERTED,
            metadata={
                "language_hint": evidence.language_hint,
                "sender_metadata": evidence.metadata.get("sender"),
            },
        )

        warnings: List[ExtractionWarning] = []
        if amount_warning:
            warnings.append(ExtractionWarning(
                message=amount_warning,
                field="claimed_amount",
                raw_snippet=raw_text,
            ))

        return ExtractionResult.create_success(
            evidence_id=evidence.id,
            claims=[claim],
            provider_name=self.provider_name,
            confidence_score=claim.confidence,
            warnings=warnings,
            metadata={"extracted_fields": {
                "claim_type": claim_type.value,
                "amount": claimed_amount,
                "payment_method": payment_method,
                "reference_id": reference_id,
            }},
        )

    def _detect_claim_type(self, text: str) -> Optional[ClaimType]:
        """Detect the financial intent from vocabulary and phrasing."""
        lower = text.lower()

        # Cash claims
        if any(k in lower for k in ("cash de diya", "petty cash", "cash diya", "cash in hand", "cash payment", "नकद", "रोख")):
            return ClaimType.CASH_PAYMENT_PROMISE

        # Invoices
        if any(k in lower for k in ("tax invoice", "invoice #", "inv-", "total due", "amount due", "bill amount", "invoice marked paid")):
            return ClaimType.INVOICE_ISSUED

        # Payment Received / Inward
        if any(k in lower for k in (
            "received", "credited", "payment received", "mil gaya", "aagaya", "received rs",
            "received payment", "thanks received", "got the payment"
        )):
            return ClaimType.PAYMENT_RECEIVED

        # Payment Sent / Outward (English, Hinglish, Hindi, Marathi, Tamil, Telugu, Kannada, Bengali)
        if any(k in lower for k in (
            "sent", "transferred", "paid", "gpay kar diya", "bhej diya", "send kiya", "bheja",
            "gpay done", "phonepe done", "bhej dunga", "bheja hai", "transfer ho gaya",
            "भेज दिया", "कर दिए हैं", "कर दिया", "पाठवले", "दिला",
            "paniten", "kalsiddini", "chesanu", "diyechi", "i sent", "transferred rs",
            "payment successful", "payment done"
        )):
            return ClaimType.PAYMENT_SENT

        # Check if generic rupee amount is mentioned along with standard payment rail
        if ("₹" in text or "rs" in lower or "inr" in lower or "gpay" in lower or "phonepe" in lower or "upi" in lower):
            return ClaimType.PAYMENT_SENT

        return None

    def _extract_amount(self, text: str) -> Tuple[Optional[float], Optional[str]]:
        """Extract exact numeric rupee amount with support for 'k', 'lakh', 'hazar', and Devanagari."""
        # 1. Convert Devanagari digits to standard digits
        normalized_text = text.translate(self.DEVANAGARI_DIGITS)

        # 2. Check full phrase word numerals
        for phrase, val in self.WORD_PHRASES:
            if phrase in normalized_text.lower() or phrase in text:
                return float(val), None

        # 3. Check 'k' suffix e.g. "20k", "35.5k", "20 K"
        m_k = re.search(r"\b(?P<num>\d+(?:\.\d+)?)\s*[kK]\b", normalized_text)
        if m_k:
            try:
                base_num = float(m_k.group("num"))
                return round(base_num * 1000.0, 2), None
            except ValueError:
                pass

        # 4. Check 'lakh' / 'lac' / 'L' suffix e.g. "1.5 lakh", "2 lac", "1.5L"
        m_lakh = re.search(r"\b(?P<num>\d+(?:\.\d+)?)\s*(?:lakh|lac|lacs|lakhs|L)\b", normalized_text, re.IGNORECASE)
        if m_lakh:
            try:
                base_num = float(m_lakh.group("num"))
                return round(base_num * 100000.0, 2), None
            except ValueError:
                pass

        # 5. Check 'hazar' / 'हजार' e.g. "20 hazar", "15 हजार", "20 हजार"
        m_hazar = re.search(r"\b(?P<num>\d+(?:\.\d+)?)\s*(?:hazar|hazaar|हजार|हज़ार|हजारो)\b", normalized_text, re.IGNORECASE)
        if m_hazar:
            try:
                base_num = float(m_hazar.group("num"))
                return round(base_num * 1000.0, 2), None
            except ValueError:
                pass

        # 6. Check explicit currency markers: ₹ 35,000.00 / Rs. 18,500 / INR 25000 / 25000/-
        m_curr = re.search(
            r"(?:₹|Rs\.?|INR)\s*(?P<amt>\d+(?:,\d+)*(?:\.\d{1,2})?)",
            normalized_text,
            re.IGNORECASE,
        )
        if m_curr:
            cleaned = m_curr.group("amt").replace(",", "")
            try:
                return round(float(cleaned), 2), None
            except ValueError:
                pass

        # 7. Check trailing '/-' format e.g. "25000/-" or "18,500/-"
        m_slash = re.search(r"\b(?P<amt>\d+(?:,\d+)*)\s*/-", normalized_text)
        if m_slash:
            cleaned = m_slash.group("amt").replace(",", "")
            try:
                return round(float(cleaned), 2), None
            except ValueError:
                pass

        # 8. Check standalone comma-formatted numbers e.g. "35,000" or "1,25,000"
        m_comma = re.search(r"\b(?P<amt>\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?)\b", normalized_text)
        if m_comma:
            cleaned = m_comma.group("amt").replace(",", "")
            try:
                return round(float(cleaned), 2), None
            except ValueError:
                pass

        # 9. Check standalone plain integers (3 to 8 digits) that are not reference numbers (e.g. 12500, 22000, 18000)
        # Exclude 12-digit UTRs and timestamp tokens
        tokens = re.findall(r"\b\d{3,8}(?:\.\d{2})?\b", normalized_text)
        for tok in tokens:
            if not (len(tok) == 4 and tok.startswith("202")) and not (len(tok) == 4 and tok.startswith("19")):  # Skip years
                try:
                    amt = float(tok)
                    if amt >= 100.0:
                        return round(amt, 2), None
                except ValueError:
                    pass

        # 10. If text indicates payment was sent/received without explicit amount e.g. "I sent the money."
        return None, "No explicit monetary amount found in text evidence (amount is unknown)."

    def _extract_payment_method(self, text: str) -> Optional[str]:
        """Identify payment rail mentioned in natural language text."""
        lower = text.lower()
        if "gpay" in lower or "google pay" in lower:
            return "UPI"
        if "phonepe" in lower:
            return "UPI"
        if "paytm" in lower:
            return "UPI"
        if "bhim" in lower or "upi" in lower:
            return "UPI"
        if "neft" in lower:
            return "NEFT"
        if "rtgs" in lower:
            return "RTGS"
        if "imps" in lower:
            return "IMPS"
        if "cash" in lower:
            return "CASH"
        if "cheque" in lower or "chq" in lower:
            return "CHEQUE"
        return None

    def _extract_reference_id(self, text: str) -> Optional[str]:
        """Extract UTR, RRN, or Invoice reference numbers from text."""
        # 1. Explicit labeled UTR/Ref e.g. "ref: 408219381920", "UTR 408219381920", "RRN: 408219381920"
        m_ref = re.search(r"(?:ref(?:erence)?(?:\s*no\.?)?|utr|rrn|txn\s*id)\s*[:#-]?\s*([A-Za-z0-9_-]{6,24})", text, re.IGNORECASE)
        if m_ref:
            return m_ref.group(1).strip()

        # 2. Standalone 12-digit UPI RRN
        m_rrn = re.search(r"\b\d{12}\b", text)
        if m_rrn:
            return m_rrn.group(0)

        # 3. Invoice Number e.g. "INV-2026-042"
        m_inv = re.search(r"\b(?:INV|BILL)[-_A-Z0-9]{4,16}\b", text, re.IGNORECASE)
        if m_inv:
            return m_inv.group(0)

        return None

    def _extract_counterparty(self, text: str, metadata: Dict[str, Any]) -> Optional[str]:
        """Extract party hint from metadata or phrases like 'Paid to: Rohit' or 'from Rahul'."""
        if metadata.get("sender"):
            return metadata["sender"]

        # Search for "Paid to: Name" or "from Name"
        m = re.search(r"(?:received from|paid to|sent to|billed to|from)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)", text, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            # Exclude stop words
            if candidate.lower() not in ("your account", "bank", "gpay", "phonepe", "upi", "via", "using", "today", "yesterday"):
                # Clean trailing tokens like 'via' or 'on'
                candidate = re.sub(r"\s+(?:via|on|ref|using|with|by).*$", "", candidate, flags=re.IGNORECASE).strip()
                return candidate

        return None

    def _extract_date_hint(self, text: str, metadata: Dict[str, Any]) -> Optional[str]:
        """Extract date from metadata timestamp or natural text."""
        if metadata.get("timestamp_hint"):
            return str(metadata["timestamp_hint"])

        # Check ISO format YYYY-MM-DD
        m_iso = re.search(r"\b\d{4}-\d{2}-\d{2}\b", text)
        if m_iso:
            return m_iso.group(0)

        # Check DD/MM/YYYY or DD-MM-YYYY
        m_dd = re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", text)
        if m_dd:
            return m_dd.group(0)

        return None
