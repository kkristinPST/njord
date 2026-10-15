/* Empty site (demo switch, Settings · General). Shows the product as a fresh install: no
   buildings, departments, systems, tanks, alarms, logs, notes, measurements, on-call groups or
   trends anywhere. Two halves:
   1. STORAGE: while on, every nj_* / njm_* key is read and written under "njempty::", so the real
      demo data is never touched and comes back exactly as it was when the switch goes off.
      Per-device preferences (theme, flags, language, units, labels) stay shared.
   2. SEEDS: each fixture calls njBlank(seed) right after it is declared; in empty mode that
      empties it IN PLACE (same object, so module-level references see it empty too).
   Toggling reloads the app: every store has already read its seed by then. */
(function () {
  var KEY = "nj_empty_site_v1";
  var on = false;
  try { on = window.localStorage.getItem(KEY) === "1"; } catch (e) {}
  window.NJ_EMPTY_SITE = on;
  if (on) document.documentElement.setAttribute("data-empty-site", "");
  var SHARED = /^(nj_empty_site_v1|nj_theme_v1|nj_flag_|nj_lang|nj_units_|nj_equip_label|nj_default_screen|nj_text|nj_density|nj_idle_logout_min|nj_report_lang)/;
  var shadow = function (k) { k = String(k); return on && /^njm?_/.test(k) && !SHARED.test(k) ? "njempty::" + k : k; };
  if (on) {
    var P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem;
    P.getItem = function (k) { return g.call(this, shadow(k)); };
    P.setItem = function (k, v) { return s.call(this, shadow(k), v); };
    P.removeItem = function (k) { return r.call(this, shadow(k)); };
  }
  // keep: optional predicate for items a fresh install still has (e.g. built-in shifts)
  window.njBlank = function (x, keep) {
    if (!on || !x) return x;
    if (Array.isArray(x)) { var k = keep ? x.filter(keep) : []; x.length = 0; k.forEach(function (i) { x.push(i); }); }
    else if (typeof x === "object") Object.keys(x).forEach(function (k) { delete x[k]; });
    return x;
  };
  // A real restart (empty-site toggle) reloads the page; this Babel build shows a blank page for
  // seconds while it compiles. The same "Restarting NJORD…" screen the project settings use
  // covers that gap: shown before reload, re-shown at first paint, removed when the app mounts.
  var RS = "nj_restarting";
  function overlay() {
    if (document.getElementById("nj-restart")) return;
    var d = document.createElement("div");
    d.id = "nj-restart"; d.className = "set-restart"; d.setAttribute("role", "status");
    d.innerHTML = '<span class="nj-spin" style="width:16px;height:16px" aria-hidden="true"></span><span>Restarting NJORD…</span>';
    document.documentElement.appendChild(d);
  }
  var pending = false;
  try { pending = sessionStorage.getItem(RS) === "1"; } catch (e) {}
  if (pending) { overlay(); setTimeout(function () { window.njRestartDone(); }, 20000); }
  window.njRestartDone = function () {
    try { sessionStorage.removeItem(RS); } catch (e) {}
    var d = document.getElementById("nj-restart"); if (d) d.remove();
  };
  window.njRestart = function () {
    try { sessionStorage.setItem(RS, "1"); if (window.__njRoute) sessionStorage.setItem("nj_restart_route", window.__njRoute); } catch (e) {}
    overlay();
    setTimeout(function () { location.reload(); }, 150);
  };
  window.njEmptySite = {
    on: on,
    set: function (v) { try { window.localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} window.njRestart(); },
  };
})();
