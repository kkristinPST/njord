// data-entry.jsx — Manual Data Entry (Analytics · Data Entry tab).
// Manual measurement "tags" organised by PATH (folders are path groups — no tree view).
// Table-first: New Tag, per-row Record value (the core manual-entry action), inline detail
// drawer with value history, and send-to-trend. Persists to localStorage.

const DE_KEY = "nj_manual_tags_v1";
const DE_FKEY = "nj_manual_folders_v1";
const DE_DEPTS = ["Operations", "Feeding", "Quality Control", "Maintenance", "Water Treatment"];
const DE_BUILDINGS = ["DPT 1", "DPT 2", "DPT 3", "DPT 4", "Building 1", "Building 3"];

const DE_SEED = [
  { id: "mt1", path: "Manual Measurements / DPT 1", name: "Water Temperature", value: "14.5", unit: "°C", decimals: 1, min: 10, max: 18, building: "DPT 1", department: "Operations",
    history: [{ value: "14.5", comment: "Morning round", ts: "05.03.2026, 08:10" }, { value: "14.2", comment: "", ts: "04.03.2026, 08:05" }] },
  { id: "mt2", path: "Manual Measurements / DPT 1", name: "Oxygen Level", value: "8.2", unit: "mg/L", decimals: 1, min: 6, max: 12, alHi: 12, alLo: 6, alLoLo: 5, building: "DPT 1", department: "Operations",
    history: [{ value: "8.2", comment: "", ts: "05.03.2026, 08:12" }] },
  { id: "mt3", path: "Manual Measurements / DPT 1", name: "pH Level", value: "7.2", unit: "", decimals: 1, min: 6.5, max: 8.5, alHiHi: 8.5, alHi: 8, alLo: 6.8, alLoLo: 6.5, building: "DPT 1", department: "Operations",
    history: [{ value: "7.2", comment: "", ts: "05.03.2026, 08:13" }] },
  { id: "mt4", path: "Manual Measurements / DPT 1", name: "Biomass", value: "12500", unit: "kg", decimals: 0, min: null, max: null, building: "DPT 1", department: "Operations",
    history: [{ value: "12500", comment: "Post-grading estimate", ts: "03.03.2026, 15:40" }] },
  { id: "mt4b", path: "Manual Measurements / DPT 1 / Tank 1", name: "Tank 1 Temperature", value: "14.6", unit: "°C", decimals: 1, min: 10, max: 18, building: "DPT 1", department: "Operations",
    history: [{ value: "14.6", comment: "", ts: "05.03.2026, 08:15" }] },
  { id: "mt4c", path: "Manual Measurements / DPT 1 / Tank 1", name: "Tank 1 Oxygen", value: "8.4", unit: "mg/L", decimals: 1, min: 6, max: 12, building: "DPT 1", department: "Operations",
    history: [{ value: "8.4", comment: "", ts: "05.03.2026, 08:16" }] },
  { id: "mt5", path: "Manual Measurements / DPT 2", name: "Water Temperature", value: "15.1", unit: "°C", decimals: 1, min: 10, max: 18, building: "DPT 2", department: "Operations",
    history: [{ value: "15.1", comment: "", ts: "05.03.2026, 08:20" }] },
  { id: "mt6", path: "Manual Measurements / DPT 2", name: "Feed Amount", value: "45.5", unit: "kg", decimals: 1, min: null, max: null, building: "DPT 4", department: "Feeding",
    history: [{ value: "45.5", comment: "Afternoon feeding", ts: "01.06.2024, 14:00" }, { value: "45", comment: "Morning feeding", ts: "01.06.2024, 08:00" }] },
  { id: "mt7", path: "Water Quality Reports", name: "Salinity", value: "32.5", unit: "ppt", decimals: 1, min: 30, max: 35, building: "", department: "Quality Control",
    history: [{ value: "32.5", comment: "", ts: "05.03.2026, 09:00" }] },
  { id: "mt8", path: "Water Quality Reports", name: "Turbidity", value: "Clear", unit: "", decimals: null, min: null, max: null, building: "", department: "Quality Control",
    history: [{ value: "Clear", comment: "Visual check", ts: "05.03.2026, 09:02" }] },
  { id: "mt9", path: "Maintenance Logs", name: "Filter Status", value: "Clean", unit: "", decimals: null, min: null, max: null, building: "", department: "Maintenance",
    history: [{ value: "Clean", comment: "Backwash completed", ts: "04.03.2026, 22:15" }] },
];

/* A stored record predates any field added to DE_SEED later, and load() restores the persisted
   array wholesale — so alarm limits added to the seed would never reach a browser that had
   already opened the module. Merge missing keys in from the seed by id, per field, without
   touching anything the operator has actually set. Additive only: never overwrite a stored value. */
function deMigrate(stored) {
  if (!Array.isArray(stored)) return DE_SEED.map((t) => ({ ...t }));
  return stored.map((t) => {
    const seed = DE_SEED.find((s) => s.id === t.id);
    if (!seed) return t;
    const out = { ...t };
    Object.keys(seed).forEach((k) => { if (!(k in out)) out[k] = seed[k]; });
    return out;
  });
}

const deStore = {
  tags: null,
  folders: null,
  subs: new Set(),
  load() {
    if (deStore.tags) return;
    try { const raw = localStorage.getItem(DE_KEY); deStore.tags = raw ? deMigrate(JSON.parse(raw)) : DE_SEED.map((t) => ({ ...t })); }
    catch (e) { deStore.tags = DE_SEED.map((t) => ({ ...t })); }
    try { const raw = localStorage.getItem(DE_FKEY); deStore.folders = raw ? JSON.parse(raw) : [...new Set(deStore.tags.map((t) => t.path))].sort(); }
    catch (e) { deStore.folders = [...new Set(deStore.tags.map((t) => t.path))].sort(); }
  },
  persist() { try { localStorage.setItem(DE_KEY, JSON.stringify(deStore.tags)); localStorage.setItem(DE_FKEY, JSON.stringify(deStore.folders)); } catch (e) {} deStore.subs.forEach((f) => f()); },
  subscribe(f) { deStore.subs.add(f); return () => deStore.subs.delete(f); },
  tagsSnap() { deStore.load(); return deStore.tags; },
  foldersSnap() { deStore.load(); return deStore.folders; },
  ensureFolder(path) { if (path && !deStore.folders.includes(path)) deStore.folders = [...deStore.folders, path].sort(); },
  addFolder(path) { deStore.load(); deStore.ensureFolder(path); deStore.persist(); },
  removeFolder(path) { deStore.load(); deStore.folders = deStore.folders.filter((p) => p !== path); deStore.persist(); },
  renameFolder(src, dest) {
    deStore.load();
    const under = (p) => p === src || p.startsWith(src + " / ");
    const remap = (p) => dest + p.slice(src.length);
    deStore.folders = [...new Set(deStore.folders.map((p) => (under(p) ? remap(p) : p)))].sort();
    deStore.tags = deStore.tags.map((t) => (under(t.path) ? { ...t, path: remap(t.path) } : t));
    deStore.persist();
  },
  removeFolderDeep(path) {
    deStore.load();
    const under = (p) => p === path || p.startsWith(path + " / ");
    deStore.folders = deStore.folders.filter((p) => !under(p));
    deStore.tags = deStore.tags.filter((t) => !under(t.path));
    deStore.persist();
  },
  duplicateFolder(src, dest) {
    deStore.load();
    const under = (p) => p === src || p.startsWith(src + " / ");
    const remap = (p) => dest + p.slice(src.length);
    const now = new Date();
    const ts = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newFolders = deStore.folders.filter(under).map(remap);
    const newTags = deStore.tags.filter((t) => under(t.path)).map((t, i) => ({ ...t, id: "mt" + Date.now() + "_" + i, path: remap(t.path), history: [{ value: t.value, comment: `Duplicated from ${src}`, ts }] }));
    deStore.folders = [...new Set([...deStore.folders, dest, ...newFolders])].sort();
    deStore.tags = [...deStore.tags, ...newTags];
    deStore.persist();
  },
  add(tag) { deStore.load(); deStore.tags = [...deStore.tags, tag]; deStore.ensureFolder(tag.path); deStore.persist(); },
  update(id, patch) { deStore.load(); deStore.tags = deStore.tags.map((t) => (t.id === id ? { ...t, ...patch } : t)); if (patch.path) deStore.ensureFolder(patch.path); deStore.persist(); },
  remove(id) { deStore.load(); deStore.tags = deStore.tags.filter((t) => t.id !== id); deStore.persist(); },
  duplicateTag(id) {
    deStore.load();
    const t = deStore.tags.find((x) => x.id === id); if (!t) return;
    const copy = { ...t, id: "mt" + Date.now(), name: t.name + " (copy)", history: (t.history || []).slice(0, 1) };
    const idx = deStore.tags.findIndex((x) => x.id === id);
    deStore.tags = [...deStore.tags.slice(0, idx + 1), copy, ...deStore.tags.slice(idx + 1)];
    deStore.persist();
  },
  moveTag(id, path) { deStore.load(); deStore.tags = deStore.tags.map((t) => (t.id === id ? { ...t, path } : t)); deStore.ensureFolder(path); deStore.persist(); },
  // ts is the reading's own timestamp — optional, defaults to now. A reading is often written down
  // at the tank and typed in later, so the operator must be able to say when it was actually taken.
  // A recorded value past an alarm limit RAISES an alarm — that is what separates the limits from
  // the expected range. One entry per recorded value; the toast names the limit crossed.
  raiseIfAlarm(tag, value, ts) {
    const c = deLimitCross(tag, parseFloat(value));
    if (!c) return null;
    njToast(`${c.level === "critical" ? "Critical" : "High"} alarm raised · ${tag.name} ${value}${tag.unit ? " " + tag.unit : ""} past ${c.name.toLowerCase()} limit ${tag[c.k]}`, "Alarms", () => { if (window.__njNavigate) window.__njNavigate("alarms"); });
    return c;
  },
  record(id, value, comment, ts) {
    deStore.load();
    const stamp = ts || deTsNow();
    deStore.tags = deStore.tags.map((t) => (t.id === id ? { ...t, value, history: [{ value, comment: comment || "", ts: stamp }, ...(t.history || [])] } : t));
    deStore.persist();
    const tag = deStore.tags.find((t) => t.id === id);
    if (tag) deStore.raiseIfAlarm(tag, value, stamp);
  },
  // one round of readings, one timestamp, one write — the table view's save
  recordMany(entries, ts) {
    deStore.load();
    const stamp = ts || deTsNow();
    const by = {};
    entries.forEach((e) => { by[e.id] = e; });
    deStore.tags = deStore.tags.map((t) => {
      const e = by[t.id];
      if (!e) return t;
      return { ...t, value: e.value, history: [{ value: e.value, comment: e.comment || "", ts: stamp }, ...(t.history || [])] };
    });
    deStore.persist();
    // one toast per crossing, so a round that trips two limits reports both
    entries.forEach((e) => { const t = deStore.tags.find((x) => x.id === e.id); if (t) deStore.raiseIfAlarm(t, e.value, stamp); });
  },
};
function useManualTags() { return React.useSyncExternalStore(deStore.subscribe, deStore.tagsSnap); }
function useManualFolders() { return React.useSyncExternalStore(deStore.subscribe, deStore.foldersSnap); }

const deNum = (t) => { const n = parseFloat(t.value); return isNaN(n) ? null : n; };const deIsNumeric = (t) => deNum(t) != null;
const deFmtRange = (t) => (t.min == null && t.max == null) ? "—" : `${t.min == null ? "—" : t.min}…${t.max == null ? "—" : t.max}${t.unit ? " " + t.unit : ""}`;
function deOutOfRange(t) { const n = deNum(t); if (n == null) return false; return (t.min != null && n < t.min) || (t.max != null && n > t.max); }

/* ── Alarm limits are SEPARATE from min/max. ──
   min/max is the expected range — guidance for the person typing. The four alarm limits raise a
   real alarm when a recorded value crosses them, and when a measurement has any of them they are
   what the in-range indicator reads. A measurement can carry one set, both, or neither. */
const DE_LIMITS = [
  { k: "alHiHi", kind: "hihi", label: "HH", name: "High high", level: "critical", cmp: (n, v) => n > v },
  { k: "alHi", kind: "hi", label: "H", name: "High", level: "high", cmp: (n, v) => n > v },
  { k: "alLo", kind: "lo", label: "L", name: "Low", level: "high", cmp: (n, v) => n < v },
  { k: "alLoLo", kind: "lolo", label: "LL", name: "Low low", level: "critical", cmp: (n, v) => n < v },
];
const deHasLimits = (t) => DE_LIMITS.some((l) => t[l.k] != null);
// worst limit a value crosses — critical outranks high, so HH wins over H
function deLimitCross(t, n) {
  if (n == null || isNaN(n)) return null;
  const hit = DE_LIMITS.filter((l) => t[l.k] != null && l.cmp(n, t[l.k]));
  if (!hit.length) return null;
  return hit.find((l) => l.level === "critical") || hit[0];
}
const deFmtLimits = (t) => DE_LIMITS.filter((l) => t[l.k] != null).map((l) => l.label + " " + t[l.k]).join(" · ") || "—";
/* The limits cell was one mono string, so HH / H / L / LL read as data alongside the numbers and
   the whole cell turned into an undifferentiated block. The system's split applies here as much as
   anywhere: the LIMIT NAME is a label (sans, badge weight, muted) and only the THRESHOLD is mono.
   deFmtLimits stays as-is for tooltips and the record dialog, where it is a single line of text. */
function DeLimits({ t }) {
  const set = DE_LIMITS.filter((l) => t[l.k] != null);
  if (!set.length) return null;
  return (
    <span className="de-lims">
      {set.map((l) => (
        <span key={l.k} className={"de-lim de-lim-" + l.level}>
          <span className="de-lim-l">{l.label}</span>
          <span className="de-lim-v">{t[l.k]}</span>
        </span>
      ))}
    </span>
  );
}
const deHasRange = (t) => t.min != null || t.max != null;
/* The dash is a CELL glyph for "no value here", never a word in a sentence: splicing it into a
   tooltip produced "expected range —". Every prose call site asks these two first and says the
   absence in words instead. */
const deRangeText = (t) => (deHasRange(t) ? "expected range " + deFmtRange(t) : "no expected range set");
const deLimitsTitle = (t) => (deHasLimits(t) ? "Alarm limits " + deFmtLimits(t) : "No alarm limits");
function deState(t) {
  const n = deNum(t);
  if (deHasLimits(t)) {
    const c = deLimitCross(t, n);
    return c ? { kind: "alarm", level: c.level, label: c.name + " alarm" } : { kind: "ok", label: "In range" };
  }
  if (t.min != null || t.max != null) return deOutOfRange(t) ? { kind: "oor", label: "Out of range" } : { kind: "ok", label: "In range" };
  return null;
}

/* ── timestamps. The app's display format is DD.MM.YYYY, HH:MM; the <input>s want ISO parts. ── */
const dePad = (n) => String(n).padStart(2, "0");
const deTsOf = (d) => `${dePad(d.getDate())}.${dePad(d.getMonth() + 1)}.${d.getFullYear()}, ${dePad(d.getHours())}:${dePad(d.getMinutes())}`;
const deTsNow = () => deTsOf(new Date());
const deDateInput = (d) => `${d.getFullYear()}-${dePad(d.getMonth() + 1)}-${dePad(d.getDate())}`;
const deTimeInput = (d) => `${dePad(d.getHours())}:${dePad(d.getMinutes())}`;
function deTsParse(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, mi] = (timeStr || "00:00").split(":").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, h || 0, mi || 0);
  return isNaN(dt.getTime()) ? null : dt;
}

/* ── when the reading was taken — shared by the Add value dialog and the table view ── */
function DeWhen({ date, time, onDate, onTime, label = "Reading taken" }) {
  const dt = deTsParse(date, time);
  const future = dt && dt.getTime() > Date.now() + 60000;
  return (
    <div className="de-when">
      <span className="de-field-l">{label}</span>
      <div className="de-when-row">
        <input className="de-input de-when-d" type="date" value={date} onChange={(e) => onDate(e.target.value)} aria-label={label + " · date"} />
        <input className="de-input de-when-t" type="time" value={time} onChange={(e) => onTime(e.target.value)} aria-label={label + " · time"} />
        <button type="button" className="linkbtn de-when-now" onClick={() => { const n = new Date(); onDate(deDateInput(n)); onTime(deTimeInput(n)); }}>Now</button>
      </div>
      {future && <span className="de-when-warn"><Icon name="alert-triangle" size={12} /> That is in the future. The reading will be stamped as written.</span>}
    </div>
  );
}

/* ── field primitives ── */
function DeField({ label, hint, children }) {
  return (
    <label className="de-field">
      <span className="de-field-l">{label}</span>
      {children}
      {hint && <span className="de-field-hint">{hint}</span>}
    </label>
  );
}

/* ── Add / Edit tag dialog ── */
function TagDialog({ tag, existingPaths, seedPath }) {
  const editing = !!tag;
  const [f, setF] = React.useState(() => tag
    ? { path: tag.path, name: tag.name, value: tag.value, unit: tag.unit || "", decimals: tag.decimals == null ? "" : String(tag.decimals), min: tag.min == null ? "" : String(tag.min), max: tag.max == null ? "" : String(tag.max), alHiHi: tag.alHiHi == null ? "" : String(tag.alHiHi), alHi: tag.alHi == null ? "" : String(tag.alHi), alLo: tag.alLo == null ? "" : String(tag.alLo), alLoLo: tag.alLoLo == null ? "" : String(tag.alLoLo), building: tag.building || "", department: tag.department || "", comment: "" }
    : { path: seedPath || "", name: "", value: "", unit: "", decimals: "", min: "", max: "", alHiHi: "", alHi: "", alLo: "", alLoLo: "", building: "", department: "", comment: "" });
  const [showCtx, setShowCtx] = React.useState(editing);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.path.trim() && f.name.trim() && f.value.trim();
  const parseN = (v) => (v.trim() === "" ? null : (isNaN(parseFloat(v)) ? null : parseFloat(v)));
  const save = () => {
    const base = { path: f.path.trim(), name: f.name.trim(), value: f.value.trim(), unit: f.unit.trim(), decimals: f.decimals.trim() === "" ? null : parseInt(f.decimals, 10), min: parseN(f.min), max: parseN(f.max), alHiHi: parseN(f.alHiHi), alHi: parseN(f.alHi), alLo: parseN(f.alLo), alLoLo: parseN(f.alLoLo), building: f.building.trim(), department: f.department.trim() };
    if (editing) { deStore.update(tag.id, base); njToast(`Tag "${base.name}" updated.`); }
    else {
      deStore.add({ id: "mt" + Date.now(), ...base, history: [{ value: base.value, comment: f.comment.trim(), ts: deTsNow() }] });
      njToast(`Tag "${base.name}" created in ${base.path}.`);
    }
    closeDialog();
  };
  return (
    <Dialog width={560}>
      <DlgHeader icon={editing ? "pencil" : "plus"} name={editing ? "Edit tag" : "New tag"} onClose={closeDialog} />
      <div className="dlg-body de-form">
        <DeField label="Folder path" hint="Type a new path to create a folder, or pick an existing one">
          <input className="de-input" list="de-paths" placeholder="Manual Measurements / DPT 1" value={f.path} onChange={(e) => set("path", e.target.value)} />
          <datalist id="de-paths">{existingPaths.map((p) => <option key={p} value={p} />)}</datalist>
        </DeField>
        <div className="de-form-2col">
          <DeField label="Name"><input className="de-input" placeholder="Enter tag name" value={f.name} onChange={(e) => set("name", e.target.value)} /></DeField>
          <DeField label={editing ? "Current value" : "Initial value"}><input className="de-input data" placeholder="Enter value" value={f.value} onChange={(e) => set("value", e.target.value)} /></DeField>
        </div>
        <div className="de-form-2col">
          <DeField label="Unit"><input className="de-input" placeholder="°C, mg/L…" value={f.unit} onChange={(e) => set("unit", e.target.value)} /></DeField>
          <DeField label="Decimals"><input className="de-input data" type="number" min="0" placeholder="1" value={f.decimals} onChange={(e) => set("decimals", e.target.value)} /></DeField>
        </div>
        <div className="de-form-2col">
          <DeField label="Min" hint="Expected range, guidance only"><input className="de-input data" placeholder="—" value={f.min} onChange={(e) => set("min", e.target.value)} /></DeField>
          <DeField label="Max" hint="Never raises an alarm"><input className="de-input data" placeholder="—" value={f.max} onChange={(e) => set("max", e.target.value)} /></DeField>
        </div>
        <div className="de-form-sect">
          <span className="eyebrow">Alarm limits</span>
          <span className="de-form-hint">Separate from the expected range: a recorded value past one of these raises an alarm, and when any limit is set these drive the in-range indicator.</span>
        </div>
        <div className="de-form-4col">
          {DE_LIMITS.map((l) => (
            <DeField key={l.k} label={l.name}>
              <input className="de-input data" placeholder="—" value={f[l.k]} onChange={(e) => set(l.k, e.target.value)} />
            </DeField>
          ))}
        </div>
        {!editing && (
          <DeField label="Comment (optional)"><textarea className="de-input de-ta" rows={2} placeholder="Add a note about this value…" value={f.comment} onChange={(e) => set("comment", e.target.value)} /></DeField>
        )}
        <button className="de-ctx-toggle" onClick={() => setShowCtx((s) => !s)}>
          <Icon name={showCtx ? "minus" : "plus"} size={14} /> {showCtx ? "Hide" : "Show"} optional context fields
        </button>
        {showCtx && (
          <div className="de-form-2col">
            <DeField label="Building (optional)">
              <input className="de-input" list="de-buildings" placeholder="e.g. Building 1, DPT 3" value={f.building} onChange={(e) => set("building", e.target.value)} />
              <datalist id="de-buildings">{DE_BUILDINGS.map((b) => <option key={b} value={b} />)}</datalist>
            </DeField>
            <DeField label="Department (optional)">
              <input className="de-input" list="de-depts" placeholder="e.g. Operations, Maintenance" value={f.department} onChange={(e) => set("department", e.target.value)} />
              <datalist id="de-depts">{DE_DEPTS.map((d) => <option key={d} value={d} />)}</datalist>
            </DeField>
          </div>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} /> {editing ? "Save" : "Create"}</button>
      </div>
    </Dialog>
  );
}

/* ── Add value dialog — the ONE manual-entry surface on the desktop (the phone has
   MDeRecordSheet). Reached from the row, the tag detail dialog and the tag's overflow menu. ── */
function RecordValueDialog({ tag }) {
  const numeric = deIsNumeric(tag);
  const hist = (tag.history || []).slice(0, 3);
  const [value, setValue] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [date, setDate] = React.useState(() => deDateInput(new Date()));
  const [time, setTime] = React.useState(() => deTimeInput(new Date()));
  const num = parseFloat(value);
  const oor = numeric && value.trim() !== "" && !isNaN(num) && ((tag.min != null && num < tag.min) || (tag.max != null && num > tag.max));
  const cross = value.trim() === "" ? null : deLimitCross(tag, num);
  const valid = value.trim() !== "";
  const save = () => {
    const dt = deTsParse(date, time);
    deStore.record(tag.id, value.trim(), comment.trim(), dt ? deTsOf(dt) : null);
    njToast(`Added ${value.trim()}${tag.unit ? " " + tag.unit : ""} to ${tag.name}.`, numeric ? "Trends" : null, numeric ? () => njSendToTrend(tag.name, { name: tag.name, unit: tag.unit, value: num, group: "Manual" }) : null);
    closeDialog();
  };
  return (
    <Dialog width={444}>
      <DlgHeader icon="plus" name={"Add value · " + tag.name} onClose={closeDialog} />
      <div className="dlg-body de-rec">
        <div className="de-rec-meta">
          <div className="de-rec-path">{tag.path}</div>
          <div className="de-rec-cur"><span className="de-rec-lbl">Last value</span><span className="data">{tag.value}{tag.unit ? <span className="de-u"> {tag.unit}</span> : null}</span>{hist[0] && <span className="de-rec-ts data">{hist[0].ts}</span>}</div>
        </div>
        <DeField label="New value">
          <div className="de-rec-inwrap">
            <input className="de-input data" autoFocus inputMode={numeric ? "decimal" : "text"} placeholder={numeric ? "0" : "Enter value…"} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && valid) save(); }} />
            {tag.unit && <span className="de-rec-unit">{tag.unit}</span>}
          </div>
        </DeField>
        {(tag.min != null || tag.max != null) && <div className="de-rec-range">Expected range {deFmtRange(tag)}</div>}
        {deHasLimits(tag) && <div className="de-rec-range">Alarm limits <DeLimits t={tag} /></div>}
        {cross && <div className={"pe-warn" + (cross.level === "critical" ? " pe-warn-crit" : "")}><Icon name="alert-triangle" size={14} /> <span>Past the {cross.name.toLowerCase()} alarm limit ({tag[cross.k]}{tag.unit ? " " + tag.unit : ""}) · saving raises a {cross.level} alarm.</span></div>}
        {!cross && oor && <div className="pe-warn"><Icon name="alert-triangle" size={14} /> <span>Value is outside the expected range.</span></div>}
        <DeWhen date={date} time={time} onDate={setDate} onTime={setTime} />
        <DeField label="Comment (optional)"><input className="de-input" placeholder="Add a note about this reading…" value={comment} onChange={(e) => setComment(e.target.value)} /></DeField>
        {hist.length > 0 && (
          <div className="de-rec-hist">
            <span className="eyebrow">Recent readings</span>
            {hist.map((h, i) => (
              <div className="de-rec-hist-row" key={i}><span className="data de-rec-hist-v">{h.value}{tag.unit ? " " + tag.unit : ""}</span><span className="de-rec-hist-ts data">{h.ts}</span></div>
            ))}
          </div>
        )}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} /> Add</button>
      </div>
    </Dialog>
  );
}

/* ── Table view: one round, many measurements, one timestamp ──
   The list is built for "find one measurement and log it". A round is the other job: the operator
   walks a location with a clipboard and comes back with eight readings. Typing eight dialogs for
   that is the Excel-beats-the-HMI moment, so the table takes them all in one pass and writes them
   with ONE timestamp — the time the round was taken, not the time each field lost focus. */
function DeMatrix({ rows, showPath, onDone }) {
  const [vals, setVals] = React.useState({});
  const [notes, setNotes] = React.useState({});
  const [date, setDate] = React.useState(() => deDateInput(new Date()));
  const [time, setTime] = React.useState(() => deTimeInput(new Date()));
  const set = (id, v) => setVals((s) => ({ ...s, [id]: v }));
  const entries = rows.filter((t) => (vals[t.id] || "").trim() !== "")
    .map((t) => ({ id: t.id, value: vals[t.id].trim(), comment: (notes[t.id] || "").trim() }));
  const oorOf = (t) => {
    const n = parseFloat(vals[t.id]);
    if (isNaN(n)) return false;
    if (deHasLimits(t)) return !!deLimitCross(t, n);
    return (t.min != null && n < t.min) || (t.max != null && n > t.max);
  };
  const oorN = rows.filter(oorOf).length;
  const cellRef = React.useRef({});
  // Enter moves DOWN the column, like every spreadsheet the operators came from
  const onKey = (e, i) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = rows[i + (e.shiftKey ? -1 : 1)];
    if (next && cellRef.current[next.id]) cellRef.current[next.id].focus();
  };
  const save = () => {
    const dt = deTsParse(date, time);
    deStore.recordMany(entries, dt ? deTsOf(dt) : null);
    njToast(`${entries.length} reading${entries.length === 1 ? "" : "s"} logged · ${dt ? deTsOf(dt) : deTsNow()}`, "clipboard-check");
    setVals({}); setNotes({});
    if (onDone) onDone();
  };
  return (
    <div className="de-mx">
      <div className="de-mx-scroll">
      <table className="tbl de-mxtbl">
        <thead>
          <tr>
            <th>Measurement</th>
            {showPath && <th className="de-mx-th-p">Location</th>}
            <th className="de-mx-th-n">Last value</th>
            <th className="de-mx-th-lim">Limits</th>
            <th className="de-mx-th-v">New value</th>
            <th className="de-mx-th-c">Comment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const filled = (vals[t.id] || "").trim() !== "";
            return (
              <tr key={t.id} className={filled ? "de-mx-filled" : ""}>
                <td className="de-mx-name">{t.name}</td>
                {showPath && <td className="de-mx-p">{t.path}</td>}
                <td className="de-mx-last data">{t.value}{t.unit ? <span className="de-u"> {t.unit}</span> : null}</td>
                <td className="de-mx-exp" title={deHasLimits(t) ? "Alarm limits · a value past one of these raises an alarm" : "No alarm limits · " + deRangeText(t)}>
                  {deHasLimits(t) ? <DeLimits t={t} />
                    : deHasRange(t) ? <span className="de-mx-nolim">exp <span className="de-lim-v">{deFmtRange(t)}</span></span>
                    : null}</td>
                <td className="de-mx-v">
                  <span className={"de-mx-inw" + (oorOf(t) ? " oor" : "")}>
                    <input className="de-input data" inputMode={deIsNumeric(t) ? "decimal" : "text"} placeholder="—"
                      ref={(el) => { cellRef.current[t.id] = el; }} onKeyDown={(e) => onKey(e, i)}
                      aria-label={"New value for " + t.name} value={vals[t.id] || ""} onChange={(e) => set(t.id, e.target.value)} />
                    {t.unit && <span className="de-mx-u">{t.unit}</span>}
                  </span>
                </td>
                <td className="de-mx-c">
                  <input className="de-input" placeholder={filled ? "Optional note…" : ""} disabled={!filled}
                    aria-label={"Comment for " + t.name} value={notes[t.id] || ""} onChange={(e) => setNotes((s) => ({ ...s, [t.id]: e.target.value }))} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="de-mxbar">
        <DeWhen date={date} time={time} onDate={setDate} onTime={setTime} label="Round taken" />
        <span className="de-mx-count">{entries.length
          ? entries.length + " of " + rows.length + " filled" + (oorN ? " · " + oorN + " past a limit" : "")
          : "Type the readings you have · blank rows are left alone"}</span>
        <div className="de-mxbar-b">
          <button className="btn btn-secondary" disabled={!entries.length} onClick={() => { setVals({}); setNotes({}); }}>Clear</button>
          <button className="btn btn-primary" disabled={!entries.length} onClick={save}><Icon name="check" size={16} /> Save {entries.length || ""} reading{entries.length === 1 ? "" : "s"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Tag detail dialog (metadata + value history) ── */
function TagDetailDialog({ tagId, existingPaths }) {
  const tags = useManualTags();
  const tag = tags.find((t) => t.id === tagId);
  if (!tag) return <Dialog width={520}><DlgHeader name="Tag" onClose={closeDialog} /><div className="dlg-body">This tag no longer exists.</div></Dialog>;
  const numeric = deIsNumeric(tag);
  const hist = tag.history || [];
  return (
    <Dialog width={560}>
      <DlgHeader icon="clipboard-list" name={tag.name} tag={tag.unit || undefined} onClose={closeDialog} />
      <div className="dlg-body de-detail">
        <div className="de-detail-path">{tag.path}</div>
        <div className="de-detail-cur">
          <div>
            <span className="de-detail-lbl">Current value</span>
            <span className="de-detail-big data">{tag.value}{tag.unit ? <span className="de-u"> {tag.unit}</span> : null}</span>
          </div>
          <div className="de-detail-actions">
            {numeric && <TrendBtn id={tag.name} tag={tag.name} name={tag.name} unit={tag.unit} value={deNum(tag)} group="Manual" title="Send to Trends" />}
            <button className="btn btn-secondary btn-sm" onClick={() => openDialog(<TagDialog tag={tag} existingPaths={existingPaths} />)}><Icon name="pencil" size={14} /> Edit</button>
            <button className="btn btn-primary btn-sm" onClick={() => openDialog(<RecordValueDialog tag={tag} />)}><Icon name="plus" size={14} /> Add</button>
          </div>
        </div>
        <div className="de-detail-grid">
          <div className="de-detail-cell"><span className="de-detail-lbl">Decimals</span><span className="data">{tag.decimals == null ? "—" : tag.decimals}</span></div>
          <div className="de-detail-cell"><span className="de-detail-lbl">Building</span><span>{tag.building || "—"}</span></div>
          <div className="de-detail-cell"><span className="de-detail-lbl">Department</span><span>{tag.department || "—"}</span></div>
          <div className="de-detail-cell"><span className="de-detail-lbl">Min value</span><span className="data">{tag.min == null ? "—" : tag.min}</span></div>
          <div className="de-detail-cell"><span className="de-detail-lbl">Max value</span><span className="data">{tag.max == null ? "—" : tag.max}</span></div>
        </div>
        <div className="de-hist-head"><span className="eyebrow">Value history</span><span className="de-hist-n data">{hist.length}</span></div>
        <div className="de-hist">
          {hist.length === 0 && <NjInline align="left" icon="clock">No readings recorded yet.</NjInline>}
          {hist.map((h, i) => (
            <div className="de-hist-row" key={i}>
              <div className="de-hist-l">
                <span className="de-hist-val data">{h.value}{tag.unit ? <span className="de-u"> {tag.unit}</span> : null}</span>
                {h.comment && <span className="de-hist-comment">{h.comment}</span>}
              </div>
              <span className="de-hist-ts data"><Icon name="calendar" size={12} color="var(--slate-400)" /> {h.ts}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}

function FolderDialog({ existingPaths, seedParent }) {
  const [path, setPath] = React.useState(seedParent ? seedParent + " / " : "");
  const trimmed = path.trim();
  const exists = existingPaths.includes(trimmed);
  const valid = trimmed && !exists;
  const save = () => { deStore.addFolder(trimmed); njToast(`Folder "${trimmed}" created.`); closeDialog(); };
  return (
    <Dialog width={480}>
      <DlgHeader icon="folder-plus" name="New folder" onClose={closeDialog} />
      <div className="dlg-body de-form">
        <DeField label="Folder path" hint="Use “/” to nest, e.g. Manual Measurements / DPT 1 / Tank 1">
          <input className="de-input" autoFocus list="de-paths-f" placeholder="Manual Measurements / DPT 1" value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && valid) save(); }} />
          <datalist id="de-paths-f">{existingPaths.map((p) => <option key={p} value={p} />)}</datalist>
        </DeField>
        {exists && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>That folder already exists.</div>}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} /> Create</button>
      </div>
    </Dialog>
  );
}

function DeleteTagConfirm({ tag }) {
  return <ConfirmDialog title="Delete tag" message={`Delete "${tag.name}" and its ${(tag.history || []).length} recorded value(s)?`} confirmLabel="Delete" tone="danger"
    onConfirm={() => { deStore.remove(tag.id); njToast(`Tag "${tag.name}" deleted.`); }} />;
}

function DeleteFolderConfirm({ path, tagCount, subCount }) {
  const parts = [];
  if (tagCount) parts.push(`${tagCount} tag${tagCount === 1 ? "" : "s"}`);
  if (subCount) parts.push(`${subCount} subfolder${subCount === 1 ? "" : "s"}`);
  const detail = parts.length ? ` and everything inside it (${parts.join(" · ")})` : "";
  return <ConfirmDialog title="Delete folder" message={`Delete the folder "${path}"${detail}? This cannot be undone.`} confirmLabel="Delete" tone="danger"
    onConfirm={() => { deStore.removeFolderDeep(path); njToast(`Folder "${path}" deleted.`); }} />;
}

function RenameFolderDialog({ src, existingPaths }) {
  const idx = src.lastIndexOf(" / ");
  const parent = idx === -1 ? "" : src.slice(0, idx + 3);
  const leaf = idx === -1 ? src : src.slice(idx + 3);
  const [name, setName] = React.useState(leaf);
  const trimmed = name.trim();
  const dest = parent + trimmed;
  const exists = existingPaths.includes(dest);
  const valid = trimmed && !trimmed.includes("/") && dest !== src && !exists;
  const save = () => { deStore.renameFolder(src, dest); njToast(`Folder renamed to "${trimmed}".`); closeDialog(); };
  return (
    <Dialog width={480}>
      <DlgHeader icon="pencil" name="Rename folder" onClose={closeDialog} />
      <div className="dlg-body de-form">
        <DeField label="Folder name" hint={parent ? `Inside ${parent.slice(0, -3)}` : "Renames this folder and everything inside it"}>
          <input className="de-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && valid) save(); }} />
        </DeField>
        {trimmed.includes("/") && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>Use the folder’s duplicate or drag to move, a name can’t contain “/”.</div>}
        {exists && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>A folder with that name already exists here.</div>}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} /> Rename</button>
      </div>
    </Dialog>
  );
}

function DuplicateFolderDialog({ src, existingPaths }) {
  const [dest, setDest] = React.useState(src + " (copy)");
  const trimmed = dest.trim();
  const exists = existingPaths.includes(trimmed);
  const valid = trimmed && trimmed !== src && !exists;
  const save = () => { deStore.duplicateFolder(src, trimmed); njToast(`Folder duplicated to "${trimmed}".`); closeDialog(); };
  return (
    <Dialog width={480}>
      <DlgHeader icon="copy" name="Duplicate folder" onClose={closeDialog} />
      <div className="dlg-body de-form">
        <div className="de-dup-note"><Icon name="info" size={14} color="var(--slate-400)" /> <span>Copies every tag in <strong>{src}</strong> (and its subfolders) with the same settings and current values: ready to adjust for another department or building.</span></div>
        <DeField label="New folder path" hint="Where the copy should live">
          <input className="de-input" autoFocus value={dest} onChange={(e) => setDest(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && valid) save(); }} />
        </DeField>
        {exists && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>That folder already exists, pick another path.</div>}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} /> Duplicate</button>
      </div>
    </Dialog>
  );
}

/* ── Move tag dialog ── */
function MoveTagDialog({ tag, existingPaths }) {
  const [path, setPath] = React.useState(tag.path);
  const valid = path.trim() && path.trim() !== tag.path;
  const save = () => { deStore.moveTag(tag.id, path.trim()); njToast(`"${tag.name}" moved to ${path.trim()}.`); closeDialog(); };
  return (
    <Dialog width={480}>
      <DlgHeader icon="folder-input" name={"Move · " + tag.name} onClose={closeDialog} />
      <div className="dlg-body de-form">
        <DeField label="Destination folder" hint="Pick an existing folder or type a new path">
          <input className="de-input" autoFocus list="de-move-paths" value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && valid) save(); }} />
          <datalist id="de-move-paths">{existingPaths.map((p) => <option key={p} value={p} />)}</datalist>
        </DeField>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} /> Move</button>
      </div>
    </Dialog>
  );
}

/* ── overflow (•••) menu — all admin actions hide here ── */
function OverflowMenu({ items, onClose }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [onClose]);
  return (
    <div className="de-menu" role="menu" ref={ref}>
      {items.map((it, i) => it.sep
        ? <div className="de-menu-sep" key={i} />
        : <button key={i} className={"de-menu-item" + (it.danger ? " danger" : "")} role="menuitem" onClick={() => { onClose(); it.onClick(); }}>
            <Icon name={it.icon} size={16} /> <span>{it.label}</span>
          </button>)}
    </div>
  );
}

/* ── measurement row (touch-first; one primary action + one overflow) ── */
function MeasurementRow({ tag, paths, onEnter, showPath }) {
  const [menu, setMenu] = React.useState(false);
  const numeric = deIsNumeric(tag);
  const oor = deOutOfRange(tag);
  const st = deState(tag);
  const last = (tag.history || [])[0];
  const items = [
    { icon: "pencil", label: "Edit tag details", onClick: () => openDialog(<TagDialog tag={tag} existingPaths={paths} />) },
    { icon: "history", label: "View value history", onClick: () => openDialog(<TagDetailDialog tagId={tag.id} existingPaths={paths} />) },
    ...(numeric ? [{ icon: "line-chart", label: "Send to Trends", onClick: () => njSendToTrend(tag.name, { name: tag.name, unit: tag.unit, value: deNum(tag), group: "Manual" }) }] : []),
    { sep: true },
    { icon: "copy", label: "Duplicate", onClick: () => { deStore.duplicateTag(tag.id); njToast(`"${tag.name}" duplicated.`); } },
    { icon: "folder-input", label: "Move to folder…", onClick: () => openDialog(<MoveTagDialog tag={tag} existingPaths={paths} />) },
    { icon: "trash-2", label: "Delete tag", danger: true, onClick: () => openDialog(<DeleteTagConfirm tag={tag} />) },
  ];
  return (
    <div className={"de-meas" + (st && st.kind !== "ok" ? " de-meas-oor" : "")}>
      <div className="de-meas-main">
        <div className="de-meas-name">{tag.name}</div>
        <div className="de-meas-meta">
          {showPath && <span className="de-meas-path"><Icon name="folder" size={12} color="var(--slate-400)" /> {tag.path}</span>}
          {last ? <span>Updated {last.ts}</span> : <span>No readings yet</span>}
        </div>
      </div>
      <div className="de-meas-read">
        <span className={"data de-meas-val" + (st && st.kind !== "ok" ? " de-oor" : "")}>{tag.value}{tag.unit ? <span className="de-u"> {tag.unit}</span> : null}</span>
        {st
          ? st.kind === "ok"
            ? <span className="de-stat de-stat-ok"><span className="de-stat-dot" /> In range</span>
            : <span className={"de-stat " + (st.kind === "alarm" && st.level === "critical" ? "de-stat-crit" : "de-stat-warn")}
                title={st.kind === "alarm" ? deLimitsTitle(tag) : "Expected range " + deFmtRange(tag)}>
                <Icon name="alert-triangle" size={12} /> {st.label}</span>
          : deHasRange(tag) ? <span className="de-meas-range data">{deFmtRange(tag)}</span> : null}
      </div>
      <button className="btn btn-secondary btn-sm de-enter-btn" onClick={() => onEnter(tag)}><Icon name="plus" size={14} /> Add value</button>
      <div className="de-meas-morewrap">
        <button className={"de-more" + (menu ? " open" : "")} aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><Icon name="more-vertical" size={20} /></button>
        {menu && <OverflowMenu items={items} onClose={() => setMenu(false)} />}
      </div>
    </div>
  );
}

/* ── location rail item ── */
function LocationRow({ node, name, depth, count, active, hasKids, isCol, paths, onSelect, onToggle }) {
  const [menu, setMenu] = React.useState(false);
  const items = [
    { icon: "plus", label: "New measurement here", onClick: () => openDialog(<TagDialog existingPaths={paths} seedPath={node} />) },
    { icon: "folder-plus", label: "New subfolder", onClick: () => openDialog(<FolderDialog existingPaths={paths} seedParent={node} />) },
    { sep: true },
    { icon: "pencil", label: "Rename", onClick: () => openDialog(<RenameFolderDialog src={node} existingPaths={paths} />) },
    { icon: "copy", label: "Duplicate folder", onClick: () => openDialog(<DuplicateFolderDialog src={node} existingPaths={paths} />) },
    { icon: "trash-2", label: "Delete folder", danger: true, onClick: () => openDialog(<DeleteFolderConfirm path={node} tagCount={count} subCount={0} />) },
  ];
  return (
    <div className={"de-loc" + (active ? " active" : "")} style={{ paddingLeft: 8 + depth * 16 }}>
      {hasKids
        ? <button className="de-loc-caret" onClick={onToggle} aria-label={isCol ? "Expand" : "Collapse"}><Icon name={isCol ? "chevron-right" : "chevron-down"} size={16} /></button>
        : <span className="de-loc-caret de-loc-caret-empty" />}
      <button className="de-loc-btn" onClick={onSelect}>
        <Icon name={active ? "folder-open" : "folder"} size={16} />
        <span className="de-loc-name">{name}</span>
        {count > 0 && <span className="de-loc-count data">{count}</span>}
      </button>
      <div className="de-loc-morewrap">
        <button className="de-loc-more" aria-label="Folder actions" onClick={() => setMenu((m) => !m)}><Icon name="more-vertical" size={16} /></button>
        {menu && <OverflowMenu items={items} onClose={() => setMenu(false)} />}
      </div>
    </div>
  );
}

function DataEntryScreen({ tab, onTab }) {
  const tags = useManualTags();
  const folders = useManualFolders();
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState("");
  const [collapsed, setCollapsed] = React.useState(() => new Set());
  // list vs table is a working preference, so it survives a reload
  const [view, setView] = React.useState(() => { try { return localStorage.getItem("nj_de_view_v1") === "table" ? "table" : "list"; } catch (e) { return "list"; } });
  React.useEffect(() => { try { localStorage.setItem("nj_de_view_v1", view); } catch (e) {} }, [view]);
  const SEP = " / ";
  const paths = [...new Set([...folders, ...tags.map((t) => t.path)])].sort();
  const query = q.trim().toLowerCase();
  const toggle = (p) => setCollapsed((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  // folder node set (all prefixes)
  const nodeSet = new Set();
  paths.forEach((p) => { const segs = p.split(SEP); for (let i = 0; i < segs.length; i++) nodeSet.add(segs.slice(0, i + 1).join(SEP)); });
  const allNodes = [...nodeSet];
  const childFolders = (parent) => allNodes.filter((n) => { const idx = n.lastIndexOf(SEP); return (idx === -1 ? "" : n.slice(0, idx)) === parent; }).sort();
  const directCount = (p) => tags.filter((t) => t.path === p).length;

  // rail rows (respect collapse)
  const rail = [];
  const walkRail = (parent, depth) => {
    childFolders(parent).forEach((node) => {
      const idx = node.lastIndexOf(SEP);
      const name = idx === -1 ? node : node.slice(idx + SEP.length);
      const kids = childFolders(node);
      const isCol = collapsed.has(node);
      rail.push(<LocationRow key={node} node={node} name={name} depth={depth} count={directCount(node)} active={active === node} hasKids={kids.length > 0} isCol={isCol} paths={paths} onSelect={() => { setActive(node); setQ(""); }} onToggle={() => toggle(node)} />);
      if (!isCol) walkRail(node, depth + 1);
    });
  };
  walkRail("", 0);

  // measurements to show
  const matchTag = (t) => (t.name + " " + t.path + " " + (t.department || "") + " " + (t.building || "")).toLowerCase().includes(query);
  let visible, grouped, showPath;
  if (query) { visible = tags.filter(matchTag); grouped = true; showPath = true; }
  else if (active === "") { visible = tags.slice(); grouped = true; showPath = true; }
  else { visible = tags.filter((t) => t.path === active); grouped = false; showPath = false; }
  // stable ordering by path then name
  visible.sort((a, b) => (a.path + a.name).localeCompare(b.path + b.name));
  const openEnter = (tag) => openDialog(<RecordValueDialog tag={tag} />);
  const subfolders = active ? childFolders(active) : [];
  const oorCount = visible.filter(deOutOfRange).length;

  // group rows by path for the grouped views
  const byPath = {};
  visible.forEach((t) => { (byPath[t.path] = byPath[t.path] || []).push(t); });
  const groupOrder = Object.keys(byPath).sort();

  return (
    <AppShell active="analytics" title="Analytics" crumbs={["Data Entry"]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Pick a location, find the measurement, enter the reading. Every value is timestamped and kept in history.</p>
          </div>
          <div className="pagehead-right">{window.AnalyticsTabs && <window.AnalyticsTabs active={tab} onChange={onTab} />}</div>
        </div>
      </div>

      <div className="de-layout">
        <aside className="de-rail" aria-label="Locations">
          <div className="de-rail-head">
            <span className="eyebrow">Locations</span>
            <button className="de-rail-add" title="New folder" onClick={() => openDialog(<FolderDialog existingPaths={paths} />)}><Icon name="folder-plus" size={16} /></button>
          </div>
          <div className="de-rail-scroll">
            <button className={"de-loc de-loc-all" + (active === "" && !query ? " active" : "")} onClick={() => { setActive(""); setQ(""); }}>
              <span className="de-loc-caret de-loc-caret-empty" />
              <span className="de-loc-btn"><Icon name="layers" size={16} /><span className="de-loc-name">All locations</span><span className="de-loc-count data">{tags.length}</span></span>
            </button>
            {rail}
          </div>
        </aside>

        <section className="de-panel">
          <div className="de-panel-head">
            <div className="de-panel-crumb">
              {query ? <span>Search results</span> : active === "" ? <span>All locations</span> : active.split(SEP).map((s, i, a) => <React.Fragment key={i}>{i > 0 && <Icon name="chevron-right" size={14} color="var(--slate-300)" />}<span className={i === a.length - 1 ? "de-crumb-cur" : ""}>{s}</span></React.Fragment>)}
              <span className="de-panel-count">· {visible.length} {visible.length === 1 ? "measurement" : "measurements"}{oorCount > 0 && <span className="de-panel-oor"><Icon name="alert-triangle" size={12} /> {oorCount} out of range</span>}</span>
            </div>
            <div className="de-panel-tools">
              <div className="field de-search"><Icon name="search" size={16} color="var(--slate-400)" /><input placeholder="Search all tags…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <div className="de-viewseg" role="group" aria-label="View">
                {[{ k: "list", icon: "list", label: "List" }, { k: "table", icon: "table-2", label: "Table" }].map((v) => (
                  <button key={v.k} className={"de-viewbtn" + (view === v.k ? " on" : "")} aria-pressed={view === v.k}
                    title={v.k === "table" ? "Enter several readings at once, with one timestamp" : "One measurement at a time"}
                    onClick={() => setView(v.k)}><Icon name={v.icon} size={14} /> {v.label}</button>
                ))}
              </div>
              <button className="btn btn-secondary" onClick={() => openDialog(<TagDialog existingPaths={paths} seedPath={active || ""} />)}><Icon name="plus" size={16} /> New tag</button>
            </div>
          </div>

          {subfolders.length > 0 && (
            <div className="de-subchips">
              {subfolders.map((sf) => <button key={sf} className="de-subchip" onClick={() => setActive(sf)}><Icon name="folder" size={14} /> {sf.slice(sf.lastIndexOf(SEP) + SEP.length)} <span className="data">{directCount(sf)}</span></button>)}
            </div>
          )}

          <div className="de-panel-scroll">
            {visible.length === 0 && (
              query
                ? <NjEmpty size="card" reason="search" title={"No measurements match \u201c" + query + "\u201d"}
                    body="Search covers the tag, the name and the location."
                    action={<button className="btn btn-secondary" onClick={() => setQ("")}>Clear search</button>} />
                : <NjEmpty size="card" icon="clipboard-list"
                    title={subfolders.length ? "Nothing measured at this level" : "No measurements in this location yet"}
                    body={subfolders.length ? "Open a subfolder above to reach its measurement points." : "Create the first tag for this location to start logging readings against it."}
                    action={!subfolders.length ? <button className="btn btn-primary" onClick={() => openDialog(<TagDialog existingPaths={paths} seedPath={active || ""} />)}><Icon name="plus" size={16} /> New tag</button> : null} />
            )}
            {visible.length > 0 && (view === "table"
              ? <DeMatrix rows={visible} showPath={showPath} />
              : grouped
                ? groupOrder.map((p) => (
                    <div className="de-mgroup" key={p}>
                      <div className="de-mgroup-h"><Icon name="folder" size={14} color="var(--slate-400)" /> {p} <span className="data">{byPath[p].length}</span></div>
                      {byPath[p].map((t) => <MeasurementRow key={t.id} tag={t} paths={paths} onEnter={openEnter} showPath={false} />)}
                    </div>
                  ))
                : visible.map((t) => <MeasurementRow key={t.id} tag={t} paths={paths} onEnter={openEnter} showPath={false} />))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

window.DataEntryScreen = DataEntryScreen;
// exported so the mobile app records against the SAME manual-measurement store (nj_manual_tags_v1)
Object.assign(window, { deStore, useManualTags, useManualFolders, deNum, deIsNumeric, deOutOfRange, deFmtRange, deHasRange, DE_DEPTS, DE_BUILDINGS, deTsNow, deTsOf, deDateInput, deTimeInput, deTsParse, DE_LIMITS, deHasLimits, deLimitCross, deFmtLimits, deState });
