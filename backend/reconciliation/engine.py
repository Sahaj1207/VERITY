"""Reconciliation orchestrator engine for VERITY.

Coordinates evidence evaluation, claim extraction, transaction matching,
contradiction detection, deduplication, and provenance generation.
"""

from __future__ import annotations

from typing import List, Optional
from backend.domain.evidence import Evidence
from backend.domain.claim import Claim
from backend.domain.entity import Entity
from backend.domain.transaction import Transaction
from backend.domain.discrepancy import Discrepancy, DiscrepancySeverity, DiscrepancyType
from backend.domain.reconciliation import MatchType, ReconciliationRecord, ReconciliationStatus
from backend.provenance.tracker import ProvenanceTracker


class ReconciliationEngine:
    """Core modular reconciliation engine."""

    def __init__(self, provenance_tracker: Optional[ProvenanceTracker] = None) -> None:
        self.tracker = provenance_tracker or ProvenanceTracker()

    def reconcile_case(
        self,
        reconciliation_id: str,
        evidence_items: List[Evidence],
        claims: List[Claim],
        transactions: List[Transaction],
        counterparty: Optional[Entity] = None,
    ) -> ReconciliationRecord:
        """Evaluate evidence, claims, and transactions to synthesize a verified financial conclusion."""
        # 1. Register root provenance for all evidence items
        for ev in evidence_items:
            self.tracker.track_evidence(ev)

        # 2. Register provenance for extracted claims
        for clm in claims:
            self.tracker.track_claim(clm)

        # 3. Register provenance for transactions
        for txn in transactions:
            self.tracker.track_transaction(txn)

        discrepancies: List[Discrepancy] = []
        
        # Calculate totals
        total_claimed_invoiced = sum(
            c.claimed_amount for c in claims if c.claim_type.value in ["INVOICE_ISSUED", "PAYMENT_SENT"]
        )
        total_verified_credits = sum(
            t.amount for t in transactions if t.direction.value == "CREDIT"
        )
        
        # Check cash claims without bank proof
        has_cash_claim = any(
            c.claim_type.value == "CASH_PAYMENT_PROMISE" or (c.payment_method_hint and c.payment_method_hint.upper() == "CASH")
            for c in claims
        )
        if has_cash_claim and total_verified_credits == 0:
            disc = Discrepancy(
                id=f"disc-{reconciliation_id}-cash-unverified",
                discrepancy_type=DiscrepancyType.UNVERIFIABLE_CASH_CLAIM,
                severity=DiscrepancySeverity.WARNING,
                message="Cash payment asserted without supporting ledger deposit or signed physical voucher.",
                involved_claim_ids=[c.id for c in claims if "CASH" in (c.payment_method_hint or "").upper()],
            )
            discrepancies.append(disc)
            self.tracker.track_discrepancy(disc)
            
            rec = ReconciliationRecord(
                id=reconciliation_id,
                status=ReconciliationStatus.UNVERIFIABLE,
                match_type=MatchType.UNMATCHED,
                expected_amount=total_claimed_invoiced or None,
                reconciled_amount=0.0,
                outstanding_amount=total_claimed_invoiced,
                entity_id=counterparty.id if counterparty else None,
                evidence_ids=[e.id for e in evidence_items],
                claim_ids=[c.id for c in claims],
                transaction_ids=[t.id for t in transactions],
                discrepancies=discrepancies,
                confidence_score=0.40,
                explanation_summary="Unverifiable cash payment claim without verified bank ledger backing.",
            )
            self.tracker.track_reconciliation(rec)
            return rec

        # Check contradictions (claimed paid vs verified bank credits)
        if claims and transactions and total_claimed_invoiced > 0:
            if total_verified_credits < total_claimed_invoiced and total_verified_credits > 0:
                # Partial payment scenario
                disc = Discrepancy(
                    id=f"disc-{reconciliation_id}-partial",
                    discrepancy_type=DiscrepancyType.PARTIAL_SETTLEMENT,
                    severity=DiscrepancySeverity.WARNING,
                    message=f"Partial settlement: Verified INR {total_verified_credits:,.2f} received against expected INR {total_claimed_invoiced:,.2f}.",
                    expected_value=f"{total_claimed_invoiced:.2f}",
                    observed_value=f"{total_verified_credits:.2f}",
                    involved_claim_ids=[c.id for c in claims],
                    involved_transaction_ids=[t.id for t in transactions],
                )
                discrepancies.append(disc)
                self.tracker.track_discrepancy(disc)

                rec = ReconciliationRecord(
                    id=reconciliation_id,
                    status=ReconciliationStatus.PARTIAL,
                    match_type=MatchType.PARTIAL_PAYMENT,
                    expected_amount=total_claimed_invoiced,
                    reconciled_amount=total_verified_credits,
                    outstanding_amount=round(total_claimed_invoiced - total_verified_credits, 2),
                    entity_id=counterparty.id if counterparty else None,
                    evidence_ids=[e.id for e in evidence_items],
                    claim_ids=[c.id for c in claims],
                    transaction_ids=[t.id for t in transactions],
                    discrepancies=discrepancies,
                    confidence_score=0.92,
                    explanation_summary=f"Partially reconciled: Verified credit of INR {total_verified_credits:,.2f} with remaining balance of INR {round(total_claimed_invoiced - total_verified_credits, 2):,.2f}.",
                )
                self.tracker.track_reconciliation(rec)
                return rec

        # Exact clean match
        if total_verified_credits > 0 and (total_claimed_invoiced == 0 or total_verified_credits == total_claimed_invoiced):
            rec = ReconciliationRecord(
                id=reconciliation_id,
                status=ReconciliationStatus.CONFIRMED,
                match_type=MatchType.EXACT_1_TO_1 if len(transactions) == 1 and len(claims) <= 1 else MatchType.MANY_TO_ONE,
                expected_amount=total_claimed_invoiced or total_verified_credits,
                reconciled_amount=total_verified_credits,
                outstanding_amount=0.0,
                entity_id=counterparty.id if counterparty else None,
                evidence_ids=[e.id for e in evidence_items],
                claim_ids=[c.id for c in claims],
                transaction_ids=[t.id for t in transactions],
                discrepancies=discrepancies,
                confidence_score=1.0,
                explanation_summary=f"Fully confirmed: INR {total_verified_credits:,.2f} verified and matched with ledger transaction.",
            )
            self.tracker.track_reconciliation(rec)
            return rec

        # Fallback / Missing evidence
        rec = ReconciliationRecord(
            id=reconciliation_id,
            status=ReconciliationStatus.UNVERIFIABLE if not transactions else ReconciliationStatus.AMBIGUOUS,
            match_type=MatchType.UNMATCHED,
            expected_amount=total_claimed_invoiced or None,
            reconciled_amount=total_verified_credits,
            outstanding_amount=max(0.0, total_claimed_invoiced - total_verified_credits),
            entity_id=counterparty.id if counterparty else None,
            evidence_ids=[e.id for e in evidence_items],
            claim_ids=[c.id for c in claims],
            transaction_ids=[t.id for t in transactions],
            discrepancies=discrepancies,
            confidence_score=0.5,
            explanation_summary="Unreconciled evidence without matching ledger transactions.",
        )
        self.tracker.track_reconciliation(rec)
        return rec
