"""FastAPI route definitions for the VERITY Finance Controller API."""

from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.api.dependencies import (
    InMemoryCaseStore,
    get_case_service,
    get_case_store,
)
from backend.api.models import (
    CaseCreateRequest,
    CaseResponse,
    DemoCaseSummaryResponse,
    HealthResponse,
    InfoResponse,
    ProvenanceGraphResponse,
    TextEvidenceRequest,
)
from backend.api.serialization import (
    serialize_case_result,
    serialize_provenance_graph,
)
from backend.case_processing.models import CaseInput
from backend.case_processing.service import CaseProcessingService
from backend.domain.evidence import Evidence, EvidenceModality, EvidenceSourceType

router = APIRouter()


# -------------------------------------------------------------
# SYSTEM & HEALTH ENDPOINTS
# -------------------------------------------------------------

@router.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check() -> HealthResponse:
    """Returns standard system health status."""
    return HealthResponse()


@router.get("/api/v1/info", response_model=InfoResponse, tags=["System Info"])
def system_info() -> InfoResponse:
    """Returns application metadata, pipeline capabilities, and supported evidence modalities."""
    return InfoResponse()


# -------------------------------------------------------------
# DEMO SCENARIO ENDPOINTS
# -------------------------------------------------------------

@router.get("/api/v1/demo-cases", response_model=List[DemoCaseSummaryResponse], tags=["Demo Cases"])
def list_demo_cases(
    store: InMemoryCaseStore = Depends(get_case_store),
) -> List[DemoCaseSummaryResponse]:
    """Lists pre-packaged benchmark demo scenarios for one-click UI evaluation."""
    cases = store.list_demo_cases()
    summaries: List[DemoCaseSummaryResponse] = []
    for c in cases:
        ev_modalities = [e.get("modality", "OTHER") for e in c.get("evidence", [])]
        summaries.append(DemoCaseSummaryResponse(
            case_id=c["case_id"],
            title=c["case_id"].replace("DAY10-", "").replace("-", " ").title(),
            description=c.get("description", ""),
            expected_status=c.get("expected_status", "UNKNOWN"),
            evidence_modalities=list(set(ev_modalities)),
        ))
    return summaries


@router.post("/api/v1/demo-cases/{case_id}/run", response_model=CaseResponse, tags=["Demo Cases"])
def run_demo_case(
    case_id: str,
    service: CaseProcessingService = Depends(get_case_service),
    store: InMemoryCaseStore = Depends(get_case_store),
) -> CaseResponse:
    """Executes a pre-packaged demo case directly through the 8-stage pipeline."""
    case_dict = store.get_demo_case_dict(case_id)
    if not case_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo case '{case_id}' not found.",
        )

    result = service.process_benchmark_case(case_dict)
    store.save_case(result)
    return serialize_case_result(result, service.pipeline.provenance_tracker)


# -------------------------------------------------------------
# CASE PROCESSING ENDPOINTS
# -------------------------------------------------------------

@router.post("/api/v1/cases", response_model=CaseResponse, tags=["Cases"])
def submit_case(
    payload: CaseCreateRequest,
    service: CaseProcessingService = Depends(get_case_service),
    store: InMemoryCaseStore = Depends(get_case_store),
) -> CaseResponse:
    """Processes a fully structured financial case through the 8-stage pipeline."""
    case_in = CaseInput(
        case_id=payload.case_id,
        evidence_items=payload.evidence_items,
        raw_file_paths=payload.raw_file_paths,
        raw_text_messages=payload.raw_text_messages,
        transactions=payload.transactions,
        entities=payload.entities,
        metadata=payload.metadata,
    )

    result = service.process_case(case_in)
    store.save_case(result)
    return serialize_case_result(result, service.pipeline.provenance_tracker)


@router.post("/api/v1/cases/text", response_model=CaseResponse, tags=["Cases"])
def submit_text_evidence(
    payload: TextEvidenceRequest,
    service: CaseProcessingService = Depends(get_case_service),
    store: InMemoryCaseStore = Depends(get_case_store),
) -> CaseResponse:
    """Ingests and reconstructs financial truth from raw text, WhatsApp, or SMS exports."""
    cid = payload.case_id or f"TXT-CASE-{uuid.uuid4().hex[:8]}"
    case_in = CaseInput(
        case_id=cid,
        raw_text_messages=[{
            "text": payload.text,
            "source_name": payload.source_name or "chat_export.txt",
        }],
    )

    result = service.process_case(case_in)
    store.save_case(result)
    return serialize_case_result(result, service.pipeline.provenance_tracker)


@router.post("/api/v1/cases/files", response_model=CaseResponse, tags=["Cases"])
async def submit_files_evidence(
    files: List[UploadFile] = File(...),
    case_id: Optional[str] = None,
    service: CaseProcessingService = Depends(get_case_service),
    store: InMemoryCaseStore = Depends(get_case_store),
) -> CaseResponse:
    """Accepts multiple uploaded evidence files (PDF, CSV, Images, Text) and runs reconciliation."""
    cid = case_id or f"UPLOAD-CASE-{uuid.uuid4().hex[:8]}"
    temp_dir = tempfile.mkdtemp(prefix="verity_upload_")
    saved_paths: List[str] = []

    try:
        for file in files:
            file_dest = Path(temp_dir) / (file.filename or f"evidence_{uuid.uuid4().hex[:6]}")
            with open(file_dest, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            saved_paths.append(str(file_dest))

        case_in = CaseInput(
            case_id=cid,
            raw_file_paths=saved_paths,
        )

        result = service.process_case(case_in)
        store.save_case(result)
        return serialize_case_result(result, service.pipeline.provenance_tracker)
    finally:
        # Cleanup temporary files
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass


# -------------------------------------------------------------
# CASE RETRIEVAL & INSPECTION ENDPOINTS
# -------------------------------------------------------------

@router.get("/api/v1/cases/{case_id}", response_model=CaseResponse, tags=["Cases"])
def get_case(
    case_id: str,
    store: InMemoryCaseStore = Depends(get_case_store),
    service: CaseProcessingService = Depends(get_case_service),
) -> CaseResponse:
    """Retrieves an existing case result from memory."""
    result = store.get_case(case_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found in demo session store.",
        )
    return serialize_case_result(result, service.pipeline.provenance_tracker)


@router.get("/api/v1/cases/{case_id}/report", tags=["Reporting"])
def get_case_report(
    case_id: str,
    store: InMemoryCaseStore = Depends(get_case_store),
) -> Dict[str, Any]:
    """Returns the structured FinancialTruthReport JSON for a case."""
    result = store.get_case(case_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found in demo session store.",
        )
    if not result.report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No FinancialTruthReport generated for case '{case_id}'.",
        )
    return result.report.model_dump()


@router.get("/api/v1/cases/{case_id}/provenance", response_model=ProvenanceGraphResponse, tags=["Provenance"])
def get_case_provenance(
    case_id: str,
    store: InMemoryCaseStore = Depends(get_case_store),
    service: CaseProcessingService = Depends(get_case_service),
) -> ProvenanceGraphResponse:
    """Returns the structured DAG trace linking truth back to root evidence."""
    result = store.get_case(case_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found in demo session store.",
        )
    return serialize_provenance_graph(case_id, service.pipeline.provenance_tracker)
