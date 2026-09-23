// oncall-config.jsx — THE ASSUMPTIONS FILE.
//
// Development answered two of our seven questions ("the roster probably lives server-side",
// "the historian can probably answer response-time") and could not answer the rest. So the
// on-call design runs on stated assumptions rather than pretended facts, and every one of them
// is declared HERE instead of being spread through the screens as a hard-coded behaviour.
//
// The point of this file: when an assumption turns out to be wrong, the change is a value in
// this file, not an archaeology exercise across five screens. Each flag says what we assumed,
// what happens if it is true, and what the UI does the moment it is flipped.
//
// Overridable per browser for demos and for showing a customer the other behaviour:
//   localStorage.setItem("nj_oc_ackReporting", "true")  →  reload

const NJ_OC_ASSUMPTIONS = {
  // Q1 — does the dispatcher report that a page was ANSWERED? Unknown.
  // Assumed NO, which is the conservative reading: escalation runs on the resend timer and the
  // product never claims a person responded. Flip to true and the tier list gains a response
  // column, escalation copy changes from "resend after" to "escalate if unanswered after", and
  // the delivery log gains an Answered state. Nothing else in the model has to move: a tier is
  // already an ordered list, which is what response-driven escalation needs.
  ackReporting: false,

  // Q2 — is there a signed-in user we can attribute changes to? Unknown.
  // Assumed NO. The change log attributes to NJ_SESSION_USER when something sets it, and to the
  // first account otherwise. Set window.NJ_SESSION_USER (or flip this) once auth exists.
  sessionUser: false,

  // Q3 — can every duty phone receive every channel? Unknown.
  // Assumed YES, because a duty phone is provisioned for the job. If a site has a call-only
  // handset, give that entry a `chans` array in OC_PHONES and the coverage check honours it
  // without any further change — see ocMemberChans below.
  perDeviceChannels: false,

  // Q4 — where do shifts and the roster live? "Probably server."
  // Assumed SERVER. Persistence therefore goes through njOcPersist (below) and nowhere else,
  // so the swap from browser storage to an API is one object, not thirty call sites.
  serverPersistence: true,

  // Q5 — can the historian say whether an alarm was handled in time? "Probably yes."
  // Assumed YES, but nothing is built on it yet: a response-time report needs Q1 as well,
  // because "handled in time" is meaningless until a response is recorded at all.
  responseTimeHistory: true,

  // Q6 — is there an authoritative area hierarchy to bind groups to? Unknown.
  // Assumed NO, so group areas come from our own facility register (njTankDepts / OC_AREAS).
  // If a PLC-side hierarchy exists, OC_AREAS becomes a read of it and the pickers do not change.
  externalAreaHierarchy: false,

  // Q7 — is UHF genuinely an independent path, and does it fail on its own? Unknown.
  // Assumed independent (this is what NS 9416 conformance rests on) and NOT independently
  // flaky, so there is no site-level radio switch. Flip radioToggle to surface one beside the
  // dispatch status, where an equipment state belongs.
  uhfIndependent: true,
  radioToggle: false,
};
function njOcFlag(k) {
  try { const v = localStorage.getItem("nj_oc_" + k); if (v === "true") return true; if (v === "false") return false; } catch (e) {}
  return NJ_OC_ASSUMPTIONS[k];
}

// ── persistence seam (Q4) ──
// Every on-call store reads and writes through this and only this. It is synchronous today
// because browser storage is; the shape is deliberately read/write-by-key so a server adapter
// can replace the body without touching a single caller. When that happens, make `read` return
// the last known value and refresh asynchronously — the stores already re-render on emit().
const njOcPersist = {
  read(key, fallback) {
    try { const r = JSON.parse(localStorage.getItem(key)); return r == null ? fallback : r; } catch (e) { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  },
};

// ── channel capability (Q3) ──
// One function answers "can this recipient receive this channel", for people AND devices, so
// the assumption about duty phones lives in one branch instead of being implied by an absence.
function ocMemberChans(m) {
  if (m.kind !== "phone") return null;            // people are answered from their account
  if (m.chans) return m.chans;                     // an explicitly limited device
  return njOcFlag("perDeviceChannels") ? [] : null; // null = assume fully provisioned
}

Object.assign(window, { NJ_OC_ASSUMPTIONS, njOcFlag, njOcPersist, ocMemberChans });
