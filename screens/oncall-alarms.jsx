// oncall-alarms.jsx — which alarms an on-call group pages for.
// Covers (priority) + Area coverage set the STARTING list (the rule). The tree below edits it by
// hand: whole departments, systems, equipment or single alarms in or out — parity with the
// legacy "Alarms In Group" tree. Stored as exceptions to the rule (g.alarmAdd / g.alarmDel, row
// ids from the alarm register), so changing Covers or the area keeps every hand edit.
// Tree: Department → System → Equipment → Alarm, from RATN_DATA (the alarm register).
const OCA_RANK = { critical: 0, high: 1, medium: 2, low: 3, diagnostic: 4 };
// the register's department names map to the facility's department ids (first match by name)
function ocaDeptId(dept) { const a = (window.OC_AREAS || []).find((x) => x.d === dept); return a ? a.id : dept; }
function ocaByRule(g, r) {
  const areas = g.areas || [];
  return (OCA_RANK[r.priority] ?? 9) <= (OCA_RANK[g.minPriority] ?? 9) && (!areas.length || areas.includes(ocaDeptId(r.dept)));
}
function ocaIn(g, add, del, r) { return del.has(r.id) ? false : add.has(r.id) ? true : ocaByRule(g, r); }
function ocaRows() { return window.RATN_DATA || []; }
function ocAlarmCount(g) {
  const add = new Set(g.alarmAdd || []), del = new Set(g.alarmDel || []);
  return ocaRows().reduce((n, r) => n + (ocaIn(g, add, del, r) ? 1 : 0), 0);
}
let ocaTreeCache = null;
function ocaTree() {
  if (ocaTreeCache) return ocaTreeCache;
  const top = [], idx = {};
  const node = (list, key, label, depth) => { if (!idx[key]) { idx[key] = { key, label, depth, kids: [], leaves: [] }; list.push(idx[key]); } return idx[key]; };
  ocaRows().forEach((r) => {
    const d = node(top, "d|" + r.dept, r.dept, 0);
    const s = node(d.kids, "s|" + r.dept + "|" + r.system, r.system, 1);
    const e = node(s.kids, "e|" + r.dept + "|" + r.system + "|" + r.equipment, r.equipment, 2);
    e.leaves.push(r); s.leaves.push(r); d.leaves.push(r);
  });
  ocaTreeCache = top;
  return top;
}
const OCA_CAP = 400;

function OcAlarmsDialog({ g, onApply }) {
  const [add, setAdd] = React.useState(() => new Set(g.alarmAdd || []));
  const [del, setDel] = React.useState(() => new Set(g.alarmDel || []));
  const [open, setOpen] = React.useState(() => new Set());
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const tree = ocaTree();
  const hit = (r) => !ql || [r.tag, r.alarm, r.equipment, r.system, r.dept].join(" ").toLowerCase().includes(ql);
  const isIn = (r) => ocaIn(g, add, del, r);
  const setLeaves = (rows, on) => {
    const a = new Set(add), d = new Set(del);
    rows.forEach((r) => { a.delete(r.id); d.delete(r.id); if (ocaByRule(g, r) !== on) (on ? a : d).add(r.id); });
    setAdd(a); setDel(d);
  };
  const toggleOpen = (k) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const all = ocaRows();
  const nIn = all.filter(isIn).length;
  let shown = 0, capped = false;
  const renderNode = (n) => {
    const leaves = ql ? n.leaves.filter(hit) : n.leaves;
    if (!leaves.length) return null;
    const c = leaves.filter(isIn).length;
    const exp = ql || open.has(n.key);
    return (
      <React.Fragment key={n.key}>
        <div className="oca-row" style={{ paddingLeft: 8 + n.depth * 20 }}>
          <button className="oca-chev" aria-expanded={!!exp} aria-label={(exp ? "Collapse " : "Expand ") + n.label} onClick={() => toggleOpen(n.key)}><Icon name={exp ? "chevron-down" : "chevron-right"} size={14} /></button>
          <Check on={c === leaves.length} indeterminate={c > 0 && c < leaves.length} onClick={() => setLeaves(leaves, c !== leaves.length)} />
          <button className="oca-lbl" onClick={() => toggleOpen(n.key)}>{n.label}</button>
          <span className="oca-n data">{c} / {leaves.length}</span>
        </div>
        {exp && (n.kids.length ? n.kids.map(renderNode) : leaves.map((r) => {
          if (shown >= OCA_CAP) { capped = true; return null; }
          shown++;
          const on = isIn(r), hand = add.has(r.id) || del.has(r.id);
          return (
            <div className="oca-row oca-leaf" key={r.id} style={{ paddingLeft: 8 + (n.depth + 1) * 20 + 20 }}>
              <Check on={on} onClick={() => setLeaves([r], !on)} />
              <span className="oca-alarm"><span className="oca-alarm-t">{r.alarm}</span><span className="tag">{r.tag}</span>{hand && <span className="oca-hand" title="Changed by hand, not by Covers or Area coverage">{on ? "added" : "removed"}</span>}</span>
              <Badge level={r.priority} />
            </div>
          );
        }))}
      </React.Fragment>
    );
  };
  const body = tree.map(renderNode);
  const nHand = add.size + del.size;
  return (
    <Dialog width={760}>
      <DlgHeader icon="list-checks" name={"Alarms in group · " + (g.name.trim() || "New group")} onClose={closeDialog} />
      <div className="dlg-body oca-body">
        <p className="oc-mininfo">Covers and Area coverage set the starting list. Tick or untick a department, system, equipment or single alarm to add or remove it.</p>
        <div className="field oca-search">
          <Icon name="search" size={16} color="var(--slate-400)" />
          <input placeholder="Filter by alarm, tag or equipment…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {ql && <p className="oc-mininfo">Ticking a branch while filtering changes only the alarms that match.</p>}
        <div className="oca-tree" role="tree">
          <div className="oca-head"><span>Alarm</span><span>Priority</span></div>
          {body.some(Boolean) ? body : <NjInline>{"No alarms match “" + q.trim() + "”."}</NjInline>}
          {capped && <NjInline>{"Showing the first " + OCA_CAP + " alarms. Refine the filter to see the rest."}</NjInline>}
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><b className="data">{nIn}</b>&nbsp;of {all.length} alarms in group{nHand ? " · " + add.size + " added, " + del.size + " removed by hand" : ""}
          {nHand > 0 && <button className="linkbtn" onClick={() => { setAdd(new Set()); setDel(new Set()); }}>Reset to Covers and area</button>}</span>
        <div className="dlg-foot-btns">
          <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onApply({ alarmAdd: [...add], alarmDel: [...del] }); closeDialog(); }}><Icon name="check" size={16} /> Apply</button>
        </div>
      </div>
    </Dialog>
  );
}
function openOcAlarms(g, setG) { openDialog(<OcAlarmsDialog g={g} onApply={(p) => setG((s) => Object.assign({}, s, p))} />); }

// the section in the group drawer / editor
function OcAlarmsSection({ g, setG }) {
  const n = ocAlarmCount(g), total = ocaRows().length;
  const a = (g.alarmAdd || []).length, d = (g.alarmDel || []).length;
  return (
    <div className="oc-ed-sec">
      <span className="oc-field-l">Alarms in group</span>
      <div className="oca-sum">
        <span><b className="data">{n}</b> of <span className="data">{total}</span> alarms{a || d ? " · " + a + " added, " + d + " removed by hand" : " · from Covers and Area coverage"}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => openOcAlarms(g, setG)}><Icon name="list-checks" size={14} /> Edit alarms</button>
      </div>
    </div>
  );
}

Object.assign(window, { OcAlarmsSection, openOcAlarms, ocAlarmCount });
