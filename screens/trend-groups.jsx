// trend-groups.jsx — Trend Groups: saved collections of parameters analysed together.
// Two dialogs pushed onto the shared dlgStore:
//   • TrendGroupsLibrary — browse / search / load / edit / duplicate / delete
//   • TrendGroupEditor   — name, visibility, add/remove parameters
// Reintroduces the legacy Njord "trend groups" in a modern, discoverable form.

// ── visibility chip (icon + label; never color-only) ──
function TgVisTag({ visibility }) {
  const shared = visibility === "shared";
  return (
    <span className={"tg-vis" + (shared ? " shared" : " private")}>
      <Icon name={shared ? "users" : "lock"} size={11} />{shared ? "Shared" : "Private"}
    </span>
  );
}

// ── who owns a group, phrased for the current user ──
function tgOwnerLine(g) {
  const mine = trendGroupIsOwner(g);
  if (g.visibility === "shared") return mine ? "Shared by you" : "Shared by " + g.owner;
  return mine ? "Private · you" : "Private · " + g.owner;
}

// ════════════════════════════════════════════════════════════════════
// EDITOR — create or edit a group (name, visibility, parameter set)
// ════════════════════════════════════════════════════════════════════
function TrendGroupEditor({ group, seedPens }) {
  // universe of selectable params = catalog defs + any ad-hoc pens already in the
  // group / current view that aren't catalogued
  const universe = React.useMemo(() => {
    const map = new Map();
    TREND_CATALOG.forEach((c) => map.set(c.tag, penDef(c)));
    (group ? group.pens : seedPens || []).forEach((p) => { if (!map.has(p.tag)) map.set(p.tag, penDef(p)); });
    return map;
  }, [group, seedPens]);

  const initialSel = (group ? group.pens : seedPens || []).map((p) => p.tag);
  const [name, setName] = React.useState(group ? group.name : "");
  const [visibility, setVisibility] = React.useState(group ? group.visibility : "private");
  const [sel, setSel] = React.useState(() => new Set(initialSel));
  const [q, setQ] = React.useState("");

  const toggle = (tag) => setSel((p) => { const n = new Set(p); n.has(tag) ? n.delete(tag) : n.add(tag); return n; });

  // group the universe by process group, honoring the search filter
  const grouped = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    const out = {};
    [...universe.values()].forEach((d) => {
      if (ql && ![d.name, d.tag, d.group].join(" ").toLowerCase().includes(ql)) return;
      (out[d.group] = out[d.group] || []).push(d);
    });
    return out;
  }, [universe, q]);
  const groupNames = Object.keys(grouped);

  const canSave = name.trim().length > 0 && sel.size > 0;
  const onSave = () => {
    if (!canSave) return;
    const pens = [...sel].map((t) => universe.get(t)).filter(Boolean);
    if (group) { trendGroupStore.update(group.id, { name, visibility, pens }); njToast(`“${name.trim()}” updated · ${pens.length} parameter${pens.length !== 1 ? "s" : ""}.`); }
    else { trendGroupStore.create({ name, visibility, pens }); njToast(`“${name.trim()}” saved as a ${visibility} Trend Group.`); }
    closeDialog();
  };

  return (
    <Dialog width={620}>
      <DlgHeader icon="folder-plus" name={group ? "Edit Trend Group" : "New Trend Group"} onClose={closeDialog} />
      <div className="dlg-body tg-editor">
        <div className="tg-ed-row">
          <label className="tg-field">
            <span className="tg-field-l">Name</span>
            <input className="tg-input" autoFocus value={name} placeholder="e.g. Pump Sump water quality"
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && canSave) onSave(); }} />
          </label>
          <div className="tg-field">
            <span className="tg-field-l">Visibility</span>
            <div className="tg-vis-seg">
              <button className={"tg-vis-opt" + (visibility === "private" ? " on" : "")} onClick={() => setVisibility("private")}>
                <Icon name="lock" size={13} /> Private
              </button>
              <button className={"tg-vis-opt" + (visibility === "shared" ? " on" : "")} onClick={() => setVisibility("shared")}>
                <Icon name="users" size={13} /> Shared
              </button>
            </div>
          </div>
        </div>
        <p className="tg-vis-hint">
          {visibility === "shared"
            ? "Shared groups are available to everyone in the facility. Only you can edit or delete this one."
            : "Private groups are visible only to you."}
        </p>

        <div className="tg-ed-params">
          <div className="tg-ed-params-head">
            <span className="tg-field-l">Parameters <span className="tg-count data">{sel.size}</span></span>
            <div className="tg-search">
              <Icon name="search" size={15} color="var(--slate-400)" />
              <input placeholder="Filter parameters…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="tg-ed-list">
            {groupNames.length === 0 && <div className="tg-ed-empty">No parameters match “{q}”.</div>}
            {groupNames.map((gn) => (
              <div className="tg-ed-group" key={gn}>
                <div className="tg-ed-grouph">{gn}</div>
                {grouped[gn].map((d) => {
                  const on = sel.has(d.tag);
                  return (
                    <label className={"tg-ed-item" + (on ? " on" : "")} key={d.tag} {...njCheckable(() => toggle(d.tag), { on, label: d.name + " " + d.tag })}>
                      <Check on={on} />
                      <span className="tg-ed-item-name">{d.name}</span>
                      <span className="tg-ed-item-tag tag">{d.tag}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta">{sel.size} parameter{sel.size !== 1 ? "s" : ""} selected</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={onSave}>
            <Icon name="check" size={15} /> {group ? "Save changes" : "Save group"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════════════
// LIBRARY — browse / search / load / edit / duplicate / delete
// ════════════════════════════════════════════════════════════════════
function TrendGroupCard({ g, onLoad, onEdit, onDuplicate, onDelete }) {
  const [confirmDel, setConfirmDel] = React.useState(false);
  const owner = trendGroupIsOwner(g);
  const preview = (g.pens || []).slice(0, 4);
  const extra = (g.pens || []).length - preview.length;
  return (
    <div className="tg-card">
      <div className="tg-card-top">
        <div className="tg-card-titlewrap">
          <span className="tg-card-name">{g.name}</span>
          <div className="tg-card-meta">
            <TgVisTag visibility={g.visibility} />
            <span className="tg-card-owner">{tgOwnerLine(g)}</span>
            <span className="tg-card-dot">·</span>
            <span className="tg-card-count data">{(g.pens || []).length} params</span>
          </div>
        </div>
      </div>
      <div className="tg-card-chips">
        {preview.map((p) => <span className="tg-chip" key={p.tag} title={p.tag}>{p.name}</span>)}
        {extra > 0 && <span className="tg-chip tg-chip-more">+{extra}</span>}
      </div>
      {confirmDel ? (
        <div className="tg-card-confirm">
          <span>Delete “{g.name}”?</span>
          <div className="tg-card-confirm-btns">
            <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDel(false)}>Cancel</button>
            <button className="btn btn-danger btn-sm" onClick={() => { onDelete(g); }}><Icon name="trash-2" size={13} /> Delete</button>
          </div>
        </div>
      ) : (
        <div className="tg-card-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onLoad(g)}><Icon name="line-chart" size={14} /> Load</button>
          <span className="tg-card-actions-r">
            {owner && <button className="tg-icnbtn" title="Edit group" onClick={() => onEdit(g)}><Icon name="pencil" size={15} /></button>}
            <button className="tg-icnbtn" title="Duplicate as a starting point" onClick={() => onDuplicate(g)}><Icon name="copy" size={15} /></button>
            {owner && <button className="tg-icnbtn tg-icnbtn-del" title="Delete group" onClick={() => setConfirmDel(true)}><Icon name="trash-2" size={15} /></button>}
          </span>
        </div>
      )}
    </div>
  );
}

// ── one row in the LIST view (default: dense, scannable) ──
function TrendGroupRow({ g, onLoad, onEdit, onDuplicate, onDelete }) {
  const [confirmDel, setConfirmDel] = React.useState(false);
  const owner = trendGroupIsOwner(g);
  const n = (g.pens || []).length;
  return (
    <div className="tg-row">
      <button className="tg-row-main" onClick={() => onLoad(g)} title="Load this group">
        <span className="tg-row-icn"><Icon name={g.visibility === "shared" ? "users" : "lock"} size={15} /></span>
        <span className="tg-row-txt">
          <span className="tg-row-name">{g.name}</span>
          <span className="tg-row-sub">{tgOwnerLine(g)} <span className="tg-card-dot">·</span> <span className="data">{n}</span> param{n !== 1 ? "s" : ""} <span className="tg-card-dot">·</span> {g.updated}</span>
        </span>
      </button>
      {confirmDel ? (
        <span className="tg-row-confirm">
          <span className="tg-row-confirm-l">Delete?</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDel(false)}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(g)}><Icon name="trash-2" size={13} /></button>
        </span>
      ) : (
        <span className="tg-row-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onLoad(g)}><Icon name="line-chart" size={14} /> Load</button>
          {owner && <button className="tg-icnbtn" title="Edit group" onClick={() => onEdit(g)}><Icon name="pencil" size={15} /></button>}
          <button className="tg-icnbtn" title="Duplicate as a starting point" onClick={() => onDuplicate(g)}><Icon name="copy" size={15} /></button>
          {owner && <button className="tg-icnbtn tg-icnbtn-del" title="Delete group" onClick={() => setConfirmDel(true)}><Icon name="trash-2" size={15} /></button>}
        </span>
      )}
    </div>
  );
}

function TrendGroupsLibrary() {
  const gs = useTrendGroups();
  const [q, setQ] = React.useState("");
  const [scope, setScope] = React.useState("all");
  // list view is the default (easier scanning / managing many groups); card view is optional.
  const [view, setView] = React.useState(() => localStorage.getItem("nj_tg_view") || "list");
  const setViewP = (v) => { setView(v); try { localStorage.setItem("nj_tg_view", v); } catch (e) {} };
  const pens = trendStore.pens;

  const filtered = gs.groups.filter((g) => {
    if (scope === "mine" && !trendGroupIsOwner(g)) return false;
    if (scope === "shared" && g.visibility !== "shared") return false;
    const ql = q.trim().toLowerCase();
    if (ql && ![g.name, g.owner].join(" ").toLowerCase().includes(ql)) return false;
    return true;
  });

  const onLoad = (g) => { njLoadTrendGroup(g); closeDialog(); };
  const onEdit = (g) => openDialog(<TrendGroupEditor group={g} />);
  const onDuplicate = (g) => { const d = trendGroupStore.duplicate(g.id); if (d) openDialog(<TrendGroupEditor group={d} />); };
  const onDelete = (g) => { trendGroupStore.remove(g.id); njToast(`“${g.name}” deleted.`); };
  const scopes = [["all", "All"], ["mine", "My groups"], ["shared", "Shared"]];

  return (
    <Dialog width={640}>
      <DlgHeader icon="folder" name="Trend Groups" onClose={closeDialog} />
      <div className="tg-lib-toolbar">
        <div className="tg-search tg-search-lg">
          <Icon name="search" size={16} color="var(--slate-400)" />
          <input placeholder="Search groups…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="segmented tg-scope">
          {scopes.map(([v, l]) => <button key={v} className={"seg" + (scope === v ? " active" : "")} onClick={() => setScope(v)}>{l}</button>)}
        </div>
        <div className="tg-viewtoggle" role="group" aria-label="View">
          <button className={"tg-vt" + (view === "list" ? " on" : "")} title="List view" aria-pressed={view === "list"} onClick={() => setViewP("list")}><Icon name="list" size={16} /></button>
          <button className={"tg-vt" + (view === "cards" ? " on" : "")} title="Card view" aria-pressed={view === "cards"} onClick={() => setViewP("cards")}><Icon name="layout-grid" size={16} /></button>
        </div>
        <button className="btn btn-primary btn-sm tg-new" onClick={() => openDialog(<TrendGroupEditor seedPens={pens} />)}>
          <Icon name="plus" size={14} /> New group
        </button>
      </div>
      <div className="dlg-body tg-lib-body">
        {filtered.length === 0 ? (
          <div className="tg-lib-empty">
            <span className="tg-lib-empty-icn"><Icon name="folder-open" size={26} /></span>
            <div className="body-strong">{gs.groups.length === 0 ? "No Trend Groups yet" : "No groups match your search"}</div>
            <p className="body" style={{ maxWidth: 340, margin: 0 }}>
              {gs.groups.length === 0
                ? "Plot the parameters you analyse together, then save them as a group to reopen in one click."
                : "Try a different search or scope."}
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => openDialog(<TrendGroupEditor seedPens={pens} />)}>
              <Icon name="plus" size={14} /> New group{pens.length ? ` from current ${pens.length} signals` : ""}
            </button>
          </div>
        ) : (
          view === "list" ? (
            <div className="tg-lib-list">
              {filtered.map((g) => (
                <TrendGroupRow key={g.id} g={g} onLoad={onLoad} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
              ))}
            </div>
          ) : (
            <div className="tg-lib-grid">
              {filtered.map((g) => (
                <TrendGroupCard key={g.id} g={g} onLoad={onLoad} onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
              ))}
            </div>
          )
        )}
      </div>
    </Dialog>
  );
}

// entry points
function openTrendGroups() { openDialog(<TrendGroupsLibrary />); }
function openTrendGroupEditor(group, seedPens) { openDialog(<TrendGroupEditor group={group} seedPens={seedPens} />); }

Object.assign(window, { TrendGroupsLibrary, TrendGroupEditor, openTrendGroups, openTrendGroupEditor });
