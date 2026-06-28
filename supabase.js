// ═══════════════════════════════════════════
// SUPABASE CLIENT CONFIGURATION
// ═══════════════════════════════════════════
const SUPABASE_URL = 'https://qznyesglqkqbbewrkknj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bnllc2dscWtxYmJld3Jra25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDg5MDEsImV4cCI6MjA5ODIyNDkwMX0.4fYg954Jh7lKFieGTILUP8z0Fx7cHp7pugrqRjQrgf8';

let supabase = null;
let supabaseAvailable = false;

if (typeof window !== 'undefined' &&
    typeof window.supabase !== 'undefined' &&
    typeof window.supabase.createClient === 'function') {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseAvailable = true;
    console.log('Supabase connected');
  } catch (e) {
    console.warn('Supabase connection failed:', e);
    supabaseAvailable = false;
  }
} else {
  console.warn('Supabase JS library not loaded — running in localStorage-only mode.');
}

// ═══════════════════════════════════════════
// SAFE OPERATION WRAPPER
// Returns the data array on success, null on failure.
// ═══════════════════════════════════════════
async function sbRun(fn) {
  if (!supabase || !supabaseAvailable) return null;
  try {
    const { data, error } = await fn(supabase);
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('Supabase operation failed:', e);
    return null;
  }
}

// ═══════════════════════════════════════════
// DIVISIONS CRUD
// ═══════════════════════════════════════════
async function sbLoadDivisions() {
  return sbRun(db => db.from('divisions').select('*').order('created_at', { ascending: true }));
}

async function sbSaveDivision(division) {
  return sbRun(db => db.from('divisions').upsert(division, { onConflict: 'id' }));
}

async function sbDeleteDivision(id) {
  return sbRun(db => db.from('divisions').delete().eq('id', id));
}

// ═══════════════════════════════════════════
// WORKSHOPS CRUD
// ═══════════════════════════════════════════
async function sbLoadWorkshops() {
  return sbRun(db => db.from('workshops').select('*').order('created_at', { ascending: true }));
}

async function sbSaveWorkshop(workshop) {
  return sbRun(db => db.from('workshops').upsert(workshop, { onConflict: 'id' }));
}

async function sbDeleteWorkshop(id) {
  return sbRun(db => db.from('workshops').delete().eq('id', id));
}

// ═══════════════════════════════════════════
// WORKSHOP FUNCTIONS CRUD
// ═══════════════════════════════════════════
async function sbLoadFunctions() {
  return sbRun(db => db.from('workshop_functions').select('*').order('function_number', { ascending: true }));
}

async function sbSaveFunction(fn) {
  return sbRun(db => db.from('workshop_functions').upsert(fn, { onConflict: 'id' }));
}

async function sbDeleteFunction(id) {
  return sbRun(db => db.from('workshop_functions').delete().eq('id', id));
}

// ═══════════════════════════════════════════
// AS-IS FUNCTIONS CRUD
// ═══════════════════════════════════════════
async function sbLoadAsIsFunctions() {
  return sbRun(db => db.from('as_is_functions').select('*').order('created_at', { ascending: true }));
}

async function sbSaveAsIsFunction(fn) {
  return sbRun(db => db.from('as_is_functions').upsert(fn, { onConflict: 'id' }));
}

async function sbDeleteAsIsFunction(id) {
  return sbRun(db => db.from('as_is_functions').delete().eq('id', id));
}

// ═══════════════════════════════════════════
// LANDING BOX SETTINGS CRUD
// Stores all editable landing page content blocks as key/value rows.
// Each block uses a unique box_id (e.g. 'overview', 'gl1', 'problems').
// AAA cards per division are also stored here with box_id = 'aaa_cards_<divisionId>'.
// ═══════════════════════════════════════════
async function sbLoadLandingBoxes() {
  return sbRun(db => db.from('landing_box_settings').select('*').order('position_order', { ascending: true }));
}

async function sbSaveLandingBox(entry) {
  return sbRun(db => db.from('landing_box_settings').upsert(entry, { onConflict: 'box_id' }));
}

async function sbDeleteLandingBox(boxId) {
  return sbRun(db => db.from('landing_box_settings').delete().eq('box_id', boxId));
}

// ═══════════════════════════════════════════
// BULK LOAD — called on app startup
// Returns all data needed to hydrate localStorage.
// ═══════════════════════════════════════════
async function sbLoadAll() {
  if (!supabase || !supabaseAvailable) return null;
  try {
    const [divisions, workshops, functions, asIsFns, landingBoxes] = await Promise.all([
      sbLoadDivisions(),
      sbLoadWorkshops(),
      sbLoadFunctions(),
      sbLoadAsIsFunctions(),
      sbLoadLandingBoxes(),
    ]);
    return { divisions, workshops, functions, asIsFns, landingBoxes };
  } catch (e) {
    console.warn('sbLoadAll failed:', e);
    return null;
  }
}

// ═══════════════════════════════════════════
// BULK SYNC — push all local data up to Supabase at once
// ═══════════════════════════════════════════
async function sbSyncAll(divisions, workshops, functions, asIsFns) {
  if (!supabase || !supabaseAvailable) return false;
  try {
    if (divisions && divisions.length > 0) {
      await sbRun(db => db.from('divisions').upsert(divisions, { onConflict: 'id' }));
    }
    if (workshops && workshops.length > 0) {
      await sbRun(db => db.from('workshops').upsert(workshops, { onConflict: 'id' }));
    }
    if (functions && functions.length > 0) {
      await sbRun(db => db.from('workshop_functions').upsert(functions, { onConflict: 'id' }));
    }
    if (asIsFns && asIsFns.length > 0) {
      await sbRun(db => db.from('as_is_functions').upsert(asIsFns, { onConflict: 'id' }));
    }
    return true;
  } catch (e) {
    console.warn('sbSyncAll failed:', e);
    return false;
  }
}

// ═══════════════════════════════════════════
// EXPORT — consumed by script.js as window.zbodSupabase
// ═══════════════════════════════════════════
window.zbodSupabase = {
  supabase,
  supabaseAvailable,
  // Divisions
  sbLoadDivisions,
  sbSaveDivision,
  sbDeleteDivision,
  // Workshops
  sbLoadWorkshops,
  sbSaveWorkshop,
  sbDeleteWorkshop,
  // Workshop functions
  sbLoadFunctions,
  sbSaveFunction,
  sbDeleteFunction,
  // As-Is functions
  sbLoadAsIsFunctions,
  sbSaveAsIsFunction,
  sbDeleteAsIsFunction,
  // Landing boxes (includes AAA cards via box_id prefix)
  sbLoadLandingBoxes,
  sbSaveLandingBox,
  sbDeleteLandingBox,
  // Bulk operations
  sbLoadAll,
  sbSyncAll,
};
