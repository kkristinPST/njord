// screens-detail.jsx — Tank, Equipment, Water-chemistry chart, Facility navigation,
// Activity (Notifications / Maneuvers / Notes), More, Search & Scan sheets, Phase-2 screens.

// ---------- TANK LIST ----------
function TankListScreen() {
  useNav();
  return (
    <React.Fragment>
      <MHeader back title="Fish tanks" sub="DPT1 · Post-Smolt · 4 tanks" right={<button className="m-icbtn" aria-label="Search" onClick={() => mSearch(true)}><MIcon name="search" size={19} /></button>} />
      <PullScroll><div className="m-pad m-alist">{M_TANKS.map((t) => <TankListRow key={t.n} t={t} />)}</div></PullScroll>
    </React.Fragment>
  );
}
function TankListRow({ t }) {
  if (!t.active) return (
    <div className="m-tank" style={{ opacity: .62 }} onClick={() => mPush("tank", { n: t.n })} {...mActivate(() => mPush("tank", { n: t.n }), "Open " + t.name + ", deactivated")}>
      <div className="m-tank-head"><span className="m-tank-name"><MDot level="ok" size={9} /> {t.name}</span><MBadge level="low">DEACTIVATED</MBadge></div>
      <div style={{ fontSize: 12, color: "var(--slate-500)" }}>Empty · not in production</div>
    </div>
  );
  return <MiniTank t={t} />;
}

// ---------- TANK DETAIL ----------
function TankScreen({ n }) {
  useNav(); const t = M_TANKS.find((x) => x.n === n); if (!t) return null;
  const o2st = mO2Status(t.o2);
  const tankAlarms = M_ALARMS.filter((a) => mIsActive(a) && a.tag.indexOf(t.tag) === 0);
  const reads = [
    { kind: "o2", l: "O₂ saturation", v: t.o2.toFixed(1), u: "%", band: "Setpoint 90 % · emergency 82 %", tagx: t.tag + "-QI1" },
    { kind: "temp", l: "Temperature", v: t.temp.toFixed(1), u: "°C", band: "Alarm limit 12.0–13.0 °C", tagx: t.tag + "-TT1" },
    { kind: "co2", l: "CO₂", v: t.co2.toFixed(1), u: "mg/L", band: "Alarm limit 15 mg/L", tagx: t.tag + "-QT2" },
    { kind: "ph", l: "pH", v: t.ph.toFixed(2), u: "", band: "Alarm limit 6.7–7.6", tagx: t.tag + "-QT4" },
  ];
  return (
    <React.Fragment>
      <MHeader back title={t.name} sub={t.dept}
        right={<React.Fragment>{t.emgO2 && <MBadge level="high">EMG O₂ OPEN</MBadge>}<button className="m-icbtn" aria-label="Open O₂ trend" onClick={() => mPush("chart", { tag: t.tag + "-QI1", title: t.name + " · O₂" })}><MIcon name="line-chart" size={19} /></button></React.Fragment>} />
      <div className="m-body">
        <PullScroll><div className="m-pad">
          {t.emgO2 && <div className="mc" style={{ background: "var(--warning-bg)", borderColor: "var(--warning-mid)", padding: "11px 14px", display: "flex", gap: 9, alignItems: "center", marginTop: 4 }}><MIcon name="life-buoy" size={18} color="var(--warning-text)" /><span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--warning-text)" }}>Emergency O₂ dosing active, O₂ below welfare band</span></div>}
          <div className="m-eyebrow">Water quality · tap to trend</div>
          <div className="m-readgrid">
            {reads.map((r) => { const st = mVital(r.kind, parseFloat(r.v)); const s = MSEV[st]; return (
              <div key={r.l} className="m-read" onClick={() => mPush("chart", { tag: r.tagx, title: t.name + " · " + r.l })} {...mActivate(() => mPush("chart", { tag: r.tagx, title: t.name + " · " + r.l }), "Trend " + r.l + ", " + r.v)}>
                <span className="m-read-rail" style={{ background: st === "ok" ? "var(--slate-200)" : s.dot }} />
                <div className="m-read-l"><MIcon name={r.kind === "o2" ? "droplet" : r.kind === "temp" ? "thermometer" : r.kind === "co2" ? "wind" : "flask-conical"} size={12} /> {r.l}</div>
                <div className="m-read-v" style={st === "ok" ? {} : { color: s.text }}>{r.v}<span className="u"> {r.u}</span></div>
                <div className="m-read-band">{r.band}</div>
              </div>
            ); })}
          </div>
          <div className="m-eyebrow">Fish &amp; feed</div>
          <div className="m-facts">
            <div className="m-fact"><div className="m-fact-l">Population</div><div className="m-fact-v">{t.population.toLocaleString()}</div></div>
            <div className="m-fact"><div className="m-fact-l">Avg weight</div><div className="m-fact-v">{t.avgWt.toFixed(1)} <span style={{ fontSize: 11, color: "var(--slate-400)" }}>g</span></div></div>
            <div className="m-fact"><div className="m-fact-l">Biomass</div><div className="m-fact-v">{t.biomass} <span style={{ fontSize: 11, color: "var(--slate-400)" }}>t</span></div></div>
            <div className="m-fact"><div className="m-fact-l">Density</div><div className="m-fact-v">{t.density.toFixed(1)} <span style={{ fontSize: 11, color: "var(--slate-400)" }}>kg/m³</span></div></div>
            <div className="m-fact"><div className="m-fact-l">Fed today</div><div className="m-fact-v">{t.fedToday.toFixed(1)} <span style={{ fontSize: 11, color: "var(--slate-400)" }}>kg</span></div></div>
            <div className="m-fact"><div className="m-fact-l">Feeding</div><div className="m-fact-v" style={{ fontSize: 14, color: t.feeding ? "var(--success-text)" : "var(--slate-500)" }}>{t.feeding ? "On" : "Idle"}</div></div>
          </div>
          {tankAlarms.length > 0 && <React.Fragment>
            <div className="m-eyebrow">Current alarms <span className="m-chip-n" style={{ color: "var(--critical-text)" }}>{tankAlarms.length}</span></div>
            <div className="m-alist">{tankAlarms.map((a) => <MAlarmRow key={a.id} a={a} compact />)}</div>
          </React.Fragment>}
          <MFishRegister tank={t} />
          <div className="m-eyebrow">Equipment</div>
          <div className="m-list">
            {M_EQUIP.filter((e) => e.tag.indexOf("DPT1-SMP0") === 0 || e.tag.indexOf("DPT1-DOX0") === 0).map((e) => <EquipRow key={e.tag} e={e} />)}
          </div>
        </div></PullScroll>
        <div className="m-footbar"><div className="m-actions" style={{ marginTop: 0 }}>
          <button className="m-btn m-btn-secondary" onClick={() => mPush("feeding", {})}><MIcon name="utensils" size={17} /> Feeding</button>
          <button className="m-btn m-btn-primary" onClick={() => mPush("chart", { tag: t.tag + "-QI1", title: t.name + " · O₂" })}><MIcon name="line-chart" size={17} /> Trends</button>
        </div></div>
      </div>
    </React.Fragment>
  );
}
function EquipRow({ e }) {
  return (
    <button className="m-lrow" onClick={() => mPush("equipment", { tag: e.tag })}>
      <span className="m-lrow-ic" style={{ background: e.status === "ok" ? "var(--slate-100)" : MSEV[e.status].bg, color: e.status === "ok" ? "var(--slate-600)" : MSEV[e.status].text }}><MIcon name={e.kind === "pump" ? "fan" : e.kind === "fan" ? "wind" : e.kind === "drumfilter" ? "filter" : "circle-dot"} size={19} /></span>
      <div className="m-lrow-main"><div className="m-lrow-t">{e.name}</div><div className="m-lrow-s"><span className="tag">{e.tag}</span> · {e.running ? "Running" : "Stopped"} · {e.mode}</div></div>
      <div className="m-lrow-r"><MDot level={e.status} size={8} /><MIcon name="chevron-right" size={18} /></div>
    </button>
  );
}

// ---------- EQUIPMENT DETAIL ----------
function eqSetpoints(e) {
  const num = (name, def) => { const v = e.vals.find((x) => x[0] === name); return v && !isNaN(parseFloat(v[1])) ? parseFloat(v[1]) : def; };
  if (e.kind === "pump") return [{ key: "spd", l: "Speed setpoint", v: num("Speed", 70), u: "%", min: 0, max: 100, step: 1 }];
  if (e.kind === "fan") return [{ key: "spd", l: "Speed setpoint", v: num("Speed", 60), u: "%", min: 0, max: 100, step: 1 }];
  if (e.kind === "cone") return [{ key: "o2", l: "O₂ dose setpoint", v: num("O₂ dose", 42), u: "%", min: 0, max: 100, step: 1 }];
  if (e.kind === "drumfilter") return [{ key: "bw", l: "Backwash interval", v: num("Backwash", 12), u: "min", min: 2, max: 60, step: 1 }];
  return [];
}
function eqLog(e) {
  return [
    { t: "13:48", from: e.running ? "Stopped" : "Running", to: e.running ? "Running" : "Stopped", by: "System" },
    { t: "11:30", from: "Manual", to: "Auto", by: "E. Sørensen" },
    { t: "Yesterday", from: "Auto", to: "Manual", by: "M. Haugen" },
  ];
}
function EquipmentScreen({ tag }) {
  useNav(); useMNotes(); const e = M_EQUIP.find((x) => x.tag === tag); if (!e) return null;
  const s = MSEV[e.status];
  const eqAlarms = M_ALARMS.filter((a) => mIsActive(a) && a.tag === e.tag);
  const [confirm, setConfirm] = React.useState(null);
  const [tab, setTab] = React.useState("Overview");
  const [sp, setSp] = React.useState({});
  const doAction = (label, msg) => setConfirm({ label, msg });
  const setpoints = eqSetpoints(e);
  const notes = mNotesStore.rows.filter((n) => n.tag === e.tag && !n.archived);
  const iconName = e.kind === "pump" ? "fan" : e.kind === "fan" ? "wind" : e.kind === "drumfilter" ? "filter" : "circle-dot";
  return (
    <React.Fragment>
      <MHeader back title={e.name} sub={e.tag} right={<button className="m-icbtn" aria-label="Scan equipment QR" onClick={() => mPush("scan", {})}><MIcon name="scan-line" size={19} /></button>} />
      <div className="m-body">
        <PullScroll><div className="m-pad">
          <div className="mc" style={{ borderColor: e.status === "ok" ? "var(--border)" : s.dot, padding: 15, marginTop: 4, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, background: e.running ? "var(--sc-run)" : "var(--sc-stop)", color: e.running ? "#fff" : "var(--slate-600)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}><MIcon name={iconName} size={26} /></span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{e.running ? "Running" : "Stopped"} · {e.mode}</div><div style={{ fontSize: 12, color: "var(--slate-500)", marginTop: 2 }}>{e.status === "ok" ? "No active alarms" : eqAlarms.length + " active alarm"}</div></div>
            <MBadge level={e.status === "ok" ? "ok" : e.status}>{e.status === "ok" ? "OK" : MSEV[e.status].label}</MBadge>
          </div>
          <div className="m-seg" style={{ margin: "14px 0 4px" }}>{["Overview", "Log", "Notes", "Admin"].map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}{t === "Notes" && notes.length ? " · " + notes.length : ""}</button>)}</div>
          {tab === "Overview" && <React.Fragment>
            <div className="m-eyebrow">Live values · tap to trend</div>
            <div className="m-facts">
              {e.vals.map((v) => <div key={v[0]} className="m-fact" onClick={() => mPush("chart", { tag: e.tag + "-X", title: e.name + " · " + v[0] })} {...mActivate(() => mPush("chart", { tag: e.tag + "-X", title: e.name + " · " + v[0] }), "Trend " + v[0])} style={{ cursor: "pointer" }}><div className="m-fact-l">{v[0]}</div><div className="m-fact-v">{v[1]} <span style={{ fontSize: 11, color: "var(--slate-400)" }}>{v[2]}</span></div></div>)}
            </div>
            {setpoints.length > 0 && <React.Fragment>
              <div className="m-eyebrow">Setpoints · tap to edit</div>
              <div className="m-list">{setpoints.map((p) => { const cur = sp[p.key] != null ? sp[p.key] : p.v; return (
                <button key={p.key} className="m-lrow" onClick={() => mEditParam({ label: p.l, value: cur, unit: p.u, min: p.min, max: p.max, step: p.step, tag: e.tag, onApply: (n) => setSp((o) => ({ ...o, [p.key]: n })) })}>
                  <span className="m-lrow-ic"><MIcon name="sliders-horizontal" size={18} /></span>
                  <div className="m-lrow-main"><div className="m-lrow-t">{p.l}</div><div className="m-lrow-s">Writable · {e.mode} control</div></div>
                  <span className="m-lrow-r"><span className="data" style={{ fontWeight: 700 }}>{cur} {p.u}</span><MIcon name="pencil" size={15} color="var(--slate-400)" /></span>
                </button>
              ); })}</div>
            </React.Fragment>}
            {eqAlarms.length > 0 && <React.Fragment><div className="m-eyebrow">Active alarms</div><div className="m-alist">{eqAlarms.map((a) => <MAlarmRow key={a.id} a={a} compact />)}</div></React.Fragment>}
            <div className="m-eyebrow">Maintenance</div>
            <div className="m-list">
              <div className="m-lrow" style={{ cursor: "default" }}><span className="m-lrow-ic"><MIcon name="wrench" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Last service</div><div className="m-lrow-s">{e.maint}</div></div></div>
              <button className="m-lrow" onClick={() => mSheet(<WorkOrderSheet equip={e} />)}><span className="m-lrow-ic"><MIcon name="clipboard-list" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Raise work order</div><div className="m-lrow-s">Log a maintenance task</div></div><MIcon name="chevron-right" size={18} color="var(--slate-400)" /></button>
              <button className="m-lrow" onClick={() => mSheet(<DocsSheet equip={e} />)}><span className="m-lrow-ic"><MIcon name="file-text" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Documentation</div><div className="m-lrow-s">Datasheet &amp; service manual</div></div><MIcon name="chevron-right" size={18} color="var(--slate-400)" /></button>
            </div>
          </React.Fragment>}
          {tab === "Log" && <React.Fragment>
            <div className="m-eyebrow">State &amp; setpoint changes</div>
            <div className="m-list">{eqLog(e).map((l, i) => (
              <div key={i} className="m-lrow" style={{ cursor: "default" }}><span className="m-lrow-ic"><MIcon name="history" size={17} /></span><div className="m-lrow-main"><div className="m-inline" style={{ gap: 6 }}><span className="tag" style={{ fontSize: 11 }}>{l.from}</span><MIcon name="arrow-right" size={12} color="var(--slate-400)" /><span className="data" style={{ fontSize: 11, fontWeight: 700 }}>{l.to}</span></div><div className="m-lrow-s">{l.by}</div></div><span className="m-arow-time data">{l.t}</span></div>
            ))}</div>
          </React.Fragment>}
          {tab === "Notes" && <React.Fragment>
            <div className="m-inline" style={{ justifyContent: "space-between", margin: "6px 2px 8px" }}><span className="m-eyebrow" style={{ margin: 0 }}>Notes on this unit</span><button className="m-note-arch" onClick={() => mNewNote(e.tag)}><MIcon name="plus" size={14} /> New</button></div>
            {notes.length ? <div className="m-list">{notes.map((nt) => (
              <div key={nt.id} className="m-lrow" style={{ cursor: "default", alignItems: "flex-start" }}><span className="m-lrow-ic"><MIcon name="sticky-note" size={17} /></span><div className="m-lrow-main"><div style={{ fontSize: 12.5, color: "var(--slate-600)", lineHeight: 1.4 }}>{nt.text}</div><div className="m-lrow-s" style={{ marginTop: 4 }}>{nt.by} · {nt.at}</div></div></div>
            ))}</div> : <MEmpty label="No notes for this unit" ok />}
          </React.Fragment>}
          {tab === "Admin" && <MEqAdmin e={e} />}
        </div></PullScroll>
        <div className="m-footbar"><div className="m-actions" style={{ marginTop: 0 }}>
          <button className="m-btn m-btn-secondary" onClick={() => doAction(e.mode === "Auto" ? "Switch to Manual" : "Switch to Auto", "Change control mode for " + e.name + "?")}><MIcon name="repeat" size={17} /> {e.mode === "Auto" ? "Manual" : "Auto"}</button>
          {e.running
            ? <button className="m-btn m-btn-danger" onClick={() => doAction("Stop " + e.name, "Stopping this equipment affects the process. Confirm stop?")}><MIcon name="square" size={16} /> Stop</button>
            : <button className="m-btn m-btn-ack" onClick={() => doAction("Start " + e.name, "Confirm start of " + e.name + "?")}><MIcon name="play" size={16} /> Start</button>}
        </div></div>
      </div>
      {confirm && <ConfirmSheet title={confirm.label} body={confirm.msg} danger={confirm.label.indexOf("Stop") === 0}
        onCancel={() => setConfirm(null)} onConfirm={() => { setConfirm(null); if (offlineStore.enqueue()) { mToast("Queued: syncs when online", "cloud-off"); } else { mToast(confirm.label + " · logged to maneuver history", "check"); } }} />}
    </React.Fragment>
  );
}
function ConfirmSheet({ title, body, danger, confirmLabel, onCancel, onConfirm }) {
  return (
    <div className="m-sheet-scrim" onClick={onCancel}>
      <div className="m-sheet center" onClick={(e) => e.stopPropagation()} style={{ padding: 20 }}>
        <div className="m-confirm-t">{title}</div>
        <div className="m-confirm-b">{body}</div>
        <div className="m-actions">
          <button className="m-btn m-btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={"m-btn " + (danger ? "m-btn-danger" : "m-btn-primary")} onClick={onConfirm}>{confirmLabel || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}
// global confirm via the sheet host
function mConfirm({ title, body, danger, confirmLabel, onConfirm }) {
  mSheet(<ConfirmSheet title={title} body={body} danger={danger} confirmLabel={confirmLabel} onCancel={mCloseSheet}
    onConfirm={() => { mCloseSheet(); onConfirm && onConfirm(); }} />);
}

// ---------- PARAM EDIT SHEET (editable setpoints/values — parity with desktop njEditParam) ----------
function ParamEditSheet({ label, value, unit, min, max, step, tag, onApply }) {
  const [val, setVal] = React.useState(String(value));
  const [comment, setComment] = React.useState("");
  const num = parseFloat(val);
  const changed = !isNaN(num) && num !== value;
  const inRange = (min == null || num >= min) && (max == null || num <= max);
  const valid = changed && inRange;
  const st = step || 1;
  const bump = (d) => { const base = isNaN(num) ? value : num; setVal(String(parseFloat((base + d).toFixed(4)))); };
  const reason = isNaN(num) ? "Enter a valid number" : (min != null && num < min) ? "Below minimum: must be ≥ " + min : (max != null && num > max) ? "Above maximum: must be ≤ " + max : !changed ? "No change from current value" : "";
  const confirm = () => { onApply && onApply(num); mCloseSheet(); mToast(label + " set to " + num + (unit ? " " + unit : "") + " · logged to maneuver history", "check"); };
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">{label}</div>
        {tag && <div className="tag" style={{ fontSize: 11, marginBottom: 10 }}>{tag}</div>}
        <div className="m-pe-cur">Current value <b className="data">{value}{unit ? " " + unit : ""}</b></div>
        <div className="m-pe-stepper">
          <button onClick={() => bump(-st)} aria-label="Decrease"><MIcon name="minus" size={20} /></button>
          <input className="m-pe-input" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-label={label} />
          {unit && <span className="m-pe-unit">{unit}</span>}
          <button onClick={() => bump(st)} aria-label="Increase"><MIcon name="plus" size={20} /></button>
        </div>
        <div className="m-pe-meta">
          <span>Change <b className="data" style={{ color: changed ? (num > value ? "var(--success-text)" : "var(--critical-text)") : "var(--slate-500)" }}>{changed ? (num > value ? "+" : "") + parseFloat((num - value).toFixed(4)) : "—"}</b></span>
          {(min != null || max != null) && <span>Range <b className="data">{min != null ? min : "—"}–{max != null ? max : "—"}{unit ? " " + unit : ""}</b></span>}
        </div>
        {reason && <div className="m-pe-reason" data-err={!isNaN(num) && !inRange ? "1" : undefined}>{reason}</div>}
        <textarea className="m-note-ta" rows={2} style={{ minHeight: 54, marginTop: 12 }} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (optional)…" />
        <div className="m-actions" style={{ marginTop: 14 }}>
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={!valid} onClick={confirm}><MIcon name="check" size={16} /> Confirm</button>
        </div>
      </div>
    </div>
  );
}
function mEditParam(opts) { mSheet(<ParamEditSheet {...opts} />); }

// ---------- WORK ORDER + DOCUMENTATION + HELP + ON-CALL sheets (real, not toast-only) ----------
function WorkOrderSheet({ equip }) {
  const [type, setType] = React.useState("Corrective");
  const [prio, setPrio] = React.useState("Normal");
  const [desc, setDesc] = React.useState("");
  const save = () => { if (!desc.trim()) return; mCloseSheet(); mToast("Work order raised · " + equip.tag, "clipboard-check"); };
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t">Raise work order</div>
        <div className="tag" style={{ fontSize: 11, marginBottom: 12 }}>{equip.name} · {equip.tag}</div>
        <div className="m-note-field-l">Type</div>
        <div className="m-seg" style={{ marginBottom: 12 }}>{["Corrective", "Preventive", "Inspection"].map((t) => <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>{t}</button>)}</div>
        <div className="m-note-field-l">Priority</div>
        <div className="m-chips" style={{ flexWrap: "wrap" }}>{["Low", "Normal", "High", "Urgent"].map((p) => <button key={p} className={"m-chip" + (prio === p ? " on" : "")} onClick={() => setPrio(p)}>{p}</button>)}</div>
        <textarea className="m-note-ta" rows={3} style={{ marginTop: 14 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the task or fault…" autoFocus />
        <div className="m-actions" style={{ marginTop: 14 }}>
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={!desc.trim()} style={{ opacity: desc.trim() ? 1 : .5 }} onClick={save}><MIcon name="check" size={16} /> Create order</button>
        </div>
      </div>
    </div>
  );
}
function DocsSheet({ equip }) {
  const docs = [["Datasheet", "PDF · 1.2 MB", "file-text"], ["Service manual", "PDF · 4.8 MB", "book-open"], ["Wiring diagram", "PDF · 0.6 MB", "git-fork"]];
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t" style={{ marginBottom: 4 }}>Documentation</div>
        <div className="m-lrow-s" style={{ marginBottom: 10 }}>{equip.name} · cached for offline</div>
        <div className="m-list">{docs.map((d) => <button key={d[0]} className="m-lrow" onClick={() => { mCloseSheet(); mToast("Opening " + d[0] + " · offline cached", "file-text"); }}><span className="m-lrow-ic"><MIcon name={d[2]} size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">{d[0]}</div><div className="m-lrow-s">{d[1]}</div></div><MIcon name="download" size={17} color="var(--slate-400)" /></button>)}</div>
      </div>
    </div>
  );
}
// On-call lives in mobile/reports-help.jsx (MOnCallSheet) — one sheet for Help + Profile.

// note composer — untyped note, optional equipment link (matches desktop)
function NoteComposeSheet({ presetTag }) {
  const [text, setText] = React.useState("");
  const [tag, setTag] = React.useState(presetTag || "");
  const equipList = [
    ...M_TANKS.map((t) => ({ tag: t.tag, name: t.name })),
    ...M_EQUIP.map((e) => ({ tag: e.tag, name: e.name })),
  ];
  const save = () => {
    if (!text.trim()) return;
    const eq = equipList.find((e) => e.tag === tag);
    mNotesStore.add({ text: text.trim(), equip: eq ? eq.name : "", tag: eq ? eq.tag : "" });
    mCloseSheet();
    mToast("Note added", "sticky-note");
  };
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t" style={{ marginBottom: 12 }}>New note</div>
        <textarea className="m-note-ta" autoFocus rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the deviation or useful information…" />
        <label className="m-note-field">
          <span className="m-note-field-l">Link to equipment <span style={{ color: "var(--slate-400)", fontWeight: 500 }}>(optional)</span></span>
          <select className="m-note-select" value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">No equipment: general note</option>
            {equipList.map((e) => <option key={e.tag} value={e.tag}>{e.name} · {e.tag}</option>)}
          </select>
        </label>
        <div className="m-actions" style={{ marginTop: 14 }}>
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={!text.trim()} onClick={save}><MIcon name="check" size={16} /> Save note</button>
        </div>
      </div>
    </div>
  );
}
function mNewNote(presetTag) { mSheet(<NoteComposeSheet presetTag={presetTag} />); }

// ---------- WATER-CHEMISTRY / TREND CHART ----------
function ChartScreen({ alarmId, tag, title }) {
  useNav(); const a = alarmId ? M_ALARMS.find((x) => x.id === alarmId) : null;
  const [range, setRange] = React.useState("6h");
  const ranges = ["1h", "6h", "24h", "7d"];
  const base = a && a.meas ? a.meas.base : 88; const amp = a && a.meas ? a.meas.amp : 4;
  const ttl = title || (a ? a.alarm : "Trend");
  const unit = a ? a.unit : "%";
  const data = mSeries((tag || alarmId || "x") + range, 60, base, amp, a && a.meas);
  const cur = data[data.length - 1];
  const thr = a && a.meas ? a.meas.thr : null;
  // A discrete alarm (drive fault, level switch, comms) has no process value: plotting one
  // would be fiction. Desktop shows an Event Timeline instead — so does mobile.
  const discrete = !!a && !a.meas;
  if (discrete) return (
    <React.Fragment>
      <MHeader back title="Investigate" sub={ttl} />
      <PullScroll><div className="m-pad">
        <div className="mc" style={{ background: MSEV[a.level].bg, borderColor: MSEV[a.level].dot, padding: "11px 14px", marginTop: 4, display: "flex", gap: 9, alignItems: "center" }}>
          <MIcon name="zap" size={16} color={MSEV[a.level].text} /><span style={{ fontSize: 12, fontWeight: 600, color: MSEV[a.level].text }}>Discrete signal · no measured value to trend</span>
        </div>
        <MEventTimeline a={a} />
        <div className="m-eyebrow">Linked alarm</div>
        <div className="m-alist"><MAlarmRow a={a} compact /></div>
      </div></PullScroll>
    </React.Fragment>
  );
  return (
    <React.Fragment>
      <MHeader back title="Trend" sub={ttl} right={<button className="m-icbtn" aria-label="Full-screen chart" onClick={() => mToast("Rotate device for full-screen chart", "rotate-cw")}><MIcon name="maximize-2" size={18} /></button>} />
      <PullScroll><div className="m-pad">
        {a && <div className="mc" style={{ background: MSEV[a.level].bg, borderColor: MSEV[a.level].dot, padding: "11px 14px", marginTop: 4, display: "flex", gap: 9, alignItems: "center" }}>
          <MIcon name="crosshair" size={16} color={MSEV[a.level].text} /><span style={{ fontSize: 12, fontWeight: 600, color: MSEV[a.level].text }}>Investigating alarm · centered on the event ±30 min</span>
        </div>}
        <div className="m-chart" style={{ marginTop: 12 }}>
          <div className="m-chart-head">
            <div><div className="m-chart-val" style={{ color: thr && ((a.meas.kind[0] === "h" && cur > thr) || (a.meas.kind[0] === "l" && cur < thr)) ? MSEV[a.level].text : "var(--ink)" }}>{cur.toFixed(a && a.meas && a.meas.base < 5 ? 2 : 1)} <span style={{ fontSize: 13, color: "var(--slate-400)" }}>{unit}</span></div><div className="m-chart-lbl">{tag || (a && a.tag)}</div></div>
            {thr && <div style={{ textAlign: "right" }}><div className="tag" style={{ fontSize: 10, color: "var(--critical-text)" }}>THRESHOLD</div><div className="data" style={{ fontWeight: 700, color: "var(--critical-text)" }}>{a.thr}</div></div>}
          </div>
          <MSpark data={data} h={150} fill color={a ? MSEV[a.level].dot : "var(--primary)"} thr={thr} base={base} />
          <div className="m-chart-x"><span>-{range}</span><span>now</span></div>
        </div>
        <div style={{ marginTop: 12 }}><div className="m-seg">{ranges.map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>)}</div></div>
        <div className="m-land-hint"><MIcon name="smartphone" size={13} /> Rotate to landscape for pinch-zoom &amp; compare mode</div>
        <div className="m-eyebrow">Statistics · {range}</div>
        <div className="m-facts">
          <div className="m-fact"><div className="m-fact-l">Min</div><div className="m-fact-v">{Math.min(...data).toFixed(1)}</div></div>
          <div className="m-fact"><div className="m-fact-l">Max</div><div className="m-fact-v">{Math.max(...data).toFixed(1)}</div></div>
          <div className="m-fact"><div className="m-fact-l">Average</div><div className="m-fact-v">{(data.reduce((s, v) => s + v, 0) / data.length).toFixed(1)}</div></div>
          <div className="m-fact"><div className="m-fact-l">Current</div><div className="m-fact-v">{cur.toFixed(1)}</div></div>
        </div>
        {a && <React.Fragment><div className="m-eyebrow">Linked alarm</div><div className="m-alist"><MAlarmRow a={a} compact /></div></React.Fragment>}
      </div></PullScroll>
    </React.Fragment>
  );
}

// ---------- FACILITY NAVIGATION (drill: building → dept → system) ----------
function NavigationScreen() {
  useNav(); const [path, setPath] = React.useState({ b: null, d: null });
  const b = path.b ? M_FACILITY.find((x) => x.id === path.b) : null;
  const d = b && path.d ? b.depts.find((x) => x.id === path.d) : null;
  let title = "Site Plan", sub = "3 buildings · tap to drill in", back = false, onBack = null;
  if (d) { title = d.name; sub = d.sub + " · " + b.name; back = true; onBack = () => setPath({ b: b.id, d: null }); }
  else if (b) { title = b.name; sub = b.depts.length + " departments"; back = true; onBack = () => setPath({ b: null, d: null }); }
  return (
    <React.Fragment>
      <MHeader back={back} onBack={onBack} title={title} sub={sub} right={<button className="m-icbtn" aria-label="Search" onClick={() => mSearch(true)}><MIcon name="search" size={19} /></button>} />
      <PullScroll><div className="m-pad">
        {!b && M_FACILITY.map((bl) => { const w = mBldWorst(bl); return (
          <button key={bl.id} className="m-tank" style={{ width: "100%", marginBottom: 12, textAlign: "left" }} onClick={() => setPath({ b: bl.id, d: null })}>
            <div className="m-tank-head" style={{ marginBottom: 8 }}><span className="m-tank-name"><MIcon name="building-2" size={18} color="var(--slate-500)" /> {bl.name}</span><span className="m-inline" style={{ gap: 6, fontSize: 12, fontWeight: 700, color: MSEV[w].text }}><MDot level={w} size={8} /> {w === "ok" ? "Nominal" : w === "high" ? "Warning" : "Critical"}</span></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{bl.depts.map((dp) => <span key={dp.id} className="m-inline" style={{ gap: 5, fontSize: 11.5, color: "var(--slate-500)", background: "var(--slate-50)", padding: "4px 9px", borderRadius: 20 }}><MDot level={mDeptWorst(dp)} size={6} /> {dp.name}</span>)}</div>
          </button>
        ); })}
        {!b && <React.Fragment>
          <div className="m-eyebrow">Other · facility utilities</div>
          <div className="m-list">
            <button className="m-lrow" onClick={() => mPush("energy", {})}><span className="m-lrow-ic"><MIcon name="zap" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Energy Consumption</div><div className="m-lrow-s">Power &amp; energy per department</div></div><div className="m-lrow-r"><MDot level="ok" size={8} /><MIcon name="chevron-right" size={18} /></div></button>
            <button className="m-lrow" onClick={() => mPush("heatpumps", {})}><span className="m-lrow-ic"><MIcon name="thermometer" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Heat Pumps</div><div className="m-lrow-s">3 units · outside the building hierarchy</div></div><div className="m-lrow-r"><MDot level="ok" size={8} /><MIcon name="chevron-right" size={18} /></div></button>
          </div>
        </React.Fragment>}
        {b && !d && <div className="m-list">{b.depts.map((dp) => { const w = mDeptWorst(dp); return (
          <button key={dp.id} className="m-lrow" onClick={() => setPath({ b: b.id, d: dp.id })}><span className="m-lrow-ic"><MIcon name="layers" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">{dp.name} <span style={{ fontWeight: 500, color: "var(--slate-400)", fontSize: 12 }}>· {dp.sub}</span></div><div className="m-lrow-s">{dp.systems.length} systems</div></div><div className="m-lrow-r"><MDot level={w} size={8} /><MIcon name="chevron-right" size={18} /></div></button>
        ); })}</div>}
        {d && <div className="m-list">{d.systems.map((sy) => (
          <button key={sy.label} className="m-lrow" onClick={() => { if (sy.label === "Fish Tank") mPush("tankList", {}); else mPush("system", { label: sy.label, path: b.name + " · " + d.name + (d.sub ? " " + d.sub : ""), deptId: d.id }); }}>
            <span className="m-lrow-ic" style={{ background: sy.status === "ok" ? "var(--slate-100)" : MSEV[mFacSev(sy.status)].bg, color: sy.status === "ok" ? "var(--slate-600)" : MSEV[mFacSev(sy.status)].text }}><MIcon name={sy.icon} size={18} /></span>
            <div className="m-lrow-main"><div className="m-lrow-t">{sy.label}</div><div className="m-lrow-s">{sy.status === "ok" ? "Nominal" : mFacSev(sy.status) === "high" ? "Warning" : mFacSev(sy.status) === "low" ? "Advisory" : "Critical"}</div></div>
            <div className="m-lrow-r"><MDot level={mFacSev(sy.status)} size={8} /><MIcon name="chevron-right" size={18} /></div>
          </button>
        ))}</div>}
      </div></PullScroll>
    </React.Fragment>
  );
}

// ---------- ACTIVITY (Notifications / Maneuvers / Notes) ----------
const activityStore = { tab: "Alerts", subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.tab; }, set(t) { this.tab = t; this.subs.forEach((f) => f()); } };
function mActivity(t) { activityStore.set(t); }
function ActivityScreen() {
  const tab = React.useSyncExternalStore(activityStore.sub.bind(activityStore), activityStore.snap.bind(activityStore)); useNav();
  useMNotes();
  const setTab = (t) => activityStore.set(t);
  const [notesSub, setNotesSub] = React.useState("Active");
  const [mvSrc, setMvSrc] = React.useState("All");
  const [mvQ, setMvQ] = React.useState("");
  // one shared maneuver log with desktop (MVR_LOG from screens/maneuver.jsx)
  const mvRows = (window.MVR_LOG || []).filter((r) => {
    const auto = r.op === "System";
    if (mvSrc === "Operators" && auto) return false;
    if (mvSrc === "System" && !auto) return false;
    const ql = mvQ.trim().toLowerCase();
    return !ql || [r.t, r.area, r.tag, r.sig, r.from, r.to, r.op, r.cm || ""].join(" ").toLowerCase().includes(ql);
  });
  const notes = mNotesStore.rows.filter((n) => (notesSub === "Archived" ? n.archived : !n.archived));
  const archCount = mNotesStore.rows.filter((n) => n.archived).length;
  return (
    <React.Fragment>
      <MHeader title="Activity" sub="Notifications, maneuvers &amp; notes" right={tab === "Alerts" ? <button className="m-icbtn" aria-label="Mark all read" onClick={() => { const c = mMarkAllNotifsRead(); mToast(c ? c + " marked read" : "All read", "check"); }}><MIcon name="check-check" size={19} /></button> : null} />
      <div style={{ padding: "0 16px 10px" }}><div className="m-seg">{["Alerts", "Maneuvers", "Notes"].map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}</div></div>
      <PullScroll><div className="m-pad">
        {tab === "Alerts" && <div className="m-list">{M_NOTIFS.map((n) => <NotifRow key={n.id} n={n} />)}</div>}
        {tab === "Maneuvers" && <React.Fragment>
          <div className="m-searchbar" style={{ marginBottom: 8 }}>
            <MIcon name="search" size={18} color="var(--slate-400)" />
            <input value={mvQ} onChange={(e) => setMvQ(e.target.value)} placeholder="Filter tag, area, signal, operator…" aria-label="Filter maneuvers" />
          </div>
          <div className="m-seg" style={{ marginBottom: 10 }}>{["All", "Operators", "System"].map((s) => <button key={s} className={mvSrc === s ? "on" : ""} onClick={() => setMvSrc(s)}>{s}</button>)}</div>
          <div className="mratn-count">{mvRows.length} maneuver{mvRows.length === 1 ? "" : "s"}</div>
          <div className="m-list">{mvRows.slice(0, 40).map((m, i) => { const auto = m.op === "System"; return (
            <div key={i} className="m-lrow" style={{ cursor: "default", alignItems: "flex-start" }}><span className="m-lrow-ic"><MIcon name={auto ? "cpu" : "sliders-horizontal"} size={17} /></span><div className="m-lrow-main"><div className="m-lrow-t" style={{ fontSize: 13 }}>{m.sig}</div><div className="m-lrow-s">{m.area} · {auto ? "System" : m.op}</div><div className="m-inline" style={{ gap: 6, marginTop: 4 }}><span className="tag" style={{ fontSize: 11 }}>{m.from}</span><MIcon name="arrow-right" size={12} color="var(--slate-400)" /><span className="data" style={{ fontSize: 11, fontWeight: 700 }}>{m.to}</span></div>{m.cm ? <div className="m-lrow-s" style={{ marginTop: 4, fontStyle: "italic", whiteSpace: "normal" }}>“{m.cm}”</div> : null}</div><span className="m-arow-time data">{String(m.t).split("·").pop().trim().slice(0, 5)}</span></div>
          ); })}
          {!mvRows.length && <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--slate-500)", fontSize: 13 }}>No maneuvers match the filter.</div>}</div>
        </React.Fragment>}
        {tab === "Notes" && <React.Fragment>
          <div className="m-inline" style={{ gap: 8, marginBottom: 12 }}>
            <div className="m-seg" style={{ flex: 1 }}>{["Active", "Archived"].map((s) => <button key={s} className={notesSub === s ? "on" : ""} onClick={() => setNotesSub(s)}>{s}{s === "Archived" && archCount ? " · " + archCount : ""}</button>)}</div>
            {notesSub === "Active" && <button className="m-icbtn" style={{ flex: "none", width: 44, height: 44, border: "1px solid var(--border)", borderRadius: 12 }} onClick={mNewNote} title="New note"><MIcon name="plus" size={20} /></button>}
          </div>
          {notes.length ? <div className="m-list">{notes.map((nt) => (
            <div key={nt.id} className={"m-lrow" + (nt.archived ? " m-note-arch-row" : "")} style={{ cursor: "default", alignItems: "flex-start" }}><span className="m-lrow-ic"><MIcon name={nt.archived ? "archive" : "sticky-note"} size={17} /></span><div className="m-lrow-main"><div className="m-inline" style={{ justifyContent: "space-between", gap: 8 }}><div className="m-lrow-t" style={{ fontSize: 13 }}>{nt.equip || "General"}</div>{nt.tag ? <span className="mbadge" style={{ background: "var(--slate-100)", color: "var(--slate-600)" }}>{nt.tag}</span> : null}</div><div style={{ fontSize: 12.5, color: "var(--slate-600)", margin: "4px 0", lineHeight: 1.4 }}>{nt.text}</div><div className="m-inline" style={{ justifyContent: "space-between" }}><div className="m-lrow-s">{nt.by} · {nt.at}</div>{nt.archived
              ? <button className="m-note-arch" onClick={() => { mNotesStore.setArchived(nt.id, false); mToast("Note restored", "rotate-ccw"); }}><MIcon name="rotate-ccw" size={13} /> Restore</button>
              : <button className="m-note-arch" onClick={() => { mNotesStore.setArchived(nt.id, true); mToast("Note archived", "archive"); }}><MIcon name="archive" size={13} /> Archive</button>}</div></div></div>
          ))}</div> : <MEmpty label={notesSub === "Archived" ? "No archived notes" : "No active notes"} ok />}
        </React.Fragment>}
      </div></PullScroll>
    </React.Fragment>
  );
}
function NotifRow({ n }) {
  const s = MSEV[n.level];
  const go = () => { if (n.unread) mMarkNotifRead(n.id); if (n.alarmId) { mTab("alarms"); setTimeout(() => mPush("alarmDetail", { id: n.alarmId }), 0); } else if (n.tankN) { mTab("dashboard"); setTimeout(() => mPush("tank", { n: n.tankN }), 0); } };
  return (
    <button className="m-lrow" onClick={go} style={{ background: n.unread ? "var(--slate-50)" : "none" }}>
      <span className="m-lrow-ic" style={{ background: n.level === "ok" ? "var(--slate-100)" : s.bg, color: n.level === "ok" ? "var(--slate-600)" : s.text }}><MIcon name={n.kind === "alarm" ? "bell-ring" : n.kind === "welfare" ? "fish" : n.kind === "maint" ? "wrench" : "sliders-horizontal"} size={18} /></span>
      <div className="m-lrow-main"><div className="m-inline" style={{ gap: 6 }}>{n.unread && <span style={{ width: 7, height: 7, borderRadius: 50, background: "var(--primary)", flex: "none" }} />}<div className="m-lrow-t" style={{ fontSize: 13.5 }}>{n.title}</div></div><div className="m-lrow-s">{n.sub}</div></div>
      <span className="m-arow-time data">{mAgo(n.min)}</span>
    </button>
  );
}

// ---------- MORE ----------
function MoreScreen() {
  const hc = useHC(); const off = useOffline(); useNav();
  const item = (icon, t, s, onClick, right) => <button className="m-lrow" onClick={onClick}><span className="m-lrow-ic"><MIcon name={icon} size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">{t}</div>{s && <div className="m-lrow-s">{s}</div>}</div>{right || <MIcon name="chevron-right" size={18} color="var(--slate-400)" />}</button>;
  return (
    <React.Fragment>
      <MHeader title="More" />
      <PullScroll><div className="m-pad">
        <button className="mc mc-pad" style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, textAlign: "left", marginBottom: 4 }} onClick={() => mPush("profile", {})}>
          <span style={{ width: 46, height: 46, borderRadius: 50, background: "var(--ink)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flex: "none" }}>ES</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>E. Sørensen</div><div style={{ fontSize: 12, color: "var(--slate-500)" }}>Shift Supervisor · On shift</div></div>
          <MIcon name="chevron-right" size={19} color="var(--slate-400)" />
        </button>
        <div className="m-eyebrow">Field mode</div>
        <div className="m-list">
          <div className="m-lrow" style={{ cursor: "default" }}><span className="m-lrow-ic"><MIcon name="sun" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Outdoor mode</div><div className="m-lrow-s">High-contrast, sunlight-readable</div></div><MSwitch on={hc} label="Outdoor mode" onToggle={() => hcStore.toggle()} /></div>
          <div className="m-lrow" style={{ cursor: "default" }}><span className="m-lrow-ic"><MIcon name="cloud-off" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Offline mode</div><div className="m-lrow-s">{off.on ? off.queue + " actions queued" : "Cache & queue field actions"}</div></div><MSwitch on={off.on} label="Offline mode" onToggle={() => offlineStore.toggle()} /></div>
          {item("scan-line", "Scan equipment QR", "Open equipment by tag", () => mPush("scan", {}))}
        </div>
        <div className="m-eyebrow">Alarms</div>
        <div className="m-list">
          {item("clipboard-list", "Rationalization register", "Priority, consequence & response per alarm", () => { mTab("alarms"); setTimeout(() => mPush("rationalization", {}), 0); })}
          {item("bell", "Active alarms", "Full annunciator list", () => mTab("alarms"))}
        </div>
        <div className="m-eyebrow">Modules</div>
        <div className="m-list">
          {item("utensils", "Fish Feeding", "Feed control & schedules", () => mPush("feeding", {}))}
          {item("fish", "Fish Biology", "Welfare & mortality", () => mPush("biology", {}))}
          {item("line-chart", "Analytics", "Trends & pens", () => mPush("analytics", {}))}
          {item("file-text", "Reports", "Key figures & exports", () => mPush("reports", {}))}
          {item("bar-chart-2", "Alarm Statistics", "Frequency & bad actors", () => mPush("stats", {}))}
          {item("folder-open", "Trend groups", "Saved parameter sets", () => mPush("trendGroups", {}))}
        </div>
        <div className="m-eyebrow">Facility utilities</div>
        <div className="m-list">
          {item("zap", "Energy Consumption", "Power & energy per department", () => mPush("energy", {}))}
          {item("thermometer", "Heat Pumps", "3 units · outside the buildings", () => mPush("heatpumps", {}))}
        </div>
        <div className="m-eyebrow">System</div>
        <div className="m-list">
          {item("settings", "Settings", "Units, notifications, account", () => mPush("settings", {}))}
          {item("help-circle", "Help & manuals", "Cached for offline", () => mPush("help", {}))}
        </div>
      </div></PullScroll>
    </React.Fragment>
  );
}
function ProfileScreen() {
  useNav();
  return (
    <React.Fragment>
      <MHeader back title="Profile" />
      <PullScroll><div className="m-pad">
        <div className="mc mc-pad" style={{ textAlign: "center", marginTop: 4 }}>
          <span style={{ width: 72, height: 72, borderRadius: 50, background: "var(--ink)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 26, margin: "0 auto 12px" }}>ES</span>
          <div style={{ fontSize: 18, fontWeight: 800 }}>E. Sørensen</div>
          <div style={{ fontSize: 13, color: "var(--slate-500)", marginTop: 3 }}>Shift Supervisor · Building 1</div>
          <div className="m-inline" style={{ justifyContent: "center", gap: 7, marginTop: 10 }}><span className="mbadge" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>ON SHIFT</span><span className="mbadge" style={{ background: "var(--slate-100)", color: "var(--slate-600)" }}>13:00–21:00</span></div>
        </div>
        <div className="m-eyebrow">This shift</div>
        <div className="m-facts">
          <div className="m-fact"><div className="m-fact-l">Acknowledged</div><div className="m-fact-v">12</div></div>
          <div className="m-fact"><div className="m-fact-l">Maneuvers</div><div className="m-fact-v">6</div></div>
          <div className="m-fact"><div className="m-fact-l">Notes</div><div className="m-fact-v">3</div></div>
          <div className="m-fact"><div className="m-fact-l">Inspections</div><div className="m-fact-v">8</div></div>
        </div>
        <div className="m-eyebrow">Account</div>
        <div className="m-list">
          <button className="m-lrow" onClick={() => mSheet(<MOnCallSheet />)}><span className="m-lrow-ic"><MIcon name="calendar" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">On-call schedule</div></div><MIcon name="chevron-right" size={18} color="var(--slate-400)" /></button>
          <button className="m-lrow" onClick={() => mConfirm({ title: "Sign out?", body: "You will be returned to the login screen. Any queued offline actions will be lost.", danger: true, onConfirm: () => mToast("Signed out", "log-out") })}><span className="m-lrow-ic" style={{ background: "var(--critical-bg)", color: "var(--critical-text)" }}><MIcon name="log-out" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t" style={{ color: "var(--critical-text)" }}>Sign out</div></div></button>
        </div>
      </div></PullScroll>
    </React.Fragment>
  );
}

// ---------- FEEDING (phase-2 core sample) ----------
function FeedingScreen() {
  useNav();
  return (
    <React.Fragment>
      <MHeader back title="Fish Feeding" sub="DPT1 · Post-Smolt" />
      <PullScroll><div className="m-pad">
        <div className="m-vitals" style={{ marginTop: 4 }}>
          <div className="m-vital"><div className="m-vital-lbl"><MIcon name="utensils" size={12} /> Fed today</div><div className="m-vital-val">28.3<span className="u">kg</span></div><div className="m-vital-sub">of 39.6 kg target</div></div>
          <div className="m-vital"><div className="m-vital-lbl"><MIcon name="activity" size={12} /> Feed rate</div><div className="m-vital-val">9.8<span className="u">kg/h</span></div><div className="m-vital-sub">3 tanks feeding</div></div>
        </div>
        <div className="m-eyebrow">Tanks</div>
        <div className="m-list">{M_TANKS.filter((t) => t.active).map((t) => (
          <div key={t.n} className="m-lrow" style={{ cursor: "default" }}>
            <span className="m-lrow-ic" style={{ background: t.feeding ? "var(--success-bg)" : "var(--slate-100)", color: t.feeding ? "var(--success-text)" : "var(--slate-500)" }}><MIcon name="utensils" size={17} /></span>
            <div className="m-lrow-main"><div className="m-lrow-t">{t.name}</div><div className="m-lrow-s">{t.fedToday.toFixed(1)} / {t.feedTarget.toFixed(1)} kg · target</div></div>
            <MSwitch on={t.feeding} label={t.name + " feeding"} onToggle={() => { t.feeding = !t.feeding; navStore._bump(); mToast(t.name + (t.feeding ? " feeding resumed" : " feeding paused"), t.feeding ? "play" : "pause"); }} />
          </div>
        ))}</div>
        <div className="m-land-hint"><MIcon name="info" size={13} /> Full feed schedules &amp; curves on desktop</div>
      </div></PullScroll>
    </React.Fragment>
  );
}
function Phase2Screen({ title, icon }) {
  useNav();
  return (
    <React.Fragment>
      <MHeader back title={title} />
      <div className="m-empty" style={{ marginTop: 40 }}>
        <div className="m-empty-ic" style={{ background: "var(--primary-bg)", color: "var(--primary-text)" }}><MIcon name={icon} size={30} /></div>
        <div className="m-empty-t">{title} · mobile view</div>
        <div className="m-empty-s" style={{ maxWidth: 240, margin: "6px auto 0" }}>Next in the build queue. The core operator loop (Dashboard · Alarms · Tanks · Equipment · Trends) is designed first, then this module adopts the same patterns.</div>
      </div>
    </React.Fragment>
  );
}

// ---------- SEARCH SHEET ----------
// Recent searches are real history now: every pick is stored per operator and reused as the
// zero-query state (an operator returns to the same handful of tags all shift).
const M_RECENT_LS = "nj_mobile_recent_v1";
const mRecentStore = {
  rows: (() => { try { const r = JSON.parse(localStorage.getItem(M_RECENT_LS)); return Array.isArray(r) ? r : []; } catch (e) { return []; } })(),
  subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.rows; },
  save() { try { localStorage.setItem(M_RECENT_LS, JSON.stringify(this.rows)); } catch (e) {} this.subs.forEach((f) => f()); },
  push(label) { if (!label) return; this.rows = [label].concat(this.rows.filter((r) => r !== label)).slice(0, 8); this.save(); },
  clear() { this.rows = []; this.save(); },
};
function useMRecent() { return React.useSyncExternalStore(mRecentStore.sub.bind(mRecentStore), mRecentStore.snap.bind(mRecentStore)); }
// Results are icon-free: each row shows a data-driven status dot + text + breadcrumb path.
// The "Navigation" group is generated from the facility tree (M_NAV_INDEX), so no
// per-item icon or hand-built structure is required to implement it for real.
function SearchSheet() {
  const open = useSearch(); const [q, setQ] = React.useState(""); const inp = React.useRef(null); const recents = useMRecent();
  React.useEffect(() => { if (open && inp.current) setTimeout(() => inp.current.focus(), 100); if (!open) setQ(""); }, [open]);
  if (!open) return null;
  const ql = q.toLowerCase();
  const nav = M_NAV_INDEX.filter((s) => q && (s.label.toLowerCase().includes(ql) || s.path.toLowerCase().includes(ql)));
  const tanks = M_TANKS.filter((t) => !q || t.name.toLowerCase().includes(ql) || t.tag.toLowerCase().includes(ql));
  const alarms = M_ALARMS.filter((a) => q && (a.alarm.toLowerCase().includes(ql) || a.tag.toLowerCase().includes(ql) || a.area.toLowerCase().includes(ql)));
  const equip = M_EQUIP.filter((e) => q && (e.name.toLowerCase().includes(ql) || e.tag.toLowerCase().includes(ql)));
  const close = () => mSearch(false);
  const Row = ({ level, title, sub, recent, onClick }) => (
    <button className="m-lrow" onClick={() => { mRecentStore.push(recent || (typeof title === "string" ? title : null)); onClick(); }}>
      <MDot level={level || "ok"} />
      <div className="m-lrow-main"><div className="m-lrow-t" style={{ fontSize: 13 }}>{title}</div><div className="m-lrow-s">{sub}</div></div>
      <span className="m-lrow-r"><MIcon name="chevron-right" size={16} /></span>
    </button>
  );
  return (
    <div className="m-sheet-scrim" onClick={close} onKeyDown={mTrapTab}>
      <div className="m-sheet" role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "88%" }}>
        <div className="m-sheet-grip" />
        <div className="m-searchbar"><MIcon name="search" size={19} color="var(--slate-400)" /><input ref={inp} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tanks, alarms, equipment, tags…" /><button className="m-icbtn" style={{ width: 32, height: 32, border: "none", background: "none" }} aria-label="Close search" onClick={close}><MIcon name="x" size={18} /></button></div>
        <div className="m-search-scroll">
          {!q && (recents.length
            ? <React.Fragment><div className="m-eyebrow" style={{ marginTop: 6 }}>Recent <button type="button" className="lnk" onClick={() => mRecentStore.clear()}>Clear</button></div><div className="m-chips" style={{ flexWrap: "wrap" }}>{recents.map((r) => <button key={r} className="m-chip" onClick={() => setQ(r)}>{r}</button>)}</div></React.Fragment>
            : <div className="m-de-help" style={{ margin: "10px 2px" }}>Search tanks, alarms, equipment and tags. What you open is kept here for next time.</div>)}
          {alarms.length > 0 && <React.Fragment><div className="m-eyebrow">Alarms</div><div className="m-list">{alarms.slice(0, 4).map((a) => <Row key={a.id} level={a.level} title={a.alarm} recent={a.tag} sub={<React.Fragment><span className="tag">{a.tag}</span> · {a.area}</React.Fragment>} onClick={() => { close(); mTab("alarms"); setTimeout(() => mPush("alarmDetail", { id: a.id }), 0); }} />)}</div></React.Fragment>}
          {nav.length > 0 && <React.Fragment><div className="m-eyebrow">Navigation</div><div className="m-list">{nav.slice(0, 6).map((s, i) => <Row key={s.bld + s.dept + i} level={s.status} title={s.label} sub={s.path} onClick={() => { close(); mTab("navigation"); }} />)}</div></React.Fragment>}
          {tanks.length > 0 && <React.Fragment><div className="m-eyebrow">Tanks</div><div className="m-list">{tanks.slice(0, 4).map((t) => <Row key={t.n} level={mO2Status(t.o2)} title={t.name} sub={<React.Fragment><span className="tag">{t.tag}</span> · O₂ {t.o2.toFixed(1)}%</React.Fragment>} onClick={() => { close(); mTab("dashboard"); setTimeout(() => mPush("tank", { n: t.n }), 0); }} />)}</div></React.Fragment>}
          {equip.length > 0 && <React.Fragment><div className="m-eyebrow">Equipment</div><div className="m-list">{equip.slice(0, 4).map((e) => <Row key={e.tag} level={mFacSev(e.status)} title={e.name} recent={e.tag} sub={<span className="tag">{e.tag}</span>} onClick={() => { close(); mTab("navigation"); setTimeout(() => mPush("equipment", { tag: e.tag }), 0); }} />)}</div></React.Fragment>}
          {q && !alarms.length && !nav.length && !tanks.length && !equip.length && <MEmpty label="No matches" />}
        </div>
      </div>
    </div>
  );
}

// ---------- SCAN SHEET (QR / barcode) ----------
const scanStore = { open: false, subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.open; }, set(v) { this.open = v; this.subs.forEach((f) => f()); } };
function ScanScreen() {
  useNav();
  return (
    <React.Fragment>
      <MHeader back title="Scan equipment" sub="Point at an equipment QR / asset tag" />
      <div className="m-pad">
        <div className="m-scanbox"><div className="m-scan-frame"><div className="m-scan-line" /></div></div>
        <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--slate-500)", margin: "4px 0 14px" }}>Align the code within the frame</div>
        <div className="m-eyebrow">Or pick a recent asset</div>
        <div className="m-list">{M_EQUIP.slice(0, 3).map((e) => <EquipRow key={e.tag} e={e} />)}</div>
        <button className="m-btn m-btn-secondary" style={{ marginTop: 14 }} onClick={() => mToast("Enter tag manually", "keyboard")}><MIcon name="keyboard" size={17} /> Enter tag manually</button>
      </div>
    </React.Fragment>
  );
}

// Rationalization lives in mobile/rationalization.jsx (editable, shares the desktop
// override store). The old read-only accordion that was here has been removed.

// ---------- FISH BIOLOGY ----------
function MortalitySheet() {
  const [count, setCount] = React.useState("");
  const [cause, setCause] = React.useState("Handling");
  const [tank, setTank] = React.useState(M_TANKS[0].tag);
  const [note, setNote] = React.useState("");
  const valid = parseInt(count, 10) > 0;
  const save = () => { if (!valid) return; mCloseSheet(); mToast(count + " mortalities registered · " + cause, "check"); };
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-confirm-t" style={{ marginBottom: 12 }}>New mortality registration</div>
        <div className="m-note-field-l">Count</div>
        <input className="m-input" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Number of fish" autoFocus />
        <div className="m-note-field-l" style={{ marginTop: 14 }}>Cause</div>
        <div className="m-chips" style={{ flexWrap: "wrap" }}>{["Handling", "Environmental", "Disease", "Unknown"].map((c) => <button key={c} className={"m-chip" + (cause === c ? " on" : "")} onClick={() => setCause(c)}>{c}</button>)}</div>
        <div className="m-note-field-l" style={{ marginTop: 14 }}>Tank</div>
        <select className="m-note-select" value={tank} onChange={(e) => setTank(e.target.value)}>{M_TANKS.map((t) => <option key={t.tag} value={t.tag}>{t.name} — {t.tag}</option>)}</select>
        <textarea className="m-note-ta" rows={2} style={{ minHeight: 54, marginTop: 12 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)…" />
        <div className="m-actions" style={{ marginTop: 14 }}>
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          <button className="m-btn m-btn-primary" disabled={!valid} onClick={save}><MIcon name="check" size={16} /> Register</button>
        </div>
      </div>
    </div>
  );
}
function WelfareSheet() {
  const IND = M_WF_IND;
  const [scores, setScores] = React.useState(Object.fromEntries(IND.map((i) => [i, 0])));
  const [fish, setFish] = React.useState(1);
  const OF = 20;
  const worst = Math.max.apply(null, Object.values(scores));
  const save = () => { mCloseSheet(); mToast("Fish " + fish + " of " + OF + " scored · registration saved", "check"); };
  return (
    <div className="m-sheet-scrim" onClick={mCloseSheet}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()} style={{ padding: 18 }}>
        <div className="m-sheet-grip" />
        <div className="m-inline" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <div className="m-confirm-t" style={{ margin: 0 }}>Welfare registration</div>
          <span className="data" style={{ fontWeight: 700, color: "var(--slate-500)" }}>Fish {fish} / {OF}</span>
        </div>
        <div className="m-note-field-l" style={{ marginBottom: 4 }}>Score each indicator (0 none – 3 severe)</div>
        {IND.map((i) => (
          <div key={i} className="m-inline" style={{ justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--slate-100)" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{i}</span>
            <div className="m-seg" style={{ width: 148 }}>{[0, 1, 2, 3].map((n) => <button key={n} className={scores[i] === n ? "on" : ""} onClick={() => setScores((o) => ({ ...o, [i]: n }))}>{n}</button>)}</div>
          </div>
        ))}
        <div className="m-de-help" style={{ marginTop: 12 }}>{worst >= 2 ? "Worst indicator scored " + worst + ": add a note if this needs following up." : "Scores are recorded per indicator. No overall grade is calculated."}</div>
        <div className="m-actions" style={{ marginTop: 16 }}>
          <button className="m-btn m-btn-secondary" onClick={mCloseSheet}>Cancel</button>
          {fish < OF
            ? <button className="m-btn m-btn-primary" onClick={() => { setFish(fish + 1); setScores(Object.fromEntries(IND.map((i) => [i, 0]))); }}><MIcon name="arrow-right" size={16} /> Next fish</button>
            : <button className="m-btn m-btn-primary" onClick={save}><MIcon name="check" size={16} /> Finish registration</button>}
        </div>
      </div>
    </div>
  );
}
function BiologyScreen() {
  useNav(); const [tab, setTab] = React.useState("Overview");
  return (
    <React.Fragment>
      <MHeader back title="Fish Biology" sub="Welfare &amp; mortality" />
      <div style={{ padding: "0 16px 10px" }}><div className="m-seg">{["Overview", "Mortality", "Welfare"].map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}</div></div>
      <PullScroll><div className="m-pad">
        <div className="m-vitals">
          <div className="m-vital"><div className="m-vital-lbl"><MIcon name="clipboard-list" size={12} /> Open registrations</div><div className="m-vital-val">{M_WF_REGS.filter((r) => r.state === "ongoing").length}</div><div className="m-vital-sub">{M_WF_REGS.length} this period</div></div>
          <div className="m-vital"><div className="m-vital-lbl"><MIcon name="fish" size={12} /> Mortality 30d</div><div className="m-vital-val">22.6<span className="u">k</span></div><div className="m-vital-sub">1.77 % of stock</div></div>
        </div>
        {tab === "Overview" && <React.Fragment>
          <div className="m-eyebrow">Active batches</div>
          <div className="m-list">
            {[["Batch A · DPT1", "Post-Smolt · 448k", "ok"], ["Batch B · DPT2", "Post-Smolt · 302k", "ok"], ["Batch C · DPT3", "Grow-out · 188k", "high"], ["Batch D · DPT4", "Grow-out · 210k", "ok"]].map((b) => (
              <div key={b[0]} className="m-lrow" style={{ cursor: "default" }}><span className="m-lrow-ic"><MIcon name="layers" size={17} /></span><div className="m-lrow-main"><div className="m-lrow-t" style={{ fontSize: 13.5 }}>{b[0]}</div><div className="m-lrow-s">{b[1]}</div></div><MDot level={b[2]} size={8} /></div>
            ))}
          </div>
        </React.Fragment>}
        {tab === "Mortality" && <React.Fragment>
          <div className="m-eyebrow">Cause breakdown · 30d</div>
          <div className="mc mc-pad">{[["Handling", 42, "high"], ["Environmental", 28, "medium"], ["Disease", 18, "critical"], ["Unknown", 12, "low"]].map((c) => (
            <div key={c[0]} style={{ marginBottom: 12 }}><div className="m-inline" style={{ justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 12.5, fontWeight: 600 }}>{c[0]}</span><span className="data" style={{ fontSize: 12, fontWeight: 700 }}>{c[1]} %</span></div><div style={{ height: 7, borderRadius: 4, background: "var(--slate-100)" }}><div style={{ height: "100%", borderRadius: 4, width: c[1] + "%", background: MSEV[c[2]].dot }} /></div></div>
          ))}</div>
          <button className="m-btn m-btn-primary" style={{ marginTop: 12 }} onClick={() => mSheet(<MortalitySheet />)}><MIcon name="plus" size={17} /> New registration</button>
        </React.Fragment>}
        {tab === "Welfare" && <React.Fragment>
          <div className="m-eyebrow">Registrations</div>
          <div className="m-list">
            {M_WF_REGS.map((r) => (
              <button key={r.id} className="m-lrow" onClick={() => mSheet(<WelfareSheet />)}>
                <span className="m-lrow-ic"><MIcon name={r.state === "ongoing" ? "clipboard-pen" : "clipboard-check"} size={17} /></span>
                <div className="m-lrow-main">
                  <div className="m-lrow-t" style={{ fontSize: 13.5 }}>{r.batch} · {r.tank}</div>
                  <div className="m-lrow-s">{r.dept} · {r.period} · {r.by}</div>
                </div>
                <span className="data" style={{ fontSize: 12, fontWeight: 700, color: r.state === "ongoing" ? "var(--warning-text)" : "var(--success-text)" }}>{r.done}/{r.of}</span>
              </button>
            ))}
          </div>
          <div className="m-eyebrow">Score distribution · latest completed</div>
          <div className="mc mc-pad">
            {M_WF_IND.map((ind) => { const c = mWfCounts(ind); const tot = c.reduce((a, b) => a + b, 0);
              const cols = ["var(--success)", "var(--warning-mid)", "var(--warning)", "var(--critical)"];
              return (
                <div key={ind} style={{ marginBottom: 12 }}>
                  <div className="m-inline" style={{ justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{ind}</span>
                    <span className="data" style={{ fontSize: 11.5, color: "var(--slate-500)" }}>{c.map((n, i) => i + ":" + n).join("  ")}</span>
                  </div>
                  <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", background: "var(--slate-100)" }}>
                    {c.map((n, i) => n > 0 ? <div key={i} style={{ width: (n / tot * 100) + "%", background: cols[i] }} /> : null)}
                  </div>
                </div>
              ); })}
            <div className="m-de-help" style={{ marginTop: 2 }}>Counts of fish at each score, 0 (none) to 3 (severe). No overall grade is derived.</div>
          </div>
          <button className="m-btn m-btn-primary" style={{ marginTop: 12 }} onClick={() => mSheet(<WelfareSheet />)}><MIcon name="plus" size={17} /> New registration</button>
        </React.Fragment>}
      </div></PullScroll>
    </React.Fragment>
  );
}

// Analytics lives in mobile/trends-mobile.jsx (shared pen store + compare + trend groups).

// Reports live in mobile/reports-help.jsx (list + viewer). The old list-only screen was removed.

// ---------- SETTINGS ----------
// Preferences persist: unit + push choices are per-operator and were resetting on every reload.
const M_SET_KEY = "nj_mobile_settings_v1";
const M_SET_DEFAULT = { temp: "C", notif: { critical: true, high: true, welfare: true, maint: false } };
function mLoadSettings() {
  try { const r = JSON.parse(localStorage.getItem(M_SET_KEY)); if (r && r.notif) return { temp: r.temp || "C", notif: { ...M_SET_DEFAULT.notif, ...r.notif } }; } catch (e) {}
  return { temp: M_SET_DEFAULT.temp, notif: { ...M_SET_DEFAULT.notif } };
}
function mSaveSettings(s) { try { localStorage.setItem(M_SET_KEY, JSON.stringify(s)); } catch (e) {} }
function SettingsScreen() {
  const hc = useHC(); const off = useOffline(); useNav();
  const [set, setSet] = React.useState(mLoadSettings);
  const notif = set.notif, temp = set.temp;
  const write = (next) => { setSet(next); mSaveSettings(next); };
  const setTemp = (u) => write({ ...set, temp: u });
  const setNotif = (fn) => write({ ...set, notif: fn(set.notif) });
  const row = (icon, t, s, right, k) => <div key={k} className="m-lrow" style={{ cursor: "default" }}><span className="m-lrow-ic"><MIcon name={icon} size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">{t}</div>{s && <div className="m-lrow-s">{s}</div>}</div>{right}</div>;
  return (
    <React.Fragment>
      <MHeader back title="Settings" />
      <PullScroll><div className="m-pad">
        <div className="m-eyebrow">Display</div>
        <div className="m-list">
          {row("sun", "Outdoor mode", "High-contrast, sunlight-readable", <MSwitch on={hc} label="Outdoor mode" onToggle={() => hcStore.toggle()} />)}
          {row("cloud-off", "Offline mode", off.on ? off.queue + " queued" : "Cache & queue actions", <MSwitch on={off.on} label="Offline mode" onToggle={() => offlineStore.toggle()} />)}
          {row("thermometer", "Temperature unit", null, <div className="m-seg" style={{ width: 108 }}>{["C", "F"].map((u) => <button key={u} className={temp === u ? "on" : ""} onClick={() => setTemp(u)}>°{u}</button>)}</div>)}
        </div>
        <div className="m-eyebrow">Push notifications</div>
        <div className="m-list">
          {[["Critical alarms", "critical", "bell-ring"], ["High alarms", "high", "bell"], ["Welfare alerts", "welfare", "fish"], ["Maintenance reminders", "maint", "wrench"]].map((n) => row(n[2], n[0], null, <MSwitch on={notif[n[1]]} label={n[0]} onToggle={() => setNotif((p) => ({ ...p, [n[1]]: !p[n[1]] }))} />, n[1]))}
        </div>
        <div className="m-eyebrow">Account</div>
        <div className="m-list">
          <button className="m-lrow" onClick={() => mPush("profile", {})}><span className="m-lrow-ic"><MIcon name="user" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t">Profile</div><div className="m-lrow-s">E. Sørensen · Shift Supervisor</div></div><MIcon name="chevron-right" size={18} color="var(--slate-400)" /></button>
          <button className="m-lrow" onClick={() => mConfirm({ title: "Sign out?", body: "You will be returned to the login screen. Any queued offline actions will be lost.", danger: true, onConfirm: () => mToast("Signed out", "log-out") })}><span className="m-lrow-ic" style={{ background: "var(--critical-bg)", color: "var(--critical-text)" }}><MIcon name="log-out" size={18} /></span><div className="m-lrow-main"><div className="m-lrow-t" style={{ color: "var(--critical-text)" }}>Sign out</div></div></button>
        </div>
      </div></PullScroll>
    </React.Fragment>
  );
}

Object.assign(window, { TankListScreen, TankScreen, EquipRow, EquipmentScreen, ConfirmSheet, mConfirm, NoteComposeSheet, mNewNote, ChartScreen,
  NavigationScreen, ActivityScreen, mActivity, activityStore, NotifRow, MoreScreen, ProfileScreen, FeedingScreen, Phase2Screen, SearchSheet, ScanScreen,
  mRecentStore, useMRecent,
  BiologyScreen, SettingsScreen, scanStore });
