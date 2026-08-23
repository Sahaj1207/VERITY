/**
 * VERITY — Financial Truth, Reconstructed
 * AI Finance Controller Interactive Client Application
 */

const API_BASE = "";

// State
let currentCaseResult = null;
let activeReportView = "text"; // "text" | "json"
let selectedFiles = [];

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initDropzone();
  initDemoCases();
  initActionButtons();
  checkSystemStatus();
});

// -------------------------------------------------------------
// SYSTEM STATUS
// -------------------------------------------------------------
async function checkSystemStatus() {
  const dot = document.getElementById("system-status-dot");
  const txt = document.getElementById("system-status-text");
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      dot.style.background = "var(--status-confirmed)";
      dot.style.boxShadow = "0 0 8px var(--status-confirmed)";
      txt.textContent = "Engine Online (Day 11)";
    } else {
      throw new Error();
    }
  } catch (e) {
    dot.style.background = "var(--status-contradicted)";
    dot.style.boxShadow = "0 0 8px var(--status-contradicted)";
    txt.textContent = "API Disconnected";
  }
}

// -------------------------------------------------------------
// DEMO SCENARIOS
// -------------------------------------------------------------
async function initDemoCases() {
  const container = document.getElementById("demo-pills-container");
  try {
    const res = await fetch(`${API_BASE}/api/v1/demo-cases`);
    if (!res.ok) return;
    const cases = await res.json();

    container.innerHTML = "";
    cases.forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "demo-btn";
      btn.innerHTML = `<span>▶</span> ${c.title}`;
      btn.title = `${c.description} (Expected: ${c.expected_status})`;
      btn.addEventListener("click", () => runDemoCase(c.case_id, btn));
      container.appendChild(btn);
    });

    // Auto-run first demo case on launch
    if (cases.length > 0) {
      const firstBtn = container.querySelector(".demo-btn");
      if (firstBtn) firstBtn.click();
    }
  } catch (err) {
    console.error("Failed to load demo cases:", err);
  }
}

async function runDemoCase(caseId, btnElement) {
  document.querySelectorAll(".demo-btn").forEach((b) => b.classList.remove("active"));
  if (btnElement) btnElement.classList.add("active");

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/api/v1/demo-cases/${caseId}/run`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderCaseResult(data);
  } catch (err) {
    alert(`Failed to run demo case: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

// -------------------------------------------------------------
// TABS & DROPZONE SETUP
// -------------------------------------------------------------
function initTabs() {
  // Input section tabs
  document.querySelectorAll(".input-section .tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".input-section .tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".input-section .tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Details panel tabs
  document.querySelectorAll(".panel-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".panel-tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".detail-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const targetPanel = document.getElementById(btn.dataset.panel);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  // Report toggle tabs
  document.getElementById("btn-show-text-report").addEventListener("click", () => {
    activeReportView = "text";
    document.getElementById("btn-show-text-report").classList.add("active");
    document.getElementById("btn-show-json-report").classList.remove("active");
    updateReportTerminal();
  });

  document.getElementById("btn-show-json-report").addEventListener("click", () => {
    activeReportView = "json";
    document.getElementById("btn-show-json-report").classList.add("active");
    document.getElementById("btn-show-text-report").classList.remove("active");
    updateReportTerminal();
  });
}

function initDropzone() {
  const dropzone = document.getElementById("file-dropzone");
  const fileInput = document.getElementById("file-input");
  const filePreview = document.getElementById("file-list-preview");

  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--accent-primary)";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "var(--border-subtle)";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--border-subtle)";
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      handleFiles(e.target.files);
    }
  });

  function handleFiles(files) {
    selectedFiles = Array.from(files);
    filePreview.innerHTML = `Selected ${selectedFiles.length} file(s): ` +
      selectedFiles.map((f) => `<strong>${f.name}</strong>`).join(", ");
  }
}

function initActionButtons() {
  document.getElementById("btn-process").addEventListener("click", processCurrentInput);
}

// -------------------------------------------------------------
// PROCESS CUSTOM INPUT
// -------------------------------------------------------------
async function processCurrentInput() {
  const activeTab = document.querySelector(".input-section .tab-btn.active").dataset.tab;
  setLoading(true);

  try {
    let res;
    if (activeTab === "tab-upload") {
      if (!selectedFiles.length) {
        alert("Please select at least one evidence file to upload.");
        setLoading(false);
        return;
      }
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      res = await fetch(`${API_BASE}/api/v1/cases/files`, {
        method: "POST",
        body: formData,
      });
    } else if (activeTab === "tab-text") {
      const textVal = document.getElementById("text-evidence-input").value.trim();
      if (!textVal) {
        alert("Please enter financial text or WhatsApp chat content.");
        setLoading(false);
        return;
      }
      res = await fetch(`${API_BASE}/api/v1/cases/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textVal }),
      });
    } else if (activeTab === "tab-json") {
      const jsonVal = document.getElementById("json-case-input").value.trim();
      let parsed;
      try {
        parsed = JSON.parse(jsonVal);
      } catch (e) {
        alert("Invalid JSON payload: " + e.message);
        setLoading(false);
        return;
      }
      res = await fetch(`${API_BASE}/api/v1/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderCaseResult(data);
  } catch (err) {
    alert(`Case processing failed: ${err.message}`);
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  const spinner = document.getElementById("btn-spinner");
  const btnText = document.getElementById("btn-text");
  const btn = document.getElementById("btn-process");
  if (isLoading) {
    spinner.style.display = "inline-block";
    btnText.textContent = "Analyzing & Reconciling...";
    btn.disabled = true;
  } else {
    spinner.style.display = "none";
    btnText.textContent = "Reconstruct Financial Truth";
    btn.disabled = false;
  }
}

// -------------------------------------------------------------
// RENDER CASE RESULT
// -------------------------------------------------------------
function renderCaseResult(result) {
  currentCaseResult = result;

  // 1. Pipeline Timeline Telemetry
  document.getElementById("total-latency-tag").textContent = `Total Latency: ${result.total_execution_time_ms.toFixed(1)} ms`;
  if (result.stage_execution) {
    result.stage_execution.forEach((rec) => {
      const box = document.getElementById(`stage-${rec.stage}`);
      if (box) {
        box.className = `stage-box ${rec.status.toLowerCase()}`;
        const metricsEl = box.querySelector(".stage-metrics");
        if (metricsEl) {
          metricsEl.textContent = `${rec.duration_ms.toFixed(1)}ms (${rec.items_in}→${rec.items_out})`;
        }
      }
    });
  }

  // 2. Financial Truth Hero Card
  const heroBadge = document.getElementById("hero-status-badge");
  heroBadge.className = `status-badge-lg badge-${result.status}`;
  heroBadge.textContent = result.status;

  const confPct = Math.round(result.confidence * 100);
  document.getElementById("hero-confidence-val").textContent = `${confPct}%`;
  document.getElementById("hero-confidence-bar").style.width = `${confPct}%`;

  const reviewBadge = document.getElementById("hero-review-badge");
  if (result.requires_review) {
    reviewBadge.style.color = "var(--status-partial)";
    reviewBadge.textContent = "⚠️ HUMAN REVIEW RECOMMENDED";
  } else {
    reviewBadge.style.color = "var(--status-confirmed)";
    reviewBadge.textContent = "✓ NO REVIEW REQUIRED";
  }

  const truthReport = result.truth_report;
  if (truthReport) {
    document.getElementById("hero-title").textContent = truthReport.title || `Financial Case: ${result.case_id}`;
    document.getElementById("hero-summary").textContent = truthReport.summary || result.text_report;
  } else {
    document.getElementById("hero-title").textContent = `Case: ${result.case_id}`;
    document.getElementById("hero-summary").textContent = `Status: ${result.status} | Confidence: ${confPct}%`;
  }

  // 3. Financial Metrics
  const fin = result.financial_summary || {};
  document.getElementById("metric-claimed").textContent = fin.claimed_amount != null ? `₹${fin.claimed_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "None";
  document.getElementById("metric-matched").textContent = `₹${(fin.matched_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  document.getElementById("metric-outstanding").textContent = `₹${(fin.outstanding_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  document.getElementById("metric-discrepancies").textContent = fin.discrepancies_count || 0;

  // 4. Panel Tabs Counters & Content
  renderEvidencePanel(truthReport);
  renderMatchingPanel(truthReport);
  renderContradictionsPanel(truthReport);
  renderConfidenceFactorsPanel(truthReport);
  renderActionsPanel(truthReport);
  renderProvenancePanel(result);
  updateReportTerminal();
}

function renderEvidencePanel(report) {
  const tabBtn = document.querySelector('[data-panel="panel-evidence"]');
  const container = document.getElementById("evidence-list-container");
  const items = report?.evidence_summary || [];
  tabBtn.textContent = `Evidence (${items.length})`;

  if (!items.length) {
    container.innerHTML = '<p style="color: var(--text-faint); font-size: 0.88rem;">No evidence items loaded.</p>';
    return;
  }

  container.innerHTML = items.map((e) => `
    <div class="evidence-item">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <strong style="color: var(--accent-secondary); font-size: 0.9rem;">[${e.modality}] ${e.source_name}</strong>
        <span style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-faint);">${e.evidence_id}</span>
      </div>
      <p style="font-size: 0.84rem; color: var(--text-muted);">${e.summary}</p>
      ${e.sha256_hash ? `<div style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--text-faint); margin-top: 0.3rem;">SHA-256: ${e.sha256_hash.substring(0, 24)}...</div>` : ""}
    </div>
  `).join("");
}

function renderMatchingPanel(report) {
  const container = document.getElementById("matching-details-container");
  const match = report?.matching_summary;
  if (!match) {
    container.innerHTML = '<p style="color: var(--text-faint); font-size: 0.88rem;">No matching topology available.</p>';
    return;
  }

  container.innerHTML = `
    <div class="evidence-item">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <strong>Pattern: <span style="color: var(--accent-primary);">${match.pattern}</span></strong>
        <span class="tag-badge">Score: ${(match.score * 100).toFixed(0)}%</span>
      </div>
      <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 0.5rem;">${match.explanation}</p>
      <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
        ${(match.matched_signals || []).map((s) => `<span class="tag-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--status-confirmed); border-color: rgba(16, 185, 129, 0.3);">✓ ${s}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderContradictionsPanel(report) {
  const tabBtn = document.querySelector('[data-panel="panel-contradictions"]');
  const container = document.getElementById("contradictions-list-container");
  const items = report?.contradiction_summary || [];
  tabBtn.textContent = `Contradictions (${items.length})`;

  if (!items.length) {
    container.innerHTML = '<p style="color: var(--status-confirmed); font-size: 0.88rem;">✓ No contradictions or discrepancies detected.</p>';
    return;
  }

  container.innerHTML = items.map((d) => `
    <div class="disc-item error">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
        <strong style="color: var(--status-contradicted); font-size: 0.9rem;">${d.discrepancy_type} [${d.severity}]</strong>
        <span style="font-size: 0.75rem; font-family: var(--font-mono);">${d.id}</span>
      </div>
      <p style="font-size: 0.86rem; color: var(--text-main); margin-bottom: 0.4rem;">${d.message}</p>
      ${d.expected_value ? `<div style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--text-muted);">Expected: <strong>${d.expected_value}</strong> | Observed: <strong style="color: var(--status-contradicted);">${d.observed_value}</strong></div>` : ""}
    </div>
  `).join("");
}

function renderConfidenceFactorsPanel(report) {
  const container = document.getElementById("factors-list-container");
  const items = report?.confidence_breakdown || [];
  if (!items.length) {
    container.innerHTML = '<p style="color: var(--text-faint); font-size: 0.88rem;">No confidence factors generated.</p>';
    return;
  }

  container.innerHTML = items.map((f) => `
    <div class="factor-item ${f.impact === "+" ? "positive" : "negative"}">
      <strong style="color: ${f.impact === "+" ? "var(--status-confirmed)" : "var(--status-contradicted)"}; font-size: 0.88rem;">
        ${f.impact} ${f.factor_type}
      </strong>
      <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">${f.description}</p>
    </div>
  `).join("");
}

function renderActionsPanel(report) {
  const container = document.getElementById("actions-list-container");
  const items = report?.recommended_actions || [];
  if (!items.length) {
    container.innerHTML = '<p style="color: var(--text-faint); font-size: 0.88rem;">No action required.</p>';
    return;
  }

  container.innerHTML = items.map((act) => `
    <div class="evidence-item" style="border-left: 3px solid var(--accent-secondary);">
      <p style="font-size: 0.88rem; color: var(--text-main);">→ ${act}</p>
    </div>
  `).join("");
}

function renderProvenancePanel(result) {
  const container = document.getElementById("provenance-details-container");
  const prov = result?.provenance || result?.truth_report?.provenance;
  if (!prov) {
    container.innerHTML = '<p style="color: var(--text-faint); font-size: 0.88rem;">No provenance nodes recorded.</p>';
    return;
  }

  container.innerHTML = `
    <div class="evidence-item" style="font-family: var(--font-mono); font-size: 0.82rem;">
      <div style="margin-bottom: 0.4rem;"><strong>Reconciliation ID:</strong> ${prov.reconciliation_id || "None"}</div>
      <div style="margin-bottom: 0.4rem;"><strong>Evidence Node IDs:</strong> ${(prov.evidence_ids || []).join(", ") || "None"}</div>
      <div style="margin-bottom: 0.4rem;"><strong>Claim Node IDs:</strong> ${(prov.claim_ids || []).join(", ") || "None"}</div>
      <div style="margin-bottom: 0.4rem;"><strong>Transaction Node IDs:</strong> ${(prov.transaction_ids || []).join(", ") || "None"}</div>
      <div><strong>Discrepancy Node IDs:</strong> ${(prov.discrepancy_ids || []).join(", ") || "None"}</div>
    </div>
  `;
}

function updateReportTerminal() {
  const term = document.getElementById("report-terminal");
  if (!currentCaseResult) {
    term.textContent = "Select a case to inspect report outputs.";
    return;
  }

  if (activeReportView === "text") {
    term.textContent = currentCaseResult.text_report || "No text report generated.";
  } else {
    term.textContent = JSON.stringify(currentCaseResult, null, 2);
  }
}
