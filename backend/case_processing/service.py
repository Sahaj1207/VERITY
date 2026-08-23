"""Unified Case Processing Service for VERITY Finance Controller Pipeline."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.case_processing.models import CaseInput
from backend.case_processing.pipeline import FinanceControllerPipeline
from backend.case_processing.result import CaseProcessingResult
from backend.domain.entity import Entity
from backend.domain.evidence import Evidence
from backend.domain.transaction import Transaction


class CaseProcessingService:
    """High-level service for executing end-to-end financial case processing."""

    def __init__(self, pipeline: Optional[FinanceControllerPipeline] = None) -> None:
        self.pipeline = pipeline or FinanceControllerPipeline()

    def process_case(self, case_input: CaseInput) -> CaseProcessingResult:
        """Executes the full end-to-end finance controller pipeline for a structured CaseInput."""
        return self.pipeline.execute(case_input)

    def process_evidence(
        self,
        case_id: str,
        evidence_items: List[Evidence],
        transactions: Optional[List[Transaction]] = None,
        entities: Optional[List[Entity]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> CaseProcessingResult:
        """Processes pre-normalized Evidence items directly through the pipeline."""
        case_in = CaseInput(
            case_id=case_id,
            evidence_items=evidence_items,
            transactions=transactions or [],
            entities=entities or [],
            metadata=metadata or {},
        )
        return self.process_case(case_in)

    def process_raw_files(
        self,
        case_id: str,
        file_paths: List[str],
        transactions: Optional[List[Transaction]] = None,
        entities: Optional[List[Entity]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> CaseProcessingResult:
        """Ingests raw file paths and runs full end-to-end processing."""
        case_in = CaseInput(
            case_id=case_id,
            raw_file_paths=file_paths,
            transactions=transactions or [],
            entities=entities or [],
            metadata=metadata or {},
        )
        return self.process_case(case_in)

    def process_batch(self, cases: List[CaseInput]) -> List[CaseProcessingResult]:
        """Executes the pipeline sequentially over a batch of CaseInput objects."""
        return [self.process_case(c) for c in cases]

    def process_benchmark_case(self, case_dict: Dict[str, Any]) -> CaseProcessingResult:
        """Adapts and executes a standard ground-truth benchmark case dictionary."""
        cid = case_dict.get("id", case_dict.get("case_id", "BENCHMARK-CASE"))
        ev_items: List[Evidence] = []
        for e in case_dict.get("evidence", []):
            if isinstance(e, dict):
                ev_items.append(Evidence.model_validate(e))
            elif isinstance(e, Evidence):
                ev_items.append(e)

        claims: List[Dict[str, Any]] = case_dict.get("claims", [])
        txns: List[Transaction] = []
        for t in case_dict.get("transactions", []):
            if isinstance(t, dict):
                txns.append(Transaction.model_validate(t))
            elif isinstance(t, Transaction):
                txns.append(t)

        case_in = CaseInput(
            case_id=cid,
            evidence_items=ev_items,
            transactions=txns,
            metadata={"precomputed_claims": claims} if claims else {},
        )
        return self.process_case(case_in)
