# VERITY Interactive Finance Controller Demo Guide

**Day 11 Milestone: Interactive Web Interface & Live Walkthrough**  
*Razorpay AI Buildathon 2026 | Track: AI Finance Controller*

---

## 1. Quick Start Instructions

Launch the complete VERITY Full-Stack Application (Backend API + Interactive UI) with a single command:

```bash
# Start FastAPI backend with static UI mounted at http://localhost:8000
python -m uvicorn backend.api.app:app --host 0.0.0.0 --port 8000 --reload
```

Open your browser and navigate to:  
👉 **`http://localhost:8000`**

---

## 2. Interactive Features & Demo Workflow

### 1. One-Click Benchmark Scenarios
At the top of the dashboard, 10 pre-packaged benchmark scenarios can be triggered with one click:
- `Clean 1To1`: Exact invoice + bank ledger match (`CONFIRMED`).
- `Partial Settlement`: ₹20,000 invoice with ₹12,000 payment (`PARTIALLY_SETTLED`, Outstanding: ₹8,000).
- `Amount Contradiction`: Invoice ₹20,000 vs Bank ₹18,000 (`CONTRADICTED`).
- `Entity Contradiction`: Claim for Rahul Kumar vs Bank credit for Rohit Sharma (`CONTRADICTED`).
- `Ambiguous Duplicates`: Two identical bank transactions for 1 invoice (`AMBIGUOUS`).
- `Unverifiable Chat`: "I sent the money" without amount and no ledger transaction (`UNVERIFIABLE`).
- `Unmatched Credit`: Standalone bank credit of ₹35,000 without invoice (`UNMATCHED`).
- `Cross-Modal Multimodal`: Invoice + Bank CSV + WhatsApp + Screenshot grouped into 1 event (`CONFIRMED`).
- `Many-To-One Milestones`: 3 milestone payments settling 1 invoice (`CONFIRMED`).
- `One-To-Many Bulk`: Bulk payment settling 2 invoices (`CONFIRMED`).

### 2. 8-Stage Pipeline Telemetry
Watch all 8 stages execute in sub-millisecond real time:
- `Ingestion` $\to$ `Extraction` $\to$ `Entity Resolution` $\to$ `Transaction Matching` $\to$ `Deduplication` $\to$ `Contradiction Detection` $\to$ `Reconciliation` $\to$ `Reporting`.
- Inspect per-stage latencies, items in, and items out.

### 3. Financial Truth Hero Card & Accounting Summary
- Status Badge with tailored color coding: Emerald (`CONFIRMED`), Amber (`PARTIALLY_SETTLED`), Rose (`CONTRADICTED`), Pink (`AMBIGUOUS`), Purple (`UNMATCHED`), Slate (`UNVERIFIABLE`).
- Confidence Score meter.
- Actionable Human Review badge (`✓ NO REVIEW REQUIRED` vs `⚠️ HUMAN REVIEW RECOMMENDED`).
- Monetary summary cards: Expected Claim, Verified Matched, Outstanding Balance, Discrepancies Count.

### 4. Deep Investigation Panels
- **Evidence Panel**: Inspect source modalities, file names, and SHA-256 hashes.
- **Matching Topology Panel**: Inspect topological patterns (`ONE_TO_ONE`, `MANY_TO_ONE`, `ONE_TO_MANY`, `PARTIAL`, `AMBIGUOUS`) and matched signals.
- **Contradictions Panel**: Review detected discrepancies, expected values, and observed values.
- **Confidence Signals**: Positive (`+`) and negative (`-`) signal factors.
- **Actionable Next Steps**: Step-by-step guidance for accounting controllers.
- **Provenance DAG**: Interactive cryptographic lineage trace.
- **Formatted Terminal Report**: Copyable monospace Financial Truth Report and structured JSON.
