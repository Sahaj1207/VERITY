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
