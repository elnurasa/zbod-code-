/**
 * ZBOD Tool - Zero Based Organizational Design
 * Landing page simplified: only Overview card retained
 */

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
const state = {
  currentPage: 'landing',
  selectedDivisionId: null,
  selectedWorkshopId: null,
  selectedHistoryWorkshopId: null,
  editingDivision: false,
  editingValues: {},
  phase2Scores: {},
  phase3Values: {},
  p3ExpandedChildren: new Set(),
  asIsNewRows: [],
  asIsEditing: {},
  landingEditing: null,
  landingDrafts: {},
  aaaEditCardIdx: null,
  aaaCards: {},
  metricsDraft: {},
  toastId: 0,
  _divEditForm: null,
  asIsSaved: false,
};

let orgZoomScale = 1.0;
let orgIsPanning = false;
let orgPanStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };

// Global chart registry to prevent Chart.js canvas reuse errors
const _chartRegistry = {};
function destroyChart(canvasId) {
  if (_chartRegistry[canvasId]) {
    _chartRegistry[canvasId].destroy();
    delete _chartRegistry[canvasId];
  }
}
function registerChart(canvasId, chart) {
  destroyChart(canvasId);
  _chartRegistry[canvasId] = chart;
}
function destroyAllDashboardCharts() {
  ['decisionPieChart','hcPieChart','budgetPieChart','asIsHcPieChart','asIsBudgetPieChart',
   'hist_decisionPieChart','hist_hcPieChart','hist_budgetPieChart','hist_asIsHcPieChart','hist_asIsBudgetPieChart'].forEach(destroyChart);
}

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const STRUCTURE_NAMES = [
  'Azerconnect Group - Business Assurance, Risk Management and HSE Division',
  'Azerconnect Group - Business Development Division',
  'Azerconnect Group - CEO Office',
  'Azerconnect Group - Customer Operations Division',
  'Azerconnect Group - Finance',
  'Azerconnect Group - Governmental Relations and Legal Division',
  'Azerconnect Group - Human Resources',
  'Azerconnect Group - Information Security Division',
  'Azerconnect Group - Information Technologies and Core Network Division',
  'Azerconnect Group - Internal Audit.',
  'Azerconnect Group - Marketing (AZRC)',
  'Azerconnect Group - Network Technologies.',
  'Azerconnect Group - Procurement and Project Delivery Division',
  'Azerconnect Group - Sales (AZRC)',
  'Azedunet - Finance department',
  'Azedunet - HR & Administrative Services Department',
  'Azedunet - Contracts departament',
  'Azedunet - Network Support department',
  'Azedunet - Services Desk department',
  'Azedunet - System Integration department',
  'Azedunet - Technical Support department',
  'Azedunet - Technological Services & System Development department',
  'Azerfon - Sales',
  'Azerfon - Marketing',
  'Azerfon - General Management',
  'Bakcell - Sales',
  'Bakcell - Marketing',
  'Bakcell - General Marketing',
  'GoldenPay - Cash Business Division',
  'GoldenPay - Commercial Division',
  'GoldenPay - Finance Division',
  'GoldenPay - IT Division',
  'GoldenPay - Internal Control and Compliance Division',
  'GoldenPay - CEO Office',
  'GoldenPay - Operations Division',
  'Ultranet Telco Services',
  'Uninet',
  'MegaLink',
  'NYU MEDI?A.AZ',
  'Onlayn Od?m?',
  'Ravy Group',
  'Ravy Hospitality',
  'Ravy Property',
  'Texnolyuks M',
  'BBTV',
  'Azqtel',
  'Azerconnect DataSphere',
  'BTH',
  'Other'
];

const STRUCTURE_TYPES = ['Division', 'Department', 'Unit', 'Other'];

const LS = {
  divisions: 'zbod_divisions',
  workshops: 'zbod_workshops',
  functions: 'zbod_functions',
  asIs: 'zbod_as_is',
  landing: 'zbod_landing',
  metrics: 'zbod_metrics',
  keyFindings: 'zbod_key_findings',
  aaaCards: 'zbod_aaa_cards',
  aaaTitles: 'zbod_aaa_titles',
};

// ═══════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════
function lsGet(key, fallback) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.error('ls write failed', e); } }
function genId() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2); }

function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNumber(num) {
  if (num === null || num === undefined || num === '') return '';
  const n = typeof num === 'string' ? num.replace(/\s/g, '') : num;
  const val = parseFloat(n);
  if (isNaN(val)) return num;
  return val.toLocaleString('en-US').replace(/,/g, ' ');
}

function computeMedian(values) {
  const valid = values.filter(v => v !== null && v !== undefined && v !== '' && !isNaN(v)).map(v => Number(v)).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 1) return valid[mid];
  return (valid[mid - 1] + valid[mid]) / 2;
}

function unformatNumber(str) {
  if (!str) return '';
  return String(str).replace(/\s/g, '');
}

function getStructureTypeLabel(type) {
  if (!type || type === 'Division') return 'Division';
  if (type === 'Department') return 'Department';
  if (type === 'Unit') return 'Unit';
  return 'Custom';
}

function getWorkspaceTitle(type) {
  const label = getStructureTypeLabel(type);
  return label + ' Workspace';
}

function getDataBoxTitle(type) {
  const label = getStructureTypeLabel(type);
  return label + ' Data';
}

function getManageText(type) {
  const label = getStructureTypeLabel(type);
  return `Manage ${label} data, current functions, and workshops`;
}

document.addEventListener('wheel', function(e) {
  if (document.activeElement && document.activeElement.type === 'number') {
    e.preventDefault();
  }
}, { passive: false });

// ═══════════════════════════════════════════
// LOCALSTORAGE DATA LAYER
// ═══════════════════════════════════════════
function getDivs() { return lsGet(LS.divisions, []); }
function addDiv(data) {
  const divs = getDivs(); const now = new Date().toISOString();
  const d = { id: genId(), ...data, created_at: now, updated_at: now };
  divs.push(d); lsSet(LS.divisions, divs);
  if (window.zbodSupabase) window.zbodSupabase.sbSaveDivision(d);
  return d;
}
function updDiv(id, updates) {
  const divs = getDivs().map(d => d.id === id ? {...d, ...updates, updated_at: new Date().toISOString()} : d);
  lsSet(LS.divisions, divs);
  const updated = divs.find(d => d.id === id);
  if (updated && window.zbodSupabase) window.zbodSupabase.sbSaveDivision(updated);
}
function delDiv(id) {
  lsSet(LS.divisions, getDivs().filter(d => d.id !== id));
  if (window.zbodSupabase) window.zbodSupabase.sbDeleteDivision(id);
}

function getWs() { return lsGet(LS.workshops, []); }
function addWs(divisionId) {
  const ws = getWs(); const now = new Date().toISOString();
  const w = { id: genId(), division_id: divisionId, status: 'draft', phase: 1, completed_at: null, submitted_for_hr_review_at: null, created_at: now, updated_at: now };
  ws.push(w); lsSet(LS.workshops, ws);
  if (window.zbodSupabase) window.zbodSupabase.sbSaveWorkshop(w);
  return w;
}
function updWs(id, updates) {
  const workshops = getWs().map(w => w.id === id ? {...w, ...updates, updated_at: new Date().toISOString()} : w);
  lsSet(LS.workshops, workshops);
  const updated = workshops.find(w => w.id === id);
  if (updated && window.zbodSupabase) window.zbodSupabase.sbSaveWorkshop(updated);
}

function getFns() { return lsGet(LS.functions, []); }
function addFn(workshopId, num) {
  const fns = getFns(); const now = new Date().toISOString();
  const fn = { id: genId(), workshop_id: workshopId, function_number: num, proposed_function_name: '', career_level: '', function_structure_type: '', parent_id: '', strategic_justification: '', can_be_eliminated: '', can_be_automated: '', can_be_outsourced: '', justification_alert: null, question1_score: null, question2_score: null, total_score: null, zbod_decision: null, target_headcount: null, target_budget: null, total_hc: null, hc_allocation_percent: null, proposed_hc: null, total_budget: null, cost_allocation_percent: null, proposed_budget: null, manager_count: null, professional_count: null, span_of_control: null, span_alert: null, created_at: now, updated_at: now };
  fns.push(fn); lsSet(LS.functions, fns);
  if (window.zbodSupabase) window.zbodSupabase.sbSaveFunction(fn);
  return fn;
}
function updFn(id, updates) {
  const fns = getFns().map(f => f.id === id ? {...f, ...updates, updated_at: new Date().toISOString()} : f);
  lsSet(LS.functions, fns);
  const updated = fns.find(f => f.id === id);
  if (updated && window.zbodSupabase) window.zbodSupabase.sbSaveFunction(updated);
}
function delFn(id) {
  lsSet(LS.functions, getFns().filter(f => f.id !== id));
  if (window.zbodSupabase) window.zbodSupabase.sbDeleteFunction(id);
}

function getAsIs() { return lsGet(LS.asIs, []); }
function addAsIsFn(divisionId, name) {
  const ais = getAsIs(); const now = new Date().toISOString();
  const fn = { id: genId(), division_id: divisionId, function_name: name, manager_count: 0, current_employee_count: 0, current_function_hc: 0, current_budget: 0, managers_cost: 0, professionals_cost: 0, target_headcount: null, target_budget: null, created_at: now, updated_at: now };
  ais.push(fn); lsSet(LS.asIs, ais);
  if (window.zbodSupabase) window.zbodSupabase.sbSaveAsIsFunction(fn);
  return fn;
}
function updAsIsFn(id, updates) {
  const ais = getAsIs().map(f => f.id === id ? {...f, ...updates, updated_at: new Date().toISOString()} : f);
  lsSet(LS.asIs, ais);
  const updated = ais.find(f => f.id === id);
  if (updated && window.zbodSupabase) window.zbodSupabase.sbSaveAsIsFunction(updated);
}
function delAsIsFn(id) {
  lsSet(LS.asIs, getAsIs().filter(f => f.id !== id));
  if (window.zbodSupabase) window.zbodSupabase.sbDeleteAsIsFunction(id);
}

function getMetrics() { return lsGet(LS.metrics, {}); }
function setMetrics(metrics) { lsSet(LS.metrics, metrics); }
function getAAACards() { return lsGet(LS.aaaCards, {}); }
function setAAACards(cards) {
  lsSet(LS.aaaCards, cards);
  if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
    Object.keys(cards).forEach(divId => {
      window.zbodSupabase.sbSaveLandingBox({
        box_id: 'aaa_cards_' + divId,
        title: 'AAA Cards',
        content: JSON.stringify(cards[divId]),
        position_order: 9000,
      });
    });
  }
}

// ═══════════════════════════════════════════
// SUPABASE INTEGRATION
// ═══════════════════════════════════════════
let sb = window.zbodSupabase;

async function loadFromSupabase() {
  sb = window.zbodSupabase;
  if (!sb || !sb.supabaseAvailable) {
    console.log('Supabase not available, using localStorage data');
    return;
  }
  try {
    console.log('Loading data from Supabase...');
    const data = await sb.sbLoadAll();
    if (!data) return;

    if (data.divisions && data.divisions.length > 0) {
      const localDivs = getDivs();
      const merged = [...localDivs];
      data.divisions.forEach(sd => {
        const idx = merged.findIndex(ld => ld.id === sd.id);
        if (idx >= 0) {
          const localDate = new Date(merged[idx].updated_at || 0);
          const sbDate = new Date(sd.updated_at || 0);
          if (sbDate >= localDate) merged[idx] = sd;
        } else {
          merged.push(sd);
        }
      });
      lsSet(LS.divisions, merged);
    }

    if (data.workshops && data.workshops.length > 0) {
      const localWs = getWs();
      const merged = [...localWs];
      data.workshops.forEach(sw => {
        const idx = merged.findIndex(lw => lw.id === sw.id);
        if (idx >= 0) {
          const localDate = new Date(merged[idx].updated_at || 0);
          const sbDate = new Date(sw.updated_at || 0);
          if (sbDate >= localDate) merged[idx] = sw;
        } else {
          merged.push(sw);
        }
      });
      lsSet(LS.workshops, merged);
    }

    if (data.functions && data.functions.length > 0) {
      const localFns = getFns();
      const merged = [...localFns];
      data.functions.forEach(sf => {
        const idx = merged.findIndex(lf => lf.id === sf.id);
        if (idx >= 0) {
          const localDate = new Date(merged[idx].updated_at || 0);
          const sbDate = new Date(sf.updated_at || 0);
          if (sbDate >= localDate) merged[idx] = sf;
        } else {
          merged.push(sf);
        }
      });
      lsSet(LS.functions, merged);
    }

    if (data.asIsFns && data.asIsFns.length > 0) {
      const localAsIs = getAsIs();
      const merged = [...localAsIs];
      data.asIsFns.forEach(saf => {
        const idx = merged.findIndex(lf => lf.id === saf.id);
        if (idx >= 0) {
          const localDate = new Date(merged[idx].updated_at || 0);
          const sbDate = new Date(saf.updated_at || 0);
          if (sbDate >= localDate) merged[idx] = saf;
        } else {
          merged.push(saf);
        }
      });
      lsSet(LS.asIs, merged);
    }

    // Restore landing page content blocks from Supabase to localStorage
    if (data.landingBoxes && data.landingBoxes.length > 0) {
      const glItems = [];
      const mqItems = [];
      const sqItems = [];

      data.landingBoxes.forEach(box => {
        try {
          const { box_id, title, content } = box;

          // AAA cards per division (box_id = 'aaa_cards_<divisionId>')
          if (box_id && box_id.startsWith('aaa_cards_')) {
            const divId = box_id.slice('aaa_cards_'.length);
            try {
              const parsed = JSON.parse(content || '[]');
              const allCards = lsGet(LS.aaaCards, {});
              allCards[divId] = parsed;
              lsSet(LS.aaaCards, allCards);
            } catch(e) {}
            return;
          }

          switch (box_id) {
            case 'overview': {
              const curr = lsGet(LS.landing, {});
              lsSet(LS.landing, { ...curr, overviewTitle: title || curr.overviewTitle, overviewText: content || curr.overviewText });
              break;
            }
            case 'guideline_title':
              lsSet('zbod_guideline_title', title);
              break;
            case 'gl1': case 'gl2': case 'gl3': case 'gl4': case 'gl5': case 'gl6': case 'gl7':
              glItems.push({ id: box_id, title, text: content, order: box.position_order });
              break;
            case 'problems':
              try { lsSet('zbod_problems', JSON.parse(content || '[]')); } catch(e) {}
              if (title) lsSet('zbod_problems_title', title);
              break;
            case 'questions_title':
              if (title) lsSet('zbod_questions_title', title);
              break;
            case 'mq1': case 'mq2': case 'mq3': case 'mq4': case 'mq5':
              mqItems.push({ id: box_id, label: title, text: content, order: box.position_order });
              break;
            case 'quote':
              if (content !== undefined) lsSet('zbod_quote', content);
              break;
            case 'strategic_title':
              if (title) lsSet('zbod_strategic_title', title);
              break;
            case 'sq1': case 'sq2': case 'sq3': case 'sq4':
              sqItems.push({ id: box_id, label: title, text: content, order: box.position_order });
              break;
            case 'fcmatrix':
              try { lsSet('zbod_fcmatrix', JSON.parse(content || '[]')); } catch(e) {}
              if (title) lsSet('zbod_fcmatrix_title', title);
              break;
            case 'support':
              try { lsSet('zbod_support', JSON.parse(content || '[]')); } catch(e) {}
              if (title) lsSet('zbod_support_title', title);
              break;
            case 'principles':
              try { lsSet('zbod_principles', JSON.parse(content || '[]')); } catch(e) {}
              if (title) lsSet('zbod_principles_title', title);
              break;
            case 'strategic_overview':
              try { lsSet('zbod_strategic_overview', JSON.parse(content || '{}')); } catch(e) {}
              break;
          }
        } catch (e) {
          console.warn('Failed to restore landing box:', box.box_id, e);
        }
      });

      // Rebuild guideline array from individual rows
      if (glItems.length > 0) {
        const iconKeys = ['compass', 'target', 'userCog', 'users', 'userCheck', 'layers', 'dollar'];
        const existing = lsGet('zbod_guidelines', null);
        glItems.sort((a, b) => a.order - b.order);
        const merged = glItems.map((g, i) => ({
          id: g.id,
          iconKey: (existing && existing[i] && existing[i].iconKey) || iconKeys[i] || 'target',
          title: g.title,
          text: g.text,
        }));
        lsSet('zbod_guidelines', merged);
      }

      // Rebuild main questions array
      if (mqItems.length > 0) {
        mqItems.sort((a, b) => a.order - b.order);
        lsSet('zbod_questions', mqItems.map(q => ({ id: q.id, label: q.label, text: q.text })));
      }

      // Rebuild strategic questions array
      if (sqItems.length > 0) {
        sqItems.sort((a, b) => a.order - b.order);
        lsSet('zbod_strategic', sqItems.map(s => ({ id: s.id, label: s.label, text: s.text })));
      }
    }

    console.log('Supabase data loaded and merged');
  } catch (e) {
    console.warn('Failed to load from Supabase:', e);
  }
}

// ═══════════════════════════════════════════
// BUSINESS LOGIC
// ═══════════════════════════════════════════
function computePhase1Alert(elim, auto, out) {
  if (!elim || !auto || !out) return null;
  if (elim === 'No' && auto === 'No' && out === 'No') return 'PASSED FILTER';
  if (elim === 'Yes' && auto === 'No' && out === 'No') return 'REVIEW FOR ELIMINATION';
  if (elim === 'No' && auto === 'Yes' && out === 'No') return 'REVIEW FOR AUTOMATION';
  if (elim === 'No' && auto === 'No' && out === 'Yes') return 'REVIEW FOR OUTSOURCING';
  const r = []; if (elim === 'Yes') r.push('ELIMINATION'); if (auto === 'Yes') r.push('AUTOMATION'); if (out === 'Yes') r.push('OUTSOURCING');
  return `REVIEW FOR ${r.join(' AND ')}`;
}

function computePhase2Decision(q1, q2) {
  const total = q1 + q2;
  if (total >= 9) return 'INVEST';
  if (total >= 7) return 'KEEP';
  if (total >= 5) return 'OPTIMIZE';
  return 'ELIMINATE';
}

function computePhase3(f, data) {
  const totalHC = data.total_hc !== undefined ? data.total_hc : (f.total_hc || 0);
  const hcAlloc = data.hc_allocation_percent !== undefined ? data.hc_allocation_percent : f.hc_allocation_percent;
  const totalBudget = data.total_budget !== undefined ? data.total_budget : (f.total_budget || 0);
  const costAlloc = data.cost_allocation_percent !== undefined ? data.cost_allocation_percent : f.cost_allocation_percent;
  const mgrCount = data.manager_count !== undefined ? data.manager_count : f.manager_count;
  const profCount = data.professional_count !== undefined ? data.professional_count : f.professional_count;
  const careerLevel = data.career_level || f.career_level;

  const proposedHC = totalHC && hcAlloc ? Math.round((totalHC * hcAlloc) / 100) : null;
  const proposedBudget = totalBudget && costAlloc ? Math.round((totalBudget * costAlloc) / 100) : null;
  const span = profCount && mgrCount && mgrCount > 0 ? profCount / mgrCount : null;

  const spanAlert = getSpanAlert(span, careerLevel, mgrCount, profCount) ?? f.span_alert;
  return { proposed_hc: proposedHC, proposed_budget: proposedBudget, span_of_control: span, span_alert: spanAlert };
}

function getSpanAlert(span, careerLevel, mgrCount, profCount) {
  if (!careerLevel) return null;
  if (!mgrCount && profCount > 0) return 'No Manager Assigned';
  if (mgrCount > 0 && !profCount) return 'Manager Without Team';
  if (!mgrCount && !profCount) return 'No Team Data';
  if (!span) return null;
  const b = {
    'Senior Management': { min: 4, max: 6 },
    'Middle Management': { min: 5, max: 7 },
    'Lower Management': { min: 10, max: 15 },
  }[careerLevel];
  if (!b) return null;
  if (span < b.min) return 'Below Recommended Span';
  if (span > b.max) return 'Above Recommended Span';
  return 'Healthy Span';
}

function buildCascadedAllocations(fns, divHC, divBudget, phase3Values) {
  const fnIds = new Set(fns.map(f => f.id));
  const parentMap = {};
  fns.forEach(f => {
    const pid = (f.parent_id && fnIds.has(f.parent_id)) ? f.parent_id : 'root';
    if (!parentMap[pid]) parentMap[pid] = [];
    parentMap[pid].push(f);
  });
  const result = {};
  function processLevel(parentId, parentHC, parentBudget) {
    const children = parentMap[parentId] || [];
    children.forEach(f => {
      const raw = (phase3Values && phase3Values[f.id]) || {};
      const hcAlloc = raw.hc_allocation_percent !== undefined ? raw.hc_allocation_percent : f.hc_allocation_percent;
      const costAlloc = raw.cost_allocation_percent !== undefined ? raw.cost_allocation_percent : f.cost_allocation_percent;
      const proposedHC = parentHC && hcAlloc ? Math.round((parentHC * hcAlloc) / 100) : null;
      const proposedBudget = parentBudget && costAlloc ? Math.round((parentBudget * costAlloc) / 100) : null;
      result[f.id] = { parentHC, parentBudget, proposedHC, proposedBudget };
      processLevel(f.id, proposedHC, proposedBudget);
    });
  }
  processLevel('root', divHC, divBudget);
  return result;
}

function recomputeAndSaveAllCascaded(workshopId, phase3Values) {
  const ws = getWs().find(w => w.id === workshopId);
  if (!ws) return;
  const div = getDivs().find(d => d.id === ws.division_id);
  if (!div) return;
  const fns = getFns().filter(f => f.workshop_id === workshopId);
  const cascaded = buildCascadedAllocations(fns, div.headcount_target || 0, div.budget_target || 0, phase3Values);
  fns.forEach(f => {
    const vals = cascaded[f.id];
    if (!vals) return;
    const raw = (phase3Values && phase3Values[f.id]) || {};
    const mgrCount = raw.manager_count !== undefined ? raw.manager_count : f.manager_count;
    const profCount = raw.professional_count !== undefined ? raw.professional_count : f.professional_count;
    const span = profCount && mgrCount && parseInt(mgrCount) > 0 ? parseInt(profCount) / parseInt(mgrCount) : null;
    const spanAlert = getSpanAlert(span, f.career_level, parseInt(mgrCount) || 0, parseInt(profCount) || 0) ?? f.span_alert;
    updFn(f.id, {
      proposed_hc: vals.proposedHC,
      proposed_budget: vals.proposedBudget,
      total_hc: vals.parentHC,
      total_budget: vals.parentBudget,
      span_of_control: span,
      span_alert: spanAlert,
    });
  });
}

function calculateProposedHeadcount(workshopId) {
  const fns = getFns().filter(f => f.workshop_id === workshopId);
  return fns.reduce((sum, f) => sum + (f.proposed_hc || 0), 0);
}

function calculateProposedBudget(workshopId) {
  const fns = getFns().filter(f => f.workshop_id === workshopId);
  return fns.reduce((sum, f) => sum + (f.proposed_budget || 0), 0);
}

function calculateDashboardMetrics(workshopId) {
  const ws = getWs().find(w => w.id === workshopId);
  if (!ws) return null;
  const div = getDivs().find(d => d.id === ws.division_id);
  if (!div) return null;
  const fns = getFns().filter(f => f.workshop_id === workshopId).sort((a, b) => a.function_number - b.function_number);
  const asIsFns = getAsIs().filter(f => f.division_id === ws.division_id);

  const totalAsIsHC = asIsFns.reduce((s, f) => s + (f.current_function_hc || 0), 0);
  const totalAsIsBudget = asIsFns.reduce((s, f) => s + (f.current_budget || 0), 0);
  const totalToBeHC = calculateProposedHeadcount(workshopId);
  const totalToBeBudget = calculateProposedBudget(workshopId);

  const inc = fns.filter(f => (f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0)) === 'INVEST');
  const kp = fns.filter(f => (f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0)) === 'KEEP');
  const opt = fns.filter(f => (f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0)) === 'OPTIMIZE');
  const elm = fns.filter(f => (f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0)) === 'ELIMINATE');

  return {
    workshop: ws,
    division: div,
    functions: fns,
    asIsFunctions: asIsFns,
    totalAsIsHC,
    totalAsIsBudget,
    totalToBeHC,
    totalToBeBudget,
    targetHC: div.headcount_target || 0,
    targetBudget: div.budget_target || 0,
    investCount: inc.length,
    keepCount: kp.length,
    optimizeCount: opt.length,
    eliminateCount: elm.length,
    invest: inc,
    keep: kp,
    optimize: opt,
    eliminate: elm,
  };
}

function finalizeWorkshopCalculations(workshopId) {
  recomputeAndSaveAllCascaded(workshopId, state.phase3Values);
}

function saveCompletedWorkshop(workshopId) {
  finalizeWorkshopCalculations(workshopId);
  const now = new Date().toISOString();
  updWs(workshopId, { status: 'completed', completed_at: now, phase: 3 });

  if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
    window.zbodSupabase.sbSyncAll(getDivs(), getWs(), getFns(), getAsIs());
  }
}

function loadDashboardData(workshopId) {
  return calculateDashboardMetrics(workshopId);
}

// ═══════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════
function showPage(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.remove('hidden');
  window.scrollTo(0, 0);
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
function toast(message, opts) {
  const container = document.getElementById('toast-container');
  const id = ++state.toastId;
  const type = (opts && opts.type) || 'success';
  const desc = (opts && opts.description) || '';
  const div = document.createElement('div');
  div.className = `zbod-toast zbod-toast-${type}`;
  div.innerHTML = `<div class="zbod-toast-title">${message}</div>${desc ? `<div class="zbod-toast-desc">${desc}</div>` : ''}`;
  container.appendChild(div);
  setTimeout(() => { div.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => div.remove(), 300); }, 3000);
}

// ═══════════════════════════════════════════
// SVG ICONS HELPER
// ═══════════════════════════════════════════
const ICONS = {
  arrowLeft: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  save: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
  home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  arrowRight: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  layers: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  target: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  userCog: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="19" cy="11" r="2"/><path d="M19 8v1M19 13v1M16.5 9.5l.8.8M20.7 11.7l.8.8M16.5 12.5l.8-.8M20.7 10.3l.8-.8"/></svg>',
  dollar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  hash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  fileText: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  history: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
  userCheck: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
  calendar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  alertTriangle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  barChart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  activity: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  gitCompare: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/></svg>',
  chevronRight: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
  building: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><line x1="9" y1="12" x2="9.01" y2="12"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="9" y1="16" x2="9.01" y2="16"/><line x1="15" y1="16" x2="15.01" y2="16"/></svg>',
  user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
  book: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  compass: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  xCircle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  quote: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3"/></svg>',
  checkCircle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  grid: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  heart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  shield: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  helpCircle: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  trendingUp: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  sparkles: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
  eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  move: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
  max2: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  min2: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
};


// ═══════════════════════════════════════════
// RENDER: LANDING PAGE (SIMPLIFIED - OVERVIEW ONLY)
// ═══════════════════════════════════════════
function renderLanding() {
  const defaultContent = {
    overviewTitle: 'What is Zero-Based Organizational Design?',
    overviewText: 'Zero-Based Organizational Design (ZBOD) is a comprehensive methodology for building organizational structures from the ground up. Rather than making incremental changes to existing structures, ZBOD enables organizations to strategically rethink and redesign their entire operating model to align with business priorities.',
  };

  let content = {...defaultContent, ...lsGet(LS.landing, {})};

  function editBtn() {
    if (state.landingEditing === 'overview') {
      return `<button onclick="app.saveLanding()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelLandingEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editLanding()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function field(key, type) {
    if (state.landingEditing === 'overview') {
      const val = state.landingDrafts[key] !== undefined ? state.landingDrafts[key] : content[key];
      if (type === 'textarea') return `<textarea class="zbod-textarea" id="landing-${key}" rows="3">${val}</textarea>`;
      return `<input class="zbod-input" id="landing-${key}" value="${val}">`;
    }
    if (type === 'textarea') return `<p class="text-sm leading-relaxed" style="color:#4b5563;">${content[key]}</p>`;
    return `<h2 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;">${content[key]}</h2>`;
  }

  // ZBOD Guideline data — structured for future Supabase integration
  const guidelineDefaults = [
    { id: 'gl1', iconKey: 'compass',  title: 'STARTING POINT',  text: 'Set the current organizational structure completely aside; redesign from zero. Primary focus: revisit and redesign the organization based on strategy and business priorities.' },
    { id: 'gl2', iconKey: 'target',   title: 'VALUE FOCUS',     text: 'Identify only functions that create measurable value. The argument "it existed before" is not valid. Remove low-value activities.' },
    { id: 'gl3', iconKey: 'userCog',  title: 'FUNCTIONS',       text: 'Design functions that add value to the business. Ask yourself: Can this function be eliminated? Can it be automated? Can it be outsourced? Only create the function if the answer to all three questions is "no" (business justification needed). Shadow support activities should be automated, outsourced, or eliminated.' },
    { id: 'gl4', iconKey: 'users',    title: 'MANAGEMENT',      text: 'Minimize the number of management layers. Do not create deputy / deputy-of-deputy structures. Target 8\u201312 direct reports per manager to ensure an effective span of control. Deploy human resources in the functions that deliver the highest business value.' },
    { id: 'gl5', iconKey: 'userCheck',title: 'PEOPLE QUALITY',  text: 'Aim to work with a small but highly talented team. Automate or outsource low-grade work. Always consider optimization targets and size the team accordingly.' },
    { id: 'gl6', iconKey: 'layers',   title: 'PROCESSES',       text: 'Eliminate or simplify manual and complex processes. Job = end-to-end accountability. Redesign processes based on newly created functions. For every process, automation, AI, and RPA should be top priorities.' },
    { id: 'gl7', iconKey: 'dollar',   title: 'COST & CAPITAL',  text: 'Every function must have a clear cost vs. value justification.' },
  ];
  const savedGuidelines = lsGet('zbod_guidelines', null);
  const guidelineData = savedGuidelines && Array.isArray(savedGuidelines) ? savedGuidelines : guidelineDefaults;

  const guidelineTitleDefault = 'ZBOD GUIDELINE';
  const guidelineTitle = lsGet('zbod_guideline_title', guidelineTitleDefault);

  function guidelineEditBtn() {
    if (state.landingEditing === 'guideline') {
      return `<button onclick="app.saveGuideline()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelGuidelineEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editGuideline()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function renderGuidelineItem(g, idx) {
    const iconSvg = ICONS[g.iconKey] || ICONS.target;
    if (state.landingEditing === 'guideline') {
      const draftText = state.landingDrafts[`gl_text_${idx}`] !== undefined ? state.landingDrafts[`gl_text_${idx}`] : g.text;
      const draftTitle = state.landingDrafts[`gl_title_${idx}`] !== undefined ? state.landingDrafts[`gl_title_${idx}`] : g.title;
      return `<div class="guideline-item">
        <div class="guideline-item-header">
          <div class="guideline-item-icon">${iconSvg}</div>
          <input class="zbod-input" id="gl-title-${idx}" value="${escHtml(draftTitle)}" oninput="state.landingDrafts['gl_title_${idx}']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#0F3C76;padding:6px 10px;flex:1;">
        </div>
        <textarea class="zbod-textarea" id="gl-text-${idx}" rows="4" oninput="state.landingDrafts['gl_text_${idx}']=this.value">${escHtml(draftText)}</textarea>
      </div>`;
    }
    return `<div class="guideline-item">
      <div class="guideline-item-header">
        <div class="guideline-item-icon">${iconSvg}</div>
        <div class="guideline-item-title">${g.title}</div>
      </div>
      <div class="guideline-item-text">${g.text}</div>
    </div>`;
  }

  // Strategic Overview data — structured for future Supabase integration
  const strategicOverviewDefault = {
    title: 'STRATEGIC OVERVIEW',
    subtitle: 'When designing the structure, these points must be taken into consideration.',
    columns: ['STRATEGIC METRICS', '2025', '2026', 'TARGET', '2027'],
    rows: [
      { metric: '# of emp', c2025: '3,269', c2026: '3,878', target: '3,287', c2027: '\u2014' },
      { metric: 'People Budget', c2025: '138.9 M', c2026: '152.7 M', target: '117.1 M', c2027: '\u2014' },
      { metric: 'Company Revenue', c2025: '901.2 M', c2026: '1,000 M', target: '1,000 M', c2027: '\u2014', highlight: true },
      { metric: 'Revenue per Emp', c2025: '275.7 K', c2026: '242.3 K', target: '290.1 K', c2027: '\u2014', highlight: true },
      { metric: 'Cost per HC', c2025: '42.5 K', c2026: '35.6 K', target: '35.6 K', c2027: '\u2014' },
      { metric: 'People Budget / Revenue', c2025: '0.15', c2026: '0.15', target: '0.12', c2027: '\u2014' },
      { metric: 'EBITDA per Employee', c2025: '\u2014', c2026: '109.3 K', target: '133.8 K', c2027: '\u2014' },
      { metric: 'Procurement opt. target', c2025: '84', c2026: '80', target: '80', c2027: '\u2014' },
    ],
  };
  const savedStrategicOverview = lsGet('zbod_strategic_overview', null);
  const strategicOverview = savedStrategicOverview && typeof savedStrategicOverview === 'object' ? {...strategicOverviewDefault, ...savedStrategicOverview} : strategicOverviewDefault;

  function strategicOverviewEditBtn() {
    if (state.landingEditing === 'strategicOverview') {
      return `<button onclick="app.saveStrategicOverview()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelStrategicOverviewEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editStrategicOverview()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function renderStrategicOverviewTable() {
    const so = strategicOverview;
    let html = '';

    if (state.landingEditing === 'strategicOverview') {
      const draftCols = state.landingDrafts['so_cols'] !== undefined ? state.landingDrafts['so_cols'] : so.columns;
      const draftRows = state.landingDrafts['so_rows'] !== undefined ? state.landingDrafts['so_rows'] : so.rows;

      html += `<div class="strategic-table-wrap"><table class="strategic-table"><thead><tr>`;
      draftCols.forEach((col, ci) => {
        html += `<th class="${col === 'TARGET' ? 'target-col' : ''}"><input class="zbod-input" id="so-col-${ci}" value="${escHtml(col)}" oninput="state.landingDrafts['so_cols'][${ci}]=this.value" style="font-family:'Montserrat',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;text-align:center;padding:4px 8px;background:transparent;border:none;color:inherit;min-width:60px;"></th>`;
      });
      html += `</tr></thead><tbody>`;
      draftRows.forEach((row, ri) => {
        html += `<tr class="${row.highlight ? 'highlight-row' : ''}">`;
        html += `<td><input class="zbod-input" id="so-row-${ri}-m" value="${escHtml(row.metric)}" oninput="state.landingDrafts['so_rows'][${ri}].metric=this.value" style="text-align:left;font-weight:600;"></td>`;
        html += `<td><input class="zbod-input" id="so-row-${ri}-25" value="${escHtml(row.c2025)}" oninput="state.landingDrafts['so_rows'][${ri}].c2025=this.value"></td>`;
        html += `<td><input class="zbod-input" id="so-row-${ri}-26" value="${escHtml(row.c2026)}" oninput="state.landingDrafts['so_rows'][${ri}].c2026=this.value"></td>`;
        html += `<td class="target-col"><input class="zbod-input" id="so-row-${ri}-t" value="${escHtml(row.target)}" oninput="state.landingDrafts['so_rows'][${ri}].target=this.value" style="font-weight:700;color:#2E642C;"></td>`;
        html += `<td><input class="zbod-input" id="so-row-${ri}-27" value="${escHtml(row.c2027)}" oninput="state.landingDrafts['so_rows'][${ri}].c2027=this.value"></td>`;
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
      return html;
    }

    html += `<div class="strategic-table-wrap"><table class="strategic-table"><thead><tr>`;
    so.columns.forEach(col => {
      html += `<th class="${col === 'TARGET' ? 'target-col' : ''}">${escHtml(col)}</th>`;
    });
    html += `</tr></thead><tbody>`;
    so.rows.forEach(row => {
      html += `<tr class="${row.highlight ? 'highlight-row' : ''}">`;
      html += `<td>${escHtml(row.metric)}</td>`;
      html += `<td>${escHtml(row.c2025)}</td>`;
      html += `<td>${escHtml(row.c2026)}</td>`;
      html += `<td class="target-col">${escHtml(row.target)}</td>`;
      html += `<td>${escHtml(row.c2027)}</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  // Problem Statement data — structured for future Supabase integration
  const problemsDefaults = [
    'Too many management layers',
    'Decentralized and duplicated functions',
    'Low span of control',
    'Low-grade employees',
    'Shadow Support Functions',
    'Complex, manual-based processes and jobs',
    'Multi-layered deputy hierarchy',
  ];
  const savedProblems = lsGet('zbod_problems', null);
  const problemsData = savedProblems && Array.isArray(savedProblems) ? savedProblems : problemsDefaults;
  const problemsTitleDefault = 'PROBLEM STATEMENT';
  const savedProblemsTitle = lsGet('zbod_problems_title', null);
  const problemsTitle = savedProblemsTitle !== null ? savedProblemsTitle : problemsTitleDefault;

  // Main Questions data — structured for future Supabase integration
  const questionsDefaults = [
    { id: 'mq1', label: 'MQ1', text: "Let's assume we are building the structure from scratch. According to your vision, which business functions must be created in order to add value to the business?" },
    { id: 'mq2', label: 'MQ2', text: 'To what degree is it possible to automate or outsource the proposed function?' },
    { id: 'mq3', label: 'MQ3', text: 'Is there any function that is currently being overlooked or ignored?' },
  ];
  const savedQuestions = lsGet('zbod_questions', null);
  const questionsData = savedQuestions && Array.isArray(savedQuestions) ? savedQuestions : questionsDefaults;
  const questionsTitleDefault = 'MAIN QUESTIONS';
  const savedQuestionsTitle = lsGet('zbod_questions_title', null);
  const questionsTitle = savedQuestionsTitle !== null ? savedQuestionsTitle : questionsTitleDefault;

  function questionsEditBtn() {
    if (state.landingEditing === 'questions') {
      return `<button onclick="app.saveQuestions()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelQuestionsEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editQuestions()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function renderQuestionItem(q, idx) {
    if (state.landingEditing === 'questions') {
      const draftText = state.landingDrafts[`mq_text_${idx}`] !== undefined ? state.landingDrafts[`mq_text_${idx}`] : q.text;
      const draftLabel = state.landingDrafts[`mq_label_${idx}`] !== undefined ? state.landingDrafts[`mq_label_${idx}`] : q.label;
      return `<div class="question-item">
        <div class="question-header">
          <input class="zbod-input" id="mq-label-${idx}" value="${escHtml(draftLabel)}" oninput="state.landingDrafts['mq_label_${idx}']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:13px;color:#ffffff;background:linear-gradient(135deg,#2E642C 0%,#0F3C76 100%);padding:6px 14px;border:none;border-radius:8px;letter-spacing:0.04em;width:auto;max-width:100px;text-align:center;">
        </div>
        <textarea class="zbod-textarea" id="mq-text-${idx}" rows="3" oninput="state.landingDrafts['mq_text_${idx}']=this.value">${escHtml(draftText)}</textarea>
      </div>`;
    }
    return `<div class="question-item">
      <div class="question-header">
        <span class="question-badge">${q.label}</span>
      </div>
      <div class="question-text">${escHtml(q.text)}</div>
    </div>`;
  }

  // Function Categorization Matrix data — structured for future Supabase integration
  const fcmatrixDefaults = [
    { id: 'fca', letter: 'A', score: '9\u201310', title: 'Strategic', action: 'Invest', variant: 'a' },
    { id: 'fcb', letter: 'B', score: '7\u20138', title: 'Core Operations', action: 'Keep', variant: 'b' },
    { id: 'fcc', letter: 'C', score: '5\u20136', title: 'Efficiency', action: 'Optimize / Automate', variant: 'c' },
    { id: 'fcd', letter: 'D', score: '2\u20134', title: 'Non-Core', action: 'Eliminate / Outsource', variant: 'd' },
  ];
  const savedFcmatrix = lsGet('zbod_fcmatrix', null);
  const fcmatrixData = savedFcmatrix && Array.isArray(savedFcmatrix) ? savedFcmatrix : fcmatrixDefaults;
  const fcmatrixTitleDefault = 'FUNCTION CATEGORIZATION MATRIX';
  const savedFcmatrixTitle = lsGet('zbod_fcmatrix_title', null);
  const fcmatrixTitle = savedFcmatrixTitle !== null ? savedFcmatrixTitle : fcmatrixTitleDefault;

  function fcmatrixEditBtn() {
    if (state.landingEditing === 'fcmatrix') {
      return `<button onclick="app.saveFcmatrix()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelFcmatrixEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editFcmatrix()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function renderFcmatrixItem(item, idx) {
    const v = item.variant || 'a';
    if (state.landingEditing === 'fcmatrix') {
      const draftScore = state.landingDrafts[`fc_score_${idx}`] !== undefined ? state.landingDrafts[`fc_score_${idx}`] : item.score;
      const draftTitle = state.landingDrafts[`fc_title_${idx}`] !== undefined ? state.landingDrafts[`fc_title_${idx}`] : item.title;
      const draftAction = state.landingDrafts[`fc_action_${idx}`] !== undefined ? state.landingDrafts[`fc_action_${idx}`] : item.action;
      return `<div class="fcmatrix-item fcmatrix-${v}">
        <input class="zbod-input" id="fc-letter-${idx}" value="${escHtml(item.letter)}" readonly style="font-family:'Montserrat',sans-serif;font-size:32px;font-weight:900;text-align:center;width:60px;padding:0;background:transparent;border:none;color:inherit;">
        <input class="zbod-input" id="fc-score-${idx}" value="${escHtml(draftScore)}" oninput="state.landingDrafts['fc_score_${idx}']=this.value" style="font-size:12px;font-weight:600;text-align:center;padding:4px 10px;width:auto;">
        <input class="zbod-input" id="fc-title-${idx}" value="${escHtml(draftTitle)}" oninput="state.landingDrafts['fc_title_${idx}']=this.value" style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;text-align:center;padding:6px 10px;">
        <input class="zbod-input" id="fc-action-${idx}" value="${escHtml(draftAction)}" oninput="state.landingDrafts['fc_action_${idx}']=this.value" style="font-size:12px;font-weight:600;text-align:center;padding:4px 10px;letter-spacing:0.06em;text-transform:uppercase;width:auto;">
      </div>`;
    }
    return `<div class="fcmatrix-item fcmatrix-${v}">
      <div class="fcmatrix-letter">${item.letter}</div>
      <div class="fcmatrix-score">Score: ${item.score}</div>
      <div class="fcmatrix-title">${item.title}</div>
      <div class="fcmatrix-action">${item.action}</div>
    </div>`;
  }

  // Support Functions data — structured for future Supabase integration
  const supportDefaults = [
    { id: 'sf1', iconKey: 'settings', title: 'IT Support', text: 'Manage and maintain technology infrastructure, provide technical assistance, and ensure system reliability across the organization.' },
    { id: 'sf2', iconKey: 'shield', title: 'Security & Compliance', text: 'Oversee data protection, enforce security policies, and ensure regulatory compliance to minimize risk and safeguard organizational assets.' },
    { id: 'sf3', iconKey: 'barChart', title: 'Finance & Accounting', text: 'Handle budgeting, financial reporting, payroll processing, and fiscal planning to maintain organizational financial health.' },
    { id: 'sf4', iconKey: 'users', title: 'HR Administration', text: 'Manage recruitment, employee onboarding, benefits administration, and workplace policies to support workforce needs.' },
  ];
  const savedSupport = lsGet('zbod_support', null);
  const supportData = savedSupport && Array.isArray(savedSupport) ? savedSupport : supportDefaults;
  const supportTitleDefault = 'SUPPORT FUNCTIONS';
  const savedSupportTitle = lsGet('zbod_support_title', null);
  const supportTitle = savedSupportTitle !== null ? savedSupportTitle : supportTitleDefault;

  function supportEditBtn() {
    if (state.landingEditing === 'support') {
      return `<button onclick="app.saveSupport()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelSupportEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editSupport()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function renderSupportItem(item, idx) {
    const iconSvg = ICONS[item.iconKey] || ICONS.settings;
    if (state.landingEditing === 'support') {
      const draftTitle = state.landingDrafts[`sf_title_${idx}`] !== undefined ? state.landingDrafts[`sf_title_${idx}`] : item.title;
      const draftText = state.landingDrafts[`sf_text_${idx}`] !== undefined ? state.landingDrafts[`sf_text_${idx}`] : item.text;
      return `<div class="support-item">
        <div class="support-icon">${iconSvg}</div>
        <input class="zbod-input" id="sf-title-${idx}" value="${escHtml(draftTitle)}" oninput="state.landingDrafts['sf_title_${idx}']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#0F3C76;padding:6px 10px;margin-bottom:8px;">
        <textarea class="zbod-textarea" id="sf-text-${idx}" rows="3" oninput="state.landingDrafts['sf_text_${idx}']=this.value">${escHtml(draftText)}</textarea>
      </div>`;
    }
    return `<div class="support-item">
      <div class="support-icon">${iconSvg}</div>
      <div class="support-title">${item.title}</div>
      <div class="support-text">${item.text}</div>
    </div>`;
  }

  // Quote data — structured for future Supabase integration
  const quoteDefault = "Let's put the current organizational structure aside and focus purely on the strategy. Let's think about where the business is going over the next three years and how the organization should add value to that direction. If we were designing the organization from scratch, which capabilities would be most critical for delivering the strategy? Let's work together to shape a structure that will genuinely enable the business and maximize value over the next three years.";
  const savedQuote = lsGet('zbod_quote', null);
  const quoteText = savedQuote !== null ? savedQuote : quoteDefault;

  function quoteEditBtn() {
    if (state.landingEditing === 'quote') {
      return `<button onclick="app.saveQuote()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelQuoteEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editQuote()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function renderQuoteText() {
    if (state.landingEditing === 'quote') {
      const draft = state.landingDrafts['quote_text'] !== undefined ? state.landingDrafts['quote_text'] : quoteText;
      return `<textarea class="zbod-textarea" id="quote-text" rows="4" oninput="state.landingDrafts['quote_text']=this.value">${escHtml(draft)}</textarea>`;
    }
    return `<p class="quote-text">"${escHtml(quoteText)}"</p>`;
  }

  // Core Principles data — structured for future Supabase integration
  const principlesDefaults = [
    'Key strategic directions for cost and process optimization',
    'Ignore the current org chart and design it from zero',
    'Automate or outsource before creation',
    'Focus on value creation',
  ];
  const savedPrinciples = lsGet('zbod_principles', null);
  const principlesData = savedPrinciples && Array.isArray(savedPrinciples) ? savedPrinciples : principlesDefaults;
  const principlesTitleDefault = 'CORE PRINCIPLES';
  const savedPrinciplesTitle = lsGet('zbod_principles_title', null);
  const principlesTitle = savedPrinciplesTitle !== null ? savedPrinciplesTitle : principlesTitleDefault;

  function principlesEditBtn() {
    if (state.landingEditing === 'principles') {
      return `<button onclick="app.savePrinciples()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelPrinciplesEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editPrinciples()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function renderPrincipleItem(text, idx) {
    if (state.landingEditing === 'principles') {
      const draftText = state.landingDrafts[`pr_text_${idx}`] !== undefined ? state.landingDrafts[`pr_text_${idx}`] : text;
      return `<div class="principle-item">
        <div class="principle-check">${ICONS.check}</div>
        <textarea class="zbod-textarea" id="pr-text-${idx}" rows="2" oninput="state.landingDrafts['pr_text_${idx}']=this.value" style="font-size:14px;color:#4b5563;flex:1;">${escHtml(draftText)}</textarea>
      </div>`;
    }
    return `<div class="principle-item">
      <div class="principle-check">${ICONS.check}</div>
      <div class="principle-text">${escHtml(text)}</div>
    </div>`;
  }

  // Strategic Questions data — structured for future Supabase integration
  const strategicDefaults = [
    { id: 'sq1', label: 'SQ1', text: 'Does this function materially contribute to business strategy and outcomes, and enable scalable, efficient value creation (e.g. revenue, productivity, customer experience, automation)?' },
    { id: 'sq2', label: 'SQ2', text: 'How critical is this function to business continuity and risk management, and what would be the impact if it were stopped today (legal, financial, regulatory, reputational, operational)?' },
  ];
  const savedStrategic = lsGet('zbod_strategic', null);
  const strategicData = savedStrategic && Array.isArray(savedStrategic) ? savedStrategic : strategicDefaults;
  const strategicTitleDefault = 'STRATEGIC QUESTIONS';
  const savedStrategicTitle = lsGet('zbod_strategic_title', null);
  const strategicTitle = savedStrategicTitle !== null ? savedStrategicTitle : strategicTitleDefault;

  function strategicEditBtn() {
    if (state.landingEditing === 'strategic') {
      return `<button onclick="app.saveStrategic()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelStrategicEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editStrategic()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function renderStrategicItem(s, idx) {
    if (state.landingEditing === 'strategic') {
      const draftText = state.landingDrafts[`sq_text_${idx}`] !== undefined ? state.landingDrafts[`sq_text_${idx}`] : s.text;
      const draftLabel = state.landingDrafts[`sq_label_${idx}`] !== undefined ? state.landingDrafts[`sq_label_${idx}`] : s.label;
      return `<div class="strategic-item">
        <div class="strategic-header">
          <input class="zbod-input" id="sq-label-${idx}" value="${escHtml(draftLabel)}" oninput="state.landingDrafts['sq_label_${idx}']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:13px;color:#ffffff;background:linear-gradient(135deg,#2E642C 0%,#0F3C76 100%);padding:6px 14px;border:none;border-radius:8px;letter-spacing:0.04em;width:auto;max-width:100px;text-align:center;">
        </div>
        <textarea class="zbod-textarea" id="sq-text-${idx}" rows="3" oninput="state.landingDrafts['sq_text_${idx}']=this.value">${escHtml(draftText)}</textarea>
      </div>`;
    }
    return `<div class="strategic-item">
      <div class="strategic-header">
        <span class="strategic-badge">${s.label}</span>
      </div>
      <div class="strategic-text">${escHtml(s.text)}</div>
    </div>`;
  }

  function problemsEditBtn() {
    if (state.landingEditing === 'problems') {
      return `<button onclick="app.saveProblems()" class="zbod-btn-primary" style="padding:6px 12px;font-size:11px;">${ICONS.save} Save</button>
              <button onclick="app.cancelProblemsEdit()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.x} Cancel</button>`;
    }
    return `<button onclick="app.editProblems()" class="zbod-btn-secondary" style="padding:6px 12px;font-size:11px;">${ICONS.edit} Edit</button>`;
  }

  function renderProblemItem(text, idx) {
    if (state.landingEditing === 'problems') {
      const draftText = state.landingDrafts[`pr_text_${idx}`] !== undefined ? state.landingDrafts[`pr_text_${idx}`] : text;
      return `<div class="problem-item">
        <div class="problem-bullet"></div>
        <textarea class="zbod-textarea" id="pr-text-${idx}" rows="2" oninput="state.landingDrafts['pr_text_${idx}']=this.value" style="font-size:14px;color:#374151;flex:1;">${escHtml(draftText)}</textarea>
      </div>`;
    }
    return `<div class="problem-item">
      <div class="problem-bullet"></div>
      <div class="problem-text">${escHtml(text)}</div>
    </div>`;
  }

  const html = `
    <div style="background: linear-gradient(135deg, rgba(46,100,44,0.06) 0%, rgba(15,60,118,0.04) 50%, rgba(255,255,255,0) 100%); padding: 60px 0 40px;">
      <div class="max-w-5xl mx-auto px-8 text-center">
        <div class="zbod-chip" style="margin-bottom:24px;">Azerconnect Group</div>
        <h1 style="font-family:'Montserrat',sans-serif;font-size:48px;font-weight:800;color:#111827;margin-bottom:16px;line-height:1.1;">Zero-Based<br>Organizational Design</h1>
        <p style="font-size:18px;color:#4b5563;max-width:600px;margin:0 auto 32px;">Build organizational structures from the ground up with strategic alignment, optimized resource allocation, and efficient value creation.</p>
        <button onclick="app.goToDivisions()" class="zbod-btn-primary" style="font-size:16px;padding:16px 40px;">${ICONS.sparkles} Start Workshop</button>
      </div>
    </div>
    <div class="max-w-5xl mx-auto px-8 py-12">
      <div class="zbod-card p-6">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          ${ICONS.target}
          <div class="flex-1">${field('overviewTitle', 'h2')}</div>
          <div>${editBtn()}</div>
        </div>
        ${field('overviewText', 'textarea')}
      </div>
      <div class="problems-wrapper zbod-card p-6">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${ICONS.alertTriangle}
          <div class="flex-1">${state.landingEditing === 'problems' ? `<input class="zbod-input" value="${escHtml(state.landingDrafts['problems_title'] || problemsTitle)}" oninput="state.landingDrafts['problems_title']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#0F3C76;padding:6px 10px;">` : `<h2 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;">${escHtml(problemsTitle)}</h2>`}</div>
          <div>${problemsEditBtn()}</div>
        </div>
        <div class="problems-grid">
          <div class="problems-col">
            ${problemsData.slice(0, 4).map((t, i) => renderProblemItem(t, i)).join('')}
          </div>
          <div class="problems-col">
            ${problemsData.slice(4, 7).map((t, i) => renderProblemItem(t, i + 4)).join('')}
          </div>
        </div>
      </div>
      <div class="guideline-wrapper zbod-card p-6">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${ICONS.book}
          <div class="flex-1">${state.landingEditing === 'guideline' ? `<input class="zbod-input" value="${escHtml(state.landingDrafts['guidelineTitle'] || guidelineTitle)}" oninput="state.landingDrafts['guidelineTitle']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#0F3C76;padding:6px 10px;">` : `<h2 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;">${escHtml(guidelineTitle)}</h2>`}</div>
          <div>${guidelineEditBtn()}</div>
        </div>
        <div class="guideline-boxes-grid">
          ${guidelineData.map((g, i) => renderGuidelineItem(g, i)).join('')}
        </div>
      </div>
      <div class="questions-wrapper zbod-card p-6">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${ICONS.helpCircle}
          <div class="flex-1">${state.landingEditing === 'questions' ? `<input class="zbod-input" value="${escHtml(state.landingDrafts['questions_title'] || questionsTitle)}" oninput="state.landingDrafts['questions_title']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#0F3C76;padding:6px 10px;">` : `<h2 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;">${escHtml(questionsTitle)}</h2>`}</div>
          <div>${questionsEditBtn()}</div>
        </div>
        <div class="questions-list">
          ${questionsData.map((q, i) => renderQuestionItem(q, i)).join('')}
        </div>
      </div>
      <div class="strategic-wrapper zbod-card p-6">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${ICONS.barChart}
          <div class="flex-1">${state.landingEditing === 'strategic' ? `<input class="zbod-input" value="${escHtml(state.landingDrafts['strategic_title'] || strategicTitle)}" oninput="state.landingDrafts['strategic_title']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#0F3C76;padding:6px 10px;">` : `<h2 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;">${escHtml(strategicTitle)}</h2>`}</div>
          <div>${strategicEditBtn()}</div>
        </div>
        <div class="strategic-list">
          ${strategicData.map((s, i) => renderStrategicItem(s, i)).join('')}
        </div>
      </div>
      <div class="quote-wrapper zbod-card">
        <div class="quote-card-inner">
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="color:#2E642C;flex-shrink:0;margin-top:2px;">${ICONS.quote}</div>
            <div class="flex-1" style="display:flex;align-items:center;gap:12px;">
              <div class="flex-1">${renderQuoteText()}</div>
              <div>${quoteEditBtn()}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="principles-wrapper zbod-card p-6">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${ICONS.checkCircle}
          <div class="flex-1">${state.landingEditing === 'principles' ? `<input class="zbod-input" value="${escHtml(state.landingDrafts['principles_title'] || principlesTitle)}" oninput="state.landingDrafts['principles_title']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#0F3C76;padding:6px 10px;">` : `<h2 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;">${escHtml(principlesTitle)}</h2>`}</div>
          <div>${principlesEditBtn()}</div>
        </div>
        <div class="principles-grid">
          ${principlesData.map((p, i) => renderPrincipleItem(p, i)).join('')}
        </div>
      </div>
      <div class="fcmatrix-wrapper zbod-card p-6">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${ICONS.grid}
          <div class="flex-1">${state.landingEditing === 'fcmatrix' ? `<input class="zbod-input" value="${escHtml(state.landingDrafts['fcmatrix_title'] || fcmatrixTitle)}" oninput="state.landingDrafts['fcmatrix_title']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#0F3C76;padding:6px 10px;">` : `<h2 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;">${escHtml(fcmatrixTitle)}</h2>`}</div>
          <div>${fcmatrixEditBtn()}</div>
        </div>
        <div class="fcmatrix-grid">
          ${fcmatrixData.map((item, i) => renderFcmatrixItem(item, i)).join('')}
        </div>
      </div>
      <div class="support-wrapper zbod-card p-6">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          ${ICONS.heart}
          <div class="flex-1">${state.landingEditing === 'support' ? `<input class="zbod-input" value="${escHtml(state.landingDrafts['support_title'] || supportTitle)}" oninput="state.landingDrafts['support_title']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#0F3C76;padding:6px 10px;">` : `<h2 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;">${escHtml(supportTitle)}</h2>`}</div>
          <div>${supportEditBtn()}</div>
        </div>
        <div class="support-grid">
          ${supportData.map((s, i) => renderSupportItem(s, i)).join('')}
        </div>
      </div>
      <div class="strategic-overview-wrapper zbod-card p-6">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          ${ICONS.trendingUp}
          <div class="flex-1">
            ${state.landingEditing === 'strategicOverview' ? `<input class="zbod-input" value="${escHtml(state.landingDrafts['so_title'] || strategicOverview.title)}" oninput="state.landingDrafts['so_title']=this.value" style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#0F3C76;padding:6px 10px;margin-bottom:4px;">` : `<h2 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;">${escHtml(strategicOverview.title)}</h2>`}
            <p class="strategic-overview-subtitle">${strategicOverview.subtitle}</p>
          </div>
          <div>${strategicOverviewEditBtn()}</div>
        </div>
        ${renderStrategicOverviewTable()}
      </div>
    </div>`;

  document.getElementById('landing-content').innerHTML = html;
}

// ═══════════════════════════════════════════
// RENDER: DIVISIONS/STRUCTURES PAGE
// ═══════════════════════════════════════════
function renderDivisions(searchQuery) {
  const divs = getDivs();
  const container = document.getElementById('divisions-content');
  if (divs.length === 0) {
    container.innerHTML = `<div class="text-center py-12"><div style="width:64px;height:64px;border-radius:16px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">${ICONS.building}</div><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:20px;color:#111827;margin-bottom:8px;">No Structures Yet</h3><p style="color:#6b7280;margin-bottom:24px;">Add your first organizational structure to begin.</p><button onclick="app.showAddDivision()" class="zbod-btn-primary">${ICONS.plus} Add Structure</button></div>`;
    return;
  }

  const q = (searchQuery || '').toLowerCase().trim();
  const filtered = q ? divs.filter(d => {
    const nameMatch = (d.structure_name || '').toLowerCase().includes(q);
    const creatorMatch = (d.created_by_name || '').toLowerCase().includes(q);
    const cLevelMatch = (d.c_level_name || '').toLowerCase().includes(q);
    return nameMatch || creatorMatch || cLevelMatch;
  }) : divs;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center py-12"><div style="width:64px;height:64px;border-radius:16px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">${ICONS.search}</div><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:20px;color:#111827;margin-bottom:8px;">No matching structures found.</h3><p style="color:#6b7280;">Try a different search term.</p></div>`;
    return;
  }

  let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';
  filtered.forEach(d => {
    const typeLabel = d.structure_type || 'Division';
    const creatorLine = d.created_by_name ? `<p style="font-size:12px;color:#9ca3af;margin-top:2px;">Created by: ${escHtml(d.created_by_name)}</p>` : '';
    html += `<div class="zbod-card p-6 zbod-card-hover" style="cursor:pointer;" onclick="app.verifyAndSelectDivision('${d.id}')">
      <div style="display:flex;align-items:start;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg, rgba(46,100,44,0.1) 0%, rgba(15,52,76,0.1) 100%);display:flex;align-items:center;justify-content:center;">${ICONS.building}</div>
          <div><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#111827;">${d.structure_name}</h3><p style="font-size:13px;color:#6b7280;">${typeLabel} &mdash; ${d.c_level_name}</p>${creatorLine}</div>
        </div>
        <button onclick="event.stopPropagation();app.verifyAndDeleteDivision('${d.id}')" style="padding:8px;border-radius:8px;color:#9ca3af;transition:all 0.2s;" onmouseover="this.style.color='#991b1b';this.style.background='rgba(180,60,60,0.1)'" onmouseout="this.style.color='#9ca3af';this.style.background='transparent'">${ICONS.trash}</button>
      </div>
      <div style="margin:16px 0;border-top:1px solid rgba(46,100,44,0.1);"></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <span style="font-size:12px;color:#6b7280;"><strong style="color:#2E642C;">${formatNumber(d.current_total_hc || 0)}</strong> HC</span>
        <span style="font-size:12px;color:#6b7280;"><strong style="color:#2E642C;">${formatNumber(d.current_total_budget || 0)}</strong> AZN</span>
        <span style="font-size:12px;color:#6b7280;"><strong style="color:#0F3C76;">${formatNumber(d.headcount_target || 0)}</strong> Target</span>
      </div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function getDivisionFormFields() {
  return [
    { key: 'structure_name', label: 'Structure Name *', placeholder: 'Select structure name', type: 'select', options: STRUCTURE_NAMES, other: true },
    { key: 'structure_type', label: 'Structure Type *', placeholder: 'Select structure type', type: 'select', options: STRUCTURE_TYPES, other: true },
    { key: 'c_level_name', label: 'C-Level Full Name *', placeholder: '', type: 'text' },
    { key: 'current_total_hc', label: 'Current Total Headcount *', placeholder: '', type: 'number' },
    { key: 'headcount_target', label: 'Headcount Target *', placeholder: '', type: 'number' },
    { key: 'current_total_budget', label: 'Current Total Budget (AZN) *', placeholder: '', type: 'number' },
    { key: 'budget_target', label: 'Budget Target (AZN) *', placeholder: '', type: 'number' },
  ];
}

function renderDivisionForm() {
  const fields = getDivisionFormFields();
  document.getElementById('division-form-fields').innerHTML = fields.map((f, idx) => {
    if (f.type === 'select') {
      let html = `<div><label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;">${f.label}</label>`;
      html += `<select class="zbod-select" id="div-${f.key}" style="max-width:100%;" onchange="app.handleDivisionSelectChange('${f.key}', this.value)"><option value="">${f.placeholder}</option>`;
      f.options.forEach(opt => html += `<option value="${opt}">${opt}</option>`);
      html += `</select>`;
      html += `<input type="text" class="zbod-input mt-2 hidden" id="div-${f.key}-other" placeholder="">`;
      html += `</div>`;
      return html;
    }
    return `<div><label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;">${f.label}</label><input type="${f.type}" class="zbod-input" id="div-${f.key}" placeholder="${f.placeholder}" oninput="if(this.type==='number'){this.dataset.rawValue=this.value;}"></div>`;
  }).join('');
}

// ═══════════════════════════════════════════
// RENDER: KEY FINDINGS (AAA Section)
// ═══════════════════════════════════════════
function renderAAA(div) {
  const cards = getAAACards()[div.id] || [];
  const editCardIdx = state.aaaEditCardIdx;

  const headerHtml = `<div class="aaa-header">
    <div class="aaa-title-wrap">
      <div class="aaa-badge">${ICONS.activity}</div>
      <span class="aaa-title">Key Findings</span>
    </div>
    <button onclick="app.addAAACard()" class="zbod-btn-primary" style="padding:6px 16px;font-size:12px;">${ICONS.plus} Add Findings</button>
  </div>`;

  let cardsHtml = '';
  if (cards.length === 0 && editCardIdx === null) {
    cardsHtml = `<p class="aaa-empty">No findings added yet.</p>`;
  } else {
    cardsHtml = `<div class="aaa-grid">${cards.map((card, idx) => {
      if (editCardIdx === idx) {
        return `<div class="aaa-insight-card aaa-insight-editing">
          <textarea class="aaa-textarea" id="aaa-card-${idx}" rows="3" placeholder="">${escHtml(state.aaaCards[div.id]?.[idx] !== undefined ? state.aaaCards[div.id][idx] : card)}</textarea>
          <div class="flex gap-2 mt-2">
            <button onclick="app.saveAAACard(${idx})" class="zbod-btn-primary" style="padding:6px 14px;font-size:12px;">${ICONS.save} Save</button>
            <button onclick="app.cancelAAACardEdit()" class="zbod-btn-secondary" style="padding:6px 14px;font-size:12px;">${ICONS.x} Cancel</button>
          </div>
        </div>`;
      }
      return `<div class="aaa-insight-card" style="position:relative;">
        <button onclick="app.deleteAAACard(${idx})" class="aaa-close-btn" title="Remove">&times;</button>
        <div class="aaa-card-body">${escHtml(card)}</div>
      </div>`;
    }).join('')}</div>`;
  }

  return `<div class="zbod-card p-6">
    <div class="aaa-section">
      ${headerHtml}
      ${cardsHtml}
    </div>
  </div>`;
}


// ═══════════════════════════════════════════
// RENDER: WORKSPACE PAGE
// ═══════════════════════════════════════════
async function renderWorkspace() {
  const div = getDivs().find(d => d.id === state.selectedDivisionId);
  if (!div) return;
  const ws = getWs().filter(w => w.division_id === div.id);
  const draftWs = ws.filter(w => w.status === 'draft');
  const completedWs = ws.filter(w => w.status === 'completed');
  const asIsFns = getAsIs().filter(f => f.division_id === div.id);
  const structureType = div.structure_type || 'Division';
  const workspaceTitle = getWorkspaceTitle(structureType);
  const dataBoxTitle = getDataBoxTitle(structureType);
  const manageText = getManageText(structureType);

  document.getElementById('workspace-header').innerHTML = `
    <div class="flex items-center gap-4">
      <button class="zbod-btn-secondary" style="padding:10px 14px;" onclick="app.goToDivisions()">${ICONS.arrowLeft}</button>
      <div class="flex items-center gap-3">
        <div>
          <h1 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">${div.structure_name}</h1>
          <p style="font-size:12px;color:#6b7280;">${structureType} &mdash; ${div.c_level_name}</p>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <button class="zbod-btn-export" onclick="app.exportToExcel()">${ICONS.download} Export Report</button>
      <button class="zbod-btn-secondary" onclick="app.goToHistory()">${ICONS.history} Previous Workshops</button>
    </div>`;

  let divDataHtml = '';
  if (state.editingDivision) {
    const ef = state._divEditForm || {};
    const editLabels = { current_total_hc: 'Current Total Headcount', headcount_target: 'Headcount Target', current_total_budget: 'Current Total Budget (AZN)', budget_target: 'Budget Target (AZN)' };
    const editFields = ['current_total_hc','headcount_target','current_total_budget','budget_target'];
    divDataHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${editFields.map(k => `<div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">${editLabels[k]}</label><input type="number" class="zbod-input" id="wdiv-${k}" value="${ef[k] !== undefined ? ef[k] : (div[k] || 0)}" onwheel="return false;"></div>`).join('')}</div>`;
  } else {
    const asIsMgrs = asIsFns.reduce((s, f) => s + (f.manager_count || 0), 0);
    const asIsProfs = asIsFns.reduce((s, f) => s + (f.current_employee_count || 0), 0);
    const card = (icon, label, value, color) => `<div style="padding:16px;border-radius:12px;background:${color === 'blue' ? 'rgba(15,60,118,0.04)' : 'rgba(46,100,44,0.04)'};border:1px solid ${color === 'blue' ? 'rgba(15,60,118,0.1)' : 'rgba(46,100,44,0.1)'}"><div class="flex items-center gap-2 mb-1">${icon}<span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${label}</span></div><p style="font-size:20px;font-weight:700;color:${color === 'blue' ? '#0F3C76' : '#111827'};">${formatNumber(value)}</p></div>`;
    divDataHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${card(ICONS.users, 'Current Total Headcount', div.current_total_hc || 0, 'green')}
      ${card(ICONS.target, 'Headcount Target', div.headcount_target || 0, 'blue')}
      ${card(ICONS.userCog, 'Managers', asIsMgrs, 'green')}
      ${card(ICONS.dollar, 'Current Total Budget (AZN)', div.current_total_budget || 0, 'green')}
      ${card(ICONS.dollar, 'Budget Target (AZN)', div.budget_target || 0, 'blue')}
      ${card(ICONS.users, 'Professionals', asIsProfs, 'green')}
    </div>`;
  }

  let asIsHtml = '';
  const totalAsIsHC = asIsFns.reduce((s, f) => s + (f.current_function_hc || 0), 0);
  const totalAsIsBudget = asIsFns.reduce((s, f) => s + ((f.managers_cost || 0) + (f.professionals_cost || 0)), 0);

  const asIsCardStyle = 'background:#ffffff;border:1.5px solid #e5e7eb;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.02);transition:box-shadow 0.3s ease;';
  const asIsSectionTitle = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f3f4f6;';
  const asIsInputLabel = 'font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:6px;display:block;';
  const asIsAllocStyle = 'font-size:13px;font-weight:700;color:#0F3C76;';
  const asIsSummaryBox = 'background:linear-gradient(135deg,rgba(15,60,118,0.06) 0%,rgba(46,100,44,0.04) 100%);border:1.5px solid rgba(15,60,118,0.15);border-radius:12px;padding:16px 20px;margin-top:16px;';

  const renderAsIsInput = (label, value, onchange, placeholder) => `<div><span style="${asIsInputLabel}">${label}</span><input type="number" class="zbod-input w-full" style="padding:8px 10px;font-size:14px;" value="${value}" onchange="${onchange}" placeholder="${placeholder || '0'}" onwheel="return false;"></div>`;
  const renderAsIsPct = (label, value) => `<div><span style="${asIsInputLabel}">${label}</span><span style="${asIsAllocStyle}">${value}</span></div>`;

  // Returns all descendant IDs of a given AS-IS function (to prevent circular parents)
  const asIsDescendants = (fnId, allFns) => {
    const result = new Set();
    const q = [fnId];
    while (q.length) {
      const cur = q.shift();
      allFns.filter(f => f.parent_id === cur).forEach(c => { if (!result.has(c.id)) { result.add(c.id); q.push(c.id); } });
    }
    return result;
  };

  // Given a parentId, return the HC and Budget denominator for allocation %
  const asIsParentBase = (parentId) => {
    if (!parentId) return { hc: div.current_total_hc || 0, budget: div.current_total_budget || 0, label: div.structure_name || 'Division' };
    const p = asIsFns.find(f => f.id === parentId);
    if (!p) return { hc: div.current_total_hc || 0, budget: div.current_total_budget || 0, label: div.structure_name || 'Division' };
    return { hc: p.current_function_hc || 0, budget: (p.managers_cost || 0) + (p.professionals_cost || 0), label: p.function_name || 'Parent' };
  };

  // Parent dropdown for new rows (fnId='' means self-exclusion irrelevant; exclude descendants of nothing)
  const renderParentDropdownNew = (currentParentId, rowIdx) => {
    const opts = asIsFns.map(f =>
      `<option value="${f.id}" ${currentParentId === f.id ? 'selected' : ''}>${f.function_name || 'Unnamed'}</option>`
    ).join('');
    return `<div style="margin-bottom:20px;"><span style="${asIsInputLabel}">Parent Function</span><select class="zbod-select w-full" style="padding:8px 10px;font-size:14px;" onchange="app.updateAsIsNewRow('${state.asIsNewRows[rowIdx]?.id}','parentId',this.value);renderWorkspace()"><option value="" ${!currentParentId ? 'selected' : ''}>${div.structure_name || 'Main Division / Structure'}</option>${opts}</select></div>`;
  };

  // Parent dropdown for saved functions
  const renderParentDropdown = (fn, currentParentId, onchange) => {
    const descendants = asIsDescendants(fn.id, asIsFns);
    const opts = asIsFns.filter(f => f.id !== fn.id && !descendants.has(f.id)).map(f =>
      `<option value="${f.id}" ${currentParentId === f.id ? 'selected' : ''}>${f.function_name || 'Unnamed'}</option>`
    ).join('');
    return `<div style="margin-bottom:20px;"><span style="${asIsInputLabel}">Parent Function</span><select class="zbod-select w-full" style="padding:8px 10px;font-size:14px;" onchange="${onchange}"><option value="" ${!currentParentId ? 'selected' : ''}>${div.structure_name || 'Main Division / Structure'}</option>${opts}</select></div>`;
  };

  // Build topological order: parents before children, with depth for indentation
  const asIsFnIds = new Set(asIsFns.map(f => f.id));
  const asIsOrdered = [];
  const asIsVisited = new Set();
  const asIsVisitFn = (parentId, depth) => {
    asIsFns.filter(f => {
      const pid = (f.parent_id && asIsFnIds.has(f.parent_id)) ? f.parent_id : null;
      return pid === parentId;
    }).forEach(f => {
      if (!asIsVisited.has(f.id)) {
        asIsVisited.add(f.id);
        asIsOrdered.push({ fn: f, depth });
        asIsVisitFn(f.id, depth + 1);
      }
    });
  };
  asIsVisitFn(null, 0);
  // Fallback: any functions not yet visited (orphaned by deleted parents) at depth 0
  asIsFns.forEach(f => { if (!asIsVisited.has(f.id)) asIsOrdered.push({ fn: f, depth: 0 }); });

  // NEW FUNCTION CARDS (always shown at root level, depth 0)
  asIsHtml += state.asIsNewRows.map((row, idx) => {
    const mgr = parseInt(row.mgr) || 0;
    const emp = parseInt(row.emp) || 0;
    const mgrCost = parseFloat(row.mgrcost) || 0;
    const profCost = parseFloat(row.profcost) || 0;
    const totalCost = mgrCost + profCost;
    const totalHC = mgr + emp;
    const base = asIsParentBase(row.parentId || null);
    const mgrHcPct = base.hc > 0 ? ((mgr / base.hc) * 100).toFixed(1) + '%' : '-';
    const profHcPct = base.hc > 0 ? ((emp / base.hc) * 100).toFixed(1) + '%' : '-';
    const mgrCostPct = base.budget > 0 ? ((mgrCost / base.budget) * 100).toFixed(1) + '%' : '-';
    const profCostPct = base.budget > 0 ? ((profCost / base.budget) * 100).toFixed(1) + '%' : '-';
    return `<div style="${asIsCardStyle}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="font-size:12px;font-weight:700;color:#2E642C;background:rgba(46,100,44,0.08);padding:4px 12px;border-radius:6px;">#${asIsFns.length + idx + 1} &mdash; New Function</div>
        <div class="flex items-center gap-2"><button onclick="app.saveAsIsNewRow('${row.id}')" class="zbod-btn-primary" style="padding:6px 16px;font-size:12px;">${ICONS.save} Save</button><button onclick="app.cancelAsIsNewRow('${row.id}')" class="zbod-btn-secondary" style="padding:6px 16px;font-size:12px;">${ICONS.x} Cancel</button></div>
      </div>
      <div style="margin-bottom:20px;"><span style="${asIsInputLabel}">Function Title</span><input class="zbod-input w-full" style="padding:10px 12px;font-size:15px;font-weight:600;" value="${row.name}" onchange="app.updateAsIsNewRow('${row.id}','name',this.value)" placeholder="Enter function name"></div>
      ${renderParentDropdownNew(row.parentId || '', idx)}
      <div style="${asIsSectionTitle}">People Allocation</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        ${renderAsIsInput('Managers', row.mgr, `app.updateAsIsNewRow('${row.id}','mgr',this.value);renderWorkspace()`, '0')}
        ${renderAsIsPct('HC Allocation %', mgrHcPct)}
        ${renderAsIsInput('Professionals', row.emp, `app.updateAsIsNewRow('${row.id}','emp',this.value);renderWorkspace()`, '0')}
        ${renderAsIsPct('HC Allocation %', profHcPct)}
      </div>
      <div style="${asIsSummaryBox}">
        <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Actual HC Summary</span>
        <span style="font-size:24px;font-weight:800;color:#111827;display:block;margin-top:4px;">${formatNumber(totalHC)} <span style="font-size:14px;font-weight:600;color:#6b7280;">people</span></span>
      </div>
      <div style="${asIsSectionTitle}margin-top:16px;">Cost Allocation</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        ${renderAsIsInput('Managers Cost (AZN)', row.mgrcost || '', `app.updateAsIsNewRow('${row.id}','mgrcost',this.value);renderWorkspace()`, '0')}
        ${renderAsIsPct('Cost Allocation %', mgrCostPct)}
        ${renderAsIsInput('Professionals Cost (AZN)', row.profcost || '', `app.updateAsIsNewRow('${row.id}','profcost',this.value);renderWorkspace()`, '0')}
        ${renderAsIsPct('Cost Allocation %', profCostPct)}
      </div>
      <div style="${asIsSummaryBox}">
        <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Actual Cost Summary</span>
        <span style="font-size:24px;font-weight:800;color:#111827;display:block;margin-top:4px;">${formatNumber(totalCost)} <span style="font-size:14px;font-weight:600;color:#6b7280;">AZN</span></span>
      </div>
    </div>`;
  }).join('');

  if (asIsFns.length === 0 && state.asIsNewRows.length === 0) {
    asIsHtml += `<div class="text-center py-8"><div style="margin-bottom:12px;">${ICONS.fileText}</div><p style="color:#6b7280;font-size:14px;">No current functions added yet</p><p style="color:#6b7280;font-size:12px;">Add your current organizational functions here.</p></div>`;
  } else {
    asIsHtml += asIsOrdered.map(({ fn, depth }, orderedIdx) => {
      const indentStyle = depth > 0 ? `margin-left:${Math.min(depth, 4) * 28}px;border-left:3px solid rgba(46,100,44,0.18);` : '';
      const cardStyle = asIsCardStyle + indentStyle;
      const parentId = (fn.parent_id && asIsFnIds.has(fn.parent_id)) ? fn.parent_id : null;
      const base = asIsParentBase(parentId);

      const edit = state.asIsEditing[fn.id];
      if (edit) {
        const mgr = parseInt(edit.mgr) || 0;
        const emp = parseInt(edit.emp) || 0;
        const mgrCost = parseFloat(edit.mgrcost) || 0;
        const profCost = parseFloat(edit.profcost) || 0;
        const totalCost = mgrCost + profCost;
        const totalHC = mgr + emp;
        const editParentId = edit.parentId !== undefined ? edit.parentId : parentId;
        const editBase = asIsParentBase(editParentId);
        const mgrHcPct = editBase.hc > 0 ? ((mgr / editBase.hc) * 100).toFixed(1) + '%' : '-';
        const profHcPct = editBase.hc > 0 ? ((emp / editBase.hc) * 100).toFixed(1) + '%' : '-';
        const mgrCostPct = editBase.budget > 0 ? ((mgrCost / editBase.budget) * 100).toFixed(1) + '%' : '-';
        const profCostPct = editBase.budget > 0 ? ((profCost / editBase.budget) * 100).toFixed(1) + '%' : '-';
        return `<div style="${cardStyle}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <div style="font-size:12px;font-weight:700;color:#2E642C;background:rgba(46,100,44,0.08);padding:4px 12px;border-radius:6px;">#${orderedIdx+1}</div>
            <div class="flex items-center gap-2"><button onclick="app.saveAsIsEdit('${fn.id}')" class="zbod-btn-primary" style="padding:6px 16px;font-size:12px;">${ICONS.save} Save</button><button onclick="app.cancelAsIsEdit('${fn.id}')" class="zbod-btn-secondary" style="padding:6px 16px;font-size:12px;">${ICONS.x} Cancel</button></div>
          </div>
          <div style="margin-bottom:20px;"><span style="${asIsInputLabel}">Function Title</span><input class="zbod-input w-full" style="padding:10px 12px;font-size:15px;font-weight:600;" value="${edit.name}" onchange="app.updateAsIsEdit('${fn.id}','name',this.value)" placeholder="Enter function name"></div>
          ${renderParentDropdown(fn, editParentId, `app.updateAsIsEdit('${fn.id}','parentId',this.value);renderWorkspace()`)}
          <div style="${asIsSectionTitle}">People Allocation</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            ${renderAsIsInput('Managers', edit.mgr, `app.updateAsIsEdit('${fn.id}','mgr',this.value);renderWorkspace()`, '0')}
            ${renderAsIsPct('HC Allocation %', mgrHcPct)}
            ${renderAsIsInput('Professionals', edit.emp, `app.updateAsIsEdit('${fn.id}','emp',this.value);renderWorkspace()`, '0')}
            ${renderAsIsPct('HC Allocation %', profHcPct)}
          </div>
          <div style="${asIsSummaryBox}">
            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Actual HC Summary</span>
            <span style="font-size:24px;font-weight:800;color:#111827;display:block;margin-top:4px;">${formatNumber(totalHC)} <span style="font-size:14px;font-weight:600;color:#6b7280;">people</span></span>
          </div>
          <div style="${asIsSectionTitle}margin-top:16px;">Cost Allocation</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            ${renderAsIsInput('Managers Cost (AZN)', edit.mgrcost || '', `app.updateAsIsEdit('${fn.id}','mgrcost',this.value);renderWorkspace()`, '0')}
            ${renderAsIsPct('Cost Allocation %', mgrCostPct)}
            ${renderAsIsInput('Professionals Cost (AZN)', edit.profcost || '', `app.updateAsIsEdit('${fn.id}','profcost',this.value);renderWorkspace()`, '0')}
            ${renderAsIsPct('Cost Allocation %', profCostPct)}
          </div>
          <div style="${asIsSummaryBox}">
            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Actual Cost Summary</span>
            <span style="font-size:24px;font-weight:800;color:#111827;display:block;margin-top:4px;">${formatNumber(totalCost)} <span style="font-size:14px;font-weight:600;color:#6b7280;">AZN</span></span>
          </div>
        </div>`;
      }
      const mgr = fn.manager_count || 0;
      const emp = fn.current_employee_count || 0;
      const mgrCost = fn.managers_cost || 0;
      const profCost = fn.professionals_cost || 0;
      const totalCost = mgrCost + profCost;
      const totalHC = mgr + emp;
      const mgrHcPct = base.hc > 0 ? ((mgr / base.hc) * 100).toFixed(1) + '%' : '-';
      const profHcPct = base.hc > 0 ? ((emp / base.hc) * 100).toFixed(1) + '%' : '-';
      const mgrCostPct = base.budget > 0 ? ((mgrCost / base.budget) * 100).toFixed(1) + '%' : '-';
      const profCostPct = base.budget > 0 ? ((profCost / base.budget) * 100).toFixed(1) + '%' : '-';
      const parentLabel = parentId ? (asIsFns.find(f => f.id === parentId)?.function_name || 'Parent') : (div.structure_name || 'Main Division / Structure');
      if (state.asIsSaved) {
        // READONLY mode
        return `<div style="${cardStyle}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <div style="font-size:12px;font-weight:700;color:#2E642C;background:rgba(46,100,44,0.08);padding:4px 12px;border-radius:6px;">#${orderedIdx+1}</div>
            <button onclick="app.deleteAsIs('${fn.id}')" style="color:#6b7280;padding:6px;">${ICONS.trash}</button>
          </div>
          <div style="margin-bottom:20px;"><span style="${asIsInputLabel}">Function Title</span><p style="font-size:16px;font-weight:700;color:#111827;padding:10px 0;">${fn.function_name}</p></div>
          <div style="margin-bottom:20px;"><span style="${asIsInputLabel}">Parent Function</span><p style="font-size:14px;font-weight:600;color:#374151;padding:6px 0;">${parentLabel}</p></div>
          <div style="${asIsSectionTitle}">People Allocation</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><span style="${asIsInputLabel}">Managers</span><span style="font-size:15px;font-weight:700;color:#111827;">${formatNumber(mgr)}</span></div>
            <div><span style="${asIsInputLabel}">HC Allocation %</span><span style="${asIsAllocStyle}">${mgrHcPct}</span></div>
            <div><span style="${asIsInputLabel}">Professionals</span><span style="font-size:15px;font-weight:700;color:#111827;">${formatNumber(emp)}</span></div>
            <div><span style="${asIsInputLabel}">HC Allocation %</span><span style="${asIsAllocStyle}">${profHcPct}</span></div>
          </div>
          <div style="${asIsSummaryBox}">
            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Actual HC Summary</span>
            <span style="font-size:24px;font-weight:800;color:#111827;display:block;margin-top:4px;">${formatNumber(totalHC)} <span style="font-size:14px;font-weight:600;color:#6b7280;">people</span></span>
          </div>
          <div style="${asIsSectionTitle}margin-top:16px;">Cost Allocation</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><span style="${asIsInputLabel}">Managers Cost</span><span style="font-size:15px;font-weight:700;color:#111827;">${formatNumber(mgrCost)} <span style="font-size:12px;color:#6b7280;">AZN</span></span></div>
            <div><span style="${asIsInputLabel}">Cost Allocation %</span><span style="${asIsAllocStyle}">${mgrCostPct}</span></div>
            <div><span style="${asIsInputLabel}">Professionals Cost</span><span style="font-size:15px;font-weight:700;color:#111827;">${formatNumber(profCost)} <span style="font-size:12px;color:#6b7280;">AZN</span></span></div>
            <div><span style="${asIsInputLabel}">Cost Allocation %</span><span style="${asIsAllocStyle}">${profCostPct}</span></div>
          </div>
          <div style="${asIsSummaryBox}">
            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Actual Cost Summary</span>
            <span style="font-size:24px;font-weight:800;color:#111827;display:block;margin-top:4px;">${formatNumber(totalCost)} <span style="font-size:14px;font-weight:600;color:#6b7280;">AZN</span></span>
          </div>
        </div>`;
      }
      // EDITABLE mode (inline inputs, no per-card buttons)
      return `<div style="${cardStyle}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;color:#2E642C;background:rgba(46,100,44,0.08);padding:4px 12px;border-radius:6px;">#${orderedIdx+1}</div>
          <button onclick="app.deleteAsIs('${fn.id}')" style="color:#6b7280;padding:6px;">${ICONS.trash}</button>
        </div>
        <div style="margin-bottom:20px;"><span style="${asIsInputLabel}">Function Title</span><input class="zbod-input w-full" style="padding:10px 12px;font-size:15px;font-weight:600;" value="${fn.function_name}" onchange="app.updateAsIsInline('${fn.id}','function_name',this.value)" placeholder="Enter function name"></div>
        ${renderParentDropdown(fn, parentId, `app.updateAsIsInline('${fn.id}','parent_id',this.value);renderWorkspace()`)}
        <div style="${asIsSectionTitle}">People Allocation</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          ${renderAsIsInput('Managers', fn.manager_count || '', `app.updateAsIsInline('${fn.id}','manager_count',this.value);renderWorkspace()`, '0')}
          ${renderAsIsPct('HC Allocation %', mgrHcPct)}
          ${renderAsIsInput('Professionals', fn.current_employee_count || '', `app.updateAsIsInline('${fn.id}','current_employee_count',this.value);renderWorkspace()`, '0')}
          ${renderAsIsPct('HC Allocation %', profHcPct)}
        </div>
        <div style="${asIsSummaryBox}">
          <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Actual HC Summary</span>
          <span style="font-size:24px;font-weight:800;color:#111827;display:block;margin-top:4px;">${formatNumber(totalHC)} <span style="font-size:14px;font-weight:600;color:#6b7280;">people</span></span>
        </div>
        <div style="${asIsSectionTitle}margin-top:16px;">Cost Allocation</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          ${renderAsIsInput('Managers Cost (AZN)', fn.managers_cost || '', `app.updateAsIsInline('${fn.id}','managers_cost',this.value);renderWorkspace()`, '0')}
          ${renderAsIsPct('Cost Allocation %', mgrCostPct)}
          ${renderAsIsInput('Professionals Cost (AZN)', fn.professionals_cost || '', `app.updateAsIsInline('${fn.id}','professionals_cost',this.value);renderWorkspace()`, '0')}
          ${renderAsIsPct('Cost Allocation %', profCostPct)}
        </div>
        <div style="${asIsSummaryBox}">
          <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Actual Cost Summary</span>
          <span style="font-size:24px;font-weight:800;color:#111827;display:block;margin-top:4px;">${formatNumber(totalCost)} <span style="font-size:14px;font-weight:600;color:#6b7280;">AZN</span></span>
        </div>
      </div>`;
    }).join('');
  }

  let workshopHtml = '';
  if (draftWs.length > 0) {
    workshopHtml = `<p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#92400e;margin-bottom:8px;">${ICONS.alertTriangle} Draft Workshops &mdash; Click to Continue</p><div class="space-y-3">`;
    draftWs.forEach(w => {
      const color = w.phase === 1 ? 'rgba(146,64,14,0.1);color:#92400e' : w.phase === 2 ? 'rgba(46,100,44,0.1);color:#2E642C' : 'rgba(15,60,118,0.1);color:#0F3C76';
      workshopHtml += `<div class="zbod-card p-4 flex items-center justify-between" style="cursor:pointer;" onclick="app.resumeWorkshop('${w.id}',${w.phase})"><div class="flex items-center gap-3"><div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;background:${color};">${w.phase}</div><div><p style="font-size:14px;font-weight:600;color:#111827;">Workshop in Progress</p><p style="font-size:12px;color:#6b7280;">Phase ${w.phase} of 3</p></div></div>${ICONS.chevronRight}</div>`;
    });
    workshopHtml += '</div>';
  } else {
    workshopHtml = `<div class="text-center py-8"><p style="color:#6b7280;font-size:14px;">No active workshops</p><p style="color:#6b7280;font-size:12px;">Click "New Workshop" to start.</p></div>`;
  }

  let historyHtml = '';
  if (completedWs.length === 0) {
    historyHtml = `<div class="text-center py-8"><p style="color:#6b7280;font-size:14px;">No completed workshops yet</p></div>`;
  } else {
    historyHtml = `<div class="space-y-3" style="max-height:256px;overflow-y:auto;">${completedWs.map(w => `<button onclick="app.goToHistory()" class="zbod-card p-3 flex items-center gap-3 text-left zbod-card-hover" style="width:100%;">${ICONS.calendar}<div class="flex-1"><p style="font-size:14px;color:#111827;">${new Date(w.created_at).toLocaleDateString()} ${new Date(w.created_at).toLocaleTimeString()}</p></div>${ICONS.chevronRight}</button>`).join('')}</div>`;
  }

  const defaultMetrics = [
    { id: 'm1', label: 'Management Layers', value: '', type: 'number' },
    { id: 'm2', label: 'Average Span of Control', value: '', type: 'number' },
    { id: 'm3', label: 'High Grade Employees', value: '', type: 'number' },
    { id: 'm4', label: 'Low Grade Employees', value: '', type: 'number' },
    { id: 'm5', label: 'Multi-layered Deputy Hierarchy', value: '', type: 'select', options: ['Exist', 'Do not exist', '-'] },
    { id: 'm6', label: 'Decentralized and Centralized', value: '', type: 'select', options: ['Decentralized', 'Centralized', '-'] },
    { id: 'm7', label: 'Duplicated Functions', value: '', type: 'select', options: ['Exist', 'Do not exist', '-'] },
    { id: 'm8', label: 'Shadow Support Functions', value: '', type: 'select', options: ['Exist', 'Do not exist', 'Other'], customValue: '' },
    { id: 'm9', label: 'Complex Manual Based Process and Job', value: '', type: 'text' },
    { id: 'm10', label: 'Shared Services Opportunities', value: '', type: 'text' },
    { id: 'm11', label: 'Automation & AI Opportunities (RPA)', value: '', type: 'text' },
    { id: 'm12', label: 'Outsourcing Opportunity', value: '', type: 'text' },
    { id: 'm13', label: 'HC Optimization, incl. respective employee costs \u2014 if automation or outsourcing will be realized', value: '', type: 'text' },
    { id: 'm14', label: 'HC Avoided New Hiring, incl. respective employee costs \u2014 if automation or outsourcing will be realized', value: '', type: 'text' },
    { id: 'm15', label: 'Cost Median for Managers', value: '', type: 'number' },
    { id: 'm16', label: 'Cost Median for Professionals', value: '', type: 'number' },
  ];
  const savedMetrics = getMetrics()[div.id] || defaultMetrics;
  savedMetrics.forEach((m, i) => { if (!m.type && defaultMetrics[i]) m.type = defaultMetrics[i].type; if (!m.type) m.type = 'text'; });
  // Backward compat: m8 was free-text; if saved value isn't a dropdown option, treat as "Other" + custom text
  const m8 = savedMetrics.find(m => m.id === 'm8');
  if (m8 && m8.type === 'select' && m8.value && !m8.options.includes(m8.value)) {
    m8.customValue = m8.value;
    m8.value = 'Other';
  }

  const draft = state.metricsDraft[div.id] || {};
  savedMetrics.forEach((m, idx) => { if (draft[idx] !== undefined) m.value = draft[idx]; });

  // Compute median costs from AS-IS functions as defaults for m15/m16
  const mgrCosts = asIsFns.map(f => f.managers_cost);
  const profCosts = asIsFns.map(f => f.professionals_cost);
  const mgrMedian = computeMedian(mgrCosts);
  const profMedian = computeMedian(profCosts);

  // Ensure m15/m16 exist in savedMetrics (backward compat for old saves without them)
  if (!savedMetrics.find(m => m.id === 'm15')) savedMetrics.push({...defaultMetrics.find(m => m.id === 'm15')});
  if (!savedMetrics.find(m => m.id === 'm16')) savedMetrics.push({...defaultMetrics.find(m => m.id === 'm16')});

  // Default: use computed medians as initial values only when no persisted user value exists
  const allMetrics = getMetrics();
  const persisted = allMetrics[div.id] || [];
  const m15Idx = savedMetrics.findIndex(m => m.id === 'm15');
  const m16Idx = savedMetrics.findIndex(m => m.id === 'm16');
  if (m15Idx >= 0 && draft[m15Idx] === undefined && !persisted[m15Idx]) savedMetrics[m15Idx].value = mgrMedian;
  if (m16Idx >= 0 && draft[m16Idx] === undefined && !persisted[m16Idx]) savedMetrics[m16Idx].value = profMedian;

  const metricIcons = {
    m1: { icon: ICONS.layers, cls: 'metric-badge' },
    m2: { icon: ICONS.users, cls: 'metric-badge' },
    m3: { icon: ICONS.user, cls: 'metric-badge-green' },
    m4: { icon: ICONS.user, cls: 'metric-badge-green' },
    m5: { icon: ICONS.gitCompare, cls: 'metric-badge' },
    m6: { icon: ICONS.building, cls: 'metric-badge-amber' },
    m7: { icon: ICONS.barChart, cls: 'metric-badge' },
    m8: { icon: ICONS.activity, cls: 'metric-badge-green' },
    m9: { icon: ICONS.fileText, cls: 'metric-badge' },
    m10: { icon: ICONS.users, cls: 'metric-badge-green' },
    m11: { icon: ICONS.userCog, cls: 'metric-badge' },
    m12: { icon: ICONS.dollar, cls: 'metric-badge-green' },
    m13: { icon: ICONS.target, cls: 'metric-badge' },
    m14: { icon: ICONS.check, cls: 'metric-badge-green' },
    m15: { icon: ICONS.dollar, cls: 'metric-badge-green' },
    m16: { icon: ICONS.dollar, cls: 'metric-badge-green' },
  };

  let metricsHtml = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">`;
  savedMetrics.forEach((m, idx) => {
    const mi = metricIcons[m.id] || { icon: ICONS.activity, cls: 'metric-badge' };
    let inputEl = '';
    let extraEl = '';
    if (m.type === 'select') {
      inputEl = `<select class="metric-input-field" onchange="app.updateMetric(${idx}, this.value)${m.id === 'm8' ? ';renderWorkspace()' : ''}"><option value="">Select...</option>${(m.options || []).map(opt => `<option value="${opt}" ${m.value === opt ? 'selected' : ''}>${opt}</option>`).join('')}</select>`;
      if (m.id === 'm8' && m.value === 'Other') {
        extraEl = `<input class="metric-input-field mt-2" value="${m.customValue || ''}" oninput="app.updateMetricCustom(${idx}, this.value)" placeholder="">`;
      }
    } else if (m.type === 'number') {
      inputEl = `<input type="number" class="metric-input-field" value="${m.value}" oninput="app.updateMetric(${idx}, this.value)" onwheel="return false;" placeholder="0" min="0">`;
    } else {
      inputEl = `<input class="metric-input-field" value="${m.value}" oninput="app.updateMetric(${idx}, this.value)" placeholder="">`;
    }
    metricsHtml += `<div class="metric-card">
      <div class="metric-card-header">
        <div class="${mi.cls}">${mi.icon}</div>
        <span class="metric-label">${m.label}</span>
      </div>
      ${inputEl}${extraEl}
    </div>`;
  });
  metricsHtml += `</div><div class="mt-4"><button onclick="app.saveMetrics()" class="zbod-btn-primary" style="padding:8px 20px;font-size:13px;">${ICONS.save} Save Metrics</button></div>`;

  document.getElementById('workspace-content').innerHTML = `
    <div><h2 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:30px;color:#111827;margin-bottom:8px;">${workspaceTitle}</h2><p style="color:#6b7280;">${manageText}</p></div>
    <div class="zbod-card p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3"><div style="width:32px;height:32px;border-radius:8px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.target}</div><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">${dataBoxTitle}</h3></div>
        ${state.editingDivision
          ? `<div class="flex items-center gap-2"><button onclick="app.saveDivisionData()" class="zbod-btn-primary" style="padding:8px 16px;font-size:13px;">${ICONS.save} Save</button><button onclick="app.cancelDivisionEdit()" class="zbod-btn-secondary" style="padding:8px 16px;font-size:13px;">${ICONS.x} Cancel</button></div>`
          : `<button onclick="app.editDivisionData()" class="zbod-btn-secondary" style="padding:8px 16px;font-size:13px;">${ICONS.edit} Edit</button>`}
      </div>
      ${divDataHtml}
    </div>
    <div class="zbod-card p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3"><div style="width:32px;height:32px;border-radius:8px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.fileText}</div><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">Current Functions (AS-IS Baseline)</h3></div>
        <div class="flex items-center gap-3"><span style="font-size:12px;color:#6b7280;">${asIsFns.length} functions | Total HC: ${formatNumber(totalAsIsHC)} | Budget: ${formatNumber(totalAsIsBudget)} AZN</span>${state.asIsSaved ? `<button onclick="app.editAsIsSection()" class="zbod-btn-secondary" style="padding:8px 16px;font-size:13px;">${ICONS.edit} Edit</button>` : ''}<button onclick="app.addAsIsRow()" class="zbod-btn-primary" style="padding:8px 16px;font-size:13px;">${ICONS.plus} Add Function</button></div>
      </div>
      ${asIsHtml}
      ${!state.asIsSaved && (asIsFns.length > 0 || state.asIsNewRows.length > 0) ? `<div class="mt-4"><button onclick="app.saveAllAsIs()" class="zbod-btn-primary" style="padding:10px 24px;font-size:14px;">${ICONS.save} Save All Functions</button></div>` : ''}
    </div>
    <div class="zbod-card p-6">
      <div class="flex items-center gap-3 mb-4"><img src="logo.png" alt="Azerconnect" style="height:28px;width:auto;object-fit:contain;"><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#0F3C76;">AS-IS Metrics</h3></div>
      ${metricsHtml}
    </div>
    ${renderAAA(div)}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="zbod-card p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3"><div style="width:40px;height:40px;border-radius:8px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.userCheck}</div><div><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">Workshop</h3><p style="font-size:12px;color:#6b7280;">TO-BE Organizational Design</p></div></div>
          <button onclick="app.showWorkshopDialog()" class="zbod-btn-primary" style="padding:8px 16px;font-size:13px;">${ICONS.plus} New Workshop</button>
        </div>
        ${workshopHtml}
      </div>
      <div class="zbod-card p-6">
        <div class="flex items-center gap-3 mb-6"><div style="width:40px;height:40px;border-radius:8px;background:rgba(15,60,118,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.history}</div><div><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">Previous Workshops</h3><p style="font-size:12px;color:#6b7280;">${completedWs.length} completed workshops</p></div></div>
        ${historyHtml}
      </div>
    </div>`;
}


// ═══════════════════════════════════════════
// RENDER: WORKSHOP PHASE 1
// ═══════════════════════════════════════════
function renderPhase1() {
  const ws = getWs().find(w => w.id === state.selectedWorkshopId);
  if (!ws) return;
  const div = getDivs().find(d => d.id === ws.division_id);
  if (!div) return;
  const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);

  document.getElementById('phase1-header').innerHTML = `
    <div class="flex items-center gap-4 max-w-7xl mx-auto">
      <button class="zbod-btn-secondary" style="padding:10px 14px;" onclick="app.confirmQuitPhase()">${ICONS.arrowLeft}</button>
      <div class="flex items-center gap-3"><div style="width:32px;height:32px;border-radius:8px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.target}</div><h1 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">${div.structure_name}</h1></div>
    </div>
    <div class="flex items-center gap-3"><span style="font-size:13px;color:#6b7280;">Phase 1 of 3</span><button onclick="app.confirmQuitPhase()" class="zbod-btn-secondary" style="padding:8px 16px;font-size:13px;">${ICONS.x} Cancel</button></div>`;

  const isFnComplete = (f) => {
    return f.proposed_function_name && f.career_level && f.can_be_eliminated && f.can_be_automated && f.can_be_outsourced;
  };

  let html = `<div class="flex gap-6" style="min-height:600px;">
    <div style="width:50%;flex-shrink:0;">
      <div class="flex items-center justify-between mb-6">
        <div><h2 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:24px;color:#111827;">Function Identification & Justification</h2><p style="font-size:14px;color:#6b7280;">Define or justify each function for the proposed organizational structure.</p></div>
        <div class="flex items-center gap-3">
          <span style="font-size:13px;color:#6b7280;">${fns.filter(isFnComplete).length} of ${fns.length} functions completed</span>
          <button onclick="app.toggleLayerGuide()" class="zbod-btn-secondary" style="padding:8px 16px;font-size:13px;" id="layer-guide-btn">${ICONS.helpCircle} Management Layer Guide</button>
          <button onclick="app.addProposedFunction()" class="zbod-btn-primary" style="padding:8px 16px;font-size:13px;">${ICONS.plus} Add Function</button>
        </div>
      </div>
      <div id="layer-guide-box" class="layer-guide-box hidden">
        <div class="layer-guide-box__header">
          <strong>Management Layer Guide</strong>
        </div>
        <ul class="layer-guide-list">
          <li><b>Senior Management</b> – Strategic leadership and executive oversight</li>
          <li><b>Middle Management</b> – Department heads and operational management</li>
          <li><b>Lower Management</b> – Team leads and front-line supervision</li>
        </ul>
      </div>
      <div class="zbod-card p-4 mb-6" style="background:rgba(15,60,118,0.04);border:1px solid rgba(15,60,118,0.15);">
        <div class="flex items-center gap-6 flex-wrap">
          <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;">Workplace Targets (Reference Only)</span>
          <span style="font-size:14px;color:#111827;"><strong style="color:#0F3C76;">Target HC:</strong> ${formatNumber(div.headcount_target || 0)}</span>
          <span style="font-size:14px;color:#111827;"><strong style="color:#0F3C76;">Target Budget:</strong> ${formatNumber(div.budget_target || 0)} AZN</span>
        </div>
      </div>`;

  if (fns.length === 0) {
    html += `<div class="text-center py-12"><div style="margin-bottom:12px;">${ICONS.fileText}</div><p style="color:#6b7280;">No functions added yet</p><p style="color:#6b7280;font-size:12px;">Add your first proposed function</p></div>`;
  } else {
    html += `<div class="space-y-4">`;
    fns.forEach(f => {
      const raw = state.editingValues[f.id] || {};
      const isComplete = isFnComplete(f);
      const elim = raw.can_be_eliminated !== undefined ? raw.can_be_eliminated : (f.can_be_eliminated || '');
      const auto = raw.can_be_automated !== undefined ? raw.can_be_automated : (f.can_be_automated || '');
      const out = raw.can_be_outsourced !== undefined ? raw.can_be_outsourced : (f.can_be_outsourced || '');
      let alertHtml = '';
      if (elim && auto && out) {
        const alertText = computePhase1Alert(elim, auto, out);
        const yesCount = (elim === 'Yes' ? 1 : 0) + (auto === 'Yes' ? 1 : 0) + (out === 'Yes' ? 1 : 0);
        if (alertText) {
          if (alertText.includes('PASSED')) {
            alertHtml = `<div class="p1-alert p1-alert--pass"><div class="p1-alert__icon">${ICONS.checkCircle}</div><span class="p1-alert__text">${alertText}</span></div>`;
          } else if (yesCount === 3) {
            alertHtml = `<div class="p1-alert p1-alert--critical"><div class="p1-alert__icon">${ICONS.xCircle}</div><span class="p1-alert__text">${alertText}</span></div>`;
          } else {
            alertHtml = `<div class="p1-alert p1-alert--warn"><div class="p1-alert__icon">${ICONS.alertTriangle}</div><span class="p1-alert__text">${alertText}</span></div>`;
          }
        }
      }
      html += `<div class="zbod-card p-5">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:36px;height:36px;border-radius:50%;background:${isComplete ? 'linear-gradient(135deg, #2E642C 0%, #184016 100%)' : '#e5e7eb'};color:${isComplete ? '#FFF' : '#9ca3af'};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">${f.function_number}</div>
          <div class="flex-1"><input class="zbod-input" value="${raw.proposed_function_name !== undefined ? raw.proposed_function_name : (f.proposed_function_name || '')}" onchange="app.updatePhase1Value('${f.id}','proposed_function_name',this.value)" placeholder="" style="font-weight:600;"></div>
          <button onclick="app.removeProposedFunction('${f.id}')" style="color:#9ca3af;padding:4px;">${ICONS.trash}</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Management Layer *</label><select class="zbod-select w-full" onchange="app.updatePhase1Value('${f.id}','career_level',this.value)"><option value="">Select layer</option><option value="Senior Management" ${(f.career_level||'')==='Senior Management'?'selected':''}>Senior Management</option><option value="Middle Management" ${(f.career_level||'')==='Middle Management'?'selected':''}>Middle Management</option><option value="Lower Management" ${(f.career_level||'')==='Lower Management'?'selected':''}>Lower Management</option></select></div>

          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Structure Type</label><select class="zbod-select w-full" onchange="app.updatePhase1Value('${f.id}','function_structure_type',this.value)"><option value="">Select type</option><option value="Department" ${(f.function_structure_type||'')==='Department'?'selected':''}>Department</option><option value="Unit" ${(f.function_structure_type||'')==='Unit'?'selected':''}>Unit</option></select></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Parent</label><select class="zbod-select w-full" onchange="app.updatePhase1Value('${f.id}','parent_id',this.value)"><option value="">${div.structure_name || 'Workplace'}</option>${fns.filter(x => x.id !== f.id && x.proposed_function_name).map(x => `<option value="${x.id}" ${f.parent_id === x.id ? 'selected' : ''}>${x.proposed_function_name}</option>`).join('')}</select></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Can Be Eliminated? *</label><select class="zbod-select w-full" onchange="app.updatePhase1Value('${f.id}','can_be_eliminated',this.value)"><option value="">Select</option><option value="Yes" ${(f.can_be_eliminated||'')==='Yes'?'selected':''}>Yes</option><option value="No" ${(f.can_be_eliminated||'')==='No'?'selected':''}>No</option></select></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Can Be Automated? *</label><select class="zbod-select w-full" onchange="app.updatePhase1Value('${f.id}','can_be_automated',this.value)"><option value="">Select</option><option value="Yes" ${(f.can_be_automated||'')==='Yes'?'selected':''}>Yes</option><option value="No" ${(f.can_be_automated||'')==='No'?'selected':''}>No</option></select></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Can Be Outsourced? *</label><select class="zbod-select w-full" onchange="app.updatePhase1Value('${f.id}','can_be_outsourced',this.value)"><option value="">Select</option><option value="Yes" ${(f.can_be_outsourced||'')==='Yes'?'selected':''}>Yes</option><option value="No" ${(f.can_be_outsourced||'')==='No'?'selected':''}>No</option></select></div>
          ${alertHtml}
          <div class="col-span-2"><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Justification</label><textarea class="zbod-textarea w-full" rows="3" onchange="app.updatePhase1Value('${f.id}','strategic_justification',this.value)" placeholder="">${raw.strategic_justification !== undefined ? raw.strategic_justification : (f.strategic_justification || '')}</textarea></div>
        </div>
      </div>`;
    });
    html += `</div>`;
  }
  html += `</div>
    <div style="width:50%;flex-shrink:0;">
      <div class="zbod-card p-4 sticky" style="top:80px;">
        <h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:16px;color:#111827;margin-bottom:16px;">Organization Chart (TO-BE)</h3>
        <div class="org-chart-container" style="padding:0;">
          ${renderOrgChart(fns, div.structure_name, div)}
        </div>
      </div>
    </div>
  </div>`;

  html += `<div class="flex justify-between mt-8 pt-6" style="border-top:1px solid rgba(46,100,44,0.1);">
    <button onclick="app.savePhase1()" class="zbod-btn-secondary" style="padding:10px 24px;">${ICONS.save} Save</button>
    <button onclick="app.goToPhase2()" class="zbod-btn-primary" style="padding:10px 24px;">Next: Business Impact ${ICONS.arrowRight}</button>
  </div>`;

  document.getElementById('phase1-content').innerHTML = html;
}

// ═══════════════════════════════════════════
// ORG CHART RENDERER
// ═══════════════════════════════════════════
function renderOrgChart(fns, workplaceName, divData) {
  if (!fns || fns.length === 0) {
    return `<div class="oc-viewport"><p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0;">Add functions to see org chart</p></div>`;
  }

  // ── Layout constants ──────────────────────────────────────────────────────
  // Node dimensions: wider cards + generous gaps ensure no overlap at any scale
  const NW  = 210;   // node card width
  const NH  = 120;   // node card height
  const RH  = 144;   // root card height
  const HG  = 48;    // horizontal gap between sibling subtree bounding boxes
  const VG  = 80;    // vertical gap between card bottom and next card top
  const PAD = 40;    // canvas padding on all sides

  // ── Build parent map (validated: only ids that exist in fns are parents) ─
  const fnIds = new Set(fns.map(f => f.id));
  const parentMap = {};          // parentId -> child[]
  const childOf   = {};          // childId  -> parentId

  // Pre-populate with all known ids so children lookup never returns undefined
  fnIds.forEach(id => { parentMap[id] = []; });
  parentMap['workplace'] = [];

  fns.forEach(f => {
    const pid = (f.parent_id && fnIds.has(f.parent_id)) ? f.parent_id : 'workplace';
    parentMap[pid].push(f);
    childOf[f.id] = pid;
  });

  const collapsed = window.orgCollapsedNodes || new Set();

  // ── Subtree width calculator (memoised) ──────────────────────────────────
  const _swCache = {};
  function subtreeW(nodeId) {
    if (_swCache[nodeId] !== undefined) return _swCache[nodeId];
    if (collapsed.has(nodeId)) return (_swCache[nodeId] = NW);
    const children = parentMap[nodeId] || [];
    if (children.length === 0) return (_swCache[nodeId] = NW);
    const total = children.reduce((s, c) => s + subtreeW(c.id), 0);
    return (_swCache[nodeId] = Math.max(NW, total + HG * (children.length - 1)));
  }

  // ── Tree placement (DFS, accumulates nodes[] and lines[]) ────────────────
  const nodes = [];   // { id, x, y, isRoot, cardH }
  const lines = [];   // { x1, y1, x2, y2 }

  function placeNode(nodeId, leftX, topY, isRoot) {
    const sw     = subtreeW(nodeId);
    const centerX = leftX + sw / 2;
    const cardX   = centerX - NW / 2;
    const cardH   = isRoot ? RH : NH;

    nodes.push({ id: nodeId, x: cardX, y: topY, isRoot, cardH });

    if (collapsed.has(nodeId)) return;
    const children = parentMap[nodeId] || [];
    if (children.length === 0) return;

    const parentBottomY = topY + cardH;
    const elbowY        = parentBottomY + VG / 2;
    const childTopY     = parentBottomY + VG;

    // Compute each child subtree's center x in left-to-right order
    let cursor = leftX;
    const childCenters = children.map(child => {
      const csw = subtreeW(child.id);
      const cc  = cursor + csw / 2;
      cursor   += csw + HG;
      return cc;
    });

    // Vertical stem: parent center-bottom → elbow
    lines.push({ x1: centerX, y1: parentBottomY, x2: centerX, y2: elbowY });

    // Horizontal bus at elbow level (only when >1 child)
    if (children.length > 1) {
      lines.push({
        x1: childCenters[0],
        y1: elbowY,
        x2: childCenters[childCenters.length - 1],
        y2: elbowY,
      });
    }

    // Vertical drops from elbow to each child, then recurse
    cursor = leftX;
    children.forEach((child, i) => {
      const csw = subtreeW(child.id);
      lines.push({ x1: childCenters[i], y1: elbowY, x2: childCenters[i], y2: childTopY });
      placeNode(child.id, cursor, childTopY, false);
      cursor += csw + HG;
    });
  }

  placeNode('workplace', PAD, PAD, true);

  // ── Canvas size ───────────────────────────────────────────────────────────
  const maxRight  = nodes.reduce((m, n) => Math.max(m, n.x + NW), 0) + PAD;
  const maxBottom = nodes.reduce((m, n) => Math.max(m, n.y + n.cardH), 0) + PAD;

  // ── SVG connector lines (no duplicates – each line is pushed exactly once) 
  const svgLines = lines.map(l =>
    `<line x1="${Math.round(l.x1)}" y1="${Math.round(l.y1)}" x2="${Math.round(l.x2)}" y2="${Math.round(l.y2)}" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>`
  ).join('');

  // ── Badge helper (preserves original badge classes) ───────────────────────
  const getBadgeClass = (level) => {
    if (!level) return '';
    const l = level.toLowerCase();
    if (l.includes('top'))    return 'oc-badge-top';
    if (l.includes('senior')) return 'oc-badge-senior';
    if (l.includes('junior')) return 'oc-badge-junior';
    return 'oc-badge-mgmt';
  };

  // ── Card rendering ────────────────────────────────────────────────────────
  const nodeMap = Object.fromEntries(fns.map(f => [f.id, f]));
  let cardsHtml = '';

  nodes.forEach(n => {
    const style = `position:absolute;left:${Math.round(n.x)}px;top:${Math.round(n.y)}px;width:${NW}px;min-width:${NW}px;max-width:${NW}px;`;
    if (n.isRoot) {
      const totalToBeHC    = fns.reduce((s, fn) => s + (fn.proposed_hc    || 0), 0);
      const totalToBeMgrs  = fns.reduce((s, fn) => s + (fn.manager_count  || 0), 0);
      const totalToBeProfs = fns.reduce((s, fn) => s + (fn.professional_count || 0), 0);
      cardsHtml += `<div class="oc-root-card" style="${style}">
        <div style="font-size:15px;font-weight:700;line-height:1.4;word-break:break-word;">${workplaceName || 'Workplace'}</div>
        <div class="oc-root-badge">Root / Workplace</div>
        ${divData && divData.headcount_target ? `<div class="oc-root-hc">Target HC: ${formatNumber(divData.headcount_target)}</div>` : ''}
        <div class="oc-root-detail">
          <div>Total HC: ${formatNumber(totalToBeHC)}</div>
          <div>Managers: ${formatNumber(totalToBeMgrs)} | Professionals: ${formatNumber(totalToBeProfs)}</div>
        </div>
      </div>`;
    } else {
      const f = nodeMap[n.id];
      if (!f) return;
      const name        = f.proposed_function_name || 'Unnamed';
      const level       = f.career_level || '';
      const mgr         = f.manager_count || 0;
      const prof        = f.professional_count || 0;
      const stype       = f.function_structure_type || '';
      const hasChildren = (parentMap[f.id] || []).length > 0;
      const isCollapsed = collapsed.has(f.id);
      cardsHtml += `<div class="oc-node-card" style="${style}">
        <div class="oc-node-name">${name}</div>
        ${stype ? `<div class="oc-node-meta"><span class="oc-badge oc-badge-type">${stype.toUpperCase()}</span></div>` : ''}
        ${level ? `<div class="oc-node-meta"><span class="oc-badge ${getBadgeClass(level)}">${level}</span></div>` : ''}
        <div class="oc-node-detail">Mgr: ${formatNumber(mgr)} | Prof: ${formatNumber(prof)}</div>
        ${hasChildren ? `<div class="oc-toggle" onclick="app.toggleOrgNode('${f.id}')">${isCollapsed ? '+' : '&minus;'}</div>` : ''}
      </div>`;
    }
  });

  // ── Assemble viewport ─────────────────────────────────────────────────────
  // The viewport is a scrollable window; the canvas inside holds all positioned elements.
  // Transform-origin is top-left so zoom anchors correctly when scrolled.
  // The oc-viewport is scrollable (overflow:auto). The canvas sits inside at its natural size.
  // Controls are inside the viewport so position:absolute anchors to the visible area.
  let html = `<div class="oc-wrap">`;
  html += `<div class="oc-viewport" onmousedown="app.startOrgPan(event)" onmousemove="app.doOrgPan(event)" onmouseup="app.endOrgPan(event)" onmouseleave="app.endOrgPan(event)">`;
  html += `<div class="oc-canvas" id="org-canvas" style="position:relative;width:${maxRight}px;height:${maxBottom}px;">`;
  html += `<svg style="position:absolute;top:0;left:0;width:${maxRight}px;height:${maxBottom}px;overflow:visible;pointer-events:none;" xmlns="http://www.w3.org/2000/svg">${svgLines}</svg>`;
  html += cardsHtml;
  html += `</div>`;
  html += `</div>`;
  html += `<div class="oc-controls">`;
  html += `<button onclick="app.orgZoom(0.1)" title="Zoom In">+</button>`;
  html += `<button onclick="app.orgZoom(-0.1)" title="Zoom Out">&minus;</button>`;
  html += `<button onclick="app.orgZoomFit()" title="Fit to View" style="font-size:12px;">&#8634;</button>`;
  html += `<button onclick="app.orgZoomReset()" title="Reset">1:1</button>`;
  html += `</div>`;
  html += `</div>`;
  return html;
}

// ═══════════════════════════════════════════
// RENDER: WORKSHOP PHASE 2
// ═══════════════════════════════════════════
function renderPhase2() {
  const ws = getWs().find(w => w.id === state.selectedWorkshopId);
  if (!ws) return;
  const div = getDivs().find(d => d.id === ws.division_id);
  if (!div) return;
  const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);

  document.getElementById('phase2-header').innerHTML = `
    <div class="flex items-center gap-4 max-w-7xl mx-auto">
      <button class="zbod-btn-secondary" style="padding:10px 14px;" onclick="app.backToPhase1()">${ICONS.arrowLeft}</button>
      <div class="flex items-center gap-3"><div style="width:32px;height:32px;border-radius:8px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.target}</div><h1 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">${div.structure_name}</h1></div>
    </div>
    <div class="flex items-center gap-3"><span style="font-size:13px;color:#6b7280;">Phase 2 of 3</span><button onclick="app.confirmQuitPhase()" class="zbod-btn-secondary" style="padding:8px 16px;font-size:13px;">${ICONS.x} Cancel</button></div>`;

  const guide = `<div class="zbod-card p-6 mb-8" style="background:rgba(15,60,118,0.03);border:1px solid rgba(15,60,118,0.1);">
    <h3 style="font-family:'Montserrat',sans-serif;font-weight:700;color:#0F3C76;margin-bottom:16px;">Strategic Alignment Score Guide</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div><h4 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#0F3C76;margin-bottom:12px;">Q1</h4><p style="font-size:13px;color:#4b5563;margin-bottom:12px;">Does this function materially contribute to business strategy and outcomes, and enable scalable, efficient value creation (e.g. revenue, productivity, customer experience, automation)?</p>
      ${[['5','Direct impact on core KPIs (Revenue, Market Share, EBITDA)'], ['4','Strong support to value creation'], ['3','Moderate operational contribution'], ['2','Peripheral role'], ['1','Questionable value']].map(([s,t]) => `<div class="flex items-start gap-3 mb-3"><span style="min-width:28px;height:28px;border-radius:50%;background:rgba(15,60,118,0.1);color:#0F3C76;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${s}</span><span style="font-size:13px;color:#4b5563;">${t}</span></div>`).join('')}</div>
      <div><h4 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#0F3C76;margin-bottom:12px;">Q2</h4><p style="font-size:13px;color:#4b5563;margin-bottom:12px;">How critical is this function to business continuity and risk management, and what would be the impact if it were stopped today (legal, financial, regulatory, reputational, operational)?</p>
      ${[['5','Essential - operations/customers could not function'], ['4','Highly valuable - significantly improves performance'], ['3','Useful - adds noticeable value'], ['2','Limited support - mainly convenience'], ['1','Minimal or no support']].map(([s,t]) => `<div class="flex items-start gap-3 mb-3"><span style="min-width:28px;height:28px;border-radius:50%;background:rgba(15,60,118,0.1);color:#0F3C76;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${s}</span><span style="font-size:13px;color:#4b5563;">${t}</span></div>`).join('')}</div>
    </div>
  </div>`;

  let html = `<div class="mb-6"><h2 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:24px;color:#111827;">Business Impact Evaluation</h2><p style="font-size:14px;color:#6b7280;">Score each function's contribution using the guide below.</p></div>${guide}`;

  if (fns.length === 0) {
    html += `<div class="text-center py-12"><div style="margin-bottom:12px;">${ICONS.fileText}</div><p style="color:#6b7280;">No functions to evaluate</p><button onclick="app.backToPhase1()" class="zbod-btn-primary mt-4">Back to Phase 1</button></div>`;
  } else {
    html += `<div class="space-y-4">`;
    fns.forEach(f => {
      const raw = state.phase2Scores[f.id] || {};
      const hasScore = f.question1_score !== null && f.question2_score !== null;
      const total = hasScore ? (f.question1_score + f.question2_score) : 0;
      let badge = '';
      if (hasScore) {
        const decision = f.zbod_decision || computePhase2Decision(f.question1_score, f.question2_score);
        badge = `<span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;${decision === 'INVEST' ? 'background:rgba(0,230,118,0.12);color:#00C853;' : decision === 'KEEP' ? 'background:rgba(255,109,0,0.12);color:#FF6D00;' : decision === 'OPTIMIZE' ? 'background:rgba(0,184,212,0.12);color:#00B8D4;' : 'background:rgba(255,23,68,0.12);color:#FF1744;'}">${decision}</span>`;
      }
      html += `<div class="zbod-card p-5">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2E642C 0%,#184016 100%);color:#FFF;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">${f.function_number}</div>
          <div class="flex-1"><p style="font-weight:600;color:#111827;">${f.proposed_function_name}</p><p style="font-size:12px;color:#6b7280;">${f.career_level}</p></div>
          ${badge}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Q1</label><select class="zbod-select w-full" onchange="app.updatePhase2Score('${f.id}','question1_score',this.value)"><option value="">Score</option>${[5,4,3,2,1].map(s => `<option value="${s}" ${(f.question1_score===s?'selected':'')}>${s}</option>`).join('')}</select></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Q2</label><select class="zbod-select w-full" onchange="app.updatePhase2Score('${f.id}','question2_score',this.value)"><option value="">Score</option>${[5,4,3,2,1].map(s => `<option value="${s}" ${(f.question2_score===s?'selected':'')}>${s}</option>`).join('')}</select></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Total Score</label><div style="display:flex;align-items:center;gap:8px;height:42px;"><span style="font-size:24px;font-weight:800;color:#111827;">${total}</span><span style="font-size:12px;color:#6b7280;">/ 10</span></div></div>
        </div>
        ${f.justification_alert ? (f.justification_alert.includes('PASSED') ? `<div class="p1-alert p1-alert--pass" style="margin-top:12px;grid-column:auto;font-size:12px;padding:10px 14px;"><div class="p1-alert__icon">${ICONS.checkCircle}</div><span class="p1-alert__text">${f.justification_alert}</span></div>` : `<div class="p1-alert p1-alert--warn" style="margin-top:12px;grid-column:auto;font-size:12px;padding:10px 14px;"><div class="p1-alert__icon">${ICONS.alertTriangle}</div><span class="p1-alert__text">${f.justification_alert}</span></div>`) : ''}
      </div>`;
    });
    html += `</div>`;
  }

  html += `<div class="flex justify-between mt-8 pt-6" style="border-top:1px solid rgba(46,100,44,0.1);">
    <button onclick="app.savePhase2()" class="zbod-btn-secondary" style="padding:10px 24px;">${ICONS.save} Save</button>
    <div class="flex gap-3">
      <button onclick="app.backToPhase1()" class="zbod-btn-secondary" style="padding:10px 24px;">Back</button>
      <button onclick="app.goToPhase3()" class="zbod-btn-primary" style="padding:10px 24px;">Next: HC & Cost ${ICONS.arrowRight}</button>
    </div>
  </div>`;

  document.getElementById('phase2-content').innerHTML = html;
}


// ═══════════════════════════════════════════
// RENDER: WORKSHOP PHASE 3
// ═══════════════════════════════════════════
function renderPhase3() {
  const ws = getWs().find(w => w.id === state.selectedWorkshopId);
  if (!ws) return;
  const div = getDivs().find(d => d.id === ws.division_id);
  if (!div) return;
  const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);

  document.getElementById('phase3-header').innerHTML = `
    <div class="flex items-center gap-4 max-w-7xl mx-auto">
      <button class="zbod-btn-secondary" style="padding:10px 14px;" onclick="app.backToPhase2()">${ICONS.arrowLeft}</button>
      <div class="flex items-center gap-3"><div style="width:32px;height:32px;border-radius:8px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.target}</div><h1 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">${div.structure_name}</h1></div>
    </div>
    <div class="flex items-center gap-3"><span style="font-size:13px;color:#6b7280;">Phase 3 of 3</span><button onclick="app.confirmQuitPhase()" class="zbod-btn-secondary" style="padding:8px 16px;font-size:13px;">${ICONS.x} Cancel</button></div>`;

  let html = `<div class="mb-6"><h2 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:24px;color:#111827;">Headcount & People Cost Allocation</h2><p style="font-size:14px;color:#6b7280;">Allocate headcount and budget targets.</p></div>`;

  // ── Build parent map ──────────────────────────────────────────────────────
  const fnIds = new Set(fns.map(f => f.id));
  const p3ParentMap = {};
  fns.forEach(f => {
    const pid = (f.parent_id && fnIds.has(f.parent_id)) ? f.parent_id : 'root';
    if (!p3ParentMap[pid]) p3ParentMap[pid] = [];
    p3ParentMap[pid].push(f);
  });
  const rootFns = p3ParentMap['root'] || [];

  // ── Division-level allocation tracker (root functions only) ───────────────
  if (fns.length > 0 && rootFns.length > 0) {
    const hcTotal = rootFns.reduce((sum, f) => {
      const raw = state.phase3Values[f.id] || {};
      const val = raw.hc_allocation_percent !== undefined ? raw.hc_allocation_percent : f.hc_allocation_percent;
      return sum + (parseFloat(val) || 0);
    }, 0);
    const costTotal = rootFns.reduce((sum, f) => {
      const raw = state.phase3Values[f.id] || {};
      const val = raw.cost_allocation_percent !== undefined ? raw.cost_allocation_percent : f.cost_allocation_percent;
      return sum + (parseFloat(val) || 0);
    }, 0);
    const hcBarClass = hcTotal > 100 ? 'p3-tracker__bar-fill--over' : (hcTotal === 100 ? 'p3-tracker__bar-fill--full' : 'p3-tracker__bar-fill--ok');
    const costBarClass = costTotal > 100 ? 'p3-tracker__bar-fill--over' : (costTotal === 100 ? 'p3-tracker__bar-fill--full' : 'p3-tracker__bar-fill--ok');
    const hcUsedClass = hcTotal > 100 ? 'p3-tracker__stat-value--over' : 'p3-tracker__stat-value--ok';
    const costUsedClass = costTotal > 100 ? 'p3-tracker__stat-value--over' : 'p3-tracker__stat-value--ok';
    html += `<div class="p3-tracker" id="p3-tracker-main">
      <div class="p3-tracker__title">${ICONS.activity} Allocation Summary &mdash; ${div.structure_name}</div>
      <div class="p3-tracker__grid">
        <div>
          <div class="p3-tracker__item-label">HC Allocation</div>
          <div class="p3-tracker__bar-track"><div class="p3-tracker__bar-fill ${hcBarClass}" style="width:${Math.min(hcTotal, 100)}%;"></div></div>
          <div class="p3-tracker__stats">
            <div class="p3-tracker__stat"><span class="p3-tracker__stat-value ${hcUsedClass}">${hcTotal.toFixed(0)}%</span><span class="p3-tracker__stat-label">Used</span></div>
            <div class="p3-tracker__stat"><span class="p3-tracker__stat-value">${Math.max(0, 100 - hcTotal).toFixed(0)}%</span><span class="p3-tracker__stat-label">Remaining</span></div>
          </div>
        </div>
        <div>
          <div class="p3-tracker__item-label">Budget Allocation</div>
          <div class="p3-tracker__bar-track"><div class="p3-tracker__bar-fill ${costBarClass}" style="width:${Math.min(costTotal, 100)}%;"></div></div>
          <div class="p3-tracker__stats">
            <div class="p3-tracker__stat"><span class="p3-tracker__stat-value ${costUsedClass}">${costTotal.toFixed(0)}%</span><span class="p3-tracker__stat-label">Used</span></div>
            <div class="p3-tracker__stat"><span class="p3-tracker__stat-value">${Math.max(0, 100 - costTotal).toFixed(0)}%</span><span class="p3-tracker__stat-label">Remaining</span></div>
          </div>
        </div>
      </div>
    </div>`;
  }

  if (fns.length === 0) {
    html += `<div class="text-center py-12"><p style="color:#6b7280;">No functions to allocate</p></div>`;
  } else {
    const cascadedAllocations = buildCascadedAllocations(fns, div.headcount_target || 0, div.budget_target || 0, state.phase3Values);

    // ── Helper: render a full editable Phase 3 card for any function ─────────
    const renderP3Card = (f, wrapperClass) => {
      const raw = state.phase3Values[f.id] || {};
      const cascaded = cascadedAllocations[f.id] || {};
      const workplaceHC = cascaded.parentHC !== undefined ? cascaded.parentHC : (div.headcount_target || 0);
      const workplaceBudget = cascaded.parentBudget !== undefined ? cascaded.parentBudget : (div.budget_target || 0);
      const hcAlloc = raw.hc_allocation_percent !== undefined ? raw.hc_allocation_percent : f.hc_allocation_percent;
      const costAlloc = raw.cost_allocation_percent !== undefined ? raw.cost_allocation_percent : f.cost_allocation_percent;
      const mgrCount = raw.manager_count !== undefined ? raw.manager_count : f.manager_count;
      const profCount = raw.professional_count !== undefined ? raw.professional_count : f.professional_count;
      const proposedHC = cascaded.proposedHC !== undefined ? cascaded.proposedHC : (f.proposed_hc || null);
      const proposedBudget = cascaded.proposedBudget !== undefined ? cascaded.proposedBudget : (f.proposed_budget || null);
      const actualHC = (parseInt(mgrCount) || 0) + (parseInt(profCount) || 0);
      const span = profCount && mgrCount && parseInt(mgrCount) > 0 ? (parseInt(profCount) / parseInt(mgrCount)).toFixed(1) : (f.span_of_control || null);
      const spanAlert = getSpanAlert(span !== null ? parseFloat(span) : null, f.career_level, parseInt(mgrCount) || 0, parseInt(profCount) || 0) ?? f.span_alert;
      const hcValidationAlert = (proposedHC !== null && actualHC !== 0 && actualHC !== proposedHC)
        ? `<div class="p1-alert p1-alert--critical" style="margin-top:8px;"><div class="p1-alert__icon">${ICONS.xCircle}</div><span class="p1-alert__text">Manager + Professional count (${actualHC}) does not match Proposed HC (${proposedHC})</span></div>`
        : '';
      const reviewFlags = [];
      if (f.can_be_eliminated === 'Yes') reviewFlags.push('Elimination');
      if (f.can_be_automated === 'Yes') reviewFlags.push('Automation');
      if (f.can_be_outsourced === 'Yes') reviewFlags.push('Outsourcing');
      const phase1Review = reviewFlags.length > 0
        ? 'Review for ' + (reviewFlags.length === 3 ? reviewFlags.slice(0, 2).join(', ') + ' and ' + reviewFlags[2] : reviewFlags.join(' and '))
        : '';
      const phase2Decision = f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0);
      return `<div class="${wrapperClass || 'zbod-card p-5'}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2E642C 0%,#184016 100%);color:#FFF;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">${f.function_number}</div>
          <div class="flex-1">
            <p style="font-weight:600;color:#111827;">${f.proposed_function_name}</p>
            <p style="font-size:12px;color:#6b7280;">${f.career_level || 'No level'}</p>
          </div>
          <span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;${phase2Decision==='INVEST'?'background:rgba(0,230,118,0.12);color:#00C853;':phase2Decision==='KEEP'?'background:rgba(255,109,0,0.12);color:#FF6D00;':phase2Decision==='OPTIMIZE'?'background:rgba(0,184,212,0.12);color:#00B8D4;':'background:rgba(255,23,68,0.12);color:#FF1744;'}">${phase2Decision}</span>
        </div>
        ${phase1Review ? `<div class="p1-alert p1-alert--warn" style="margin-bottom:12px;"><div class="p1-alert__icon">${ICONS.alertTriangle}</div><span class="p1-alert__text">${phase1Review}</span></div>` : ''}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Total Target HC</label><input type="number" class="zbod-input w-full" style="background:#f3f4f6;" value="${workplaceHC}" readonly tabindex="-1"></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">HC Allocation %</label><input type="number" class="zbod-input w-full" value="${hcAlloc || ''}" onchange="app.updatePhase3Value('${f.id}','hc_allocation_percent',this.value)" placeholder="%" onwheel="return false;"></div>
          <div style="display:flex;flex-direction:column;justify-content:center;"><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Proposed HC</label><span style="font-size:20px;font-weight:800;color:#111827;">${proposedHC !== null ? formatNumber(proposedHC) : '-'}</span></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Total Target Cost</label><input type="number" class="zbod-input w-full" style="background:#f3f4f6;" value="${workplaceBudget}" readonly tabindex="-1"></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Cost Allocation %</label><input type="number" class="zbod-input w-full" value="${costAlloc || ''}" onchange="app.updatePhase3Value('${f.id}','cost_allocation_percent',this.value)" placeholder="%" onwheel="return false;"></div>
          <div style="display:flex;flex-direction:column;justify-content:center;"><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Proposed Cost</label><span style="font-size:20px;font-weight:800;color:#111827;">${proposedBudget !== null ? formatNumber(proposedBudget) + ' AZN' : '-'}</span></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Proposed Managers</label><input type="number" class="zbod-input w-full" value="${mgrCount || ''}" onchange="app.updatePhase3Value('${f.id}','manager_count',this.value)" placeholder="0" onwheel="return false;"></div>
          <div><label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:6px;display:block;">Proposed Professionals</label><input type="number" class="zbod-input w-full" value="${profCount || ''}" onchange="app.updatePhase3Value('${f.id}','professional_count',this.value)" placeholder="0" onwheel="return false;"></div>
          <div style="padding:12px;border-radius:10px;background:rgba(15,60,118,0.04);border:1px solid rgba(15,60,118,0.1);">
            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;">HC Allocation Check</span>
            <span style="font-size:18px;font-weight:700;color:#111827;display:block;margin-top:4px;">${actualHC} / ${proposedHC !== null ? proposedHC : '-'}</span>
            ${actualHC !== 0 && proposedHC !== null && actualHC === proposedHC ? `<span style="font-size:11px;color:#00C853;font-weight:600;">${ICONS.checkCircle} Matches</span>` : `<span style="font-size:11px;color:#FF6D00;font-weight:600;">${ICONS.alertTriangle} Does not match</span>`}
          </div>
          <div style="padding:12px;border-radius:10px;background:rgba(46,100,44,0.04);border:1px solid rgba(46,100,44,0.1);">
            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;">Span of Control</span>
            <span style="font-size:24px;font-weight:800;color:#111827;display:block;margin-top:4px;">${span !== null ? span : '-'}</span>
            ${spanAlert ? `<span style="font-size:11px;font-weight:700;${spanAlert==='Healthy Span'?'color:#00C853;':spanAlert==='Above Recommended Span'?'color:#FF6D00;':'color:#FF1744;'}">${spanAlert}</span>` : ''}
          </div>
        </div>
        ${hcValidationAlert}
      </div>`;
    };

    // ── Helper: render mini allocation tracker inside a parent card ───────────
    const renderP3MiniTracker = (children) => {
      const hcTotal = children.reduce((sum, c) => {
        const raw = state.phase3Values[c.id] || {};
        const val = raw.hc_allocation_percent !== undefined ? raw.hc_allocation_percent : c.hc_allocation_percent;
        return sum + (parseFloat(val) || 0);
      }, 0);
      const costTotal = children.reduce((sum, c) => {
        const raw = state.phase3Values[c.id] || {};
        const val = raw.cost_allocation_percent !== undefined ? raw.cost_allocation_percent : c.cost_allocation_percent;
        return sum + (parseFloat(val) || 0);
      }, 0);
      const hcCls = hcTotal > 100 ? 'p3-tracker__bar-fill--over' : (hcTotal === 100 ? 'p3-tracker__bar-fill--full' : 'p3-tracker__bar-fill--ok');
      const costCls = costTotal > 100 ? 'p3-tracker__bar-fill--over' : (costTotal === 100 ? 'p3-tracker__bar-fill--full' : 'p3-tracker__bar-fill--ok');
      const hcValCls = hcTotal > 100 ? 'p3-tracker__stat-value--over' : 'p3-tracker__stat-value--ok';
      const costValCls = costTotal > 100 ? 'p3-tracker__stat-value--over' : 'p3-tracker__stat-value--ok';
      return `<div class="p3-child-tracker">
        <div class="p3-child-tracker__label">${ICONS.activity} Children Allocation</div>
        <div class="p3-tracker__grid">
          <div>
            <div class="p3-tracker__item-label">HC</div>
            <div class="p3-tracker__bar-track"><div class="p3-tracker__bar-fill ${hcCls}" style="width:${Math.min(hcTotal,100)}%;"></div></div>
            <div class="p3-tracker__stats">
              <div class="p3-tracker__stat"><span class="p3-tracker__stat-value ${hcValCls}">${hcTotal.toFixed(0)}%</span><span class="p3-tracker__stat-label">Used</span></div>
              <div class="p3-tracker__stat"><span class="p3-tracker__stat-value">${Math.max(0,100-hcTotal).toFixed(0)}%</span><span class="p3-tracker__stat-label">Remaining</span></div>
            </div>
          </div>
          <div>
            <div class="p3-tracker__item-label">Budget</div>
            <div class="p3-tracker__bar-track"><div class="p3-tracker__bar-fill ${costCls}" style="width:${Math.min(costTotal,100)}%;"></div></div>
            <div class="p3-tracker__stats">
              <div class="p3-tracker__stat"><span class="p3-tracker__stat-value ${costValCls}">${costTotal.toFixed(0)}%</span><span class="p3-tracker__stat-label">Used</span></div>
              <div class="p3-tracker__stat"><span class="p3-tracker__stat-value">${Math.max(0,100-costTotal).toFixed(0)}%</span><span class="p3-tracker__stat-label">Remaining</span></div>
            </div>
          </div>
        </div>
      </div>`;
    };

    // ── Helper: render child section (mini tracker + rows/cards) recursively ─
    const renderP3Children = (children) => {
      if (!children || children.length === 0) return '';
      let out = renderP3MiniTracker(children);
      out += `<div class="p3-children-list">`;
      children.forEach(child => {
        const grandchildren = p3ParentMap[child.id] || [];
        const isExpanded = state.p3ExpandedChildren.has(child.id);
        const childCascaded = cascadedAllocations[child.id] || {};
        const childProposedHC = childCascaded.proposedHC !== null && childCascaded.proposedHC !== undefined ? formatNumber(childCascaded.proposedHC) : '-';
        const childProposedBudget = childCascaded.proposedBudget !== null && childCascaded.proposedBudget !== undefined ? formatNumber(childCascaded.proposedBudget) : '-';
        const childDecision = child.zbod_decision || computePhase2Decision(child.question1_score || 0, child.question2_score || 0);
        const decisionColor = childDecision==='INVEST'?'#00C853':childDecision==='KEEP'?'#FF6D00':childDecision==='OPTIMIZE'?'#00B8D4':'#FF1744';
        if (isExpanded) {
          out += `<div class="p3-child-item p3-child-item--expanded">`;
          out += renderP3Card(child, 'p3-child-card');
          if (grandchildren.length > 0) {
            out += `<div class="p3-children-nested">`;
            out += renderP3Children(grandchildren);
            out += `</div>`;
          }
          out += `</div>`;
        } else {
          out += `<div class="p3-child-item p3-child-row" onclick="app.toggleP3Child('${child.id}')">
            <div class="p3-child-row__num">${child.function_number}</div>
            <div class="p3-child-row__info">
              <span class="p3-child-row__name">${child.proposed_function_name}</span>
              <span class="p3-child-row__level">${child.career_level || ''}</span>
            </div>
            <div class="p3-child-row__meta">
              <span class="p3-child-row__proposed">HC: ${childProposedHC} &nbsp;|&nbsp; Cost: ${childProposedBudget} AZN</span>
              <span class="p3-child-row__decision" style="color:${decisionColor};">${childDecision}</span>
              ${grandchildren.length > 0 ? `<span class="p3-child-row__sub">${grandchildren.length} sub-function${grandchildren.length>1?'s':''}</span>` : ''}
            </div>
            <div class="p3-child-row__chevron">${ICONS.chevronRight}</div>
          </div>`;
        }
      });
      out += `</div>`;
      return out;
    };

    // ── Main render: root functions + nested children ─────────────────────────
    html += `<div class="space-y-4">`;
    rootFns.forEach(f => {
      const children = p3ParentMap[f.id] || [];
      html += `<div class="p3-tree-group">`;
      html += renderP3Card(f, 'zbod-card p-5');
      if (children.length > 0) {
        html += `<div class="p3-children-section">`;
        html += renderP3Children(children);
        html += `</div>`;
      }
      html += `</div>`;
    });
    html += `</div>`;
  }

  html += `<div class="flex justify-between mt-8 pt-6" style="border-top:1px solid rgba(46,100,44,0.1);">
    <button onclick="app.savePhase3()" class="zbod-btn-secondary" style="padding:10px 24px;">${ICONS.save} Save</button>
    <div class="flex gap-3">
      <button onclick="app.backToPhase2()" class="zbod-btn-secondary" style="padding:10px 24px;">Back</button>
      <button onclick="app.goToReview()" class="zbod-btn-primary" style="padding:10px 24px;">Review & Finish ${ICONS.check}</button>
    </div>
  </div>`;

  document.getElementById('phase3-content').innerHTML = html;
  setupPhase3StickyCompact();
}

function setupPhase3StickyCompact() {
  if (window._p3StickyObserver) {
    window._p3StickyObserver.disconnect();
    window._p3StickyObserver = null;
  }
  const ws = getWs().find(w => w.id === state.selectedWorkshopId);
  if (!ws) return;
  const fns = getFns().filter(f => f.workshop_id === ws.id);
  if (!fns.length) return;

  const fnIds = new Set(fns.map(f => f.id));
  const rootChildren = fns.filter(f => !f.parent_id || !fnIds.has(f.parent_id));
  const hcTotal = rootChildren.reduce((sum, f) => {
    const raw = state.phase3Values[f.id] || {};
    const val = raw.hc_allocation_percent !== undefined ? raw.hc_allocation_percent : f.hc_allocation_percent;
    return sum + (parseFloat(val) || 0);
  }, 0);
  const costTotal = rootChildren.reduce((sum, f) => {
    const raw = state.phase3Values[f.id] || {};
    const val = raw.cost_allocation_percent !== undefined ? raw.cost_allocation_percent : f.cost_allocation_percent;
    return sum + (parseFloat(val) || 0);
  }, 0);

  const hcPct = Math.min(hcTotal, 100);
  const costPct = Math.min(costTotal, 100);
  const hcOver = hcTotal > 100;
  const costOver = costTotal > 100;

  let bar = document.getElementById('p3-compact-sticky');
  const wasVisible = bar ? bar.classList.contains('p3-compact-sticky--visible') : false;
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'p3-compact-sticky';
    bar.setAttribute('aria-hidden', 'true');
    const phase3Page = document.getElementById('page-phase3');
    const phase3Content = document.getElementById('phase3-content');
    if (phase3Page && phase3Content) phase3Page.insertBefore(bar, phase3Content);
  }

  bar.innerHTML = `<div class="p3-compact__inner">
    <div class="p3-compact__kpi">
      <span class="p3-compact__kpi-label">HC Allocation</span>
      <div class="p3-compact__bar-wrap">
        <div class="p3-compact__bar-track">
          <div class="p3-compact__bar-fill ${hcOver ? 'p3-compact__bar-fill--over' : 'p3-compact__bar-fill--ok'}" style="width:${hcPct}%;"></div>
        </div>
        <span class="p3-compact__pct ${hcOver ? 'p3-compact__pct--over' : ''}">${hcTotal.toFixed(0)}%</span>
      </div>
      <span class="p3-compact__sub">${Math.max(0, 100 - hcTotal).toFixed(0)}% remaining</span>
    </div>
    <div class="p3-compact__divider"></div>
    <div class="p3-compact__kpi">
      <span class="p3-compact__kpi-label">Budget Allocation</span>
      <div class="p3-compact__bar-wrap">
        <div class="p3-compact__bar-track">
          <div class="p3-compact__bar-fill ${costOver ? 'p3-compact__bar-fill--over' : 'p3-compact__bar-fill--ok'}" style="width:${costPct}%;"></div>
        </div>
        <span class="p3-compact__pct ${costOver ? 'p3-compact__pct--over' : ''}">${costTotal.toFixed(0)}%</span>
      </div>
      <span class="p3-compact__sub">${Math.max(0, 100 - costTotal).toFixed(0)}% remaining</span>
    </div>
  </div>`;

  if (wasVisible) bar.classList.add('p3-compact-sticky--visible');

  const nav = document.querySelector('#page-phase3 .sticky-header');
  const navH = nav ? (nav.getBoundingClientRect().height || nav.offsetHeight || 73) : 73;
  bar.style.top = `${navH}px`;

  const largeTracker = document.getElementById('p3-tracker-main');
  if (!largeTracker) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      const pageEl = document.getElementById('page-phase3');
      if (!pageEl || pageEl.classList.contains('hidden')) return;
      if (entry.isIntersecting) {
        bar.classList.remove('p3-compact-sticky--visible');
      } else {
        bar.classList.add('p3-compact-sticky--visible');
      }
    },
    { threshold: 0, rootMargin: `-${navH}px 0px 0px 0px` }
  );
  observer.observe(largeTracker);
  window._p3StickyObserver = observer;
}

function cleanupPhase3Sticky() {
  const bar = document.getElementById('p3-compact-sticky');
  if (bar) bar.classList.remove('p3-compact-sticky--visible');
  if (window._p3StickyObserver) {
    window._p3StickyObserver.disconnect();
    window._p3StickyObserver = null;
  }
}

// ═══════════════════════════════════════════
// RENDER: REVIEW PAGE
// ═══════════════════════════════════════════
function renderReview() {
  const ws = getWs().find(w => w.id === state.selectedWorkshopId);
  if (!ws) return;
  const div = getDivs().find(d => d.id === ws.division_id);
  if (!div) return;
  const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);

  document.getElementById('review-header').innerHTML = `
    <div class="flex items-center gap-4 max-w-7xl mx-auto">
      <button class="zbod-btn-secondary" style="padding:10px 14px;" onclick="app.backToPhase3()">${ICONS.arrowLeft}</button>
      <div class="flex items-center gap-3"><div style="width:32px;height:32px;border-radius:8px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.target}</div><h1 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">${div.structure_name} &mdash; Workshop Review</h1></div>
    </div>`;

  let html = `<div class="mb-6"><h2 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:30px;color:#111827;">Workshop Summary</h2><p style="font-size:14px;color:#6b7280;">Review all data before finalizing.</p></div>`;

  const inc = fns.filter(f => (f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0)) === 'INVEST');
  const kp = fns.filter(f => (f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0)) === 'KEEP');
  const opt = fns.filter(f => (f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0)) === 'OPTIMIZE');
  const elm = fns.filter(f => (f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0)) === 'ELIMINATE');

  html += `<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    <div class="zbod-card p-4" style="border-left:3px solid #00E676;"><p style="font-size:12px;color:#6b7280;">INVEST</p><p style="font-size:28px;font-weight:800;color:#00E676;">${inc.length}</p></div>
    <div class="zbod-card p-4" style="border-left:3px solid #FF6D00;"><p style="font-size:12px;color:#6b7280;">KEEP</p><p style="font-size:28px;font-weight:800;color:#FF6D00;">${kp.length}</p></div>
    <div class="zbod-card p-4" style="border-left:3px solid #00B8D4;"><p style="font-size:12px;color:#6b7280;">OPTIMIZE</p><p style="font-size:28px;font-weight:800;color:#00B8D4;">${opt.length}</p></div>
    <div class="zbod-card p-4" style="border-left:3px solid #FF1744;"><p style="font-size:12px;color:#6b7280;">ELIMINATE</p><p style="font-size:28px;font-weight:800;color:#FF1744;">${elm.length}</p></div>
  </div>`;

  const totalProposedHC = calculateProposedHeadcount(ws.id);
  const totalProposedBudget = calculateProposedBudget(ws.id);

  html += `<div class="zbod-card p-6 mb-8"><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;margin-bottom:16px;">Targets vs Proposed</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><p style="font-size:12px;color:#6b7280;margin-bottom:8px;">Headcount</p><div class="flex items-center gap-4"><div class="flex-1"><div style="height:8px;border-radius:4px;background:#f3f4f6;overflow:hidden;"><div style="height:100%;border-radius:4px;background:linear-gradient(90deg,#00C853,#00A344);width:${Math.min((totalProposedHC/(div.headcount_target||1))*100,100)}%;"></div></div></div><span style="font-size:12px;color:#6b7280;">${formatNumber(totalProposedHC)} / ${formatNumber(div.headcount_target || 0)}</span></div></div>
      <div><p style="font-size:12px;color:#6b7280;margin-bottom:8px;">Budget</p><div class="flex items-center gap-4"><div class="flex-1"><div style="height:8px;border-radius:4px;background:#f3f4f6;overflow:hidden;"><div style="height:100%;border-radius:4px;background:linear-gradient(90deg,#0066FF,#0052CC);width:${Math.min((totalProposedBudget/(div.budget_target||1))*100,100)}%;"></div></div></div><span style="font-size:12px;color:#6b7280;">${formatNumber(totalProposedBudget)} / ${formatNumber(div.budget_target || 0)}</span></div></div>
    </div>
  </div>`;

  html += `<div class="zbod-card p-6 mb-8"><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;margin-bottom:16px;">Function Details</h3>
    <div class="overflow-x-auto"><table class="zbod-table">
      <thead><tr><th>#</th><th>Function</th><th>Level</th><th>Q1</th><th>Q2</th><th>Score</th><th>Decision</th><th>REVIEW STATUS</th><th>HC Alloc%</th><th>Proposed HC</th><th>Budget Alloc%</th><th>Proposed Budget</th></tr></thead>
      <tbody>
        ${fns.map(f => {
          const dec = f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0);
          const elim = f.can_be_eliminated || '';
          const auto = f.can_be_automated || '';
          const out = f.can_be_outsourced || '';
          const reviewAlert = f.justification_alert || (elim && auto && out ? computePhase1Alert(elim, auto, out) : '');
          const yesCount = (elim === 'Yes' ? 1 : 0) + (auto === 'Yes' ? 1 : 0) + (out === 'Yes' ? 1 : 0);
          let reviewBadge = '';
          if (reviewAlert && reviewAlert.includes('PASSED')) {
            reviewBadge = `<span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(46,100,44,0.1);color:#2E642C;">${reviewAlert}</span>`;
          } else if (yesCount === 3) {
            reviewBadge = `<span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(180,60,60,0.1);color:#991b1b;">${reviewAlert || 'Critical Review'}</span>`;
          } else if (yesCount > 0) {
            reviewBadge = `<span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(200,160,60,0.1);color:#92400e;">${reviewAlert || 'Review Required'}</span>`;
          } else {
            reviewBadge = `<span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;background:rgba(156,163,175,0.1);color:#6b7280;">-</span>`;
          }
          return `<tr><td style="font-weight:700;color:#00C853;">${f.function_number}</td><td style="font-weight:500;">${f.proposed_function_name}</td><td>${f.career_level}</td><td>${f.question1_score || '-'}</td><td>${f.question2_score || '-'}</td><td style="font-weight:700;">${(f.question1_score || 0) + (f.question2_score || 0)}</td><td><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;${dec==='INVEST'?'background:rgba(0,230,118,0.12);color:#00C853;':dec==='KEEP'?'background:rgba(255,109,0,0.12);color:#FF6D00;':dec==='OPTIMIZE'?'background:rgba(0,184,212,0.12);color:#00B8D4;':'background:rgba(255,23,68,0.12);color:#FF1744;'}">${dec}</span></td><td>${reviewBadge}</td><td>${f.hc_allocation_percent || '-'}${f.hc_allocation_percent ? '%' : ''}</td><td>${formatNumber(f.proposed_hc || 0)}</td><td>${f.cost_allocation_percent || '-'}${f.cost_allocation_percent ? '%' : ''}</td><td>${formatNumber(f.proposed_budget || 0)}</td></tr>`;
        }).join('')}
      </tbody>
    </table></div>
  </div>`;

  html += `<div class="flex justify-between">
    <button onclick="app.backToPhase3()" class="zbod-btn-secondary" style="padding:14px 32px;">Back to Phase 3</button>
    <button onclick="app.finishWorkshop()" class="zbod-btn-primary" style="padding:14px 32px;">${ICONS.check} Complete Workshop</button>
  </div>`;

  document.getElementById('review-content').innerHTML = html;
}


// ═══════════════════════════════════════════
// RENDER: TRANSITION / EXECUTIVE DASHBOARD
// ═══════════════════════════════════════════
function renderTransition() {
  const ws = getWs().find(w => w.id === state.selectedWorkshopId);
  if (!ws) return;
  const div = getDivs().find(d => d.id === ws.division_id);
  if (!div) return;
  const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);
  const asIsFns = getAsIs().filter(f => f.division_id === ws.division_id);

  document.getElementById('transition-header').innerHTML = `
    <div class="flex items-center gap-4 max-w-screen-2xl mx-auto">
      <button class="zbod-btn-secondary" style="padding:10px 14px;" onclick="app.goToWorkspace()">${ICONS.arrowLeft}</button>
      <div class="flex items-center gap-3"><div style="width:32px;height:32px;border-radius:8px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.checkCircle}</div><h1 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">Workshop Complete</h1></div>
    </div>`;

  const isAlreadySubmitted = !!ws.submitted_for_hr_review_at;
  let html = `<div class="text-center mb-8">
    <div style="display:inline-flex;width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#2E642C 0%,#184016 100%);align-items:center;justify-content:center;margin-bottom:16px;">${ICONS.checkCircle}</div>
    <h2 style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:36px;color:#111827;margin-bottom:8px;">Workshop Complete!</h2>
    <p style="font-size:16px;color:#6b7280;">Results saved. You can view the workshop anytime in the structure workspace.</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
      <button onclick="app.goToWorkspace()" class="zbod-btn-secondary" style="padding:12px 32px;">${ICONS.home} Back to Workspace</button>
      ${!isAlreadySubmitted ? `<button onclick="app.submitForHRReview()" class="zbod-btn-primary" style="padding:12px 32px;background:linear-gradient(135deg,#0F3C76 0%,#0F334C 100%);">${ICONS.send} Submit for HR Review</button>` : `<button onclick="app.goToHRReview()" class="zbod-btn-primary" style="padding:12px 32px;">${ICONS.checkCircle} View HR Submission</button>`}
    </div>
  </div>`;

  const dash = buildDashboardHTML(ws, div, fns, asIsFns);
  html += dash.html;
  document.getElementById('transition-content').innerHTML = html;
  setTimeout(() => renderDashboardCharts(dash.inc, dash.kp, dash.opt, dash.elm, dash.fns, asIsFns), 100);
}

// ═══════════════════════════════════════════
// SHARED DASHBOARD BUILDER
// ═══════════════════════════════════════════
function buildDashboardHTML(ws, div, fns, asIsFns, chartPrefix = '') {
  const metrics = calculateDashboardMetrics(ws.id);

  const inc = metrics.invest;
  const kp = metrics.keep;
  const opt = metrics.optimize;
  const elm = metrics.eliminate;

  const totalAsIsHC = metrics.totalAsIsHC;
  const totalAsIsBudget = metrics.totalAsIsBudget;
  const totalToBeHC = metrics.totalToBeHC;
  const totalToBeBudget = metrics.totalToBeBudget;

  const maxHC = Math.max(totalAsIsHC, totalToBeHC, div.headcount_target || 0, 1);
  const maxBudget = Math.max(totalAsIsBudget, totalToBeBudget, div.budget_target || 0, 1);

  let html = '';

  html += `<div class="zbod-card p-6 mb-8"><div class="flex items-center justify-between mb-6">
    <div><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:24px;color:#111827;">AS-IS vs TO-BE Dashboard</h3><p style="font-size:14px;color:#6b7280;">Completed: ${new Date(ws.completed_at || ws.created_at).toLocaleDateString()} ${new Date(ws.completed_at || ws.created_at).toLocaleTimeString()}</p></div>
    <button onclick="app.exportToExcel()" class="zbod-btn-export">${ICONS.download} Export Report</button>
  </div>`;

  html += `<div class="zbod-card p-6 mb-8"><div class="decision-summary-layout">
    <div class="decision-summary-layout__left">
      <h4 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:16px;">Decision Summary</h4>
      <div class="space-y-3">
        <div style="padding:12px 16px;border-radius:8px;background:rgba(0,230,118,0.06);border-left:3px solid #00E676;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#00C853;margin-bottom:6px;">INVEST (${inc.length})</div>
          <div class="space-y-1">${inc.length > 0 ? inc.map(f => `<p style="font-size:13px;color:#111827;">${f.function_number}. ${f.proposed_function_name} <span style="color:#6b7280;">(HC: ${formatNumber(f.proposed_hc || 0)}, Budget: ${formatNumber(f.proposed_budget || 0)})</span></p>`).join('') : '<p style="font-size:12px;color:#9ca3af;">None</p>'}</div>
        </div>
        <div style="padding:12px 16px;border-radius:8px;background:rgba(255,109,0,0.06);border-left:3px solid #FF6D00;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#FF6D00;margin-bottom:6px;">KEEP (${kp.length})</div>
          <div class="space-y-1">${kp.length > 0 ? kp.map(f => `<p style="font-size:13px;color:#111827;">${f.function_number}. ${f.proposed_function_name} <span style="color:#6b7280;">(HC: ${formatNumber(f.proposed_hc || 0)}, Budget: ${formatNumber(f.proposed_budget || 0)})</span></p>`).join('') : '<p style="font-size:12px;color:#9ca3af;">None</p>'}</div>
        </div>
        <div style="padding:12px 16px;border-radius:8px;background:rgba(0,184,212,0.06);border-left:3px solid #00B8D4;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#00B8D4;margin-bottom:6px;">OPTIMIZE (${opt.length})</div>
          <div class="space-y-1">${opt.length > 0 ? opt.map(f => `<p style="font-size:13px;color:#111827;">${f.function_number}. ${f.proposed_function_name} <span style="color:#6b7280;">(HC: ${formatNumber(f.proposed_hc || 0)}, Budget: ${formatNumber(f.proposed_budget || 0)})</span></p>`).join('') : '<p style="font-size:12px;color:#9ca3af;">None</p>'}</div>
        </div>
        <div style="padding:12px 16px;border-radius:8px;background:rgba(255,23,68,0.06);border-left:3px solid #FF1744;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#FF1744;margin-bottom:6px;">ELIMINATE (${elm.length})</div>
          <div class="space-y-1">${elm.length > 0 ? elm.map(f => `<p style="font-size:13px;color:#111827;">${f.function_number}. ${f.proposed_function_name} <span style="color:#6b7280;">(HC: ${formatNumber(f.proposed_hc || 0)}, Budget: ${formatNumber(f.proposed_budget || 0)})</span></p>`).join('') : '<p style="font-size:12px;color:#9ca3af;">None</p>'}</div>
        </div>
      </div>
    </div>
    <div class="decision-summary-layout__right">
      <div class="dashboard-pie-card" style="width:100%;max-width:420px;">
        <h4 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:16px;text-align:center;">Decision Distribution</h4>
        <div style="max-width:340px;margin:0 auto;"><canvas id="${chartPrefix}decisionPieChart"></canvas></div>
      </div>
    </div>
  </div></div>`;

  // Distribution Analysis section (2x2 grid)
  html += `<div class="zbod-card p-6 mb-8"><h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;margin-bottom:16px;text-align:center;">Distribution Analysis</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="zbod-card p-5 dashboard-pie-card"><h4 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:16px;text-align:center;">TO-BE Headcount Distribution</h4><div style="width:100%;"><canvas id="${chartPrefix}hcPieChart"></canvas></div></div>
      <div class="zbod-card p-5 dashboard-pie-card"><h4 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:16px;text-align:center;">TO-BE Cost Distribution</h4><div style="width:100%;"><canvas id="${chartPrefix}budgetPieChart"></canvas></div></div>
      <div class="zbod-card p-5 dashboard-pie-card" style="border:1px solid #e5e7eb;"><h4 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:16px;text-align:center;">AS-IS Headcount Distribution</h4><div style="width:100%;"><canvas id="${chartPrefix}asIsHcPieChart"></canvas></div></div>
      <div class="zbod-card p-5 dashboard-pie-card" style="border:1px solid #e5e7eb;"><h4 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;margin-bottom:16px;text-align:center;">AS-IS Cost Distribution</h4><div style="width:100%;"><canvas id="${chartPrefix}asIsBudgetPieChart"></canvas></div></div>
    </div>
  </div>`;

  html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    <div class="zbod-card p-6 chart-card">
      <h4 class="chart-title">Headcount Comparison</h4>
      <div class="chart-area">
        <div class="chart-bars">
          <div class="chart-bar-col"><div class="chart-bar" style="background:linear-gradient(180deg,#0066FF,#0052CC);height:${(totalAsIsHC / maxHC) * 160}px;"></div></div>
          <div class="chart-bar-col"><div class="chart-bar" style="background:linear-gradient(180deg,#00C853,#00A344);height:${(totalToBeHC / maxHC) * 160}px;"></div></div>
          <div class="chart-bar-col"><div class="chart-bar" style="background:linear-gradient(180deg,#FFB300,#CC8F00);height:${((div.headcount_target || 0) / maxHC) * 160}px;"></div></div>
        </div>
      </div>
      <div class="chart-labels">
        <div class="chart-label-col"><span class="chart-label-text" style="color:#0066FF;">AS-IS</span><span class="chart-label-value">${formatNumber(totalAsIsHC)}</span></div>
        <div class="chart-label-col"><span class="chart-label-text" style="color:#00C853;">TO-BE</span><span class="chart-label-value">${formatNumber(totalToBeHC)}</span></div>
        <div class="chart-label-col"><span class="chart-label-target" style="color:#FFB300;">Target</span><span class="chart-label-value">${formatNumber(div.headcount_target || 0)}</span></div>
      </div>
    </div>
    <div class="zbod-card p-6 chart-card">
      <h4 class="chart-title">Budget Comparison</h4>
      <div class="chart-area">
        <div class="chart-bars">
          <div class="chart-bar-col"><div class="chart-bar" style="background:linear-gradient(180deg,#0066FF,#0052CC);height:${(totalAsIsBudget / maxBudget) * 160}px;"></div></div>
          <div class="chart-bar-col"><div class="chart-bar" style="background:linear-gradient(180deg,#00C853,#00A344);height:${(totalToBeBudget / maxBudget) * 160}px;"></div></div>
          <div class="chart-bar-col"><div class="chart-bar" style="background:linear-gradient(180deg,#FFB300,#CC8F00);height:${((div.budget_target || 0) / maxBudget) * 160}px;"></div></div>
        </div>
      </div>
      <div class="chart-labels">
        <div class="chart-label-col"><span class="chart-label-text" style="color:#0066FF;">AS-IS</span><span class="chart-label-value">${formatNumber(totalAsIsBudget)}</span></div>
        <div class="chart-label-col"><span class="chart-label-text" style="color:#00C853;">TO-BE</span><span class="chart-label-value">${formatNumber(totalToBeBudget)}</span></div>
        <div class="chart-label-col"><span class="chart-label-target" style="color:#FFB300;">Target</span><span class="chart-label-value">${formatNumber(div.budget_target || 0)}</span></div>
      </div>
    </div>
  </div>`;

  html += `<div class="zbod-card p-6 mb-8"><h4 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:16px;color:#2E642C;margin-bottom:16px;">TO-BE Org Chart</h4><div class="org-chart-container">${renderOrgChart(fns, div.structure_name, div)}</div></div>`;

  html += `<div class="zbod-card p-6 mb-8">
    <h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;margin-bottom:16px;">Division Targets vs Proposed</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div><p style="font-size:12px;color:#6b7280;margin-bottom:8px;">Headcount</p><div class="flex items-center gap-4"><div class="flex-1"><div style="height:8px;border-radius:4px;background:#f3f4f6;overflow:hidden;"><div style="height:100%;border-radius:4px;background:linear-gradient(90deg,#00C853,#00A344);width:${Math.min((totalToBeHC/(div.headcount_target||1))*100,100)}%;"></div></div></div><span style="font-size:12px;color:#6b7280;">${formatNumber(totalToBeHC)} / ${formatNumber(div.headcount_target || 0)}</span></div></div>
      <div><p style="font-size:12px;color:#6b7280;margin-bottom:8px;">Budget</p><div class="flex items-center gap-4"><div class="flex-1"><div style="height:8px;border-radius:4px;background:#f3f4f6;overflow:hidden;"><div style="height:100%;border-radius:4px;background:linear-gradient(90deg,#0066FF,#0052CC);width:${Math.min((totalToBeBudget/(div.budget_target||1))*100,100)}%;"></div></div></div><span style="font-size:12px;color:#6b7280;">${formatNumber(totalToBeBudget)} / ${formatNumber(div.budget_target || 0)}</span></div></div>
    </div>
  </div>`;

  return { html, inc, kp, opt, elm, fns };
}

function renderDashboardCharts(inc, kp, opt, elm, fns, asIsFns, chartPrefix = '') {
  // Destroy any existing chart instances before creating new ones
  // This prevents Chart.js "canvas already in use" errors when navigating between pages
  ['decisionPieChart','hcPieChart','budgetPieChart','asIsHcPieChart','asIsBudgetPieChart'].forEach(id => destroyChart(chartPrefix + id));

  const totalF = fns.length || 1;
  const pieLabelPlugin = {
    id: 'pieLabels',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        const total = ds.data.reduce((a, b) => a + b, 0);
        meta.data.forEach((arc, i) => {
          if (ds.data[i] === 0) return;
          const pct = ((ds.data[i] / total) * 100).toFixed(1) + '%';
          const mid = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
          const x = arc.x + Math.cos(mid) * (arc.outerRadius * 0.55);
          const y = arc.y + Math.sin(mid) * (arc.outerRadius * 0.55);
          ctx.fillStyle = '#FFFFFF';
          const labelFontSize = chart.width > 400 ? 16 : 13;
          ctx.font = `bold ${labelFontSize}px Inter`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 4;
          ctx.fillText(pct, x, y);
          ctx.shadowBlur = 0;
        });
      });
    }
  };

  const execPalette = ['#0066FF','#00C853','#FFB300','#00B8D4','#FF6D00','#00E676','#FF1744','#7C4DFF'];
  const pieOptions = {
    responsive: true,
    animation: { animateRotate: true, duration: 800 },
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 11, family: 'Inter' }, boxWidth: 12, padding: 12, usePointStyle: true } },
      tooltip: { backgroundColor: 'rgba(17,24,39,0.9)', titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
    },
    hover: { animationDuration: 300 }
  };

  const distPieOptions = {
    responsive: true,
    animation: { animateRotate: true, duration: 800 },
    plugins: {
      legend: { position: 'right', labels: { font: { size: 14, family: 'Inter' }, boxWidth: 18, padding: 16, usePointStyle: true } },
      tooltip: { backgroundColor: 'rgba(17,24,39,0.9)', titleFont: { size: 14 }, bodyFont: { size: 14 }, padding: 12, cornerRadius: 8 }
    },
    hover: { animationDuration: 300 }
  };

  const emptyMsg = '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0;">No data available for this workshop.</p>';

  // Decision Distribution (TO-BE)
  const decisionCanvas = document.getElementById(chartPrefix + 'decisionPieChart');
  if (decisionCanvas) {
    registerChart(chartPrefix + 'decisionPieChart', new Chart(decisionCanvas, {
      type: 'pie',
      plugins: [pieLabelPlugin],
      data: { labels: ['INVEST','KEEP','OPTIMIZE','ELIMINATE'], datasets: [{ data: [inc.length, kp.length, opt.length, elm.length], backgroundColor: ['#00E676','#FF6D00','#00B8D4','#FF1744'], hoverOffset: 8 }] },
      options: { ...pieOptions, plugins: { ...pieOptions.plugins, tooltip: { ...pieOptions.plugins.tooltip, callbacks: { label: (c) => `${c.label}: ${c.raw} (${((c.raw/totalF)*100).toFixed(1)}%)` } } } }
    }));
  }

  // TO-BE Headcount Distribution
  const hcCanvas = document.getElementById(chartPrefix + 'hcPieChart');
  const hcData = fns.map(f => f.proposed_hc || 0).filter(v => v > 0);
  const hcLabels = fns.filter(f => (f.proposed_hc || 0) > 0).map(f => f.proposed_function_name);
  if (hcCanvas) {
    if (hcData.length > 0) {
      registerChart(chartPrefix + 'hcPieChart', new Chart(hcCanvas, {
        type: 'pie',
        plugins: [pieLabelPlugin],
        data: { labels: hcLabels, datasets: [{ data: hcData, backgroundColor: execPalette, hoverOffset: 8 }] },
        options: distPieOptions
      }));
    } else {
      hcCanvas.parentElement.innerHTML = emptyMsg;
    }
  }

  // TO-BE Budget Distribution
  const budgetCanvas = document.getElementById(chartPrefix + 'budgetPieChart');
  const budgetData = fns.map(f => f.proposed_budget || 0).filter(v => v > 0);
  const budgetLabels = fns.filter(f => (f.proposed_budget || 0) > 0).map(f => f.proposed_function_name);
  if (budgetCanvas) {
    if (budgetData.length > 0) {
      registerChart(chartPrefix + 'budgetPieChart', new Chart(budgetCanvas, {
        type: 'pie',
        plugins: [pieLabelPlugin],
        data: { labels: budgetLabels, datasets: [{ data: budgetData, backgroundColor: execPalette, hoverOffset: 8 }] },
        options: distPieOptions
      }));
    } else {
      budgetCanvas.parentElement.innerHTML = emptyMsg;
    }
  }

  // AS-IS Headcount Distribution
  const asIsHcCanvas = document.getElementById(chartPrefix + 'asIsHcPieChart');
  const asIsHcData = asIsFns.map(f => f.current_function_hc || 0).filter(v => v > 0);
  const asIsHcLabels = asIsFns.filter(f => (f.current_function_hc || 0) > 0).map(f => f.function_name);
  if (asIsHcCanvas) {
    if (asIsHcData.length > 0) {
      registerChart(chartPrefix + 'asIsHcPieChart', new Chart(asIsHcCanvas, {
        type: 'pie',
        plugins: [pieLabelPlugin],
        data: { labels: asIsHcLabels, datasets: [{ data: asIsHcData, backgroundColor: execPalette, hoverOffset: 8 }] },
        options: distPieOptions
      }));
    } else {
      asIsHcCanvas.parentElement.innerHTML = emptyMsg;
    }
  }

  // AS-IS Budget Distribution (managers_cost + professionals_cost)
  const asIsBudgetCanvas = document.getElementById(chartPrefix + 'asIsBudgetPieChart');
  const asIsBudgetData = asIsFns.map(f => (f.managers_cost || 0) + (f.professionals_cost || 0)).filter(v => v > 0);
  const asIsBudgetLabels = asIsFns.filter(f => ((f.managers_cost || 0) + (f.professionals_cost || 0)) > 0).map(f => f.function_name);
  if (asIsBudgetCanvas) {
    if (asIsBudgetData.length > 0) {
      registerChart(chartPrefix + 'asIsBudgetPieChart', new Chart(asIsBudgetCanvas, {
        type: 'pie',
        plugins: [pieLabelPlugin],
        data: { labels: asIsBudgetLabels, datasets: [{ data: asIsBudgetData, backgroundColor: execPalette, hoverOffset: 8 }] },
        options: distPieOptions
      }));
    } else {
      asIsBudgetCanvas.parentElement.innerHTML = emptyMsg;
    }
  }
}

function renderAsIsOrgChart(asIsFns) {
  if (!asIsFns || asIsFns.length === 0) {
    return `<p style="color:#9ca3af;font-size:13px;text-align:center;">No AS-IS functions to display</p>`;
  }
  const totalHC = asIsFns.reduce((s, f) => s + (f.current_function_hc || 0), 0);
  const totalMgrs = asIsFns.reduce((s, f) => s + (f.manager_count || 0), 0);
  const totalProfs = asIsFns.reduce((s, f) => s + (f.current_employee_count || 0), 0);
  let html = `<div style="display:flex;flex-direction:column;align-items:center;gap:16px;">`;
  // Root node
  html += `<div class="org-chart-node" style="min-width:200px;background:linear-gradient(135deg,rgba(0,102,255,0.08) 0%,rgba(0,200,83,0.06) 100%);border-color:rgba(0,102,255,0.25);">
    <span class="ocn-title">AS-IS Workforce</span>
    <div class="ocn-detail">Total HC: ${formatNumber(totalHC)}</div>
    <div class="ocn-detail">Managers: ${formatNumber(totalMgrs)} | Professionals: ${formatNumber(totalProfs)}</div>
  </div>`;
  html += `<div class="org-chart-connector"></div>`;
  html += `<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">`;
  asIsFns.forEach(f => {
    const mgr = f.manager_count || 0;
    const prof = f.current_employee_count || 0;
    html += `<div class="org-chart-node">
      <span class="ocn-title">${f.function_name || 'Unnamed'}</span>
      <div class="ocn-detail">Mgr: ${formatNumber(mgr)} | Prof: ${formatNumber(prof)}</div>
    </div>`;
  });
  html += `</div></div>`;
  return html;
}

// ═══════════════════════════════════════════
// RENDER: HISTORY PAGE
// ═══════════════════════════════════════════
function renderHistory() {
  const div = getDivs().find(d => d.id === state.selectedDivisionId);
  if (!div) return;
  const ws = getWs().filter(w => w.division_id === div.id && w.status === 'completed').sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  document.getElementById('history-header').innerHTML = `
    <div class="flex items-center gap-4 max-w-5xl mx-auto">
      <button class="zbod-btn-secondary" style="padding:10px 14px;" onclick="app.goToWorkspace()">${ICONS.arrowLeft}</button>
      <h1 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">${div.structure_name} &mdash; Previous Workshops</h1>
    </div>`;

  if (ws.length === 0) {
    document.getElementById('history-content').innerHTML = `<div class="text-center py-12"><div style="margin-bottom:12px;">${ICONS.history}</div><p style="color:#6b7280;">No completed workshops yet</p></div>`;
    return;
  }

  let html = `<div class="space-y-4">`;
  ws.forEach(w => {
    const dt = new Date(w.completed_at || w.created_at);
    const fns = getFns().filter(f => f.workshop_id === w.id);
    const totalHC = fns.reduce((s, f) => s + (f.proposed_hc || 0), 0);
    const totalBudget = fns.reduce((s, f) => s + (f.proposed_budget || 0), 0);
    const isSubmitted = !!w.submitted_for_hr_review_at;

    html += `<div class="zbod-card p-5 flex items-center justify-between zbod-card-hover" style="cursor:pointer;" onclick="app.viewHistoryWorkshop('${w.id}')">
      <div class="flex items-center gap-4">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg, rgba(46,100,44,0.1) 0%, rgba(15,52,76,0.1) 100%);display:flex;align-items:center;justify-content:center;">${ICONS.calendar}</div>
        <div>
          <div class="flex items-center gap-2">
            <h3 style="font-family:'Montserrat',sans-serif;font-weight:600;color:#111827;">Workshop #${w.id.slice(0,8)}</h3>
            ${isSubmitted ? `<span class="hr-status-badge hr-status-badge--submitted" style="font-size:10px;padding:3px 10px;">${ICONS.checkCircle} Submitted for HR Review</span>` : ''}
          </div>
          <p style="font-size:13px;color:#6b7280;">${dt.toLocaleDateString()} &mdash; ${dt.toLocaleTimeString()}</p>
          <p style="font-size:11px;color:#00C853;margin-top:4px;">${fns.length} functions | HC: ${formatNumber(totalHC)} | Budget: ${formatNumber(totalBudget)} AZN</p>
        </div>
      </div>
      ${ICONS.chevronRight}
    </div>`;
  });
  html += `</div>`;
  document.getElementById('history-content').innerHTML = html;
}

// ═══════════════════════════════════════════
// RENDER: HISTORY REVIEW PAGE
// ═══════════════════════════════════════════
function renderHistoryReview() {
  const ws = getWs().find(w => w.id === state.selectedHistoryWorkshopId);
  if (!ws) return;
  const div = getDivs().find(d => d.id === ws.division_id);
  if (!div) return;
  const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);
  const asIsFns = getAsIs().filter(f => f.division_id === ws.division_id);

  const isSubmitted = !!ws.submitted_for_hr_review_at;
  document.getElementById('history-review-header').innerHTML = `
    <div class="flex items-center gap-4 max-w-screen-2xl mx-auto">
      <button class="zbod-btn-secondary" style="padding:10px 14px;" onclick="app.goToHistory()">${ICONS.arrowLeft}</button>
      <div class="flex-1 flex items-center gap-3"><div style="width:32px;height:32px;border-radius:8px;background:rgba(46,100,44,0.1);display:flex;align-items:center;justify-content:center;">${ICONS.history}</div><h1 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">Workshop from ${new Date(ws.completed_at || ws.created_at).toLocaleDateString()} ${new Date(ws.completed_at || ws.created_at).toLocaleTimeString()}</h1>${isSubmitted ? `<span class="hr-status-badge hr-status-badge--submitted">${ICONS.checkCircle} Submitted for HR Review</span>` : ''}</div>
      ${isSubmitted ? `<button class="zbod-btn-primary" style="padding:8px 16px;font-size:12px;" onclick="app.goToHRReview()">${ICONS.eye} View HR Submission</button>` : ''}
    </div>`;

  // Destroy old charts before injecting HTML to prevent Chart.js canvas conflicts
  destroyAllDashboardCharts();
  const dash = buildDashboardHTML(ws, div, fns, asIsFns, 'hist_');
  document.getElementById('history-review-content').innerHTML = dash.html;
  requestAnimationFrame(() => renderDashboardCharts(dash.inc, dash.kp, dash.opt, dash.elm, dash.fns, asIsFns, 'hist_'));
}


// ═══════════════════════════════════════════
// RENDER: HR REVIEW SUBMISSION PAGE
// ═══════════════════════════════════════════
function renderHRReview() {
  const ws = getWs().find(w => w.id === state.selectedHistoryWorkshopId);
  if (!ws) {
    document.getElementById('hr-review-content').innerHTML = `<div class="text-center py-12"><p style="color:#6b7280;">No workshop data found.</p><button onclick="app.goToWorkspace()" class="zbod-btn-primary mt-4">Return to Workplace</button></div>`;
    return;
  }
  const div = getDivs().find(d => d.id === ws.division_id);
  if (!div) {
    document.getElementById('hr-review-content').innerHTML = `<div class="text-center py-12"><p style="color:#6b7280;">No division data found.</p><button onclick="app.goToWorkspace()" class="zbod-btn-primary mt-4">Return to Workplace</button></div>`;
    return;
  }
  const fns = getFns().filter(f => f.workshop_id === ws.id);
  const totalToBeHC = calculateProposedHeadcount(ws.id);
  const totalToBeBudget = calculateProposedBudget(ws.id);
  const totalToBeMgrs = fns.reduce((s, f) => s + (f.manager_count || 0), 0);
  const totalToBeProfs = fns.reduce((s, f) => s + (f.professional_count || 0), 0);
  const wsDate = ws.completed_at ? new Date(ws.completed_at).toLocaleDateString() : new Date(ws.created_at).toLocaleDateString();

  document.getElementById('hr-review-header').innerHTML = `
    <div class="flex items-center gap-4 max-w-3xl mx-auto">
      <button class="zbod-btn-secondary" style="padding:10px 14px;" onclick="app.goToWorkspace()">${ICONS.arrowLeft}</button>
      <h1 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:18px;color:#111827;">HR Review Submission</h1>
    </div>`;

  document.getElementById('hr-review-content').innerHTML = `
    <div class="text-center mb-8">
      <div class="hr-success-icon">${ICONS.checkCircle}</div>
      <h2 style="font-family:'Montserrat',sans-serif;font-weight:800;font-size:32px;color:#111827;margin-bottom:8px;">Workshop Submitted Successfully</h2>
      <p style="font-size:15px;color:#6b7280;max-width:480px;margin:0 auto;line-height:1.6;">The workshop has been finalized successfully. All submitted data will now be reviewed by the HR team for further analysis and validation.</p>
    </div>

    <div class="hr-status-badge hr-status-badge--submitted mb-6" style="display:flex;justify-content:center;">
      <span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.checkCircle} Submitted for HR Review</span>
    </div>

    <div class="hr-summary-card mb-8">
      <h3 style="font-family:'Montserrat',sans-serif;font-weight:700;font-size:14px;color:#0F3C76;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">Workshop Summary</h3>
      <div class="hr-summary-row"><span class="hr-summary-label">Structure Name</span><span class="hr-summary-value">${div.structure_name || '-'}</span></div>
      <div class="hr-summary-row"><span class="hr-summary-label">Structure Type</span><span class="hr-summary-value">${div.structure_type || '-'}</span></div>
      <div class="hr-summary-row"><span class="hr-summary-label">Workshop Date</span><span class="hr-summary-value">${wsDate}</span></div>
      <div class="hr-summary-row"><span class="hr-summary-label">Proposed HC</span><span class="hr-summary-value" style="color:#00C853;">${formatNumber(totalToBeHC)}</span></div>
      <div class="hr-summary-row"><span class="hr-summary-label">Proposed Cost</span><span class="hr-summary-value" style="color:#00C853;">${formatNumber(totalToBeBudget)} AZN</span></div>
      <div class="hr-summary-row"><span class="hr-summary-label">Proposed Managers</span><span class="hr-summary-value">${formatNumber(totalToBeMgrs)}</span></div>
      <div class="hr-summary-row"><span class="hr-summary-label">Proposed Professionals</span><span class="hr-summary-value">${formatNumber(totalToBeProfs)}</span></div>
    </div>

    <div class="flex flex-col gap-3">
      <button onclick="app.exportToExcel()" class="zbod-btn-export" style="width:100%;justify-content:center;">${ICONS.download} Export Report</button>
      <button onclick="app.goToWorkspace()" class="zbod-btn-secondary" style="width:100%;justify-content:center;padding:14px 32px;">${ICONS.home} Return to Workplace</button>
      <button onclick="app.viewHistoryWorkshop('${ws.id}')" class="zbod-btn-primary" style="width:100%;justify-content:center;padding:14px 32px;">${ICONS.activity} View Workshop Summary</button>
    </div>
  `;
}


// ═══════════════════════════════════════════
// APP CONTROLLER
// ═══════════════════════════════════════════
const app = {

  // === NAVIGATION ===
  goToLanding() { showPage('landing'); renderLanding(); },
  goToDivisions() { showPage('divisions'); renderDivisions(); },
  searchDivisions(query) { renderDivisions(query); },
  goToWorkspace() { showPage('workspace'); renderWorkspace(); },
  goToHistory() { showPage('history'); renderHistory(); },
  goToHRReview() { showPage('hr-review'); renderHRReview(); },

  verifyAndSelectDivision(id) {
    const div = getDivs().find(d => d.id === id);
    if (!div) return;
    if (!div.division_password_temp) { this.selectDivision(id); return; }
    state._passwordTargetId = id;
    document.getElementById('password-verification-dialog').classList.remove('hidden');
    document.getElementById('password-verification-errors').innerHTML = '';
    document.getElementById('structure-password-input').value = '';
  },

  hidePasswordModal() {
    document.getElementById('password-verification-dialog').classList.add('hidden');
    state._passwordTargetId = null;
  },

  submitPassword() {
    const input = document.getElementById('structure-password-input').value;
    const id = state._passwordTargetId;
    if (!id) return;
    const div = getDivs().find(d => d.id === id);
    if (!div) return;
    if (input === div.division_password_temp) {
      document.getElementById('password-verification-dialog').classList.add('hidden');
      state._passwordTargetId = null;
      this.selectDivision(id);
    } else {
      document.getElementById('password-verification-errors').innerHTML = 'Incorrect password. Please try again.';
    }
  },

  // === RESET PASSWORD FLOW ===
  showResetPassword() {
    document.getElementById('password-verification-dialog').classList.add('hidden');
    document.getElementById('reset-code-dialog').classList.remove('hidden');
    document.getElementById('reset-code-errors').innerHTML = '';
    document.getElementById('reset-code-input').value = '';
  },

  hideResetCodeModal() {
    document.getElementById('reset-code-dialog').classList.add('hidden');
    document.getElementById('password-verification-dialog').classList.remove('hidden');
    document.getElementById('reset-code-input').value = '';
    document.getElementById('reset-code-errors').innerHTML = '';
  },

  submitResetCode() {
    const RESET_CODE = 'Elnura2003';
    const input = document.getElementById('reset-code-input').value;
    if (input === RESET_CODE) {
      document.getElementById('reset-code-dialog').classList.add('hidden');
      document.getElementById('new-password-dialog').classList.remove('hidden');
      document.getElementById('new-password-errors').innerHTML = '';
      document.getElementById('new-password-input').value = '';
      document.getElementById('confirm-new-password-input').value = '';
    } else {
      document.getElementById('reset-code-errors').innerHTML = 'Invalid reset code. Please try again.';
    }
  },

  hideNewPasswordModal() {
    document.getElementById('new-password-dialog').classList.add('hidden');
    document.getElementById('reset-code-dialog').classList.remove('hidden');
    document.getElementById('new-password-input').value = '';
    document.getElementById('confirm-new-password-input').value = '';
    document.getElementById('new-password-errors').innerHTML = '';
  },

  saveNewPassword() {
    const newPw = document.getElementById('new-password-input').value;
    const confirmPw = document.getElementById('confirm-new-password-input').value;
    const id = state._passwordTargetId;

    let error = '';
    if (!newPw) error = 'New Password is required.';
    else if (!confirmPw) error = 'Confirm New Password is required.';
    else if (newPw.length < 6) error = 'Password must be at least 6 characters.';
    else if (newPw !== confirmPw) error = 'Passwords do not match.';

    if (error) {
      document.getElementById('new-password-errors').innerHTML = error;
      return;
    }

    if (id) {
      updDiv(id, { division_password_temp: newPw });
    }

    document.getElementById('new-password-dialog').classList.add('hidden');
    document.getElementById('password-verification-dialog').classList.remove('hidden');
    document.getElementById('structure-password-input').value = '';
    document.getElementById('password-verification-errors').innerHTML = '';
    state._passwordTargetId = id;

    document.getElementById('new-password-input').value = '';
    document.getElementById('confirm-new-password-input').value = '';
    document.getElementById('new-password-errors').innerHTML = '';

    toast('Password has been reset successfully.');
  },

  selectDivision(id) { state.selectedDivisionId = id; state.editingDivision = false; state._divEditForm = null; state.asIsNewRows = []; state.asIsEditing = {}; state.asIsSaved = false; showPage('workspace'); renderWorkspace(); },

  // === LANDING PAGE EDIT (SIMPLIFIED - OVERVIEW ONLY) ===
  editLanding() {
    const defaultContent = {
      overviewTitle: 'What is Zero-Based Organizational Design?',
      overviewText: 'Zero-Based Organizational Design (ZBOD) is a comprehensive methodology for building organizational structures from the ground up. Rather than making incremental changes to existing structures, ZBOD enables organizations to strategically rethink and redesign their entire operating model to align with business priorities.',
    };
    const content = {...defaultContent, ...lsGet(LS.landing, {})};
    state.landingEditing = 'overview';
    state.landingDrafts = { overviewTitle: content.overviewTitle, overviewText: content.overviewText };
    renderLanding();
  },

  editGuideline() {
    const guidelineDefaults = [
      { id: 'gl1', iconKey: 'compass',  title: 'STARTING POINT',  text: 'Set the current organizational structure completely aside; redesign from zero. Primary focus: revisit and redesign the organization based on strategy and business priorities.' },
      { id: 'gl2', iconKey: 'target',   title: 'VALUE FOCUS',     text: 'Identify only functions that create measurable value. The argument "it existed before" is not valid. Remove low-value activities.' },
      { id: 'gl3', iconKey: 'userCog',  title: 'FUNCTIONS',       text: 'Design functions that add value to the business. Ask yourself: Can this function be eliminated? Can it be automated? Can it be outsourced? Only create the function if the answer to all three questions is "no" (business justification needed). Shadow support activities should be automated, outsourced, or eliminated.' },
      { id: 'gl4', iconKey: 'users',    title: 'MANAGEMENT',      text: 'Minimize the number of management layers. Do not create deputy / deputy-of-deputy structures. Target 8\u201312 direct reports per manager to ensure an effective span of control. Deploy human resources in the functions that deliver the highest business value.' },
      { id: 'gl5', iconKey: 'userCheck',title: 'PEOPLE QUALITY',  text: 'Aim to work with a small but highly talented team. Automate or outsource low-grade work. Always consider optimization targets and size the team accordingly.' },
      { id: 'gl6', iconKey: 'layers',   title: 'PROCESSES',       text: 'Eliminate or simplify manual and complex processes. Job = end-to-end accountability. Redesign processes based on newly created functions. For every process, automation, AI, and RPA should be top priorities.' },
      { id: 'gl7', iconKey: 'dollar',   title: 'COST & CAPITAL',  text: 'Every function must have a clear cost vs. value justification.' },
    ];
    const savedGuidelines = lsGet('zbod_guidelines', null);
    const guidelineData = savedGuidelines && Array.isArray(savedGuidelines) ? savedGuidelines : guidelineDefaults;
    const guidelineTitle = lsGet('zbod_guideline_title', 'ZBOD GUIDELINE');
    state.landingEditing = 'guideline';
    state.landingDrafts = { guidelineTitle };
    guidelineData.forEach((g, i) => {
      state.landingDrafts[`gl_title_${i}`] = g.title;
      state.landingDrafts[`gl_text_${i}`] = g.text;
    });
    renderLanding();
  },

  saveGuideline() {
    const guidelineDefaults = [
      { id: 'gl1', iconKey: 'compass',  title: 'STARTING POINT',  text: 'Set the current organizational structure completely aside; redesign from zero. Primary focus: revisit and redesign the organization based on strategy and business priorities.' },
      { id: 'gl2', iconKey: 'target',   title: 'VALUE FOCUS',     text: 'Identify only functions that create measurable value. The argument "it existed before" is not valid. Remove low-value activities.' },
      { id: 'gl3', iconKey: 'userCog',  title: 'FUNCTIONS',       text: 'Design functions that add value to the business. Ask yourself: Can this function be eliminated? Can it be automated? Can it be outsourced? Only create the function if the answer to all three questions is "no" (business justification needed). Shadow support activities should be automated, outsourced, or eliminated.' },
      { id: 'gl4', iconKey: 'users',    title: 'MANAGEMENT',      text: 'Minimize the number of management layers. Do not create deputy / deputy-of-deputy structures. Target 8\u201312 direct reports per manager to ensure an effective span of control. Deploy human resources in the functions that deliver the highest business value.' },
      { id: 'gl5', iconKey: 'userCheck',title: 'PEOPLE QUALITY',  text: 'Aim to work with a small but highly talented team. Automate or outsource low-grade work. Always consider optimization targets and size the team accordingly.' },
      { id: 'gl6', iconKey: 'layers',   title: 'PROCESSES',       text: 'Eliminate or simplify manual and complex processes. Job = end-to-end accountability. Redesign processes based on newly created functions. For every process, automation, AI, and RPA should be top priorities.' },
      { id: 'gl7', iconKey: 'dollar',   title: 'COST & CAPITAL',  text: 'Every function must have a clear cost vs. value justification.' },
    ];
    const savedGuidelines = lsGet('zbod_guidelines', null);
    const guidelineData = savedGuidelines && Array.isArray(savedGuidelines) ? [...savedGuidelines] : guidelineDefaults;

    if (state.landingDrafts.guidelineTitle) {
      lsSet('zbod_guideline_title', state.landingDrafts.guidelineTitle);
    }
    guidelineData.forEach((g, i) => {
      if (state.landingDrafts[`gl_title_${i}`] !== undefined) g.title = state.landingDrafts[`gl_title_${i}`];
      if (state.landingDrafts[`gl_text_${i}`] !== undefined) g.text = state.landingDrafts[`gl_text_${i}`];
    });
    lsSet('zbod_guidelines', guidelineData);

    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      try {
        if (state.landingDrafts.guidelineTitle) {
          window.zbodSupabase.sbSaveLandingBox({
            box_id: 'guideline_title',
            position_order: 0,
            title: state.landingDrafts.guidelineTitle,
            content: '',
          });
        }
        guidelineData.forEach((g, i) => {
          window.zbodSupabase.sbSaveLandingBox({
            box_id: g.id,
            position_order: i + 1,
            title: g.title,
            content: g.text,
          });
        });
      } catch (e) { console.warn('Supabase guideline sync failed:', e); }
    }

    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Guideline saved');
  },

  cancelGuidelineEdit() {
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
  },

  editProblems() {
    const problemsDefaults = [
      'Too many management layers',
      'Decentralized and duplicated functions',
      'Low span of control',
      'Low-grade employees',
      'Shadow Support Functions',
      'Complex, manual-based processes and jobs',
      'Multi-layered deputy hierarchy',
    ];
    const savedProblems = lsGet('zbod_problems', null);
    const problemsData = savedProblems && Array.isArray(savedProblems) ? savedProblems : problemsDefaults;
    const problemsTitleDefault = 'PROBLEM STATEMENT';
    const savedProblemsTitle = lsGet('zbod_problems_title', null);
    const problemsTitle = savedProblemsTitle !== null ? savedProblemsTitle : problemsTitleDefault;
    state.landingEditing = 'problems';
    state.landingDrafts = { problems_title: problemsTitle };
    problemsData.forEach((t, i) => {
      state.landingDrafts[`pr_text_${i}`] = t;
    });
    renderLanding();
  },

  saveProblems() {
    const problemsDefaults = [
      'Too many management layers',
      'Decentralized and duplicated functions',
      'Low span of control',
      'Low-grade employees',
      'Shadow Support Functions',
      'Complex, manual-based processes and jobs',
      'Multi-layered deputy hierarchy',
    ];
    const savedProblems = lsGet('zbod_problems', null);
    const problemsData = savedProblems && Array.isArray(savedProblems) ? [...savedProblems] : [...problemsDefaults];
    problemsData.forEach((t, i) => {
      if (state.landingDrafts[`pr_text_${i}`] !== undefined) problemsData[i] = state.landingDrafts[`pr_text_${i}`];
    });
    lsSet('zbod_problems', problemsData);
    if (state.landingDrafts['problems_title'] !== undefined) {
      lsSet('zbod_problems_title', state.landingDrafts['problems_title']);
    }

    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      try {
        window.zbodSupabase.sbSaveLandingBox({
          box_id: 'problems',
          position_order: 99,
          title: state.landingDrafts['problems_title'] || 'Problem Statement',
          content: JSON.stringify(problemsData),
        });
      } catch (e) { console.warn('Supabase problems sync failed:', e); }
    }

    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Problem statement saved');
  },

  cancelProblemsEdit() {
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
  },

  editQuestions() {
    const questionsDefaults = [
      { id: 'mq1', label: 'MQ1', text: "Let's assume we are building the structure from scratch. According to your vision, which business functions must be created in order to add value to the business?" },
      { id: 'mq2', label: 'MQ2', text: 'To what degree is it possible to automate or outsource the proposed function?' },
      { id: 'mq3', label: 'MQ3', text: 'Is there any function that is currently being overlooked or ignored?' },
    ];
    const savedQuestions = lsGet('zbod_questions', null);
    const questionsData = savedQuestions && Array.isArray(savedQuestions) ? savedQuestions : questionsDefaults;
    const questionsTitleDefault = 'MAIN QUESTIONS';
    const savedQuestionsTitle = lsGet('zbod_questions_title', null);
    const questionsTitle = savedQuestionsTitle !== null ? savedQuestionsTitle : questionsTitleDefault;
    state.landingEditing = 'questions';
    state.landingDrafts = { questions_title: questionsTitle };
    questionsData.forEach((q, i) => {
      state.landingDrafts[`mq_label_${i}`] = q.label;
      state.landingDrafts[`mq_text_${i}`] = q.text;
    });
    renderLanding();
  },

  saveQuestions() {
    const questionsDefaults = [
      { id: 'mq1', label: 'MQ1', text: "Let's assume we are building the structure from scratch. According to your vision, which business functions must be created in order to add value to the business?" },
      { id: 'mq2', label: 'MQ2', text: 'To what degree is it possible to automate or outsource the proposed function?' },
      { id: 'mq3', label: 'MQ3', text: 'Is there any function that is currently being overlooked or ignored?' },
    ];
    const savedQuestions = lsGet('zbod_questions', null);
    const questionsData = savedQuestions && Array.isArray(savedQuestions) ? [...savedQuestions] : [...questionsDefaults];
    questionsData.forEach((q, i) => {
      if (state.landingDrafts[`mq_label_${i}`] !== undefined) q.label = state.landingDrafts[`mq_label_${i}`];
      if (state.landingDrafts[`mq_text_${i}`] !== undefined) q.text = state.landingDrafts[`mq_text_${i}`];
    });
    lsSet('zbod_questions', questionsData);
    if (state.landingDrafts['questions_title'] !== undefined) {
      lsSet('zbod_questions_title', state.landingDrafts['questions_title']);
    }

    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      try {
        window.zbodSupabase.sbSaveLandingBox({
          box_id: 'questions_title',
          position_order: 195,
          title: state.landingDrafts['questions_title'] || 'MAIN QUESTIONS',
          content: '',
        });
        questionsData.forEach((q, i) => {
          window.zbodSupabase.sbSaveLandingBox({
            box_id: q.id,
            position_order: 200 + i,
            title: q.label,
            content: q.text,
          });
        });
      } catch (e) { console.warn('Supabase questions sync failed:', e); }
    }

    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Questions saved');
  },

  cancelQuestionsEdit() {
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
  },

  editQuote() {
    const quoteDefault = "Let's put the current organizational structure aside and focus purely on the strategy. Let's think about where the business is going over the next three years and how the organization should add value to that direction. If we were designing the organization from scratch, which capabilities would be most critical for delivering the strategy? Let's work together to shape a structure that will genuinely enable the business and maximize value over the next three years.";
    const savedQuote = lsGet('zbod_quote', null);
    const quoteText = savedQuote !== null ? savedQuote : quoteDefault;
    state.landingEditing = 'quote';
    state.landingDrafts = { quote_text: quoteText };
    renderLanding();
  },

  saveQuote() {
    if (state.landingDrafts['quote_text'] !== undefined) {
      lsSet('zbod_quote', state.landingDrafts['quote_text']);
      if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
        try {
          window.zbodSupabase.sbSaveLandingBox({
            box_id: 'quote',
            position_order: 300,
            title: 'Strategic Quote',
            content: state.landingDrafts['quote_text'],
          });
        } catch (e) { console.warn('Supabase quote sync failed:', e); }
      }
    }
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Quote saved');
  },

  cancelQuoteEdit() {
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
  },

  editStrategic() {
    const strategicDefaults = [
      { id: 'sq1', label: 'SQ1', text: 'Does this function materially contribute to business strategy and outcomes, and enable scalable, efficient value creation (e.g. revenue, productivity, customer experience, automation)?' },
      { id: 'sq2', label: 'SQ2', text: 'How critical is this function to business continuity and risk management, and what would be the impact if it were stopped today (legal, financial, regulatory, reputational, operational)?' },
    ];
    const savedStrategic = lsGet('zbod_strategic', null);
    const strategicData = savedStrategic && Array.isArray(savedStrategic) ? savedStrategic : strategicDefaults;
    const strategicTitleDefault = 'STRATEGIC QUESTIONS';
    const savedStrategicTitle = lsGet('zbod_strategic_title', null);
    const strategicTitle = savedStrategicTitle !== null ? savedStrategicTitle : strategicTitleDefault;
    state.landingEditing = 'strategic';
    state.landingDrafts = { strategic_title: strategicTitle };
    strategicData.forEach((s, i) => {
      state.landingDrafts[`sq_label_${i}`] = s.label;
      state.landingDrafts[`sq_text_${i}`] = s.text;
    });
    renderLanding();
  },

  saveStrategic() {
    const strategicDefaults = [
      { id: 'sq1', label: 'SQ1', text: 'Does this function materially contribute to business strategy and outcomes, and enable scalable, efficient value creation (e.g. revenue, productivity, customer experience, automation)?' },
      { id: 'sq2', label: 'SQ2', text: 'How critical is this function to business continuity and risk management, and what would be the impact if it were stopped today (legal, financial, regulatory, reputational, operational)?' },
    ];
    const savedStrategic = lsGet('zbod_strategic', null);
    const strategicData = savedStrategic && Array.isArray(savedStrategic) ? [...savedStrategic] : [...strategicDefaults];
    strategicData.forEach((s, i) => {
      if (state.landingDrafts[`sq_label_${i}`] !== undefined) s.label = state.landingDrafts[`sq_label_${i}`];
      if (state.landingDrafts[`sq_text_${i}`] !== undefined) s.text = state.landingDrafts[`sq_text_${i}`];
    });
    lsSet('zbod_strategic', strategicData);
    if (state.landingDrafts['strategic_title'] !== undefined) {
      lsSet('zbod_strategic_title', state.landingDrafts['strategic_title']);
    }

    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      try {
        window.zbodSupabase.sbSaveLandingBox({
          box_id: 'strategic_title',
          position_order: 395,
          title: state.landingDrafts['strategic_title'] || 'STRATEGIC QUESTIONS',
          content: '',
        });
        strategicData.forEach((s, i) => {
          window.zbodSupabase.sbSaveLandingBox({
            box_id: s.id,
            position_order: 400 + i,
            title: s.label,
            content: s.text,
          });
        });
      } catch (e) { console.warn('Supabase strategic sync failed:', e); }
    }

    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Strategic questions saved');
  },

  cancelStrategicEdit() {
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
  },

  editFcmatrix() {
    const fcmatrixDefaults = [
      { id: 'fca', letter: 'A', score: '9\u201310', title: 'Strategic', action: 'Invest', variant: 'a' },
      { id: 'fcb', letter: 'B', score: '7\u20138', title: 'Core Operations', action: 'Keep', variant: 'b' },
      { id: 'fcc', letter: 'C', score: '5\u20136', title: 'Efficiency', action: 'Optimize / Automate', variant: 'c' },
      { id: 'fcd', letter: 'D', score: '2\u20134', title: 'Non-Core', action: 'Eliminate / Outsource', variant: 'd' },
    ];
    const savedFcmatrix = lsGet('zbod_fcmatrix', null);
    const fcmatrixData = savedFcmatrix && Array.isArray(savedFcmatrix) ? savedFcmatrix : fcmatrixDefaults;
    const fcmatrixTitleDefault = 'FUNCTION CATEGORIZATION MATRIX';
    const savedFcmatrixTitle = lsGet('zbod_fcmatrix_title', null);
    const fcmatrixTitle = savedFcmatrixTitle !== null ? savedFcmatrixTitle : fcmatrixTitleDefault;
    state.landingEditing = 'fcmatrix';
    state.landingDrafts = { fcmatrix_title: fcmatrixTitle };
    fcmatrixData.forEach((item, i) => {
      state.landingDrafts[`fc_score_${i}`] = item.score;
      state.landingDrafts[`fc_title_${i}`] = item.title;
      state.landingDrafts[`fc_action_${i}`] = item.action;
    });
    renderLanding();
  },

  saveFcmatrix() {
    const fcmatrixDefaults = [
      { id: 'fca', letter: 'A', score: '9\u201310', title: 'Strategic', action: 'Invest', variant: 'a' },
      { id: 'fcb', letter: 'B', score: '7\u20138', title: 'Core Operations', action: 'Keep', variant: 'b' },
      { id: 'fcc', letter: 'C', score: '5\u20136', title: 'Efficiency', action: 'Optimize / Automate', variant: 'c' },
      { id: 'fcd', letter: 'D', score: '2\u20134', title: 'Non-Core', action: 'Eliminate / Outsource', variant: 'd' },
    ];
    const savedFcmatrix = lsGet('zbod_fcmatrix', null);
    const fcmatrixData = savedFcmatrix && Array.isArray(savedFcmatrix) ? [...savedFcmatrix] : [...fcmatrixDefaults];
    fcmatrixData.forEach((item, i) => {
      if (state.landingDrafts[`fc_score_${i}`] !== undefined) item.score = state.landingDrafts[`fc_score_${i}`];
      if (state.landingDrafts[`fc_title_${i}`] !== undefined) item.title = state.landingDrafts[`fc_title_${i}`];
      if (state.landingDrafts[`fc_action_${i}`] !== undefined) item.action = state.landingDrafts[`fc_action_${i}`];
    });
    lsSet('zbod_fcmatrix', fcmatrixData);
    if (state.landingDrafts['fcmatrix_title'] !== undefined) {
      lsSet('zbod_fcmatrix_title', state.landingDrafts['fcmatrix_title']);
    }

    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      try {
        window.zbodSupabase.sbSaveLandingBox({
          box_id: 'fcmatrix',
          position_order: 600,
          title: state.landingDrafts['fcmatrix_title'] || 'Function Categorization Matrix',
          content: JSON.stringify(fcmatrixData),
        });
      } catch (e) { console.warn('Supabase fcmatrix sync failed:', e); }
    }

    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Matrix saved');
  },

  cancelFcmatrixEdit() {
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
  },

  editSupport() {
    const supportDefaults = [
      { id: 'sf1', iconKey: 'settings', title: 'IT Support', text: 'Manage and maintain technology infrastructure, provide technical assistance, and ensure system reliability across the organization.' },
      { id: 'sf2', iconKey: 'shield', title: 'Security & Compliance', text: 'Oversee data protection, enforce security policies, and ensure regulatory compliance to minimize risk and safeguard organizational assets.' },
      { id: 'sf3', iconKey: 'barChart', title: 'Finance & Accounting', text: 'Handle budgeting, financial reporting, payroll processing, and fiscal planning to maintain organizational financial health.' },
      { id: 'sf4', iconKey: 'users', title: 'HR Administration', text: 'Manage recruitment, employee onboarding, benefits administration, and workplace policies to support workforce needs.' },
    ];
    const savedSupport = lsGet('zbod_support', null);
    const supportData = savedSupport && Array.isArray(savedSupport) ? savedSupport : supportDefaults;
    const supportTitleDefault = 'SUPPORT FUNCTIONS';
    const savedSupportTitle = lsGet('zbod_support_title', null);
    const supportTitle = savedSupportTitle !== null ? savedSupportTitle : supportTitleDefault;
    state.landingEditing = 'support';
    state.landingDrafts = { support_title: supportTitle };
    supportData.forEach((s, i) => {
      state.landingDrafts[`sf_title_${i}`] = s.title;
      state.landingDrafts[`sf_text_${i}`] = s.text;
    });
    renderLanding();
  },

  saveSupport() {
    const supportDefaults = [
      { id: 'sf1', iconKey: 'settings', title: 'IT Support', text: 'Manage and maintain technology infrastructure, provide technical assistance, and ensure system reliability across the organization.' },
      { id: 'sf2', iconKey: 'shield', title: 'Security & Compliance', text: 'Oversee data protection, enforce security policies, and ensure regulatory compliance to minimize risk and safeguard organizational assets.' },
      { id: 'sf3', iconKey: 'barChart', title: 'Finance & Accounting', text: 'Handle budgeting, financial reporting, payroll processing, and fiscal planning to maintain organizational financial health.' },
      { id: 'sf4', iconKey: 'users', title: 'HR Administration', text: 'Manage recruitment, employee onboarding, benefits administration, and workplace policies to support workforce needs.' },
    ];
    const savedSupport = lsGet('zbod_support', null);
    const supportData = savedSupport && Array.isArray(savedSupport) ? [...savedSupport] : [...supportDefaults];
    supportData.forEach((s, i) => {
      if (state.landingDrafts[`sf_title_${i}`] !== undefined) s.title = state.landingDrafts[`sf_title_${i}`];
      if (state.landingDrafts[`sf_text_${i}`] !== undefined) s.text = state.landingDrafts[`sf_text_${i}`];
    });
    lsSet('zbod_support', supportData);
    if (state.landingDrafts['support_title'] !== undefined) {
      lsSet('zbod_support_title', state.landingDrafts['support_title']);
    }

    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      try {
        window.zbodSupabase.sbSaveLandingBox({
          box_id: 'support',
          position_order: 700,
          title: state.landingDrafts['support_title'] || 'Support Functions',
          content: JSON.stringify(supportData),
        });
      } catch (e) { console.warn('Supabase support sync failed:', e); }
    }

    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Support functions saved');
  },

  cancelSupportEdit() {
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
  },

  editPrinciples() {
    const principlesDefaults = [
      'Key strategic directions for cost and process optimization',
      'Ignore the current org chart and design it from zero',
      'Automate or outsource before creation',
      'Focus on value creation',
    ];
    const savedPrinciples = lsGet('zbod_principles', null);
    const principlesData = savedPrinciples && Array.isArray(savedPrinciples) ? savedPrinciples : principlesDefaults;
    const principlesTitleDefault = 'CORE PRINCIPLES';
    const savedPrinciplesTitle = lsGet('zbod_principles_title', null);
    const principlesTitle = savedPrinciplesTitle !== null ? savedPrinciplesTitle : principlesTitleDefault;
    state.landingEditing = 'principles';
    state.landingDrafts = { principles_title: principlesTitle };
    principlesData.forEach((t, i) => {
      state.landingDrafts[`pr_text_${i}`] = t;
    });
    renderLanding();
  },

  savePrinciples() {
    const principlesDefaults = [
      'Key strategic directions for cost and process optimization',
      'Ignore the current org chart and design it from zero',
      'Automate or outsource before creation',
      'Focus on value creation',
    ];
    const savedPrinciples = lsGet('zbod_principles', null);
    const principlesData = savedPrinciples && Array.isArray(savedPrinciples) ? [...savedPrinciples] : [...principlesDefaults];
    principlesData.forEach((t, i) => {
      if (state.landingDrafts[`pr_text_${i}`] !== undefined) principlesData[i] = state.landingDrafts[`pr_text_${i}`];
    });
    lsSet('zbod_principles', principlesData);
    if (state.landingDrafts['principles_title'] !== undefined) {
      lsSet('zbod_principles_title', state.landingDrafts['principles_title']);
    }

    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      try {
        window.zbodSupabase.sbSaveLandingBox({
          box_id: 'principles',
          position_order: 500,
          title: state.landingDrafts['principles_title'] || 'Core Principles',
          content: JSON.stringify(principlesData),
        });
      } catch (e) { console.warn('Supabase principles sync failed:', e); }
    }

    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Core principles saved');
  },

  cancelPrinciplesEdit() {
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
  },

  editStrategicOverview() {
    const strategicOverviewDefault = {
      title: 'STRATEGIC OVERVIEW',
      subtitle: 'When designing the structure, these points must be taken into consideration.',
      columns: ['STRATEGIC METRICS', '2025', '2026', 'TARGET', '2027'],
      rows: [
        { metric: '# of emp', c2025: '3,269', c2026: '3,878', target: '3,287', c2027: '\u2014' },
        { metric: 'People Budget', c2025: '138.9 M', c2026: '152.7 M', target: '117.1 M', c2027: '\u2014' },
        { metric: 'Company Revenue', c2025: '901.2 M', c2026: '1,000 M', target: '1,000 M', c2027: '\u2014', highlight: true },
        { metric: 'Revenue per Emp', c2025: '275.7 K', c2026: '242.3 K', target: '290.1 K', c2027: '\u2014', highlight: true },
        { metric: 'Cost per HC', c2025: '42.5 K', c2026: '35.6 K', target: '35.6 K', c2027: '\u2014' },
        { metric: 'People Budget / Revenue', c2025: '0.15', c2026: '0.15', target: '0.12', c2027: '\u2014' },
        { metric: 'EBITDA per Employee', c2025: '\u2014', c2026: '109.3 K', target: '133.8 K', c2027: '\u2014' },
        { metric: 'Procurement opt. target', c2025: '84', c2026: '80', target: '80', c2027: '\u2014' },
      ],
    };
    const savedStrategicOverview = lsGet('zbod_strategic_overview', null);
    const so = savedStrategicOverview && typeof savedStrategicOverview === 'object' ? {...strategicOverviewDefault, ...savedStrategicOverview} : strategicOverviewDefault;
    state.landingEditing = 'strategicOverview';
    state.landingDrafts = {
      so_title: so.title,
      so_subtitle: so.subtitle,
      so_cols: [...so.columns],
      so_rows: so.rows.map(r => ({...r})),
    };
    renderLanding();
  },

  saveStrategicOverview() {
    const so = {};
    if (state.landingDrafts['so_title'] !== undefined) so.title = state.landingDrafts['so_title'];
    if (state.landingDrafts['so_subtitle'] !== undefined) so.subtitle = state.landingDrafts['so_subtitle'];
    if (state.landingDrafts['so_cols'] !== undefined) so.columns = state.landingDrafts['so_cols'];
    if (state.landingDrafts['so_rows'] !== undefined) so.rows = state.landingDrafts['so_rows'];
    lsSet('zbod_strategic_overview', so);

    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      try {
        window.zbodSupabase.sbSaveLandingBox({
          box_id: 'strategic_overview',
          position_order: 800,
          title: so.title || 'STRATEGIC OVERVIEW',
          content: JSON.stringify(so),
        });
      } catch (e) { console.warn('Supabase strategic overview sync failed:', e); }
    }

    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Strategic overview saved');
  },

  cancelStrategicOverviewEdit() {
    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
  },

  saveLanding() {
    const defaultContent = {
      overviewTitle: 'What is Zero-Based Organizational Design?',
      overviewText: 'Zero-Based Organizational Design (ZBOD) is a comprehensive methodology for building organizational structures from the ground up. Rather than making incremental changes to existing structures, ZBOD enables organizations to strategically rethink and redesign their entire operating model to align with business priorities.',
    };
    let content = {...defaultContent, ...lsGet(LS.landing, {})};

    const titleEl = document.getElementById('landing-overviewTitle');
    const textEl = document.getElementById('landing-overviewText');
    if (titleEl) content.overviewTitle = titleEl.value;
    if (textEl) content.overviewText = textEl.value;

    lsSet(LS.landing, content);

    // SYNC TO SUPABASE
    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      try {
        window.zbodSupabase.sbSaveLandingBox({
          box_id: 'overview',
          position_order: 0,
          title: content.overviewTitle,
          content: content.overviewText,
        });
      } catch (e) {
        console.warn('Supabase landing sync failed:', e);
      }
    }

    state.landingEditing = null;
    state.landingDrafts = {};
    renderLanding();
    toast('Saved');
  },

  cancelLandingEdit() { state.landingEditing = null; state.landingDrafts = {}; renderLanding(); },

  // === DIVISION / STRUCTURE CRUD ===
  showAddDivision() {
    state._creatorIdentification = null;
    document.getElementById('creator-identification-dialog').classList.remove('hidden');
    document.getElementById('creator-identification-errors').innerHTML = '';
    document.getElementById('creator-name').value = '';
    document.getElementById('creator-position').value = '';
    document.getElementById('creator-email').value = '';
    document.getElementById('creator-password').value = '';
    document.getElementById('creator-confirm-password').value = '';
  },

  hideCreatorIdentification() {
    document.getElementById('creator-identification-dialog').classList.add('hidden');
    state._creatorIdentification = null;
  },

  submitCreatorIdentification() {
    const name = document.getElementById('creator-name').value.trim();
    const position = document.getElementById('creator-position').value.trim();
    const email = document.getElementById('creator-email').value.trim();
    const password = document.getElementById('creator-password').value;
    const confirmPassword = document.getElementById('creator-confirm-password').value;
    const errors = [];

    if (!name) errors.push('Creator Full Name is required');
    if (!position) errors.push('Creator Position is required');
    if (!email) errors.push('Creator Email is required');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Creator Email must be a valid email address');
    if (!password) errors.push('Division Password is required');
    if (!confirmPassword) errors.push('Confirm Password is required');
    if (password && password.length < 6) errors.push('Division Password must be at least 6 characters');
    if (password && confirmPassword && password !== confirmPassword) errors.push('Passwords do not match');

    if (errors.length > 0) {
      document.getElementById('creator-identification-errors').innerHTML = errors.join('<br>');
      return;
    }

    state._creatorIdentification = { created_by_name: name, created_by_position: position, creator_email: email, division_password_temp: password };
    document.getElementById('creator-identification-dialog').classList.add('hidden');
    document.getElementById('creator-identification-errors').innerHTML = '';

    state._addForm = {};
    document.getElementById('division-dialog').classList.remove('hidden');
    document.getElementById('division-form-errors').innerHTML = '';
    renderDivisionForm();
  },

  hideAddDivision() { document.getElementById('division-dialog').classList.add('hidden'); state._creatorIdentification = null; },

  handleDivisionSelectChange(field, value) {
    if (field === 'structure_name') {
      const other = document.getElementById('div-structure_name-other');
      if (value === 'Other') { other.classList.remove('hidden'); } else { other.classList.add('hidden'); other.value = ''; }
    }
    if (field === 'structure_type') {
      const other = document.getElementById('div-structure_type-other');
      if (value === 'Other') { other.classList.remove('hidden'); } else { other.classList.add('hidden'); other.value = ''; }
    }
  },

  submitAddDivision() {
    const fields = getDivisionFormFields();
    const data = {};
    let errors = [];
    fields.forEach(f => {
      const el = document.getElementById(`div-${f.key}`);
      let val = el ? el.value : '';
      if (f.key === 'structure_name' && val === 'Other') {
        const otherEl = document.getElementById('div-structure_name-other');
        val = otherEl ? otherEl.value : '';
      }
      if (f.key === 'structure_type' && val === 'Other') {
        const otherEl = document.getElementById('div-structure_type-other');
        val = otherEl ? otherEl.value : '';
      }
      if (f.type === 'number') val = parseFloat(val) || 0;
      data[f.key] = val;
      if (!val && val !== 0) errors.push(`${f.label} is required`);
    });
    if (errors.length > 0) { document.getElementById('division-form-errors').innerHTML = errors.join('<br>'); return; }
    if (state._creatorIdentification) {
      data.created_by_name = state._creatorIdentification.created_by_name;
      data.created_by_position = state._creatorIdentification.created_by_position;
      data.creator_email = state._creatorIdentification.creator_email;
      data.division_password_temp = state._creatorIdentification.division_password_temp;
    }
    addDiv(data);
    state._creatorIdentification = null;
    this.hideAddDivision();
    renderDivisions();
    toast('Structure added');
  },

  verifyAndDeleteDivision(id) {
    const div = getDivs().find(d => d.id === id);
    if (!div) return;
    if (!div.division_password_temp) { this.deleteDivision(id); return; }
    state._deletePasswordTargetId = id;
    document.getElementById('delete-password-dialog').classList.remove('hidden');
    document.getElementById('delete-password-errors').innerHTML = '';
    document.getElementById('delete-password-input').value = '';
  },

  hideDeletePasswordModal() {
    document.getElementById('delete-password-dialog').classList.add('hidden');
    state._deletePasswordTargetId = null;
  },

  submitDeletePassword() {
    const input = document.getElementById('delete-password-input').value;
    const id = state._deletePasswordTargetId;
    if (!id) return;
    const div = getDivs().find(d => d.id === id);
    if (!div) return;
    if (input === div.division_password_temp) {
      document.getElementById('delete-password-dialog').classList.add('hidden');
      state._deletePasswordTargetId = null;
      this.deleteDivision(id);
    } else {
      document.getElementById('delete-password-errors').innerHTML = 'Incorrect password. Deletion cancelled.';
    }
  },

  deleteDivision(id) { if (confirm('Delete this structure? All data will be removed.')) { delDiv(id); delAsIsByDivision(id); delWsByDivision(id); renderDivisions(); toast('Structure deleted'); } },

  editDivisionData() {
    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (!div) return;
    state.editingDivision = true;
    state._divEditForm = { current_total_hc: div.current_total_hc, current_total_budget: div.current_total_budget, headcount_target: div.headcount_target, budget_target: div.budget_target };
    renderWorkspace();
  },

  saveDivisionData() {
    const updates = {};
    ['current_total_hc','current_total_budget','headcount_target','budget_target'].forEach(k => {
      const el = document.getElementById(`wdiv-${k}`);
      updates[k] = parseFloat(el?.value) || 0;
    });
    updDiv(state.selectedDivisionId, updates);
    state.editingDivision = false;
    state._divEditForm = null;
    renderWorkspace();
    toast('Saved');
  },

  cancelDivisionEdit() { state.editingDivision = false; state._divEditForm = null; renderWorkspace(); },

  // === AS-IS FUNCTIONS ===
  addAsIsRow() {
    state.asIsNewRows.push({ id: genId(), name: '', mgr: '', emp: '', mgrcost: '', profcost: '', parentId: '' });
    renderWorkspace();
  },

  updateAsIsNewRow(id, field, value) {
    const row = state.asIsNewRows.find(r => r.id === id);
    if (row) row[field] = value;
  },

  saveAsIsNewRow(id) {
    const row = state.asIsNewRows.find(r => r.id === id);
    if (!row) return;
    const fn = addAsIsFn(state.selectedDivisionId, row.name);
    const mgrCost = parseFloat(row.mgrcost) || 0;
    const profCost = parseFloat(row.profcost) || 0;
    updAsIsFn(fn.id, { manager_count: parseInt(row.mgr) || 0, current_employee_count: parseInt(row.emp) || 0, current_function_hc: (parseInt(row.mgr) || 0) + (parseInt(row.emp) || 0), current_budget: mgrCost + profCost, managers_cost: mgrCost, professionals_cost: profCost, parent_id: row.parentId || null });
    state.asIsNewRows = state.asIsNewRows.filter(r => r.id !== id);
    renderWorkspace();
  },

  cancelAsIsNewRow(id) { state.asIsNewRows = state.asIsNewRows.filter(r => r.id !== id); renderWorkspace(); },

  startAsIsEdit(id) {
    const fn = getAsIs().find(f => f.id === id);
    if (!fn) return;
    state.asIsEditing[id] = { name: fn.function_name, mgr: fn.manager_count, emp: fn.current_employee_count, mgrcost: fn.managers_cost || 0, profcost: fn.professionals_cost || 0, parentId: fn.parent_id || null };
    renderWorkspace();
  },

  updateAsIsEdit(id, field, value) { if (state.asIsEditing[id]) state.asIsEditing[id][field] = value; },

  updateAsIsInline(id, field, value) {
    const updates = {};
    if (field === 'manager_count') { updates.manager_count = parseInt(value) || 0; }
    else if (field === 'current_employee_count') { updates.current_employee_count = parseInt(value) || 0; }
    else if (field === 'managers_cost') { updates.managers_cost = parseFloat(value) || 0; }
    else if (field === 'professionals_cost') { updates.professionals_cost = parseFloat(value) || 0; }
    else if (field === 'parent_id') { updates.parent_id = value || null; }
    else { updates[field] = value; }
    const fn = getAsIs().find(f => f.id === id);
    if (fn) {
      const mgr = updates.manager_count !== undefined ? updates.manager_count : (fn.manager_count || 0);
      const emp = updates.current_employee_count !== undefined ? updates.current_employee_count : (fn.current_employee_count || 0);
      const mgrCost = updates.managers_cost !== undefined ? updates.managers_cost : (fn.managers_cost || 0);
      const profCost = updates.professionals_cost !== undefined ? updates.professionals_cost : (fn.professionals_cost || 0);
      updates.current_function_hc = mgr + emp;
      updates.current_budget = mgrCost + profCost;
    }
    updAsIsFn(id, updates);
  },

  editAsIsSection() { state.asIsSaved = false; renderWorkspace(); },

  saveAsIsEdit(id) {
    const edit = state.asIsEditing[id];
    if (!edit) return;
    const mgrCost = parseFloat(edit.mgrcost) || 0;
    const profCost = parseFloat(edit.profcost) || 0;
    updAsIsFn(id, { function_name: edit.name, manager_count: parseInt(edit.mgr) || 0, current_employee_count: parseInt(edit.emp) || 0, current_function_hc: (parseInt(edit.mgr) || 0) + (parseInt(edit.emp) || 0), current_budget: mgrCost + profCost, managers_cost: mgrCost, professionals_cost: profCost, parent_id: edit.parentId || null });
    delete state.asIsEditing[id];
    renderWorkspace();
  },

  cancelAsIsEdit(id) { delete state.asIsEditing[id]; renderWorkspace(); },

  deleteAsIs(id) { if (confirm('Delete this function?')) { delAsIsFn(id); renderWorkspace(); } },

  saveAllAsIs() {
    const pending = [...state.asIsNewRows];
    pending.forEach(row => {
      if (row.name) {
        const fn = addAsIsFn(state.selectedDivisionId, row.name);
        const mgrCost = parseFloat(row.mgrcost) || 0;
        const profCost = parseFloat(row.profcost) || 0;
        updAsIsFn(fn.id, { manager_count: parseInt(row.mgr) || 0, current_employee_count: parseInt(row.emp) || 0, current_function_hc: (parseInt(row.mgr) || 0) + (parseInt(row.emp) || 0), current_budget: mgrCost + profCost, managers_cost: mgrCost, professionals_cost: profCost, parent_id: row.parentId || null });
      }
    });
    state.asIsNewRows = [];

    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (!div) { renderWorkspace(); return; }
    const asIsFns = getAsIs().filter(f => f.division_id === div.id);
    const totalHC = asIsFns.reduce((s, f) => s + (f.current_function_hc || 0), 0);
    const totalBudget = asIsFns.reduce((s, f) => s + (f.current_budget || 0), 0);

    if (totalBudget !== parseFloat(div.current_total_budget || 0)) {
      const proceed = confirm(`Budget validation failed!\n\nSum of function budgets: ${formatNumber(totalBudget)}\nCurrent total budget: ${formatNumber(div.current_total_budget || 0)}\n\nClick OK to ignore and save, or Cancel to edit.`);
      if (!proceed) { renderWorkspace(); return; }
    }
    if (totalHC !== parseFloat(div.current_total_hc || 0)) {
      const proceed = confirm(`Headcount validation failed!\n\nSum of function HC: ${formatNumber(totalHC)}\nCurrent total HC: ${formatNumber(div.current_total_hc || 0)}\n\nClick OK to ignore and save, or Cancel to edit.`);
      if (!proceed) { renderWorkspace(); return; }
    }

    state.asIsSaved = true;
    renderWorkspace();
    toast('All functions saved');
  },

  // === METRICS ===
  _getDefaultMetrics() {
    return [
      { id: 'm1', label: 'Management Layers', value: '', type: 'number' },
      { id: 'm2', label: 'Average Span of Control', value: '', type: 'number' },
      { id: 'm3', label: 'High Grade Employees', value: '', type: 'number' },
      { id: 'm4', label: 'Low Grade Employees', value: '', type: 'number' },
      { id: 'm5', label: 'Multi-layered Deputy Hierarchy', value: '', type: 'select', options: ['Exist', 'Do not exist', '-'] },
      { id: 'm6', label: 'Decentralized and Centralized', value: '', type: 'select', options: ['Decentralized', 'Centralized', '-'] },
      { id: 'm7', label: 'Duplicated Functions', value: '', type: 'select', options: ['Exist', 'Do not exist', '-'] },
      { id: 'm8', label: 'Shadow Support Functions', value: '', type: 'select', options: ['Exist', 'Do not exist', 'Other'], customValue: '' },
      { id: 'm9', label: 'Complex Manual Based Process and Job', value: '', type: 'text' },
      { id: 'm10', label: 'Shared Services Opportunities', value: '', type: 'text' },
      { id: 'm11', label: 'Automation & AI Opportunities (RPA)', value: '', type: 'text' },
      { id: 'm12', label: 'Outsourcing Opportunity', value: '', type: 'text' },
      { id: 'm13', label: 'HC Optimization, incl. respective employee costs \u2014 if automation or outsourcing will be realized', value: '', type: 'text' },
      { id: 'm14', label: 'HC Avoided New Hiring, incl. respective employee costs \u2014 if automation or outsourcing will be realized', value: '', type: 'text' },
      { id: 'm15', label: 'Cost Median for Managers', value: '', type: 'number' },
      { id: 'm16', label: 'Cost Median for Professionals', value: '', type: 'number' },
    ];
  },

  updateMetric(idx, value) {
    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (!div) return;
    if (!state.metricsDraft[div.id]) state.metricsDraft[div.id] = {};
    state.metricsDraft[div.id][idx] = value;
    const allMetrics = getMetrics();
    if (!allMetrics[div.id]) allMetrics[div.id] = this._getDefaultMetrics();
    const divMetrics = allMetrics[div.id];
    if (divMetrics[idx]) divMetrics[idx].value = value;
    allMetrics[div.id] = divMetrics;
    setMetrics(allMetrics);
  },

  updateMetricCustom(idx, value) {
    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (!div) return;
    const allMetrics = getMetrics();
    if (!allMetrics[div.id]) allMetrics[div.id] = this._getDefaultMetrics();
    const divMetrics = allMetrics[div.id];
    if (divMetrics[idx]) divMetrics[idx].customValue = value;
    allMetrics[div.id] = divMetrics;
    setMetrics(allMetrics);
  },

  saveMetrics() {
    toast('Metrics saved');
  },

  deleteMetric(idx) {
    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (!div) return;
    const allMetrics = getMetrics();
    if (!allMetrics[div.id]) allMetrics[div.id] = this._getDefaultMetrics();
    const divMetrics = allMetrics[div.id];
    divMetrics.splice(idx, 1);
    allMetrics[div.id] = divMetrics;
    setMetrics(allMetrics);
    renderWorkspace();
  },

  // === AAA SECTION ===
  saveAAACard(idx) {
    const el = document.getElementById(`aaa-card-${idx}`);
    if (!el) return;
    try {
      const div = getDivs().find(d => d.id === state.selectedDivisionId);
      if (!div) { toast('Error: Division not found'); return; }
      const val = el.value.trim();
      const allCards = getAAACards();
      if (!allCards[div.id]) allCards[div.id] = [];
      if (idx >= 0 && idx < allCards[div.id].length) {
        allCards[div.id][idx] = val;
      }
      setAAACards(allCards);
      state.aaaEditCardIdx = null;
      if (state.aaaCards[div.id]) delete state.aaaCards[div.id][idx];
      renderWorkspace();
      toast('Saved');
    } catch (err) {
      console.error('saveAAACard error:', err);
      toast('Save failed');
    }
  },

  addAAACard() {
    try {
      const div = getDivs().find(d => d.id === state.selectedDivisionId);
      if (!div) return;
      const allCards = getAAACards();
      if (!allCards[div.id]) allCards[div.id] = [];
      allCards[div.id].push('');
      setAAACards(allCards);
      const newIdx = allCards[div.id].length - 1;
      state.aaaEditCardIdx = newIdx;
      if (!state.aaaCards[div.id]) state.aaaCards[div.id] = {};
      state.aaaCards[div.id][newIdx] = '';
      renderWorkspace();
      setTimeout(() => { const el = document.getElementById(`aaa-card-${newIdx}`); if (el) el.focus(); }, 50);
    } catch (err) {
      console.error('addAAACard error:', err);
    }
  },

  cancelAAACardEdit() {
    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (div && state.aaaCards[div.id]) {
      const idx = state.aaaEditCardIdx;
      const allCards = getAAACards();
      if (idx !== null && allCards[div.id] && allCards[div.id][idx] === '') {
        allCards[div.id].splice(idx, 1);
        setAAACards(allCards);
      }
      delete state.aaaCards[div.id][idx];
    }
    state.aaaEditCardIdx = null;
    renderWorkspace();
  },

  deleteAAACard(idx) {
    if (!confirm('Delete this card?')) return;
    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (!div) return;
    const allCards = getAAACards();
    if (allCards[div.id]) {
      allCards[div.id].splice(idx, 1);
      setAAACards(allCards);
    }
    renderWorkspace();
  },

  // === WORKSHOP DIALOG ===
  showWorkshopDialog() {
    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (!div) return;
    const draftWs = getWs().filter(w => w.division_id === div.id && w.status === 'draft');
    if (draftWs.length > 0) {
      document.getElementById('workshop-dialog-title').innerText = 'Workshop In Progress';
      document.getElementById('workshop-dialog-body').innerText = 'You have a draft workshop. Resume it or start new?';
      document.getElementById('workshop-dialog-buttons').innerHTML =
        `<button onclick="app.resumeWorkshop('${draftWs[0].id}',${draftWs[0].phase})" class="zbod-btn-primary" style="padding:10px 24px;">${ICONS.play} Resume</button>
         <button onclick="app.startNewWorkshop()" class="zbod-btn-secondary" style="padding:10px 24px;">${ICONS.plus} New</button>
         <button onclick="app.hideWorkshopDialog()" class="zbod-btn-secondary" style="padding:10px 24px;">Cancel</button>`;
    } else {
      document.getElementById('workshop-dialog-title').innerText = 'Start New Workshop';
      document.getElementById('workshop-dialog-body').innerText = 'This will create a new TO-BE organizational design workshop for ' + div.structure_name + '.';
      document.getElementById('workshop-dialog-buttons').innerHTML =
        `<button onclick="app.startNewWorkshop()" class="zbod-btn-primary" style="padding:10px 24px;">${ICONS.play} Start</button>
         <button onclick="app.hideWorkshopDialog()" class="zbod-btn-secondary" style="padding:10px 24px;">Cancel</button>`;
    }
    document.getElementById('workshop-dialog').classList.remove('hidden');
  },

  hideWorkshopDialog() { document.getElementById('workshop-dialog').classList.add('hidden'); },

  startNewWorkshop() {
    const ws = addWs(state.selectedDivisionId);
    state.selectedWorkshopId = ws.id;
    state.editingValues = {};
    state.phase2Scores = {};
    state.phase3Values = {};
    state.p3ExpandedChildren = new Set();
    this.hideWorkshopDialog();
    showPage('phase1'); renderPhase1();
  },

  resumeWorkshop(id, phase) {
    state.selectedWorkshopId = id;
    state.editingValues = {};
    state.phase2Scores = {};
    state.phase3Values = {};
    state.p3ExpandedChildren = new Set();
    this.hideWorkshopDialog();
    updWs(id, { status: 'draft' });
    if (phase === 1) { showPage('phase1'); renderPhase1(); }
    else if (phase === 2) { showPage('phase2'); renderPhase2(); }
    else if (phase === 3) { showPage('phase3'); renderPhase3(); }
  },

  confirmQuitPhase() {
    if (confirm('Quit workshop? Your progress is saved.')) { cleanupPhase3Sticky(); this.goToWorkspace(); }
  },

  // === PHASE 1 ===
  updatePhase1Value(fnId, field, value) {
    if (!state.editingValues[fnId]) state.editingValues[fnId] = {};
    state.editingValues[fnId][field] = value;
    const updates = {};
    if (field === 'proposed_function_name') updates.proposed_function_name = value;
    if (field === 'career_level') updates.career_level = value;
    if (field === 'function_structure_type') updates.function_structure_type = value;
    if (field === 'parent_id') updates.parent_id = value;
    if (field === 'can_be_eliminated') updates.can_be_eliminated = value;
    if (field === 'can_be_automated') updates.can_be_automated = value;
    if (field === 'can_be_outsourced') updates.can_be_outsourced = value;
    if (field === 'target_headcount') updates.target_headcount = parseFloat(value) || null;
    if (field === 'target_budget') updates.target_budget = parseFloat(value) || null;
    if (field === 'strategic_justification') updates.strategic_justification = value;
    const allFns = getFns();
    const fn = allFns.find(f => f.id === fnId);
    if (fn) {
      const elim = field === 'can_be_eliminated' ? value : (fn.can_be_eliminated || '');
      const auto = field === 'can_be_automated' ? value : (fn.can_be_automated || '');
      const out = field === 'can_be_outsourced' ? value : (fn.can_be_outsourced || '');
      if (elim && auto && out) {
        updates.justification_alert = computePhase1Alert(elim, auto, out);
      }
    }
    updFn(fnId, updates);
    renderPhase1();
  },

  addProposedFunction() {
    const ws = getWs().find(w => w.id === state.selectedWorkshopId);
    if (!ws) return;
    addFn(ws.id, 0);
    const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);
    fns.forEach((f, i) => { if (f.function_number !== i + 1) updFn(f.id, { function_number: i + 1 }); });
    renderPhase1();
  },

  removeProposedFunction(id) {
    if (!confirm('Remove this function?')) return;
    delFn(id);
    const ws = getWs().find(w => w.id === state.selectedWorkshopId);
    if (ws) {
      const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);
      fns.forEach((f, i) => { if (f.function_number !== i + 1) updFn(f.id, { function_number: i + 1 }); });
    }
    renderPhase1();
  },

  toggleLayerGuide() {
    const box = document.getElementById('layer-guide-box');
    const btn = document.getElementById('layer-guide-btn');
    if (!box) return;
    const isHidden = box.classList.contains('hidden');
    if (isHidden) {
      box.classList.remove('hidden');
      if (btn) btn.classList.add('layer-guide-btn--active');
    } else {
      box.classList.add('hidden');
      if (btn) btn.classList.remove('layer-guide-btn--active');
    }
  },

  savePhase1() {
    renderPhase1();
    toast('Saved');
  },

  goToPhase2() {
    updWs(state.selectedWorkshopId, { phase: 2 });
    showPage('phase2'); renderPhase2();
  },

  // === PHASE 2 ===
  updatePhase2Score(fnId, field, value) {
    if (!state.phase2Scores[fnId]) state.phase2Scores[fnId] = {};
    state.phase2Scores[fnId][field] = parseFloat(value) || null;
    const updates = {};
    if (field === 'question1_score') updates.question1_score = parseFloat(value) || null;
    if (field === 'question2_score') updates.question2_score = parseFloat(value) || null;
    const allFns = getFns();
    const fn = allFns.find(f => f.id === fnId);
    if (fn) {
      const q1 = field === 'question1_score' ? (parseFloat(value) || 0) : (fn.question1_score || 0);
      const q2 = field === 'question2_score' ? (parseFloat(value) || 0) : (fn.question2_score || 0);
      if (q1 && q2) {
        updates.total_score = q1 + q2;
        updates.zbod_decision = computePhase2Decision(q1, q2);
      }
    }
    updFn(fnId, updates);
    renderPhase2();
  },



  savePhase2() { renderPhase2(); toast('Saved'); },

  backToPhase1() { updWs(state.selectedWorkshopId, { phase: 1 }); showPage('phase1'); renderPhase1(); },
  goToPhase3() { updWs(state.selectedWorkshopId, { phase: 3 }); showPage('phase3'); renderPhase3(); },

  // === PHASE 3 ===
  updatePhase3Value(fnId, field, value) {
    if (!state.phase3Values[fnId]) state.phase3Values[fnId] = {};
    const parsed = ['manager_count', 'professional_count'].includes(field)
      ? (parseInt(value) || null)
      : (parseFloat(value) || null);
    state.phase3Values[fnId][field] = parsed;
    updFn(fnId, { [field]: parsed });
    recomputeAndSaveAllCascaded(state.selectedWorkshopId, state.phase3Values);
    renderPhase3();
  },

  savePhase3() { renderPhase3(); toast('Saved'); },

  backToPhase2() { cleanupPhase3Sticky(); updWs(state.selectedWorkshopId, { phase: 2 }); showPage('phase2'); renderPhase2(); },
  goToReview() { cleanupPhase3Sticky(); showPage('review'); renderReview(); },
  backToPhase3() { showPage('phase3'); renderPhase3(); },

  // === FINISH WORKSHOP ===
  finishWorkshop() {
    cleanupPhase3Sticky();
    finalizeWorkshopCalculations(state.selectedWorkshopId);
    saveCompletedWorkshop(state.selectedWorkshopId);
    state.selectedHistoryWorkshopId = state.selectedWorkshopId;
    showPage('transition'); renderTransition();
    toast('Workshop completed!');
  },

  submitForHRReview() {
    const wsId = state.selectedWorkshopId || state.selectedHistoryWorkshopId;
    if (!wsId) { toast('No workshop selected.'); return; }
    finalizeWorkshopCalculations(wsId);
    const now = new Date().toISOString();
    updWs(wsId, { status: 'completed', completed_at: getWs().find(w => w.id === wsId)?.completed_at || now, submitted_for_hr_review_at: now, phase: 3 });
    if (window.zbodSupabase && window.zbodSupabase.supabaseAvailable) {
      window.zbodSupabase.sbSyncAll(getDivs(), getWs(), getFns(), getAsIs());
    }
    state.selectedHistoryWorkshopId = wsId;
    this.goToHRReview();
    toast('Workshop submitted for HR review!');
  },

  // === HISTORY ===
  viewHistoryWorkshop(id) { state.selectedHistoryWorkshopId = id; showPage('history-review'); renderHistoryReview(); },

  // === EXPORT TO EXCEL ===
  exportToExcel() {
    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (!div) { toast('Please select a division before exporting.'); return; }

    const wsAll = getWs().filter(w => w.division_id === div.id);
    const completedWs = wsAll.filter(w => w.status === 'completed').sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at));
    const activeWs = wsAll.find(w => w.status === 'active');
    const allForExport = [...(activeWs ? [activeWs] : []), ...completedWs];

    if (allForExport.length === 0) { toast('No workshop reports found for this division.'); return; }

    const overlay = document.getElementById('export-modal-overlay');
    const body = document.getElementById('export-modal-body');
    let html = '';
    allForExport.forEach((w, i) => {
      const dt = new Date(w.completed_at || w.created_at);
      const fns = getFns().filter(f => f.workshop_id === w.id);
      const isComplete = w.status === 'completed';
      html += `<div class="export-ws-item${i === 0 ? ' selected' : ''}" onclick="app._selectExportWs(this,'${w.id}')" data-wsid="${w.id}">
        <div><div class="ws-title">${isComplete ? '&#10004; Completed' : '&#9998; Draft'} Workshop #${w.id.slice(0,8)}</div>
        <div class="ws-meta">${dt.toLocaleDateString()} &mdash; ${fns.length} functions</div></div>
      </div>`;
    });
    body.innerHTML = html;

    const footer = document.getElementById('export-modal-footer');
    footer.innerHTML = `<button onclick="app.closeExportModal()" class="zbod-btn-secondary" style="padding:10px 20px;">Cancel</button><button onclick="app._doExport()" class="zbod-btn-primary" style="padding:10px 24px;">${ICONS.download} Export Report</button>`;

    state._exportSelectedWsId = allForExport[0].id;
    overlay.style.display = 'flex';
  },

  closeExportModal() {
    document.getElementById('export-modal-overlay').style.display = 'none';
    state._exportSelectedWsId = null;
  },

  _selectExportWs(el, wsId) {
    document.querySelectorAll('.export-ws-item').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    state._exportSelectedWsId = wsId;
  },

  async _doExport() {
    const wsId = state._exportSelectedWsId;
    if (!wsId) return;
    const ws = getWs().find(w => w.id === wsId);
    const div = getDivs().find(d => d.id === state.selectedDivisionId);
    if (!ws || !div) return;

    const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);
    const asIsFns = getAsIs().filter(f => f.division_id === div.id);
    const totalToBeHC = calculateProposedHeadcount(ws.id);
    const totalToBeBudget = calculateProposedBudget(ws.id);
    const totalAsIsHC = asIsFns.reduce((s, f) => s + (f.current_function_hc || 0), 0);
    const totalAsIsBudget = asIsFns.reduce((s, f) => s + ((f.managers_cost || 0) + (f.professionals_cost || 0)), 0);
    const totalAsIsMgrs = asIsFns.reduce((s, f) => s + (f.manager_count || 0), 0);
    const totalAsIsProfs = asIsFns.reduce((s, f) => s + (f.current_employee_count || 0), 0);
    const totalToBeMgrs = fns.reduce((s, f) => s + (f.manager_count || 0), 0);
    const totalToBeProfs = fns.reduce((s, f) => s + (f.professional_count || 0), 0);
    const avgSpan = totalToBeMgrs > 0 ? (totalToBeProfs / totalToBeMgrs).toFixed(1) : 'N/A';
    const allMetrics = getMetrics();
    const mets = allMetrics[div.id] || [];
    const findMetric = (label) => { const m = mets.find(x => x.label === label); return m ? m.value : ''; };
    const getDecision = f => f.zbod_decision || computePhase2Decision(f.question1_score || 0, f.question2_score || 0);
    const inc = fns.filter(f => getDecision(f) === 'INVEST');
    const kp  = fns.filter(f => getDecision(f) === 'KEEP');
    const opt = fns.filter(f => getDecision(f) === 'OPTIMIZE');
    const elm = fns.filter(f => getDecision(f) === 'ELIMINATE');
    const hcDiff = totalToBeHC - (div.headcount_target || 0);
    const budgDiff = totalToBeBudget - (div.budget_target || 0);
    const wsDateStr = ws.completed_at ? new Date(ws.completed_at).toLocaleDateString() : new Date(ws.created_at).toLocaleDateString();

    // --- colour palette ---
    const C = {
      navy: 'FF0F3C76', navyLight: 'FFE8EEF7',
      green: 'FF2E642C', greenLight: 'FFE8F5E9',
      gold: 'FF92690A', goldLight: 'FFFDF3DC',
      red: 'FFB71C1C', redLight: 'FFFEECEB',
      blue: 'FF0277BD', blueLight: 'FFE1F0FA',
      purple: 'FF6A1B9A', purpleLight: 'FFF3E5F5',
      teal: 'FF00695C', tealLight: 'FFE0F2F1',
      gray: 'FF6B7280', gray2: 'FFF3F4F6', gray3: 'FFE5E7EB',
      white: 'FFFFFFFF', black: 'FF111827',
    };

    // --- style factories ---
    const mkFill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    const mkFont = (opts) => ({ name: 'Calibri', size: 10, color: { argb: C.black }, ...opts });
    const mkBorder = (style = 'thin', color = C.gray3) => ({ top: { style, color: { argb: color } }, bottom: { style, color: { argb: color } }, left: { style, color: { argb: color } }, right: { style, color: { argb: color } } });
    const mkAlign = (h = 'left', v = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap });

    // Reusable style objects
    const S = {
      // Sheet title banner
      sheetTitle: { font: mkFont({ bold: true, size: 18, color: { argb: C.white } }), fill: mkFill(C.navy), alignment: mkAlign('left', 'middle') },
      // Section header row
      sectionHdr: { font: mkFont({ bold: true, size: 11, color: { argb: C.white } }), fill: mkFill(C.navy), alignment: mkAlign('left', 'middle'), border: mkBorder('medium', C.navy) },
      // Sub-section label/key on left
      rowLabel: { font: mkFont({ bold: true, size: 10, color: { argb: C.navy } }), fill: mkFill(C.navyLight), alignment: mkAlign('left', 'middle'), border: mkBorder('hair', C.gray3) },
      // Value cell
      rowValue: { font: mkFont({ size: 10 }), fill: mkFill(C.white), alignment: mkAlign('left', 'middle'), border: mkBorder('hair', C.gray3) },
      // Table column header
      tblHdr: { font: mkFont({ bold: true, size: 10, color: { argb: C.white } }), fill: mkFill(C.green), alignment: mkAlign('center', 'middle', true), border: mkBorder('thin', C.green) },
      // Table data cell
      tblCell: { font: mkFont({ size: 10 }), fill: mkFill(C.white), alignment: mkAlign('center', 'middle'), border: mkBorder('hair', C.gray3) },
      tblCellL: { font: mkFont({ size: 10 }), fill: mkFill(C.white), alignment: mkAlign('left', 'middle'), border: mkBorder('hair', C.gray3) },
      tblAlt: { font: mkFont({ size: 10 }), fill: mkFill(C.gray2), alignment: mkAlign('center', 'middle'), border: mkBorder('hair', C.gray3) },
      tblAltL: { font: mkFont({ size: 10 }), fill: mkFill(C.gray2), alignment: mkAlign('left', 'middle'), border: mkBorder('hair', C.gray3) },
      // Highlight cells
      greenBold: { font: mkFont({ bold: true, size: 10, color: { argb: C.green } }), fill: mkFill(C.greenLight), alignment: mkAlign('center', 'middle'), border: mkBorder('hair', C.gray3) },
      redBold:   { font: mkFont({ bold: true, size: 10, color: { argb: C.red   } }), fill: mkFill(C.redLight  ), alignment: mkAlign('center', 'middle'), border: mkBorder('hair', C.gray3) },
      goldBold:  { font: mkFont({ bold: true, size: 10, color: { argb: C.gold  } }), fill: mkFill(C.goldLight ), alignment: mkAlign('center', 'middle'), border: mkBorder('hair', C.gray3) },
      blueBold:  { font: mkFont({ bold: true, size: 10, color: { argb: C.blue  } }), fill: mkFill(C.blueLight ), alignment: mkAlign('center', 'middle'), border: mkBorder('hair', C.gray3) },
      purpleBold:{ font: mkFont({ bold: true, size: 10, color: { argb: C.purple} }), fill: mkFill(C.purpleLight), alignment: mkAlign('center', 'middle'), border: mkBorder('hair', C.gray3) },
      tealBold:  { font: mkFont({ bold: true, size: 10, color: { argb: C.teal  } }), fill: mkFill(C.tealLight ), alignment: mkAlign('center', 'middle'), border: mkBorder('hair', C.gray3) },
    };

    // Helper: apply style object to cell
    const applyStyle = (cell, style) => { Object.assign(cell, style); };

    // Helper: write a section banner across N columns
    const writeBanner = (sh, row, cols, text, style) => {
      sh.mergeCells(`A${row}:${String.fromCharCode(64 + cols)}${row}`);
      const cell = sh.getCell(`A${row}`);
      cell.value = text;
      applyStyle(cell, style);
      for (let c = 2; c <= cols; c++) sh.getCell(row, c).fill = style.fill;
      sh.getRow(row).height = 28;
    };

    // Helper: write a label-value pair row
    const writeKV = (sh, row, label, value, valueCols, numFmt) => {
      sh.getCell(row, 1).value = label; applyStyle(sh.getCell(row, 1), S.rowLabel);
      if (valueCols > 1) sh.mergeCells(row, 2, row, 1 + valueCols);
      const vc = sh.getCell(row, 2); vc.value = value; applyStyle(vc, S.rowValue);
      if (numFmt) vc.numFmt = numFmt;
      sh.getRow(row).height = 18;
    };

    // Helper: write table header row
    const writeTblHdr = (sh, row, headers) => {
      headers.forEach((h, i) => { const c = sh.getCell(row, i + 1); c.value = h; applyStyle(c, S.tblHdr); });
      sh.getRow(row).height = 32;
    };

    // Helper: decision colour style
    const decStyle = (dec) => {
      if (dec === 'INVEST')   return S.greenBold;
      if (dec === 'KEEP')     return S.goldBold;
      if (dec === 'OPTIMIZE') return S.blueBold;
      if (dec === 'ELIMINATE') return S.redBold;
      return S.tblCell;
    };

    // Helper: add auto-filter to a range
    const addFilter = (sh, topRow, numCols) => {
      sh.autoFilter = { from: { row: topRow, column: 1 }, to: { row: topRow, column: numCols } };
    };

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ZBOD Tool';
      workbook.created = new Date();
      workbook.properties.date1904 = false;

      // ════════════════════════════════════════════════════════════════
      // SHEET 1 — DIVISION & STRUCTURE
      // ════════════════════════════════════════════════════════════════
      const sh1 = workbook.addWorksheet('1. Division & Structure');
      sh1.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];
      sh1.columns = [{ width: 30 }, { width: 28 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];

      let r = 1;
      writeBanner(sh1, r, 6, `ZBOD REPORT  —  ${div.structure_name || 'Division'}  |  ${wsDateStr}`, S.sheetTitle); r++;
      writeBanner(sh1, r, 6, '1. DIVISION & STRUCTURE INFORMATION', S.sectionHdr); r++;

      const divInfo = [
        ['Structure Name', div.structure_name || ''],
        ['Structure Type', div.structure_type || ''],
        ['C-Level Owner', div.c_level_name || ''],
        ['Current Total Headcount', div.current_total_hc || 0, '#,##0'],
        ['Current Total Budget (AZN)', div.current_total_budget || 0, '#,##0'],
        ['Headcount Target', div.headcount_target || 0, '#,##0'],
        ['Budget Target (AZN)', div.budget_target || 0, '#,##0'],
        ['Number of AS-IS Functions', asIsFns.length],
        ['AS-IS Total Managers', totalAsIsMgrs, '#,##0'],
        ['AS-IS Total Professionals', totalAsIsProfs, '#,##0'],
        ['Workshop Status', ws.status || ''],
        ['Workshop Created', new Date(ws.created_at).toLocaleDateString()],
        ['Workshop Completed', ws.completed_at ? new Date(ws.completed_at).toLocaleDateString() : 'In Progress'],
        ['Last Updated', ws.updated_at ? new Date(ws.updated_at).toLocaleDateString() : ''],
      ];
      divInfo.forEach(([lbl, val, fmt]) => { writeKV(sh1, r, lbl, val, 4, fmt); r++; });
      r++;

      writeBanner(sh1, r, 6, 'AS-IS BASELINE METRICS', S.sectionHdr); r++;
      const metricPairs = [
        ['Management Layers', 'Average Span of Control'],
        ['High Grade Employees', 'Low Grade Employees'],
        ['Multi-layered Deputy Hierarchy', 'Centralization'],
        ['Duplicated Functions', 'Shadow Support Functions'],
        ['Process Complexity', 'Shared Services Potential'],
        ['Automation Potential', 'Outsourcing Potential'],
        ['HC Optimization Potential', 'Cost Optimization Potential'],
        ['Key Findings', null],
      ];
      metricPairs.forEach(([l1, l2]) => {
        sh1.getCell(r, 1).value = l1; applyStyle(sh1.getCell(r, 1), S.rowLabel);
        sh1.getCell(r, 2).value = findMetric(l1); applyStyle(sh1.getCell(r, 2), S.rowValue);
        if (l2) {
          sh1.getCell(r, 3).value = l2; applyStyle(sh1.getCell(r, 3), S.rowLabel);
          sh1.getCell(r, 4).value = findMetric(l2); applyStyle(sh1.getCell(r, 4), S.rowValue);
        }
        sh1.getRow(r).height = 18; r++;
      });

      // ════════════════════════════════════════════════════════════════
      // SHEET 2 — AS-IS BASELINE
      // ════════════════════════════════════════════════════════════════
      const sh2 = workbook.addWorksheet('2. AS-IS Baseline');
      sh2.views = [{ state: 'frozen', ySplit: 3, xSplit: 2 }];
      sh2.columns = [
        { width: 5 }, { width: 28 }, { width: 20 }, { width: 10 }, { width: 10 },
        { width: 10 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 12 },
      ];
      r = 1;
      writeBanner(sh2, r, 11, `ZBOD REPORT  —  ${div.structure_name || 'Division'}  |  AS-IS Baseline`, S.sheetTitle); r++;
      writeBanner(sh2, r, 11, '2. CURRENT FUNCTIONS / AS-IS BASELINE', S.sectionHdr); r++;
      const ai2Hdrs = ['#', 'Function Name', 'Parent Function', 'Mgrs HC', 'Profs HC', 'Total HC', 'HC Alloc %', 'Mgr Cost/mo', 'Prof Cost/mo', 'Total Cost/mo', 'Cost Alloc %'];
      writeTblHdr(sh2, r, ai2Hdrs);
      addFilter(sh2, r, ai2Hdrs.length); r++;
      const asIsById = {};
      asIsFns.forEach(f => asIsById[f.id] = f);
      asIsFns.forEach((f, i) => {
        const alt = i % 2 === 1;
        const cs = alt ? S.tblAlt : S.tblCell;
        const csL = alt ? S.tblAltL : S.tblCellL;
        const parentName = f.parent_id && asIsById[f.parent_id] ? asIsById[f.parent_id].function_name : (f.parent_id ? '' : 'Division (Root)');
        const mgr = f.manager_count || 0;
        const prof = f.current_employee_count || 0;
        const mgrCost = f.managers_cost || 0;
        const profCost = f.professionals_cost || 0;
        const totalHC = mgr + prof;
        const totalCost = mgrCost + profCost;
        sh2.getCell(r, 1).value = i + 1; applyStyle(sh2.getCell(r, 1), cs);
        sh2.getCell(r, 2).value = f.function_name || 'Unnamed'; applyStyle(sh2.getCell(r, 2), csL);
        sh2.getCell(r, 3).value = parentName; applyStyle(sh2.getCell(r, 3), csL);
        sh2.getCell(r, 4).value = mgr; applyStyle(sh2.getCell(r, 4), cs); sh2.getCell(r, 4).numFmt = '#,##0';
        sh2.getCell(r, 5).value = prof; applyStyle(sh2.getCell(r, 5), cs); sh2.getCell(r, 5).numFmt = '#,##0';
        sh2.getCell(r, 6).value = totalHC; applyStyle(sh2.getCell(r, 6), cs); sh2.getCell(r, 6).numFmt = '#,##0';
        sh2.getCell(r, 7).value = totalAsIsHC > 0 ? totalHC / totalAsIsHC : 0; applyStyle(sh2.getCell(r, 7), cs); sh2.getCell(r, 7).numFmt = '0.0%';
        sh2.getCell(r, 8).value = mgrCost; applyStyle(sh2.getCell(r, 8), cs); sh2.getCell(r, 8).numFmt = '#,##0';
        sh2.getCell(r, 9).value = profCost; applyStyle(sh2.getCell(r, 9), cs); sh2.getCell(r, 9).numFmt = '#,##0';
        sh2.getCell(r, 10).value = totalCost; applyStyle(sh2.getCell(r, 10), cs); sh2.getCell(r, 10).numFmt = '#,##0';
        sh2.getCell(r, 11).value = totalAsIsBudget > 0 ? totalCost / totalAsIsBudget : 0; applyStyle(sh2.getCell(r, 11), cs); sh2.getCell(r, 11).numFmt = '0.0%';
        sh2.getRow(r).height = 18; r++;
      });
      // Totals row
      const ai2TotRow = sh2.getRow(r);
      ai2TotRow.getCell(1).value = ''; applyStyle(ai2TotRow.getCell(1), S.tblHdr);
      ai2TotRow.getCell(2).value = 'TOTAL'; applyStyle(ai2TotRow.getCell(2), S.tblHdr);
      ai2TotRow.getCell(3).value = ''; applyStyle(ai2TotRow.getCell(3), S.tblHdr);
      ai2TotRow.getCell(4).value = totalAsIsMgrs; applyStyle(ai2TotRow.getCell(4), S.tblHdr); ai2TotRow.getCell(4).numFmt = '#,##0';
      ai2TotRow.getCell(5).value = totalAsIsProfs; applyStyle(ai2TotRow.getCell(5), S.tblHdr); ai2TotRow.getCell(5).numFmt = '#,##0';
      ai2TotRow.getCell(6).value = totalAsIsHC; applyStyle(ai2TotRow.getCell(6), S.tblHdr); ai2TotRow.getCell(6).numFmt = '#,##0';
      ai2TotRow.getCell(7).value = ''; applyStyle(ai2TotRow.getCell(7), S.tblHdr);
      ai2TotRow.getCell(8).value = asIsFns.reduce((s, f) => s + (f.managers_cost || 0), 0); applyStyle(ai2TotRow.getCell(8), S.tblHdr); ai2TotRow.getCell(8).numFmt = '#,##0';
      ai2TotRow.getCell(9).value = asIsFns.reduce((s, f) => s + (f.professionals_cost || 0), 0); applyStyle(ai2TotRow.getCell(9), S.tblHdr); ai2TotRow.getCell(9).numFmt = '#,##0';
      ai2TotRow.getCell(10).value = totalAsIsBudget; applyStyle(ai2TotRow.getCell(10), S.tblHdr); ai2TotRow.getCell(10).numFmt = '#,##0';
      ai2TotRow.getCell(11).value = ''; applyStyle(ai2TotRow.getCell(11), S.tblHdr);
      ai2TotRow.height = 22;

      // ════════════════════════════════════════════════════════════════
      // SHEET 3 — PHASE 1
      // ════════════════════════════════════════════════════════════════
      const sh3 = workbook.addWorksheet('3. Phase 1 — Function Design');
      sh3.views = [{ state: 'frozen', ySplit: 3, xSplit: 2 }];
      sh3.columns = [
        { width: 5 }, { width: 28 }, { width: 14 }, { width: 18 }, { width: 22 },
        { width: 12 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 14 }, { width: 36 },
      ];
      r = 1;
      writeBanner(sh3, r, 11, `ZBOD REPORT  —  ${div.structure_name || 'Division'}  |  Phase 1: Function Design`, S.sheetTitle); r++;
      writeBanner(sh3, r, 11, '3. PHASE 1 — FUNCTION DESIGN & ELIMINATION FILTER', S.sectionHdr); r++;
      const p1Hdrs = ['#', 'Function Name', 'Mgmt Level', 'Structure Type', 'Reports To (Parent)', 'Eliminate?', 'Automate?', 'Outsource?', 'Review Status', 'P1 Alert', 'Strategic Justification'];
      writeTblHdr(sh3, r, p1Hdrs);
      addFilter(sh3, r, p1Hdrs.length); r++;
      fns.forEach((f, i) => {
        const alt = i % 2 === 1;
        const cs = alt ? S.tblAlt : S.tblCell;
        const csL = alt ? S.tblAltL : S.tblCellL;
        const elim = f.can_be_eliminated || '';
        const auto = f.can_be_automated || '';
        const out = f.can_be_outsourced || '';
        const reviewFail = elim === 'Yes' || auto === 'Yes' || out === 'Yes';
        const reviewStatus = reviewFail ? 'REVIEW REQUIRED' : 'PASSED FILTER';
        const alert = f.justification_alert || (elim && auto && out ? computePhase1Alert(elim, auto, out) : '');
        const parentFn = fns.find(p => p.id === f.parent_id);
        sh3.getCell(r, 1).value = f.function_number; applyStyle(sh3.getCell(r, 1), cs);
        sh3.getCell(r, 2).value = f.proposed_function_name || ''; applyStyle(sh3.getCell(r, 2), csL);
        sh3.getCell(r, 3).value = f.career_level || ''; applyStyle(sh3.getCell(r, 3), cs);
        sh3.getCell(r, 4).value = f.function_structure_type || ''; applyStyle(sh3.getCell(r, 4), cs);
        sh3.getCell(r, 5).value = parentFn ? parentFn.proposed_function_name : '(Root)'; applyStyle(sh3.getCell(r, 5), csL);
        sh3.getCell(r, 6).value = elim; applyStyle(sh3.getCell(r, 6), elim === 'Yes' ? S.redBold : cs);
        sh3.getCell(r, 7).value = auto; applyStyle(sh3.getCell(r, 7), auto === 'Yes' ? S.goldBold : cs);
        sh3.getCell(r, 8).value = out;  applyStyle(sh3.getCell(r, 8), out  === 'Yes' ? S.goldBold : cs);
        applyStyle(sh3.getCell(r, 9), reviewFail ? S.redBold : S.greenBold); sh3.getCell(r, 9).value = reviewStatus;
        sh3.getCell(r, 10).value = alert || 'OK'; applyStyle(sh3.getCell(r, 10), alert && !alert.includes('PASSED') ? S.redBold : cs);
        sh3.getCell(r, 11).value = f.strategic_justification || ''; applyStyle(sh3.getCell(r, 11), csL);
        sh3.getRow(r).height = 18; r++;
      });

      // ════════════════════════════════════════════════════════════════
      // SHEET 4 — PHASE 2
      // ════════════════════════════════════════════════════════════════
      const sh4 = workbook.addWorksheet('4. Phase 2 — Scoring');
      sh4.views = [{ state: 'frozen', ySplit: 3, xSplit: 2 }];
      sh4.columns = [
        { width: 5 }, { width: 28 }, { width: 14 }, { width: 8 }, { width: 8 },
        { width: 8 }, { width: 14 }, { width: 30 }, { width: 30 },
      ];
      r = 1;
      writeBanner(sh4, r, 9, `ZBOD REPORT  —  ${div.structure_name || 'Division'}  |  Phase 2: Business Impact Scoring`, S.sheetTitle); r++;
      writeBanner(sh4, r, 9, '4. PHASE 2 — BUSINESS IMPACT SCORING & ZBOD DECISION', S.sectionHdr); r++;
      // Question legend sub-header
      sh4.mergeCells(`A${r}:I${r}`);
      const legCell = sh4.getCell(`A${r}`);
      legCell.value = 'SQ1: Does this function materially contribute to business strategy and outcomes?   |   SQ2: How critical is this function to business continuity and risk management?';
      applyStyle(legCell, { font: mkFont({ italic: true, size: 9, color: { argb: C.gray } }), fill: mkFill(C.gray2), alignment: mkAlign('left', 'middle') });
      sh4.getRow(r).height = 16; r++;
      const p2Hdrs = ['#', 'Function Name', 'Mgmt Level', 'SQ1 Score', 'SQ2 Score', 'Total', 'ZBOD Decision', 'Business Impact Output', 'P1 Alert / Notes'];
      writeTblHdr(sh4, r, p2Hdrs);
      addFilter(sh4, r, p2Hdrs.length); r++;
      fns.forEach((f, i) => {
        const alt = i % 2 === 1;
        const cs = alt ? S.tblAlt : S.tblCell;
        const csL = alt ? S.tblAltL : S.tblCellL;
        const q1 = f.question1_score || 0;
        const q2 = f.question2_score || 0;
        const total = q1 + q2;
        const dec = getDecision(f);
        sh4.getCell(r, 1).value = f.function_number; applyStyle(sh4.getCell(r, 1), cs);
        sh4.getCell(r, 2).value = f.proposed_function_name || ''; applyStyle(sh4.getCell(r, 2), csL);
        sh4.getCell(r, 3).value = f.career_level || ''; applyStyle(sh4.getCell(r, 3), cs);
        sh4.getCell(r, 4).value = q1; applyStyle(sh4.getCell(r, 4), cs);
        sh4.getCell(r, 5).value = q2; applyStyle(sh4.getCell(r, 5), cs);
        sh4.getCell(r, 6).value = total; applyStyle(sh4.getCell(r, 6), cs);
        sh4.getCell(r, 7).value = dec; applyStyle(sh4.getCell(r, 7), decStyle(dec));
        sh4.getCell(r, 8).value = f.business_impact_output || ''; applyStyle(sh4.getCell(r, 8), csL);
        sh4.getCell(r, 9).value = f.justification_alert || ''; applyStyle(sh4.getCell(r, 9), csL);
        sh4.getRow(r).height = 18; r++;
      });
      // Decision summary footer
      r++;
      sh4.mergeCells(`A${r}:I${r}`);
      const decSumCell = sh4.getCell(`A${r}`);
      decSumCell.value = `DECISION SUMMARY:   INVEST: ${inc.length}   |   KEEP: ${kp.length}   |   OPTIMIZE: ${opt.length}   |   ELIMINATE: ${elm.length}   |   Total Functions: ${fns.length}`;
      applyStyle(decSumCell, { font: mkFont({ bold: true, size: 11, color: { argb: C.white } }), fill: mkFill(C.navy), alignment: mkAlign('center', 'middle') });
      sh4.getRow(r).height = 24;

      // ════════════════════════════════════════════════════════════════
      // SHEET 5 — PHASE 3
      // ════════════════════════════════════════════════════════════════
      const sh5 = workbook.addWorksheet('5. Phase 3 — Allocation');
      sh5.views = [{ state: 'frozen', ySplit: 3, xSplit: 2 }];
      sh5.columns = [
        { width: 5 }, { width: 28 }, { width: 22 }, { width: 14 }, { width: 12 },
        { width: 12 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 10 },
        { width: 12 }, { width: 14 }, { width: 16 },
      ];
      r = 1;
      writeBanner(sh5, r, 13, `ZBOD REPORT  —  ${div.structure_name || 'Division'}  |  Phase 3: Resource Allocation`, S.sheetTitle); r++;
      writeBanner(sh5, r, 13, '5. PHASE 3 — RESOURCE ALLOCATION (TO-BE)', S.sectionHdr); r++;
      const p3Hdrs = ['#', 'Function Name', 'Parent (Allocation Base)', 'ZBOD Decision', 'HC Alloc %', 'Proposed HC', 'Cost Alloc %', 'Proposed Budget', 'Prop. Mgrs', 'Prop. Profs', 'Span of Control', 'Span Alert', 'Allocation Alert'];
      writeTblHdr(sh5, r, p3Hdrs);
      addFilter(sh5, r, p3Hdrs.length); r++;

      // Build parent map for allocation base label
      const fnById = {};
      fns.forEach(f => fnById[f.id] = f);
      fns.forEach((f, i) => {
        const alt = i % 2 === 1;
        const cs = alt ? S.tblAlt : S.tblCell;
        const csL = alt ? S.tblAltL : S.tblCellL;
        const mgr = f.manager_count || 0;
        const prof = f.professional_count || 0;
        const span = mgr > 0 ? (prof / mgr) : null;
        const spanTxt = span !== null ? span.toFixed(1) : 'N/A';
        const spanAlertTxt = span !== null && span > 8 ? 'Exceeds 8:1' : (span !== null ? 'OK' : 'N/A');
        const parentFn2 = f.parent_id && fnById[f.parent_id] ? fnById[f.parent_id] : null;
        const allocBase = parentFn2 ? `${parentFn2.proposed_function_name} (HC: ${parentFn2.proposed_hc || 0})` : `Division Target (HC: ${div.headcount_target || 0})`;
        let allocAlert = '';
        if (f.hc_allocation_percent > 100) allocAlert += 'HC >100%; ';
        if (f.cost_allocation_percent > 100) allocAlert += 'Cost >100%; ';
        const dec = getDecision(f);
        sh5.getCell(r, 1).value = f.function_number; applyStyle(sh5.getCell(r, 1), cs);
        sh5.getCell(r, 2).value = f.proposed_function_name || ''; applyStyle(sh5.getCell(r, 2), csL);
        sh5.getCell(r, 3).value = allocBase; applyStyle(sh5.getCell(r, 3), csL);
        sh5.getCell(r, 4).value = dec; applyStyle(sh5.getCell(r, 4), decStyle(dec));
        sh5.getCell(r, 5).value = (f.hc_allocation_percent || 0) / 100; applyStyle(sh5.getCell(r, 5), cs); sh5.getCell(r, 5).numFmt = '0.0%';
        sh5.getCell(r, 6).value = f.proposed_hc || 0; applyStyle(sh5.getCell(r, 6), S.greenBold); sh5.getCell(r, 6).numFmt = '#,##0';
        sh5.getCell(r, 7).value = (f.cost_allocation_percent || 0) / 100; applyStyle(sh5.getCell(r, 7), cs); sh5.getCell(r, 7).numFmt = '0.0%';
        sh5.getCell(r, 8).value = f.proposed_budget || 0; applyStyle(sh5.getCell(r, 8), S.greenBold); sh5.getCell(r, 8).numFmt = '#,##0';
        sh5.getCell(r, 9).value = mgr; applyStyle(sh5.getCell(r, 9), cs); sh5.getCell(r, 9).numFmt = '#,##0';
        sh5.getCell(r, 10).value = prof; applyStyle(sh5.getCell(r, 10), cs); sh5.getCell(r, 10).numFmt = '#,##0';
        sh5.getCell(r, 11).value = spanTxt; applyStyle(sh5.getCell(r, 11), cs);
        sh5.getCell(r, 12).value = spanAlertTxt; applyStyle(sh5.getCell(r, 12), spanAlertTxt === 'Exceeds 8:1' ? S.redBold : (spanAlertTxt === 'OK' ? S.greenBold : cs));
        sh5.getCell(r, 13).value = allocAlert || 'OK'; applyStyle(sh5.getCell(r, 13), allocAlert ? S.redBold : S.greenBold);
        sh5.getRow(r).height = 18; r++;
      });
      // Phase 3 totals
      const p3TotRow = sh5.getRow(r);
      ['', 'TOTAL', '', '', '', '', '', '', '', '', '', '', ''].forEach((v, i) => {
        applyStyle(p3TotRow.getCell(i + 1), S.tblHdr);
        p3TotRow.getCell(i + 1).value = v;
      });
      p3TotRow.getCell(6).value = totalToBeHC; p3TotRow.getCell(6).numFmt = '#,##0';
      p3TotRow.getCell(8).value = totalToBeBudget; p3TotRow.getCell(8).numFmt = '#,##0';
      p3TotRow.getCell(9).value = totalToBeMgrs; p3TotRow.getCell(9).numFmt = '#,##0';
      p3TotRow.getCell(10).value = totalToBeProfs; p3TotRow.getCell(10).numFmt = '#,##0';
      p3TotRow.height = 22;

      // ════════════════════════════════════════════════════════════════
      // SHEET 6 — FINAL SUMMARY
      // ════════════════════════════════════════════════════════════════
      const sh6 = workbook.addWorksheet('6. Final Summary');
      sh6.views = [{ state: 'frozen', ySplit: 2, xSplit: 0 }];
      sh6.columns = [{ width: 32 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 22 }];
      r = 1;
      writeBanner(sh6, r, 5, `ZBOD REPORT  —  ${div.structure_name || 'Division'}  |  Final Summary`, S.sheetTitle); r++;
      writeBanner(sh6, r, 5, '6. FINAL REVIEW & SUMMARY', S.sectionHdr); r++;

      const summaryKVs = [
        ['', 'AS-IS', 'TARGET', 'PROPOSED', 'STATUS'],
        ['Total Headcount', totalAsIsHC, div.headcount_target || 0, totalToBeHC, hcDiff === 0 ? 'On Target' : hcDiff > 0 ? `Over by ${hcDiff}` : `Under by ${Math.abs(hcDiff)}`],
        ['Total Budget (AZN)', totalAsIsBudget, div.budget_target || 0, totalToBeBudget, budgDiff === 0 ? 'On Target' : budgDiff > 0 ? `Over by ${budgDiff.toLocaleString()}` : `Under by ${Math.abs(budgDiff).toLocaleString()}`],
        ['Total Managers', totalAsIsMgrs, '', totalToBeMgrs, ''],
        ['Total Professionals', totalAsIsProfs, '', totalToBeProfs, ''],
        ['Average Span of Control', '', '', avgSpan, avgSpan !== 'N/A' && parseFloat(avgSpan) > 8 ? 'Warning: >8:1' : 'OK'],
        ['Number of Functions', asIsFns.length, '', fns.length, ''],
      ];
      summaryKVs.forEach((row, idx) => {
        if (idx === 0) {
          // Column headers
          row.forEach((v, c) => {
            const cell = sh6.getCell(r, c + 1);
            cell.value = v;
            applyStyle(cell, c === 0 ? S.rowLabel : S.tblHdr);
          });
          sh6.getRow(r).height = 22; r++;
        } else {
          const [lbl, asis, tgt, prop, status] = row;
          sh6.getCell(r, 1).value = lbl; applyStyle(sh6.getCell(r, 1), S.rowLabel);
          sh6.getCell(r, 2).value = asis !== '' ? asis : '—'; applyStyle(sh6.getCell(r, 2), S.tblCell); if (typeof asis === 'number') sh6.getCell(r, 2).numFmt = '#,##0';
          sh6.getCell(r, 3).value = tgt !== '' ? tgt : '—'; applyStyle(sh6.getCell(r, 3), S.goldBold); if (typeof tgt === 'number') sh6.getCell(r, 3).numFmt = '#,##0';
          sh6.getCell(r, 4).value = prop !== '' ? prop : '—'; applyStyle(sh6.getCell(r, 4), S.greenBold); if (typeof prop === 'number') sh6.getCell(r, 4).numFmt = '#,##0';
          const isOverTarget = typeof status === 'string' && status.startsWith('Over');
          const isOnTarget = status === 'On Target' || status === 'OK';
          sh6.getCell(r, 5).value = status || '—';
          applyStyle(sh6.getCell(r, 5), isOnTarget ? S.greenBold : isOverTarget ? S.redBold : S.tblCell);
          sh6.getRow(r).height = 18; r++;
        }
      });
      r++;

      // Decision breakdown table
      writeBanner(sh6, r, 5, 'ZBOD DECISION BREAKDOWN', S.sectionHdr); r++;
      const decBreakHdrs = ['Decision', 'Count', '% of Total', 'Proposed HC', 'Proposed Budget (AZN)'];
      writeTblHdr(sh6, r, decBreakHdrs); r++;
      const decRows = [
        ['INVEST',    inc, S.greenBold],
        ['KEEP',      kp,  S.goldBold],
        ['OPTIMIZE',  opt, S.blueBold],
        ['ELIMINATE', elm, S.redBold],
      ];
      decRows.forEach(([label, arr, style]) => {
        const pct = fns.length > 0 ? arr.length / fns.length : 0;
        const dHC = arr.reduce((s, f) => s + (f.proposed_hc || 0), 0);
        const dBudg = arr.reduce((s, f) => s + (f.proposed_budget || 0), 0);
        sh6.getCell(r, 1).value = label; applyStyle(sh6.getCell(r, 1), style);
        sh6.getCell(r, 2).value = arr.length; applyStyle(sh6.getCell(r, 2), S.tblCell);
        sh6.getCell(r, 3).value = pct; applyStyle(sh6.getCell(r, 3), S.tblCell); sh6.getCell(r, 3).numFmt = '0.0%';
        sh6.getCell(r, 4).value = dHC; applyStyle(sh6.getCell(r, 4), S.tblCell); sh6.getCell(r, 4).numFmt = '#,##0';
        sh6.getCell(r, 5).value = dBudg; applyStyle(sh6.getCell(r, 5), S.tblCell); sh6.getCell(r, 5).numFmt = '#,##0';
        sh6.getRow(r).height = 20; r++;
      });
      // Totals
      const decTotRow = sh6.getRow(r);
      decTotRow.getCell(1).value = 'TOTAL'; applyStyle(decTotRow.getCell(1), S.tblHdr);
      decTotRow.getCell(2).value = fns.length; applyStyle(decTotRow.getCell(2), S.tblHdr);
      decTotRow.getCell(3).value = ''; applyStyle(decTotRow.getCell(3), S.tblHdr);
      decTotRow.getCell(4).value = totalToBeHC; applyStyle(decTotRow.getCell(4), S.tblHdr); decTotRow.getCell(4).numFmt = '#,##0';
      decTotRow.getCell(5).value = totalToBeBudget; applyStyle(decTotRow.getCell(5), S.tblHdr); decTotRow.getCell(5).numFmt = '#,##0';
      decTotRow.height = 22;

      // ════════════════════════════════════════════════════════════════
      // SHEET 7 — DASHBOARD
      // ════════════════════════════════════════════════════════════════
      const sh7 = workbook.addWorksheet('7. Dashboard');
      sh7.views = [{ state: 'frozen', ySplit: 2, xSplit: 0 }];
      sh7.columns = [{ width: 30 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 18 }];
      r = 1;
      writeBanner(sh7, r, 6, `ZBOD REPORT  —  ${div.structure_name || 'Division'}  |  Dashboard`, S.sheetTitle); r++;

      // HC comparison block
      writeBanner(sh7, r, 6, 'HEADCOUNT COMPARISON (AS-IS vs TARGET vs PROPOSED)', S.sectionHdr); r++;
      [
        ['AS-IS Total HC',   totalAsIsHC,           '#,##0', S.tblCell],
        ['Target HC',        div.headcount_target || 0, '#,##0', S.goldBold],
        ['Proposed HC',      totalToBeHC,           '#,##0', S.greenBold],
        ['HC Difference (Proposed vs Target)', hcDiff, '+#,##0;-#,##0;0', hcDiff > 0 ? S.redBold : hcDiff < 0 ? S.greenBold : S.tblCell],
        ['HC Change %', div.headcount_target > 0 ? (hcDiff / div.headcount_target) : 0, '0.0%', S.tblCell],
      ].forEach(([lbl, val, fmt, style]) => {
        sh7.getCell(r, 1).value = lbl; applyStyle(sh7.getCell(r, 1), S.rowLabel);
        sh7.getCell(r, 2).value = val; applyStyle(sh7.getCell(r, 2), style); sh7.getCell(r, 2).numFmt = fmt;
        sh7.getRow(r).height = 18; r++;
      });
      r++;

      // Budget comparison block
      writeBanner(sh7, r, 6, 'BUDGET COMPARISON (AS-IS vs TARGET vs PROPOSED)', S.sectionHdr); r++;
      [
        ['AS-IS Total Budget (AZN)',   totalAsIsBudget,         '#,##0', S.tblCell],
        ['Target Budget (AZN)',        div.budget_target || 0,  '#,##0', S.goldBold],
        ['Proposed Budget (AZN)',      totalToBeBudget,         '#,##0', S.greenBold],
        ['Budget Difference (Proposed vs Target)', budgDiff, '+#,##0;-#,##0;0', budgDiff > 0 ? S.redBold : budgDiff < 0 ? S.greenBold : S.tblCell],
        ['Budget Change %', div.budget_target > 0 ? (budgDiff / div.budget_target) : 0, '0.0%', S.tblCell],
      ].forEach(([lbl, val, fmt, style]) => {
        sh7.getCell(r, 1).value = lbl; applyStyle(sh7.getCell(r, 1), S.rowLabel);
        sh7.getCell(r, 2).value = val; applyStyle(sh7.getCell(r, 2), style); sh7.getCell(r, 2).numFmt = fmt;
        sh7.getRow(r).height = 18; r++;
      });
      r++;

      // Manager & professional block
      writeBanner(sh7, r, 6, 'PEOPLE COMPOSITION', S.sectionHdr); r++;
      [
        ['AS-IS Managers',          totalAsIsMgrs,  '#,##0', S.tblCell],
        ['Proposed Managers',       totalToBeMgrs,  '#,##0', S.greenBold],
        ['AS-IS Professionals',     totalAsIsProfs, '#,##0', S.tblCell],
        ['Proposed Professionals',  totalToBeProfs, '#,##0', S.greenBold],
        ['Average Span of Control', avgSpan === 'N/A' ? 'N/A' : parseFloat(avgSpan), avgSpan === 'N/A' ? '' : '0.0', S.tblCell],
      ].forEach(([lbl, val, fmt, style]) => {
        sh7.getCell(r, 1).value = lbl; applyStyle(sh7.getCell(r, 1), S.rowLabel);
        sh7.getCell(r, 2).value = val; applyStyle(sh7.getCell(r, 2), style); if (fmt) sh7.getCell(r, 2).numFmt = fmt;
        sh7.getRow(r).height = 18; r++;
      });
      r++;

      // Decision distribution
      writeBanner(sh7, r, 6, 'DECISION DISTRIBUTION', S.sectionHdr); r++;
      writeTblHdr(sh7, r, ['Decision', 'Count', '% of Total', 'Proposed HC', 'Proposed Budget (AZN)', '']); r++;
      [
        ['INVEST',    inc, S.greenBold],
        ['KEEP',      kp,  S.goldBold],
        ['OPTIMIZE',  opt, S.blueBold],
        ['ELIMINATE', elm, S.redBold],
      ].forEach(([label, arr, style], idx) => {
        const alt = idx % 2 === 1;
        const cs = alt ? S.tblAlt : S.tblCell;
        const pct = fns.length > 0 ? arr.length / fns.length : 0;
        const dHC = arr.reduce((s, f) => s + (f.proposed_hc || 0), 0);
        const dBudg = arr.reduce((s, f) => s + (f.proposed_budget || 0), 0);
        sh7.getCell(r, 1).value = label; applyStyle(sh7.getCell(r, 1), style);
        sh7.getCell(r, 2).value = arr.length; applyStyle(sh7.getCell(r, 2), cs);
        sh7.getCell(r, 3).value = pct; applyStyle(sh7.getCell(r, 3), cs); sh7.getCell(r, 3).numFmt = '0.0%';
        sh7.getCell(r, 4).value = dHC; applyStyle(sh7.getCell(r, 4), cs); sh7.getCell(r, 4).numFmt = '#,##0';
        sh7.getCell(r, 5).value = dBudg; applyStyle(sh7.getCell(r, 5), cs); sh7.getCell(r, 5).numFmt = '#,##0';
        sh7.getCell(r, 6).value = ''; applyStyle(sh7.getCell(r, 6), cs);
        sh7.getRow(r).height = 20; r++;
      });

      // ════════════════════════════════════════════════════════════════
      // SHEET 8 — RAW DATA
      // ════════════════════════════════════════════════════════════════
      const sh8 = workbook.addWorksheet('8. Raw Data');
      sh8.views = [{ state: 'frozen', ySplit: 2, xSplit: 2 }];
      sh8.columns = [
        { width: 5  }, { width: 26 }, { width: 22 }, { width: 14 }, { width: 18 },
        { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 },
        { width: 12 }, { width: 8  }, { width: 8  }, { width: 8  }, { width: 16 },
        { width: 10 }, { width: 14 }, { width: 10 }, { width: 14 }, { width: 10 },
        { width: 10 }, { width: 12 }, { width: 14 }, { width: 18 },
      ];
      r = 1;
      writeBanner(sh8, r, 24, `ZBOD REPORT  —  ${div.structure_name || 'Division'}  |  Raw Data (Machine-Readable)`, S.sheetTitle); r++;
      const rawHdrs = [
        '#', 'Function Name', 'Parent Function', 'Mgmt Level', 'Structure Type',
        'Eliminate?', 'Automate?', 'Outsource?', 'P1 Alert', 'SQ1 Score',
        'SQ2 Score', 'Total Score', 'ZBOD Decision', 'P1 Review Status',
        'HC Alloc %', 'Proposed HC', 'Cost Alloc %', 'Proposed Budget (AZN)',
        'Prop. Managers', 'Prop. Professionals', 'Span of Control',
        'Span Alert', 'Strategic Justification', 'Business Impact Output',
      ];
      writeTblHdr(sh8, r, rawHdrs);
      addFilter(sh8, r, rawHdrs.length); r++;
      fns.forEach((f, i) => {
        const alt = i % 2 === 1;
        const cs = alt ? S.tblAlt : S.tblCell;
        const csL = alt ? S.tblAltL : S.tblCellL;
        const elim = f.can_be_eliminated || '';
        const auto = f.can_be_automated || '';
        const out  = f.can_be_outsourced || '';
        const alert = f.justification_alert || (elim && auto && out ? computePhase1Alert(elim, auto, out) : '');
        const reviewFail = elim === 'Yes' || auto === 'Yes' || out === 'Yes';
        const q1 = f.question1_score || 0;
        const q2 = f.question2_score || 0;
        const dec = getDecision(f);
        const parentFnRaw = f.parent_id && fnById[f.parent_id] ? fnById[f.parent_id] : null;
        const mgr  = f.manager_count || 0;
        const prof = f.professional_count || 0;
        const span = mgr > 0 ? (prof / mgr) : null;
        const cells = [
          [f.function_number, cs],
          [f.proposed_function_name || '', csL],
          [parentFnRaw ? parentFnRaw.proposed_function_name : '(Root)', csL],
          [f.career_level || '', cs],
          [f.function_structure_type || '', cs],
          [elim, elim === 'Yes' ? S.redBold : cs],
          [auto, auto === 'Yes' ? S.goldBold : cs],
          [out,  out  === 'Yes' ? S.goldBold : cs],
          [alert || 'OK', cs],
          [q1, cs],
          [q2, cs],
          [q1 + q2, cs],
          [dec, decStyle(dec)],
          [reviewFail ? 'REVIEW REQUIRED' : 'PASSED FILTER', reviewFail ? S.redBold : S.greenBold],
          [(f.hc_allocation_percent || 0) / 100, cs],
          [f.proposed_hc || 0, S.greenBold],
          [(f.cost_allocation_percent || 0) / 100, cs],
          [f.proposed_budget || 0, S.greenBold],
          [mgr, cs],
          [prof, cs],
          [span !== null ? span : 'N/A', cs],
          [span !== null && span > 8 ? 'Exceeds 8:1' : (span !== null ? 'OK' : 'N/A'), cs],
          [f.strategic_justification || '', csL],
          [f.business_impact_output || '', csL],
        ];
        const numFmts = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, '0.0%', '#,##0', '0.0%', '#,##0', '#,##0', '#,##0', '0.0', null, null, null];
        cells.forEach(([val, style], ci) => {
          const cell = sh8.getCell(r, ci + 1);
          cell.value = val;
          applyStyle(cell, style);
          if (numFmts[ci]) cell.numFmt = numFmts[ci];
        });
        sh8.getRow(r).height = 18; r++;
      });

      // ════════════════════════════════════════════════════════════════
      // Write file
      // ════════════════════════════════════════════════════════════════
      const safeName = (div.structure_name || 'Division').replace(/[^a-zA-Z0-9]/g, '_');
      const wsDateFile = ws.completed_at ? new Date(ws.completed_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const fileName = `ZBOD_Report_${safeName}_${wsDateFile}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);

      this.closeExportModal();
      toast('Report exported successfully.');
    } catch (err) {
      console.error('Export error:', err);
      toast('Export failed: ' + err.message);
    }
  },

  // === ORG CHART CONTROLS ===
  orgZoom(delta) {
    orgZoomScale = Math.max(0.3, Math.min(2.5, orgZoomScale + delta));
    const canvas = document.getElementById('org-canvas');
    if (canvas) canvas.style.transform = `scale(${orgZoomScale})`;
  },
  orgZoomReset() {
    orgZoomScale = 1.0;
    const canvas = document.getElementById('org-canvas');
    if (canvas) canvas.style.transform = 'scale(1)';
  },
  orgZoomFit() {
    const canvas = document.getElementById('org-canvas');
    const viewport = canvas?.parentElement;
    if (!canvas || !viewport) return;
    const vW = viewport.clientWidth - 48;
    const cW = canvas.scrollWidth;
    if (cW > 0) {
      orgZoomScale = Math.max(0.3, Math.min(1.0, vW / cW));
      canvas.style.transform = `scale(${orgZoomScale})`;
    }
  },
  toggleP3Child(fnId) {
    if (state.p3ExpandedChildren.has(fnId)) {
      state.p3ExpandedChildren.delete(fnId);
    } else {
      state.p3ExpandedChildren.add(fnId);
    }
    renderPhase3();
  },
  toggleOrgNode(nodeId) {
    if (!window.orgCollapsedNodes) window.orgCollapsedNodes = new Set();
    if (window.orgCollapsedNodes.has(nodeId)) {
      window.orgCollapsedNodes.delete(nodeId);
    } else {
      window.orgCollapsedNodes.add(nodeId);
    }
    const ws = getWs().find(w => w.id === state.selectedWorkshopId);
    if (!ws) return;
    const div = getDivs().find(d => d.id === ws.division_id);
    if (!div) return;
    const fns = getFns().filter(f => f.workshop_id === ws.id).sort((a, b) => a.function_number - b.function_number);
    const container = document.querySelector('.org-chart-container');
    if (container) container.innerHTML = renderOrgChart(fns, div.structure_name, div);
    const canvas = document.getElementById('org-canvas');
    if (canvas && orgZoomScale !== 1) canvas.style.transform = `scale(${orgZoomScale})`;
  },
  startOrgPan(event) {
    const viewport = event.currentTarget;
    orgIsPanning = true;
    orgPanStart = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    viewport.style.cursor = 'grabbing';
  },
  doOrgPan(event) {
    if (!orgIsPanning) return;
    const viewport = event.currentTarget;
    const dx = event.clientX - orgPanStart.x;
    const dy = event.clientY - orgPanStart.y;
    viewport.scrollLeft = orgPanStart.scrollLeft - dx;
    viewport.scrollTop = orgPanStart.scrollTop - dy;
  },
  endOrgPan(event) {
    if (!orgIsPanning) return;
    orgIsPanning = false;
    event.currentTarget.style.cursor = 'grab';
  },

  // === INIT ===
  async init() {
    await loadFromSupabase();
    const h = window.location.hash.slice(1);
    if (h === 'divisions') { showPage('divisions'); renderDivisions(); }
    else { showPage('landing'); renderLanding(); }
  },
};

// ═══════════════════════════════════════════
// HELPER: Delete cascading
// ═══════════════════════════════════════════
function delAsIsByDivision(divisionId) { lsSet(LS.asIs, getAsIs().filter(f => f.division_id !== divisionId)); }
function delWsByDivision(divisionId) { lsSet(LS.workshops, getWs().filter(w => w.division_id !== divisionId)); }

// ═══════════════════════════════════════════
// GLOBAL EVENT LISTENERS
// ═══════════════════════════════════════════
document.addEventListener('wheel', function(e) {
  if (document.activeElement && document.activeElement.type === 'number') {
    e.preventDefault();
  }
}, { passive: false });

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
