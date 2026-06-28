# CHANGELOG — Supabase Integration (Complete)

## Summary of all changes across two sessions

---

## Files Changed

### `supabase.js` — Complete rewrite (both sessions)

**Session 1 — Fixed fatal bugs in the original file:**
- `sb` variable was undefined — every CRUD function returned immediately without doing anything
- Upsert logic was wrong — `UPDATE` on a missing row succeeds silently in Supabase, so the fallback `INSERT` never ran; new records were never persisted
- `sbSaveLandingBox` and `sbDeleteLandingBox` called `sb.supabase.from(...)` — double-wrong reference

**Session 2 — Completed missing functionality:**
- `sbLoadAll` now also fetches `landing_box_settings` and returns it as `landingBoxes`
- All CRUD functions use `upsert(..., { onConflict: 'id' })` for correct insert-or-update semantics
- Landing boxes use `upsert(..., { onConflict: 'box_id' })`
- Clean `sbRun(fn)` wrapper — each CRUD function passes a single function receiving the client; no more brittle positional-arg `sbQuery`

---

### `script.js` — Three targeted edits

#### Edit 1 — `addDiv` (Session 1)
`addDiv()` created a new division in localStorage but never synced it to Supabase. Every other add function (`addWs`, `addFn`, `addAsIsFn`) already had the sync call. One line added.

#### Edit 2 — `setAAACards` (Session 2)
AAA insight cards (per-division text cards in the workspace) were written to localStorage only. Now each division's card array is also synced to Supabase via `landing_box_settings` using `box_id = 'aaa_cards_<divisionId>'`.

#### Edit 3 — `loadFromSupabase` (Session 2)
The biggest gap: landing page customisations (guidelines, problems, questions, quote, matrix, support functions, principles, strategic overview) were saved to Supabase on edit, but on the next page load `loadFromSupabase` only restored divisions, workshops, functions, and as-is functions. All landing content was lost on refresh.

Added full landing box restoration logic that:
- Reads all `landing_box_settings` rows from the `data.landingBoxes` payload returned by the updated `sbLoadAll`
- Routes each row back to the correct localStorage key based on `box_id`
- Reassembles array-type sections (guidelines gl1–gl7, main questions mq1–mq3, strategic questions sq1–sq2) by sorting on `position_order` and rebuilding the arrays
- Restores AAA cards per division from `box_id = 'aaa_cards_<divisionId>'` rows

#### Edit 4 — `saveGuideline` (Session 2)
The guideline section title (`zbod_guideline_title`) was saved to localStorage but never to Supabase, unlike every other section title. Fixed by adding a `sbSaveLandingBox({ box_id: 'guideline_title', ... })` call inside `saveGuideline`.

---

### `supabase_setup.sql` — Updated (Session 2)

The original SQL (Session 1) had the wrong schema for `landing_box_settings`:
- Had: `box_id, title, value, subtitle, updated_at`
- Needed: `box_id, title, content, position_order, updated_at`

`script.js` calls `sbSaveLandingBox` with `{ box_id, title, content, position_order }` in 12 different save functions. The old schema would have caused all landing box writes to silently fail (unknown columns).

**Session 2 SQL is the authoritative version.** If you already ran Session 1 SQL, run this migration:

```sql
ALTER TABLE landing_box_settings
  ADD COLUMN IF NOT EXISTS content        TEXT,
  ADD COLUMN IF NOT EXISTS position_order INTEGER DEFAULT 0;

ALTER TABLE landing_box_settings
  DROP COLUMN IF EXISTS value,
  DROP COLUMN IF EXISTS subtitle;
```

Or simply drop and recreate (safe if you have no data yet):
```sql
DROP TABLE IF EXISTS landing_box_settings;
```
Then re-run the full `supabase_setup.sql`.

---

## New Environment Variables
None. Credentials are embedded in `supabase.js` (this is the public anon key — safe for client-side use).

---

## Complete box_id → localStorage key mapping

| box_id | localStorage key | format |
|--------|-----------------|--------|
| `overview` | `zbod_landing` | `{ overviewTitle, overviewText }` |
| `guideline_title` | `zbod_guideline_title` | string |
| `gl1`–`gl7` | `zbod_guidelines` | array of `{ id, iconKey, title, text }` |
| `problems` | `zbod_problems` + `zbod_problems_title` | JSON array + string |
| `questions_title` | `zbod_questions_title` | string |
| `mq1`–`mq3` | `zbod_questions` | array of `{ id, label, text }` |
| `quote` | `zbod_quote` | string |
| `strategic_title` | `zbod_strategic_title` | string |
| `sq1`–`sq2` | `zbod_strategic` | array of `{ id, label, text }` |
| `fcmatrix` | `zbod_fcmatrix` + `zbod_fcmatrix_title` | JSON array + string |
| `support` | `zbod_support` + `zbod_support_title` | JSON array + string |
| `principles` | `zbod_principles` + `zbod_principles_title` | JSON array + string |
| `strategic_overview` | `zbod_strategic_overview` | JSON object |
| `aaa_cards_<divId>` | `zbod_aaa_cards[divId]` | JSON array of strings |

---

## Supabase Dashboard Checklist

### Step 1 — Run the SQL
1. Go to **SQL Editor** in your Supabase dashboard
2. Paste the entire contents of `supabase_setup.sql`
3. Click **Run**
4. Confirm every statement completes without errors

> If you already ran the Session 1 SQL, run the migration snippet above (ALTER TABLE) instead of the full file — or drop `landing_box_settings` and re-run the full file.

### Step 2 — Verify tables exist
Go to **Table Editor** and confirm these 5 tables are present:
- `divisions`
- `workshops`
- `workshop_functions`
- `as_is_functions`
- `landing_box_settings`

### Step 3 — Verify RLS is enabled
For each table: **Table Editor → [table name] → RLS**
- Toggle shows **Enabled**
- 4 policies listed: `anon_select_*`, `anon_insert_*`, `anon_update_*`, `anon_delete_*`

### Step 4 — Replace project files
Drop the files from the ZIP into your project folder, replacing existing files.

### Step 5 — No other setup needed
- No Storage buckets required (exports are client-side)
- No Edge Functions required
- No Auth configuration required (shared public workspace)
- No environment variables required (credentials are in `supabase.js`)

---

## How the complete integration works

```
Browser startup
  └─ loadFromSupabase()
       ├─ Fetches: divisions, workshops, workshop_functions, as_is_functions, landing_box_settings
       ├─ Merges core data with localStorage (newer updated_at wins)
       └─ Restores all landing page content blocks to localStorage keys

Every write (add / update)
  ├─ Writes to localStorage immediately  (instant UI, no latency)
  └─ Calls sbSave*() asynchronously     (fire-and-forget cloud sync)

Every delete
  ├─ Removes from localStorage immediately
  ├─ Calls sbDelete*() asynchronously
  └─ Child records auto-deleted by ON DELETE CASCADE (workshops→functions, division→workshops+as-is)

Landing page edits
  ├─ Saves to localStorage immediately
  └─ Calls sbSaveLandingBox({ box_id, title, content, position_order }) asynchronously

AAA cards (workspace insight cards)
  ├─ Saves to localStorage via setAAACards()
  └─ Syncs each division's card array as box_id='aaa_cards_<divisionId>' in landing_box_settings
```
