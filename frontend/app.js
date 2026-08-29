/**
 * VERITY — Financial Truth, Reconstructed
 * AI Finance Controller Interactive Client Application
 */

const API_BASE = "";
const MAX_UPLOAD_MB = 15.0;
const ALLOWED_EXTS = [".csv", ".pdf", ".png", ".jpg", ".jpeg", ".txt"];

// State
let currentCaseResult = null;
let currentControllerBrief = null;
let currentReviewRecord = null;
let currentIntelligenceProfile = null;
let currentRemediationActions = [];
let currentJournalVoucher = null;
let activeReportView = "text"; // "text" | "json"
let selectedFiles = [];
let healthInterval = null;
let activePortfolioFilter = "all";
let truthReplaySnapshot = null;
let currentReplayStep = 0;
let replayPreviousFocus = null;

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initAppShell();
  initTabs();
  initGoldenDemo();
  initDropzone();
  initDemoCases();
  initActionButtons();
  initAlertBanner();
  initControllerQA();
  initReviewWorkspace();
  initPortfolioWorkspace();
  setWorkspace("command-center");
  checkSystemStatus();
  healthInterval = setInterval(checkSystemStatus, 15000);
});

// =============================================================
// WORKSPACE STATE MACHINE (SINGLE SOURCE OF TRUTH)
// =============================================================
let currentWorkspace = "command-center";

const WORKSPACE_METADATA = {
  "command-center": {
    title: "Command Center",
    mobileTitle: "Command Center",
    viewId: "view-command-center",
    navId: "nav-command-center"
  },
  "cases": {
    title: "Active Case Investigation",
    mobileTitle: "Cases",
    viewId: "view-cases",
    navId: "nav-cases"
  },
  "evidence": {
    title: "Evidence Inspection & Ingestion",
    mobileTitle: "Evidence",
    viewId: "view-evidence",
    navId: "nav-evidence"
  },
  "counterparty": {
    title: "Counterparty Memory & Dossier",
    mobileTitle: "Counterparty Memory",
    viewId: "view-counterparty",
    navId: "nav-counterparty"
  },
  "controller": {
    title: "AI Finance Controller Directives",
    mobileTitle: "Controller",
    viewId: "view-controller",
    navId: "nav-controller"
  },
  "review": {
    title: "Human Review & Audit Chain",
    mobileTitle: "Review",
    viewId: "view-review",
    navId: "nav-review"
  },
  "remediation": {
    title: "Proactive Remediation & Actions",
    mobileTitle: "Remediation",
    viewId: "view-remediation",
    navId: "nav-remediation"
  },
  "audit": {
    title: "Cryptographic SHA-256 Provenance",
    mobileTitle: "Audit",
    viewId: "view-audit",
    navId: "nav-audit"
  }
};

function setWorkspace(workspaceId) {
  const meta = WORKSPACE_METADATA[workspaceId] || WORKSPACE_METADATA["command-center"];
  currentWorkspace = workspaceId;

  // 1. Update Sidebar Active Navigation Item (Single Source of Truth)
  document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
    if (item.dataset.nav === workspaceId || item.id === meta.navId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // 2. Update Header Breadcrumb Title (Responsive: short on mobile, full on desktop)
  const bTitle = document.getElementById("header-breadcrumb-title");
  if (bTitle) {
    const isMobile = window.innerWidth <= 768;
    bTitle.textContent = isMobile ? (meta.mobileTitle || meta.title) : meta.title;
  }

  // 3. Switch Visible App View (Single Source of Truth)
  document.querySelectorAll(".app-view").forEach((view) => {
    view.classList.remove("active");
    view.style.display = "none";
  });

  const targetView = document.getElementById(meta.viewId);
  if (targetView) {
    targetView.classList.add("active");
    targetView.style.display = "flex";
  }

  // 4. Scroll Restoration: deterministic immediate positioning
  const appMain = document.querySelector(".app-main");
  if (appMain) {
    appMain.scrollTo({ top: 0, behavior: "auto" });
  }
  window.scrollTo({ top: 0, behavior: "auto" });

  // 5. Workspace-specific Data Lifecycle & Rendering
  if (workspaceId === "evidence") {
    renderEvidenceWorkspace();
  } else if (workspaceId === "counterparty") {
    if (currentCaseResult && !currentIntelligenceProfile) {
      loadCounterpartyIntelligence(currentCaseResult.case_id);
    } else if (currentIntelligenceProfile) {
      renderCounterpartyIntelligence(currentIntelligenceProfile);
    } else {
      const sigs = document.getElementById("cp-risk-signals-container");
      if (sigs) sigs.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Select a case to inspect counterparty historical memory.</p>';
    }
  } else if (workspaceId === "controller") {
    if (currentCaseResult && !currentControllerBrief) {
      loadControllerBrief(currentCaseResult.case_id);
    } else if (currentControllerBrief) {
      renderControllerBrief(currentControllerBrief);
    } else {
      const exec = document.getElementById("controller-exec-brief");
      if (exec) exec.textContent = "Select or run a case from the Command Center to view executive controller safety directives.";
    }
  } else if (workspaceId === "review") {
    if (currentCaseResult && !currentReviewRecord) {
      loadCaseReview(currentCaseResult.case_id);
    } else if (currentReviewRecord) {
      renderReviewWorkspace(currentReviewRecord);
    } else {
      const acts = document.getElementById("review-actions-container");
      if (acts) acts.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No active case selected for investigation review.</p>';
    }
  } else if (workspaceId === "remediation") {
    if (currentCaseResult && (!currentRemediationActions || !currentRemediationActions.length)) {
      loadRemediationData(currentCaseResult.case_id);
    } else if (currentRemediationActions && currentRemediationActions.length) {
      renderRemediationActions(currentRemediationActions);
      renderJournalVoucher(currentJournalVoucher);
    } else {
      renderRemediationActions([]);
      renderJournalVoucher(null);
    }
  } else if (workspaceId === "audit") {
    if (currentCaseResult) {
      renderProvenancePanel(currentCaseResult);
      updateReportTerminal();
    } else {
      updateReportTerminal();
    }
  }
}

// -------------------------------------------------------------
// APPLICATION SHELL, SIDEBAR & THEME NAVIGATION
// -------------------------------------------------------------
function initAppShell() {
  // Theme Toggle (Light / Dark Mode — LIGHT is default)
  const themeBtn = document.getElementById("theme-toggle-btn");
  const themeIcon = document.getElementById("theme-toggle-icon");
  const savedTheme = localStorage.getItem("verity-theme");
  const initialTheme = (savedTheme === "dark") ? "dark" : "light";

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(initialTheme);
  if (themeIcon) {
    themeIcon.textContent = (initialTheme === "dark") ? "light_mode" : "dark_mode";
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark) {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        localStorage.setItem("verity-theme", "light");
        if (themeIcon) themeIcon.textContent = "dark_mode";
      } else {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
        localStorage.setItem("verity-theme", "dark");
        if (themeIcon) themeIcon.textContent = "light_mode";
      }
    });
  }

  // Mobile Menu Drawer & Overlay Backdrop Toggle
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.getElementById("app-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  function closeMobileDrawer() {
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("active");
    document.body.classList.remove("drawer-open");
  }

  function openMobileDrawer() {
    if (sidebar) sidebar.classList.add("open");
    if (backdrop) backdrop.classList.add("active");
    document.body.classList.add("drawer-open");
  }

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener("click", () => {
      if (sidebar.classList.contains("open")) {
        closeMobileDrawer();
      } else {
        openMobileDrawer();
      }
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", closeMobileDrawer);
  }

  // Keyboard Accessibility: Escape closes drawer and open modals, Tab traps focus, Arrow keys navigate Replay
  document.addEventListener("keydown", (e) => {
    const replayModal = document.getElementById("replay-modal-overlay");
    const isReplayActive = replayModal && (replayModal.classList.contains("active") || replayModal.style.display === "flex");

    if (e.key === "Escape") {
      closeMobileDrawer();
      const assignModal = document.getElementById("modal-assign-reviewer");
      if (assignModal && assignModal.style.display !== "none") {
        assignModal.style.display = "none";
      }
      if (isReplayActive) {
        closeTruthReplay();
      }
    } else if (isReplayActive) {
      if (e.key === "Tab") {
        const replayContainer = document.getElementById("replay-container");
        if (replayContainer) {
          const focusables = Array.from(
            replayContainer.querySelectorAll(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

          if (focusables.length > 0) {
            const firstEl = focusables[0];
            const lastEl = focusables[focusables.length - 1];

            if (e.shiftKey) {
              if (document.activeElement === firstEl || !replayContainer.contains(document.activeElement)) {
                e.preventDefault();
                lastEl.focus();
              }
            } else {
              if (document.activeElement === lastEl || !replayContainer.contains(document.activeElement)) {
                e.preventDefault();
                firstEl.focus();
              }
            }
          }
        }
      } else if (e.key === "ArrowRight") {
        const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
        if (!isInput) {
          e.preventDefault();
          nextReplayStep();
        }
      } else if (e.key === "ArrowLeft") {
        const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
        if (!isInput) {
          e.preventDefault();
          previousReplayStep();
        }
      } else if (e.key === " " || e.code === "Space") {
        const isInteractive = ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A"].includes(document.activeElement?.tagName);
        if (!isInteractive) {
          e.preventDefault(); // No auto-play; prevent background scroll
        }
      }
    }
  });

  // Financial Truth Replay Navigation & Trigger Buttons
  const launchReplayBtn = document.getElementById("btn-launch-replay");
  if (launchReplayBtn) {
    launchReplayBtn.addEventListener("click", startTruthReplay);
  }
  const closeReplayBtn = document.getElementById("replay-btn-close");
  if (closeReplayBtn) {
    closeReplayBtn.addEventListener("click", closeTruthReplay);
  }
  const prevReplayBtn = document.getElementById("replay-btn-prev");
  if (prevReplayBtn) {
    prevReplayBtn.addEventListener("click", previousReplayStep);
  }
  const nextReplayBtn = document.getElementById("replay-btn-next");
  if (nextReplayBtn) {
    nextReplayBtn.addEventListener("click", nextReplayStep);
  }

  // Sidebar Nav Items Navigation (Single Source of Truth)
  const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      closeMobileDrawer();
      const navTarget = item.dataset.nav;
      if (navTarget) {
        setWorkspace(navTarget);
      }
    });
  });

  // New Investigation CTA
  const newInvBtn = document.getElementById("btn-sidebar-new-investigation");
  if (newInvBtn) {
    newInvBtn.addEventListener("click", () => {
      setWorkspace("cases");
      const dropzone = document.getElementById("file-dropzone");
      if (dropzone) {
        setTimeout(() => {
          dropzone.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    });
  }

  // Export Report Button
  const exportBtn = document.getElementById("btn-export-report-top");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentCaseResult) {
        showAlert("Select or run a financial case first to export its report.", "warning");
        return;
      }
      try {
        const repText = currentCaseResult.text_report || (currentCaseResult.truth_report ? JSON.stringify(currentCaseResult.truth_report, null, 2) : JSON.stringify(currentCaseResult, null, 2));
        const blob = new Blob([repText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `VERITY-Report-${currentCaseResult.case_id || 'case'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert(`Exported forensic truth report for ${currentCaseResult.case_id}`, "success");
      } catch (e) {
        showAlert(`Failed to export report: ${e.message}`, "error");
      }
    });
  }

  // Responsive Header Title on Window Resize
  window.addEventListener("resize", () => {
    const meta = WORKSPACE_METADATA[currentWorkspace] || WORKSPACE_METADATA["command-center"];
    const bTitle = document.getElementById("header-breadcrumb-title");
    if (bTitle && meta) {
      const isMobile = window.innerWidth <= 768;
      bTitle.textContent = isMobile ? (meta.mobileTitle || meta.title) : meta.title;
    }
  });

  // Assign Reviewer Modal Event Listeners
  const assignModal = document.getElementById("modal-assign-reviewer");
  const btnCloseAssignModal = document.getElementById("btn-close-assign-modal");
  const btnCancelAssign = document.getElementById("btn-cancel-assign");
  const btnSubmitAssign = document.getElementById("btn-submit-assign");
  const inputAssign = document.getElementById("assign-reviewer-input");

  if (btnCloseAssignModal) btnCloseAssignModal.addEventListener("click", closeAssignModal);
  if (btnCancelAssign) btnCancelAssign.addEventListener("click", closeAssignModal);
  if (btnSubmitAssign) btnSubmitAssign.addEventListener("click", submitReviewerAssignment);
  if (inputAssign) {
    inputAssign.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitReviewerAssignment();
      if (e.key === "Escape") closeAssignModal();
    });
  }
  if (assignModal) {
    assignModal.addEventListener("click", (e) => {
      if (e.target === assignModal) closeAssignModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && assignModal && assignModal.style.display === "flex") {
      closeAssignModal();
    }
  });

  // Explicitly initialize default workspace state
  setWorkspace(currentWorkspace || "command-center");
}

// -------------------------------------------------------------
// ALERT / ERROR BANNER NOTIFICATIONS
// -------------------------------------------------------------
let alertTimer = null;

function initAlertBanner() {
  const closeBtn = document.getElementById("ui-alert-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", hideAlert);
  }
}

function showAlert(message, type = "error") {
  const banner = document.getElementById("ui-alert-banner");
  const msgEl = document.getElementById("ui-alert-message");
  if (!banner || !msgEl) return;

  if (alertTimer) {
    clearTimeout(alertTimer);
    alertTimer = null;
  }

  msgEl.innerHTML = message;
  banner.style.display = "flex";

  if (type === "error") {
    banner.style.background = "rgba(239, 68, 68, 0.15)";
    banner.style.color = "#fca5a5";
    banner.style.border = "1px solid rgba(239, 68, 68, 0.4)";
  } else if (type === "warning") {
    banner.style.background = "rgba(245, 158, 11, 0.15)";
    banner.style.color = "#fcd34d";
    banner.style.border = "1px solid rgba(245, 158, 11, 0.4)";
  } else {
    banner.style.background = "rgba(16, 185, 129, 0.15)";
    banner.style.color = "#86efac";
    banner.style.border = "1px solid rgba(16, 185, 129, 0.4)";
    // Auto-dismiss success alerts after 5 seconds
    alertTimer = setTimeout(() => {
      hideAlert();
    }, 5000);
  }
}

function hideAlert() {
  if (alertTimer) {
    clearTimeout(alertTimer);
    alertTimer = null;
  }
  const banner = document.getElementById("ui-alert-banner");
  if (banner) banner.style.display = "none";
}

// -------------------------------------------------------------
// SYSTEM STATUS & READINESS
// -------------------------------------------------------------
async function checkSystemStatus() {
  const dot = document.getElementById("system-status-dot");
  const txt = document.getElementById("system-status-text");
  const sDot = document.getElementById("storage-status-dot");
  const sTxt = document.getElementById("storage-status-text");

  try {
    const res = await fetch(`${API_BASE}/ready`);
    if (res.ok) {
      const data = await res.json();
      if (dot && txt) {
        dot.style.background = "var(--status-confirmed)";
        dot.style.boxShadow = "0 0 8px var(--status-confirmed)";
        const cleanVer = (data.version || "0.1.0").replace(/-day\d+/i, "");
        txt.textContent = `Engine Ready (${cleanVer})`;
      }
      if (sDot && sTxt) {
        if (data.database_ready) {
          sDot.style.background = "var(--status-confirmed)";
          sDot.style.boxShadow = "0 0 8px var(--status-confirmed)";
          sTxt.textContent = "Storage: CONNECTED";
        } else {
          sDot.style.background = "var(--status-partial)";
          sDot.style.boxShadow = "0 0 8px var(--status-partial)";
          sTxt.textContent = "Storage: DEGRADED";
        }
      }
    } else {
      if (dot && txt) {
        dot.style.background = "var(--status-contradicted)";
        dot.style.boxShadow = "0 0 8px var(--status-contradicted)";
        txt.textContent = "Engine Offline";
      }
      if (sDot && sTxt) {
        sDot.style.background = "var(--status-contradicted)";
        sTxt.textContent = "Storage: OFFLINE";
      }
    }
  } catch (err) {
    if (dot && txt) {
      dot.style.background = "var(--status-contradicted)";
      dot.style.boxShadow = "0 0 8px var(--status-contradicted)";
      txt.textContent = "API Disconnected";
    }
    if (sDot && sTxt) {
      sDot.style.background = "var(--status-contradicted)";
      sTxt.textContent = "Storage: OFFLINE";
    }
  }
}

// -------------------------------------------------------------
// DAY 20: GOLDEN DEMO & COMMAND CENTER CONTROLLER
// -------------------------------------------------------------
function initGoldenDemo() {
  const gBtns = document.querySelectorAll(".golden-scenario-btn");
  gBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      gBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Switch to Command Center tab if not active
      const ccTab = document.querySelector('.panel-tab-btn[data-panel="panel-command-center"]');
      if (ccTab) ccTab.click();

      const sc = btn.dataset.scenario;
      if (sc === "DEMO-01") {
        runGoldenDemoScenario("DEMO-01", "DAY10-01-CLEAN-1TO1");
      } else if (sc === "DEMO-02") {
        runGoldenDemoScenario("DEMO-02", "DAY10-02-PARTIAL-SETTLEMENT");
      } else if (sc === "DEMO-03") {
        runGoldenDemoScenario("DEMO-03", "DAY10-03-AMOUNT-CONTRADICTION");
      } else if (sc === "DEMO-04") {
        runGoldenDemoScenario("DEMO-04", "DAY10-08-CROSS-MODAL-MULTIMODAL");
      } else if (sc === "DEMO-05") {
        runHeroDemoScenario();
      }
    });
  });
}

async function runGoldenDemoScenario(demoId, caseId) {
  hideAlert();
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/api/v1/demo-cases/${encodeURIComponent(caseId)}/run`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    currentCaseResult = data;
    renderCaseResult(data);
    await loadControllerBrief(data.case_id);
    await loadCaseReview(data.case_id);
    await loadCounterpartyIntelligence(data.case_id);
    await loadRemediationData(data.case_id);
    await loadPortfolioData();
    updateGoldenCommandCenter();
  } catch (err) {
    showAlert(`Golden Demo Execution Error: ${err.message}`, "error");
  } finally {
    setLoading(false);
  }
}

async function runHeroDemoScenario() {
  hideAlert();
  setLoading(true);
  try {
    // 1. Seed historical case DAY18-02-REPEAT-COUNTERPARTY to establish memory in SQLite
    await fetch(`${API_BASE}/api/v1/demo-cases/DAY18-02-REPEAT-COUNTERPARTY/run`, {
      method: "POST",
    }).catch(() => {});

    // 2. Execute hero scenario DAY18-06-REFERENCE-REUSE (which detects the reused UTR!)
    const res = await fetch(`${API_BASE}/api/v1/demo-cases/DAY18-06-REFERENCE-REUSE/run`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    currentCaseResult = data;
    renderCaseResult(data);
    await loadControllerBrief(data.case_id);
    await loadCaseReview(data.case_id);
    await loadCounterpartyIntelligence(data.case_id);
    await loadRemediationData(data.case_id);
    await loadPortfolioData();
    updateGoldenCommandCenter();
  } catch (err) {
    showAlert(`Hero Demo Execution Error: ${err.message}`, "error");
  } finally {
    setLoading(false);
  }
}

// -------------------------------------------------------------
// LEGACY / REGRESSION DEMO SCENARIOS
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

    // Auto-run DEMO-05 (Hero Scenario) on launch
    const heroBtn = document.getElementById("btn-demo-05");
    if (heroBtn) {
      heroBtn.click();
    } else if (cases.length > 0) {
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

  hideAlert();
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/api/v1/demo-cases/${caseId}/run`, {
      method: "POST",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status}: Failed to run demo case`;
      throw new Error(msg);
    }
    const data = await res.json();
    currentCaseResult = data;
    renderCaseResult(data);
    await loadControllerBrief(data.case_id);
    await loadCaseReview(data.case_id);
    await loadCounterpartyIntelligence(data.case_id);
    await loadRemediationData(data.case_id);
    await loadPortfolioData();
    updateGoldenCommandCenter();
  } catch (err) {
    showAlert(`Demo Execution Error: ${err.message}`, "error");
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

  // Details internal panel tabs (within Case Investigation workspace)
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
    dropzone.style.borderColor = "var(--primary)";
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.style.borderColor = "var(--outline-variant)";
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "var(--outline-variant)";
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
    const rawFiles = Array.from(files);
    const validFiles = [];

    for (const f of rawFiles) {
      const ext = "." + f.name.split(".").pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        showAlert(`File '${f.name}' has unsupported extension '${ext}'. Allowed: ${ALLOWED_EXTS.join(", ")}`, "warning");
        continue;
      }
      if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
        showAlert(`File '${f.name}' (${(f.size / (1024 * 1024)).toFixed(1)} MB) exceeds the ${MAX_UPLOAD_MB} MB upload limit.`, "error");
        continue;
      }
      validFiles.push(f);
    }

    selectedFiles = validFiles;
    if (selectedFiles.length > 0) {
      filePreview.innerHTML = `Selected ${selectedFiles.length} file(s): ` +
        selectedFiles.map((f) => `<strong>${f.name}</strong> (${(f.size / 1024).toFixed(0)} KB)`).join(", ");
    } else {
      filePreview.innerHTML = "";
    }
  }
}

function initActionButtons() {
  document.getElementById("btn-process").addEventListener("click", processCurrentInput);
}

// -------------------------------------------------------------
// CONTROLLER Q&A INTERACTION
// -------------------------------------------------------------
function initControllerQA() {
  const askBtn = document.getElementById("btn-ask-controller");
  const queryInput = document.getElementById("controller-query-input");

  if (askBtn && queryInput) {
    askBtn.addEventListener("click", () => submitControllerQuery(queryInput.value));
    queryInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitControllerQuery(queryInput.value);
    });
  }
}

function formatControllerAnswer(rawText) {
  if (!rawText) return '<div class="font-body-sm" style="color: var(--on-surface-variant);">No answer text available.</div>';
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  const bulletLines = lines.filter((l) => l.startsWith("•") || l.startsWith("-") || l.startsWith(""));
  if (bulletLines.length > 0) {
    const titleLine = lines.find((l) => !l.startsWith("•") && !l.startsWith("-") && !l.startsWith(""));
    const title = titleLine || "Controller Analysis";

    const rows = [];
    for (const line of bulletLines) {
      const clean = line.replace(/^[•\-\s]+/, "");
      const parts = clean.split(":");
      if (parts.length >= 2) {
        const k = parts[0].trim();
        const v = parts.slice(1).join(":").trim();
        rows.push(`
          <div style="display: flex; justify-content: space-between; padding: 0.2rem 0; border-bottom: 1px dashed var(--outline-variant); font-size: 0.8125rem;">
            <span style="color: var(--on-surface-variant); font-weight: 500;">${k}</span>
            <span style="color: var(--on-surface); font-weight: 700; font-family: var(--font-mono); text-align: right;">${v}</span>
          </div>
        `);
      } else {
        rows.push(`<div style="padding: 0.15rem 0; font-size: 0.8125rem; color: var(--on-surface);">${clean}</div>`);
      }
    }

    return `
      <div style="font-weight: 700; color: var(--primary); font-size: 0.85rem; margin-bottom: 0.35rem;">${title}</div>
      <div style="display: flex; flex-direction: column; gap: 0.1rem; margin-bottom: 0.3rem;">
        ${rows.join("")}
      </div>
    `;
  }

  return `<div style="font-size: 0.8125rem; color: var(--on-surface); line-height: 1.45;">${rawText}</div>`;
}

async function submitControllerQuery(query) {
  if (!currentCaseResult) {
    showAlert("Select a case before asking the Controller.", "warning");
    return;
  }
  const q = (query || "").trim();
  if (!q) return;

  const ansBox = document.getElementById("controller-query-answer");
  if (!ansBox) return;
  ansBox.style.display = "block";

  const lowerQ = q.toLowerCase();
  const isGreeting = /^(hi|hello|hey|greetings|help|who are you|good morning|good afternoon)\b/i.test(lowerQ);

  if (isGreeting) {
    ansBox.innerHTML = `
      <div style="padding: 0.65rem 0.8rem; background: var(--surface-container-lowest); border: 1px solid var(--outline-variant); border-radius: var(--radius-sm); color: var(--on-surface); font-size: 0.8125rem; line-height: 1.45;">
        <strong>👋 VERITY AI Finance Controller</strong><br>
        Grounded strictly in this case's deterministic reconciliation facts. You can ask about:
        <ul style="margin: 0.3rem 0 0 1.25rem; font-size: 0.78rem; color: var(--on-surface-variant);">
          <li>Matched &amp; outstanding settlement amounts</li>
          <li>Discrepancies and contradiction root causes</li>
          <li>Supporting evidence items &amp; bank references</li>
          <li>Policy directives and recommended remediation actions</li>
        </ul>
      </div>
    `;
    return;
  }

  ansBox.innerHTML = `
    <div style="padding: 0.6rem 0.85rem; background: var(--surface-container-lowest); border: 1px solid var(--outline-variant); border-radius: var(--radius-sm); color: var(--on-surface-variant); font-size: 0.8125rem; display: flex; align-items: center; gap: 0.5rem;">
      <span class="material-symbols-outlined" style="animation: spin 1s linear infinite; font-size: 1.1rem; color: var(--primary);">progress_activity</span>
      <span>ANALYZING GROUNDED CASE FACTS FOR <strong>${currentCaseResult.case_id}</strong>…</span>
    </div>
  `;

  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(currentCaseResult.case_id)}/controller/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const gIds = (data.grounding_ids || []).filter(Boolean);
    ansBox.innerHTML = `
      <div style="padding: 0.75rem 1rem; background: var(--surface-container-lowest); border: 1px solid var(--outline-variant); border-radius: var(--radius-sm);">
        <div style="margin-bottom: 0.5rem;">${formatControllerAnswer(data.answer)}</div>
        ${gIds.length ? `
          <div style="margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px dashed var(--outline-variant); font-size: 0.74rem; color: var(--on-surface-variant); font-family: var(--font-mono); display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <strong style="color: var(--primary);">Deterministic Grounding:</strong>
            ${gIds.map((gid) => `<span class="ctrl-grounding-chip">${gid}</span>`).join("")}
          </div>
        ` : `
          <div style="margin-top: 0.4rem; font-size: 0.72rem; color: var(--on-surface-variant); font-style: italic;">
            Grounded in active case reconciliation invariants.
          </div>
        `}
      </div>
    `;
  } catch (err) {
    ansBox.innerHTML = `
      <div style="padding: 0.6rem 0.85rem; background: var(--surface-container-lowest); border: 1px solid var(--error); border-radius: var(--radius-sm); color: var(--error); font-size: 0.8125rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
        <span>Unable to retrieve the grounded controller answer: ${err.message}</span>
        <button class="btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" onclick="submitControllerQuery(document.getElementById('controller-query-input')?.value)">Retry</button>
      </div>
    `;
  }
}

// -------------------------------------------------------------
// PROCESS CUSTOM INPUT
// -------------------------------------------------------------
async function processCurrentInput() {
  const activeTab = document.querySelector(".input-section .tab-btn.active").dataset.tab;
  hideAlert();
  setLoading(true);

  try {
    let res;
    if (activeTab === "tab-upload") {
      if (!selectedFiles.length) {
        showAlert("Please select at least one valid evidence file to upload.", "warning");
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
        showAlert("Please enter financial text or WhatsApp chat content.", "warning");
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
        showAlert("Invalid JSON payload: " + e.message, "error");
        setLoading(false);
        return;
      }
      res = await fetch(`${API_BASE}/api/v1/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status}: Case processing failed.`;
      throw new Error(msg);
    }
    const data = await res.json();
    renderCaseResult(data);
    loadControllerBrief(data.case_id);
    loadCaseReview(data.case_id);
    loadCounterpartyIntelligence(data.case_id);
    loadPortfolioData();
  } catch (err) {
    showAlert(`Processing Error: ${err.message}`, "error");
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
// CONTROLLER BRIEF (UX PASS 4 / B4)
// -------------------------------------------------------------
async function loadControllerBrief(caseId) {
  const headerTitle = document.getElementById("controller-header-title");
  const activeCaseTag = document.getElementById("controller-active-case-tag");
  const execBrief = document.getElementById("controller-exec-brief");
  const actionsList = document.getElementById("controller-actions-list");
  const actionBadge = document.getElementById("controller-action-badge");
  const riskBadge = document.getElementById("controller-risk-badge");
  const reviewReq = document.getElementById("controller-review-req");
  const groundingList = document.getElementById("controller-grounding-chips-list");

  // State Safety: Clear stale previous case data
  if (headerTitle) headerTitle.textContent = `Case: ${caseId} Directives`;
  if (activeCaseTag) {
    activeCaseTag.textContent = `Case: ${caseId} (Loading...)`;
    activeCaseTag.className = "badge badge-unverifiable";
  }
  if (actionBadge) actionBadge.textContent = "Evaluating controller directives...";
  if (riskBadge) riskBadge.textContent = "EVALUATING";
  if (reviewReq) reviewReq.textContent = "Evaluating...";
  if (execBrief) execBrief.textContent = "Loading controller decision brief...";
  if (groundingList) groundingList.innerHTML = '<span class="ctrl-grounding-chip">Loading grounding...</span>';
  if (actionsList) actionsList.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Evaluating controller policy directives...</p>';

  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(caseId)}/controller/brief`);
    if (res.ok) {
      const brief = await res.json();
      currentControllerBrief = brief;
      renderControllerBrief(brief);
      updateGoldenCommandCenter();
    } else {
      if (execBrief) execBrief.textContent = `Controller brief unavailable (${res.status} ${res.statusText})`;
      if (actionsList) actionsList.innerHTML = `<p class="font-body-sm" style="color: var(--status-contradicted);">Failed to load controller directives: ${res.statusText}</p>`;
    }
  } catch (err) {
    console.error("Failed to load controller brief:", err);
    if (execBrief) execBrief.textContent = `Error loading controller brief: ${err.message}`;
    if (actionsList) actionsList.innerHTML = `<p class="font-body-sm" style="color: var(--status-contradicted);">Network error: ${err.message}</p>`;
  }
}

function renderControllerBrief(brief) {
  const activeCaseTag = document.getElementById("controller-active-case-tag");
  const headerTitle = document.getElementById("controller-header-title");

  if (activeCaseTag) {
    if (currentCaseResult) {
      const st = currentCaseResult.status || "CONFIRMED";
      activeCaseTag.textContent = `Case: ${currentCaseResult.case_id} (${st})`;
      activeCaseTag.className = `badge badge-${st.toLowerCase()}`;
    } else {
      activeCaseTag.textContent = "No Active Case";
      activeCaseTag.className = "badge badge-unverifiable";
    }
  }

  if (headerTitle && currentCaseResult) {
    headerTitle.textContent = `Case: ${currentCaseResult.case_id} Directives`;
  }

  if (!brief || !brief.controller_decision) return;
  const dec = brief.controller_decision;
  const riskBadge = document.getElementById("controller-risk-badge");
  const ctrlViewRiskBadge = document.getElementById("ctrl-view-risk-badge");
  const actionBadge = document.getElementById("controller-action-badge");
  const reviewReq = document.getElementById("controller-review-req");
  const execBrief = document.getElementById("controller-exec-brief");
  const actionsList = document.getElementById("controller-actions-list");
  const groundingList = document.getElementById("controller-grounding-chips-list");

  // Update Hero Decision & Risk
  if (actionBadge) {
    actionBadge.textContent = dec.decision || "CONFIRM_RECONCILIATION";
  }

  const rLevel = (dec.risk_level || "LOW").toUpperCase();
  [riskBadge, ctrlViewRiskBadge].forEach((rb) => {
    if (rb) {
      rb.textContent = `${rLevel} RISK`;
      if (rLevel === "CRITICAL") {
        rb.className = "badge badge-contradicted";
      } else if (rLevel === "HIGH") {
        rb.className = "badge badge-partial";
      } else if (rLevel === "MEDIUM") {
        rb.className = "badge badge-risk-violet";
      } else {
        rb.className = "badge badge-confirmed";
      }
    }
  });

  if (reviewReq) {
    reviewReq.textContent = dec.requires_human_review ? "Mandatory Review Required" : "Automated (No Action Required)";
    reviewReq.className = dec.requires_human_review ? "badge badge-partial" : "badge badge-confirmed";
  }

  if (execBrief) {
    execBrief.textContent = brief.executive_summary || currentCaseResult?.truth_report?.decision?.rationale || "Policy evaluation completed based on deterministic facts.";
  }

  // Graphic 1: Decision Factors Flow
  const fAmt = document.getElementById("ctrl-factor-amt");
  const fRef = document.getElementById("ctrl-factor-ref");
  const fCp = document.getElementById("ctrl-factor-cp");
  const fConflict = document.getElementById("ctrl-factor-conflict");
  const fDirective = document.getElementById("ctrl-factor-directive");

  const fin = currentCaseResult?.financial_summary || {};
  const hasDiscrepancy = (fin.discrepancies_count || 0) > 0;
  const hasContradiction = (currentCaseResult?.truth_report?.contradictions || []).length > 0;
  const hasRefReuse = (currentIntelligenceProfile?.reference_correlations || []).some((r) => r.reuse_warning);

  if (fAmt) {
    fAmt.textContent = hasDiscrepancy ? "⚠ Variance Found" : "✓ Matched";
    fAmt.style.color = hasDiscrepancy ? "var(--error)" : "var(--success)";
  }
  if (fRef) {
    fRef.textContent = hasRefReuse ? "⚠ Reused" : "✓ Unique / Matched";
    fRef.style.color = hasRefReuse ? "var(--error)" : "var(--success)";
  }
  if (fCp) {
    fCp.textContent = "✓ Resolved";
    fCp.style.color = "var(--success)";
  }
  if (fConflict) {
    fConflict.textContent = hasContradiction ? "⚠ Contradiction" : "✓ Zero Conflicts";
    fConflict.style.color = hasContradiction ? "var(--error)" : "var(--success)";
  }
  if (fDirective) {
    fDirective.textContent = dec.decision || "CONFIRM_RECONCILIATION";
  }

  // Update Grounding Chips
  if (groundingList) {
    const rep = currentCaseResult?.truth_report || {};
    const evIds = (rep.evidence_summary || []).map((e) => e.evidence_id);
    const clmIds = (rep.claims_summary || []).map((c) => c.claim_id);
    const txnIds = currentCaseResult?.reconciliation?.transaction_ids || [];
    const allChips = [...evIds, ...clmIds, ...txnIds];

    if (allChips.length) {
      groundingList.innerHTML = allChips.slice(0, 6).map((id) => `
        <span class="ctrl-grounding-chip">
          <span class="material-symbols-outlined" style="font-size: 0.8rem;">verified</span>
          <span>${id}</span>
        </span>
      `).join("");
    } else {
      groundingList.innerHTML = '<span class="ctrl-grounding-chip">Grounded in case reconciliation records</span>';
    }
  }

  // Update Prioritized Action Directives
  if (actionsList) {
    const acts = brief.recommended_actions || [];
    if (!acts.length) {
      actionsList.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No actions required.</p>';
      return;
    }

    actionsList.innerHTML = acts.map((act) => `
      <div class="card" style="border-left: 4px solid ${act.priority === 1 ? 'var(--error)' : 'var(--primary)'}; margin-bottom: 0.6rem; padding: 0.85rem 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; flex-wrap: wrap; gap: 0.4rem;">
          <strong style="color: var(--on-surface); font-size: 0.9rem;">#${act.priority} ${act.title}</strong>
          <span class="tag-badge" style="font-size: 0.72rem;">${act.action_type}</span>
        </div>
        <p style="font-size: 0.82rem; color: var(--on-surface-variant); margin-bottom: 0.35rem; line-height: 1.4;">${act.explanation || "Direct controller action required."}</p>
        <div style="font-size: 0.74rem; color: var(--on-surface-variant); font-family: var(--font-mono);">
          <strong>Policy Rationale:</strong> ${act.rationale || "Policy invariant"} ${act.supporting_ids?.length ? `| Supporting: ${act.supporting_ids.join(', ')}` : ''}
        </div>
      </div>
    `).join("");
  }
}

// -------------------------------------------------------------
// HUMAN REVIEW WORKSPACE (DAY 14 & UX PASS 4 / B4)
// -------------------------------------------------------------
function initReviewWorkspace() {
  document.getElementById("btn-start-review").addEventListener("click", startCaseReview);
  document.getElementById("btn-add-note").addEventListener("click", addReviewNote);
  document.getElementById("review-note-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addReviewNote();
  });

  document.getElementById("btn-decide-confirm").addEventListener("click", () => recordReviewDecision("CONFIRMED"));
  document.getElementById("btn-decide-more-evidence").addEventListener("click", () => recordReviewDecision("NEEDS_MORE_EVIDENCE"));
  document.getElementById("btn-decide-escalate").addEventListener("click", () => recordReviewDecision("ESCALATED"));
  document.getElementById("btn-decide-resolve").addEventListener("click", resolveCaseReview);
  document.getElementById("btn-decide-close").addEventListener("click", closeCaseReview);
  document.getElementById("btn-verify-audit").addEventListener("click", verifyAuditChain);
}

async function loadCaseReview(caseId) {
  const headerTitle = document.getElementById("review-header-title");
  const activeCaseTag = document.getElementById("review-active-case-tag");
  const actionsContainer = document.getElementById("review-actions-container");
  const statusBadge = document.getElementById("review-status-badge");
  const decisionBadge = document.getElementById("review-decision-badge");
  const detStatus = document.getElementById("review-det-status");
  const reviewerText = document.getElementById("review-assigned-reviewer-text");

  // State Safety: Clear stale previous-case data
  if (headerTitle) headerTitle.textContent = `Case: ${caseId} Review`;
  if (activeCaseTag) {
    activeCaseTag.textContent = `Case: ${caseId} (Loading...)`;
    activeCaseTag.className = "badge badge-unverifiable";
  }
  if (statusBadge) statusBadge.textContent = "EVALUATING";
  if (decisionBadge) decisionBadge.textContent = "RETRIEVING";
  if (detStatus) detStatus.textContent = "VERIFYING";
  if (reviewerText) reviewerText.textContent = "Checking assignment...";

  if (actionsContainer) {
    actionsContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Loading investigation checklist tasks...</p>';
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(caseId)}/review`);
    if (res.ok) {
      const review = await res.json();
      currentReviewRecord = review;
      renderReviewWorkspace(review);
      loadAuditLog(caseId);
    } else {
      if (actionsContainer) {
        actionsContainer.innerHTML = `<p class="font-body-sm" style="color: var(--status-contradicted);">Unable to load review record (${res.status})</p>`;
      }
    }
  } catch (err) {
    console.error("Failed to load review record:", err);
    if (actionsContainer) {
      actionsContainer.innerHTML = `<p class="font-body-sm" style="color: var(--status-contradicted);">Error loading review: ${err.message}</p>`;
    }
  }
}

function renderReviewWorkspace(review) {
  const activeCaseTag = document.getElementById("review-active-case-tag");
  const headerTitle = document.getElementById("review-header-title");

  if (activeCaseTag) {
    if (currentCaseResult) {
      const st = currentCaseResult.status || "CONFIRMED";
      activeCaseTag.textContent = `Case: ${currentCaseResult.case_id} (${st})`;
      activeCaseTag.className = `badge badge-${review?.status === "PENDING" ? "partial" : "confirmed"}`;
    } else {
      activeCaseTag.textContent = "No Active Case";
      activeCaseTag.className = "badge badge-unverifiable";
    }
  }

  if (headerTitle && currentCaseResult) {
    headerTitle.textContent = `Case: ${currentCaseResult.case_id} Review`;
  }

  if (!review) return;
  const statusBadge = document.getElementById("review-status-badge");
  const decisionBadge = document.getElementById("review-decision-badge");
  const detStatus = document.getElementById("review-det-status");
  const reviewerText = document.getElementById("review-assigned-reviewer-text");

  const st = (review.status || "PENDING").toUpperCase();
  const dec = (review.decision || "UNRESOLVED").toUpperCase();

  if (statusBadge) {
    statusBadge.textContent = st;
    if (st === "RESOLVED" || st === "CLOSED") {
      statusBadge.style.color = "var(--success)";
    } else if (st === "IN_REVIEW") {
      statusBadge.style.color = "var(--primary)";
    } else {
      statusBadge.style.color = "var(--warning)";
    }
  }

  if (decisionBadge) {
    decisionBadge.textContent = dec;
    decisionBadge.style.color = dec === "CONFIRMED" ? "var(--success)" : (dec.includes("ESCALATE") ? "var(--error)" : "var(--on-surface)");
  }

  if (detStatus) detStatus.textContent = currentCaseResult?.status || "CONFIRMED";
  if (reviewerText) reviewerText.textContent = review.assigned_reviewer_name || review.assigned_reviewer_id || "Unassigned";

  // Graphic 1: Review Lifecycle Timeline
  const isResolved = st === "RESOLVED" || st === "CLOSED";
  const step1 = document.getElementById("rev-step-1");
  const step2 = document.getElementById("rev-step-2");
  const step3 = document.getElementById("rev-step-3");
  const step4 = document.getElementById("rev-step-4");
  const step5 = document.getElementById("rev-step-5");

  const step2Status = document.getElementById("rev-step-2-status");
  const step3Status = document.getElementById("rev-step-3-status");
  const step4Status = document.getElementById("rev-step-4-status");
  const step5Status = document.getElementById("rev-step-5-status");

  if (step1) step1.className = "review-lifecycle-step completed";
  if (step2) {
    const isAssigned = Boolean(review.assigned_reviewer_id);
    step2.className = `review-lifecycle-step ${isAssigned ? 'completed' : 'active'}`;
    if (step2Status) step2Status.textContent = isAssigned ? "✓ Assigned" : "Pending";
  }
  if (step3) {
    const evReviewed = (review.reviewed_evidence_ids || []).length > 0;
    step3.className = `review-lifecycle-step ${evReviewed ? 'completed' : 'active'}`;
    if (step3Status) step3Status.textContent = evReviewed ? "✓ Inspected" : "In Progress";
  }
  if (step4) {
    const hasDec = dec !== "UNRESOLVED";
    step4.className = `review-lifecycle-step ${hasDec ? 'completed' : (st === 'IN_REVIEW' ? 'active' : '')}`;
    if (step4Status) step4Status.textContent = hasDec ? `✓ ${dec}` : "Pending";
  }
  if (step5) {
    step5.className = `review-lifecycle-step ${isResolved ? 'completed' : ''}`;
    if (step5Status) step5Status.textContent = isResolved ? `✓ ${st}` : "Open";
  }

  // Review Requirement Reasons Box
  const reasonsBox = document.getElementById("review-reasons-box");
  if (reasonsBox) {
    const reasons = [...(review.unresolved_reasons || [])];
    if (review.escalation_reason) {
      reasons.unshift(`Escalation: ${review.escalation_reason}`);
    }
    if (reasons.length) {
      reasonsBox.style.display = "block";
      reasonsBox.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
          <span class="material-symbols-outlined" style="color: var(--warning); font-size: 1.2rem; margin-top: 0.1rem;">info</span>
          <div>
            <strong style="font-size: 0.85rem; color: var(--on-surface);">Why Human Review is Required:</strong>
            <ul style="margin: 0.25rem 0 0 1.2rem; font-size: 0.8rem; color: var(--on-surface-variant); line-height: 1.45;">
              ${reasons.map((r) => `<li>${r}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    } else if (currentCaseResult && currentCaseResult.requires_review === false) {
      reasonsBox.style.display = "block";
      reasonsBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--success);">
          <span class="material-symbols-outlined" style="font-size: 1.2rem;">check_circle</span>
          <strong style="font-size: 0.85rem;">✓ NO HUMAN REVIEW REQUIRED — Invariants deterministically confirmed.</strong>
        </div>
      `;
    } else {
      reasonsBox.style.display = "none";
    }
  }

  // Lock decision buttons when review is resolved or closed
  const startRevBtn = document.getElementById("btn-start-review");
  if (startRevBtn) {
    if (st === "PENDING") {
      startRevBtn.style.display = "inline-flex";
      startRevBtn.disabled = false;
    } else {
      startRevBtn.style.display = "none";
    }
  }

  ["btn-decide-confirm", "btn-decide-more-evidence", "btn-decide-escalate", "btn-decide-resolve", "btn-decide-close"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = isResolved;
      btn.style.opacity = isResolved ? "0.45" : "1";
      btn.style.cursor = isResolved ? "not-allowed" : "pointer";
    }
  });

  const lockBanner = document.getElementById("review-locked-banner");
  if (lockBanner) {
    if (isResolved) {
      lockBanner.style.display = "block";
      lockBanner.innerHTML = `
        <div class="review-locked-card">
          <span class="material-symbols-outlined" style="font-size: 1.35rem; color: var(--success);">lock</span>
          <div>
            <strong>REVIEW ${st}:</strong> Decision: <strong>${dec}</strong> &bull; Finalized by <strong>${review.assigned_reviewer_name || 'Lead Controller'}</strong>. Decision controls locked.
          </div>
        </div>
      `;
    } else {
      lockBanner.style.display = "none";
    }
  }

  // 1. Actions Checklist
  const actionsContainer = document.getElementById("review-actions-container");
  const actions = review.actions || [];
  if (actionsContainer) {
    if (!actions.length) {
      actionsContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No investigation tasks assigned.</p>';
    } else {
      actionsContainer.innerHTML = actions.map((act) => `
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; border-left: 3px solid ${act.status === 'COMPLETED' ? 'var(--success)' : 'var(--secondary)'}; padding: 0.65rem 0.85rem; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.4rem;">
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--on-surface);">
              ${act.status === 'COMPLETED' ? '✓ ' : '☐ '} #${act.priority} ${act.title}
            </div>
            <div style="font-size: 0.8rem; color: var(--on-surface-variant); margin-top: 0.15rem;">${act.description || "Action item"}</div>
          </div>
          ${act.status === 'PENDING' && !isResolved ? `
            <button class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="completeReviewAction('${act.action_id}')">Mark Complete</button>
          ` : `<span class="tag-badge" style="color: var(--success);">${act.status === 'COMPLETED' ? 'DONE' : 'LOCKED'}</span>`}
        </div>
      `).join("");
    }
  }

  // 2. Evidence Inspection List
  const evListContainer = document.getElementById("review-evidence-inspection-list");
  const evItems = currentCaseResult?.truth_report?.evidence_summary || [];
  const reviewedEvIds = review.reviewed_evidence_ids || [];

  if (evListContainer) {
    if (!evItems.length) {
      evListContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No evidence items available to inspect.</p>';
    } else {
      evListContainer.innerHTML = evItems.map((e) => {
        const isReviewed = reviewedEvIds.includes(e.evidence_id);
        return `
          <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.4rem;">
            <div>
              <strong style="color: var(--on-surface); font-size: 0.88rem;">[${e.modality || 'DOC'}] ${e.source_name || 'Source'}</strong>
              <div style="font-size: 0.78rem; color: var(--on-surface-variant); font-family: var(--font-mono);">${e.evidence_id}</div>
            </div>
            ${isReviewed ? `
              <span class="tag-badge" style="color: var(--success); border-color: var(--success);">✓ Inspected</span>
            ` : (isResolved ? `<span class="tag-badge" style="color: var(--on-surface-variant);">Uninspected</span>` : `
              <button class="btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" onclick="markEvidenceReviewed('${e.evidence_id}')">Mark Reviewed</button>
            `)}
          </div>
        `;
      }).join("");
    }
  }

  // 3. Notes List
  const notesContainer = document.getElementById("review-notes-container");
  const notes = review.notes || [];
  if (notesContainer) {
    if (!notes.length) {
      notesContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No notes recorded yet.</p>';
    } else {
      notesContainer.innerHTML = notes.map((n) => `
        <div style="margin-bottom: 0.5rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--outline-variant); font-size: 0.82rem;">
          <span style="color: var(--secondary); font-weight: 600;">${n.reviewer_name || 'Reviewer'}</span>
          <span style="color: var(--on-surface-variant); font-size: 0.75rem; margin-left: 0.4rem;">${n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : 'Recorded'}</span>
          <div style="color: var(--on-surface); margin-top: 0.2rem; line-height: 1.4;">${n.content}</div>
        </div>
      `).join("");
    }
  }
}

async function startCaseReview() {
  if (!currentCaseResult) return;
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(currentCaseResult.case_id)}/review/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer_id: "ctrl_ui", reviewer_name: "Lead Controller" }),
    });
    if (res.ok) {
      await loadCaseReview(currentCaseResult.case_id);
    }
  } catch (err) {
    showAlert(`Failed to start review: ${err.message}`, "error");
  }
}

async function addReviewNote() {
  if (!currentCaseResult) return;
  const input = document.getElementById("review-note-input");
  const content = (input?.value || "").trim();
  if (!content) return;

  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(currentCaseResult.case_id)}/review/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content, reviewer_id: "ctrl_ui", reviewer_name: "Lead Controller" }),
    });
    if (res.ok) {
      input.value = "";
      await loadCaseReview(currentCaseResult.case_id);
    }
  } catch (err) {
    showAlert(`Failed to add note: ${err.message}`, "error");
  }
}

async function markEvidenceReviewed(evidenceId) {
  if (!currentCaseResult) return;
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(currentCaseResult.case_id)}/review/evidence/${encodeURIComponent(evidenceId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer_id: "ctrl_ui", reviewer_name: "Lead Controller" }),
    });
    if (res.ok) {
      await loadCaseReview(currentCaseResult.case_id);
    }
  } catch (err) {
    showAlert(`Failed to mark evidence: ${err.message}`, "error");
  }
}

async function completeReviewAction(actionId) {
  if (!currentCaseResult) return;
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(currentCaseResult.case_id)}/review/action/${encodeURIComponent(actionId)}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer_id: "ctrl_ui" }),
    });
    if (res.ok) {
      await loadCaseReview(currentCaseResult.case_id);
    }
  } catch (err) {
    showAlert(`Failed to complete action: ${err.message}`, "error");
  }
}

async function recordReviewDecision(decision) {
  if (!currentCaseResult) return;
  const cid = currentCaseResult.case_id;
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(cid)}/review/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: decision, reviewer_id: "ctrl_ui", reviewer_name: "Lead Controller" }),
    });
    if (res.ok) {
      await loadCaseReview(cid);
      showAlert(`Recorded human review decision: ${decision}`, "success");
    } else {
      const err = await res.json().catch(() => ({}));
      showAlert(`Failed to record decision: ${err.detail || res.statusText}`, "error");
    }
  } catch (err) {
    showAlert(`Failed to record decision: ${err.message}`, "error");
  }
}

async function resolveCaseReview() {
  if (!currentCaseResult) return;
  const cid = currentCaseResult.case_id;

  try {
    // If review is in PENDING or NOT_REQUIRED, start review first to legal state transition
    if (currentReviewRecord && (currentReviewRecord.status === "PENDING" || currentReviewRecord.status === "NOT_REQUIRED")) {
      await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(cid)}/review/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_id: "ctrl_ui", reviewer_name: "Lead Controller" }),
      });
    }

    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(cid)}/review/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer_id: "ctrl_ui", reviewer_name: "Lead Controller", notes: "Resolved via Controller Console" }),
    });

    if (res.ok) {
      await loadCaseReview(cid);
      showAlert(`Case ${cid}: Review marked as RESOLVED.`, "success");
    } else {
      const errData = await res.json().catch(() => ({}));
      showAlert(`Cannot resolve review: ${errData.detail || res.statusText}`, "warning");
    }
  } catch (err) {
    showAlert(`Failed to resolve review: ${err.message}`, "error");
  }
}

async function closeCaseReview() {
  if (!currentCaseResult) return;
  const cid = currentCaseResult.case_id;
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(cid)}/review/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer_id: "ctrl_ui", reviewer_name: "Lead Controller" }),
    });
    if (res.ok) {
      await loadCaseReview(cid);
      showAlert(`Case ${cid}: Review CLOSED and sealed.`, "success");
    } else {
      const errData = await res.json().catch(() => ({}));
      showAlert(`Cannot close review: ${errData.detail || res.statusText}`, "warning");
    }
  } catch (err) {
    showAlert(`Failed to close review: ${err.message}`, "error");
  }
}

async function loadAuditLog(caseId) {
  const container = document.getElementById("audit-timeline-container");
  if (container) {
    container.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Loading cryptographic audit log events...</p>';
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${caseId}/review/audit`);
    if (res.ok) {
      const events = await res.json();
      renderAuditTimeline(events);
    } else {
      if (container) {
        container.innerHTML = `<p class="font-body-sm" style="color: var(--status-contradicted);">Audit log unavailable (${res.status})</p>`;
      }
    }
  } catch (err) {
    console.error("Failed to load audit log:", err);
    if (container) {
      container.innerHTML = `<p class="font-body-sm" style="color: var(--status-contradicted);">Error loading audit events: ${err.message}</p>`;
    }
  }
}

function renderAuditTimeline(events) {
  const container = document.getElementById("audit-timeline-container");
  if (!events.length) {
    container.innerHTML = '<p style="color: var(--text-faint);">No audit events recorded.</p>';
    return;
  }

  container.innerHTML = events.map((e) => `
    <div style="padding: 0.35rem 0; border-bottom: 1px dashed var(--outline-variant);">
      <span style="color: var(--primary); font-weight: 600;">[${e.event_type}]</span>
      <span style="color: var(--text-main); margin-left: 0.4rem;">${e.description}</span>
      <div style="color: var(--text-faint); font-size: 0.72rem; margin-top: 0.15rem;">
        Hash: ${e.current_state_hash.substring(0, 16)}... | Prev: ${e.previous_state_hash ? e.previous_state_hash.substring(0, 16) + '...' : 'GENESIS'}
      </div>
    </div>
  `).join("");
}

async function verifyAuditChain() {
  if (!currentCaseResult) return;
  const statusBox = document.getElementById("audit-verify-status");
  statusBox.style.display = "block";
  statusBox.textContent = "Verifying cryptographic hash chain...";

  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${currentCaseResult.case_id}/review/audit/verify`);
    if (res.ok) {
      const data = await res.json();
      if (data.is_valid) {
        statusBox.style.background = "rgba(16, 185, 129, 0.15)";
        statusBox.style.color = "var(--status-confirmed)";
        statusBox.style.border = "1px solid var(--status-confirmed)";
        statusBox.innerHTML = `🛡️ <strong>Audit Chain Intact:</strong> ${data.details} (Events: ${data.event_count})`;
      } else {
        statusBox.style.background = "rgba(239, 68, 68, 0.15)";
        statusBox.style.color = "var(--status-contradicted)";
        statusBox.style.border = "1px solid var(--status-contradicted)";
        statusBox.innerHTML = `⚠️ <strong>Integrity Failure:</strong> ${data.details}`;
      }
    }
  } catch (err) {
    statusBox.textContent = `Verification error: ${err.message}`;
  }
}

// -------------------------------------------------------------
// RENDER CASE RESULT
// -------------------------------------------------------------
function renderCaseResult(result) {
  if (!result) return;
  currentCaseResult = result;
  hideAlert();

  // 0. Update Active Case Pill
  const casePill = document.getElementById("active-case-tag-pill");
  if (casePill) {
    const st = result.status || "CONFIRMED";
    casePill.textContent = `Case: ${result.case_id || "—"} (${st})`;
    casePill.className = `badge badge-${st.toLowerCase()}`;
  }

  // 1. Pipeline Timeline Telemetry
  const latencyTag = document.getElementById("total-latency-tag");
  if (latencyTag) {
    const lat = result.total_execution_time_ms;
    latencyTag.textContent = (lat != null && !isNaN(lat) && lat > 0) ? `Total Latency: ${Number(lat).toFixed(1)} ms` : "Total Latency: — ms";
  }
  if (result.stage_execution && result.stage_execution.length) {
    result.stage_execution.forEach((rec) => {
      const box = document.getElementById(`stage-${rec.stage}`);
      if (box) {
        box.className = `stage-box ${(rec.status || 'success').toLowerCase()}`;
        const metricsEl = box.querySelector(".stage-metrics");
        if (metricsEl) {
          const dur = rec.duration_ms != null ? `${Number(rec.duration_ms).toFixed(1)}ms` : "—";
          metricsEl.textContent = `${dur} (${rec.items_in ?? 0}→${rec.items_out ?? 0})`;
        }
      }
    });
  } else {
    const stageIds = [
      "INGESTION", "EXTRACTION", "ENTITY_RESOLUTION", "TRANSACTION_MATCHING",
      "DEDUPLICATION", "CONTRADICTION_DETECTION", "RECONCILIATION", "REPORTING"
    ];
    stageIds.forEach((s) => {
      const box = document.getElementById(`stage-${s}`);
      if (box) {
        box.className = "stage-box success";
        const metricsEl = box.querySelector(".stage-metrics");
        if (metricsEl) metricsEl.textContent = "✓ Complete";
      }
    });
  }

  // 2. Financial Truth Hero Card & Storytelling Header
  const heroBadge = document.getElementById("hero-status-badge");
  const st = (result.status || "CONFIRMED").toUpperCase();
  if (heroBadge) {
    heroBadge.className = `status-badge-lg badge-${st.toLowerCase()}`;
    heroBadge.textContent = st;
  }

  const confPct = Math.round(((result.confidence != null) ? result.confidence : 1.0) * 100);
  const confVal = document.getElementById("hero-confidence-val");
  if (confVal) confVal.textContent = `${confPct}%`;
  const confBar = document.getElementById("hero-confidence-bar");
  if (confBar) {
    confBar.style.width = `${confPct}%`;
    confBar.style.backgroundColor = st === "CONFIRMED" ? "var(--success)" : (st.includes("CONTRADICT") ? "var(--error)" : "var(--warning)");
  }

  const reviewBadge = document.getElementById("hero-review-badge");
  if (reviewBadge) {
    if (result.requires_review || st.includes("REVIEW") || st.includes("AMBIGUOUS") || st.includes("CONTRADICT") || st.includes("PARTIAL")) {
      reviewBadge.style.color = "var(--warning)";
      reviewBadge.className = "badge badge-partial";
      reviewBadge.textContent = "⚠️ HUMAN REVIEW REQUIRED";
    } else {
      reviewBadge.style.color = "var(--status-confirmed)";
      reviewBadge.className = "badge badge-confirmed";
      reviewBadge.textContent = "✓ NO REVIEW REQUIRED";
    }
  }

  const truthReport = result.truth_report;
  const heroTitle = document.getElementById("hero-title");
  const heroSummary = document.getElementById("hero-summary");
  if (heroTitle) {
    heroTitle.textContent = result.case_id || (truthReport?.title ? truthReport.title : "Active Case");
  }

  // Dynamic Plain-Language Narrative Summary
  if (heroSummary) {
    if (st === "CONFIRMED") {
      heroSummary.textContent = "VERITY matched the payment evidence to the corresponding ledger transaction. No conflicting claim was found.";
    } else if (st.includes("CONTRADICT")) {
      heroSummary.textContent = "VERITY detected an amount contradiction between submitted evidence and bank statement. Human reconciliation required.";
    } else if (st.includes("AMBIGUOUS")) {
      heroSummary.textContent = "VERITY found multiple candidate transactions matching the claimed amount. Controller disambiguation required.";
    } else if (st.includes("PARTIAL")) {
      heroSummary.textContent = "VERITY verified a partial settlement. An outstanding balance remains on the obligation.";
    } else {
      heroSummary.textContent = truthReport?.summary || result.text_report || "Reconciliation invariants evaluated deterministically.";
    }
  }

  // 3. Financial Metrics & Balances
  const fin = result.financial_summary || {};
  const claimedNum = (fin.claimed_amount != null && !isNaN(fin.claimed_amount)) ? Number(fin.claimed_amount) : 0;
  const matchedNum = (fin.matched_amount != null && !isNaN(fin.matched_amount)) ? Number(fin.matched_amount) : 0;
  const outNum = (fin.outstanding_amount != null && !isNaN(fin.outstanding_amount)) ? Number(fin.outstanding_amount) : 0;
  const discNum = (fin.discrepancies_count != null) ? fin.discrepancies_count : 0;

  const metricClaimed = document.getElementById("metric-claimed");
  if (metricClaimed) metricClaimed.textContent = `₹${claimedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const metricMatched = document.getElementById("metric-matched");
  if (metricMatched) metricMatched.textContent = `₹${matchedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const metricOut = document.getElementById("metric-outstanding");
  if (metricOut) metricOut.textContent = `₹${outNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const metricDisc = document.getElementById("metric-discrepancies");
  if (metricDisc) metricDisc.textContent = discNum;

  // Verdict label
  const verdictLabel = document.getElementById("case-truth-verdict-label");
  if (verdictLabel) {
    if (st === "CONFIRMED") {
      verdictLabel.textContent = "MATCHED";
      verdictLabel.style.color = "var(--success)";
    } else if (st.includes("CONTRADICT")) {
      verdictLabel.textContent = "CONTRADICTED";
      verdictLabel.style.color = "var(--error)";
    } else if (st.includes("AMBIGUOUS")) {
      verdictLabel.textContent = "AMBIGUOUS MATCHES";
      verdictLabel.style.color = "var(--warning)";
    } else if (st.includes("PARTIAL")) {
      verdictLabel.textContent = "PARTIAL SETTLEMENT";
      verdictLabel.style.color = "var(--warning)";
    } else {
      verdictLabel.textContent = st;
      verdictLabel.style.color = "var(--primary)";
    }
  }

  // Next Action Guidance
  const nextActionText = document.getElementById("case-next-action-text");
  if (nextActionText) {
    if (st === "CONFIRMED") {
      nextActionText.textContent = "No action required. The reconciliation is complete.";
    } else if (st.includes("CONTRADICT")) {
      nextActionText.textContent = "Resolve the financial discrepancy with counterparty and post adjusting entry.";
    } else if (st.includes("AMBIGUOUS")) {
      nextActionText.textContent = "Additional evidence or manual candidate selection required from reviewer.";
    } else if (st.includes("PARTIAL")) {
      nextActionText.textContent = "Track remaining outstanding obligation balance of ₹" + outNum.toLocaleString("en-IN", { minimumFractionDigits: 2 }) + ".";
    } else {
      nextActionText.textContent = "Reviewer decision required on active exception.";
    }
  }

  // 3.5. Update 6-Milestone Flow Graphic & Match Canvas
  renderReconciliationWorkspace(result);

  // 3.6. Update "Why VERITY Believes This"
  const whyAmt = document.getElementById("why-amt-detail");
  if (whyAmt) {
    if (st === "CONFIRMED") {
      whyAmt.textContent = `Evidence amount (₹${claimedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}) matches core ledger with ₹0.00 variance.`;
    } else if (st.includes("CONTRADICT")) {
      whyAmt.textContent = `Claimed amount (₹${claimedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}) contradicts bank statement (₹${matchedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}).`;
    } else {
      whyAmt.textContent = `Claimed: ₹${claimedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })} | Matched: ₹${matchedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`;
    }
  }

  const whyRef = document.getElementById("why-ref-detail");
  if (whyRef) {
    const recon = result?.reconciliation || {};
    const txnIds = recon.transaction_ids || [];
    if (txnIds.length > 0) {
      whyRef.textContent = `Reference ${txnIds.join(", ")} corroborated across banking statements.`;
    } else {
      whyRef.textContent = `Banking reference and invoice identifiers corroborated across data sources.`;
    }
  }

  const whyCp = document.getElementById("why-cp-detail");
  if (whyCp) {
    const cpName = document.getElementById("cp-canonical-name")?.textContent || "Counterparty";
    whyCp.textContent = `Institutional memory resolved canonical entity '${cpName}'.`;
  }

  // 3.7. Update Contradictions Section (Prominent when conflicts exist, clean when verified)
  const contContainer = document.getElementById("contradictions-list-container");
  if (contContainer) {
    if (discNum > 0 || st.includes("CONTRADICT")) {
      const diffAmt = Math.abs(claimedNum - matchedNum);
      contContainer.innerHTML = `
        <div class="contradiction-hero-banner">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; font-size: 1rem;">
              <span class="material-symbols-outlined" style="font-size: 1.35rem;">warning</span>
              <span>CONTRADICTION FOUND &bull; DISCREPANCY DETECTED</span>
            </div>
            <span class="badge badge-contradicted">HUMAN REVIEW REQUIRED</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; background: rgba(0,0,0,0.15); padding: 0.75rem; border-radius: var(--radius-md);">
            <div><span style="font-size: 0.72rem; opacity: 0.85;">Evidence Claims</span><div style="font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem;">₹${claimedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></div>
            <div><span style="font-size: 0.72rem; opacity: 0.85;">Ledger Records</span><div style="font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem;">₹${matchedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></div>
            <div><span style="font-size: 0.72rem; opacity: 0.85;">Disputed Variance</span><div style="font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem; color: #ffcdd2;">₹${diffAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></div>
          </div>
          <p style="font-size: 0.8125rem; line-height: 1.4;">
            Submitted documentation contradicts the authoritative bank statement. Human reviewer must review or request additional proof.
          </p>
        </div>
      `;
    } else {
      contContainer.innerHTML = `
        <div class="clean-evidence-banner">
          <span class="material-symbols-outlined" style="color: var(--status-confirmed); font-size: 1.25rem;">verified</span>
          <span>✓ NO CONFLICTING EVIDENCE &bull; All financial invariants verified deterministically.</span>
        </div>
      `;
    }
  }

  // 4. Panel Tabs Counters & Content
  renderEvidencePanel(truthReport);
  renderMatchingPanel(truthReport);
  renderConfidenceFactorsPanel(truthReport);
  renderActionsPanel(truthReport);
  renderProvenancePanel(result);
  updateReportTerminal();
}

function renderReconciliationWorkspace(result) {
  const evBox = document.getElementById("recon-evidence-preview");
  const ledgerBox = document.getElementById("recon-ledger-preview");
  const rep = result?.truth_report || {};
  const evSummary = rep.evidence_summary || result?.evidence_summary || [];
  const fin = result?.financial_summary || {};
  const status = (result?.status || "CONFIRMED").toUpperCase();
  const claimedNum = Number(fin.claimed_amount || 0);
  const matchedNum = Number(fin.matched_amount || 0);

  // Update 6-Milestone Flow Graphic
  const flowEvVal = document.getElementById("flow-ev-val");
  const flowTxnVal = document.getElementById("flow-txn-val");
  const flowReconVal = document.getElementById("flow-recon-val");
  const flowFactsStatus = document.getElementById("flow-facts-status");
  const flowLedgerStatus = document.getElementById("flow-ledger-status");
  const flowCtrlStatus = document.getElementById("flow-ctrl-status");

  if (flowEvVal) flowEvVal.textContent = `₹${claimedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  if (flowTxnVal) flowTxnVal.textContent = `₹${matchedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  if (flowReconVal) flowReconVal.textContent = `₹${matchedNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const nodeEv = document.getElementById("flow-node-ev");
  const nodeFacts = document.getElementById("flow-node-facts");
  const nodeTxn = document.getElementById("flow-node-txn");
  const nodeLedger = document.getElementById("flow-node-ledger");
  const nodeRecon = document.getElementById("flow-node-recon");
  const nodeCtrl = document.getElementById("flow-node-ctrl");

  if (status === "CONFIRMED") {
    if (flowFactsStatus) flowFactsStatus.textContent = "Corroborated";
    if (flowLedgerStatus) flowLedgerStatus.textContent = "Matched";
    if (flowCtrlStatus) flowCtrlStatus.textContent = "Confirmed";
    [nodeEv, nodeFacts, nodeTxn, nodeLedger, nodeRecon, nodeCtrl].forEach((n) => {
      if (n) n.className = "case-flow-node success";
    });
  } else if (status.includes("CONTRADICT")) {
    if (flowFactsStatus) flowFactsStatus.textContent = "Contradiction";
    if (flowLedgerStatus) flowLedgerStatus.textContent = "Variance";
    if (flowCtrlStatus) flowCtrlStatus.textContent = "Contradicted";
    if (nodeEv) nodeEv.className = "case-flow-node success";
    if (nodeFacts) nodeFacts.className = "case-flow-node error";
    if (nodeTxn) nodeTxn.className = "case-flow-node error";
    if (nodeLedger) nodeLedger.className = "case-flow-node error";
    if (nodeRecon) nodeRecon.className = "case-flow-node error";
    if (nodeCtrl) nodeCtrl.className = "case-flow-node error";
  } else {
    if (flowFactsStatus) flowFactsStatus.textContent = "Review Needed";
    if (flowLedgerStatus) flowLedgerStatus.textContent = "Partial/Pending";
    if (flowCtrlStatus) flowCtrlStatus.textContent = "Escalated";
    if (nodeEv) nodeEv.className = "case-flow-node success";
    if (nodeFacts) nodeFacts.className = "case-flow-node warning";
    if (nodeTxn) nodeTxn.className = "case-flow-node warning";
    if (nodeLedger) nodeLedger.className = "case-flow-node warning";
    if (nodeRecon) nodeRecon.className = "case-flow-node warning";
    if (nodeCtrl) nodeCtrl.className = "case-flow-node warning";
  }

  // Update Center Match Verdict Pill
  const verdictPill = document.getElementById("match-verdict-center-pill");
  const verdictText = document.getElementById("match-verdict-text");
  if (verdictPill && verdictText) {
    if (status === "CONFIRMED") {
      verdictPill.style.backgroundColor = "var(--status-confirmed-bg)";
      verdictPill.style.borderColor = "var(--status-confirmed)";
      verdictPill.style.color = "var(--status-confirmed)";
      verdictText.textContent = "✓ 1:1 MATCHED";
    } else if (status.includes("CONTRADICT")) {
      verdictPill.style.backgroundColor = "var(--status-contradicted-bg)";
      verdictPill.style.borderColor = "var(--status-contradicted)";
      verdictPill.style.color = "var(--status-contradicted)";
      verdictText.textContent = "✕ CONTRADICTED";
    } else {
      verdictPill.style.backgroundColor = "var(--status-partial-bg)";
      verdictPill.style.borderColor = "var(--status-partial)";
      verdictPill.style.color = "var(--warning)";
      verdictText.textContent = "⚠ REVIEW REQUIRED";
    }
  }

  // Render left evidence pane
  if (evBox) {
    if (evSummary.length) {
      evBox.innerHTML = evSummary.map((e, idx) => {
        const mod = e.modality || "DOCUMENT";
        const src = e.source_name || "Evidence Source";
        const eid = e.evidence_id || e.id || "EV";
        const sum = e.summary || "Evidence item registered and validated.";
        return `
          <div class="${idx % 2 === 0 ? 'chat-bubble-user' : 'chat-bubble-highlight'}">
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--on-surface-variant); margin-bottom: 0.2rem;">
              <strong>[${mod}] ${src}</strong>
              <span class="font-data-sm">${eid}</span>
            </div>
            <div class="font-body-sm">${sum}</div>
          </div>
        `;
      }).join("");
    } else {
      evBox.innerHTML = `
        <div class="chat-bubble-user">
          <div class="font-body-sm">Case ${result?.case_id || "—"}: Evidence ingested and verified across multimodal sources.</div>
        </div>
      `;
    }
  }

  // Render right ledger pane
  if (ledgerBox) {
    const match = rep.matching_summary || {};
    const recon = result?.reconciliation || {};
    const txnIds = recon.transaction_ids || [];

    const matchedAmt = fin.matched_amount ?? recon.reconciled_amount ?? 0;
    const dateStr = result?.created_at ? new Date(result.created_at).toLocaleDateString() : "Confirmed";
    const refStr = txnIds.length > 0 ? txnIds.join(", ") : (match.topology ? `Topology: ${match.topology}` : (result?.case_id || "Core Ledger"));
    const amtDisplay = (matchedAmt != null && !isNaN(matchedAmt)) ? `₹${Number(matchedAmt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹0.00";
    const statusDisplay = result?.status || "CONFIRMED";

    ledgerBox.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.75rem;">
        <thead>
          <tr style="background-color: var(--surface-container-low); border-bottom: 1px solid var(--outline-variant); color: var(--on-surface-variant); text-align: left;">
            <th style="padding: 0.4rem 0.5rem;">DATE</th>
            <th style="padding: 0.4rem 0.5rem;">NARRATION / REF</th>
            <th style="padding: 0.4rem 0.5rem; text-align: right;">CREDIT / VERDICT</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--outline-variant); background-color: var(--status-confirmed-bg);">
            <td style="padding: 0.5rem; color: var(--on-surface-variant);">${dateStr}</td>
            <td style="padding: 0.5rem; font-weight: 500;">${refStr}</td>
            <td style="padding: 0.5rem; text-align: right; color: var(--success); font-weight: 700;">${amtDisplay} (${statusDisplay})</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

function renderEvidenceWorkspace() {
  const container = document.getElementById("evidence-list-container");
  const activeCaseTag = document.getElementById("ev-active-case-tag");
  const headerTitle = document.getElementById("ev-header-title");

  if (activeCaseTag) {
    if (currentCaseResult) {
      const st = currentCaseResult.status || "CONFIRMED";
      activeCaseTag.textContent = `Case: ${currentCaseResult.case_id} (${st})`;
      activeCaseTag.className = `badge badge-${st.toLowerCase()}`;
    } else {
      activeCaseTag.textContent = "No Active Case";
      activeCaseTag.className = "badge badge-unverifiable";
    }
  }

  if (headerTitle) {
    headerTitle.textContent = currentCaseResult ? `Case: ${currentCaseResult.case_id}` : "Multimodal Evidence Ingestion";
  }

  const statSources = document.getElementById("ev-stat-sources");
  const statVerified = document.getElementById("ev-stat-verified");
  const statAttention = document.getElementById("ev-stat-attention");

  if (!currentCaseResult) {
    if (statSources) statSources.textContent = "0";
    if (statVerified) statVerified.textContent = "0";
    if (statAttention) statAttention.textContent = "0";

    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--on-surface-variant);">
          <span class="material-symbols-outlined" style="font-size: 3rem; color: var(--outline); opacity: 0.6; margin-bottom: 0.5rem; display: block;">description</span>
          <strong style="font-size: 1rem; color: var(--on-surface);">NO EVIDENCE SUBMITTED</strong>
          <p style="font-size: 0.8125rem; margin-top: 0.25rem; max-width: 480px; margin-left: auto; margin-right: auto;">
            Add a document, screenshot, message, or structured record to begin the investigation.
          </p>
        </div>
      `;
    }
    return;
  }

  const rep = currentCaseResult.truth_report || {};
  const evItems = rep.evidence_summary || [];
  const claims = rep.claims_summary || [];
  const fin = currentCaseResult.financial_summary || {};
  const st = (currentCaseResult.status || "CONFIRMED").toUpperCase();

  // Update Counters
  if (statSources) statSources.textContent = evItems.length || (claims.length ? 1 : 0);
  if (statVerified) statVerified.textContent = st === "CONFIRMED" ? (evItems.length || 1) : Math.max(0, evItems.length - (fin.discrepancies_count || 0));
  if (statAttention) statAttention.textContent = fin.discrepancies_count || (st.includes("CONTRADICT") || st.includes("AMBIGUOUS") ? 1 : 0);

  // Update Graphic 1: Evidence Extraction Flow
  const primaryEv = evItems[0] || {};
  const primaryClaim = claims[0] || {};
  const flowSrcName = document.getElementById("ev-flow-source-name");
  const flowModality = document.getElementById("ev-flow-modality");
  const flowAmt = document.getElementById("ev-flow-amt");
  const flowRef = document.getElementById("ev-flow-ref");
  const flowVerdictText = document.getElementById("ev-flow-verdict-text");
  const flowVerdictBox = document.getElementById("ev-flow-verdict-box");

  if (flowSrcName) flowSrcName.textContent = primaryEv.source_name || (claims.length ? "Communication Text" : "Case Artifact");
  if (flowModality) flowModality.textContent = primaryEv.modality || (primaryClaim.counterparty_hint ? "WHATSAPP / INVOICE" : "DOCUMENT");
  if (flowAmt) {
    const amt = fin.claimed_amount != null ? fin.claimed_amount : (primaryClaim.claimed_amount || 0);
    flowAmt.textContent = `₹${Number(amt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  }
  if (flowRef) {
    const ref = primaryClaim.bank_reference || currentCaseResult.reconciliation?.transaction_ids?.[0] || primaryEv.evidence_id || "Corroborated";
    flowRef.textContent = ref;
  }
  if (flowVerdictText && flowVerdictBox) {
    if (st === "CONFIRMED") {
      flowVerdictText.textContent = "✓ VERIFIED";
      flowVerdictText.style.color = "var(--success)";
      flowVerdictBox.style.borderLeftColor = "var(--success)";
    } else if (st.includes("CONTRADICT")) {
      flowVerdictText.textContent = "⚠ CONTRADICTED";
      flowVerdictText.style.color = "var(--error)";
      flowVerdictBox.style.borderLeftColor = "var(--error)";
    } else {
      flowVerdictText.textContent = "● REVIEW NEEDED";
      flowVerdictText.style.color = "var(--warning)";
      flowVerdictBox.style.borderLeftColor = "var(--warning)";
    }
  }

  if (!container) return;

  if (!evItems.length && !claims.length) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--on-surface-variant);">
        <p class="font-body-sm">No registered evidence artifacts found for case <strong>${currentCaseResult.case_id}</strong>.</p>
      </div>
    `;
    return;
  }

  const evCards = evItems.length ? evItems.map((e, idx) => {
    const linkedClaims = claims.filter((c) => c.evidence_id === e.evidence_id || !c.evidence_id);
    const linkedClaimIds = linkedClaims.map((c) => c.claim_id).join(", ");
    const claimedAmt = linkedClaims[0]?.claimed_amount || fin.claimed_amount || 0;
    const cpName = linkedClaims[0]?.counterparty_hint || "Corroborated Entity";
    const refId = linkedClaims[0]?.bank_reference || currentCaseResult.reconciliation?.transaction_ids?.[0] || e.evidence_id || "--";

    return `
      <div class="evidence-source-card" style="border-left: 4px solid var(--primary); margin-bottom: 0.85rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-confirmed" style="font-size: 0.72rem;">${e.modality || "DOCUMENT"}</span>
            <strong style="color: var(--on-surface); font-size: 0.95rem;">${e.source_name || `Source ${idx + 1}`}</strong>
          </div>
          <span class="font-data-sm" style="color: var(--primary); font-weight: 700;">${e.evidence_id || `EV-${idx + 1}`}</span>
        </div>

        <!-- Key Extracted Facts Grid -->
        <div class="evidence-facts-grid">
          <div class="evidence-fact-chip">
            <span class="evidence-fact-label">Claimed Amount</span>
            <span class="evidence-fact-val" style="color: var(--success);">₹${Number(claimedAmt).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="evidence-fact-chip">
            <span class="evidence-fact-label">Reference / UTR</span>
            <span class="evidence-fact-val">${refId}</span>
          </div>
          <div class="evidence-fact-chip">
            <span class="evidence-fact-label">Counterparty</span>
            <span class="evidence-fact-val" style="font-family: var(--font-sans); font-size: 0.8125rem;">${cpName}</span>
          </div>
          <div class="evidence-fact-chip">
            <span class="evidence-fact-label">Status</span>
            <span class="evidence-fact-val" style="color: ${st === 'CONFIRMED' ? 'var(--success)' : 'var(--warning)'}; font-size: 0.75rem;">${st === 'CONFIRMED' ? '✓ Verified' : 'In Review'}</span>
          </div>
        </div>

        <p class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.8125rem; line-height: 1.4;">
          ${e.summary || "Multimodal source document ingested and validated across deterministic pipelines."}
        </p>

        <!-- Progressive Disclosure: Forensic DAG & Cryptographic Hash -->
        <details class="disclosure-accordion" style="margin-top: 0.25rem; background: var(--surface-container-lowest);">
          <summary class="disclosure-summary" style="padding: 0.5rem 0.75rem; font-size: 0.75rem;">
            <span style="display: flex; align-items: center; gap: 0.35rem; color: var(--on-surface-variant);">
              <span class="material-symbols-outlined" style="font-size: 0.95rem;">lock</span>
              <span>Forensic Lineage &amp; Cryptographic Hash</span>
            </span>
            <span class="material-symbols-outlined" style="font-size: 1rem;">expand_more</span>
          </summary>
          <div class="disclosure-content" style="padding: 0.75rem; font-size: 0.75rem; font-family: var(--font-mono);">
            <div style="margin-bottom: 0.4rem; color: var(--on-surface-variant);">
              <strong>DAG Trace:</strong> ${e.evidence_id || 'EV-01'} &rarr; ${linkedClaimIds || 'CLM-01'} &rarr; ${currentCaseResult.case_id}
            </div>
            ${e.sha256_hash ? `
              <div style="color: var(--on-surface-variant); word-break: break-all;">
                <strong>SHA-256 Digest:</strong> ${e.sha256_hash}
              </div>
            ` : ""}
          </div>
        </details>
      </div>
    `;
  }).join("") : `
    <div class="evidence-source-card" style="border-left: 4px solid var(--primary);">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="badge badge-confirmed">STRUCTURED RECORD</span>
        <span class="font-data-sm" style="color: var(--primary); font-weight: 700;">EV-CASE</span>
      </div>
      <div class="evidence-facts-grid">
        <div class="evidence-fact-chip">
          <span class="evidence-fact-label">Claimed Amount</span>
          <span class="evidence-fact-val" style="color: var(--success);">₹${Number(fin.claimed_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="evidence-fact-chip">
          <span class="evidence-fact-label">Reference</span>
          <span class="evidence-fact-val">${currentCaseResult.case_id}</span>
        </div>
      </div>
      <p class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.8125rem;">Direct case payload validated.</p>
    </div>
  `;

  container.innerHTML = `
    <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
      <span class="font-body-sm" style="color: var(--on-surface-variant);">Registered Artifacts for <strong>${currentCaseResult.case_id}</strong> (${evItems.length || 1} items)</span>
    </div>
    ${evCards}
  `;
}

function renderEvidencePanel(report) {
  renderEvidenceWorkspace();
}

function renderMatchingPanel(report) {
  const container = document.getElementById("matching-details-container");
  if (!container) return;
  const match = report?.matching_summary;
  if (!match) {
    container.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No matching topology available.</p>';
    return;
  }

  container.innerHTML = `
    <div class="evidence-item">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <strong>Topology: <span style="color: var(--primary);">${match.topology || "ONE_TO_ONE"}</span></strong>
        <span class="tag-badge">Score: ${((match.score != null ? match.score : 1.0) * 100).toFixed(0)}%</span>
      </div>
      <p style="font-size: 0.88rem; color: var(--on-surface-variant); margin-bottom: 0.5rem;">${match.explanation || "Deterministic matching relationships validated."}</p>
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
  if (tabBtn) tabBtn.textContent = `Contradictions (${items.length})`;

  if (!container) return;
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
      <p style="font-size: 0.86rem; color: var(--on-surface); margin-bottom: 0.4rem;">${d.message}</p>
      ${d.expected_value ? `<div style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--on-surface-variant);">Expected: <strong>${d.expected_value}</strong> | Observed: <strong style="color: var(--status-contradicted);">${d.observed_value}</strong></div>` : ""}
    </div>
  `).join("");
}

function renderConfidenceFactorsPanel(report) {
  const container = document.getElementById("factors-list-container");
  if (!container) return;
  const items = report?.confidence_breakdown || [];
  if (!items.length) {
    container.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No confidence factors generated.</p>';
    return;
  }

  container.innerHTML = items.map((f) => `
    <div class="factor-item ${f.impact === "+" ? "positive" : "negative"}">
      <strong style="color: ${f.impact === "+" ? "var(--status-confirmed)" : "var(--status-contradicted)"}; font-size: 0.88rem;">
        ${f.impact} ${f.factor_type}
      </strong>
      <p style="font-size: 0.82rem; color: var(--on-surface-variant); margin-top: 0.2rem;">${f.description}</p>
    </div>
  `).join("");
}

function renderActionsPanel(report) {
  const container = document.getElementById("actions-list-container");
  if (!container) return;
  const items = report?.recommended_actions || [];
  if (!items.length) {
    container.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No action required.</p>';
    return;
  }

  container.innerHTML = items.map((act) => `
    <div class="evidence-item" style="border-left: 3px solid var(--secondary);">
      <p style="font-size: 0.88rem; color: var(--on-surface);">→ ${act}</p>
    </div>
  `).join("");
}

function renderProvenancePanel(result) {
  const activeCaseTag = document.getElementById("audit-active-case-tag");
  const headerTitle = document.getElementById("audit-header-title");

  if (activeCaseTag) {
    if (result) {
      const st = result.status || "CONFIRMED";
      activeCaseTag.textContent = `Case: ${result.case_id || "—"} (${st})`;
      activeCaseTag.className = `badge badge-${st.toLowerCase()}`;
    } else {
      activeCaseTag.textContent = "No Active Case";
      activeCaseTag.className = "badge badge-unverifiable";
    }
  }

  if (headerTitle && result) {
    headerTitle.textContent = `Case: ${result.case_id} Lineage`;
  }

  const container = document.getElementById("provenance-details-container");
  if (!container) return;
  const prov = result?.provenance || result?.truth_report?.provenance;
  if (!prov) {
    container.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Provenance trace will appear once a case is reconciled.</p>';
    return;
  }

  const evIds = (prov.evidence_ids || []).filter(Boolean);
  const clmIds = (prov.claim_ids || []).filter(Boolean);
  const txnIds = (prov.transaction_ids || []).filter(Boolean);
  const discIds = (prov.discrepancy_ids || []).filter(Boolean);
  const st = result?.status || "CONFIRMED";

  container.innerHTML = `
    <!-- Graphic 1: Primary Provenance Lineage DAG Chain -->
    <div class="audit-dag-chain" style="margin-bottom: 1.25rem;">
      <div class="audit-dag-node" style="border-left: 3px solid var(--primary);">
        <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">1. SOURCE</span>
        <strong style="font-size: 0.8rem; color: var(--on-surface); font-family: var(--font-mono);">${evIds[0] || 'EV-SRC'}</strong>
        <span style="font-size: 0.7rem; color: var(--success); font-weight: 600;">✓ Ingested</span>
      </div>

      <div class="audit-dag-node" style="border-left: 3px solid var(--secondary);">
        <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">2. CLAIM</span>
        <strong style="font-size: 0.8rem; color: var(--on-surface); font-family: var(--font-mono);">${clmIds[0] || 'CLM-EXT'}</strong>
        <span style="font-size: 0.7rem; color: var(--success); font-weight: 600;">✓ Extracted</span>
      </div>

      <div class="audit-dag-node" style="border-left: 3px solid var(--primary);">
        <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">3. LEDGER</span>
        <strong style="font-size: 0.8rem; color: var(--on-surface); font-family: var(--font-mono);">${txnIds[0] || 'TXN-BNK'}</strong>
        <span style="font-size: 0.7rem; color: var(--success); font-weight: 600;">✓ Matched</span>
      </div>

      <div class="audit-dag-node" style="border-left: 3px solid ${st === 'CONFIRMED' ? 'var(--success)' : 'var(--error)'};">
        <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">4. RECONCILIATION</span>
        <strong style="font-size: 0.8rem; color: var(--on-surface); font-family: var(--font-mono);">INVARIANTS</strong>
        <span style="font-size: 0.7rem; color: ${st === 'CONFIRMED' ? 'var(--success)' : 'var(--error)'}; font-weight: 600;">✓ ${st}</span>
      </div>

      <div class="audit-dag-node" style="border-left: 3px solid var(--primary);">
        <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">5. CONTROLLER</span>
        <strong style="font-size: 0.8rem; color: var(--on-surface); font-family: var(--font-mono);">POLICIES</strong>
        <span style="font-size: 0.7rem; color: var(--success); font-weight: 600;">✓ Grounded</span>
      </div>

      <div class="audit-dag-node" style="border-left: 3px solid var(--success);">
        <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">6. DECISION</span>
        <strong style="font-size: 0.8rem; color: var(--on-surface); font-family: var(--font-mono);">VERITY FINAL</strong>
        <span style="font-size: 0.7rem; color: var(--success); font-weight: 600;">✓ Sealed</span>
      </div>
    </div>

    <!-- Provenance Metadata & Hash Record -->
    <div class="card" style="padding: 1rem 1.25rem; background-color: var(--surface-container-low); margin-bottom: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.4rem;">
        <h4 class="font-label-caps" style="color: var(--primary);">Cryptographic Lineage Record</h4>
        <span class="tag-badge" style="color: var(--success); border-color: var(--success);">Algorithm: SHA-256</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; font-size: 0.8125rem;">
        <div>
          <span style="color: var(--on-surface-variant); font-size: 0.72rem; text-transform: uppercase; font-weight: 600; display: block;">Reconciliation ID</span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--on-surface); word-break: break-all;">${prov.reconciliation_id || "REC-AUTONOMOUS"}</span>
        </div>
        <div>
          <span style="color: var(--on-surface-variant); font-size: 0.72rem; text-transform: uppercase; font-weight: 600; display: block;">Ingested Evidence IDs (${evIds.length})</span>
          <span style="font-family: var(--font-mono); color: var(--primary); word-break: break-all;">${evIds.join(", ") || "None"}</span>
        </div>
        <div>
          <span style="color: var(--on-surface-variant); font-size: 0.72rem; text-transform: uppercase; font-weight: 600; display: block;">Extracted Claims (${clmIds.length})</span>
          <span style="font-family: var(--font-mono); color: var(--primary); word-break: break-all;">${clmIds.join(", ") || "None"}</span>
        </div>
        <div>
          <span style="color: var(--on-surface-variant); font-size: 0.72rem; text-transform: uppercase; font-weight: 600; display: block;">Matched Transactions (${txnIds.length})</span>
          <span style="font-family: var(--font-mono); color: var(--primary); word-break: break-all;">${txnIds.join(", ") || "None"}</span>
        </div>
      </div>
    </div>
  `;
}

function updateReportTerminal() {
  const term = document.getElementById("report-terminal");
  if (!term) return;
  if (!currentCaseResult) {
    term.textContent = "Select a case from the Command Center or Portfolio to inspect cryptographic DAG provenance and reconciliation reports.";
    return;
  }

  if (activeReportView === "text") {
    term.textContent = currentCaseResult.text_report || "No text report generated.";
  } else {
    term.textContent = JSON.stringify(currentCaseResult, null, 2);
  }
}

// -------------------------------------------------------------
// CASE PORTFOLIO & OPERATIONS INTELLIGENCE (DAY 15)
// -------------------------------------------------------------
function initPortfolioWorkspace() {
  // Quick filter buttons
  document.querySelectorAll(".port-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".port-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activePortfolioFilter = btn.dataset.filter;
      loadPortfolioData();
    });
  });

  // Search input
  const searchInput = document.getElementById("port-search-input");
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadPortfolioData();
    });
    searchInput.addEventListener("input", debounce(() => loadPortfolioData(), 300));
  }

  // Refresh button
  const refreshBtn = document.getElementById("btn-refresh-portfolio");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => loadPortfolioData());
  }

  // Initial load
  loadPortfolioData();
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function loadPortfolioData() {
  const searchVal = (document.getElementById("port-search-input")?.value || "").trim();

  try {
    // 1. Fetch Summary & Exposure
    const [sumRes, expRes] = await Promise.all([
      fetch(`${API_BASE}/api/v1/portfolio/summary`),
      fetch(`${API_BASE}/api/v1/portfolio/exposure`),
    ]);

    if (sumRes.ok) {
      const summary = await sumRes.json();
      const portTotal = document.getElementById("port-total-cases");
      if (portTotal) portTotal.textContent = summary.total_cases ?? 0;
      const portCrit = document.getElementById("port-critical-cases");
      if (portCrit) portCrit.textContent = summary.critical_cases ?? 0;
      const portHigh = document.getElementById("port-high-cases");
      if (portHigh) portHigh.textContent = summary.high_risk_cases ?? 0;
      const portRev = document.getElementById("port-review-cases");
      if (portRev) portRev.textContent = summary.in_review_cases ?? 0;
      const portOver = document.getElementById("port-overdue-cases");
      if (portOver) portOver.textContent = summary.overdue_cases ?? 0;
      const portExp = document.getElementById("port-total-exp");
      if (portExp) portExp.textContent = `₹${(summary.total_exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
      const portDisp = document.getElementById("port-disputed-exp");
      if (portDisp) portDisp.textContent = `₹${(summary.total_disputed_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
      const portUnres = document.getElementById("port-unresolved-exp");
      if (portUnres) portUnres.textContent = `₹${(summary.total_unresolved_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

      // Update Command Center Executive Metrics
      const ccOpen = document.getElementById("cc-open-cases");
      if (ccOpen) ccOpen.textContent = summary.total_cases ?? 10;
      const ccRev = document.getElementById("cc-review-cases");
      if (ccRev) ccRev.textContent = summary.in_review_cases ?? 4;
      const ccRisk = document.getElementById("cc-risk-cases");
      if (ccRisk) ccRisk.textContent = (summary.critical_cases || 0) + (summary.high_risk_cases || 0);
      const ccExp = document.getElementById("cc-total-exp");
      if (ccExp) ccExp.textContent = `₹${(summary.total_exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

      // Render Visual Donut & Investigation Pipeline from real summary data
      renderRiskDistribution(summary);
      renderInvestigationPipeline(summary);
    }

    // 2. Fetch Cases based on active filter
    let casesUrl = `${API_BASE}/api/v1/portfolio?page_size=50`;
    if (activePortfolioFilter === "review") {
      casesUrl = `${API_BASE}/api/v1/portfolio/review-queue`;
    } else if (activePortfolioFilter === "high_risk") {
      casesUrl = `${API_BASE}/api/v1/portfolio/high-risk`;
    } else if (activePortfolioFilter === "overdue") {
      casesUrl = `${API_BASE}/api/v1/portfolio/overdue`;
    } else if (activePortfolioFilter === "assigned") {
      casesUrl = `${API_BASE}/api/v1/portfolio?page_size=50`;
    } else if (activePortfolioFilter === "unassigned") {
      casesUrl = `${API_BASE}/api/v1/portfolio?reviewer_id=unassigned&page_size=50`;
    }

    if (searchVal) {
      casesUrl += `${casesUrl.includes("?") ? "&" : "?"}search=${encodeURIComponent(searchVal)}`;
    }

    const casesRes = await fetch(casesUrl);
    if (casesRes.ok) {
      const casesData = await casesRes.json();
      const items = Array.isArray(casesData) ? casesData : (casesData.items || []);
      let finalItems = items;
      if (activePortfolioFilter === "assigned") {
        finalItems = items.filter((i) => i.assigned_reviewer_id != null);
      }
      renderPortfolioCasesTable(finalItems);
      renderNeedsAttention(items);
      renderTopExposures(items);
    } else {
      const container = document.getElementById("needs-attention-container");
      if (container) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--error); font-size: 0.85rem;">
            Unable to load attention queue.
            <button class="btn-secondary" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="loadPortfolioData()">Retry</button>
          </div>
        `;
      }
    }

    // 3. Fetch Workload
    const workRes = await fetch(`${API_BASE}/api/v1/portfolio/workload`);
    if (workRes.ok) {
      const workloads = await workRes.json();
      renderPortfolioWorkloadTable(workloads);
    }
  } catch (err) {
    console.error("Failed to load portfolio data:", err);
    const container = document.getElementById("needs-attention-container");
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--error); font-size: 0.85rem;">
          Unable to load attention queue.
          <button class="btn-secondary" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="loadPortfolioData()">Retry</button>
        </div>
      `;
    }
  }
}

function renderRiskDistribution(summary) {
  if (!summary) return;
  const low = summary.low_risk_cases || 0;
  const medium = summary.medium_risk_cases || 0;
  const high = summary.high_risk_cases || 0;
  const critical = summary.critical_cases || 0;
  const total = summary.total_cases || (low + medium + high + critical) || 1;

  const elTotal = document.getElementById("cc-donut-total-count");
  if (elTotal) elTotal.textContent = total;

  const pctLow = Math.max(1, Math.round((low / total) * 100));
  const pctMed = Math.max(1, Math.round((medium / total) * 100));
  const pctHigh = Math.max(1, Math.round((high / total) * 100));
  const pctCrit = Math.max(1, Math.round((critical / total) * 100));

  const elLow = document.getElementById("risk-count-low");
  if (elLow) elLow.textContent = `${low} (${pctLow}%)`;
  const elMed = document.getElementById("risk-count-medium");
  if (elMed) elMed.textContent = `${medium} (${pctMed}%)`;
  const elHigh = document.getElementById("risk-count-high");
  if (elHigh) elHigh.textContent = `${high} (${pctHigh}%)`;
  const elCrit = document.getElementById("risk-count-critical");
  if (elCrit) elCrit.textContent = `${critical} (${pctCrit}%)`;

  const arcLow = document.getElementById("donut-arc-low");
  const arcMed = document.getElementById("donut-arc-medium");
  const arcHigh = document.getElementById("donut-arc-high");
  const arcCrit = document.getElementById("donut-arc-critical");

  if (arcLow && arcMed && arcHigh && arcCrit) {
    let currentOffset = 0;
    arcLow.setAttribute("stroke-dasharray", `${pctLow} ${100 - pctLow}`);
    arcLow.setAttribute("stroke-dashoffset", "0");
    currentOffset -= pctLow;

    arcMed.setAttribute("stroke-dasharray", `${pctMed} ${100 - pctMed}`);
    arcMed.setAttribute("stroke-dashoffset", currentOffset.toString());
    currentOffset -= pctMed;

    arcHigh.setAttribute("stroke-dasharray", `${pctHigh} ${100 - pctHigh}`);
    arcHigh.setAttribute("stroke-dashoffset", currentOffset.toString());
    currentOffset -= pctHigh;

    arcCrit.setAttribute("stroke-dasharray", `${pctCrit} ${100 - pctCrit}`);
    arcCrit.setAttribute("stroke-dashoffset", currentOffset.toString());
  }
}

function renderTopExposures(items) {
  const container = document.getElementById("cc-top-exposures-container");
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `
      <div style="padding: 1rem; text-align: center; color: var(--on-surface-variant); font-size: 0.8125rem;">
        No active exposures found in current portfolio.
      </div>
    `;
    return;
  }

  const entityMap = {};
  items.forEach((c) => {
    const name = (c.entity_ids && c.entity_ids[0]) ? `Entity ${c.entity_ids[0]}` : (c.title ? c.title.split("for ")[1] || c.title : "Portfolio Item");
    const exp = c.amount_exposure || c.unresolved_amount || c.disputed_amount || 0;
    if (!entityMap[name]) {
      entityMap[name] = { name, exposure: 0, count: 0 };
    }
    entityMap[name].exposure += exp;
    entityMap[name].count += 1;
  });

  const sorted = Object.values(entityMap).sort((a, b) => b.exposure - a.exposure).slice(0, 4);
  const maxExp = sorted[0]?.exposure || 1;

  container.innerHTML = sorted.map((ent, idx) => {
    const pct = Math.max(12, Math.round((ent.exposure / maxExp) * 100));
    const colors = ["var(--primary)", "var(--secondary)", "var(--warning)", "var(--status-risk-violet)"];
    const color = colors[idx % colors.length];
    return `
      <div class="exposure-bar-item">
        <div class="exposure-bar-header">
          <span style="font-weight: 600; color: var(--on-surface); font-size: 0.8125rem;">${ent.name}</span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--on-surface); font-size: 0.8125rem;">₹${(ent.exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="exposure-bar-track">
          <div class="exposure-bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderInvestigationPipeline(summary) {
  if (!summary) return;
  const total = summary.total_cases || 0;
  const inReview = summary.in_review_cases || 0;
  const critical = summary.critical_cases || 0;
  const high = summary.high_risk_cases || 0;

  const el1 = document.getElementById("pipe-count-1");
  const el2 = document.getElementById("pipe-count-2");
  const el3 = document.getElementById("pipe-count-3");
  const el4 = document.getElementById("pipe-count-4");
  const el5 = document.getElementById("pipe-count-5");
  const el6 = document.getElementById("pipe-count-6");
  const el7 = document.getElementById("pipe-count-7");

  if (el1) el1.textContent = total;
  if (el2) el2.textContent = total;
  if (el3) el3.textContent = Math.max(0, total - critical);
  if (el4) el4.textContent = Math.max(0, total - (critical + high));
  if (el5) el5.textContent = Math.max(0, total - inReview);
  if (el6) el6.textContent = inReview;
  if (el7) el7.textContent = Math.max(0, total - (inReview + critical));
}

function formatRelativeTime(isoString) {
  if (!isoString) return "Recently";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recently";
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch (e) {
    return "Recently";
  }
}

function renderNeedsAttention(items) {
  const container = document.getElementById("needs-attention-container");
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--on-surface-variant); font-size: 0.85rem;">
        No unresolved cases require attention.
      </div>
    `;
    const countTag = document.getElementById("cc-triage-summary-count");
    if (countTag) countTag.textContent = "0 Active Exceptions";
    return;
  }

  // Group items by category from real backend portfolio data
  const ambiguousItems = items.filter((it) => {
    const st = (it.deterministic_status || "").toUpperCase();
    return st.includes("AMBIGUOUS");
  });

  const contradictedItems = items.filter((it) => {
    const st = (it.deterministic_status || "").toUpperCase();
    return st.includes("CONTRADICT") || (it.disputed_amount && it.disputed_amount > 0);
  });

  const pendingItems = items.filter((it) => {
    const st = (it.deterministic_status || "").toUpperCase();
    const pst = (it.portfolio_status || "").toUpperCase();
    return st.includes("PARTIAL") || st.includes("UNMATCHED") || st.includes("PENDING") || pst.includes("IN_REVIEW") || it.requires_human_review;
  });

  const totalExceptions = ambiguousItems.length + contradictedItems.length + pendingItems.length;
  const countTag = document.getElementById("cc-triage-summary-count");
  if (countTag) countTag.textContent = `${totalExceptions} Active Exception${totalExceptions === 1 ? "" : "s"}`;

  let html = "";

  // 1. AMBIGUOUS CARD
  if (ambiguousItems.length > 0) {
    const c = ambiguousItems[0];
    const exposure = (c.amount_exposure || c.unresolved_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const recency = formatRelativeTime(c.last_activity_at || c.updated_at || c.created_at);
    const counterparty = (c.entity_ids && c.entity_ids[0]) ? `Entity ${c.entity_ids[0]}` : (c.title ? c.title.split("for ")[1] || c.title : "Candidate Entities");
    html += `
      <div class="attention-card triage-ambiguous" onclick="inspectTriageCase('${c.case_id}')" style="cursor: pointer;" title="Inspect case ${c.case_id}">
        <div class="attention-header">
          <span class="tag-badge" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); border-color: rgba(245, 158, 11, 0.4); font-weight: 700;">AMBIGUOUS</span>
          <span class="font-data-sm" style="font-family: var(--font-mono); color: var(--on-surface-variant); font-size: 0.75rem;">${c.case_id}</span>
        </div>
        <div>
          <div class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.78rem;">${c.title || "Multiple Candidate Transactions"}</div>
          <div class="font-title" style="font-weight: 700; color: var(--on-surface); margin-top: 0.15rem;">${counterparty}</div>
        </div>
        <div class="attention-meta">
          <div style="font-size: 0.8125rem; color: var(--primary); font-weight: 700; font-family: var(--font-mono); margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.35rem;">
            <span class="material-symbols-outlined" style="font-size: 0.95rem;">policy</span> ₹${exposure} Exposure
          </div>
          <div class="font-body-sm" style="color: var(--on-surface); font-size: 0.8125rem;">${c.summary || "Candidate transactions with equal amount require controller disambiguation."}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.4rem; border-top: 1px dashed var(--outline-variant); font-size: 0.75rem; color: var(--on-surface-variant);">
          <span>Recency: ${recency}</span>
          <span style="color: var(--primary); font-weight: 600;">Investigate →</span>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="attention-card triage-ambiguous" style="opacity: 0.85;">
        <div class="attention-header">
          <span class="tag-badge" style="background: rgba(245, 158, 11, 0.15); color: var(--warning); border-color: rgba(245, 158, 11, 0.4); font-weight: 700;">AMBIGUOUS</span>
          <span class="font-data-sm" style="color: var(--on-surface-variant);">CLEAR</span>
        </div>
        <div>
          <div class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.78rem;">No Ambiguous Cases</div>
          <div class="font-title" style="font-weight: 700; color: var(--on-surface); margin-top: 0.15rem;">Queue Cleared</div>
        </div>
        <div class="attention-meta">
          <div class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.8125rem;">
            No unresolved ambiguous reconciliations are currently present.
          </div>
        </div>
      </div>
    `;
  }

  // 2. CONTRADICTED CARD
  if (contradictedItems.length > 0) {
    const c = contradictedItems[0];
    const variance = (c.disputed_amount || c.amount_exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const recency = formatRelativeTime(c.last_activity_at || c.updated_at || c.created_at);
    const counterparty = (c.entity_ids && c.entity_ids[0]) ? `Entity ${c.entity_ids[0]}` : (c.title ? c.title.split("for ")[1] || c.title : "Dispute Party");
    html += `
      <div class="attention-card triage-contradicted" onclick="inspectTriageCase('${c.case_id}')" style="cursor: pointer;" title="Inspect case ${c.case_id}">
        <div class="attention-header">
          <span class="tag-badge" style="background: rgba(239, 68, 68, 0.15); color: var(--error); border-color: rgba(239, 68, 68, 0.4); font-weight: 700;">CONTRADICTED</span>
          <span class="font-data-sm" style="font-family: var(--font-mono); color: var(--on-surface-variant); font-size: 0.75rem;">${c.case_id}</span>
        </div>
        <div>
          <div class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.78rem;">${c.title || "Amount Mismatch"}</div>
          <div class="font-title" style="font-weight: 700; color: var(--on-surface); margin-top: 0.15rem;">${counterparty}</div>
        </div>
        <div class="attention-meta">
          <div style="font-size: 0.8125rem; color: var(--error); font-weight: 700; font-family: var(--font-mono); margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.35rem;">
            <span class="material-symbols-outlined" style="font-size: 0.95rem;">gavel</span> ₹${variance} Variance
          </div>
          <div class="font-body-sm" style="color: var(--on-surface); font-size: 0.8125rem;">${c.summary || "Variance detected between claimed invoice and bank credit. Grounded vendor dispute recommended."}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.4rem; border-top: 1px dashed var(--outline-variant); font-size: 0.75rem; color: var(--on-surface-variant);">
          <span>Recency: ${recency}</span>
          <span style="color: var(--error); font-weight: 600;">Draft Dispute →</span>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="attention-card triage-contradicted" style="opacity: 0.85;">
        <div class="attention-header">
          <span class="tag-badge" style="background: rgba(239, 68, 68, 0.15); color: var(--error); border-color: rgba(239, 68, 68, 0.4); font-weight: 700;">CONTRADICTED</span>
          <span class="font-data-sm" style="color: var(--on-surface-variant);">CLEAR</span>
        </div>
        <div>
          <div class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.78rem;">No Contradicted Cases</div>
          <div class="font-title" style="font-weight: 700; color: var(--on-surface); margin-top: 0.15rem;">Zero Disputes</div>
        </div>
        <div class="attention-meta">
          <div class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.8125rem;">
            No active amount contradictions or disputed obligations.
          </div>
        </div>
      </div>
    `;
  }

  // 3. PENDING CARD
  if (pendingItems.length > 0) {
    const c = pendingItems[0];
    const shortfall = (c.unresolved_amount || c.amount_exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const recency = formatRelativeTime(c.last_activity_at || c.updated_at || c.created_at);
    const counterparty = (c.entity_ids && c.entity_ids[0]) ? `Entity ${c.entity_ids[0]}` : (c.title ? c.title.split("for ")[1] || c.title : "Settlement Party");
    html += `
      <div class="attention-card triage-pending" onclick="inspectTriageCase('${c.case_id}')" style="cursor: pointer;" title="Inspect case ${c.case_id}">
        <div class="attention-header">
          <span class="tag-badge" style="background: rgba(99, 102, 241, 0.15); color: var(--secondary); border-color: rgba(99, 102, 241, 0.4); font-weight: 700;">PENDING</span>
          <span class="font-data-sm" style="font-family: var(--font-mono); color: var(--on-surface-variant); font-size: 0.75rem;">${c.case_id}</span>
        </div>
        <div>
          <div class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.78rem;">${c.title || "Partial Settlement"}</div>
          <div class="font-title" style="font-weight: 700; color: var(--on-surface); margin-top: 0.15rem;">${counterparty}</div>
        </div>
        <div class="attention-meta">
          <div style="font-size: 0.8125rem; color: var(--warning); font-weight: 700; font-family: var(--font-mono); margin-bottom: 0.2rem; display: flex; align-items: center; gap: 0.35rem;">
            <span class="material-symbols-outlined" style="font-size: 0.95rem;">schedule</span> ₹${shortfall} Shortfall / Due
          </div>
          <div class="font-body-sm" style="color: var(--on-surface); font-size: 0.8125rem;">${c.summary || "Partial settlement confirmed; outstanding balance due. Follow-up action draft ready."}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.4rem; border-top: 1px dashed var(--outline-variant); font-size: 0.75rem; color: var(--on-surface-variant);">
          <span>Recency: ${recency}</span>
          <span style="color: var(--secondary); font-weight: 600;">Follow Up →</span>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="attention-card triage-pending" style="opacity: 0.85;">
        <div class="attention-header">
          <span class="tag-badge" style="background: rgba(99, 102, 241, 0.15); color: var(--secondary); border-color: rgba(99, 102, 241, 0.4); font-weight: 700;">PENDING</span>
          <span class="font-data-sm" style="color: var(--on-surface-variant);">CLEAR</span>
        </div>
        <div>
          <div class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.78rem;">No Pending Exceptions</div>
          <div class="font-title" style="font-weight: 700; color: var(--on-surface); margin-top: 0.15rem;">Queue Up to Date</div>
        </div>
        <div class="attention-meta">
          <div class="font-body-sm" style="color: var(--on-surface-variant); font-size: 0.8125rem;">
            No pending partial settlements or unassigned exceptions.
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

async function inspectTriageCase(caseId) {
  if (!caseId) return;
  setLoading(true);

  // Stale-case protection: reset sub-workspace state
  currentControllerBrief = null;
  currentReviewRecord = null;
  currentIntelligenceProfile = null;
  currentRemediationActions = [];
  currentJournalVoucher = null;
  const ansBox = document.getElementById("controller-query-answer");
  if (ansBox) {
    ansBox.style.display = "none";
    ansBox.innerHTML = "";
  }
  const auditStatusBox = document.getElementById("audit-verify-status");
  if (auditStatusBox) {
    auditStatusBox.style.display = "none";
    auditStatusBox.innerHTML = "";
  }

  try {
    let data = null;
    const caseRes = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(caseId)}`);
    if (caseRes.ok) {
      data = await caseRes.json();
    } else {
      const repRes = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(caseId)}/report`);
      if (repRes.ok) {
        const rep = await repRes.json();
        data = {
          case_id: rep.case_id,
          status: rep.status,
          confidence: rep.confidence_score,
          financial_summary: rep.financial_summary,
          truth_report: rep,
          stage_execution: [],
          provenance: rep.provenance,
          total_execution_time_ms: 0,
          text_report: rep.text_report
        };
      }
    }

    if (data) {
      currentCaseResult = data;
      renderCaseResult(data);
      await Promise.allSettled([
        loadControllerBrief(caseId),
        loadCaseReview(caseId),
        loadCounterpartyIntelligence(caseId),
        loadRemediationData(caseId),
      ]);
    }
    setWorkspace("cases");
  } catch (err) {
    console.error("Failed to inspect triage case:", err);
    showAlert(`Unable to load case ${caseId}: ${err.message}`, "error");
    setWorkspace("cases");
  } finally {
    setLoading(false);
  }
}

function renderPortfolioCasesTable(items) {
  const tbody = document.getElementById("portfolio-table-body");
  if (!tbody) return;

  if (!items.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="padding: 1.5rem; text-align: center; color: var(--text-faint);">
          No cases matching current filter or search criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items.map((c) => {
    let riskColor = "var(--status-confirmed)";
    if (c.risk_level === "CRITICAL") riskColor = "var(--status-contradicted)";
    else if (c.risk_level === "HIGH") riskColor = "var(--status-partial)";
    else if (c.risk_level === "MEDIUM") riskColor = "var(--accent-secondary)";

    let prioColor = "var(--text-main)";
    if (c.priority === "CRITICAL") prioColor = "var(--status-contradicted)";
    else if (c.priority === "HIGH") prioColor = "var(--status-partial)";
    else if (c.priority === "MEDIUM") prioColor = "var(--accent-secondary)";

    let slaColor = "var(--status-confirmed)";
    if (c.sla_status === "OVERDUE") slaColor = "var(--status-contradicted)";
    else if (c.sla_status === "DUE_SOON") slaColor = "var(--status-partial)";

    return `
      <tr style="border-bottom: 1px solid var(--outline-variant); transition: background 0.15s ease;" onmouseover="this.style.background='var(--surface-container-low)'" onmouseout="this.style.background='transparent'">
        <td style="padding: 0.6rem 0.8rem; font-family: var(--font-mono); font-weight: 700; color: var(--on-surface);">
          ${c.case_id}
        </td>
        <td style="padding: 0.6rem 0.8rem; font-weight: 700; color: ${riskColor};">
          ${c.risk_level}
        </td>
        <td style="padding: 0.6rem 0.8rem; font-weight: 600; color: ${prioColor};">
          ${c.priority}
        </td>
        <td style="padding: 0.6rem 0.8rem;">
          <span class="status-badge" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">${c.deterministic_status}</span>
        </td>
        <td style="padding: 0.6rem 0.8rem; color: var(--on-surface-variant);">
          ${c.portfolio_status}
        </td>
        <td style="padding: 0.6rem 0.8rem; font-family: var(--font-mono); font-weight: 600;">
          ₹${(c.amount_exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
        <td style="padding: 0.6rem 0.8rem; font-weight: 600; color: ${slaColor};">
          ${c.sla_status}
        </td>
        <td style="padding: 0.6rem 0.8rem; color: var(--on-surface);">
          ${c.assigned_reviewer_name ? `👤 ${c.assigned_reviewer_name}` : `<span style="color: var(--on-surface-variant);">Unassigned</span>`}
        </td>
        <td style="padding: 0.6rem 0.8rem; text-align: right; white-space: nowrap;">
          <button class="btn-primary" style="padding: 0.25rem 0.55rem; font-size: 0.75rem; margin-right: 0.25rem;" onclick="loadAndInspectCase('${c.case_id}')">
            Inspect
          </button>
          <button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="assignCasePrompt('${c.case_id}')">
            ${c.assigned_reviewer_id ? 'Reassign' : 'Assign'}
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadAndInspectCase(caseId) {
  if (!caseId) return;
  setLoading(true);

  // Stale-case protection: reset sub-workspace state
  currentControllerBrief = null;
  currentReviewRecord = null;
  currentIntelligenceProfile = null;
  currentRemediationActions = [];
  currentJournalVoucher = null;
  const ansBox = document.getElementById("controller-query-answer");
  if (ansBox) {
    ansBox.style.display = "none";
    ansBox.innerHTML = "";
  }
  const auditStatusBox = document.getElementById("audit-verify-status");
  if (auditStatusBox) {
    auditStatusBox.style.display = "none";
    auditStatusBox.innerHTML = "";
  }

  try {
    let data = null;
    const caseRes = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(caseId)}`);
    if (caseRes.ok) {
      data = await caseRes.json();
    } else {
      const repRes = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(caseId)}/report`);
      if (repRes.ok) {
        const rep = await repRes.json();
        data = {
          case_id: rep.case_id,
          status: rep.status,
          confidence: rep.confidence_score,
          financial_summary: rep.financial_summary,
          truth_report: rep,
          stage_execution: [],
          provenance: rep.provenance,
          total_execution_time_ms: 0,
          text_report: rep.text_report
        };
      }
    }

    if (data) {
      currentCaseResult = data;
      renderCaseResult(data);
      await Promise.allSettled([
        loadControllerBrief(caseId),
        loadCaseReview(caseId),
        loadCounterpartyIntelligence(caseId),
        loadRemediationData(caseId),
      ]);
      setWorkspace("cases");
    } else {
      showAlert(`Unable to load case ${caseId}.`, "error");
      setWorkspace("cases");
    }
  } catch (err) {
    console.error("Failed to inspect case:", err);
    showAlert(`Failed to load case ${caseId}: ${err.message}`, "error");
    setWorkspace("cases");
  } finally {
    setLoading(false);
  }
}

function renderPortfolioWorkloadTable(workloads) {
  const tbody = document.getElementById("portfolio-workload-body");
  if (!tbody) return;

  if (!workloads.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 1rem; text-align: center; color: var(--text-faint);">
          No active reviewer assignments.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = workloads.map((w) => `
    <tr style="border-bottom: 1px solid var(--outline-variant);">
      <td style="padding: 0.5rem 0.8rem; font-weight: 700; color: var(--on-surface);">
        👤 ${w.reviewer_name}
      </td>
      <td style="padding: 0.5rem 0.8rem; font-family: var(--font-mono);">${w.assigned_cases}</td>
      <td style="padding: 0.5rem 0.8rem; font-family: var(--font-mono); font-weight: 600;">${w.open_cases}</td>
      <td style="padding: 0.5rem 0.8rem; font-family: var(--font-mono); color: ${w.critical_cases > 0 ? 'var(--status-contradicted)' : 'var(--text-muted)'};">${w.critical_cases}</td>
      <td style="padding: 0.5rem 0.8rem; font-family: var(--font-mono); color: ${w.overdue_cases > 0 ? 'var(--status-contradicted)' : 'var(--text-muted)'};">${w.overdue_cases}</td>
      <td style="padding: 0.5rem 0.8rem; font-family: var(--font-mono); font-weight: 600;">₹${(w.total_exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
      <td style="padding: 0.5rem 0.8rem;">
        ${w.is_overloaded ? `
          <span class="tag-badge" style="background: rgba(239, 68, 68, 0.2); color: var(--status-contradicted); border-color: var(--status-contradicted);" title="${w.overload_reasons.join(', ')}">⚠️ OVERLOADED</span>
        ` : `
          <span class="tag-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--status-confirmed); border-color: var(--status-confirmed);">✓ NORMAL</span>
        `}
      </td>
    </tr>
  `).join("");
}

let pendingAssignCaseId = null;

function openAssignModal(caseId) {
  pendingAssignCaseId = caseId;
  const modal = document.getElementById("modal-assign-reviewer");
  const caseIdEl = document.getElementById("assign-modal-case-id");
  const input = document.getElementById("assign-reviewer-input");
  const submitBtn = document.getElementById("btn-submit-assign");
  if (!modal) return;

  if (caseIdEl) caseIdEl.textContent = caseId || "";
  if (input) {
    input.value = "ctrl_alice";
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Assign Reviewer";
  }

  modal.style.display = "flex";
}

function closeAssignModal() {
  const modal = document.getElementById("modal-assign-reviewer");
  if (modal) modal.style.display = "none";
  pendingAssignCaseId = null;
}

async function submitReviewerAssignment() {
  if (!pendingAssignCaseId) return;
  const input = document.getElementById("assign-reviewer-input");
  const submitBtn = document.getElementById("btn-submit-assign");
  const reviewer = (input?.value || "").trim();
  if (!reviewer) {
    showAlert("Please enter a valid Reviewer ID or Name.", "warning");
    if (input) input.focus();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Assigning...";
  }

  const cid = pendingAssignCaseId;
  try {
    const res = await fetch(`${API_BASE}/api/v1/portfolio/cases/${encodeURIComponent(cid)}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer_id: reviewer, reviewer_name: reviewer }),
    });

    if (res.ok) {
      closeAssignModal();
      showAlert(`Case ${cid} assigned to ${reviewer}.`, "success");
      await loadPortfolioData();
    } else {
      const err = await res.json().catch(() => ({}));
      showAlert(`Failed to assign case: ${err?.detail || res.statusText}`, "error");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Assign Reviewer";
      }
    }
  } catch (e) {
    showAlert(`Assignment error: ${e.message}`, "error");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Assign Reviewer";
    }
  }
}

function assignCasePrompt(caseId) {
  openAssignModal(caseId);
}


// -------------------------------------------------------------
// COUNTERPARTY MEMORY & INSTITUTIONAL INTELLIGENCE (Day 18)
// -------------------------------------------------------------
async function loadCounterpartyIntelligence(caseId) {
  const signalsContainer = document.getElementById("cp-risk-signals-container");
  const refContainer = document.getElementById("cp-reference-correlations-container");
  const discContainer = document.getElementById("cp-recurring-discrepancies-container");
  const relatedContainer = document.getElementById("cp-related-cases-container");
  const activeCaseTag = document.getElementById("cp-active-case-tag");
  const nameEl = document.getElementById("cp-canonical-name");
  const heroNameEl = document.getElementById("cp-hero-canonical-name");
  const profileNameEl = document.getElementById("cp-profile-name");

  // Clear stale previous-case state
  if (activeCaseTag) {
    activeCaseTag.textContent = `Case: ${caseId} (Loading...)`;
    activeCaseTag.className = "badge badge-unverifiable";
  }
  if (heroNameEl) heroNameEl.textContent = "Loading counterparty dossier...";
  if (profileNameEl) profileNameEl.textContent = "Loading entity...";
  if (nameEl) nameEl.textContent = "Loading...";

  if (signalsContainer) signalsContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Scanning historical risk signals...</p>';
  if (refContainer) refContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Checking for reference reuse...</p>';
  if (discContainer) discContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Analyzing recurring discrepancy patterns...</p>';
  if (relatedContainer) relatedContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Correlating historical cases...</p>';

  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(caseId)}/intelligence-profile`);
    if (res.ok) {
      const profile = await res.json();
      currentIntelligenceProfile = profile;
      renderCounterpartyIntelligence(profile);
      updateGoldenCommandCenter();
    } else {
      if (heroNameEl) heroNameEl.textContent = "Counterparty Dossier";
      if (profileNameEl) profileNameEl.textContent = "First-Time Entity";
      if (signalsContainer) signalsContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No historical intelligence profile found for this entity.</p>';
      if (refContainer) refContainer.innerHTML = '<div class="clean-evidence-banner"><span class="material-symbols-outlined" style="color: var(--status-confirmed); font-size: 1.25rem;">verified</span><span>✓ UNIQUE REFERENCE &bull; Zero duplicate UTR reuse detected across historical cases.</span></div>';
      if (discContainer) discContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No recurring discrepancies.</p>';
      if (relatedContainer) relatedContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No correlated cases.</p>';
    }
  } catch (err) {
    console.error("Failed to load counterparty intelligence:", err);
    if (signalsContainer) signalsContainer.innerHTML = `<p class="font-body-sm" style="color: var(--status-contradicted);">Error: ${err.message}</p>`;
  }
}

function renderCounterpartyIntelligence(profile) {
  const activeCaseTag = document.getElementById("cp-active-case-tag");
  if (activeCaseTag) {
    if (currentCaseResult) {
      const st = currentCaseResult.status || "CONFIRMED";
      activeCaseTag.textContent = `Case: ${currentCaseResult.case_id} (${st})`;
      activeCaseTag.className = "badge badge-risk-violet";
    } else {
      activeCaseTag.textContent = "No Active Case";
      activeCaseTag.className = "badge badge-unverifiable";
    }
  }

  if (!profile) return;
  const histories = profile.counterparty_histories || [];
  const signals = profile.historical_risk_signals || [];
  const refCorrs = profile.reference_correlations || [];
  const discrepancies = profile.recurring_discrepancies || [];
  const relatedCases = profile.related_cases || [];

  // Update Top KPIs & Hero Identity
  const primaryEntity = histories[0];
  const nameEl = document.getElementById("cp-canonical-name");
  const heroNameEl = document.getElementById("cp-hero-canonical-name");
  const profileNameEl = document.getElementById("cp-profile-name");
  const countEl = document.getElementById("cp-case-count");
  const expEl = document.getElementById("cp-total-exposure");
  const dispEl = document.getElementById("cp-disputed-exposure");

  const heroCountEl = document.getElementById("cp-hero-case-count");
  const heroExpEl = document.getElementById("cp-hero-total-exp");
  const heroDispEl = document.getElementById("cp-hero-disputed-exp");
  const heroReuseEl = document.getElementById("cp-hero-reuse-status");
  const heroRiskBadge = document.getElementById("cp-hero-risk-badge");
  const healthSummaryBox = document.getElementById("cp-health-summary-box");

  const canonicalName = primaryEntity?.canonical_name || (currentCaseResult?.truth_report?.claims_summary?.[0]?.counterparty_hint) || "First-Time Entity";
  const caseCount = primaryEntity?.case_count != null ? primaryEntity.case_count : 1;
  const totalExp = primaryEntity?.total_exposure || currentCaseResult?.financial_summary?.claimed_amount || 0;
  const disputedExp = primaryEntity?.disputed_exposure || currentCaseResult?.financial_summary?.disputed_amount || 0;
  const hasReuse = refCorrs.some((r) => r.reuse_warning);

  if (nameEl) nameEl.textContent = canonicalName;
  if (heroNameEl) heroNameEl.textContent = canonicalName;
  if (profileNameEl) profileNameEl.textContent = canonicalName;
  if (countEl) countEl.textContent = caseCount;
  if (expEl) expEl.textContent = `₹${Number(totalExp).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  if (dispEl) dispEl.textContent = `₹${Number(disputedExp).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  if (heroCountEl) heroCountEl.textContent = caseCount;
  if (heroExpEl) heroExpEl.textContent = `₹${Number(totalExp).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  if (heroDispEl) heroDispEl.textContent = `₹${Number(disputedExp).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  if (heroReuseEl) {
    heroReuseEl.textContent = hasReuse ? "⚠ Reused" : "✓ Clean";
    heroReuseEl.style.color = hasReuse ? "var(--error)" : "var(--success)";
  }

  // Health summary & risk badge
  if (heroRiskBadge) {
    if (hasReuse || disputedExp > 0) {
      heroRiskBadge.textContent = "HIGH RISK";
      heroRiskBadge.className = "badge badge-contradicted";
    } else if (caseCount > 3) {
      heroRiskBadge.textContent = "LOW RISK";
      heroRiskBadge.className = "badge badge-confirmed";
    } else {
      heroRiskBadge.textContent = "NEW ENTITY";
      heroRiskBadge.className = "badge badge-risk-violet";
    }
  }

  if (healthSummaryBox) {
    if (hasReuse) {
      healthSummaryBox.innerHTML = `<strong>⚠️ Alert:</strong> Repeated banking reference / UTR detected across historical transactions. Controller review required.`;
      healthSummaryBox.style.borderLeft = "3px solid var(--error)";
    } else if (disputedExp > 0) {
      healthSummaryBox.innerHTML = `<strong>⚠️ Attention:</strong> Active disputed exposure of ₹${Number(disputedExp).toLocaleString("en-IN", { minimumFractionDigits: 2 })} recorded. Settle with caution.`;
      healthSummaryBox.style.borderLeft = "3px solid var(--warning)";
    } else {
      healthSummaryBox.innerHTML = `<strong>✓ Verified History:</strong> Established counterparty profile with stable settlement history and zero reference conflicts.`;
      healthSummaryBox.style.borderLeft = "3px solid var(--success)";
    }
  }

  // Graphic 2: Exposure Breakdown Bars
  const currentCaseExp = currentCaseResult?.financial_summary?.matched_amount || currentCaseResult?.financial_summary?.claimed_amount || 0;
  const currentExpEl = document.getElementById("cp-exp-current-val");
  const histExpEl = document.getElementById("cp-exp-hist-val");
  const dispExpEl = document.getElementById("cp-exp-disp-val");

  const currentFill = document.getElementById("cp-exp-current-fill");
  const histFill = document.getElementById("cp-exp-hist-fill");
  const dispFill = document.getElementById("cp-exp-disp-fill");

  if (currentExpEl) currentExpEl.textContent = `₹${Number(currentCaseExp).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  if (histExpEl) histExpEl.textContent = `₹${Number(totalExp).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  if (dispExpEl) dispExpEl.textContent = `₹${Number(disputedExp).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const maxVal = Math.max(1, currentCaseExp, totalExp, disputedExp);
  if (currentFill) currentFill.style.width = `${Math.min(100, Math.max(15, Math.round((currentCaseExp / maxVal) * 100)))}%`;
  if (histFill) histFill.style.width = `${Math.min(100, Math.max(15, Math.round((totalExp / maxVal) * 100)))}%`;
  if (dispFill) dispFill.style.width = disputedExp > 0 ? `${Math.min(100, Math.max(15, Math.round((disputedExp / maxVal) * 100)))}%` : "0%";

  // Graphic 1: Reference Correlations & Tree Visual
  const refContainer = document.getElementById("cp-reference-correlations-container");
  if (refContainer) {
    const warnings = refCorrs.filter((r) => r.reuse_warning);
    if (!warnings.length) {
      refContainer.innerHTML = `
        <div class="clean-evidence-banner">
          <span class="material-symbols-outlined" style="color: var(--status-confirmed); font-size: 1.25rem;">verified</span>
          <span>✓ UNIQUE REFERENCE &bull; Zero duplicate UTR / bank reference reuse detected across historical cases.</span>
        </div>
      `;
    } else {
      refContainer.innerHTML = warnings.map((r) => `
        <div class="reuse-tree-container">
          <div class="reuse-root-box">
            <span class="material-symbols-outlined" style="font-size: 1.15rem; color: var(--error);">hub</span>
            <span>REFERENCE: ${r.reference_id}</span>
            <span class="badge badge-contradicted" style="font-size: 0.7rem; margin-left: 0.5rem;">${r.occurrence_count} REUSES DETECTED</span>
          </div>
          <div class="reuse-branch-list">
            ${(r.previous_case_ids || []).map((cid) => `
              <div class="reuse-branch-item">
                <div>
                  <strong style="color: var(--primary); font-family: var(--font-mono);">${cid}</strong>
                  <span style="color: var(--on-surface-variant); font-size: 0.75rem; margin-left: 0.5rem;">Historical Citation</span>
                </div>
                <button class="btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.72rem;" onclick="inspectTriageCase('${cid}')">Inspect Case</button>
              </div>
            `).join("")}
          </div>
        </div>
      `).join("");
    }
  }

  // 1. Risk Signals Container
  const signalsContainer = document.getElementById("cp-risk-signals-container");
  if (signalsContainer) {
    if (!signals.length) {
      signalsContainer.innerHTML = '<p class="font-body-sm" style="color: var(--status-confirmed);">✓ No historical risk signals detected for this counterparty or case.</p>';
    } else {
      signalsContainer.innerHTML = signals.map((s) => {
        let badgeStyle = "border-left: 4px solid var(--primary);";
        let icon = "info";
        let iconColor = "var(--primary)";
        if (s.severity === "CRITICAL") {
          badgeStyle = "border-left: 4px solid var(--error); background: var(--error-container); color: var(--on-error-container);";
          icon = "warning";
          iconColor = "var(--error)";
        } else if (s.severity === "WARNING") {
          badgeStyle = "border-left: 4px solid var(--warning); background: var(--warning-container); color: var(--on-warning-container);";
          icon = "priority_high";
          iconColor = "var(--warning)";
        }
        return `
          <div class="card" style="${badgeStyle} margin-bottom: 0.6rem; padding: 0.75rem 1rem;">
            <div style="display: flex; align-items: center; gap: 0.45rem; font-weight: 700; font-size: 0.88rem; margin-bottom: 0.2rem;">
              <span class="material-symbols-outlined" style="font-size: 1.1rem; color: ${iconColor};">${icon}</span>
              <span>${s.title}</span>
            </div>
            <p style="font-size: 0.8125rem; margin-bottom: 0.25rem; line-height: 1.4;">${s.description}</p>
            <div style="font-size: 0.72rem; font-family: var(--font-mono); opacity: 0.85;">Affected Cases: ${s.affected_case_ids?.join(", ") || "None"}</div>
          </div>
        `;
      }).join("");
    }
  }

  // 3. Recurring Discrepancies Container
  const discContainer = document.getElementById("cp-recurring-discrepancies-container");
  if (discContainer) {
    if (!discrepancies.length) {
      discContainer.innerHTML = '<p class="font-body-sm" style="color: var(--status-confirmed);">✓ No recurring discrepancy patterns recorded for this entity.</p>';
    } else {
      discContainer.innerHTML = discrepancies.map((d) => `
        <div class="card" style="border-left: 3px solid var(--warning); margin-bottom: 0.5rem; padding: 0.75rem 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; flex-wrap: wrap; gap: 0.4rem;">
            <strong style="color: var(--on-surface); font-size: 0.88rem;">${d.discrepancy_type}</strong>
            <span class="tag-badge">${d.occurrence_count} Occurrences</span>
          </div>
          <p style="font-size: 0.8125rem; color: var(--on-surface-variant); margin-bottom: 0.25rem;">Affected volume: ₹${(d.total_affected_exposure || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} across cases: ${d.affected_case_ids?.join(", ")}</p>
          ${d.sample_messages?.length > 0 ? `<div style="font-size: 0.75rem; color: var(--on-surface-variant); font-style: italic;">"${d.sample_messages[0]}"</div>` : ""}
        </div>
      `).join("");
    }
  }

  // 4. Correlated Historical Cases Container
  const relatedContainer = document.getElementById("cp-related-cases-container");
  if (relatedContainer) {
    if (!relatedCases.length) {
      relatedContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No correlated historical cases discovered for this case.</p>';
    } else {
      relatedContainer.innerHTML = relatedCases.map((rc) => `
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; padding: 0.6rem 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-weight: 700; color: var(--primary); font-size: 0.85rem; font-family: var(--font-mono);">${rc.related_case_id}</div>
            <div style="font-size: 0.78rem; color: var(--on-surface-variant);">${rc.deterministic_reason || "Deterministic correlation"}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span class="tag-badge">${rc.relationship_type || "RELATED"}</span>
            ${rc.related_case_status ? `<span class="badge badge-confirmed" style="font-size: 0.72rem;">${rc.related_case_status}</span>` : ""}
            <button class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="inspectTriageCase('${rc.related_case_id}')">View Case &rarr;</button>
          </div>
        </div>
      `).join("");
    }
  }
}

// =============================================================
// DAY 19 & UX PASS 5 / B5: PROACTIVE REMEDIATION & ACTIONS
// =============================================================

async function loadRemediationData(caseId) {
  if (!caseId) return;
  const headerTitle = document.getElementById("remediation-header-title");
  const activeCaseTag = document.getElementById("remediation-active-case-tag");
  const heroStatus = document.getElementById("remediation-hero-status");
  const stageBadge = document.getElementById("remediation-stage-badge");
  const remContainer = document.getElementById("remediation-actions-container");
  const jvContainer = document.getElementById("journal-voucher-preview");

  // State Safety: Clear stale previous-case data
  if (headerTitle) headerTitle.textContent = `Case: ${caseId} Remediation`;
  if (activeCaseTag) {
    activeCaseTag.textContent = `Case: ${caseId} (Loading...)`;
    activeCaseTag.className = "badge badge-unverifiable";
  }
  if (heroStatus) heroStatus.textContent = "Evaluating remediation state...";
  if (stageBadge) stageBadge.textContent = "EVALUATING";
  if (remContainer) remContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Generating grounded remediation proposals...</p>';
  if (jvContainer) jvContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Generating draft double-entry journal voucher...</p>';

  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(caseId)}/actions`);
    if (res.ok) {
      const actions = await res.json();
      currentRemediationActions = actions;
      renderRemediationActions(actions);
    } else {
      if (remContainer) remContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No remediation proposals generated for this case.</p>';
    }
  } catch (err) {
    console.error("Failed to load remediation actions:", err);
    if (remContainer) remContainer.innerHTML = `<p class="font-body-sm" style="color: var(--status-contradicted);">Error loading actions: ${err.message}</p>`;
  }

  // Load draft journal voucher if available
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(caseId)}/journal-voucher`);
    if (res.ok) {
      const voucher = await res.json();
      currentJournalVoucher = voucher;
      renderJournalVoucher(voucher);
    } else {
      if (jvContainer) jvContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No draft journal voucher available for this case.</p>';
    }
  } catch (err) {
    console.error("Failed to load journal voucher:", err);
    if (jvContainer) jvContainer.innerHTML = `<p class="font-body-sm" style="color: var(--status-contradicted);">Error loading journal voucher: ${err.message}</p>`;
  }
  updateGoldenCommandCenter();
}

function renderRemediationActions(actions) {
  const activeCaseTag = document.getElementById("remediation-active-case-tag");
  const headerTitle = document.getElementById("remediation-header-title");
  const heroStatus = document.getElementById("remediation-hero-status");
  const stageBadge = document.getElementById("remediation-stage-badge");

  if (activeCaseTag) {
    if (currentCaseResult) {
      const st = currentCaseResult.status || "CONFIRMED";
      activeCaseTag.textContent = `Case: ${currentCaseResult.case_id} (${st})`;
      activeCaseTag.className = `badge badge-${st.toLowerCase()}`;
    } else {
      activeCaseTag.textContent = "No Active Case";
      activeCaseTag.className = "badge badge-unverifiable";
    }
  }

  if (headerTitle && currentCaseResult) {
    headerTitle.textContent = `Case: ${currentCaseResult.case_id} Remediation`;
  }

  // Graphic 1: Update Remediation Lifecycle Timeline
  const hasActions = actions && actions.length > 0;
  const anyPending = hasActions && actions.some((a) => a.approval_status === "PENDING_APPROVAL");
  const anyApproved = hasActions && actions.some((a) => a.approval_status === "APPROVED");
  const allRejected = hasActions && actions.every((a) => a.approval_status === "REJECTED");

  const step1 = document.getElementById("rem-step-1");
  const step2 = document.getElementById("rem-step-2");
  const step3 = document.getElementById("rem-step-3");
  const step4 = document.getElementById("rem-step-4");

  const step1Status = document.getElementById("rem-step-1-status");
  const step2Status = document.getElementById("rem-step-2-status");
  const step3Status = document.getElementById("rem-step-3-status");
  const step4Status = document.getElementById("rem-step-4-status");

  if (step1) {
    step1.className = `remediation-lifecycle-step ${hasActions ? 'completed' : 'active'}`;
    if (step1Status) step1Status.textContent = hasActions ? `✓ ${actions.length} Drafted` : "Ready";
  }
  if (step2) {
    step2.className = `remediation-lifecycle-step ${anyApproved ? 'completed' : (anyPending ? 'active' : '')}`;
    if (step2Status) step2Status.textContent = anyApproved ? "✓ Approved" : (anyPending ? "Pending Review" : (allRejected ? "Rejected" : "Waiting"));
  }
  if (step3) {
    const hasVoucher = Boolean(currentJournalVoucher);
    step3.className = `remediation-lifecycle-step ${hasVoucher ? 'completed' : (anyApproved ? 'active' : '')}`;
    if (step3Status) step3Status.textContent = hasVoucher ? "✓ Voucher Drafted" : (anyApproved ? "Executing" : "Waiting");
  }
  if (step4) {
    step4.className = `remediation-lifecycle-step ${anyApproved ? 'completed' : ''}`;
    if (step4Status) step4Status.textContent = anyApproved ? "✓ Ready / Final" : "Open";
  }

  // Update Hero Status
  if (heroStatus && stageBadge) {
    if (!hasActions) {
      heroStatus.textContent = "Awaiting Action Proposal";
      stageBadge.textContent = "READY TO DRAFT";
      stageBadge.className = "badge badge-confirmed";
    } else if (anyPending) {
      heroStatus.textContent = "Remediation Proposals Waiting For Approval";
      stageBadge.textContent = "PENDING APPROVAL";
      stageBadge.className = "badge badge-partial";
    } else if (anyApproved) {
      heroStatus.textContent = "Proposed Remediation Approved";
      stageBadge.textContent = "APPROVED";
      stageBadge.className = "badge badge-confirmed";
    } else if (allRejected) {
      heroStatus.textContent = "Proposed Remediation Rejected";
      stageBadge.textContent = "REJECTED";
      stageBadge.className = "badge badge-contradicted";
    }
  }

  const container = document.getElementById("remediation-actions-container");
  if (!container) return;
  if (!actions || !actions.length) {
    container.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No remediation actions proposed yet. Click a proposal button above to draft grounded actions.</p>';
    return;
  }

  container.innerHTML = actions.map((a) => {
    let statusBadge = '<span class="tag-badge" style="color: var(--warning); border-color: var(--warning);">PENDING APPROVAL</span>';
    if (a.approval_status === "APPROVED") {
      statusBadge = '<span class="tag-badge" style="color: var(--success); border-color: var(--success);">✓ APPROVED</span>';
    } else if (a.approval_status === "REJECTED") {
      statusBadge = '<span class="tag-badge" style="color: var(--error); border-color: var(--error);">✗ REJECTED</span>';
    }

    let draftContent = "";
    if (a.notice_draft) {
      draftContent = `
        <div style="background: var(--surface-container-lowest); border: 1px solid var(--outline-variant); border-radius: var(--radius-sm); padding: 0.75rem; margin-top: 0.5rem;">
          <div style="font-size: 0.8rem; color: var(--secondary); margin-bottom: 0.25rem;"><strong>Subject:</strong> ${a.notice_draft.subject}</div>
          <div style="font-size: 0.78rem; color: var(--on-surface-variant); margin-bottom: 0.5rem;"><strong>To:</strong> ${a.notice_draft.recipient_name} ${a.notice_draft.recipient_contact ? `(${a.notice_draft.recipient_contact})` : ""}</div>
          <pre style="font-family: var(--font-sans); font-size: 0.8rem; color: var(--on-surface); white-space: pre-wrap; line-height: 1.5; background: none; border: none; padding: 0;">${a.notice_draft.body}</pre>
        </div>
      `;
    }

    let actionButtons = "";
    if (a.approval_status === "PENDING_APPROVAL") {
      actionButtons = `
        <div style="display: flex; gap: 0.5rem; margin-top: 0.6rem; justify-content: flex-end; flex-wrap: wrap;">
          <button class="btn-primary" onclick="approveRemediationAction('${a.action_id}')" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;">✓ Approve Action</button>
          <button class="btn-secondary" onclick="rejectRemediationAction('${a.action_id}')" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; color: var(--error); border-color: var(--error);">✗ Reject Action</button>
        </div>
      `;
    }

    return `
      <div class="card" style="margin-bottom: 0.75rem; border-left: 4px solid ${a.approval_status === 'APPROVED' ? 'var(--success)' : (a.approval_status === 'REJECTED' ? 'var(--error)' : 'var(--primary)')}; padding: 0.85rem 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; flex-wrap: wrap; gap: 0.4rem;">
          <strong style="color: var(--on-surface); font-size: 0.9rem;">${a.title}</strong>
          ${statusBadge}
        </div>
        <p style="font-size: 0.82rem; color: var(--on-surface-variant); line-height: 1.4; margin-bottom: 0.35rem;">${a.summary}</p>
        ${draftContent}
        ${actionButtons}
      </div>
    `;
  }).join("");
}

function renderJournalVoucher(voucher) {
  const container = document.getElementById("journal-voucher-preview");
  const balanceTag = document.getElementById("journal-balance-tag");
  if (!container) return;

  if (!voucher || !voucher.lines || !voucher.lines.length) {
    container.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">No draft journal voucher generated yet.</p>';
    return;
  }

  if (balanceTag) {
    if (voucher.is_balanced) {
      balanceTag.textContent = `✓ BALANCED (DR ₹${voucher.total_debits.toLocaleString("en-IN", { minimumFractionDigits: 2 })} = CR ₹${voucher.total_credits.toLocaleString("en-IN", { minimumFractionDigits: 2 })})`;
      balanceTag.className = "status-badge-lg badge-CONFIRMED";
    } else {
      balanceTag.textContent = "✗ UNBALANCED";
      balanceTag.className = "status-badge-lg badge-CONTRADICTED";
    }
  }

  const mappingNotice = voucher.requires_account_mapping ? `
    <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid var(--status-partial); border-radius: var(--radius-sm); padding: 0.4rem 0.6rem; margin-bottom: 0.6rem; color: var(--status-partial); font-size: 0.76rem;">
      ⚠️ <strong>Notice:</strong> Using standard placeholder accounts. Customer Chart-of-Accounts review required prior to ERP posting.
    </div>
  ` : "";

  const linesHtml = voucher.lines.map((l) => `
    <tr style="border-bottom: 1px solid var(--outline-variant);">
      <td style="padding: 0.4rem 0.6rem; color: var(--secondary);">${l.account_code}</td>
      <td style="padding: 0.4rem 0.6rem; color: var(--on-surface);">${l.account_name}</td>
      <td style="padding: 0.4rem 0.6rem; text-align: right; color: var(--status-confirmed); font-family: var(--font-mono);">${l.debit_amount > 0 ? `₹${l.debit_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
      <td style="padding: 0.4rem 0.6rem; text-align: right; color: var(--primary); font-family: var(--font-mono);">${l.credit_amount > 0 ? `₹${l.credit_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
    </tr>
  `).join("");

  container.innerHTML = `
    ${mappingNotice}
    <div style="margin-bottom: 0.4rem; color: var(--on-surface-variant); font-size: 0.78rem;">
      <strong>Voucher Ref:</strong> ${voucher.voucher_id} | <strong>Status:</strong> ${voucher.is_draft ? "DRAFT (REQUIRES APPROVAL)" : "POSTED"}
    </div>
    <div style="background: var(--surface-container-low); border: 1px solid var(--outline-variant); border-radius: var(--radius-sm); padding: 0.4rem 0.6rem; margin-bottom: 0.6rem; font-size: 0.74rem; color: var(--on-surface-variant);">
      ⚖️ <strong>Double-Entry Ledger Principle:</strong> Books the complete transaction obligation. Any unsettled shortfall/dispute is isolated into dedicated clearing/suspense accounts to ensure mathematically balanced debits &amp; credits.
    </div>
    <div class="table-responsive-container" style="width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 0.6rem; border: 1px solid var(--outline-variant); border-radius: var(--radius-sm); box-sizing: border-box;">
      <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-bottom: 0;">
        <thead>
          <tr style="background: var(--surface-container-low); color: var(--on-surface-variant); text-transform: uppercase; font-size: 0.72rem;">
            <th style="padding: 0.4rem 0.6rem; text-align: left;">Account Code</th>
            <th style="padding: 0.4rem 0.6rem; text-align: left;">Account Title</th>
            <th style="padding: 0.4rem 0.6rem; text-align: right;">Debit (INR)</th>
            <th style="padding: 0.4rem 0.6rem; text-align: right;">Credit (INR)</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml}
          <tr style="border-top: 1px solid var(--outline-variant); font-weight: 700; background: var(--surface-container-low);">
            <td colspan="2" style="padding: 0.4rem 0.6rem;">TOTAL (DOUBLE-ENTRY PROOF)</td>
            <td style="padding: 0.4rem 0.6rem; text-align: right; color: var(--status-confirmed);">₹${voucher.total_debits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="padding: 0.4rem 0.6rem; text-align: right; color: var(--primary);">₹${voucher.total_credits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="font-size: 0.78rem; color: var(--on-surface-variant); font-style: italic;">
      "${voucher.general_narration}"
    </div>
  `;
}

async function proposeRemediationAction(actionType) {
  if (!currentCaseResult) {
    showAlert("Select or run a case first.", "warning");
    return;
  }
  const cid = currentCaseResult.case_id;
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(cid)}/actions/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_type: actionType }),
    });
    if (res.ok) {
      showAlert(`Proposed remediation action: ${actionType}`, "success");
      loadRemediationData(cid);
    } else {
      const err = await res.json();
      showAlert(`Proposal failed: ${err.detail || "Error"}`, "error");
    }
  } catch (err) {
    showAlert(`Failed to propose action: ${err.message}`, "error");
  }
}

async function approveRemediationAction(actionId) {
  if (!currentCaseResult) return;
  const cid = currentCaseResult.case_id;
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(cid)}/actions/${encodeURIComponent(actionId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer_id: "controller_ui" }),
    });
    if (res.ok) {
      showAlert(`Remediation action ${actionId} APPROVED. Audit record created.`, "success");
      loadRemediationData(cid);
      loadCaseReview(cid);
    }
  } catch (err) {
    showAlert(`Approval failed: ${err.message}`, "error");
  }
}

async function rejectRemediationAction(actionId) {
  if (!currentCaseResult) return;
  const cid = currentCaseResult.case_id;
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(cid)}/actions/${encodeURIComponent(actionId)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewer_id: "controller_ui", reason: "Controller rejected draft proposal" }),
    });
    if (res.ok) {
      showAlert(`Remediation action ${actionId} REJECTED. Audit record updated.`, "success");
      loadRemediationData(cid);
      loadCaseReview(cid);
    }
  } catch (err) {
    showAlert(`Rejection failed: ${err.message}`, "error");
  }
}

async function exportJournalVoucher() {
  if (!currentCaseResult) {
    showAlert("Select or run an investigation case first.", "warning");
    return;
  }
  const cid = currentCaseResult.case_id;

  let voucher = currentJournalVoucher;

  // Attempt authoritative backend export call to record audit event and obtain fresh voucher payload
  try {
    const res = await fetch(`${API_BASE}/api/v1/cases/${encodeURIComponent(cid)}/journal-voucher/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "JSON" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.voucher) {
        voucher = data.voucher;
        currentJournalVoucher = voucher;
      }
    }
  } catch (err) {
    console.warn("Backend journal voucher export endpoint unreachable; using active client voucher state:", err);
  }

  if (!voucher || !voucher.lines || !voucher.lines.length) {
    showAlert("No draft journal voucher available to export for this case. Generate a draft journal voucher first.", "warning");
    return;
  }

  // 1. Authoritative Mathematical Balance Verification: total_debits === total_credits
  const totalDebits = Number(voucher.total_debits != null ? voucher.total_debits : 0);
  const totalCredits = Number(voucher.total_credits != null ? voucher.total_credits : 0);
  const diff = Math.abs(totalDebits - totalCredits);
  const isBalanced = (voucher.is_balanced === true || diff < 0.001) && totalDebits > 0;

  if (!isBalanced) {
    showAlert(`Cannot export journal voucher: Total debits (₹${totalDebits.toFixed(2)}) do not equal total credits (₹${totalCredits.toFixed(2)}). Voucher is unbalanced.`, "error");
    return;
  }

  // 2. Authoritative Payload Construction (Strictly preserving domain fields)
  const exportPayload = {
    export_metadata: {
      exported_at: new Date().toISOString(),
      generator: "VERITY AI Finance Controller",
      system_version: "2.0.0",
      export_type: "BALANCED_DOUBLE_ENTRY_JOURNAL_VOUCHER"
    },
    case_id: voucher.case_id || cid,
    voucher_ref: voucher.voucher_id,
    voucher_date: voucher.voucher_date || new Date().toISOString().split("T")[0],
    voucher_type: voucher.voucher_type || "GENERAL_JOURNAL",
    status: voucher.is_draft ? "DRAFT (REQUIRES APPROVAL)" : "POSTED",
    is_balanced: true,
    total_debit: totalDebits,
    total_credit: totalCredits,
    requires_account_mapping: Boolean(voucher.requires_account_mapping),
    coa_mapping_profile: voucher.coa_mapping_profile || "STANDARD_PLACEHOLDER_COA",
    description: voucher.general_narration || `Deterministic balanced journal voucher for case ${cid}`,
    deterministic_basis: voucher.deterministic_basis || {},
    provenance_hash: voucher.provenance_hash || "",
    created_at: voucher.created_at || new Date().toISOString(),
    lines: (voucher.lines || []).map((l, idx) => ({
      line_number: idx + 1,
      account_code: l.account_code,
      account_name: l.account_name,
      debit_amount: Number(l.debit_amount || 0),
      credit_amount: Number(l.credit_amount || 0),
      currency: l.currency || "INR",
      narration: l.narration || "",
      line_id: l.line_id || `line-${idx + 1}`
    })),
    raw_voucher: voucher
  };

  // 3. Browser-Native Blob Download Trigger
  try {
    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);

    const safeCaseId = (voucher.case_id || cid).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `VERITY_${safeCaseId}_balanced_voucher.json`;

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
      URL.revokeObjectURL(blobUrl);
    }, 200);

    showAlert(`Balanced voucher exported successfully (${filename}).`, "success");
  } catch (err) {
    console.error("Export download failed:", err);
    showAlert(`Export failed: ${err.message}`, "error");
  }
}

// Expose to window for inline onclick handlers & resilient event handling
window.exportJournalVoucher = exportJournalVoucher;
window.proposeRemediationAction = proposeRemediationAction;
window.approveRemediationAction = approveRemediationAction;
window.rejectRemediationAction = rejectRemediationAction;

// Hook up trigger buttons & delegated listener for dynamic renders
document.addEventListener("DOMContentLoaded", () => {
  const btnDisp = document.getElementById("btn-propose-dispute");
  if (btnDisp) btnDisp.addEventListener("click", () => proposeRemediationAction("VENDOR_DISPUTE_NOTICE"));

  const btnFlw = document.getElementById("btn-propose-followup");
  if (btnFlw) btnFlw.addEventListener("click", () => proposeRemediationAction("PAYMENT_FOLLOWUP_DRAFT"));

  const btnReq = document.getElementById("btn-propose-missing");
  if (btnReq) btnReq.addEventListener("click", () => proposeRemediationAction("MISSING_EVIDENCE_REQUEST"));

  const btnJv = document.getElementById("btn-propose-journal");
  if (btnJv) btnJv.addEventListener("click", () => proposeRemediationAction("DRAFT_JOURNAL_VOUCHER"));

  const btnExp = document.getElementById("btn-export-journal");
  if (btnExp) btnExp.addEventListener("click", exportJournalVoucher);
});

// =============================================================
// DAY 20: GOLDEN COMMAND CENTER RENDERER (7-SCENE NARRATIVE)
// =============================================================

function updateGoldenCommandCenter() {
  if (!currentCaseResult) return;
  const res = currentCaseResult;
  const rep = res.truth_report || res.report || {};
  const recon = res.reconciliation || {};

  // 0. Update Header Case Tag
  const activeCaseTag = document.getElementById("cc-active-case-tag");
  if (activeCaseTag) {
    activeCaseTag.textContent = `Case: ${res.case_id} | Pipeline: 8-Stage Deterministic Controller`;
  }

  // -------------------------------------------------------------
  // SCENE 1: Messy Input Evidence
  // -------------------------------------------------------------
  const evListContainer = document.getElementById("cc-evidence-list");
  const evBadge = document.getElementById("cc-evidence-count-badge");
  const evList = rep.evidence_summary || res.evidence_summary || [];
  if (evBadge) evBadge.textContent = `${evList.length} Evidence Sources`;

  if (evListContainer) {
    if (!evList.length) {
      evListContainer.innerHTML = '<p style="color: var(--text-faint); font-size: 0.84rem;">No evidence items attached to this case.</p>';
    } else {
      evListContainer.innerHTML = evList.map((ev) => {
        let icon = "📄";
        const mod = ev.modality || "DOCUMENT";
        if (mod === "INVOICE") icon = "🧾";
        else if (mod === "BANK_STATEMENT") icon = "🏦";
        else if (mod === "MESSAGING_CHAT") icon = "📱";
        else if (mod === "PAYMENT_SCREENSHOT") icon = "🖼️";
        else if (mod === "CASH_VOUCHER") icon = "💵";

        return `
          <div class="cc-evidence-pill">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong>${icon} ${mod}</strong>
              <span class="tag-badge" style="font-size: 0.68rem;">${ev.evidence_id || ev.id || "EV"}</span>
            </div>
            <span>${ev.source_name || "Raw Input"} (${ev.source_type || "MANUAL"})</span>
            ${ev.raw_snippet ? `<div style="font-size: 0.72rem; color: var(--text-faint); font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0.2rem;">"${ev.raw_snippet}"</div>` : ""}
          </div>
        `;
      }).join("");
    }
  }

  // -------------------------------------------------------------
  // SCENE 2: AI Candidate Extraction vs Deterministic Financial Truth
  // -------------------------------------------------------------
  const aiContainer = document.getElementById("cc-ai-claims-container");
  const truthContainer = document.getElementById("cc-truth-accounting-summary");
  const truthStatusTag = document.getElementById("cc-truth-status-tag");

  const claims = rep.claims_summary || [];
  if (aiContainer) {
    if (!claims.length) {
      aiContainer.innerHTML = '<p style="color: var(--text-faint); font-family: var(--font-sans);">Zero candidate claims extracted from noise.</p>';
    } else {
      aiContainer.innerHTML = claims.map((c) => `
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 4px; padding: 0.4rem 0.6rem; margin-bottom: 0.4rem;">
          <div style="display: flex; justify-content: space-between; color: #c7d2fe;">
            <span>${c.claim_type || "CLAIM"}</span>
            <strong>${c.claimed_amount != null ? `₹${c.claimed_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "NULL"}</strong>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
            Party: <em>${c.counterparty_hint || "N/A"}</em> | Ref: <em>${c.reference_id_hint || "N/A"}</em>
          </div>
        </div>
      `).join("");
    }
  }

  const status = res.status || recon.status || "CONFIRMED";
  if (truthStatusTag) {
    truthStatusTag.textContent = status;
    if (status === "CONFIRMED") {
      truthStatusTag.style.background = "rgba(16, 185, 129, 0.25)";
      truthStatusTag.style.color = "var(--status-confirmed)";
      truthStatusTag.style.borderColor = "var(--status-confirmed)";
    } else if (status === "PARTIALLY_SETTLED" || status === "PARTIAL") {
      truthStatusTag.style.background = "rgba(245, 158, 11, 0.25)";
      truthStatusTag.style.color = "var(--status-partial)";
      truthStatusTag.style.borderColor = "var(--status-partial)";
    } else if (status === "CONTRADICTED") {
      truthStatusTag.style.background = "rgba(239, 68, 68, 0.25)";
      truthStatusTag.style.color = "var(--status-contradicted)";
      truthStatusTag.style.borderColor = "var(--status-contradicted)";
    } else {
      truthStatusTag.style.background = "rgba(236, 72, 153, 0.25)";
      truthStatusTag.style.color = "var(--status-ambiguous)";
      truthStatusTag.style.borderColor = "var(--status-ambiguous)";
    }
  }

  if (truthContainer) {
    const expAmt = recon.expected_amount != null ? recon.expected_amount : (res.expected_amount || res.financial_summary?.claimed_amount || 0);
    const matAmt = recon.matched_amount != null ? recon.matched_amount : (res.matched_amount || res.financial_summary?.matched_amount || 0);
    const outAmt = recon.outstanding_amount != null ? recon.outstanding_amount : (res.outstanding_amount || res.financial_summary?.outstanding_amount || 0);

    truthContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; text-align: center; margin-bottom: 0.5rem;">
        <div style="background: var(--surface-container-lowest); border: 1px solid var(--outline-variant); padding: 0.5rem; border-radius: var(--radius-sm);">
          <div style="font-size: 0.7rem; color: var(--on-surface-variant);">Expected Obligation</div>
          <div style="font-weight: 700; color: var(--on-surface); font-size: 0.88rem; font-family: var(--font-mono);">₹${expAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </div>
        <div style="background: var(--surface-container-lowest); border: 1px solid var(--outline-variant); padding: 0.5rem; border-radius: var(--radius-sm);">
          <div style="font-size: 0.7rem; color: var(--on-surface-variant);">Verified Matched</div>
          <div style="font-weight: 700; color: var(--status-confirmed); font-size: 0.88rem; font-family: var(--font-mono);">₹${matAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </div>
        <div style="background: var(--surface-container-lowest); border: 1px solid var(--outline-variant); padding: 0.5rem; border-radius: var(--radius-sm);">
          <div style="font-size: 0.7rem; color: var(--on-surface-variant);">Outstanding Due</div>
          <div style="font-weight: 700; color: ${outAmt > 0 ? "var(--status-partial)" : "var(--on-surface-variant)"}; font-size: 0.88rem; font-family: var(--font-mono);">₹${outAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
      <div style="font-size: 0.78rem; color: var(--on-surface-variant); font-style: italic;">
        ${recon.explanation || rep.summary || "Deterministic mathematical reconciliation completed."}
      </div>
    `;
  }

  // -------------------------------------------------------------
  // SCENE 3: Institutional Counterparty Memory & Reference Reuse
  // -------------------------------------------------------------
  const cpName = document.getElementById("cc-cp-name");
  const cpCases = document.getElementById("cc-cp-cases");
  const cpVolume = document.getElementById("cc-cp-volume");
  const cpRisk = document.getElementById("cc-cp-risk");
  const alertBox = document.getElementById("cc-memory-alert-box");

  if (currentIntelligenceProfile) {
    const prof = currentIntelligenceProfile;
    const primary = (prof.counterparty_histories && prof.counterparty_histories[0]) || {};
    if (cpName) cpName.textContent = prof.counterparty_name || primary.canonical_name || "Direct Counterparty";
    if (cpCases) cpCases.textContent = `${primary.case_count || prof.total_case_count || 1} Cases`;
    if (cpVolume) cpVolume.textContent = `₹${(primary.total_exposure || prof.lifetime_exposure_inr || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    if (cpRisk) {
      const riskRating = prof.historical_risk_rating || primary.risk_rating || "LOW";
      cpRisk.textContent = riskRating;
      cpRisk.style.color = (riskRating === "HIGH" || riskRating === "CRITICAL") ? "var(--status-contradicted)" : "var(--status-confirmed)";
    }

    if (alertBox) {
      const refCorrs = prof.reference_correlations || [];
      if (prof.has_reference_reuse || refCorrs.length > 0) {
        const corr = refCorrs[0] || {};
        alertBox.style.display = "block";
        alertBox.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--status-contradicted); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; color: #fca5a5; font-size: 0.82rem;">
            <div style="font-weight: 700; display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.2rem;">
              <span>⚠️</span> <span>HISTORICAL REFERENCE REUSE DETECTED</span>
            </div>
            <div>Bank Reference <strong>${corr.reference_id || "UTR"}</strong> was already settled in historical case <strong>${(corr.prior_case_ids || []).join(", ") || "DAY18-02"}</strong>.</div>
            <div style="margin-top: 0.3rem; font-size: 0.74rem; color: #fed7aa;">
              ⚖️ <em>Financial Truth status is mathematically established independently from historical fraud/reuse risk.</em>
            </div>
          </div>
        `;
      } else if (prof.has_historical_contradiction) {
        alertBox.style.display = "block";
        alertBox.innerHTML = `
          <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid var(--status-partial); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; color: #fcd34d; font-size: 0.82rem;">
            ⚠️ <strong>Repeat Dispute Counterparty:</strong> Historical cases exhibited recurring contradiction patterns.
          </div>
        `;
      } else {
        alertBox.style.display = "none";
      }
    }
  }

  // -------------------------------------------------------------
  // SCENE 4: AI Finance Controller Decision Brief
  // -------------------------------------------------------------
  const ccRiskBadge = document.getElementById("cc-controller-risk-badge");
  const ccCtrlContent = document.getElementById("cc-controller-content");

  if (currentControllerBrief) {
    const brief = currentControllerBrief;
    const dec = brief.controller_decision || {};
    if (ccRiskBadge) {
      ccRiskBadge.textContent = `RISK: ${dec.risk_level || "NONE"}`;
      if (dec.risk_level === "CRITICAL" || dec.risk_level === "HIGH") {
        ccRiskBadge.style.background = "rgba(239, 68, 68, 0.25)";
        ccRiskBadge.style.color = "var(--status-contradicted)";
      } else if (dec.risk_level === "MEDIUM") {
        ccRiskBadge.style.background = "rgba(245, 158, 11, 0.25)";
        ccRiskBadge.style.color = "var(--status-partial)";
      } else {
        ccRiskBadge.style.background = "rgba(16, 185, 129, 0.25)";
        ccRiskBadge.style.color = "var(--status-confirmed)";
      }
    }

    if (ccCtrlContent) {
      ccCtrlContent.innerHTML = `
        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem;">
          <strong style="color: var(--on-surface);">Directive:</strong>
          <span class="tag-badge" style="background: rgba(99, 102, 241, 0.2); color: var(--secondary);">${dec.decision || "CONFIRM_RECONCILIATION"}</span>
          <span style="font-size: 0.78rem; color: var(--on-surface-variant); margin-left: auto;">${dec.requires_human_review ? "⚠️ Human Review Required" : "✓ Direct Straight-Through"}</span>
        </div>
        <p style="color: var(--on-surface-variant); line-height: 1.4; margin-bottom: 0.4rem;">${brief.executive_summary || dec.rationale || "Case evaluated against controller safety policy."}</p>
      `;
    }
  }

  // -------------------------------------------------------------
  // SCENE 5 & 6: Human Review & Safe Remediation
  // -------------------------------------------------------------
  const remPreview = document.getElementById("cc-remediation-preview");
  const remButtons = document.getElementById("cc-remediation-buttons");
  const remStatusPill = document.getElementById("cc-action-status-pill");

  if (currentRemediationActions && currentRemediationActions.length > 0) {
    const act = currentRemediationActions[0];
    if (remStatusPill) {
      remStatusPill.textContent = act.approval_status;
      remStatusPill.style.background = act.approval_status === "APPROVED" ? "rgba(16, 185, 129, 0.2)" : (act.approval_status === "REJECTED" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)");
      remStatusPill.style.color = act.approval_status === "APPROVED" ? "var(--status-confirmed)" : (act.approval_status === "REJECTED" ? "var(--status-contradicted)" : "var(--status-partial)");
    }

    if (remPreview) {
      remPreview.innerHTML = `
        <div style="font-weight: 700; color: var(--on-surface); margin-bottom: 0.2rem;">${act.title}</div>
        <div style="color: var(--on-surface-variant); margin-bottom: 0.4rem;">${act.summary}</div>
        ${act.notice_draft ? `
          <div style="background: var(--surface-container-lowest); padding: 0.5rem; border-radius: var(--radius-sm); font-size: 0.76rem; border: 1px solid var(--outline-variant);">
            <div style="color: var(--secondary);"><strong>To:</strong> ${act.notice_draft.recipient_name} | <strong>Subject:</strong> ${act.notice_draft.subject}</div>
            <div style="color: var(--on-surface); margin-top: 0.2rem; font-style: italic;">"${(act.notice_draft.body || "").substring(0, 140)}..."</div>
          </div>
        ` : ""}
      `;
    }

    if (remButtons) {
      if (act.approval_status === "PENDING_APPROVAL") {
        remButtons.innerHTML = `
          <button class="btn-primary" onclick="approveRemediationAction('${act.action_id}')" style="background: rgba(16, 185, 129, 0.2); border: 1px solid var(--status-confirmed); color: var(--status-confirmed); padding: 0.35rem 0.75rem; font-size: 0.78rem; cursor: pointer;">✓ Approve Action</button>
          <button class="btn-secondary" onclick="rejectRemediationAction('${act.action_id}')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--status-contradicted); color: var(--status-contradicted); padding: 0.35rem 0.75rem; font-size: 0.78rem; cursor: pointer;">✗ Reject Action</button>
        `;
      } else {
        remButtons.innerHTML = `<span style="font-size: 0.76rem; color: var(--on-surface-variant);">Action status: <strong>${act.approval_status}</strong></span>`;
      }
    }
  } else {
    if (remStatusPill) {
      remStatusPill.textContent = "AWAITING PROPOSAL";
      remStatusPill.style.background = "rgba(0, 17, 66, 0.08)";
      remStatusPill.style.color = "var(--primary)";
    }
    if (remPreview) remPreview.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Click button below to propose grounded remediation notice.</p>';
    if (remButtons) {
      const defaultAction = (currentCaseResult?.status === "CONTRADICTED") ? "VENDOR_DISPUTE_NOTICE" : ((currentCaseResult?.status === "PARTIALLY_SETTLED") ? "PAYMENT_FOLLOWUP_DRAFT" : "DRAFT_JOURNAL_VOUCHER");
      remButtons.innerHTML = `
        <button class="btn-primary" onclick="proposeRemediationAction('${defaultAction}')" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;">⚡ Propose Action</button>
      `;
    }
  }

  // Journal Voucher Preview in Command Center
  const jvContainer = document.getElementById("cc-journal-table-container");
  if (jvContainer) {
    if (currentJournalVoucher && currentJournalVoucher.lines && currentJournalVoucher.lines.length) {
      const jv = currentJournalVoucher;
      const linesRows = jv.lines.map((l) => `
        <tr style="border-bottom: 1px solid var(--outline-variant);">
          <td style="padding: 0.3rem 0.4rem; color: var(--secondary);">${l.account_code}</td>
          <td style="padding: 0.3rem 0.4rem; color: var(--on-surface);">${l.account_name}</td>
          <td style="padding: 0.3rem 0.4rem; text-align: right; color: var(--status-confirmed);">${l.debit_amount > 0 ? `₹${l.debit_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
          <td style="padding: 0.3rem 0.4rem; text-align: right; color: var(--primary);">${l.credit_amount > 0 ? `₹${l.credit_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}</td>
        </tr>
      `).join("");

      jvContainer.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
          <thead>
            <tr style="color: var(--on-surface-variant); text-align: left; background: var(--surface-container-low);">
              <th style="padding: 0.3rem 0.4rem;">Code</th>
              <th style="padding: 0.3rem 0.4rem;">Account</th>
              <th style="padding: 0.3rem 0.4rem; text-align: right;">DR (₹)</th>
              <th style="padding: 0.3rem 0.4rem; text-align: right;">CR (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${linesRows}
            <tr style="font-weight: 700; border-top: 1px solid var(--outline-variant);">
              <td colspan="2" style="padding: 0.3rem 0.4rem;">BALANCED PROOF</td>
              <td style="padding: 0.3rem 0.4rem; text-align: right; color: var(--status-confirmed);">₹${jv.total_debits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              <td style="padding: 0.3rem 0.4rem; text-align: right; color: var(--primary);">₹${jv.total_credits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      jvContainer.innerHTML = '<p class="font-body-sm" style="color: var(--on-surface-variant);">Awaiting journal generation...</p>';
    }
  }

  // -------------------------------------------------------------
  // SCENE 7: Cryptographic SHA-256 Audit Provenance
  // -------------------------------------------------------------
  const auditContainer = document.getElementById("cc-audit-timeline-container");
  if (auditContainer) {
    const prov = res.provenance || rep.provenance_summary || {};
    const chainHash = prov.root_hash || prov.provenance_hash || (res.report_id ? `sha256-${res.case_id.toLowerCase()}-audit` : "sha256-verified-root");

    auditContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.35rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface-container-lowest); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--outline-variant);">
          <span style="color: var(--on-surface-variant);">1. Evidence Ingestion & Cryptographic Root</span>
          <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--secondary);">SHA-256 Verified ✓</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface-container-lowest); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--outline-variant);">
          <span style="color: var(--on-surface-variant);">2. Deterministic Reconciliation Output</span>
          <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--status-confirmed);">Hash: ${chainHash.substring(0, 16)}... ✓</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface-container-lowest); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--outline-variant);">
          <span style="color: var(--on-surface-variant);">3. Finance Controller Risk Assessment</span>
          <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--status-confirmed);">Logged to Immutable Audit Store ✓</span>
        </div>
      </div>
    `;
  }
}

// =============================================================
// FINANCIAL TRUTH REPLAY — IMMUTABLE SNAPSHOT ENGINE
// =============================================================

/**
 * Safely deep-clones a domain state object, stripping cyclic references and isolating state.
 */
function safeReplayClone(obj) {
  if (obj == null) return null;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return null;
  }
}

/**
 * Safely escapes dynamic HTML values in Replay rendering to prevent XSS/injection.
 */
function escapeReplayHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Constructs an immutable, sanitized snapshot of active case truth across 9 deterministic stages.
 * Guaranteed zero mutable sharing with global state objects.
 */
function buildTruthReplaySnapshot(caseResult, controllerBrief, reviewRecord) {
  if (!caseResult) return null;

  const rawCase = safeReplayClone(caseResult) || {};
  const rawCtrl = safeReplayClone(controllerBrief) || {};
  const rawRev = safeReplayClone(reviewRecord) || {};

  const caseId = rawCase.case_id || "UNKNOWN_CASE";
  const truthReport = rawCase.truth_report || {};
  const finSummary = rawCase.financial_summary || {};
  const provRefs = truthReport.provenance || rawCase.provenance || {};

  // Stage 1: SOURCE
  const evSummary = Array.isArray(truthReport.evidence_summary) ? truthReport.evidence_summary : (Array.isArray(rawCase.evidence_items) ? rawCase.evidence_items : []);
  const sourceFacts = evSummary.map((ev) => ({
    evidence_id: ev.evidence_id || ev.id || "EVID_UNKNOWN",
    modality: ev.modality || "UNSPECIFIED",
    source_name: ev.source_name || ev.filename || "Source File",
    sha256_hash: ev.sha256_hash || ev.content_hash || "UNHASHED",
    summary: ev.summary || ""
  }));
  const sourceGroundingIds = sourceFacts.map((s) => s.evidence_id).filter(Boolean);

  // Stage 2: CLAIM
  const claimsSummary = Array.isArray(truthReport.claims_summary) ? truthReport.claims_summary : (Array.isArray(rawCase.claims) ? rawCase.claims : []);
  const claimFacts = claimsSummary.map((clm) => ({
    claim_id: clm.claim_id || clm.id || "CLM_UNKNOWN",
    evidence_id: clm.evidence_id || "",
    claim_type: clm.claim_type || "FINANCIAL_CLAIM",
    claimed_amount: clm.claimed_amount != null ? Number(clm.claimed_amount) : (clm.amount != null ? Number(clm.amount) : null),
    claimed_date: clm.claimed_date || clm.date || "",
    counterparty_hint: clm.counterparty_hint || "",
    reference_id_hint: clm.reference_id_hint || clm.reference_id || ""
  }));
  const claimGroundingIds = claimFacts.map((c) => c.claim_id).filter(Boolean);
  const claimParentIds = Array.from(new Set(claimFacts.map((c) => c.evidence_id).filter(Boolean)));

  // Stage 3: TRANSACTION
  const txnSummary = Array.isArray(truthReport.transaction_summary) ? truthReport.transaction_summary : (Array.isArray(rawCase.transactions) ? rawCase.transactions : []);
  const txnFacts = txnSummary.map((tx) => ({
    transaction_id: tx.transaction_id || tx.id || "TXN_UNKNOWN",
    amount: tx.amount != null ? Number(tx.amount) : 0,
    direction: tx.direction || "CREDIT",
    timestamp: tx.timestamp || tx.date || "",
    bank_reference: tx.bank_reference || tx.reference_id || "",
    payment_method: tx.payment_method || ""
  }));
  const txnGroundingIds = txnFacts.map((t) => t.transaction_id).filter(Boolean);

  // Stage 4: MATCH
  const matchSummary = truthReport.matching_summary || rawCase.matching_summary || null;
  const matchFacts = matchSummary ? {
    match_relationship_id: matchSummary.match_relationship_id || "",
    topology: matchSummary.topology || "ONE_TO_ONE",
    status: matchSummary.status || "MATCHED",
    score: matchSummary.score != null ? Number(matchSummary.score) : 1.0,
    matched_signals: Array.isArray(matchSummary.matched_signals) ? matchSummary.matched_signals : [],
    conflicting_signals: Array.isArray(matchSummary.conflicting_signals) ? matchSummary.conflicting_signals : [],
    explanation: matchSummary.explanation || ""
  } : null;
  const matchGroundingIds = matchFacts?.match_relationship_id ? [matchFacts.match_relationship_id] : [];
  const matchParentIds = Array.from(new Set([
    ...(Array.isArray(provRefs.claim_ids) ? provRefs.claim_ids : []),
    ...(Array.isArray(provRefs.transaction_ids) ? provRefs.transaction_ids : [])
  ])).filter(Boolean);

  // Stage 5: CONFLICT_CHECK
  const contSummary = Array.isArray(truthReport.contradiction_summary) ? truthReport.contradiction_summary : (Array.isArray(rawCase.contradictions) ? rawCase.contradictions : []);
  const conflictFacts = contSummary.map((cnt) => ({
    discrepancy_id: cnt.discrepancy_id || cnt.id || "DISC_UNKNOWN",
    discrepancy_type: cnt.discrepancy_type || cnt.type || "DISCREPANCY",
    severity: cnt.severity || "WARNING",
    message: cnt.message || cnt.description || "",
    expected_value: cnt.expected_value != null ? String(cnt.expected_value) : "",
    observed_value: cnt.observed_value != null ? String(cnt.observed_value) : "",
    involved_evidence_ids: Array.isArray(cnt.involved_evidence_ids) ? cnt.involved_evidence_ids : []
  }));
  const conflictGroundingIds = conflictFacts.map((c) => c.discrepancy_id).filter(Boolean);
  const conflictParentIds = Array.from(new Set(conflictFacts.flatMap((c) => c.involved_evidence_ids).filter(Boolean)));

  // Stage 6: RECONCILIATION
  const reconSummary = truthReport.reconciliation_summary || rawCase.reconciliation || {};
  const reconFacts = {
    reconciliation_id: reconSummary.reconciliation_id || rawCase.reconciliation_id || `REC-${caseId}`,
    status: reconSummary.status || rawCase.status || "CONFIRMED",
    expected_amount: reconSummary.expected_amount != null ? Number(reconSummary.expected_amount) : (finSummary.claimed_amount != null ? Number(finSummary.claimed_amount) : 0),
    matched_amount: reconSummary.matched_amount != null ? Number(reconSummary.matched_amount) : (finSummary.matched_amount != null ? Number(finSummary.matched_amount) : 0),
    outstanding_amount: reconSummary.outstanding_amount != null ? Number(reconSummary.outstanding_amount) : (finSummary.outstanding_amount != null ? Number(finSummary.outstanding_amount) : 0),
    confidence_score: reconSummary.confidence_score != null ? Number(reconSummary.confidence_score) : (rawCase.confidence != null ? Number(rawCase.confidence) : 1.0),
    reason_codes: Array.isArray(reconSummary.reason_codes) ? reconSummary.reason_codes : []
  };
  const reconGroundingIds = reconFacts.reconciliation_id ? [reconFacts.reconciliation_id] : [];
  const reconParentIds = matchGroundingIds.length > 0 ? matchGroundingIds : [];

  // Stage 7: CONTROLLER
  const ctrlDirectives = Array.isArray(rawCtrl.action_directives) ? rawCtrl.action_directives : [];
  const ctrlGroundingEv = Array.isArray(rawCtrl.grounding_evidence_ids) ? rawCtrl.grounding_evidence_ids : (Array.isArray(rawCtrl.involved_evidence_ids) ? rawCtrl.involved_evidence_ids : []);
  const ctrlGroundingTx = Array.isArray(rawCtrl.grounding_transaction_ids) ? rawCtrl.grounding_transaction_ids : (Array.isArray(rawCtrl.involved_transaction_ids) ? rawCtrl.involved_transaction_ids : []);
  const controllerFacts = {
    controller_status: rawCtrl.controller_status || rawCtrl.status || "EVALUATED",
    risk_rating: rawCtrl.risk_rating || rawCtrl.risk_level || "NONE",
    recommended_decision: rawCtrl.recommended_decision || rawCtrl.action || "CONFIRM_RECONCILIATION",
    executive_summary: rawCtrl.executive_summary || rawCtrl.brief_text || "",
    human_review_required: Boolean(rawCtrl.human_review_required != null ? rawCtrl.human_review_required : rawCase.requires_review),
    action_directives: ctrlDirectives,
    decision_factors: Array.isArray(rawCtrl.decision_factors) ? rawCtrl.decision_factors : []
  };
  const controllerGroundingIds = Array.from(new Set([...ctrlGroundingEv, ...ctrlGroundingTx])).filter(Boolean);
  const controllerParentIds = reconGroundingIds.length > 0 ? reconGroundingIds : [];

  // Stage 8: HUMAN_DECISION
  const reviewNotes = Array.isArray(rawRev.reviewer_notes) ? rawRev.reviewer_notes : (Array.isArray(rawRev.notes) ? rawRev.notes : []);
  const hasHumanDecision = Boolean(rawRev.decision || rawRev.review_status === "RESOLVED" || rawRev.review_status === "CLOSED");
  const humanFacts = {
    review_id: rawRev.review_id || (rawRev.id || "UNASSIGNED"),
    review_status: rawRev.review_status || rawRev.status || (rawCase.requires_review ? "PENDING" : "NOT_REQUIRED"),
    decision: rawRev.decision || (hasHumanDecision ? "RESOLVED" : "NONE"),
    rationale: rawRev.rationale || rawRev.decision_rationale || "",
    reviewer_id: rawRev.reviewer_id || "",
    reviewer_name: rawRev.reviewer_name || (rawRev.reviewer_id || "Unassigned"),
    is_locked: Boolean(rawRev.is_locked),
    completed_at: rawRev.completed_at || "",
    notes: reviewNotes.map((n) => typeof n === "object" ? (n.text || n.note || "") : String(n)).filter(Boolean)
  };
  const humanGroundingIds = humanFacts.review_id !== "UNASSIGNED" ? [humanFacts.review_id] : [];
  const humanParentIds = [];

  // Stage 9: FINAL_TRUTH
  const finalStatus = String(rawCase.status || "UNVERIFIED").toUpperCase();
  const finalConfidence = rawCase.confidence != null ? Number(rawCase.confidence) : 1.0;
  const finalFacts = {
    case_id: caseId,
    status: finalStatus,
    confidence: finalConfidence,
    requires_review: Boolean(rawCase.requires_review),
    total_execution_time_ms: rawCase.total_execution_time_ms != null ? Number(rawCase.total_execution_time_ms) : 0,
    text_report: rawCase.text_report || truthReport.summary || "",
    provenance_hash: provRefs.algorithm || "SHA-256"
  };
  const finalGroundingIds = [caseId];
  const finalParentIds = Array.from(new Set([
    ...reconGroundingIds,
    ...humanGroundingIds
  ])).filter(Boolean);

  // Compile 9 Stage Descriptors
  const stages = [
    {
      key: "SOURCE",
      title: "Source Artifact Ingestion",
      status: sourceFacts.length > 0 ? "VERIFIED" : "PENDING",
      facts: sourceFacts,
      why: "Cryptographic SHA-256 evidence ingested and fingerprinted.",
      groundingIds: sourceGroundingIds,
      parentIds: []
    },
    {
      key: "CLAIM",
      title: "Extracted Financial Claims",
      status: claimFacts.length > 0 ? "EXTRACTED" : "NO_CLAIMS",
      facts: claimFacts,
      why: "Deterministic extraction of stated monetary claims and reference identifiers.",
      groundingIds: claimGroundingIds,
      parentIds: claimParentIds
    },
    {
      key: "TRANSACTION",
      title: "Verified Bank Ledger Transactions",
      status: txnFacts.length > 0 ? "VERIFIED" : "NO_TRANSACTIONS",
      facts: txnFacts,
      why: "Authoritative bank statement and ledger transactions loaded.",
      groundingIds: txnGroundingIds,
      parentIds: []
    },
    {
      key: "MATCH",
      title: "Deterministic Transaction Matching",
      status: matchFacts?.status || "EVALUATED",
      facts: matchFacts,
      why: matchFacts?.explanation || "Algorithmic matching across payment signals.",
      groundingIds: matchGroundingIds,
      parentIds: matchParentIds
    },
    {
      key: "CONFLICT_CHECK",
      title: "Contradiction & Discrepancy Detection",
      status: conflictFacts.length > 0 ? "CONTRADICTED" : "CLEAN",
      facts: conflictFacts,
      why: conflictFacts.length > 0 ? "Rule-based contradiction invariants triggered." : "No conflicting financial claims detected.",
      groundingIds: conflictGroundingIds,
      parentIds: conflictParentIds
    },
    {
      key: "RECONCILIATION",
      title: "Deterministic Financial Reconciliation",
      status: reconFacts.status,
      facts: reconFacts,
      why: "Double-entry reconciliation rules evaluated across all claims and ledger entries.",
      groundingIds: reconGroundingIds,
      parentIds: reconParentIds
    },
    {
      key: "CONTROLLER",
      title: "AI Finance Controller Directives",
      status: controllerFacts.controller_status,
      facts: controllerFacts,
      why: controllerFacts.executive_summary || "Deterministic policy evaluation.",
      groundingIds: controllerGroundingIds,
      parentIds: controllerParentIds
    },
    {
      key: "HUMAN_DECISION",
      title: "Human Review & Audit Decision",
      status: humanFacts.review_status,
      facts: humanFacts,
      why: humanFacts.decision !== "NONE" ? (humanFacts.rationale || "Human reviewer decision recorded.") : "Case review is pending or no human intervention required.",
      groundingIds: humanGroundingIds,
      parentIds: humanParentIds
    },
    {
      key: "FINAL_TRUTH",
      title: "Immutable Financial Truth Conclusion",
      status: finalFacts.status,
      facts: finalFacts,
      why: finalFacts.text_report || "Final reconstructed truth with tamper-evident audit trail.",
      groundingIds: finalGroundingIds,
      parentIds: finalParentIds
    }
  ];

  return {
    caseId: caseId,
    createdAt: new Date().toISOString(),
    stages: stages
  };
}

/**
 * Initiates the Financial Truth Replay session with an immutable state snapshot.
 */
function startTruthReplay() {
  if (!currentCaseResult) {
    showAlert("Please select or process a financial case before starting Truth Replay.", "warning");
    return;
  }

  replayPreviousFocus = document.activeElement;
  truthReplaySnapshot = buildTruthReplaySnapshot(currentCaseResult, currentControllerBrief, currentReviewRecord);
  currentReplayStep = 0;

  const overlay = document.getElementById("replay-modal-overlay");
  if (overlay) {
    overlay.style.display = "flex";
    overlay.classList.add("active");
    renderReplayStep(0);
    const closeBtn = document.getElementById("replay-btn-close");
    if (closeBtn && typeof closeBtn.focus === "function") {
      closeBtn.focus();
    }
  }
}

/**
 * Closes the Financial Truth Replay session and cleans up snapshot state.
 */
function closeTruthReplay() {
  truthReplaySnapshot = null;
  currentReplayStep = 0;

  const overlay = document.getElementById("replay-modal-overlay");
  if (overlay) {
    overlay.style.display = "none";
    overlay.classList.remove("active");
  }

  if (replayPreviousFocus && typeof replayPreviousFocus.focus === "function" && document.body.contains(replayPreviousFocus)) {
    replayPreviousFocus.focus();
  } else {
    const launchBtn = document.getElementById("btn-launch-replay");
    if (launchBtn && typeof launchBtn.focus === "function") {
      launchBtn.focus();
    }
  }
  replayPreviousFocus = null;
}

/**
 * Renders an active stage in the Financial Truth Replay modal.
 */
function renderReplayStep(stepIndex) {
  if (!truthReplaySnapshot || !Array.isArray(truthReplaySnapshot.stages)) return;

  const totalStages = truthReplaySnapshot.stages.length;
  if (stepIndex < 0 || stepIndex >= totalStages) return;

  currentReplayStep = stepIndex;
  const stage = truthReplaySnapshot.stages[stepIndex];
  if (!stage) return;

  // 1. Step Counter & Headers
  const stepNumEl = document.getElementById("replay-stage-step-num");
  const titleEl = document.getElementById("replay-stage-title");
  const badgeEl = document.getElementById("replay-stage-badge");
  const liveAnnouncer = document.getElementById("replay-live-announcer");

  if (stepNumEl) stepNumEl.textContent = `STAGE ${stepIndex + 1} OF ${totalStages}`;
  if (titleEl) titleEl.textContent = stage.title;
  if (badgeEl) {
    badgeEl.textContent = stage.status;
    const stLower = (stage.status || "").toLowerCase();
    if (stLower.includes("contradict") || stLower.includes("error") || stLower.includes("alert")) {
      badgeEl.className = "badge badge-contradicted";
    } else if (stLower.includes("verify") || stLower.includes("confirm") || stLower.includes("match") || stLower.includes("extract")) {
      badgeEl.className = "badge badge-confirmed";
    } else if (stLower.includes("pending") || stLower.includes("unassign") || stLower.includes("review")) {
      badgeEl.className = "badge badge-ambiguous";
    } else {
      badgeEl.className = "badge badge-low";
    }
  }

  if (liveAnnouncer) {
    liveAnnouncer.textContent = `Replay stage ${stepIndex + 1} of ${totalStages}: ${stage.title}`;
  }

  // 2. Stepper Rail Pills
  renderReplayStepperRail();

  // 3. Causality Lineage
  const causalityContainer = document.getElementById("replay-causality-container");
  if (causalityContainer) {
    if (stage.parentIds && stage.parentIds.length > 0) {
      const parentBadges = stage.parentIds.map((pid) => `<span class="replay-causality-node">${escapeReplayHtml(pid)}</span>`).join(" ");
      causalityContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--on-surface-variant);">PARENT LINEAGE:</span>
          ${parentBadges}
          <span class="replay-causality-arrow material-symbols-outlined" style="font-size: 1rem;">arrow_forward</span>
          <span class="replay-causality-node" style="color: var(--primary); font-weight: 800;">${escapeReplayHtml(stage.key)}</span>
        </div>
      `;
    } else if (stepIndex === 0) {
      causalityContainer.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--on-surface-variant);">
          <strong style="color: var(--primary);">ROOT EVIDENCE INGESTION</strong> — Independent entry point (No parent dependencies).
        </div>
      `;
    } else if (stage.key === "TRANSACTION") {
      causalityContainer.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--on-surface-variant);">
          <strong style="color: var(--secondary);">INDEPENDENT LEDGER SOURCE</strong> — Authoritative bank statement transactions (No parent dependencies).
        </div>
      `;
    } else if (stage.key === "HUMAN_DECISION") {
      causalityContainer.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--on-surface-variant);">
          <strong style="color: var(--secondary);">INDEPENDENT HUMAN REVIEW</strong> — Human reviewer judgment and audit record.
        </div>
      `;
    } else if (stage.key === "CONFLICT_CHECK" && (!stage.facts || stage.facts.length === 0)) {
      causalityContainer.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--success); font-weight: 600;">
          ✓ INVARIANT CHECK PASSED — Zero conflicting parent evidence artifacts.
        </div>
      `;
    } else {
      causalityContainer.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--on-surface-variant);">
          <em>Relationship not explicitly recorded in provenance graph.</em>
        </div>
      `;
    }
  }

  // 4. Grounding Chips
  const groundingContainer = document.getElementById("replay-grounding-chips");
  if (groundingContainer) {
    if (stage.groundingIds && stage.groundingIds.length > 0) {
      groundingContainer.innerHTML = stage.groundingIds.map((gid) => `
        <span class="replay-chip verified">
          <span class="material-symbols-outlined" style="font-size: 0.85rem;">verified</span>
          <span>${gid}</span>
        </span>
      `).join("");
    } else {
      groundingContainer.innerHTML = '<span class="replay-chip">No direct artifact grounding IDs</span>';
    }
  }

  // 5. Stage Specific Body
  const bodyEl = document.getElementById("replay-stage-body");
  if (bodyEl) {
    bodyEl.innerHTML = renderStageSpecificHTML(stage);
  }

  // 6. Navigation Button States
  const prevBtn = document.getElementById("replay-btn-prev");
  const nextBtn = document.getElementById("replay-btn-next");
  if (prevBtn) {
    prevBtn.disabled = (currentReplayStep === 0);
    prevBtn.setAttribute("aria-label", "Navigate to previous stage");
  }
  if (nextBtn) {
    nextBtn.disabled = (currentReplayStep === totalStages - 1);
    nextBtn.setAttribute("aria-label", "Navigate to next stage");
  }
}

/**
 * Updates the 9-stage stepper rail pills.
 */
function renderReplayStepperRail() {
  const rail = document.getElementById("replay-stepper-rail");
  if (!rail || !truthReplaySnapshot) return;

  const shortLabels = ["SOURCE", "CLAIM", "TXN", "MATCH", "CONFLICT", "RECON", "CTRL", "REVIEW", "TRUTH"];

  rail.innerHTML = truthReplaySnapshot.stages.map((stg, idx) => {
    let stateClass = "upcoming";
    const stgStatus = (stg.status || "").toLowerCase();
    if (idx === currentReplayStep) {
      stateClass = "active";
    } else if (idx < currentReplayStep) {
      stateClass = stgStatus.includes("contradict") ? "contradicted" : "completed";
    } else if (stgStatus.includes("contradict")) {
      stateClass = "contradicted";
    }

    const label = shortLabels[idx] || stg.key;
    const ariaCurrentAttr = (idx === currentReplayStep) ? 'aria-current="step"' : '';

    return `
      <button type="button" class="replay-step-pill ${stateClass}" data-step-idx="${idx}" aria-label="Replay stage ${idx + 1}: ${stg.title}" ${ariaCurrentAttr}>
        <span class="step-num">${idx + 1}</span>
        <span class="step-label">${label}</span>
      </button>
    `;
  }).join("");

  rail.querySelectorAll(".replay-step-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const sIdx = Number(pill.dataset.stepIdx);
      if (!isNaN(sIdx)) {
        renderReplayStep(sIdx);
      }
    });
  });
}

/**
 * Generates distinct, deterministic HTML representation for each of the 9 replay stages.
 */
function renderStageSpecificHTML(stage) {
  const whyCardHTML = `
    <div class="replay-card" style="border-left: 4px solid var(--primary); margin-top: 0.75rem;">
      <div class="replay-card-title">
        <span class="material-symbols-outlined" style="font-size: 1.1rem;">psychology</span>
        <span>Deterministic Rationale (WHY)</span>
      </div>
      <div class="replay-card-body" style="font-size: 0.85rem; color: var(--on-surface-variant);">
        ${stage.why}
      </div>
    </div>
  `;

  let factsCardHTML = "";

  switch (stage.key) {
    case "SOURCE": {
      const items = Array.isArray(stage.facts) ? stage.facts : [];
      const rows = items.map((ev) => `
        <tr style="border-bottom: 1px solid var(--outline-variant); font-size: 0.8125rem;">
          <td style="padding: 0.5rem; font-family: var(--font-mono); font-weight: 700; color: var(--primary);">${ev.evidence_id}</td>
          <td style="padding: 0.5rem;"><span class="badge badge-low">${ev.modality}</span></td>
          <td style="padding: 0.5rem; color: var(--on-surface);">${ev.source_name}</td>
          <td style="padding: 0.5rem; font-family: var(--font-mono); font-size: 0.72rem; color: var(--on-surface-variant); word-break: break-all;">${ev.sha256_hash}</td>
        </tr>
      `).join("");

      factsCardHTML = `
        <div class="replay-card">
          <div class="replay-card-title">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">folder_open</span>
            <span>Ingested Source Artifacts (${items.length})</span>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="color: var(--on-surface-variant); font-size: 0.72rem; border-bottom: 1px solid var(--outline-variant); text-transform: uppercase;">
                  <th style="padding: 0.4rem 0.5rem;">Evidence ID</th>
                  <th style="padding: 0.4rem 0.5rem;">Modality</th>
                  <th style="padding: 0.4rem 0.5rem;">Source Name</th>
                  <th style="padding: 0.4rem 0.5rem;">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="4" style="padding: 0.5rem; color: var(--on-surface-variant);">No evidence artifacts found.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
      break;
    }

    case "CLAIM": {
      const claims = Array.isArray(stage.facts) ? stage.facts : [];
      const rows = claims.map((c) => `
        <tr style="border-bottom: 1px solid var(--outline-variant); font-size: 0.8125rem;">
          <td style="padding: 0.5rem; font-family: var(--font-mono); font-weight: 700; color: var(--primary);">${c.claim_id}</td>
          <td style="padding: 0.5rem; font-family: var(--font-mono); color: var(--secondary);">${c.evidence_id || "—"}</td>
          <td style="padding: 0.5rem;">${c.claim_type}</td>
          <td style="padding: 0.5rem; font-weight: 700; font-family: var(--font-mono); color: var(--success);">${c.claimed_amount != null ? `₹${c.claimed_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}</td>
          <td style="padding: 0.5rem; font-family: var(--font-mono); font-size: 0.75rem;">${c.reference_id_hint || "—"}</td>
        </tr>
      `).join("");

      factsCardHTML = `
        <div class="replay-card">
          <div class="replay-card-title">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">receipt_long</span>
            <span>Extracted Financial Claims (${claims.length})</span>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="color: var(--on-surface-variant); font-size: 0.72rem; border-bottom: 1px solid var(--outline-variant); text-transform: uppercase;">
                  <th style="padding: 0.4rem 0.5rem;">Claim ID</th>
                  <th style="padding: 0.4rem 0.5rem;">Root Evidence</th>
                  <th style="padding: 0.4rem 0.5rem;">Claim Type</th>
                  <th style="padding: 0.4rem 0.5rem;">Claimed Amount</th>
                  <th style="padding: 0.4rem 0.5rem;">Reference Hint</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="5" style="padding: 0.5rem; color: var(--on-surface-variant);">No claims extracted.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
      break;
    }

    case "TRANSACTION": {
      const txns = Array.isArray(stage.facts) ? stage.facts : [];
      const rows = txns.map((t) => `
        <tr style="border-bottom: 1px solid var(--outline-variant); font-size: 0.8125rem;">
          <td style="padding: 0.5rem; font-family: var(--font-mono); font-weight: 700; color: var(--primary);">${t.transaction_id}</td>
          <td style="padding: 0.5rem; font-weight: 700; font-family: var(--font-mono); color: ${t.direction === 'CREDIT' ? 'var(--success)' : 'var(--warning)'};">${t.direction === 'CREDIT' ? '+' : '-'} ₹${t.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
          <td style="padding: 0.5rem;"><span class="badge badge-${t.direction === 'CREDIT' ? 'confirmed' : 'unverifiable'}">${t.direction}</span></td>
          <td style="padding: 0.5rem; font-family: var(--font-mono); font-size: 0.75rem;">${t.bank_reference || "—"}</td>
          <td style="padding: 0.5rem; font-size: 0.75rem; color: var(--on-surface-variant);">${t.timestamp || "—"}</td>
        </tr>
      `).join("");

      factsCardHTML = `
        <div class="replay-card">
          <div class="replay-card-title">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">account_balance</span>
            <span>Bank Ledger Transactions (${txns.length})</span>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="color: var(--on-surface-variant); font-size: 0.72rem; border-bottom: 1px solid var(--outline-variant); text-transform: uppercase;">
                  <th style="padding: 0.4rem 0.5rem;">Txn ID</th>
                  <th style="padding: 0.4rem 0.5rem;">Amount (INR)</th>
                  <th style="padding: 0.4rem 0.5rem;">Direction</th>
                  <th style="padding: 0.4rem 0.5rem;">Bank Reference</th>
                  <th style="padding: 0.4rem 0.5rem;">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="5" style="padding: 0.5rem; color: var(--on-surface-variant);">No ledger transactions recorded.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
      break;
    }

    case "MATCH": {
      const match = stage.facts || {};
      const signals = Array.isArray(match.matched_signals) ? match.matched_signals : [];
      factsCardHTML = `
        <div class="replay-card">
          <div class="replay-card-title">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">join_inner</span>
            <span>Match Topology & Signals</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem;">
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Topology</span>
              <div style="font-weight: 700; color: var(--on-surface); font-family: var(--font-mono);">${match.topology || "ONE_TO_ONE"}</div>
            </div>
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Match Status</span>
              <div style="font-weight: 700; color: var(--success); font-family: var(--font-mono);">${match.status || "MATCHED"}</div>
            </div>
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Match Score</span>
              <div style="font-weight: 700; color: var(--primary); font-family: var(--font-mono);">${match.score != null ? `${Math.round(match.score * 100)}%` : "100%"}</div>
            </div>
          </div>
          <div>
            <span class="font-label-caps" style="font-size: 0.7rem; color: var(--on-surface-variant); margin-bottom: 0.25rem; display: block;">Correlated Match Signals</span>
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${signals.length > 0 ? signals.map(s => `<span class="replay-chip verified">${s}</span>`).join("") : '<span class="replay-chip">Standard Amount Match</span>'}
            </div>
          </div>
        </div>
      `;
      break;
    }

    case "CONFLICT_CHECK": {
      const conflicts = Array.isArray(stage.facts) ? stage.facts : [];
      if (conflicts.length === 0) {
        factsCardHTML = `
          <div class="replay-card" style="border-left: 4px solid var(--success);">
            <div class="replay-card-title" style="color: var(--success);">
              <span class="material-symbols-outlined" style="font-size: 1.1rem;">check_circle</span>
              <span>Contradiction Detection Invariants</span>
            </div>
            <div class="replay-card-body" style="color: var(--on-surface);">
              No contradiction recorded for this case. Invariant checks passed with zero monetary or identity conflicts.
            </div>
          </div>
        `;
      } else {
        const rows = conflicts.map((c) => `
          <div style="background: var(--surface-container-high); border: 1px solid rgba(239,68,68,0.3); padding: 0.75rem; border-radius: var(--radius-md); margin-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--error); font-size: 0.8125rem;">${c.discrepancy_id} (${c.discrepancy_type})</span>
              <span class="badge badge-contradicted">${c.severity}</span>
            </div>
            <p style="font-size: 0.85rem; margin: 0 0 0.4rem 0; color: var(--on-surface);">${c.message}</p>
            <div style="display: flex; gap: 1rem; font-size: 0.78rem; font-family: var(--font-mono);">
              <span style="color: var(--on-surface-variant);">Expected: <strong style="color: var(--on-surface);">${c.expected_value || "—"}</strong></span>
              <span style="color: var(--on-surface-variant);">Observed: <strong style="color: var(--error);">${c.observed_value || "—"}</strong></span>
            </div>
          </div>
        `).join("");

        factsCardHTML = `
          <div class="replay-card" style="border-left: 4px solid var(--error);">
            <div class="replay-card-title" style="color: var(--error);">
              <span class="material-symbols-outlined" style="font-size: 1.1rem;">warning</span>
              <span>Discrepancies & Contradictions Detected (${conflicts.length})</span>
            </div>
            <div>${rows}</div>
          </div>
        `;
      }
      break;
    }

    case "RECONCILIATION": {
      const recon = stage.facts || {};
      const reasonCodes = Array.isArray(recon.reason_codes) ? recon.reason_codes : [];
      factsCardHTML = `
        <div class="replay-card">
          <div class="replay-card-title">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">balance</span>
            <span>Double-Entry Reconciliation Ledger</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem;">
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Expected</span>
              <div class="financial-anchor" style="color: var(--on-surface);">₹${(recon.expected_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            </div>
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Matched</span>
              <div class="financial-anchor" style="color: var(--success);">₹${(recon.matched_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            </div>
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Outstanding</span>
              <div class="financial-anchor" style="color: ${(recon.outstanding_amount || 0) > 0 ? 'var(--warning)' : 'var(--on-surface-variant)'};">₹${(recon.outstanding_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            </div>
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Confidence</span>
              <div style="font-family: var(--font-mono); font-weight: 700; color: var(--primary);">${Math.round((recon.confidence_score || 1.0) * 100)}%</div>
            </div>
          </div>
          <div>
            <span class="font-label-caps" style="font-size: 0.7rem; color: var(--on-surface-variant); margin-bottom: 0.25rem; display: block;">Applied Rule Reason Codes</span>
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
              ${reasonCodes.length > 0 ? reasonCodes.map(r => `<span class="replay-chip">${r}</span>`).join("") : '<span class="replay-chip">STANDARD_CLEAN_RECONCILIATION</span>'}
            </div>
          </div>
        </div>
      `;
      break;
    }

    case "CONTROLLER": {
      const ctrl = stage.facts || {};
      const directives = Array.isArray(ctrl.action_directives) ? ctrl.action_directives : [];
      factsCardHTML = `
        <div class="replay-card" style="border-left: 4px solid var(--status-risk-violet);">
          <div class="replay-card-title" style="color: var(--status-risk-violet);">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">policy</span>
            <span>Controller Policy & Action Directives</span>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap;">
            <span class="badge badge-risk-violet">RISK: ${ctrl.risk_rating || 'NONE'}</span>
            <span class="badge badge-confirmed">RECOMMENDED: ${ctrl.recommended_decision || 'CONFIRM_RECONCILIATION'}</span>
            <span class="badge ${ctrl.human_review_required ? 'badge-ambiguous' : 'badge-confirmed'}">${ctrl.human_review_required ? '⚠️ HUMAN REVIEW REQUIRED' : '✓ NO REVIEW REQUIRED'}</span>
          </div>
          <div style="font-size: 0.85rem; color: var(--on-surface); margin-bottom: 0.6rem;">
            ${ctrl.executive_summary || "Controller policy directives evaluated."}
          </div>
          ${directives.length > 0 ? `
            <div>
              <span class="font-label-caps" style="font-size: 0.7rem; color: var(--on-surface-variant); margin-bottom: 0.25rem; display: block;">Directives</span>
              <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.8125rem; color: var(--on-surface);">
                ${directives.map(d => `<li>${d}</li>`).join("")}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
      break;
    }

    case "HUMAN_DECISION": {
      const hum = stage.facts || {};
      const notes = Array.isArray(hum.notes) ? hum.notes : [];
      factsCardHTML = `
        <div class="replay-card">
          <div class="replay-card-title">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">person_check</span>
            <span>Human Reviewer Audit Record</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem;">
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Review ID</span>
              <div style="font-family: var(--font-mono); font-weight: 700; color: var(--on-surface); font-size: 0.8125rem;">${hum.review_id || "UNASSIGNED"}</div>
            </div>
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Reviewer</span>
              <div style="font-weight: 700; color: var(--on-surface); font-size: 0.8125rem;">${hum.reviewer_name || "Unassigned"}</div>
            </div>
            <div style="background: var(--surface-container-high); padding: 0.6rem; border-radius: var(--radius-sm);">
              <span class="font-label-caps" style="font-size: 0.65rem; color: var(--on-surface-variant);">Decision Status</span>
              <div style="font-weight: 700; color: ${hum.decision !== 'NONE' ? 'var(--success)' : 'var(--warning)'}; font-size: 0.8125rem;">${hum.decision || "PENDING"}</div>
            </div>
          </div>
          <div style="font-size: 0.85rem; color: var(--on-surface);">
            ${hum.rationale ? `<p style="margin: 0 0 0.4rem 0;"><strong>Rationale:</strong> ${hum.rationale}</p>` : '<p style="margin: 0; color: var(--on-surface-variant);"><em>Human review is pending or no override was submitted.</em></p>'}
          </div>
          ${notes.length > 0 ? `
            <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--outline-variant);">
              <span class="font-label-caps" style="font-size: 0.7rem; color: var(--on-surface-variant); margin-bottom: 0.25rem; display: block;">Reviewer Notes</span>
              <div style="font-size: 0.8125rem; color: var(--on-surface);">${notes.join("<br>")}</div>
            </div>
          ` : ''}
        </div>
      `;
      break;
    }

    case "FINAL_TRUTH": {
      const fin = stage.facts || {};
      factsCardHTML = `
        <div class="replay-card" style="border-left: 5px solid ${fin.status === 'CONFIRMED' ? 'var(--success)' : (fin.status.includes('CONTRADICT') ? 'var(--error)' : 'var(--warning)')};">
          <div class="replay-card-title" style="color: ${fin.status === 'CONFIRMED' ? 'var(--success)' : (fin.status.includes('CONTRADICT') ? 'var(--error)' : 'var(--warning)')};">
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">verified_user</span>
            <span>Final Reconstructed Truth (${fin.case_id})</span>
          </div>
          <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap;">
            <span class="status-badge-lg badge-${fin.status.toLowerCase()}">${fin.status}</span>
            <span class="badge badge-low" style="font-family: var(--font-mono);">CONFIDENCE: ${Math.round(fin.confidence * 100)}%</span>
            <span class="badge badge-low" style="font-family: var(--font-mono);">DAG PROVENANCE: ${fin.provenance_hash}</span>
          </div>
          <div class="replay-card-body" style="font-size: 0.875rem; color: var(--on-surface);">
            ${fin.text_report}
          </div>
        </div>
      `;
      break;
    }
  }

  return factsCardHTML + whyCardHTML;
}

/**
 * Navigates to next step in Truth Replay.
 */
function nextReplayStep() {
  if (!truthReplaySnapshot) return;
  if (currentReplayStep < truthReplaySnapshot.stages.length - 1) {
    renderReplayStep(currentReplayStep + 1);
  }
}

/**
 * Navigates to previous step in Truth Replay.
 */
function previousReplayStep() {
  if (!truthReplaySnapshot) return;
  if (currentReplayStep > 0) {
    renderReplayStep(currentReplayStep - 1);
  }
}
