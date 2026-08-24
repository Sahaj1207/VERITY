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

## 📑 Explainable Financial Truth & Reporting (Day 9 Milestone)

VERITY generates structured, deterministic Financial Truth Reports (`FinancialTruthReport`) that explain *WHY* financial conclusions were reached using only verified facts:

- **Core Invariant**: $\mathbf{Evidence \neq Claim \neq Transaction \neq Reconciliation \neq Explanation}$.
- **Zero Hallucination Guarantee**: Every summary, number, reference, and justification is derived deterministically from canonical domain records. Missing values are presented as `"Unknown"` or `"Not provided"`.
- **Explainability & Actionable Insights**:
  - Transparent executive summaries and detailed accounting paragraphs.
  - Confidence breakdown with positive (`+`) and negative (`-`) signal factors.
  - Specific recommended actions tailored for finance controllers (e.g. tracking partial balances, auditing conflicting evidence).
  - Explicit provenance DAG references across all domain nodes.

**Reporting Service API**:
```python
from backend.reporting import ReportingService

service = ReportingService()

report = service.build_report(
    reconciliation_result=recon_result,
    claims=claims,
    transactions=transactions,
    evidence=evidence,
    entities=entities,
    match_relationships=match_relationships,
    deduplication_groups=deduplication_groups,
    discrepancies=discrepancies,
    case_id="INV-2026-088",
)

# Output text and JSON
print(service.render_text_report(report))
```

---

## ⚡ End-to-End Finance Controller Pipeline (Day 10 Milestone)

VERITY provides a unified, deterministic entry point (`CaseProcessingService`) coordinating all 8 sequential stages of financial truth reconstruction:

$$\text{Evidence} \to \text{Ingestion} \to \text{Extraction} \to \text{Entity Resolution} \to \text{Matching} \to \text{Deduplication} \to \text{Contradictions} \to \text{Reconciliation} \to \text{Reporting}$$

- **Core Invariant**: $\mathbf{Evidence \neq Claim \neq Transaction \neq Match \neq Deduplication \neq Discrepancy \neq Reconciliation \neq Explanation}$.
- **Stage Execution Telemetry**: Tracks granular stage performance, input/output item counts, and latency in milliseconds.
- **Strict Uncertainty Preservation**: Ambiguities, discrepancies, and unverified claims are never falsely confirmed.
- **Audit-Ready Results**: Produces structured `CaseProcessingResult` with human-readable text and JSON report outputs.

**Pipeline Orchestrator API**:
```python
from backend.case_processing import CaseInput, CaseProcessingService
from backend.domain.transaction import Transaction, TransactionDirection

service = CaseProcessingService()

case_input = CaseInput(
    case_id="CASE-2026-088",
    raw_file_paths=["data/invoices/inv_088.pdf"],
    transactions=[
        Transaction(id="TXN-088", amount=35000.0, direction=TransactionDirection.CREDIT, bank_reference="408219381920")
    ],
)

result = service.process_case(case_input)

print(f"Final Status   : {result.status}")
print(f"Confidence     : {result.confidence_score * 100:.0f}%")
print(f"Total Latency  : {result.total_execution_time_ms:.2f} ms")
print(f"Recorded Stages: {len(result.stage_records)}")
print(result.to_text_report())
```

---

## 🌐 Finance Controller API & Interactive UI (Day 11 & Day 12 Milestones)

VERITY includes a production-hardened **FastAPI REST API** and an interactive **Finance Controller Dashboard**:

- **Unified REST API (`backend.api`)**:
  - `GET /health` — Basic liveness probe.
  - `GET /ready` — Subsystem readiness diagnostics (Config, Case Store, Benchmark, Pipeline).
  - `GET /api/v1/info` — Metadata and supported modalities.
  - `POST /api/v1/cases` — Structured `CaseInput` payload processing with security bounds.
  - `POST /api/v1/cases/text` — Raw WhatsApp / SMS chat export ingestion with length limits.
  - `POST /api/v1/cases/files` — Multipart file uploads (PDF, CSV, PNG/JPG, TXT) with MIME and size validation.
  - `GET /api/v1/demo-cases` & `POST /api/v1/demo-cases/{case_id}/run` — 10 benchmark demonstration scenarios.
  - `GET /api/v1/cases/{case_id}/report` & `GET /api/v1/cases/{case_id}/provenance` — Truth reports & DAG trace.
- **Security & Reliability Hardening (`Day 12`)**:
  - **Defensive Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cache-Control: no-store`.
  - **Request Tracing**: `X-Request-ID` attached to all request lifecycles.
  - **Input Sanitization**: Path traversal and null-byte prevention in filenames; MIME whitelisting.
  - **Structured Error Contract**: Standardized `ErrorResponse` with machine-readable `ErrorCode` enum and traceback masking.
  - **Configuration**: Typed settings in `backend/config.py` with environment variable overrides (`.env.example`).
- **Interactive UI (`frontend/`)**:
  - 10 One-Click Benchmark demonstration cases.
  - Live 8-stage pipeline telemetry with sub-millisecond precision.
  - Financial Truth Hero Card with confidence meters and human-review flags.
  - Deep investigation tabs for Evidence, Matching Topology, Contradictions, Confidence Signals, Recommended Actions, Provenance DAG, and Raw Reports.

**Running the Web Application**:
```bash
# Launch FastAPI backend with static frontend mounted at http://localhost:8000
python -m uvicorn backend.api.app:app --host 0.0.0.0 --port 8000 --reload
```

**Running the Smoke Test**:
```bash
python scripts/smoke_test_api.py
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

## 🧠 AI Finance Controller & Decision Intelligence (Day 13)

VERITY features an intelligent decision-support layer situated above its deterministic core:

$$\textbf{Core Principle: AI MAY EXPLAIN DETERMINISTIC RESULTS. AI MUST NEVER OVERRIDE DETERMINISTIC FINANCIAL TRUTH.}$$

- **Deterministic Signal Extraction**: Discrepancies, ambiguities, settlements, and confirmations extracted into verifiable signals.
- **Controller Policy Engine**: Risk classification (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `NONE`) and primary action verdicts (`INVESTIGATE_CONTRADICTION`, `VERIFY_ENTITY`, `VERIFY_TRANSACTION`, `REVIEW_CASE`, `REQUEST_MISSING_EVIDENCE`, `CONFIRM_RECONCILIATION`).
- **Action Prioritization**: Ranked action directives (1..10) with exact domain IDs.
- **Strict Fact-Checking AI Explainer**: Validates natural language generation against known amounts and entities with automatic fallback.
- **Grounded Q&A**: Answers natural-language controller queries citing exact supporting IDs.

---

## 👤 Human Review & Audit Workflow (Day 14)

$$\textbf{Core Invariant: HUMAN REVIEW DECISION } \neq \textbf{ DETERMINISTIC FINANCIAL TRUTH.}$$

- **Non-Destructive Review Layer**: A human controller may record decisions (e.g. `CONFIRMED`, `NEEDS_MORE_EVIDENCE`, `ESCALATED`, `ACKNOWLEDGED`), but this **never** overwrites the underlying mathematical and deterministic truth.
- **Finite State Workflow**: Governs case lifecycle (`NOT_REQUIRED` $\to$ `PENDING` $\to$ `IN_PROGRESS` $\to$ `RESOLVED` $\to$ `CLOSED`).
- **Append-Only Notes & Evidence Inspection**: Audit logs track every evidence artifact inspected without modifying raw evidence objects.
- **Cryptographic Audit Chaining**: Every review mutation creates an immutable `AuditEvent` bound via SHA-256 hash chaining ($H_i = \text{SHA-256}(H_{i-1} \parallel \text{Event}_i)$).
- **Cross-Case Protection**: Prevents unauthorized references to artifacts outside the active case context.

---

## 📊 Financial Case Portfolio & Operations Intelligence (Day 15)

$$\textbf{Core Invariant: PORTFOLIO INTELLIGENCE MUST NEVER MODIFY FINANCIAL TRUTH.}$$
$$\textbf{OPERATIONAL STATUS } \neq \textbf{ DETERMINISTIC FINANCIAL TRUTH.}$$

- **Portfolio Aggregation & Exposure**: Synthesizes open, in-review, escalated, and resolved cases with strict zero double-counting.
- **SLA & Aging Engine**: Computes deterministic deadlines by priority (`CRITICAL`: 4h, `HIGH`: 24h, `MEDIUM`: 72h, `LOW`: 7d) tracking `ON_TRACK`, `DUE_SOON` ($\le 20\%$ window remaining), and `OVERDUE` states.
- **Reviewer Assignment & Capacity Monitoring**: Tracks active case allocations per reviewer with automated overload detection (`critical > 5`, `open > 20`, `overdue > 5`).
- **Deterministic Prioritization**: Computes explainable `PortfolioPriorityScore` combining controller risk, contradictions, SLA urgency, exposure, and unresolved issues.
- **Multi-Key Query Engine**: Search across cases, counterparties, UTRs, amounts, and dates with bounded pagination.

---

## 💾 Persistent Storage & Durable Audit Infrastructure (Day 16 Milestone)

VERITY features an audit-grade, restart-safe data layer backed by standard SQL repositories:
- **18 Strongly Typed SQL Tables**: Covers cases, raw evidence, extracted claims, resolved entities, bank transactions, match topologies, deduplication clusters, discrepancies, reconciliation results, truth reports, controller decisions, human review records, append-only notes, evidence inspections, audit event logs, reviewer assignments, portfolio operational state, and idempotency records.
- **Deterministic Truth & Raw Evidence Immutability**: Financial truth results and ingested raw evidence fingerprints are strictly immutable in persistent storage.
- **Cryptographic SHA-256 Hash Chaining**: Every audit event is chained to its predecessor ($H_i = \text{SHA-256}(H_{i-1} \parallel \text{Event}_i)$) with automated database-level tamper detection.
- **Atomic Transactions & Savepoints**: All-or-nothing case persistence with nested savepoint rollbacks and zero partial failure leaks.
- **Restart Recovery**: 100% operational restoration of portfolio state, reviewer assignments, review notes, and audit chains across cold application restarts.

---

## 👁️ Real Multimodal Evidence Intelligence (Day 17 Milestone)

VERITY incorporates true vision-language and semantic extraction for messy real-world evidence:
- **Multimodal VLM Transport**: Passes raw image pixels (`PNG`, `JPEG`, `WEBP`) as base64-encoded payloads into Vision LLM providers (`google-genai` `gemini-3.6-flash`) without polluting financial data models.
- **Scanned PDF Page Extraction**: Automatically detects image-only PDFs, renders embedded page images, and extracts structured claims via multimodal VLM.
- **Messy Hinglish & Relative Dates**: Robust extraction for natural vernacular WhatsApp text (e.g. *"bhai kal 20k bhej diya usko UPI se"*), resolving relative date anchors (`kal`, `yesterday`, `parso`, `Tuesday`) against reference timestamps.
- **Earliest Assertion Disambiguation**: Deterministically selects the primary asserted amount based on textual positioning in sentences with conflicting numbers.
- **Strict Anti-Hallucination Guardrails**: Null values for omitted amounts/counterparties are preserved as `UNKNOWN` rather than being fabricated.
- **Tri-Tier Verification**: Strict separation of Mock (CI/CD), Local Fixtures (offline pipeline), and Live Gemini Inference verification tiers.

---

## 🏛️ Cross-Case Intelligence & Counterparty Memory (Day 18 Milestone)

VERITY features an institutional counterparty memory layer backed by persistent SQL analytics:
- **Cross-Case Reference History**: Detects reused bank UTRs and invoice IDs across distinct cases and counterparties (`⚠️ REFERENCE REUSE DETECTED`).
- **Counterparty Risk & Volume Aggregation**: Tracks lifetime transaction volume, dispute ratios, and recurring settlement patterns.
- **Strict Truth Isolation**: Historical intelligence computes operational risk flags without ever mutating intra-case mathematical reconciliation truth.

---

## ⚡ Proactive Controller Actions & Human-in-the-Loop Remediation (Day 19 Milestone)

- **Grounded Notice Generation**: Generates contextual Vendor Dispute Notices, Payment Follow-Up reminders, and Missing Evidence requests cited strictly against reconciliation evidence.
- **Double-Entry Draft Journal Engine**: Generates mathematically balanced draft journal vouchers ($\sum \text{Debits} = \sum \text{Credits}$, $\text{len} \ge 2$) explicitly labeled as `DRAFT` with configurable Chart of Accounts support.
- **Mandatory Human-in-the-Loop Gate**: All proposed actions start as `PENDING_APPROVAL`. Zero external dispatches occur without explicit human controller authorization.

---

## 🎯 Golden Demo & Finance Controller Command Center (Day 20 Milestone)

- **7-Scene Panoramic Narrative**: Complete visual cockpit taking judges from messy heterogeneous evidence through side-by-side AI Extraction vs. Deterministic Truth, Counterparty Memory, Controller Decision Brief, Human Approval, and Cryptographic Provenance.
- **5 Curated Demo Scenarios**: Instant 1-click execution of Clean 1:1 (`DEMO-01`), Partial Settlement (`DEMO-02`), Amount Contradiction (`DEMO-03`), Messy Multimodal Chat (`DEMO-04`), and Hero Counterparty Reference Reuse (`DEMO-05`).

---

## 🛡️ Adversarial Security & Release Hardening (Day 21 Milestone)

- **23 Adversarial Attack Vectors Blocked**: Mathematical fact-grounding, double-entry balance validation, transaction crash rollbacks, and SHA-256 tamper-evident chain verification.
- **Full Invariant Preservation**: 100% deterministic truth immutability, zero AI hallucination of accounting figures, and complete cross-case isolation.

---

## 🚀 Quickstart & Verification

### 1. Requirements
- Python 3.10+
- `pip install -r requirements.txt` (including `fastapi`, `uvicorn`, `google-genai`, `pypdf`, `pillow`, `pytest`)

### 2. Run Complete Automated Test Suite (393 Tests)
```bash
python -m pytest tests/ -v
```

### 3. Run Ground-Truth Benchmark Validation (96 Cases)
```bash
python scripts/validate_benchmark.py
```

### 4. Run Multimodal Evidence Extraction Evaluation (16 Scenarios)
```bash
python scripts/evaluate_extraction.py
```

### 5. Run Cross-Case Intelligence & Reference History Evaluation (12 Scenarios)
```bash
python scripts/evaluate_cross_case.py
```

### 6. Run Proactive Remediation & Journal Safety Evaluation (12 Scenarios)
```bash
python scripts/evaluate_remediation.py
```

### 7. Run Persistent Storage & Audit Infrastructure Evaluation (12 Scenarios)
```bash
python scripts/evaluate_storage.py
```

### 8. Run Case Portfolio & Operations Evaluation (12 Scenarios)
```bash
python scripts/evaluate_portfolio.py
```

### 9. Run Human Review & Audit Workflow Evaluation (10 Scenarios)
```bash
python scripts/evaluate_review_workflow.py
```

### 10. Run Controller Decision Intelligence Evaluation (10 Scenarios)
```bash
python scripts/evaluate_controller.py
```

### 11. Run API Smoke Tests (10 System Checks)
```bash
python scripts/smoke_test_api.py
```

### 12. Launch Fast and Interactive Web Dashboard
```bash
python -m uvicorn backend.api.app:app --reload --port 8000
```
Visit `http://localhost:8000` to interact with the **🎯 Controller Command Center (Golden Demo)**, visual Financial Truth Reconstructor, Case Portfolio Console, Human Review Workspace, and Storage & Audit Integrity Monitor.

---

## 🗺️ Unified Reconciliation & Intelligence Pipeline

1. **Ingestion & Multimodal Vision**: Ingest Bank CSVs, PDFs, Invoices, WhatsApp messages, Screenshots; compute SHA-256 digests and preserve image base64 metadata.
2. **Extraction**: Parse raw evidence into structured `Claim` and `Transaction` objects via deterministic parsers or Gemini VLM (`gemini-3.6-flash`).
3. **Entity Resolution**: Map counterparties across trade aliases, GSTINs, PANs, and UPI VPAs with zero false merges.
4. **Transaction Matching**: Solve 1:1, 1:N bulk, and N:1 milestone installment mappings.
5. **Deduplication**: Cluster cross-modal evidence (e.g. GPay screenshot + Bank statement line) to prevent double counting.
6. **Contradiction Detection**: Flag discrepancies between asserted claims and verified ledger reality.
7. **Reconciliation Synthesis**: Output verified `ReconciliationRecord` with complete audit lineage DAG.
8. **Explainable Truth Reporting**: Generate structured, tamper-evident `FinancialTruthReport`.
9. **AI Finance Controller**: Assign risk ratings, actionable next steps, and grounded natural-language brief.
10. **Cross-Case Institutional Memory**: Query historical counterparty volume and detect cross-case reference/UTR reuse.
11. **Human-Gated Remediation**: Generate fact-grounded notice drafts and balanced double-entry draft journal vouchers.
12. **Human Review & Audit**: Finite-state case investigation, append-only notes, and cryptographic hash-chained audit logging.
13. **Portfolio & Operations**: Portfolio-wide exposure aggregation, SLA aging, reviewer assignment, and prioritization queue.
14. **Persistent Storage & Audit**: Durable, ACID-compliant SQLite storage with tamper-evident SHA-256 audit lineage.



