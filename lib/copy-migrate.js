/* copy-migrate.js — one-shot rewrite of COPY that is already sitting in localStorage.
 *
 * Every store here loads its persisted array wholesale, so a copy fix in a seed never reaches a
 * browser that has already opened the app: the screen keeps rendering the text that was written to
 * storage months ago. Same class of problem as `deMigrate` in screens/data-entry.jsx, so the same
 * shape of answer — additive, in place, never a wipe. Operator-written rows are rewritten too:
 * this is a punctuation rule for the whole product, not a seed correction.
 *
 * Must run BEFORE any store's load(), hence plain JS in <head> rather than a babel module.
 *
 * ONLY the spaced form " — " is touched. A BARE "—" is the no-value cell glyph (`tag: "—"`,
 * `time: "—"`, an empty reading) and is load-bearing — never rewrite it.
 */
(function () {
  var REV_KEY = "nj_copy_rev_v1", REV = 2;   // 2 = em-dash sweep, 31 Aug 2026
  /* Replacements where the em dash did NOT become a comma. Checked first; everything else falls
     through to the comma, which is what the seeds themselves now read. */
  var PAIRS = [["Nuisance alarm — re-parameterised", "Nuisance alarm · re-parameterised"]];
  function fix(s) {
    if (s.indexOf(" — ") < 0) return s;
    for (var i = 0; i < PAIRS.length; i++) s = s.split(PAIRS[i][0]).join(PAIRS[i][1]);
    return s.split(" — ").join(", ");
  }
  function walk(v) {
    if (typeof v === "string") return fix(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") { var o = {}; for (var k in v) o[k] = walk(v[k]); return o; }
    return v;
  }
  try {
    if (Number(localStorage.getItem(REV_KEY)) >= REV) return;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k === REV_KEY || !/^(nj_|njm_)/.test(k)) continue;
      var raw = localStorage.getItem(k);
      if (!raw || raw.indexOf(" — ") < 0) continue;
      var next;
      try { next = JSON.stringify(walk(JSON.parse(raw))); } catch (e) { next = fix(raw); }
      if (next !== raw) localStorage.setItem(k, next);
    }
    localStorage.setItem(REV_KEY, String(REV));
  } catch (e) {}
})();
