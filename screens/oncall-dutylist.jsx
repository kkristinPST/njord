// oncall-dutylist.jsx — the DUTY LIST (vaktliste): every on-call group as one editable table,
// in a floating window like the report viewer, so it stays open while you work.
//
// It is a VIEW over oncallStore, never a second model. It is the ONLY place names are edited
// (the Groups cards are gone): the group name opens the group drawer (oncall-page.jsx) for
// covers, area, window, pause, test, duplicate, delete. Rules carried from the customer's sheet:
//  · required levels never stand empty — the last name has a lock, not a remove
//  · Priority 3 is changed by a Supervisor only
//  · a person sits on one escalation level per group (the picker leaves the others out)
//  · every add and every remove asks WHEN in the same popover: Now, or from a date and time
//    (the Monday swap). There is no separate plan mode — one spot, one decision per change.
//  · all alarms held on Priority 1 around the clock is checked across the groups together
//
// Popovers are PORTALLED to <body> at a fixed position. Inside the scrolling table an absolute
// menu extended the scroll area, which is where the stray scrollbars came from.

const DWIN_LS = "nj_dutywin_v1";
const dutyWin = {
  open: false, min: false, pos: null, size: { w: 1120, h: 640 }, subs: new Set(),
  init() { try { const s = JSON.parse(localStorage.getItem(DWIN_LS)) || {}; if (s.pos) this.pos = s.pos; if (s.size) this.size = s.size; } catch (e) {} },
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); },
  persist() { try { localStorage.setItem(DWIN_LS, JSON.stringify({ pos: this.pos, size: this.size })); } catch (e) {} },
  show() { this.open = true; this.min = false; this.emit(); },
  close() { this.open = false; this.emit(); },
  toggleMin() { this.min = !this.min; this.emit(); },
};
dutyWin.init();
function useDutyWin() { const [, f] = React.useReducer((x) => x + 1, 0); React.useEffect(() => dutyWin.sub(f), []); return dutyWin; }
function openDutyList() { dutyWin.show(); }

// the clock for planned changes — same demo clock as the change log, so "Mon 07:00" means the
// facility's Monday. Checked on load and every 30 s.
function oclDutyNow() { return window.oclNow ? window.oclNow() : Date.now(); }
function oclTick() { if (window.oncallStore) window.oncallStore.applyDue(oclDutyNow()); }
setTimeout(oclTick, 0);
setInterval(oclTick, 30000);

function oclNextMonday() {
  const d = new Date(oclDutyNow()); const add = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + add);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// the last "Later" date/time is remembered for the session: a Monday swap is several changes
// in a row, and re-typing the same date for each one is how one of them lands on the wrong day
const oclWhenMemo = { mode: "now", date: null, time: "07:00" };
function oclAt(w) { if (w.mode === "now") return null; const t = new Date(w.date + "T" + (w.time || "00:00")).getTime(); return isNaN(t) ? NaN : t; }
function oclAtBad(w) { const t = oclAt(w); return w.mode === "later" && (!t || isNaN(t) || t <= oclDutyNow()); }

const OCL_TIERS = ["p1", "p2", "p3", "b247"];

// cancelling a planned add that a planned removal leans on: say so, and cancel both together.
// Cancelling the add alone would leave the removal to be skipped silently on the day.
function oclCancel(id) {
  const s = window.oncallStore;
  const c = s.pending.find((x) => x.id === id); if (!c) return;
  const deps = s.dependents(id);
  if (!deps.length) { s.cancelPlan(id); return; }
  const g = s.groups.find((x) => x.id === c.gid) || {};
  openDialog(<ConfirmDialog title="Cancel planned change" danger icon="calendar-x"
    message={"Cancel adding " + ocMember(c.mid).name + " from " + njOcFmtAt(c.at) + "?"}
    detail={deps.map((d) => "The removal of " + ocMember(d.mid).name + " from " + njOcFmtAt(d.at)).join("; ") + " depends on it: " + (g.name || "the group") + " · " + ocTierLabel(c.tier) + " is required and would be empty. Both are cancelled together."}
    confirmLabel="Cancel both" onConfirm={() => { deps.forEach((d) => s.cancelPlan(d.id)); s.cancelPlan(id); njToast("Cancelled " + (deps.length + 1) + " planned changes."); }} />);
}
function OclAlso({ mid, g, tier }) {
  const also = window.njOcAlsoOn ? window.njOcAlsoOn(mid, g, tier) : [];
  if (!also.length) return null;
  const t = also.map((x) => ocTierLabel(x.tier) + " · " + x.g.name).join(", ");
  return <span className="dl-also" title={"Also on " + t + " at overlapping hours"}><Icon name="alert-triangle" size={12} /> Also {t}</span>;
}

// ── portalled popover ──
function OclPop({ anchor, onClose, width = 280, children }) {
  const ref = React.useRef(null);
  const [st, setSt] = React.useState({ left: -9999, top: -9999 });
  React.useLayoutEffect(() => {
    const place = () => {
      const a = anchor && anchor.getBoundingClientRect(); const el = ref.current; if (!a || !el) return;
      const W = window.innerWidth, H = window.innerHeight, h = el.offsetHeight;
      const left = Math.max(8, Math.min(a.left, W - width - 8));
      const below = a.bottom + 4, above = a.top - 4 - h;
      setSt({ left, top: below + h <= H - 8 || above < 8 ? Math.max(8, Math.min(below, H - h - 8)) : above });
    };
    place();
    const ro = new ResizeObserver(place); if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", place); document.addEventListener("scroll", place, true);
    return () => { ro.disconnect(); window.removeEventListener("resize", place); document.removeEventListener("scroll", place, true); };
  }, [anchor]);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && !(anchor && anchor.contains(e.target))) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);
  return ReactDOM.createPortal(<div className="dl-pop" ref={ref} style={{ left: st.left, top: st.top, width }}>{children}</div>, document.body);
}

// ── when: now, or from a date and time ──
function OclWhen({ w, setW }) {
  const bad = oclAtBad(w);
  return (
    <div className="dl-when-row">
      <span className="dl-when-l">When</span>
      <div className="segmented dl-when-seg">
        <button className={"seg" + (w.mode === "now" ? " active" : "")} onClick={() => setW({ mode: "now" })}>Now</button>
        <button className={"seg" + (w.mode === "later" ? " active" : "")} onClick={() => setW({ mode: "later" })}>Later</button>
      </div>
      {w.mode === "later" && (
        <div className="dl-when-dt">
          <input type="date" className="oos-input dl-dt" value={w.date} onChange={(e) => setW({ date: e.target.value })} aria-label="Date the change takes effect" />
          <input type="time" className="oos-input dl-dt" value={w.time} onChange={(e) => setW({ time: e.target.value })} aria-label="Time the change takes effect" />
        </div>
      )}
      {w.mode === "later" && bad && <span className="dl-when-bad"><Icon name="alert-triangle" size={12} /> Pick a time in the future</span>}
    </div>
  );
}
function useOclWhen() {
  // When always opens on Now (a remembered Later made the next quick fix a silent plan); the
  // Later date and time ARE remembered, so a Monday batch is still one date typed once.
  const [w, set] = React.useState(() => Object.assign({}, oclWhenMemo, { mode: "now", date: oclWhenMemo.date || oclNextMonday() }));
  const setW = (p) => set((s) => { const n = Object.assign({}, s, p); Object.assign(oclWhenMemo, n); return n; });
  return [w, setW];
}

// one cell = one level of one group, drawn from the DRAFT view (screens/oncall-draft.jsx):
// chips with a level dropdown, Add, and struck-through removals until Save.
function OclCell({ g, tier }) {
  const req = ocRequired(g, tier);
  const empty = !((g.tiers && g.tiers[tier]) || []).length;
  return (
    <td className={"dl-td" + (req && empty ? " dl-td-req" : "")}>
      <div className="dl-cell">
        {req && !empty && <span className="dl-req-tag" title="Save is refused while this level is empty">Required</span>}
        {window.OcLevelList && <window.OcLevelList g={g} tier={tier} dense />}
      </div>
    </td>
  );
}

// Find person: chips that match are marked (OcPChip reads this), rows without them are dimmed
const OcFindCtx = window.OcFindCtx || (window.OcFindCtx = React.createContext(""));
function oclRowNames(g) {
  const ids = new Set();
  OCL_TIERS.forEach((t) => ((g.tiers && g.tiers[t]) || []).forEach((id) => ids.add(id)));
  window.oncallStore.pending.forEach((x) => { if (x.gid === g.id) ids.add(x.mid); });
  return Array.from(ids).map((id) => ocMember(id).name.toLowerCase());
}
function OcDutyList({ find = "", flash, page }) {
  const store = window.useOncall();
  if (window.useShifts) window.useShifts();
  if (window.useOcDraft) window.useOcDraft();
  // the row state (paging now / from 15:00) follows the demo clock
  const [, tick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { const t = setInterval(tick, 30000); return () => clearInterval(t); }, []);
  const now = oclDutyNow();
  const groups = window.ocView ? window.ocView() : store.groups;
  const p3Locked = !ocCanEdit("p3");
  const fq = find.trim().toLowerCase();
  const hit = (g) => !fq || oclRowNames(g).some((n) => n.includes(fq));
  const nHit = groups.filter(hit).length;
  // the drawer edits the SAVED group; the row shows the draft view
  const open = (g) => window.openOnCallEditor && window.openOnCallEditor(store.groups.find((x) => x.id === g.id) || g);
  return (
    <OcFindCtx.Provider value={fq}>
      <table className="tbl dl-tbl">
        <colgroup><col className="dl-c-duty" /><col className="dl-c-ag" /><col className="dl-c-win" /><col /><col /><col /><col /></colgroup>
        <thead>
          <tr>
            <th>DUTY</th><th>ALARM GROUP</th><th>PAGING WINDOW</th>
            <th title="Paged first. Unacknowledged alarms escalate to Priority 2, then 3">PRIORITY 1</th><th title="Paged when Priority 1 has not acknowledged">PRIORITY 2</th>
            <th title="Only a Supervisor can change Priority 3"><span className="dl-th-i">PRIORITY 3 <Icon name="lock" size={12} /></span></th>
            <th title="Reached for this group's alarms at every hour, whatever the paging window">24/7</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const st = window.ocWinState ? window.ocWinState(g, now) : { kind: g.enabled ? "live" : "off" };
            const cls = [g.enabled ? "" : "dl-row-off", st.kind === "idle" || st.kind === "none" ? "dl-row-idle" : "", fq && !hit(g) ? "dl-row-miss" : "", flash && flash.indexOf(g.id) >= 0 ? "dl-row-flash" : ""].filter(Boolean).join(" ");
            return (
            <tr key={g.id} data-oc-id={g.id} className={cls}>
              <td><div className="dl-duty-row"><button className={"oc-switch dl-sw" + (g.enabled ? " on" : "")} role="switch" aria-checked={g.enabled} aria-label={"Paging " + g.name} disabled={!ocCanPause()} title={!ocCanPause() ? "Pausing a group needs the Pause & Resume Groups permission" : g.enabled ? "Paging · click to pause" : "Paused · click to resume"} onClick={() => window.ocTogglePause ? window.ocTogglePause(g.id) : store.toggle(g.id)}><span className="oc-switch-knob" /></button><button className="dl-duty dl-duty-btn" title={(g.desc ? g.desc + " · " : "") + "Open group settings"} onClick={() => open(g)}><span>{g.name}</span><Icon name="chevron-right" size={14} /></button></div>{window.OcWinBadge && <window.OcWinBadge st={st} />}</td>
              <td><div className="dl-ag"><span className="oc-cover-dot" style={{ background: ocPrioColor(g.minPriority) }} /> {ocPrio(g.minPriority).covers}</div><div className="dl-sub">{ocAreaSummary(g)}</div></td>
              <td>{ocSchedLines(g).map((l, i) => <div key={i} className="dl-win-l">{l}</div>)}</td>
              {OCL_TIERS.map((t) => <OclCell key={t} g={g} tier={t} />)}
            </tr>
            );
          })}
          {!groups.length && <tr><td colSpan={7}>{page && window.NjEmpty
            ? <NjEmpty size="card" icon="phone-off" title="No on-call groups yet" body="A group sets which alarms are sent, when, and to whom in what order." action={<button className="btn btn-primary btn-sm" onClick={() => window.openOnCallEditor(null)}><Icon name="plus" size={14} /> New group</button>} />
            : <span className="ocr-empty">No on-call groups yet. Create one with New group under Settings · On-call.</span>}</td></tr>}
          {fq && groups.length > 0 && !nHit && <tr><td colSpan={7}><span className="ocr-empty">No one matching “{find.trim()}” is in a paging group.</span></td></tr>}
        </tbody>
      </table>
      {p3Locked && <p className="dl-cap"><Icon name="lock" size={12} /> Priority 3 is changed by a Supervisor.</p>}
    </OcFindCtx.Provider>
  );
}

// every planned change in one list, soonest first — the toolbar chip opens it
function OclPendingPop({ anchor, onClose }) {
  const store = window.useOncall();
  const list = store.pending.slice().sort((a, b) => a.at - b.at);
  const gname = (id) => (store.groups.find((g) => g.id === id) || {}).name || "Deleted group";
  return (
    <OclPop anchor={anchor} onClose={onClose} width={360}>
      <div className="dl-pop-h">Planned changes</div>
      <div className="dl-pend-list">
        {list.map((c) => (
          <div className="dl-pend-row" key={c.id}>
            <span className="dl-pend-at data">{njOcFmtAt(c.at)}</span>
            <span className="dl-pend-w"><b>{c.op === "add" ? "Add" : "Remove"}</b> {ocMember(c.mid).name}<span className="dl-sub">{gname(c.gid)} · {ocTierLabel(c.tier)}</span></span>
            {ocCanEdit(c.tier) ? <button className="oc-chip-x" title="Cancel" onClick={() => oclCancel(c.id)}><Icon name="x" size={14} /></button> : <span className="oc-chip-lock" title="Only a Supervisor can change Priority 3"><Icon name="lock" size={13} /></span>}
          </div>
        ))}
        {!list.length && <div className="dl-pend-none">Nothing planned yet.</div>}
      </div>
      <div className="dl-pend-how"><Icon name="calendar-plus" size={14} /><span>To plan changes, make them on the list, choose <b>Later</b> beside Save, and save. They apply together at that time.</span></div>
    </OclPop>
  );
}

// status + Planned + Change log. ONE toolbar, used by the floating window and the Settings tab,
// so the two surfaces can never disagree about what the duty list can do.
function OclToolbar({ className, noStatus, popout }) {
  const store = window.useOncall();
  if (window.usePerms) window.usePerms();
  const [pendEl, setPendEl] = React.useState(null);
  if (window.useOcDraft) window.useOcDraft();
  const view = window.ocView ? window.ocView() : store.groups;
  const rule = window.ocSite ? window.ocSite().rule247 : true;
  const aa = window.njAllAlarmsCover ? window.njAllAlarmsCover(view) : { groups: [], gaps: [] };
  const aaOk = aa.groups.length && !aa.gaps.length;
  const nPend = store.pending.length;
  return (
    <div className={className}>
      {noStatus ? null : !rule ? <span className="dl-status off" title="Turned off for this site under On-call settings"><Icon name="shield" size={16} /> Round-the-clock check off</span> :
      <span className={"dl-status " + (aaOk ? "ok" : "crit")} title="All alarms must be held by someone on Priority 1 at every hour of the week">
        <Icon name={aaOk ? "shield-check" : "alert-octagon"} size={16} />
        {aaOk ? "All alarms covered around the clock"
          : !aa.groups.length ? "No group carries all alarms"
          : "All alarms uncovered: " + aa.gaps.slice(0, 2).map(window.njOcGapRange || window.wkRange).join(" · ") + (aa.gaps.length > 2 ? " +" + (aa.gaps.length - 2) : "")}
      </span>}
      <div className="rwin-toolbar-r">
        <span className="dl-hint">Changes apply when you save.</span>
        {window.njPerms && window.njPerms.session && <span className="dl-as" title="Demo session role, set under Settings · Roles"><Icon name="user-cog" size={12} /> As {window.njPerms.session}</span>}
        <button className={"btn btn-secondary btn-sm" + (nPend ? "" : " dl-pend-empty")} onClick={(e) => { const el = e.currentTarget; setPendEl((p) => (p ? null : el)); }}>
          <Icon name="calendar-clock" size={14} /> Planned <span className="dl-pend data">{nPend}</span>
        </button>
        <button className="btn btn-secondary btn-sm" title="On-call change log: who changed what, and when" onClick={() => window.openOcLog && window.openOcLog()}><Icon name="history" size={14} /> Change log</button>
        {popout && <button className="an-cardic" onClick={() => window.openDutyList && window.openDutyList()} aria-label="Open paging groups in a floating window" title="Open paging groups in a floating window, so it stays visible while you work on other screens"><Icon name="square-arrow-out-up-right" size={16} /></button>}
      </div>
      {pendEl && <OclPendingPop anchor={pendEl} onClose={() => setPendEl(null)} />}
    </div>
  );
}

function OcDutyListWindow() {
  const win = useDutyWin();
  const store = window.useOncall ? window.useOncall() : null;
  const [pos, setPos] = React.useState(() => win.pos || { x: Math.max(20, Math.round(((window.innerWidth || 1280) - win.size.w) / 2)), y: 82 });
  const [size, setSize] = React.useState(() => win.size);
  const drag = React.useRef({});
  React.useEffect(() => {
    if (!win.open) return;
    const fit = () => {
      const W = window.innerWidth || 1280, H = window.innerHeight || 800;
      setSize((s) => { const w = Math.max(640, Math.min(s.w, W - 16)), h = Math.max(320, Math.min(s.h, H - 16)); return w === s.w && h === s.h ? s : { w, h }; });
      setPos((p) => ({ x: Math.min(Math.max(p.x, 8), Math.max(8, W - Math.min(size.w, W - 16) - 8)), y: Math.min(Math.max(p.y, 8), Math.max(8, H - 56)) }));
    };
    fit(); oclTick();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [win.open]);
  if (!win.open || !store) return null;

  const startDrag = (e) => {
    if (e.target.closest("button, input, .rwin-resize")) return;
    e.preventDefault();
    drag.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y, last: pos };
    const mv = (ev) => { const W = window.innerWidth || 1280, H = window.innerHeight || 800; const c = { x: Math.min(Math.max(drag.current.px + ev.clientX - drag.current.mx, 8), W - 220), y: Math.min(Math.max(drag.current.py + ev.clientY - drag.current.my, 8), H - 56) }; drag.current.last = c; setPos(c); };
    const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); dutyWin.pos = drag.current.last; dutyWin.persist(); };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  };
  const startResize = (e) => {
    e.preventDefault(); e.stopPropagation();
    drag.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h, last: size };
    const mv = (ev) => {
      const w = Math.min(Math.max(drag.current.w + ev.clientX - drag.current.mx, 640), (window.innerWidth || 1280) - pos.x - 12);
      const h = Math.min(Math.max(drag.current.h + ev.clientY - drag.current.my, 320), (window.innerHeight || 800) - pos.y - 12);
      drag.current.last = { w, h }; setSize({ w, h });
    };
    const up = () => { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); dutyWin.size = drag.current.last; dutyWin.persist(); };
    document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up);
  };

  return (
    <div className={"rwin dl-win" + (win.min ? " min" : "")} style={{ left: pos.x, top: pos.y, width: size.w, height: win.min ? "auto" : size.h }} role="dialog" aria-label="Paging groups">
      <header className="rwin-bar" onPointerDown={startDrag}>
        <span className="rwin-title"><Icon name="table-2" size={16} /> Paging groups</span>
        <div className="rwin-bar-r">
          <button className="twin-ic" title={win.min ? "Expand" : "Minimize"} onClick={() => win.toggleMin()}><Icon name={win.min ? "chevron-up" : "minus"} size={16} /></button>
          <button className="twin-ic" title="Close" onClick={() => win.close()}><Icon name="x" size={16} /></button>
        </div>
      </header>
      {!win.min && (
        <div className="rwin-body">
          <OclToolbar className="rwin-toolbar" />
          <div className="rwin-scroll dl-scroll">
            <OcDutyList />
          </div>
          {window.OcSaveBar && <window.OcSaveBar className="oc-savebar-win" />}
          <div className="rwin-resize" onPointerDown={startResize} title="Resize"><Icon name="move-diagonal-2" size={14} /></div>
        </div>
      )}
    </div>
  );
}

// the same table as a Settings · On-call tab — the layout the customer's sheet already has
// On the page the Coverage card already states the round-the-clock check, so the bar does not.
function OcDutyListTab({ find, flash }) {
  return (
    <div className="card dl-tab">
      <OclToolbar className="rwin-toolbar dl-tab-bar" noStatus popout />
      <div className="dl-tab-scroll"><OcDutyList find={find} flash={flash} page /></div>
    </div>
  );
}

Object.assign(window, { OcDutyListWindow, OcDutyListTab, openDutyList, dutyWin, OclPop, OclWhen, oclAt, oclAtBad, oclNextMonday, oclCancel, oclDutyNow });
