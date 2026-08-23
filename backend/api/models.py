"""Pydantic API Request and Response models for the VERITY Finance Controller API."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.domain.entity import Entity
from backend.domain.evidence import Evidence
from backend.domain.transaction import Transaction


# -------------------------------------------------------------
# REQUEST MODELS
# -------------------------------------------------------------

class CaseCreateRequest(BaseModel):
    """Payload for submitting a structured financial case to the pipeline."""
    case_id: str = Field(..., description="Unique case identifier, e.g. CASE-2026-001")
    evidence_items: List[Evidence] = Field(default_factory=list, description="Pre-ingested Evidence objects")
    raw_file_paths: List[str] = Field(default_factory=list, description="Local file paths to ingest")
    raw_text_messages: List[Dict[str, Any]] = Field(default_factory=list, description="Raw text/chat payloads")
    transactions: List[Transaction] = Field(default_factory=list, description="Verified bank ledger transactions")
    entities: List[Entity] = Field(default_factory=list, description="Known counterparty entities")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary case metadata")


class TextEvidenceRequest(BaseModel):
    """Payload for processing raw text/messaging evidence."""
    text: str = Field(..., description="Raw text, WhatsApp export snippet, or SMS message")
    source_name: Optional[str] = Field(default="raw_chat_export.txt", description="Source identifier")
    case_id: Optional[str] = Field(default=None, description="Optional custom case ID")


# -------------------------------------------------------------
# RESPONSE MODELS
# -------------------------------------------------------------

class HealthResponse(BaseModel):
    """Health check status response."""
    status: str = Field(default="ok")
    service: str = Field(default="verity")
    version: str = Field(default="day11")


class InfoResponse(BaseModel):
    """System information, supported modalities, and pipeline stage capabilities."""
    app_name: str = "VERITY — Financial Truth, Reconstructed"
    version: str = "0.1.0-day11"
    track: str = "AI Finance Controller (Razorpay AI Buildathon 2026)"
    available_pipeline_stages: List[str] = [
        "INGESTION",
        "EXTRACTION",
        "ENTITY_RESOLUTION",
        "TRANSACTION_MATCHING",
        "DEDUPLICATION",
        "CONTRADICTION_DETECTION",
        "RECONCILIATION",
        "REPORTING",
    ]
    supported_modalities: List[str] = [
        "BANK_STATEMENT (CSV)",
        "INVOICE (PDF, Text)",
        "MESSAGING_CHAT (WhatsApp, SMS)",
        "PAYMENT_SCREENSHOT (PNG, JPG)",
        "CASH_VOUCHER",
    ]
    safety_guarantees: List[str] = [
        "Zero LLM hallucination in financial math",
        "Deterministic Indian entity resolution (GSTIN, PAN, UPI, Phone)",
        "Strict uncertainty preservation (AMBIGUOUS, CONTRADICTED never falsely confirmed)",
        "Immutable SHA-256 Provenance DAG trace",
    ]


class FinancialSummaryResponse(BaseModel):
    """Monetary and count metrics from financial reconciliation."""
    claimed_amount: Optional[float] = None
    matched_amount: float = 0.0
    outstanding_amount: float = 0.0
    total_reconciled_batch: float = 0.0
    total_outstanding_batch: float = 0.0
    evidence_count: int = 0
    claims_count: int = 0
    transactions_count: int = 0
    discrepancies_count: int = 0


class StageRecordResponse(BaseModel):
    """Execution telemetry for a single pipeline stage."""
    stage: str
    status: str
    duration_ms: float
    items_in: int
    items_out: int
    notes: Optional[str] = None


class ProvenanceNodeResponse(BaseModel):
    """Single node in the tamper-evident provenance DAG."""
    node_id: str
    node_type: str
    label: str
    content_hash: str
    parent_ids: List[str] = Field(default_factory=list)
    timestamp: str


class ProvenanceGraphResponse(BaseModel):
    """Complete provenance trace linking final truth back to source evidence."""
    case_id: str
    total_nodes: int
    nodes: List[ProvenanceNodeResponse] = Field(default_factory=list)
    root_evidence_ids: List[str] = Field(default_factory=list)


class DemoCaseSummaryResponse(BaseModel):
    """Summary descriptor for pre-packaged demo scenarios."""
    case_id: str
    title: str
    description: str
    expected_status: str
    evidence_modalities: List[str]


class CaseResponse(BaseModel):
    """Unified Case Processing API response matching the Day 11 contract."""
    case_id: str
    status: str
    confidence: float
    requires_review: bool
    financial_summary: FinancialSummaryResponse
    truth_report: Optional[Dict[str, Any]] = None
    stage_execution: List[StageRecordResponse] = Field(default_factory=list)
    provenance: Optional[Dict[str, Any]] = None
    total_execution_time_ms: float = 0.0
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    text_report: str = ""
