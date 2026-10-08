// ── On-call DRAFT ──
// Who sits on which level is edited as a draft and saved as ONE batch. Applying every click
// instantly meant two supervisors editing the list at once overwrote each other mid-swap, and a
// required level had to be locked so a swap could never pass through "empty". With a draft:
// - the list may be empty in between; Save is what refuses a required level left empty
// - Save re-applies the edits on top of the LATEST list, so a colleague's save is built on,
//   and anything that no longer applies is skipped and reported (oncallStore.commit)
// - "Takes effect: Now | Later" sits once beside Save, so a Monday swap is one planned batch
// The draft is a set of changes keyed group|level|name, never a copy of the list: a copy would
// silently undo whatever someone else saved meanwhile.
const OC_DRAFT_SS = "nj_oc_draft_v1";
const OC_ESC = ["p1", "p2", "p3"];
const OC_LEVELS = ["p1", "p2", "p3", "b247"];
const ocDraft = {
  ch: {}, rev0: 0, subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  // the draft survives a reload (sessionStorage, this tab only) instead of a "Leave page?"
  // prompt: the browser prompt fired on every refresh and blocked the page from updating
  emit() { try { sessionStorage.setItem(OC_DRAFT_SS, JSON.stringify({ ch: this.ch, rev0: this.rev0 })); } catch (e) {} this.subs.forEach((f) => f()); },
  get n() { return this.list().length; },
  list() {
    return Object.keys(this.ch).map((k) => { const p = k.split("|"); return { gid: p[0], tier: p[1], mid: p[2], op: this.ch[k] }; })
      .filter((c) => (c.op === "add") !== this.baseHas(c.gid, c.tier, c.mid)); // a colleague already made it true
  },
  baseHas(gid, tier, mid) { const g = oncallStore.groups.find((x) => x.id === gid); return !!g && ((g.tiers && g.tiers[tier]) || []).includes(mid); },
  state(gid, tier, mid) { const op = this.ch[gid + "|" + tier + "|" + mid]; return op && (op === "add") !== this.baseHas(gid, tier, mid) ? op : null; },
  _set(gid, tier, mid, op) {
    if (!this.n) this.rev0 = oncallStore.data.rev || 0;
    const k = gid + "|" + tier + "|" + mid;
    if ((op === "add") === this.baseHas(gid, tier, mid)) delete this.ch[k]; else this.ch[k] = op;
  },
  // one escalation level per person in a group: adding to a level takes them off the other one
  add(gid, tier, mid) {
    if (OC_ESC.includes(tier)) { const g = ocViewGroup(gid); OC_ESC.forEach((t) => { if (t !== tier && g && (g.tiers[t] || []).includes(mid)) this._set(gid, t, mid, "remove"); }); }
    this._set(gid, tier, mid, "add"); this.emit();
  },
  remove(gid, tier, mid) { this._set(gid, tier, mid, "remove"); this.emit(); },
  move(gid, from, to, mid) { this._set(gid, from, mid, "remove"); this.add(gid, to, mid); },
  // undoing a struck-through name that was MOVED also cancels where it moved to
  undo(gid, tier, mid) {
    delete this.ch[gid + "|" + tier + "|" + mid];
    OC_LEVELS.forEach((t) => { if (t !== tier && this.ch[gid + "|" + t + "|" + mid] === "add") delete this.ch[gid + "|" + t + "|" + mid]; });
    this.emit();
  },
  discard() { this.ch = {}; this.emit(); },
  apply(groups) {
    const ch = this.list(); if (!ch.length) return groups;
    return groups.map((g) => {
      const mine = ch.filter((c) => c.gid === g.id); if (!mine.length) return g;
      const t = {}; Object.keys(g.tiers || {}).forEach((k) => { t[k] = (g.tiers[k] || []).slice(); });
      mine.filter((c) => c.op === "remove").forEach((c) => { t[c.tier] = (t[c.tier] || []).filter((x) => x !== c.mid); });
      mine.filter((c) => c.op === "add").forEach((c) => { const l = t[c.tier] || (t[c.tier] = []); if (!l.includes(c.mid)) l.push(c.mid); });
      return Object.assign({}, g, { tiers: t });
    });
  },
  save(at) {
    const changed = (oncallStore.data.rev || 0) !== this.rev0;
    const by = oncallStore.data.savedBy, when = oncallStore.data.savedAt;
    const n = this.n;
    const res = oncallStore.commit(this.list(), at);
    this.ch = {}; this.emit();
    return Object.assign({ n: n, changed: changed, by: by, when: when }, res);
  },
};
function ocView() { return ocDraft.apply(oncallStore.groups); }
function ocViewGroup(gid) { return ocView().find((g) => g.id === gid) || null; }
function useOcDraft() { const [, f] = React.useReducer((x) => x + 1, 0); React.useEffect(() => ocDraft.sub(f), []); return ocDraft; }
// a saved list follows the store; an open draft must not be lost to a reload or a closed tab
try { const r = JSON.parse(sessionStorage.getItem(OC_DRAFT_SS)); if (r && r.ch) { ocDraft.ch = r.ch; ocDraft.rev0 = r.rev0 || 0; } } catch (e) {}

// required levels the draft leaves empty — only in groups the draft TOUCHES: a level that was
// already empty before you started is the Coverage card's business, not a reason to block
// an unrelated save
function ocDraftProblems() {
  const touched = new Set(ocDraft.list().map((c) => c.gid));
  const out = [];
  ocView().filter((g) => g.enabled && touched.has(g.id)).forEach((g) => OC_LEVELS.forEach((t) => { if (ocRequired(g, t) && !((g.tiers && g.tiers[t]) || []).length) out.push(g.name + " · " + ocTierLabel(t)); }));
  return out;
}
// the draft as sentences: remove + add of one name in one group reads as a move
function ocDraftLines() {
  const ch = ocDraft.list();
  const gname = (id) => (oncallStore.groups.find((g) => g.id === id) || {}).name || "Deleted group";
  const out = [];
  ch.filter((c) => c.op === "add").forEach((c) => {
    const from = ch.find((r) => r.op === "remove" && r.gid === c.gid && r.mid === c.mid);
    out.push({ c: c, icon: from ? "arrow-right-left" : "plus", t: from ? ocMember(c.mid).name + ": " + ocTierLabel(from.tier) + " → " + ocTierLabel(c.tier) : ocMember(c.mid).name + " added to " + ocTierLabel(c.tier), g: gname(c.gid), undo: () => (from ? ocDraft.undo(c.gid, from.tier, c.mid) : ocDraft.remove(c.gid, c.tier, c.mid)) });
  });
  ch.filter((c) => c.op === "remove" && !ch.some((a) => a.op === "add" && a.gid === c.gid && a.mid === c.mid)).forEach((c) => out.push({ c: c, icon: "minus", t: ocMember(c.mid).name + " removed from " + ocTierLabel(c.tier), g: gname(c.gid), undo: () => ocDraft.undo(c.gid, c.tier, c.mid) }));
  return out;
}
function ocHHMM(ms) { const d = new Date(ms); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

// ── a name on a level ──
function OcContactIcon({ mid }) {
  const c = ocContactOfId(mid), m = c && ocContactMeta(c.via);
  return <span className="oc-pc-ic" title={m ? m.label + " · " + c.to : "No contact"}><Icon name={m ? m.icon : "user"} size={14} /></span>;
}
const OcFindCtxD = window.OcFindCtx || (window.OcFindCtx = React.createContext(""));
function OcPChip({ g, tier, mid, st, editable }) {
  const [el, setEl] = React.useState(null);
  const m = ocMember(mid);
  const fq = React.useContext(OcFindCtxD);
  const fh = !!fq && m.name.toLowerCase().includes(fq);
  return (
    <span className={"oc-pc" + (st ? " " + st : "") + (fh ? " find-hit" : "")} title={st === "add" ? "Added · not saved yet" : st === "remove" ? "Removed · not saved yet" : undefined}>
      <OcContactIcon mid={mid} />
      <span className="oc-pc-n" title={m.name}>{m.name}</span>
      {st === "remove"
        ? <button className="oc-chip-x" title="Undo" aria-label={"Undo removing " + m.name} onClick={() => ocDraft.undo(g.id, tier, mid)}><Icon name="undo-2" size={14} /></button>
        : editable
          ? <button className={"oc-pc-lv" + (el ? " on" : "")} title="Move to another level, or remove" aria-label={"Change level for " + m.name} aria-haspopup="menu" onClick={(e) => { const t = e.currentTarget; setEl((x) => (x ? null : t)); }}><Icon name="chevron-down" size={14} /></button>
          : <span className="oc-chip-lock" title="Only a Supervisor can change Priority 3"><Icon name="lock" size={13} /></span>}
      {window.ShiftBadge && <window.ShiftBadge id={mid} />}
      {el && <OcLevelMenu anchor={el} g={g} tier={tier} mid={mid} onClose={() => setEl(null)} />}
    </span>
  );
}
// the dropdown operators already use: pick a level and the name jumps there
function OcLevelMenu({ anchor, g, tier, mid, onClose }) {
  const Pop = window.OclPop;
  const go = (to) => { if (to !== tier) ocDraft.move(g.id, tier, to, mid); onClose(); };
  return (
    <Pop anchor={anchor} onClose={onClose} width={220}>
      <div className="oc-lvm" role="menu">
        {OC_LEVELS.map((t) => {
          const on = t === tier, lock = !ocCanEdit(t), there = !on && ((g.tiers && g.tiers[t]) || []).includes(mid);
          return (
            <button key={t} role="menuitemradio" aria-checked={on} className={"oc-lvm-i" + (on ? " on" : "")} disabled={lock || there} onClick={() => go(t)} title={lock ? "Only a Supervisor can change Priority 3" : there ? "Already on " + ocTierLabel(t) : undefined}>
              <span className="oc-lvm-c">{on && <Icon name="check" size={14} />}</span>{ocTierLabel(t)}
              {lock && <Icon name="lock" size={12} />}{there && <span className="oc-lvm-s">Already</span>}
            </button>
          );
        })}
        <div className="oc-lvm-sep" />
        <button role="menuitem" className="oc-lvm-i rm" onClick={() => { ocDraft.remove(g.id, tier, mid); onClose(); }}><span className="oc-lvm-c"><Icon name="x" size={14} /></span>Remove</button>
      </div>
    </Pop>
  );
}
// Add: everyone reachable. Someone already on another level of this group is listed WITH that
// level and picking them moves them — the same jump as the dropdown.
function OcPickPop({ anchor, g, tier, onClose }) {
  const Pop = window.OclPop;
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const here = (g.tiers && g.tiers[tier]) || [];
  const where = (mid) => (tier === "b247" ? null : OC_ESC.find((t) => t !== tier && ((g.tiers && g.tiers[t]) || []).includes(mid)));
  const list = ocRoster().filter((m) => !here.includes(m.id) && (!ql || m.name.toLowerCase().includes(ql)));
  const phones = list.filter((m) => m.kind === "phone"), people = list.filter((m) => m.kind !== "phone");
  const noContact = ocRosterAll().filter((m) => m.kind === "person" && !m.inactive && !m.contact).length;
  const row = (m) => {
    const w = where(m.id), lock = w && !ocCanEdit(w);
    const also = window.njOcAlsoOn ? window.njOcAlsoOn(m.id, g, tier) : [];
    return (
      <button key={m.id} className="oc-menu-item dl-menu-item" disabled={lock} onClick={() => { ocDraft.add(g.id, tier, m.id); onClose(); }}>
        <OcContactIcon mid={m.id} /> <span className="oc-menu-name">{m.name}</span>
        {w ? <span className="oc-menu-role">On {ocTierLabel(w)} · moves</span> : m.role && <span className="oc-menu-role">{m.role}</span>}
        {also.length > 0 && <span className="dl-also"><Icon name="alert-triangle" size={12} /> Also {also.map((x) => ocTierLabel(x.tier) + " · " + x.g.name).join(", ")}</span>}
      </button>
    );
  };
  return (
    <Pop anchor={anchor} onClose={onClose} width={300}>
      <div className="dl-pop-h">Add to {g.name} · {ocTierLabel(tier)}</div>
      <div className="oc-menu-search"><Icon name="search" size={16} color="var(--slate-400)" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipients…" /></div>
      <div className="oc-menu-list dl-pop-list">
        {phones.length > 0 && <div className="oc-menu-grp">Duty phones</div>}
        {phones.map(row)}
        {people.length > 0 && <div className="oc-menu-grp">People</div>}
        {people.map(row)}
        {!list.length && <NjInline>{ql ? "No one matches “" + q.trim() + "”." : "Everyone is already on this level."}</NjInline>}
      </div>
      {noContact > 0 && <div className="dl-left oc-pick-foot"><Icon name="info" size={12} /><span className="oc-pick-t">{noContact + (noContact === 1 ? " person has no phone or email and is" : " people have no phone or email and are") + " not listed. Add a contact under Users."}</span></div>}
    </Pop>
  );
}
// one level of one group: used by the Duty list cell, the group card column and the 24/7 row
function OcLevelList({ g, tier, dense, row }) {
  useOcDraft();
  const [el, setEl] = React.useState(null);
  const ids = (g.tiers && g.tiers[tier]) || [];
  const removed = ocDraft.list().filter((c) => c.gid === g.id && c.tier === tier && c.op === "remove").map((c) => c.mid);
  const editable = ocCanEdit(tier);
  const req = ocRequired(g, tier);
  const pend = oncallStore.pending.filter((x) => x.gid === g.id && x.tier === tier);
  return (
    <div className={"oc-lv" + (dense ? " dense" : "") + (row ? " row" : "")}>
      {ids.map((id) => <OcPChip key={id} g={g} tier={tier} mid={id} st={ocDraft.state(g.id, tier, id)} editable={editable} />)}
      {removed.map((id) => <OcPChip key={"r" + id} g={g} tier={tier} mid={id} st="remove" editable={editable} />)}
      {pend.map((x) => (
        <span key={x.id} className={"oc-pc plan " + x.op} title={(x.op === "add" ? "Joins " : "Leaves ") + njOcFmtAt(x.at)}>
          <Icon name="calendar-clock" size={14} />
          <span className="oc-pc-b"><span className="oc-pc-n">{ocMember(x.mid).name}</span><span className="oc-pc-when">{x.op === "add" ? "from " : "leaves "}{njOcFmtAt(x.at)}</span></span>
          {editable && <button className="oc-chip-x" title="Cancel planned change" onClick={() => window.oclCancel && window.oclCancel(x.id)}><Icon name="x" size={14} /></button>}
        </span>
      ))}
      {!ids.length && !removed.length && !pend.length && <span className={"oc-tier-empty" + (req ? " req" : "")}>{req ? "Required · no one" : dense ? "—" : "No one assigned"}</span>}
      {editable && <button className="member-add oc-lv-add" onClick={(e) => { const t = e.currentTarget; setEl((x) => (x ? null : t)); }}><Icon name="plus" size={14} /> Add</button>}
      {el && <OcPickPop anchor={el} g={g} tier={tier} onClose={() => setEl(null)} />}
    </div>
  );
}

// ── the save bar ── appears only while there are unsaved changes, in the duty-list window and
// under the Settings list. Shows what will change, who saved meanwhile, and what blocks Save.
function OcSaveBar({ className }) {
  const d = useOcDraft();
  const store = window.useOncall();
  const [w, set] = React.useState(() => ({ mode: "now", date: window.oclNextMonday ? window.oclNextMonday() : "", time: "07:00" }));
  const setW = (p) => set((s) => Object.assign({}, s, p));
  const [listEl, setListEl] = React.useState(null);
  const n = d.n;
  // ALWAYS rendered: a bar that appears on the first edit pushed the page around. At rest it
  // says what is saved and by whom, with Save disabled.
  if (!n) return (
    <div className={"oc-savebar idle " + (className || "")} role="region" aria-label="On-call changes">
      <div className="oc-sb-l"><span className="oc-sb-n idle"><Icon name="check" size={14} /><span>No unsaved changes</span>{store.data.savedBy && store.data.savedAt ? <span className="oc-sb-meta">Last saved by {store.data.savedBy} at {ocHHMM(store.data.savedAt)}</span> : null}</span></div>
      <div className="oc-sb-r"><OcSaveWhen w={{ mode: "now" }} setW={() => {}} disabled /><button className="btn btn-secondary btn-sm" disabled>Discard</button><button className="btn btn-primary btn-sm" disabled><Icon name="check" size={14} /> Save</button></div>
    </div>
  );
  const probs = ocDraftProblems();
  const stale = (store.data.rev || 0) !== d.rev0;
  const bad = window.oclAtBad ? window.oclAtBad(w) : false;
  const at = w.mode === "later" && window.oclAt ? window.oclAt(w) : null;
  const save = () => {
    const r = ocDraft.save(at);
    const head = (at ? "Planned " : "Saved ") + r.applied.length + (r.applied.length === 1 ? " change" : " changes") + (at ? " from " + njOcFmtAt(at) : "") + ".";
    if (r.skipped.length) openDialog(<OcSaveReport r={r} head={head} />);
    else njToast(head + (r.changed && r.by ? " " + r.by + " had saved at " + ocHHMM(r.when) + "; yours were added on top." : ""));
  };
  const discard = () => openDialog(<ConfirmDialog title="Discard changes" danger icon="undo-2" message={"Discard " + n + " unsaved " + (n === 1 ? "change" : "changes") + "?"} detail="Paging groups go back to what is saved." confirmLabel="Discard" onConfirm={() => ocDraft.discard()} />);
  return (
    <div className={"oc-savebar " + (className || "")} role="region" aria-label="Unsaved on-call changes">
      <div className="oc-sb-l">
        <button className="oc-sb-n" onClick={(e) => { const t = e.currentTarget; setListEl((x) => (x ? null : t)); }} aria-expanded={!!listEl}>
          <span className="oc-sb-dot" /><span><b className="data">{n}</b> unsaved {n === 1 ? "change" : "changes"}</span><Icon name={listEl ? "chevron-up" : "chevron-down"} size={14} />
        </button>
        {probs.length > 0 ? <span className="oc-sb-err" title={"Required and empty: " + probs.join(", ")}><Icon name="alert-triangle" size={14} /><span className="oc-sb-t">Required and empty: {probs.join(", ")}</span></span>
          : stale && store.data.savedBy ? <span className="oc-sb-note" title={store.data.savedBy + " saved at " + ocHHMM(store.data.savedAt) + " since you started. Yours go on top."}><Icon name="users" size={14} /><span className="oc-sb-t">{store.data.savedBy} saved at {ocHHMM(store.data.savedAt)} since you started. Yours go on top.</span></span> : null}
      </div>
      <div className="oc-sb-r">
        <OcSaveWhen w={w} setW={setW} />
        <button className="btn btn-secondary btn-sm" onClick={discard}>Discard</button>
        <button className="btn btn-primary btn-sm" disabled={probs.length > 0 || bad} title={probs.length ? "A required level is empty" : undefined} onClick={save}><Icon name={at ? "calendar-clock" : "check"} size={14} /> {at ? "Plan" : "Save"}</button>
      </div>
      {listEl && window.OclPop && (
        <window.OclPop anchor={listEl} onClose={() => setListEl(null)} width={360}>
          <div className="dl-pop-h">Unsaved changes</div>
          <div className="dl-pend-list">
            {probs.map((p) => <div className="dl-pend-row oc-sb-prob" key={p}><Icon name="alert-triangle" size={14} /><span className="dl-pend-w">Required and empty<span className="dl-sub">{p}</span></span></div>)}
            {ocDraftLines().map((l, i) => (
              <div className="dl-pend-row" key={i}>
                <Icon name={l.icon} size={14} color="var(--slate-400)" />
                <span className="dl-pend-w">{l.t}<span className="dl-sub">{l.g}</span></span>
                <button className="oc-chip-x" title="Undo this change" onClick={l.undo}><Icon name="undo-2" size={14} /></button>
              </div>
            ))}
          </div>
        </window.OclPop>
      )}
    </div>
  );
}
// Now | Later for the save bar: ONE row. The date/time box opens to the LEFT of the segment
// (row-reverse), so the right-anchored Now|Later, Discard and Save never move when toggled.
function OcSaveWhen({ w, setW, disabled }) {
  const later = w.mode === "later";
  const bad = later && window.oclAtBad && window.oclAtBad(w);
  return (
    <div className={"oc-sw" + (disabled ? " dis" : "")}>
      <div className="oc-sw-seg" role="radiogroup" aria-label="Takes effect">
        <button type="button" role="radio" aria-checked={!later} className={!later ? "on" : ""} disabled={disabled} onClick={() => setW({ mode: "now" })}>Now</button>
        <button type="button" role="radio" aria-checked={later} className={later ? "on" : ""} disabled={disabled} onClick={() => setW({ mode: "later" })}>Later</button>
      </div>
      <div className={"oc-sw-dt" + (later ? "" : " off") + (bad ? " bad" : "")} aria-hidden={!later} title={bad ? "Pick a time in the future" : undefined}>
        <Icon name="calendar-clock" size={14} />
        <input type="date" value={w.date || ""} tabIndex={later ? 0 : -1} onChange={(e) => setW({ date: e.target.value })} aria-label="Date the changes take effect" />
        <input type="time" value={w.time || ""} tabIndex={later ? 0 : -1} onChange={(e) => setW({ time: e.target.value })} aria-label="Time the changes take effect" />
      </div>
    </div>
  );
}
function OcSaveReport({ r, head }) {
  const gname = (id) => (oncallStore.groups.find((g) => g.id === id) || {}).name || "Deleted group";
  return (
    <Dialog width={520}>
      <DlgHeader icon="info" name="Saved, with exceptions" onClose={closeDialog} />
      <div className="dlg-body">
        <p className="oc-mininfo">{head}{r.changed && r.by ? " " + r.by + " saved the list at " + ocHHMM(r.when) + " while you were editing; your changes were applied on top." : ""} {r.skipped.length} {r.skipped.length === 1 ? "change no longer applied" : "changes no longer applied"}:</p>
        <div className="dl-pend-list">
          {r.skipped.map((x, i) => (
            <div className="dl-pend-row" key={i}>
              <Icon name="minus-circle" size={14} color="var(--slate-400)" />
              <span className="dl-pend-w">{(x.c.op === "add" ? "Add " : "Remove ") + ocMember(x.c.mid).name + " · " + ocTierLabel(x.c.tier)}<span className="dl-sub">{gname(x.c.gid)} · {x.why}</span></span>
            </div>
          ))}
        </div>
      </div>
      <div className="dlg-foot"><button className="btn btn-secondary" onClick={closeDialog}>Close</button></div>
    </Dialog>
  );
}

// ── On-call settings ── everything set once for the SITE, not for a person or a group: escalation
// timing, personal shifts, the duty phones it actually has, the UHF sender, and the 24/7 rule.
// It used to be four buttons in the page toolbar (Resend, Upscale, Personal shifts, Site channels).
function useOcSettingsForm(onDone) {
  const s0 = ocSite();
  const [s, setS] = React.useState(() => JSON.parse(JSON.stringify(s0)));
  const p0 = oncallStore.policy || {};
  const [pol, setPol] = React.useState(() => ({ resendMin: p0.resendMin, upscaleAfter: p0.upscaleAfter, personalShifts: !!p0.personalShifts }));
  const setP = (k, v) => setPol((x) => Object.assign({}, x, { [k]: v }));
  const numBad = (v, lo, hi) => !(Number.isInteger(+v) && +v >= lo && +v <= hi);
  const polBad = numBad(pol.resendMin, 1, 60) || numBad(pol.upscaleAfter, 1, 10);
  const setPhone = (i, p) => setS((x) => Object.assign({}, x, { phones: x.phones.map((y, j) => (j === i ? Object.assign({}, y, p) : y)) }));
  const addPhone = () => setS((x) => { let k = 1; while (x.phones.some((p) => p.id === "vt" + k)) k++; return Object.assign({}, x, { phones: x.phones.concat([{ id: "vt" + k, name: "Duty phone " + k, number: "", via: "sms" }]) }); });
  const delPhone = (i) => setS((x) => Object.assign({}, x, { phones: x.phones.filter((_, j) => j !== i) }));
  const kept = new Set(s.phones.filter((p) => p.number.trim()).map((p) => p.id));
  const offList = s0.phones.filter((p) => !kept.has(p.id)).map((p) => ({ p: p, on: window.njPagedFor ? window.njPagedFor(p.id) : [] })).filter((x) => x.on.length);
  const save = () => {
    if (polBad) return;
    oncallStore.setSite(Object.assign({}, s, { phones: s.phones.map((p) => Object.assign({}, p, { number: p.number.trim(), name: p.name.trim() || p.id })) }));
    const np = { resendMin: +pol.resendMin, upscaleAfter: +pol.upscaleAfter, personalShifts: pol.personalShifts };
    if (window.njOcLog && (np.resendMin !== p0.resendMin || np.upscaleAfter !== p0.upscaleAfter)) window.njOcLog.add("Escalation changed", "Resend every " + np.resendMin + " min · upscale after " + np.upscaleAfter + " tries");
    if (window.njOcLog && np.personalShifts !== !!p0.personalShifts) window.njOcLog.add(np.personalShifts ? "Personal duty shifts turned on" : "Personal duty shifts turned off", np.personalShifts ? "A name is reachable where the group's window and their shift overlap" : "A name is reachable for the whole of the group's window");
    oncallStore.setPolicy(np);
    onDone(); njToast("On-call settings saved.");
  };
  const body = (
      <div className="oc-editor">
        <div className="oc-ed-sec">
          <span className="oc-field-l">Escalation</span>
          <p className="oc-mininfo">An unacknowledged alarm is sent again at this interval, and moves to the next priority level after this many tries.</p>
          <div className="oc-esc-row">
            <label className="oc-field"><span className="oc-min-l">Resend every</span><span className="oc-num-w"><input type="number" className="oos-input data oc-num" min="1" max="60" value={pol.resendMin} onChange={(e) => setP("resendMin", e.target.value)} /><span className="u">min</span></span></label>
            <label className="oc-field"><span className="oc-min-l">Upscale priority after</span><span className="oc-num-w"><input type="number" className="oos-input data oc-num" min="1" max="10" value={pol.upscaleAfter} onChange={(e) => setP("upscaleAfter", e.target.value)} /><span className="u">tries</span></span></label>
          </div>
          {polBad && <p className="oc-chan-rule"><Icon name="alert-triangle" size={14} color="var(--warning-text)" /> Resend is 1–60 min, upscale is 1–10 tries.</p>}
        </div>
        <div className="oc-ed-sec">
          <span className="oc-field-l">Duty phones</span>
          <p className="oc-mininfo">Separate handsets that are handed over between shifts. Add as many as the site has. A phone without a number is not listed for on-call.</p>
          <div className="oc-site-phones">
            {s.phones.map((p, i) => (
              <div className="oc-site-ph" key={p.id}>
                <Icon name="smartphone" size={16} color="var(--slate-400)" />
                <input className="oos-input" value={p.name} onChange={(e) => setPhone(i, { name: e.target.value })} aria-label="Phone name" />
                <input className="oos-input data" value={p.number} onChange={(e) => setPhone(i, { number: e.target.value })} placeholder="+47 …" aria-label="Phone number" />
                <select className="nj-select" value={p.via || "sms"} onChange={(e) => setPhone(i, { via: e.target.value })} aria-label="Contact">
                  {OC_CONTACTS.filter((c) => c.id !== "email").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <button className="icon-btn" title="Remove phone" onClick={() => delPhone(i)}><Icon name="trash-2" size={16} /></button>
              </div>
            ))}
            {<button className="member-add" onClick={addPhone}><Icon name="plus" size={14} /> Add duty phone</button>}
          </div>
          {offList.map((x) => <p key={x.p.id} className="oc-chan-rule"><Icon name="alert-triangle" size={14} color="var(--warning-text)" /> {x.p.name} is on {x.on.length} {x.on.length === 1 ? "list" : "lists"} ({Array.from(new Set(x.on.map((y) => y.g.name))).join(", ")}) and comes off when you save.</p>)}
        </div>
        <div className="oc-ed-sec">
          <span className="oc-field-l">UHF sender</span>
          <p className="oc-mininfo">One radio sender for the whole site, independent of the GSM dispatcher. It broadcasts alarms on the site channel, not to a person.</p>
          <div className="oc-site-uhf">
            <label className="oc-leg" {...njCheckable(() => setS((x) => Object.assign({}, x, { uhf: Object.assign({}, x.uhf, { on: !x.uhf.on }) })), { on: s.uhf.on, label: "UHF sender on" })}><Check on={s.uhf.on} /> On</label>
            <select className="nj-select" disabled={!s.uhf.on} value={s.uhf.minPriority} onChange={(e) => setS((x) => Object.assign({}, x, { uhf: Object.assign({}, x.uhf, { minPriority: e.target.value }) }))} aria-label="Alarms sent on UHF">
              {OC_PRIOS.map((p) => <option key={p.id} value={p.id}>{p.covers}</option>)}
            </select>
          </div>
          {!s.uhf.on && <p className="oc-chan-rule"><Icon name="alert-triangle" size={14} color="var(--warning-text)" /> Alarms leave on one path only. NS 9416 asks for two independent paths where the site is not staffed around the clock.</p>}
        </div>
        <div className="oc-ed-sec">
          <span className="oc-field-l">Coverage rule</span>
          <label className="oc-leg" {...njCheckable(() => setS((x) => Object.assign({}, x, { rule247: !x.rule247 })), { on: s.rule247, label: "Require all alarms around the clock" })}><Check on={s.rule247} /> All alarms must be on Priority 1 around the clock</label>
          <p className="oc-mininfo">Turn off for a site that is staffed around the clock, or that only pages part of its alarms. Coverage then stops flagging it.</p>
        </div>
        <div className="oc-ed-sec">
          <span className="oc-field-l">Personal shifts</span>
          <label className="oc-leg" {...njCheckable(() => setP("personalShifts", !pol.personalShifts), { on: pol.personalShifts, label: "Plan personal duty shifts" })}><Check on={pol.personalShifts} /> Plan personal duty shifts</label>
          <p className="oc-mininfo">Off: everyone on a group is reachable for its whole paging window. On: a name is reachable only where the window and their shift overlap, and a Personal shifts tab appears.</p>
        </div>
      </div>
  );
  return { body, save, bad: polBad };
}
// dialog form kept for pages without oncall-page.jsx; the Settings page opens the drawer
function OcSiteDialog() {
  const f = useOcSettingsForm(closeDialog);
  return (
    <Dialog width={600}>
      <DlgHeader icon="sliders-horizontal" name="On-call settings" onClose={closeDialog} />
      <div className="dlg-body">{f.body}</div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={f.bad} onClick={f.save}><Icon name="check" size={16} /> Save changes</button>
      </div>
    </Dialog>
  );
}
function openOcSite() { openDialog(<OcSiteDialog />); }

Object.assign(window, { ocDraft, ocView, ocViewGroup, useOcDraft, ocDraftProblems, OcLevelList, OcPChip, OcSaveBar, openOcSite, useOcSettingsForm });
