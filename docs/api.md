# VERITY Finance Controller API Documentation

**Day 11 Milestone: Production API Layer & System Endpoints**  
*Razorpay AI Buildathon 2026 | Track: AI Finance Controller*

---

## 1. Overview & Architecture

The **VERITY API** exposes the deterministic 8-stage Finance Controller Pipeline via a high-performance, asynchronous REST interface built with **FastAPI**:

$$\text{Evidence / Payloads} \longrightarrow \text{FastAPI REST Endpoints} \longrightarrow \text{CaseProcessingService} \longrightarrow \text{FinanceControllerPipeline (8 Stages)} \longrightarrow \text{CaseResponse}$$

### 🔒 Safety Guarantees & Non-Negotiables
1. **Uncertainty Preservation**: `AMBIGUOUS`, `CONTRADICTED`, `UNMATCHED`, and `UNVERIFIABLE` statuses are never silently resolved or turned into `CONFIRMED`.
2. **Zero Hallucination**: No LLM is used in financial calculations or status assignment.
3. **Traceability**: Every response contains tamper-evident SHA-256 DAG provenance linking conclusions back to root evidence.

---

## 2. API Endpoints Reference

### System & Health Endpoints

#### `GET /health`
Returns system liveness and service status.

**Response (`200 OK`)**:
```json
{
  "status": "ok",
  "service": "verity",
  "version": "day11"
}
```

#### `GET /api/v1/info`
Returns application capabilities, supported modalities, and pipeline stage inventory.

**Response (`200 OK`)**:
```json
{
  "app_name": "VERITY — Financial Truth, Reconstructed",
  "version": "0.1.0-day11",
  "track": "AI Finance Controller (Razorpay AI Buildathon 2026)",
  "available_pipeline_stages": [
    "INGESTION",
    "EXTRACTION",
    "ENTITY_RESOLUTION",
    "TRANSACTION_MATCHING",
    "DEDUPLICATION",
    "CONTRADICTION_DETECTION",
    "RECONCILIATION",
    "REPORTING"
  ],
  "supported_modalities": [
    "BANK_STATEMENT (CSV)",
    "INVOICE (PDF, Text)",
    "MESSAGING_CHAT (WhatsApp, SMS)",
    "PAYMENT_SCREENSHOT (PNG, JPG)",
    "CASH_VOUCHER"
  ],
  "safety_guarantees": [
    "Zero LLM hallucination in financial math",
    "Deterministic Indian entity resolution (GSTIN, PAN, UPI, Phone)",
    "Strict uncertainty preservation (AMBIGUOUS, CONTRADICTED never falsely confirmed)",
    "Immutable SHA-256 Provenance DAG trace"
  ]
}
```

---

### Case Processing Endpoints

#### `POST /api/v1/cases`
Processes a structured case input object through the 8-stage pipeline.

**Request Body**:
```json
{
  "case_id": "CASE-2026-001",
  "evidence_items": [
    {
      "id": "E1",
      "modality": "INVOICE",
      "source_type": "ZOHO_INVOICE",
      "source_name": "inv_101.pdf",
      "raw_payload": "Invoice for INR 35,000 to Rahul Kumar"
    }
  ],
  "transactions": [
    {
      "id": "T1",
      "amount": 35000.0,
      "direction": "CREDIT",
      "bank_reference": "408219381920",
      "origin_entity_id": "ENT-001"
    }
  ],
  "entities": [
    {
      "id": "ENT-001",
      "canonical_name": "Rahul Kumar",
      "entity_type": "INDIVIDUAL",
      "pan": "ABCDE1234F"
    }
  ],
  "metadata": {
    "precomputed_claims": [
      {
        "id": "C1",
        "evidence_id": "E1",
        "claim_type": "INVOICE_ISSUED",
        "claimed_amount": 35000.0,
        "reference_id_hint": "408219381920",
        "counterparty_hint": "Rahul Kumar"
      }
    ]
  }
}
```

**Response (`200 OK`)**:
```json
{
  "case_id": "CASE-2026-001",
  "status": "CONFIRMED",
  "confidence": 1.0,
  "requires_review": false,
  "financial_summary": {
    "claimed_amount": 35000.0,
    "matched_amount": 35000.0,
    "outstanding_amount": 0.0,
    "total_reconciled_batch": 35000.0,
    "total_outstanding_batch": 0.0,
    "evidence_count": 1,
    "claims_count": 1,
    "transactions_count": 1,
    "discrepancies_count": 0
  },
  "stage_execution": [
    {
      "stage": "INGESTION",
      "status": "SUCCESS",
      "duration_ms": 0.12,
      "items_in": 1,
      "items_out": 1
    }
  ],
  "total_execution_time_ms": 1.25,
  "text_report": "============================================================\nVERITY FINANCIAL TRUTH REPORT\n..."
}
```

#### `POST /api/v1/cases/text`
Direct unstructured text / WhatsApp chat export ingestion.

**Request Body**:
```json
{
  "text": "[23/08/26, 2:30 PM] Rahul Kumar: ₹35,000 sent via UPI 408219381920",
  "source_name": "whatsapp_chat.txt"
}
```

#### `POST /api/v1/cases/files`
Multipart form upload accepting Bank CSVs, PDF invoices, and payment screenshots.

---

### Demo & Provenance Endpoints

#### `GET /api/v1/demo-cases`
Returns all 10 pre-packaged benchmark demonstration cases.

#### `POST /api/v1/demo-cases/{case_id}/run`
Executes a specific pre-packaged benchmark case.

#### `GET /api/v1/cases/{case_id}/provenance`
Returns the structured DAG trace linking final conclusions back to root evidence.

---

## 3. Starting the API Server

```bash
# Run FastAPI server with Uvicorn
uvicorn backend.api.app:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Swagger API docs are accessible at: `http://localhost:8000/docs`
