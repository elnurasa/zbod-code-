-- ═══════════════════════════════════════════════════════════════════
-- ZBOD TOOL — Supabase Database Setup  (complete, run once)
-- Project : https://qznyesglqkqbbewrkknj.supabase.co
-- Access  : shared/public — no authentication, anon key only
-- ═══════════════════════════════════════════════════════════════════

-- UUID extension (already on by default in Supabase, safe to repeat)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- HELPER: auto-stamp updated_at on every UPDATE
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════
-- TABLE: divisions
-- One row per organisational structure (division / dept / unit).
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS divisions (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT        NOT NULL,
  structure_type    TEXT        NOT NULL DEFAULT 'Division',
  password          TEXT        NOT NULL,
  creator_name      TEXT,
  creator_position  TEXT,
  creator_email     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_divisions_updated_at ON divisions (updated_at DESC);

DROP TRIGGER IF EXISTS trg_divisions_updated_at ON divisions;
CREATE TRIGGER trg_divisions_updated_at
  BEFORE UPDATE ON divisions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═══════════════════════════════════════════
-- TABLE: workshops
-- One or more workshop sessions per division.
-- Deleting a division cascades to its workshops.
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workshops (
  id                            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_id                   UUID        NOT NULL REFERENCES divisions (id) ON DELETE CASCADE,
  status                        TEXT        NOT NULL DEFAULT 'draft',
  phase                         INTEGER     NOT NULL DEFAULT 1,
  completed_at                  TIMESTAMPTZ,
  submitted_for_hr_review_at    TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workshops_division_id ON workshops (division_id);
CREATE INDEX IF NOT EXISTS idx_workshops_updated_at  ON workshops (updated_at DESC);

DROP TRIGGER IF EXISTS trg_workshops_updated_at ON workshops;
CREATE TRIGGER trg_workshops_updated_at
  BEFORE UPDATE ON workshops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═══════════════════════════════════════════
-- TABLE: workshop_functions
-- Functions created and assessed across Phases 1–3.
-- Deleting a workshop cascades to its functions.
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS workshop_functions (
  id                       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id              UUID        NOT NULL REFERENCES workshops (id) ON DELETE CASCADE,
  function_number          INTEGER,
  proposed_function_name   TEXT,
  career_level             TEXT,
  function_structure_type  TEXT,
  parent_id                TEXT,
  strategic_justification  TEXT,
  -- Phase 1 filters
  can_be_eliminated        TEXT,
  can_be_automated         TEXT,
  can_be_outsourced        TEXT,
  justification_alert      TEXT,
  -- Phase 2 scoring
  question1_score          NUMERIC,
  question2_score          NUMERIC,
  total_score              NUMERIC,
  zbod_decision            TEXT,
  -- Phase 3 HC & cost allocation
  target_headcount         NUMERIC,
  target_budget            NUMERIC,
  total_hc                 NUMERIC,
  hc_allocation_percent    NUMERIC,
  proposed_hc              NUMERIC,
  total_budget             NUMERIC,
  cost_allocation_percent  NUMERIC,
  proposed_budget          NUMERIC,
  manager_count            NUMERIC,
  professional_count       NUMERIC,
  span_of_control          NUMERIC,
  span_alert               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_workshop_id     ON workshop_functions (workshop_id);
CREATE INDEX IF NOT EXISTS idx_wf_function_number ON workshop_functions (workshop_id, function_number);
CREATE INDEX IF NOT EXISTS idx_wf_updated_at      ON workshop_functions (updated_at DESC);

DROP TRIGGER IF EXISTS trg_wf_updated_at ON workshop_functions;
CREATE TRIGGER trg_wf_updated_at
  BEFORE UPDATE ON workshop_functions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═══════════════════════════════════════════
-- TABLE: as_is_functions
-- Current-state (As-Is) functions per division.
-- Deleting a division cascades to its as-is functions.
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS as_is_functions (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_id            UUID        NOT NULL REFERENCES divisions (id) ON DELETE CASCADE,
  function_name          TEXT,
  manager_count          NUMERIC     DEFAULT 0,
  current_employee_count NUMERIC     DEFAULT 0,
  current_function_hc    NUMERIC     DEFAULT 0,
  current_budget         NUMERIC     DEFAULT 0,
  managers_cost          NUMERIC     DEFAULT 0,
  professionals_cost     NUMERIC     DEFAULT 0,
  target_headcount       NUMERIC,
  target_budget          NUMERIC,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ais_division_id ON as_is_functions (division_id);
CREATE INDEX IF NOT EXISTS idx_ais_updated_at  ON as_is_functions (updated_at DESC);

DROP TRIGGER IF EXISTS trg_ais_updated_at ON as_is_functions;
CREATE TRIGGER trg_ais_updated_at
  BEFORE UPDATE ON as_is_functions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═══════════════════════════════════════════
-- TABLE: landing_box_settings
-- Stores every editable content block on the landing page.
--
-- box_id naming convention (used by script.js):
--   'overview'           — overview title + text
--   'guideline_title'    — ZBOD Guideline section title
--   'gl1' … 'gl7'        — individual guideline items
--   'problems'           — problem statement (JSON array in content)
--   'questions_title'    — Main Questions section title
--   'mq1' … 'mq3'        — individual main question items
--   'quote'              — strategic quote text
--   'strategic_title'    — Strategic Questions section title
--   'sq1' … 'sq2'        — individual strategic question items
--   'fcmatrix'           — function categorisation matrix (JSON in content)
--   'support'            — support functions list (JSON in content)
--   'principles'         — core principles list (JSON in content)
--   'strategic_overview' — strategic overview table (JSON in content)
--   'aaa_cards_<uuid>'   — AAA insight cards per division (JSON array in content)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS landing_box_settings (
  box_id          TEXT        PRIMARY KEY,
  title           TEXT,
  content         TEXT,
  position_order  INTEGER     DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_landing_updated_at ON landing_box_settings;
CREATE TRIGGER trg_landing_updated_at
  BEFORE UPDATE ON landing_box_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Shared public workspace: the anon role may read and write everything.
-- No user authentication is required.
-- ═══════════════════════════════════════════

ALTER TABLE divisions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_functions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE as_is_functions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_box_settings ENABLE ROW LEVEL SECURITY;

-- divisions
DROP POLICY IF EXISTS "anon_select_divisions" ON divisions;
DROP POLICY IF EXISTS "anon_insert_divisions" ON divisions;
DROP POLICY IF EXISTS "anon_update_divisions" ON divisions;
DROP POLICY IF EXISTS "anon_delete_divisions" ON divisions;
CREATE POLICY "anon_select_divisions" ON divisions FOR SELECT USING (true);
CREATE POLICY "anon_insert_divisions" ON divisions FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_divisions" ON divisions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_divisions" ON divisions FOR DELETE USING (true);

-- workshops
DROP POLICY IF EXISTS "anon_select_workshops" ON workshops;
DROP POLICY IF EXISTS "anon_insert_workshops" ON workshops;
DROP POLICY IF EXISTS "anon_update_workshops" ON workshops;
DROP POLICY IF EXISTS "anon_delete_workshops" ON workshops;
CREATE POLICY "anon_select_workshops" ON workshops FOR SELECT USING (true);
CREATE POLICY "anon_insert_workshops" ON workshops FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_workshops" ON workshops FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_workshops" ON workshops FOR DELETE USING (true);

-- workshop_functions
DROP POLICY IF EXISTS "anon_select_wf" ON workshop_functions;
DROP POLICY IF EXISTS "anon_insert_wf" ON workshop_functions;
DROP POLICY IF EXISTS "anon_update_wf" ON workshop_functions;
DROP POLICY IF EXISTS "anon_delete_wf" ON workshop_functions;
CREATE POLICY "anon_select_wf" ON workshop_functions FOR SELECT USING (true);
CREATE POLICY "anon_insert_wf" ON workshop_functions FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_wf" ON workshop_functions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_wf" ON workshop_functions FOR DELETE USING (true);

-- as_is_functions
DROP POLICY IF EXISTS "anon_select_ais" ON as_is_functions;
DROP POLICY IF EXISTS "anon_insert_ais" ON as_is_functions;
DROP POLICY IF EXISTS "anon_update_ais" ON as_is_functions;
DROP POLICY IF EXISTS "anon_delete_ais" ON as_is_functions;
CREATE POLICY "anon_select_ais" ON as_is_functions FOR SELECT USING (true);
CREATE POLICY "anon_insert_ais" ON as_is_functions FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_ais" ON as_is_functions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_ais" ON as_is_functions FOR DELETE USING (true);

-- landing_box_settings
DROP POLICY IF EXISTS "anon_select_landing" ON landing_box_settings;
DROP POLICY IF EXISTS "anon_insert_landing" ON landing_box_settings;
DROP POLICY IF EXISTS "anon_update_landing" ON landing_box_settings;
DROP POLICY IF EXISTS "anon_delete_landing" ON landing_box_settings;
CREATE POLICY "anon_select_landing" ON landing_box_settings FOR SELECT USING (true);
CREATE POLICY "anon_insert_landing" ON landing_box_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_landing" ON landing_box_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_landing" ON landing_box_settings FOR DELETE USING (true);

-- ═══════════════════════════════════════════
-- DONE — all tables, triggers, indexes, and RLS policies created.
-- ═══════════════════════════════════════════
