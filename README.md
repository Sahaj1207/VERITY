# VERITY — Financial Truth, Reconstructed

> **Razorpay AI Buildathon 2026** | **Track:** AI Finance Controller  
> **Engine:** Multimodal Financial Reconciliation Engine for Indian SMBs & Freelancers

---

## 📌 The Problem

Financial evidence for Indian SMBs, agencies, and freelancers is fragmented and messy:
- **Bank statements & CSVs** (HDFC, ICICI, SBI, Razorpay payouts)
- **Invoices & Estimates** (Zoho, Tally, PDF bills)
- **Payment screenshots & receipts** (Google Pay, PhonePe, Paytm, BHIM)
- **Messaging threads** (WhatsApp, SMS, Slack with Hinglish/vernacular payment claims)
- **Cash & Petty Cash claims** (Informal verbal or paper chits)

Existing reconciliation systems work only with clean, structured records. Real-world financial evidence is **duplicated, incomplete, multilingual, partially paid, or contradictory**.

---

## 🎯 VERITY's Mission

Take messy, fragmented multimodal financial evidence and **reconstruct the underlying financial reality** while preserving cryptographic evidence provenance and explicitly handling uncertainty.

### 🔑 Core Domain Principle
$$\mathbf{Evidence \neq Claim \neq Conclusion}$$

| Dimension | Definition | Example |
|---|---|---|
| **Evidence** | Raw, uninterpreted artifact captured from the real world. | WhatsApp message: *"Bhai 20000 GPay kar diya check karo"* |
| **Claim** | Financial assertion extracted from an evidence artifact. | Asserted payment of ₹20,000 via UPI |
| **Transaction** | Verified ledger movement backed by bank/gateway feed. | Bank credit of ₹18,500 with UPI RRN `408219381920` |
| **Conclusion** | Synthesized truth reached after comparing claims against ledgers. | Status: `PARTIAL`, Reconciled: ₹18,500, Outstanding: ₹1,500 |

VERITY **never** blindly trusts text claims or screenshots; it systematically verifies them against verified ledger transactions while maintaining an unbroken audit trail.

---

## 🏗️ Architecture & Subsystem Boundaries

VERITY is structured as a clean, modular monolith with explicit subsystem boundaries:

```
VERITY/
├── backend/
│   ├── domain/               # Canonical domain models (Evidence, Claim, Entity, Transaction, Discrepancy, Reconciliation, Provenance)
│   ├── ingestion/            # Multimodal raw evidence ingestion (CSV, Text/WhatsApp, PDF, Images) & IngestionService
│   ├── extraction/           # Claim & transaction extraction interfaces
│   ├── entity_resolution/    # Counterparty matching across GSTIN, PAN, UPI VPAs, and aliases
│   ├── transaction_matching/ # 1:1, 1:N (bulk), and N:1 (milestone) transaction matching
│   ├── deduplication/        # Cross-modal duplicate evidence detection
│   ├── contradiction_detection/ # Contradictory claims & discrepancy identification
│   ├── provenance/           # Immutable SHA-256 Directed Acyclic Graph (DAG) lineage tracker
│   └── reconciliation/       # High-level reconciliation synthesis engine
├── data/
│   ├── benchmark/            # 96-case Ground-Truth Benchmark dataset & loader
│   └── samples/              # Realistic samples (Day 2 CSV, TXT, PDF, PNG)
├── docs/                     # Architectural specs, domain models, pipeline lifecycle, and ingestion specs
├── frontend/                 # Scaffolding and roadmap for Day 2/3 UI
├── scripts/                  # Benchmark generator, integrity validator, and sample generators
└── tests/                    # Unit, domain, provenance, entity, ingestion, and benchmark test suites
```

---

## 📥 Multimodal Evidence Ingestion (Day 2 Milestone)

VERITY features dedicated, resilient adapters for four major modalities:

1. **Bank CSV Ingestion (`BankCSVAdapter`)**:
   - Handles standard and Indian banking variations (`Txn Date`, `Value Date`, `Narration`, `Particulars`, `Deposit`, `Withdrawal`, `UTR`, `RRN`).
   - Granular row-level error reporting (`PARTIAL_SUCCESS`) with exact line numbers.
2. **Text / WhatsApp Message Ingestion (`TextMessageAdapter`)**:
   - Full UTF-8 support for English, Hinglish (*"Bhai 20k GPay kar diya"*), Hindi (Devanagari), Tamil, Telugu, Kannada, Bengali.
   - Automatically parses multi-line WhatsApp and SMS export headers.
3. **PDF Document Ingestion (`PDFDocumentAdapter`)**:
   - Extracts plain text via `pypdf`; detects scanned/image-only documents (`is_scanned: True`).
4. **Image / Payment Screenshot Ingestion (`ImagePaymentScreenshotAdapter`)**:
   - Ingests and validates PNG, JPG/JPEG, WEBP files via Pillow with dimension/metadata capture.

**Unified Ingestion Service API**:
```python
from backend.ingestion import IngestionService

service = IngestionService()

# Ingest single file
result = service.ingest_file("data/samples/day2/bank_statement.csv")

# Ingest raw WhatsApp text
text_result = service.ingest_text("Bhai 20k GPay kar diya check kar lo")

# Ingest entire folder (batch)
batch_result = service.ingest_batch("data/samples/day2/")
```

---

## 🔍 Multimodal Claims Extraction (Day 3 Milestone)

VERITY transforms unstructured, semi-structured, and multimodal evidence into structured `Claim` objects using a **deterministic-first** architecture with AI fallback:

1. **Bank CSV Extractor (`BankCSVExtractor`)**:
   - Zero-cost deterministic extraction of financial claims from bank statement rows.
2. **Text & Multilingual Extractor (`TextClaimExtractor`)**:
   - Extracts rupee amounts (`₹`, `Rs`, `INR`, `20k`, `1.5L`, `15 hazar`, Devanagari digits `२० हजार`).
   - Multilingual support: English, Hinglish, Hindi, Marathi, Tamil, Telugu, Kannada, Bengali.
   - **Anti-Hallucination**: Statements without amounts (e.g. *"I sent the money"*) yield `claimed_amount = None` without fabricating numbers.
3. **PDF Document Extractor (`PDFDocumentExtractor`)**:
   - Extracts invoice numbers, total due amounts, dates, and billed-to parties from digital PDFs.
   - Distinguishes scanned PDFs and flags `REQUIRES_VISION_OR_OCR` without hallucinating fields.
4. **AI/VLM Extraction Provider (`AIExtractionProvider`)**:
   - Provider-independent configuration (OpenAI-compatible, Gemini, Custom, Mock).
   - Schema-enforced structured JSON output with strict hallucination guards.

**Unified Extraction Service API**:
```python
from backend.extraction import ExtractionService

ext_service = ExtractionService()

# Extract claims from any Evidence artifact
result = ext_service.extract_from_evidence(evidence)
for claim in result.claims:
    print(f"Claim: {claim.claim_type.value} | Amount: {claim.claimed_amount} | Ref: {claim.reference_id_hint}")
```

---

## 👥 Deterministic Entity Resolution (Day 4 Milestone)

VERITY links extracted `Claim` counterparty hints to canonical `Entity` records with a strict **Zero False Merge** policy:

- **Multi-Signal Deterministic Matching**: Official tax IDs (GSTIN, PAN), UPI VPAs, normalized phone numbers (+91), canonical names, trade aliases, and initials.
- **Explicit Uncertainty & Ambiguity Preservation**: Ambiguous names (e.g. *"Rahul"* with known entities *"Rahul Kumar"* and *"Rahul Sharma"*) strictly yield `AMBIGUOUS` (`selected_entity_id: None`).
- **Conflict Detection**: Conflicting signals (e.g. matching phone + conflicting UPI VPA) yield `CONFLICTING`.
- **Amount/Date Invariance**: Financial amounts and dates are never used as identity proof.

**Entity Resolution Service API**:
```python
from backend.entity_resolution import EntityRegistry, EntityResolutionService

registry = EntityRegistry(known_entities)
service = EntityResolutionService(registry=registry)

# Resolve claim to known entity
resolution = service.resolve_claim(claim)
print(f"Status: {resolution.status.value} | Entity: {resolution.selected_entity_id} | Score: {resolution.score}")
```

---

## 🔗 Deterministic Transaction Matching (Day 5 Milestone)

VERITY matches extracted `Claim` assertions and verified `Transaction` ledger records using transparent multi-signal evaluation:

- **Supported Topologies**:
  - **1:1 Matches**: 1 Invoice $\leftrightarrow$ 1 Payment of equal amount.
  - **Many-to-1 Matches (N:1)**: Milestone payments (e.g. ₹10k + ₹5k + ₹5k) summing to 1 invoice (₹20k).
  - **1-to-Many Matches (1:N)**: Bulk settlements (e.g. ₹20k payment) covering multiple invoices (₹10k + ₹10k).
  - **Partial Payments**: Identifies partial payment relationships without prematurely declaring outstanding balances.
- **Zero False Match Policy**: Equal amounts and dates alone are never sufficient proof to match records across different entities. Ambiguities and conflicts are explicitly preserved.
- **Bounded Combinatorial Search**: Strict limits ($\le 5$ items) to ensure scale and deterministic runtime.

**Transaction Matching Service API**:
```python
from backend.transaction_matching import TransactionMatcher, MatchConfig

matcher = TransactionMatcher(config=MatchConfig(date_tolerance_days=7))

# Match claims against ledger transactions
result = matcher.match(claims=claims, transactions=transactions)
for rel in result.relationships:
    print(f"Topology: {rel.relationship_type.value} | Status: {rel.status.value} | Amount: ₹{rel.matched_amount:,.2f}")
```

---

## 👥 Cross-Modal Evidence Deduplication (Day 6 Milestone)

VERITY non-destructively groups multimodal evidence artifacts (Bank CSV rows, WhatsApp chats, GPay screenshots, Zoho Invoices) into canonical **Event Groups** without erasing source evidence or conflating distinct transactions:

- **Non-Destructive Grouping**: Original `Evidence`, `Claim`, and `Transaction` records remain independently traceable through the provenance DAG.
- **Duplicate Evidence $\neq$ Duplicate Transaction**: Multiple pieces of evidence describing a single payment are merged into 1 financial event. Distinct milestone payments (e.g. ₹10k + ₹5k + ₹5k) remain 3 distinct event groups (`DISTINCT_EVENT`).
- **Cryptographic vs Semantic Duplication**:
  - `DUPLICATE_EVIDENCE_CONTENT`: Exact SHA-256 hash match (e.g. same screenshot file uploaded twice).
  - `SAME_EVENT`: Multi-modal evidence items describing the same financial payment.
  - `POSSIBLE_DUPLICATE`: Preserves contradictory amounts/references for Day 7 Contradiction Detection.

**Deduplication Service API**:
```python
from backend.deduplication import DeduplicationEngine, DeduplicationConfig

engine = DeduplicationEngine(config=DeduplicationConfig(date_tolerance_days=3))

# Group multimodal evidence into canonical event groups
result = engine.deduplicate(
    evidence_items=evidence_items,
    claims=claims,
    transactions=transactions,
    match_relationships=match_relationships,
)

for group in result.groups:
    print(f"Group: {group.group_id} | Status: {group.status.value} | Members: {group.member_evidence_ids}")
```

---

## ⚡ Deterministic Contradiction Detection (Day 7 Milestone)

VERITY identifies and structures financial disagreements across heterogeneous evidence, claims, transactions, entities, and event groups:

- **Detect Disagreement $\neq$ Resolve Disagreement**: Identifies *"Where does the evidence disagree?"* while strictly leaving financial truth synthesis to Day 8 Reconciliation.
- **Structured Discrepancy Taxonomy**:
  - `AMOUNT_MISMATCH` (Claimed vs Bank amount differences not explained by partial payments).
  - `REFERENCE_MISMATCH` (Conflicting explicit UTR / RRN numbers for same event).
  - `ENTITY_MISMATCH` (Counterparty entity disagreement between claim and ledger).
  - `DATE_MISMATCH` (Extreme settlement date drift $> 30$ days).
  - `DIRECTION_MISMATCH` (Expected inflow credit vs debit outflow).
  - `CONFLICTING_CLAIMS` (Multiple contradictory claim amounts in same event group).
- **Zero False Contradiction Policy**:
  - Valid partial payments (`PARTIAL`) are recognized and suppressed from false amount contradictions.
  - GPay vs UPI rail compatibility is preserved without false conflicts.
  - Multilingual equivalent claims are normalized without false contradictions.
  - Missing values (`claimed_amount: None`) are recognized as absence of information, not contradictions.

**Contradiction Detector API**:
```python
from backend.contradiction_detection import ContradictionDetector, ContradictionConfig

detector = ContradictionDetector(config=ContradictionConfig(max_acceptable_date_drift_days=30))

result = detector.detect(
    claims=claims,
    transactions=transactions,
    deduplication_groups=deduplication_groups,
    match_relationships=match_relationships,
    claim_entity_map=entity_map,
)

for disc in result.discrepancies:
    print(f"[{disc.severity.value}] {disc.discrepancy_type.value}: {disc.message}")
```

---

## 🎯 Deterministic Financial Reconciliation (Day 8 Milestone)

VERITY synthesizes explainable, mathematically verified financial conclusions by integrating the outputs of Days 1–7:

- **Pipeline Lineage**:
  $$\mathbf{Evidence \to Claims \to Entity\ Resolution \to Transaction\ Matching \to Deduplication \to Contradiction\ Detection \to Reconciliation}$$
- **Reconciliation Statuses**:
  - `CONFIRMED`: Corroborated by verified ledger transactions, compatible entity/date, with zero unresolved contradictions.
  - `PARTIALLY_SETTLED`: Valid Day 5 partial settlement recognized with exact calculation of outstanding balance (`outstanding = expected - matched`).
  - `CONTRADICTED`: Material Day 7 contradictions (`AMOUNT_MISMATCH`, `REFERENCE_MISMATCH`, `ENTITY_MISMATCH`, etc.) strictly prevent false confirmation.
  - `UNVERIFIABLE`: Assertion lacks bank ledger proof or has unstated amounts.
  - `AMBIGUOUS`: Competing reconciliation paths are preserved without arbitrary decisions.
  - `UNMATCHED`: Standalone ledger transaction without matching obligation.
- **Zero Double-Counting**: Deduplicated multimodal evidence (Invoice + Bank + WhatsApp + Screenshot) resolves to a single reconciliation event.

**Reconciliation Service API**:
```python
from backend.reconciliation import ReconciliationService, ReconciliationConfig

service = ReconciliationService(config=ReconciliationConfig(date_tolerance_days=7))

batch_result = service.reconcile_all(
    claims=claims,
    transactions=transactions,
    evidence_items=evidence_items,
    deduplication_groups=deduplication_groups,
    match_relationships=match_relationships,
    discrepancies=discrepancies,
    claim_entity_map=claim_entity_map,
)

print(f"Total Reconciled: INR {batch_result.total_reconciled_amount:,.2f}")
print(f"Total Outstanding: INR {batch_result.total_outstanding_amount:,.2f}")
```

---

## 📊 Ground-Truth Benchmark (96 Realistic Cases)

VERITY includes a 100% deterministic ground-truth benchmark containing **96 realistic Indian financial cases** across 12 categories:

| Category | Cases | Modalities | Expected Outcomes |
|---|---|---|---|
| **Clean 1:1 Matches** | 10 | `INVOICE`, `BANK_STATEMENT` | `CONFIRMED` |
| **One-to-Many Payments** | 8 | `INVOICE` (N), `BANK_STATEMENT` (1) | `CONFIRMED` |
| **Many-to-One Payments** | 8 | `INVOICE` (1), `BANK_STATEMENT` (N) | `CONFIRMED` |
| **Partial Payments** | 8 | `INVOICE`, `BANK_STATEMENT`, `CHAT` | `PARTIAL` |
| **Cross-Modal Duplicates** | 8 | `SCREENSHOT`, `BANK_STATEMENT` | `DUPLICATE` |
| **Contradictory Claims** | 8 | `CHAT`, `BANK_STATEMENT` | `CONTRADICTED` |
| **Missing Evidence** | 8 | `BANK_STATEMENT` or `INVOICE` | `UNVERIFIABLE` |
| **Identity / Name Variations** | 8 | `INVOICE`, `BANK_STATEMENT` | `CONFIRMED` |
| **Incorrect Reference IDs (Typos)** | 8 | `CHAT`, `BANK_STATEMENT` | `CONFIRMED` (w/ Warning) |
| **Cash Payment Claims** | 6 | `CHAT`, `CASH_VOUCHER`, `INVOICE` | `UNVERIFIABLE` |
| **Multilingual & Hinglish** | 8 | `CHAT`, `INVOICE`, `BANK_STATEMENT` | `CONFIRMED` |
| **Ambiguous Invoices** | 8 | `INVOICE` (N), `BANK_STATEMENT` (1) | `AMBIGUOUS` |

---

## 🚀 Quickstart & Verification

### 1. Requirements
- Python 3.10+
- `pip install pydantic pytest`

### 2. Run Automated Test Suite
```bash
python -m pytest tests/ -v
```

### 3. Run Benchmark Integrity Validator
```bash
python scripts/validate_benchmark.py
```

### 4. Regenerate Benchmark Dataset (Deterministic)
```bash
python scripts/generate_benchmark.py
```

---

## 🗺️ Planned Reconciliation Pipeline

1. **Ingestion**: Capture Bank CSVs, PDFs, Invoices, WhatsApp messages, Screenshots; compute SHA-256 digests.
2. **Extraction**: Parse raw evidence into structured `Claim` and `Transaction` objects.
3. **Entity Resolution**: Map counterparties across trade aliases, GSTINs, PANs, and UPI VPAs.
4. **Deduplication**: Cluster cross-modal evidence (e.g. GPay screenshot + Bank statement line) to prevent double counting.
5. **Transaction Matching**: Solve 1:1, 1:N bulk, and N:1 milestone installment mappings.
6. **Contradiction Detection**: Flag discrepancies between asserted claims and verified ledger reality.
7. **Synthesis & Provenance Sealing**: Output verified `ReconciliationRecord` with complete audit lineage DAG.
