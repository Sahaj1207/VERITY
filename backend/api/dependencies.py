"""FastAPI dependencies and in-memory demo case store for VERITY."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from threading import Lock

from backend.case_processing.result import CaseProcessingResult
from backend.case_processing.service import CaseProcessingService


class InMemoryCaseStore:
    """Thread-safe in-memory store for demo cases and dynamic user executions."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._cases: Dict[str, CaseProcessingResult] = {}
        self._raw_demo_cases: Dict[str, Dict[str, Any]] = {}
        self._load_demo_fixtures()

    def _load_demo_fixtures(self) -> None:
        """Loads Day 10 sample fixtures into memory for quick demo execution."""
        fixtures_path = Path("data/samples/day10/case_processing_cases.json")
        if fixtures_path.exists():
            try:
                with open(fixtures_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for tc in data.get("test_cases", []):
                        self._raw_demo_cases[tc["case_id"]] = tc
            except Exception:
                pass

    def save_case(self, result: CaseProcessingResult) -> None:
        with self._lock:
            self._cases[result.case_id] = result

    def get_case(self, case_id: str) -> Optional[CaseProcessingResult]:
        with self._lock:
            return self._cases.get(case_id)

    def list_demo_cases(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._raw_demo_cases.values())

    def get_demo_case_dict(self, case_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._raw_demo_cases.get(case_id)


# Singletons
_case_store = InMemoryCaseStore()
_case_service = CaseProcessingService()


def get_case_service() -> CaseProcessingService:
    """Dependency provider for CaseProcessingService."""
    return _case_service


def get_case_store() -> InMemoryCaseStore:
    """Dependency provider for InMemoryCaseStore."""
    return _case_store
