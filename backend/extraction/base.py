"""Extraction subsystem interface for parsing Evidence into structured Claims and Transactions."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Tuple
from backend.domain.evidence import Evidence
from backend.domain.claim import Claim
from backend.domain.transaction import Transaction


class ExtractionResult:
    """Container for the structured artifacts extracted from an Evidence item."""
    def __init__(
        self,
        evidence_id: str,
        claims: List[Claim],
        transactions: List[Transaction],
    ) -> None:
        self.evidence_id = evidence_id
        self.claims = claims
        self.transactions = transactions


class BaseExtractor(ABC):
    """Abstract interface for evidence extraction pipelines (Rule-based, Regex, or AI)."""

    @abstractmethod
    def extract(self, evidence: Evidence) -> ExtractionResult:
        """Extract structured claims or ledger transactions from raw evidence."""
        pass
