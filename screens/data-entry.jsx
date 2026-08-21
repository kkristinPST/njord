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
  { id: "mt2", path: "Manual Measurements / DPT 1", name: "Oxygen Level", value: "8.2", unit: "mg/L", decimals: 1, min: 6, max: 12, building: "DPT 1", department: "Operations",
    history: [{ value: "8.2", comment: "", ts: "05.03.2026, 08:12" }] },
  { id: "mt3", path: "Manual Measurements / DPT 1", name: "pH Level", value: "7.2", unit: "", decimals: 1, min: 6.5, max: 8.5, building: "DPT 1", department: "Operations",
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

const deStore = {
  tags: null,
  folders: null,
  subs: new Set(),
  load() {
    if (deStore.tags) return;
    try { const raw = localStorage.getItem(DE_KEY); deStore.tags = raw ? JSON.parse(raw) : DE_SEED.map((t) => ({ ...t })); }
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
  record(id, value, comment) {
    deStore.load();
    const now = new Date();
    const ts = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    deStore.tags = deStore.tags.map((t) => (t.id === id ? { ...t, value, history: [{ value, comment: comment || "", ts }, ...(t.history || [])] } : t));
    deStore.persist();
  },
};
function useManualTags() { return React.useSyncExternalStore(deStore.subscribe, deStore.tagsSnap); }
function useManualFolders() { return React.useSyncExternalStore(deStore.subscribe, deStore.foldersSnap); }

const deNum = (t) => { const n = parseFloat(t.value); return isNaN(n) ? null : n; };
const deIsNumeric = (t) => deNum(t) != null;
const deFmtRange = (t) => (t.min == null && t.max == null) ? "—" : `${t.min == null ? "—" : t.min}…${t.max == null ? "—" : t.max}${t.unit ? " " + t.unit : ""}`;
function deOutOfRange(t) { const n = deNum(t); if (n == null) return false; return (t.min != null && n < t.min) || (t.max != null && n > t.max); }

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
    ? { path: tag.path, name: tag.name, value: tag.value, unit: tag.unit || "", decimals: tag.decimals == null ? "" : String(tag.decimals), min: tag.min == null ? "" : String(tag.min), max: tag.max == null ? "" : String(tag.max), building: tag.building || "", department: tag.department || "", comment: "" }
    : { path: seedPath || "", name: "", value: "", unit: "", decimals: "", min: "", max: "", building: "", department: "", comment: "" });
  const [showCtx, setShowCtx] = React.useState(editing);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.path.trim() && f.name.trim() && f.value.trim();
  const parseN = (v) => (v.trim() === "" ? null : (isNaN(parseFloat(v)) ? null : parseFloat(v)));
  const save = () => {
    const base = { path: f.path.trim(), name: f.name.trim(), value: f.value.trim(), unit: f.unit.trim(), decimals: f.decimals.trim() === "" ? null : parseInt(f.decimals, 10), min: parseN(f.min), max: parseN(f.max), building: f.building.trim(), department: f.department.trim() };
    if (editing) { deStore.update(tag.id, base); njToast(`Tag "${base.name}" updated.`); }
    else {
      const now = new Date();
      const ts = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      deStore.add({ id: "mt" + Date.now(), ...base, history: [{ value: base.value, comment: f.comment.trim(), ts }] });
      njToast(`Tag "${base.name}" created in ${base.path}.`);
    }
    closeDialog();
  };
  return (
    <Dialog width={560}>
      <DlgHeader icon={editing ? "pencil" : "plus"} name={editing ? "Edit tag" : "Add new tag"} onClose={closeDialog} />
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
          <DeField label="Min"><input className="de-input data" placeholder="—" value={f.min} onChange={(e) => set("min", e.target.value)} /></DeField>
          <DeField label="Max"><input className="de-input data" placeholder="—" value={f.max} onChange={(e) => set("max", e.target.value)} /></DeField>
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
        <button className="btn btn-primary" disabled={!valid} onClick={save}>{editing ? "Save changes" : "Confirm"}</button>
      </div>
    </Dialog>
  );
}

/* ── Record value dialog (the core manual-entry action) ── */
function RecordValueDialog({ tag }) {
  const numeric = deIsNumeric(tag);
  const [value, setValue] = React.useState("");
  const [comment, setComment] = React.useState("");
  const num = parseFloat(value);
  const oor = numeric && value.trim() !== "" && !isNaN(num) && ((tag.min != null && num < tag.min) || (tag.max != null && num > tag.max));
  const valid = value.trim() !== "";
  const save = () => {
    deStore.record(tag.id, value.trim(), comment.trim());
    njToast(`Added ${value.trim()}${tag.unit ? " " + tag.unit : ""} to ${tag.name}.`, "Trends", numeric ? () => njSendToTrend(tag.name, { name: tag.name, unit: tag.unit, value: num, group: "Manual" }) : null);
    closeDialog();
  };
  return (
    <Dialog width={444}>
      <DlgHeader icon="plus" name={"Add value · " + tag.name} onClose={closeDialog} />
      <div className="dlg-body de-rec">
        <div className="de-rec-meta">
          <div className="de-rec-path">{tag.path}</div>
          <div className="de-rec-cur"><span className="de-rec-lbl">Last value</span><span className="data">{tag.value}{tag.unit ? <span className="de-u"> {tag.unit}</span> : null}</span></div>
        </div>
        <DeField label="New value">
          <div className="de-rec-inwrap">
            <input className="de-input data" autoFocus inputMode={numeric ? "decimal" : "text"} placeholder={numeric ? "0" : "Enter value…"} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && valid) save(); }} />
            {tag.unit && <span className="de-rec-unit">{tag.unit}</span>}
          </div>
        </DeField>
        {(tag.min != null || tag.max != null) && <div className="de-rec-range">Expected range {deFmtRange(tag)}</div>}
        {oor && <div className="pe-warn"><Icon name="alert-triangle" size={14} /> <span>Value is outside the expected range.</span></div>}
        <DeField label="Comment (optional)"><input className="de-input" placeholder="Add a note about this reading…" value={comment} onChange={(e) => setComment(e.target.value)} /></DeField>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={15} /> Add</button>
      </div>
    </Dialog>
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
      <DlgHeader icon="file-text" name={tag.name} tag={tag.unit || undefined} onClose={closeDialog} />
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
            <button className="btn btn-primary btn-sm" onClick={() => openDialog(<RecordValueDialog tag={tag} />)}><Icon name="plus" size={14} /> Add value</button>
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
          {hist.length === 0 && <div className="de-hist-empty">No readings recorded yet.</div>}
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
        <button className="btn btn-primary" disabled={!valid} onClick={save}>Confirm</button>
      </div>
    </Dialog>
  );
}

function DeleteTagConfirm({ tag }) {
  return <ConfirmDialog title="Delete tag" message={`Delete "${tag.name}" and its ${(tag.history || []).length} recorded value(s)?`} confirmLabel="Delete" danger
    onConfirm={() => { deStore.remove(tag.id); njToast(`Tag "${tag.name}" deleted.`); }} />;
}

function DeleteFolderConfirm({ path, tagCount, subCount }) {
  const parts = [];
  if (tagCount) parts.push(`${tagCount} tag${tagCount === 1 ? "" : "s"}`);
  if (subCount) parts.push(`${subCount} subfolder${subCount === 1 ? "" : "s"}`);
  const detail = parts.length ? ` and everything inside it (${parts.join(" · ")})` : "";
  return <ConfirmDialog title="Delete folder" message={`Delete the folder "${path}"${detail}? This cannot be undone.`} confirmLabel="Delete folder" danger
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
        <button className="btn btn-primary" disabled={!valid} onClick={save}>Save</button>
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
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="copy" size={14} /> Duplicate</button>
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
        <button className="btn btn-primary" disabled={!valid} onClick={save}>Move</button>
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

/* ── Enter value drawer — the primary operator action ── */
function EnterValueDrawer({ tag, queue, index }) {
  const numeric = deIsNumeric(tag);
  const [value, setValue] = React.useState("");
  const [comment, setComment] = React.useState("");
  const inRef = React.useRef(null);
  React.useEffect(() => { if (inRef.current && !numeric) inRef.current.focus(); }, []);
  const num = parseFloat(value);
  const dec = tag.decimals == null ? 2 : tag.decimals;
  const oor = numeric && value.trim() !== "" && !isNaN(num) && ((tag.min != null && num < tag.min) || (tag.max != null && num > tag.max));
  const valid = value.trim() !== "";
  const next = queue && index != null ? queue[index + 1] : null;
  const commit = () => {
    deStore.record(tag.id, value.trim(), comment.trim());
    njToast(`Added ${value.trim()}${tag.unit ? " " + tag.unit : ""} to ${tag.name}.`);
  };
  const save = () => { commit(); closeDialog(); };
  const saveNext = () => { commit(); closeDialog(); if (next) openDialog(<EnterValueDrawer tag={next} queue={queue} index={index + 1} />); };
  const key = (k) => setValue((v) => {
    if (k === "del") return v.slice(0, -1);
    if (k === "." && v.includes(".")) return v;
    if (k === "-") return v.startsWith("-") ? v.slice(1) : "-" + v;
    return v + k;
  });
  const step = (d) => setValue((v) => { const base = v.trim() === "" || isNaN(parseFloat(v)) ? (tag.min != null ? tag.min : 0) : parseFloat(v); const s = dec > 0 ? Math.pow(10, -dec) : 1; return (base + d * (dec > 0 ? 1 : 1)).toFixed(dec > 0 ? dec : 0); });
  const hist = (tag.history || []).slice(0, 3);
  return (
    <div className="de-drawer" role="dialog" aria-modal="true" aria-label={"Enter value for " + tag.name}>
      <div className="de-drawer-head">
        <div className="de-drawer-loc"><Icon name="folder" size={13} color="var(--slate-400)" /> {tag.path}</div>
        <button className="dlg-x" onClick={closeDialog} aria-label="Close"><Icon name="x" size={20} /></button>
      </div>
      <div className="de-drawer-title">{tag.name}</div>
      <div className="de-drawer-body">
        <div className="de-ev-lastrow">
          <span className="de-ev-lbl">LAST VALUE</span>
          <span className="data de-ev-last">{tag.value}{tag.unit ? <span className="de-u"> {tag.unit}</span> : null}</span>
          {hist[0] && <span className="de-ev-lastts data">{hist[0].ts}</span>}
        </div>
        <label className="de-ev-fieldlbl" htmlFor="de-ev-input">NEW VALUE</label>
        <div className={"de-ev-field" + (oor ? " oor" : "")}>
          {numeric && <button className="de-ev-step" onClick={() => step(-1)} aria-label="Decrease"><Icon name="minus" size={22} /></button>}
          <input id="de-ev-input" ref={inRef} className="de-ev-input data" inputMode={numeric ? "decimal" : "text"} placeholder={numeric ? "0" : "Enter reading…"} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && valid) (next ? saveNext() : save()); }} />
          {tag.unit && <span className="de-ev-unit">{tag.unit}</span>}
          {numeric && <button className="de-ev-step" onClick={() => step(1)} aria-label="Increase"><Icon name="plus" size={22} /></button>}
        </div>
        {(tag.min != null || tag.max != null) && <div className={"de-ev-range" + (oor ? " oor" : "")}>{oor ? <span><Icon name="alert-triangle" size={13} /> Outside expected range {deFmtRange(tag)}</span> : <span>Expected range {deFmtRange(tag)}</span>}</div>}
        {numeric && (
          <div className="de-keypad">
            {["1","2","3","4","5","6","7","8","9",".","0","del"].map((k) => (
              <button key={k} className={"de-key" + (k === "del" ? " de-key-del" : "")} onClick={() => key(k)} aria-label={k === "del" ? "Delete" : k}>
                {k === "del" ? <Icon name="delete" size={20} /> : k}
              </button>
            ))}
          </div>
        )}
        <label className="de-ev-fieldlbl" htmlFor="de-ev-comment">COMMENT (OPTIONAL)</label>
        <input id="de-ev-comment" className="de-input" placeholder="e.g. sensor offline, manual dip sample…" value={comment} onChange={(e) => setComment(e.target.value)} />
        {hist.length > 0 && (
          <div className="de-ev-hist">
            <div className="de-ev-hist-h">RECENT READINGS</div>
            {hist.map((h, i) => (
              <div className="de-ev-hist-row" key={i}><span className="data de-ev-hist-v">{h.value}{tag.unit ? " " + tag.unit : ""}</span><span className="de-ev-hist-ts data">{h.ts}</span></div>
            ))}
          </div>
        )}
      </div>
      <div className="de-drawer-foot">
        <button className="btn btn-secondary de-ev-cancel" onClick={closeDialog}>Cancel</button>
        {next
          ? <><button className="btn btn-secondary de-ev-save" disabled={!valid} onClick={save}>Save</button>
             <button className="btn btn-primary de-ev-save" disabled={!valid} onClick={saveNext}>Save &amp; next <Icon name="arrow-right" size={16} /></button></>
          : <button className="btn btn-primary de-ev-save" disabled={!valid} onClick={save}><Icon name="check" size={17} /> Save reading</button>}
      </div>
    </div>
  );
}

/* ── measurement row (touch-first; one primary action + one overflow) ── */
function MeasurementRow({ tag, paths, onEnter, showPath }) {
  const [menu, setMenu] = React.useState(false);
  const numeric = deIsNumeric(tag);
  const oor = deOutOfRange(tag);
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
    <div className={"de-meas" + (oor ? " de-meas-oor" : "")}>
      <div className="de-meas-main">
        <div className="de-meas-name">{tag.name}</div>
        <div className="de-meas-meta">
          {showPath && <span className="de-meas-path"><Icon name="folder" size={11} color="var(--slate-400)" /> {tag.path}</span>}
          {last ? <span>Updated {last.ts}</span> : <span>No readings yet</span>}
        </div>
      </div>
      <div className="de-meas-read">
        <span className={"data de-meas-val" + (oor ? " de-oor" : "")}>{tag.value}{tag.unit ? <span className="de-u"> {tag.unit}</span> : null}</span>
        {oor
          ? <span className="de-stat de-stat-warn"><Icon name="alert-triangle" size={12} /> Out of range</span>
          : (tag.min != null || tag.max != null) ? <span className="de-stat de-stat-ok"><span className="de-stat-dot" /> In range</span> : <span className="de-meas-range data">{deFmtRange(tag)}</span>}
      </div>
      <button className="btn btn-primary de-enter-btn" onClick={() => onEnter(tag)}><Icon name="plus" size={17} /> Enter value</button>
      <div className="de-meas-morewrap">
        <button className={"de-more" + (menu ? " open" : "")} aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><Icon name="more-vertical" size={19} /></button>
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
        ? <button className="de-loc-caret" onClick={onToggle} aria-label={isCol ? "Expand" : "Collapse"}><Icon name={isCol ? "chevron-right" : "chevron-down"} size={15} /></button>
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
  const openEnter = (tag) => { const i = visible.findIndex((t) => t.id === tag.id); openDialog(<EnterValueDrawer tag={tag} queue={visible} index={i} />); };
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
              <div className="field de-search"><Icon name="search" size={15} color="var(--slate-400)" /><input placeholder="Search all tags…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <button className="btn btn-secondary" onClick={() => openDialog(<TagDialog existingPaths={paths} seedPath={active || ""} />)}><Icon name="plus" size={15} /> New tag</button>
            </div>
          </div>

          {subfolders.length > 0 && (
            <div className="de-subchips">
              {subfolders.map((sf) => <button key={sf} className="de-subchip" onClick={() => setActive(sf)}><Icon name="folder" size={13} /> {sf.slice(sf.lastIndexOf(SEP) + SEP.length)} <span className="data">{directCount(sf)}</span></button>)}
            </div>
          )}

          <div className="de-panel-scroll">
            {visible.length === 0 && (
              <div className="de-empty2">
                <Icon name={query ? "search-x" : "clipboard-list"} size={30} color="var(--slate-300)" />
                <p>{query ? "No measurements match your search." : subfolders.length ? "No measurements here: open a subfolder above." : "No measurements in this location yet."}</p>
                {!query && <button className="btn btn-primary" onClick={() => openDialog(<TagDialog existingPaths={paths} seedPath={active || ""} />)}><Icon name="plus" size={15} /> New tag</button>}
              </div>
            )}
            {grouped
              ? groupOrder.map((p) => (
                  <div className="de-mgroup" key={p}>
                    <div className="de-mgroup-h"><Icon name="folder" size={13} color="var(--slate-400)" /> {p} <span className="data">{byPath[p].length}</span></div>
                    {byPath[p].map((t) => <MeasurementRow key={t.id} tag={t} paths={paths} onEnter={openEnter} showPath={false} />)}
                  </div>
                ))
              : visible.map((t) => <MeasurementRow key={t.id} tag={t} paths={paths} onEnter={openEnter} showPath={false} />)}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

window.DataEntryScreen = DataEntryScreen;
