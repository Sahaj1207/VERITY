"""Golden Demo and Command Center Verification Tests (Day 20).

Verifies:
1. Static assets (index.html, styles.css, app.js) serve properly and contain all 7 scenes.
2. The 5 Curated Golden Demo Scenarios execute smoothly end-to-end:
   - DEMO-01: Clean 1:1 Settlement
   - DEMO-02: Partial Settlement
   - DEMO-03: Amount Contradiction
   - DEMO-04: Messy Multimodal Evidence
   - DEMO-05: Hero Scenario (Counterparty Memory & UTR Reference Reuse)
3. Financial Truth status remains strictly separated from Historical Risk.
4. Draft Journal Vouchers remain balanced and marked as DRAFT.
"""

import pytest
from fastapi.testclient import TestClient

from backend.api.app import create_app


@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)


def test_golden_demo_html_and_assets(client):
    # Test index.html serves and has Golden Demo Command Center structure
    r_index = client.get("/")
    assert r_index.status_code == 200
    html = r_index.text
    assert "GOLDEN DEMO CONTROLLER SCENARIOS" in html
    assert "btn-demo-01" in html
    assert "btn-demo-02" in html
    assert "btn-demo-03" in html
    assert "btn-demo-04" in html
    assert "btn-demo-05" in html
    assert "panel-command-center" in html
    assert "SCENE 1" in html
    assert "SCENE 2" in html
    assert "SCENE 3" in html
    assert "SCENE 4" in html
    assert "SCENES 5 & 6" in html
    assert "SCENE 7" in html

    # Test styles.css
    r_css = client.get("/styles.css")
    assert r_css.status_code == 200
    assert "golden-scenario-btn" in r_css.text
    assert "command-center-narrative" in r_css.text

    # Test app.js
    r_js = client.get("/app.js")
    assert r_js.status_code == 200
    assert "initGoldenDemo" in r_js.text
    assert "updateGoldenCommandCenter" in r_js.text
    assert "runHeroDemoScenario" in r_js.text


def test_golden_scenario_demo_01_clean(client):
    # DEMO-01: Clean 1:1 settlement
    r = client.post("/api/v1/demo-cases/DAY10-01-CLEAN-1TO1/run")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "CONFIRMED"
    assert data["requires_review"] is False

    # Check journal voucher
    r_jv = client.get(f"/api/v1/cases/{data['case_id']}/journal-voucher")
    assert r_jv.status_code == 200
    jv = r_jv.json()
    assert jv["is_balanced"] is True
    assert jv["is_draft"] is True
    assert jv["total_debits"] == 35000.0
    assert jv["total_credits"] == 35000.0


def test_golden_scenario_demo_02_partial(client):
    # DEMO-02: Partial settlement
    r = client.post("/api/v1/demo-cases/DAY10-02-PARTIAL-SETTLEMENT/run")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] in ["PARTIALLY_SETTLED", "PARTIAL"]

    fin = data.get("financial_summary") or {}
    assert fin.get("matched_amount") == 12000.0
    assert fin.get("outstanding_amount") == 8000.0

    # Check payment follow-up action proposal
    r_prop = client.post(
        f"/api/v1/cases/{data['case_id']}/actions/propose",
        json={"action_type": "PAYMENT_FOLLOWUP_DRAFT"},
    )
    assert r_prop.status_code == 200
    act = r_prop.json()
    assert act["approval_status"] == "PENDING_APPROVAL"
    assert "Payment Follow-Up" in act["title"]


def test_golden_scenario_demo_03_contradiction(client):
    # DEMO-03: Contradicted settlement
    r = client.post("/api/v1/demo-cases/DAY10-03-AMOUNT-CONTRADICTION/run")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "CONTRADICTED"
    assert data["requires_review"] is True

    # Controller brief must recommend review/dispute
    r_ctrl = client.get(f"/api/v1/cases/{data['case_id']}/controller/brief")
    assert r_ctrl.status_code == 200
    brief = r_ctrl.json()
    assert brief["controller_decision"]["risk_level"] in ["HIGH", "CRITICAL"]

    # Propose dispute notice
    r_prop = client.post(
        f"/api/v1/cases/{data['case_id']}/actions/propose",
        json={"action_type": "VENDOR_DISPUTE_NOTICE"},
    )
    assert r_prop.status_code == 200
    assert r_prop.json()["approval_status"] == "PENDING_APPROVAL"


def test_golden_scenario_demo_04_multimodal(client):
    # DEMO-04: Cross-modal evidence
    r = client.post("/api/v1/demo-cases/DAY10-08-CROSS-MODAL-MULTIMODAL/run")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "CONFIRMED"
    assert len(data.get("truth_report", {}).get("evidence_summary", [])) >= 2


def test_golden_scenario_demo_05_hero_counterparty_memory(client):
    # HERO DEMO-05: Seed Case 1, then Run Case 2 with reused UTR
    r1 = client.post("/api/v1/demo-cases/DAY18-02-REPEAT-COUNTERPARTY/run")
    assert r1.status_code == 200

    r2 = client.post("/api/v1/demo-cases/DAY18-06-REFERENCE-REUSE/run")
    assert r2.status_code == 200
    data2 = r2.json()

    # 1. Financial Truth remains established
    assert data2["status"] == "CONFIRMED"

    # 2. Intelligence Profile detects reference reuse!
    r_prof = client.get(f"/api/v1/cases/{data2['case_id']}/intelligence-profile")
    assert r_prof.status_code == 200
    prof = r_prof.json()
    assert any(c.get("reuse_warning") is True for c in prof.get("reference_correlations", []))
    assert any(c["reference_id"] == "UTR-CMS-002" for c in prof.get("reference_correlations", []))

    # 3. Controller assesses case
    r_ctrl = client.get(f"/api/v1/cases/{data2['case_id']}/controller/brief")
    assert r_ctrl.status_code == 200
    brief = r_ctrl.json()
    assert "controller_decision" in brief

    # 4. Human Approval Workflow
    r_prop = client.post(
        f"/api/v1/cases/{data2['case_id']}/actions/propose",
        json={"action_type": "MISSING_EVIDENCE_REQUEST"},
    )
    assert r_prop.status_code == 200
    act_id = r_prop.json()["action_id"]

    # Explicit Human Approval
    r_app = client.post(
        f"/api/v1/cases/{data2['case_id']}/actions/{act_id}/approve",
        json={"reviewer_id": "lead_controller"},
    )
    assert r_app.status_code == 200
    assert r_app.json()["approval_status"] == "APPROVED"
    assert r_app.json()["approved_by"] == "lead_controller"

    # 5. Verify action is listed as APPROVED
    r_act = client.get(f"/api/v1/cases/{data2['case_id']}/actions")
    assert r_act.status_code == 200
    acts = r_act.json()
    assert any(a["approval_status"] == "APPROVED" for a in acts)
    assert any(a["approved_by"] == "lead_controller" for a in acts)
