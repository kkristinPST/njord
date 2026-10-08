// oncall-page.jsx — Settings · On-call, simplified (On-call Simplification.html, decisions A–D).
// The duty list IS the page and Save is its only primary action. What left the page, and where:
//  · Groups cards     → the duty-list row (names, covers, area, window, 24/7, required) and the
//                       GROUP DRAWER opened from the group name (pause, covers, area, window,
//                       required levels, test, duplicate, delete)
//  · By person        → Find person: matching chips are marked, rows without them dimmed
//  · Resend / Upscale / Personal shifts / Site channels → one On-call settings dialog (openOcSite)
//  · Dispatch pill + Delivery verification card → one Dispatch drawer
//  · New group, New shift, On-call settings → More (Pause all removed). Pop-out = icon on the duty list
//    card (same as the Trend card); Send test alarm = Dispatch tab (footer + Last test) and group drawer
// Rows outside their paging window are SHADED, never hidden or re-sorted (decision C).

// ── paging state at a moment ── reads the same per-day window strings the editor writes
function ocWinIvs(g, now) {
  const out = [], base = new Date(now); base.setHours(0, 0, 0, 0);
  for (let k = -1; k <= 8; k++) {
    const d = new Date(base); d.setDate(base.getDate() + k);
    const v = g.win && g.win[OC_DAYS[(d.getDay() + 6) % 7]];
    if (!v) continue;
    String(v).split(",").forEach((iv) => {
      const m = /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/.exec(iv); if (!m) return;
      const s = d.getTime() + (+m[1] * 60 + +m[2]) * 60000;
      let e = d.getTime() + (+m[3] * 60 + +m[4]) * 60000;
      if (e <= s) e += 86400000; // an end before the start runs past midnight
      out.push({ s, e });
    });
  }
  return out;
}
function ocWinState(g, now) {
  if (!g.enabled) return { kind: "off" };
  const ivs = ocWinIvs(g, now);
  const cur = ivs.find((x) => x.s <= now && now < x.e);
  if (cur) {
    let until = cur.e, grew = true;
    while (grew) { grew = false; ivs.forEach((x) => { if (x.s <= until && x.e > until) { until = x.e; grew = true; } }); }
    return { kind: "live", until: until - now >= 6 * 86400000 ? null : until, now };
  }
  const next = ivs.filter((x) => x.s > now).sort((a, b) => a.s - b.s)[0];
  return next ? { kind: "idle", next: next.s, now } : { kind: "none" };
}
function ocpAt(ms, now) {
  const d = new Date(ms), n = new Date(now);
  const hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  return d.toDateString() === n.toDateString() ? hm : d.toLocaleDateString("en-GB", { weekday: "short" }) + " " + hm;
}
function OcWinBadge({ st }) {
  if (st.kind === "live") return <span className="dl-state live" title="This group's alarms are sent now"><span className="dl-state-dot" /> Paging now{st.until ? " · until " + ocpAt(st.until, st.now) : ""}</span>;
  if (st.kind === "idle") return <span className="dl-state idle" title="Outside the paging window"><Icon name="clock" size={12} /> From {ocpAt(st.next, st.now)}</span>;
  if (st.kind === "off") return <span className="dl-state off" title="No notifications are sent for this group"><Icon name="pause" size={12} /> Paused</span>;
  return <span className="dl-state idle"><Icon name="minus" size={12} /> No paging window</span>;
}

// ── a drawer store ── same shell as the alarm detail drawer (.ad-drawer)
function ocMkDrawer() {
  return { open: false, arg: null, seq: 0, subs: new Set(),
    sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, emit() { this.subs.forEach((f) => f()); },
    show(arg) { this.arg = arg || null; this.open = true; this.seq++; this.emit(); },
    close() { this.open = false; this.emit(); } };
}
const ocGDrawer = ocMkDrawer(), ocDDrawer = ocMkDrawer();
function useOcDrawer(d) {
  const [, f] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => d.sub(f), []);
  React.useEffect(() => {
    if (!d.open) return;
    const k = (e) => { if (e.key === "Escape" && !document.querySelector(".modal-scrim")) d.close(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [d.open]);
  return d;
}
function OcDrawerShell({ d, label, wide, children }) {
  return (
    <React.Fragment>
      {d.open && <div className="ad-scrim ocd-scrim" onClick={() => d.close()} />}
      <aside className={"ad-drawer ocd-drawer" + (wide ? " wide" : "") + (d.open ? " open" : "")} aria-hidden={!d.open} role="dialog" aria-label={label}>
        {d.seq > 0 && children}
      </aside>
    </React.Fragment>
  );
}
function openOcGroup(group) { ocGDrawer.show(group); }
function openOcDispatch() { ocDDrawer.show("dispatch"); }
function openOcSettings() { ocDDrawer.show("settings"); }
// pause / resume one group, saying what it does to all-alarms cover. Row switch + group drawer.
function ocTogglePause(gid) {
  const store = window.oncallStore, g = store.groups.find((x) => x.id === gid);
  if (!g || !ocCanPause()) return;
  const gap = g.enabled && window.njOcGapDelta ? window.njOcGapDelta(store.groups.map((x) => (x.id === gid ? Object.assign({}, x, { enabled: false }) : x))) : [];
  store.toggle(gid);
  njToast(gap.length ? g.name + " paused. All alarms now uncovered: " + window.njOcGapText(gap) + "." : g.name + (g.enabled ? " paused." : " resumed."));
}

// ── group drawer ──
function OcGroupDrawer() {
  const d = useOcDrawer(ocGDrawer);
  return <OcDrawerShell d={d} label="On-call group"><OcGroupDrawerBody key={d.seq} group={d.arg} /></OcDrawerShell>;
}
function OcGroupDrawerBody({ group }) {
  const store = window.useOncall();
  if (window.usePerms) window.usePerms();
  const editing = !!group;
  const [g, setG] = React.useState(() => (editing ? ocClone(ocNormalize(group)) : ocNewGroup()));
  const saved = editing ? store.groups.find((x) => x.id === g.id) : null;
  const close = () => ocGDrawer.close();
  if (editing && !saved) {
    return (
      <React.Fragment>
        <div className="ad-head"><div className="ad-head-l"><div className="ad-alarm">{group.name}</div></div><button className="ad-x" title="Close" aria-label="Close" onClick={close}><Icon name="x" size={20} /></button></div>
        <div className="ad-body"><NjInline align="left">This group was deleted.</NjInline></div>
      </React.Fragment>
    );
  }
  const enabled = saved ? saved.enabled : true;
  const canSave = g.name.trim().length > 0 && !ocWinBad(g).length;
  const save = () => {
    if (!canSave) return;
    store.upsert(Object.assign({}, g, { enabled }));
    close();
    njToast(editing ? "Updated " + g.name + "." : "Created " + g.name + ". Add recipients on Paging groups.");
  };
  const togglePause = () => ocTogglePause(saved.id);
  const dup = () => { store.duplicate(saved.id); const c = store.groups[store.groups.length - 1]; njToast("Duplicated as " + c.name + "."); ocGDrawer.show(c); };
  const del = () => {
    const gap = window.njOcGapDelta ? window.njOcGapDelta(store.groups.filter((x) => x.id !== saved.id)) : [];
    openDialog(<ConfirmDialog title="Delete on-call group" message={"Delete “" + saved.name + "”?"}
      detail={gap.length ? "All alarms will be uncovered " + window.njOcGapText(gap) + ". The Coverage panel will flag it until another group holds those hours." : "Its recipients will no longer be paged for this coverage."}
      confirmLabel="Delete" tone="danger" onConfirm={() => { store.remove(saved.id); close(); njToast(saved.name + " deleted."); }} />);
  };
  const st = saved ? ocWinState(saved, window.oclDutyNow ? window.oclDutyNow() : Date.now()) : null;
  return (
    <React.Fragment>
      <div className="ad-head">
        <div className="ad-head-l">
          <div className="ad-badges">{st ? <OcWinBadge st={st} /> : <span className="dl-state idle"><Icon name="plus" size={12} /> New group</span>}</div>
          <div className="ad-alarm">{g.name.trim() || (editing ? saved.name : "New on-call group")}</div>
          <div className="ad-sub">{ocPrio(g.minPriority).covers} · {ocAreaSummary(g)} · {ocSchedLines(g).join(" · ")}</div>
        </div>
        <button className="ad-x" title="Close" aria-label="Close" onClick={close}><Icon name="x" size={20} /></button>
      </div>
      <div className="ad-body">
        {editing && (
          <div className="ocd-pause">
            <div><div className="ocd-pause-t">{enabled ? "Paging" : "Paused"}</div><div className="ocd-pause-d">{enabled ? "Alarms in this group's window are sent to its recipients. Takes effect at once." : "No notifications are sent for this group."}</div></div>
            <button className={"oc-switch" + (enabled ? " on" : "")} role="switch" aria-checked={enabled} aria-label="Paging" disabled={!ocCanPause()} title={!ocCanPause() ? "Pausing a group needs the Pause & Resume Groups permission" : enabled ? "Pause this group" : "Resume this group"} onClick={togglePause}><span className="oc-switch-knob" /></button>
          </div>
        )}
        <OcGroupFields g={g} setG={setG} />
        <OcGapNote gap={ocGapFor(g, editing)} />
        {!editing && <p className="oc-sched-note"><Icon name="users" size={14} color="var(--slate-400)" /> Recipients are added on Paging groups after the group is created.</p>}
      </div>
      <div className="ocd-foot">
        {editing && (
          <div className="ocd-foot-l">
            <button className="icon-btn" title="Send a test alarm to this group" aria-label="Send test alarm" onClick={() => window.njOpenTestDispatch && window.njOpenTestDispatch(saved.id)}><Icon name="send" size={16} /></button>
            <button className="icon-btn" title="Duplicate group" aria-label="Duplicate group" onClick={dup}><Icon name="copy" size={16} /></button>
            <button className="icon-btn ocd-del" title="Delete group" aria-label="Delete group" onClick={del}><Icon name="trash-2" size={16} /></button>
          </div>
        )}
        <div className="ocd-foot-r">
          <button className="btn btn-secondary" onClick={close}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={save}><Icon name="check" size={16} /> {editing ? "Save changes" : "Create group"}</button>
        </div>
      </div>
    </React.Fragment>
  );
}

// ── dispatch drawer ── the modem pill and the Delivery verification card answered one question
// (does a page actually leave the site?) from two ends of the page
function useDlLog() { const [, f] = React.useReducer((x) => x + 1, 0); React.useEffect(() => (window.njDeliveryLog ? window.njDeliveryLog.sub(f) : undefined), []); return window.njDeliveryLog; }
function ocDlFails(log) { return log ? log.since(86400000).filter((r) => r.result !== "Succeeded" && r.result !== "Pending").length : 0; }
// ── On-call settings drawer ── two tabs: Settings (escalation, duty phones, UHF, rules, personal
// shifts; one Save) and Dispatch (paths, delivery log, scheduled tests; acts at once). The modem
// pill and the Delivery verification card answered one question — does a page actually leave
// the site? — from two ends of the page; both live here now.
function OcDispatchDrawer() {
  const d = useOcDrawer(ocDDrawer);
  return <OcDrawerShell d={d} label="On-call settings" wide><OcSettingsDrawerBody key={d.seq} tab0={d.arg || "settings"} /></OcDrawerShell>;
}
function OcSettingsDrawerBody({ tab0 }) {
  const [tab, setTab] = React.useState(tab0);
  const f = window.useOcSettingsForm(() => ocDDrawer.close());
  return (
    <React.Fragment>
      <div className="ad-head ocd-head-tabs">
        <div className="ad-head-l">
          <div className="ad-alarm">On-call settings</div>
          <div className="ad-sub">Applies to the whole site</div>
          <div className="segmented ocd-tabs">
            {[["settings", "Settings"], ["dispatch", "Dispatch"]].map(([id, l]) => <button key={id} className={"seg" + (tab === id ? " active" : "")} aria-pressed={tab === id} onClick={() => setTab(id)}>{l}</button>)}
          </div>
        </div>
        <button className="ad-x" title="Close" aria-label="Close" onClick={() => ocDDrawer.close()}><Icon name="x" size={20} /></button>
      </div>
      {/* both stay mounted: switching tab must not drop unsaved settings */}
      <div className="ad-body" hidden={tab !== "settings"}>{f.body}</div>
      <div className="ad-body" hidden={tab !== "dispatch"}><OcDispatchBody /></div>
      <div className="ocd-foot">
        {tab === "settings"
          ? <div className="ocd-foot-r"><button className="btn btn-secondary" onClick={() => ocDDrawer.close()}>Cancel</button><button className="btn btn-primary" disabled={f.bad} onClick={f.save}><Icon name="check" size={16} /> Save changes</button></div>
          : <React.Fragment><span className="ocd-foot-note">A test pages the real recipients. You pick the group before it is sent.</span><div className="ocd-foot-r"><button className="btn btn-secondary" onClick={() => ocDDrawer.close()}>Close</button><button className="btn btn-primary" onClick={() => window.njOpenTestDispatch && window.njOpenTestDispatch(null)}><Icon name="send" size={16} /> Send test alarm</button></div></React.Fragment>}
      </div>
    </React.Fragment>
  );
}
function OcDispatchBody() {
  if (window.useOncall) window.useOncall();
  const site = ocSite();
  const s1 = window.ocModemSeries ? window.ocModemSeries(0) : [-72];
  const s2 = window.ocModemSeries ? window.ocModemSeries(7).map((v) => v - 6) : [-78];
  const paths = [
    { n: "GSM modem 1", st: "Connected", ok: true, v: s1[s1.length - 1] + " dBm", d: "SMS and voice · SIM Telenor NO" },
    { n: "GSM modem 2", st: "Standby", ok: true, v: s2[s2.length - 1] + " dBm", d: "Failover · SIM Telia NO" },
    { n: "UHF sender", st: site.uhf.on ? "Online" : "Off", ok: site.uhf.on, v: "169.4 MHz", d: site.uhf.on ? "Second independent path · " + ocPrio(site.uhf.minPriority).covers.toLowerCase() : "Turned off under Settings" },
  ];
  return (
    <React.Fragment>
      <p className="oc-mininfo">Remote alarms leave the facility on two independent paths: the GSM dispatcher and the UHF sender.</p>
      <div className="ocd-sec-h"><span className="eyebrow">Paths</span><button className="linkbtn" onClick={() => window.openModemStatus && window.openModemStatus()}>Signal history <Icon name="arrow-up-right" size={14} /></button></div>
      <div className="ocd-paths">
        {paths.map((p) => (
          <div className="ocd-path" key={p.n}>
            <span className="statusdot" style={{ background: p.ok ? "var(--success)" : "var(--warning)" }} />
            <span className="ocd-path-n">{p.n} · {p.st}</span>
            <span className="ocd-path-v">{p.v}</span>
            <span className="ocd-path-d">{p.d}</span>
          </div>
        ))}
      </div>
      {window.DeliveryVerificationCard && <window.DeliveryVerificationCard />}
    </React.Fragment>
  );
}
function OcDispatchBtn() {
  const log = useDlLog();
  if (window.useOncall) window.useOncall();
  const fails = ocDlFails(log);
  const uhfOff = !ocSite().uhf.on;
  const bad = fails > 0 || uhfOff;
  return (
    <button className={"modem-pill oc-modem-btn" + (bad ? " warn" : "")} onClick={openOcDispatch} title="Dispatch paths, delivery log and scheduled tests">
      <span className="statusdot" style={{ background: bad ? "var(--warning)" : "var(--success)" }} />
      {fails ? fails + " undelivered · 24 h" : uhfOff ? "Dispatch · UHF off" : "Dispatch online"}
      <Icon name="chevron-right" size={14} />
    </button>
  );
}

// ── More ── rare actions. Pause all was removed (user): pausing is per group, on the row switch
function OcMoreMenu({ anchor, onClose }) {
  const go = (fn) => () => { onClose(); fn(); };
  const Item = ({ icon, label, onClick, cls, disabled, title }) => (
    <button role="menuitem" className={"oc-lvm-i" + (cls ? " " + cls : "")} disabled={disabled} title={title} onClick={onClick}><span className="oc-lvm-c"><Icon name={icon} size={14} /></span>{label}</button>
  );
  return (
    <window.OclPop anchor={anchor} onClose={onClose} width={250}>
      <div className="oc-lvm" role="menu">
        <Item icon="plus" label="New group" onClick={go(() => openOnCallEditor(null))} />
        {njOcShiftsOn() && <Item icon="calendar-plus" label="New shift" onClick={go(() => window.openShiftEditor(null))} />}
        <Item icon="sliders-horizontal" label="On-call settings…" onClick={go(openOcSettings)} />
      </div>
    </window.OclPop>
  );
}

function OnCallTab() {
  window.useOncall();
  if (window.useShifts) window.useShifts();
  if (window.useOcDraft) window.useOcDraft();
  const shiftsOn = njOcShiftsOn();
  const [view, setView] = React.useState("duty");
  const [shLayout, setShLayout] = React.useState(() => { try { return localStorage.getItem("nj_oc_shift_layout_v1") || "table"; } catch (e) { return "table"; } });
  const setShLayoutP = (v) => { setShLayout(v); try { localStorage.setItem("nj_oc_shift_layout_v1", v); } catch (e) {} };
  const [q, setQ] = React.useState("");
  const [flash, setFlash] = React.useState(null);
  const [reveal, setReveal] = React.useState(null);
  React.useLayoutEffect(() => { if (!reveal || !window.njOcReveal) return; return window.njOcReveal(reveal.sel); }, [view, reveal]);
  // Coverage findings route here. A group finding marks its ROW (names are fixed on the duty
  // list, not in the drawer); a person finding fills Find person.
  React.useEffect(() => {
    window.njOcGo = (go) => {
      if (!go) return;
      if (go.person) { setView("duty"); setQ(go.person); setReveal({ sel: ".dl-tab", n: Date.now() }); return; }
      if (go.roster) { if (njOcShiftsOn()) { setView("roster"); setReveal({ sel: ".ocr-board", n: Date.now() }); } return; }
      if (go.g) { setView("duty"); setQ(""); setFlash(go.gs ? go.gs.map((x) => x.id) : [go.g.id]); setReveal({ sel: '[data-oc-id="' + go.g.id + '"]', n: Date.now() }); }
    };
    return () => { delete window.njOcGo; };
  }, []);
  // the mark stays until the next click
  React.useEffect(() => {
    if (!flash) return;
    const clear = () => setFlash(null);
    const t = setTimeout(() => document.addEventListener("click", clear, { once: true }), 600);
    return () => { clearTimeout(t); document.removeEventListener("click", clear); };
  }, [flash]);
  React.useEffect(() => { if (!shiftsOn && view === "roster") setView("duty"); }, [shiftsOn]);
  return (
    <div className="oc-stack">
      <div className="oc-toolbar">
        {shiftsOn && (
          <div className="segmented oc-viewseg">
            {[["duty", "Paging groups", "Who is paged for which alarms, and in what order"], ["roster", "Personal shifts", "When each person can be reached"]].map(([id, l, t]) => <button key={id} className={"seg" + (view === id ? " active" : "")} title={t} onClick={() => setView(id)}>{l}</button>)}
          </div>
        )}
        {view === "duty" && (
          <div className="field oc-find">
            <Icon name="search" size={16} color="var(--slate-400)" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find person…" aria-label="Find a person in the paging groups" />
            {q && <button className="ocr-search-x" title="Clear" aria-label="Clear search" onClick={() => setQ("")}><Icon name="x" size={14} /></button>}
          </div>
        )}
        <div className="oc-toolbar-r">
          <OcDispatchBtn />
          <button className="btn btn-secondary" onClick={() => openOnCallEditor(null)}><Icon name="plus" size={16} /> New group</button>
          <button className="btn btn-secondary" onClick={openOcSettings} title="Escalation, duty phones, UHF, personal shifts and dispatch"><Icon name="settings" size={16} /> Settings</button>
        </div>
      </div>

      {window.OcCoverageCard && <window.OcCoverageCard />}

      {view === "roster" && (
        <React.Fragment>
          <div className="card">
            <div className="oncall-legend">
              <span className="oncall-legend-l">When each person is reachable</span>
              <span className="oncall-legend-cols">Paging groups say who is paged and in what order · a shift says when that person can be reached · an alarm is sent only when both allow it</span>
              <div className="ocr-head-acts">
              <button className="btn btn-secondary btn-sm ocr-rot-btn" onClick={() => window.openShiftRotation && window.openShiftRotation()} title="How many weeks the duty cycles through, from which Monday, and what the weeks are called">
                <Icon name="repeat" size={14} /> Rotation{window.shiftStore && window.shiftStore.rotN > 1 ? " · " + window.shiftStore.rotN + " weeks" : ""}</button>
              <div className="segmented ocr-layout" role="group" aria-label="Layout">
                {[["table", "table-2", "Table: every person and every day"], ["cards", "layout-grid", "Cards: one day, a column per shift"]].map(([id, ic, t]) => (
                  <button key={id} className={"seg" + (shLayout === id ? " active" : "")} aria-pressed={shLayout === id} title={t} aria-label={t} onClick={() => setShLayoutP(id)}><Icon name={ic} size={14} /></button>
                ))}
              </div>
              </div>
            </div>
            <div className="card-body">{window.OcRosterBoard && <window.OcRosterBoard layout={shLayout} />}</div>
          </div>
        </React.Fragment>
      )}

      {view === "duty" && window.OcDutyListTab && <window.OcDutyListTab find={q} flash={flash} />}
      {view === "duty" && window.OcSaveBar && <window.OcSaveBar className="oc-savebar-page" />}
    </div>
  );
}

Object.assign(window, { OnCallTab, OcGroupDrawer, OcDispatchDrawer, openOcGroup, openOcDispatch, openOcSettings, openOcSite: openOcSettings, ocTogglePause, ocWinState, OcWinBadge });
