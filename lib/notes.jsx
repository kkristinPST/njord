// notes.jsx — system-wide Notes register (loaded after dialogs.jsx / trends.jsx).
// One shared store: every note carries the equipment it belongs to (tag + name + area),
// so the same notes appear both in the top-bar Notes dialog (all equipment) and on an
// equipment popup's Notes tab (filtered to that unit). Persisted to localStorage.

const NOTES_LS = "nj_notes_v1";
const NOTES_SEEN = "nj_notes_seen_v1";
function notesFmt(d) {
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", "");
}

// a note may or may not be about a piece of equipment (tag set = equipment note)
const NOTES_SEED = [
  { id: "n0", type: "handover", tag: "", name: "", area: "DPT1 · Day shift", header: "Shift handover, 06:00", text: "Tank 2 running over planned capacity; O₂ setpoint raised and feed screw output reduced. Keep an eye on emergency O₂ opening. Drum filter ΔP nominal. No outstanding critical alarms handed over.", by: "E. Sørensen", ts: "04 Mar 2026 06:02", archived: false },
  { id: "n01", type: "general", tag: "", name: "", area: "Facility", header: "Feed delivery Wednesday", text: "New feed pallet (Aller Infinity) arriving Wednesday AM, clear space in the feed room and update feed tables if pellet size changes.", by: "K. Berg", ts: "03 Mar 2026 16:40", archived: false },
  { id: "n1", type: "equipment", tag: "DPT1-FIL0", name: "Drum filter", area: "Water Treatment · DPT1", header: "Backwash nozzle seal replaced", text: "Replaced backwash nozzle seal, monitor ΔP over the next few cycles.", by: "M. Haugen", ts: "27 May 2025 11:24", archived: false },
  { id: "n2", type: "maintenance", tag: "DPT1-SMP0-PU1", name: "Lift pump 1", area: "Pump Sump · DPT1", header: "Bearing noise on start", text: "Slight bearing noise noted on cold start; scheduled for inspection next maintenance window.", by: "E. Sørensen", ts: "26 May 2025 09:10", archived: false },
  { id: "n3", type: "maintenance", tag: "AEB0-BL1", name: "MBBR blower 1", area: "MBBR · DPT1", header: "Air filter changed", text: "Inlet air filter replaced. Differential pressure back to nominal.", by: "T. Nilsen", ts: "24 May 2025 15:47", archived: false },
  { id: "n4", type: "equipment", tag: "DPT2-FTA2", name: "Fish Tank 2", area: "Feeding · DPT2", header: "Feed screw intermittent", text: "Feed screw tripping intermittently under load, electrician notified, spare ordered.", by: "K. Berg", ts: "22 May 2025 07:32", archived: false },
  { id: "n5", type: "maintenance", tag: "STR0-FAN", name: "CO₂ stripper fan", area: "RAS · DPT1", header: "Vibration within limits", text: "Post-service vibration check completed, readings within limits.", by: "System", ts: "19 May 2025 08:02", archived: true },
  { id: "n6", type: "equipment", tag: "DPT1-FIL0", name: "Drum filter", area: "Water Treatment · DPT1", header: "Drive firmware updated", text: "Drive firmware updated to v2.4.1.", by: "System", ts: "12 May 2025 08:00", archived: true },
  { id: "n7", type: "equipment", tag: "DOX0", name: "Oxygenation cone", area: "RAS · DPT1", header: "Setpoint raised for grading", text: "O₂ setpoint temporarily raised ahead of grading; revert after operation.", by: "E. Sørensen", ts: "10 May 2025 13:19", archived: false },
];

function notesLoad() {
  try {
    const r = JSON.parse(localStorage.getItem(NOTES_LS));
    if (Array.isArray(r)) { return r; }
  } catch (e) {}
  return NOTES_SEED.slice();
}
function notesSeenLoad() {
  try { const r = JSON.parse(localStorage.getItem(NOTES_SEEN)); if (Array.isArray(r)) return r; } catch (e) {}
  return null;
}
const notesStore = {
  rows: notesLoad(), seen: null, subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); this.persist(); },
  persist() { try { localStorage.setItem(NOTES_LS, JSON.stringify(this.rows)); } catch (e) {} },
  add(note) {
    const now = new Date();
    this.rows = [Object.assign({ id: "n" + Date.now(), by: "E. Sørensen", ts: notesFmt(now), archived: false }, note)].concat(this.rows);
    this.emit();
  },
  setArchived(id, val) { this.rows = this.rows.map((n) => (n.id === id ? Object.assign({}, n, { archived: val }) : n)); this.emit(); },
  forEquip(tag) { return this.rows.filter((n) => n.tag === tag); },
  // "new since last login" — ids of active notes the operator has not yet seen
  newIds() {
    const active = this.rows.filter((n) => !n.archived);
    if (this.seen == null) return active.slice(0, 2).map((n) => n.id); // first run: surface the two newest
    const s = new Set(this.seen);
    return active.filter((n) => !s.has(n.id)).map((n) => n.id);
  },
  markAllSeen() { this.seen = this.rows.map((n) => n.id); this.emit(); },
};
function useNotes() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => notesStore.sub(force), []);
  return notesStore;
}

// ── note row / list shared between the dialog and the equipment tab ──
function NoteCard({ n, onArchive, onRestore, showEquip }) {
  return (
    <div className={"note-card" + (n.archived ? " note-arch" : "")}>
      <div className="note-card-top">
        <div className="note-card-hd">
          {n.header && <span className="note-card-header">{n.header}</span>}
          <p className="note-card-text">{n.text}</p>
        </div>
        {n.archived
          ? <button className="btn btn-ghost btn-sm note-act" onClick={onRestore}><Icon name="rotate-ccw" size={12} /> Restore</button>
          : <button className="btn btn-ghost btn-sm note-act" onClick={onArchive}><Icon name="archive" size={12} /> Archive</button>}
      </div>
      <div className="note-card-foot">
        {showEquip && n.tag
          ? <button className="note-eqlink" title="Open equipment" onClick={() => window.openEquipment && window.openEquipment(n.tag)}><Icon name="box" size={12} /> {n.name} <span className="tag">{n.tag}</span></button>
          : (n.area ? <span className="note-scope"><Icon name="map-pin" size={12} /> {n.area}</span> : null)}
        <span className="note-meta"><Icon name="user" size={12} /> {n.by} · {n.ts}</span>
      </div>
    </div>
  );
}

// ── new-note form (used in both dialog and equipment tab) ──
function NoteComposer({ fixedEquip, onSaved }) {
  const store = notesStore;
  const equipList = React.useMemo(() => {
    const seen = {}; const out = [];
    store.rows.forEach((n) => { if (n.tag && !seen[n.tag]) { seen[n.tag] = 1; out.push({ tag: n.tag, name: n.name, area: n.area }); } });
    (window.EQUIP ? Object.keys(window.EQUIP) : []).forEach((t) => { if (!seen[t]) { seen[t] = 1; const e = window.EQUIP[t]; out.push({ tag: t, name: e.name || t, area: e.area || "" }); } });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [store.rows.length]);
  const [header, setHeader] = React.useState("");
  const [text, setText] = React.useState("");
  const [attach, setAttach] = React.useState(!!fixedEquip);
  const [tag, setTag] = React.useState(fixedEquip ? fixedEquip.tag : (equipList[0] ? equipList[0].tag : ""));
  const needsEquip = attach && !fixedEquip;
  const canSave = text.trim() && (!needsEquip || tag);
  const save = () => {
    if (!canSave) return;
    let note;
    if (fixedEquip || attach) {
      const eq = fixedEquip || equipList.find((e) => e.tag === tag) || { tag, name: tag, area: "" };
      note = { tag: eq.tag, name: eq.name, area: eq.area, header: header.trim(), text: text.trim() };
      njToast("Note added to " + eq.name + ".");
    } else {
      note = { tag: "", name: "", area: "", header: header.trim(), text: text.trim() };
      njToast("Note added.");
    }
    store.add(note);
    setHeader(""); setText("");
    onSaved && onSaved();
  };
  return (
    <div className="note-form">
      {!fixedEquip && (
        <label className="note-attach">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} />
          <span>Link this note to a piece of equipment</span>
        </label>
      )}
      {needsEquip && (
        <label className="note-field">
          <span className="note-field-l">Equipment</span>
          <select className="nj-select" value={tag} onChange={(e) => setTag(e.target.value)}>
            {equipList.map((e) => <option key={e.tag} value={e.tag}>{e.name} · {e.tag}{e.area ? " · " + e.area : ""}</option>)}
          </select>
        </label>
      )}
      <label className="note-field">
        <span className="note-field-l">Header <span className="note-opt">(optional)</span></span>
        <input className="oos-input" value={header} onChange={(e) => setHeader(e.target.value)} placeholder="Short title" />
      </label>
      <label className="note-field">
        <span className="note-field-l">Note</span>
        <textarea className="oos-input note-ta" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the deviation or information…" />
      </label>
      <div className="note-form-foot">
        <button className="btn btn-primary" disabled={!canSave} onClick={save}><Icon name="plus" size={15} /> Save note</button>
      </div>
    </div>
  );
}

// ── compact clickable row (list view) ──
function NoteRow({ n, isNew, onOpen }) {
  return (
    <button className={"note-row" + (n.archived ? " arch" : "")} onClick={onOpen}>
      <div className="note-row-main">
        <div className="note-row-top">
          {isNew && <span className="note-newdot">NEW</span>}
          {n.header && <span className="note-row-header">{n.header}</span>}
        </div>
        <p className="note-row-text">{n.text}</p>
        <div className="note-row-meta">
          {n.tag ? <span className="tag">{n.tag}</span> : (n.area ? <span className="note-row-scope">{n.area}</span> : null)}
          <span className="note-row-by">{n.by} · {n.ts}</span>
        </div>
      </div>
      <Icon name="chevron-right" size={16} color="var(--slate-300)" />
    </button>
  );
}

// ── full note detail (drill-in) ──
function NoteDetail({ n, onBack }) {
  const store = notesStore;
  return (
    <div className="note-detail">
      <button className="note-back" onClick={onBack}><Icon name="arrow-left" size={15} /> Back to notes</button>
      {n.archived && (
        <div className="note-detail-head">
          <span className="note-archived-chip"><Icon name="archive" size={11} /> Archived</span>
        </div>
      )}
      {n.header && <h3 className="note-detail-title">{n.header}</h3>}
      <div className="note-detail-body"><p>{n.text}</p></div>
      <div className="note-detail-foot">
        {n.tag
          ? <button className="note-eqlink" onClick={() => window.openEquipment && window.openEquipment(n.tag)}><Icon name="box" size={13} /> {n.name} <span className="tag">{n.tag}</span></button>
          : (n.area ? <span className="note-scope"><Icon name="map-pin" size={13} /> {n.area}</span> : <span />)}
        <span className="note-meta"><Icon name="user" size={13} /> {n.by} · {n.ts}</span>
      </div>
      <div className="note-detail-actions">
        {n.archived
          ? <button className="btn btn-secondary btn-sm" onClick={() => { store.setArchived(n.id, false); onBack(); }}><Icon name="rotate-ccw" size={13} /> Restore</button>
          : <button className="btn btn-secondary btn-sm" onClick={() => { store.setArchived(n.id, true); onBack(); }}><Icon name="archive" size={13} /> Archive</button>}
      </div>
    </div>
  );
}

// ── system-wide Notes dialog (top-bar) ──
function NotesDialog() {
  const store = useNotes();
  const [sub, setSub] = React.useState("active");
  const [q, setQ] = React.useState("");
  const [openId, setOpenId] = React.useState(null);
  React.useEffect(() => { store.markAllSeen(); }, []); // opening the register clears "new"
  const ql = q.trim().toLowerCase();
  const match = (n) => !ql || [n.header, n.text, n.name, n.tag, n.area, n.by].filter(Boolean).join(" ").toLowerCase().includes(ql);
  const active = store.rows.filter((n) => !n.archived && match(n));
  const archived = store.rows.filter((n) => n.archived && match(n));
  const newSet = React.useMemo(() => new Set(store.newIds()), []);
  const tabs = [
    { id: "active", label: "Active", icon: "sticky-note", n: store.rows.filter((n) => !n.archived).length },
    { id: "archived", label: "Archived", icon: "archive", n: store.rows.filter((n) => n.archived).length },
    { id: "new", label: "New note", icon: "plus" },
  ];
  const list = sub === "archived" ? archived : active;
  const openNote = openId ? store.rows.find((n) => n.id === openId) : null;
  const goSub = (id) => { setSub(id); setOpenId(null); };
  return (
    <Dialog width={720}>
      <DlgHeader icon="notebook-pen" name="Notes" onClose={closeDialog} />
      <div className="dlg-body notes-body">
        {openNote ? (
          <NoteDetail n={openNote} onBack={() => setOpenId(null)} />
        ) : (
          <React.Fragment>
            <div className="notes-bar">
              <div className="segmented notes-tabs">
                {tabs.map((t) => (
                  <button key={t.id} className={"seg" + (t.id === sub ? " active" : "")} onClick={() => goSub(t.id)}>
                    <Icon name={t.icon} size={13} /> {t.label}{t.n != null && t.n > 0 ? <span className="note-badge">{t.n}</span> : null}
                  </button>
                ))}
              </div>
              {sub !== "new" && (
                <div className="notes-search">
                  <Icon name="search" size={14} color="var(--slate-400)" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes, equipment, author…" />
                </div>
              )}
            </div>
            {sub === "new"
              ? <NoteComposer onSaved={() => goSub("active")} />
              : (list.length === 0
                  ? <div className="notes-empty"><Icon name="notebook-pen" size={26} color="var(--slate-300)" /><span>No {sub} notes{ql ? " match your search" : ""}.</span></div>
                  : <div className="notes-list">
                      {list.map((n) => <NoteRow key={n.id} n={n} isNew={newSet.has(n.id)} onOpen={() => setOpenId(n.id)} />)}
                    </div>)}
          </React.Fragment>
        )}
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><Icon name="notebook-pen" size={13} /> {store.rows.length} notes</span>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}
function openNotes() { openDialog(<NotesDialog />); }

Object.assign(window, { notesStore, useNotes, NoteCard, NoteRow, NoteDetail, NoteComposer, NotesDialog, openNotes });
