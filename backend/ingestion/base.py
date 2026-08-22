"""Ingestion subsystem for capturing raw multimodal financial evidence."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from backend.domain.evidence import Evidence, EvidenceModality, EvidenceSourceType


class BaseIngestionParser(ABC):
    """Abstract interface for all evidence ingestion parsers."""

    @property
    @abstractmethod
    def supported_modalities(self) -> List[EvidenceModality]:
        """List of modalities supported by this parser."""
        pass

    @abstractmethod
    def parse_payload(
        self,
        raw_content: str,
        source_name: str,
        source_type: EvidenceSourceType,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Evidence]:
        """Convert raw uploaded payload or feed into normalized Evidence objects."""
        pass
