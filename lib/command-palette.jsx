// command-palette.jsx — global Ctrl/Cmd-K command palette for fast wayfinding across a
// facility of 3 buildings × 9 departments × many systems + tags. Window.CommandPalette,
// mounted once in App. Sources: screens (NAV), systems (FACILITY), alarm views, and the
// trend-tag catalog (TREND_CATALOG). Selecting a result navigates / re-scopes / trends.
// Keyboard: Cmd/Ctrl-K toggles · ↑/↓ move · Enter run · Esc close.

// njGoSystem sets __njNavSub before routing, so NavigationView mounts on the right tab. This
// used to navigate first and switch tabs from a 60ms setTimeout, which briefly showed whatever
// tab was last open and lost the target if the mount took longer. It also routes Feeding to the
// top-level Feeding screen, which the palette previously did not.
function cmdGoSystem(bId, dId, label) {
  njGoSystem(bId, dId, label);
}

// build the full command index once (rebuilt each open so live counts are fresh)
function buildCommandIndex() {
  const items = [];
  (window.NAV || []).forEach((n) => items.push({
    kind: "Screen", label: n.label,
    hint: "Go to screen", run: () => { if (n.id === "navigation" && window.__njGoPlan) window.__njGoPlan(); else if (window.__njNavigate) window.__njNavigate(n.id); },
  }));
  ["Active", "All Alarms", "Historical", "Deactivated", "Statistics"].forEach((t) => items.push({
    kind: "Alarms", label: "Alarms · " + t, hint: "Open alarm list",
    run: () => { if (window.__njGoAlarms) window.__njGoAlarms(t); },
  }));
  const toSev = window.njSev || ((s) => s);
  (window.FACILITY || []).forEach((b) => (b.depts || []).forEach((d) => (d.systems || []).forEach((s) => {
    items.push({
      kind: "System", label: s.label, status: toSev(s.status),
      hint: b.name + " · " + d.name + (d.sub ? " · " + d.sub : ""), sub: b.name + " " + d.name,
      run: () => { if (s.label === "Feeding" || /feeding/i.test(s.label)) { if (window.__njNavigate) window.__njNavigate("feeding"); } else cmdGoSystem(b.id, d.id, s.label); },
    });
  })));
  const cat = window.TREND_CATALOG || {};
  Object.keys(cat).forEach((tag) => { const p = cat[tag]; items.push({
    kind: "Parameter", label: p.name, hint: tag + " · " + (p.group || "") + " → Trends", sub: tag,
    run: () => { if (window.njSendToTrend) window.njSendToTrend(tag); if (window.__njNavigate) window.__njNavigate("analytics"); },
  }); });
  return items;
}

function cmdScore(item, q) {
  const hay = (item.label + " " + (item.sub || "") + " " + item.kind + " " + (item.hint || "")).toLowerCase();
  const label = item.label.toLowerCase();
  if (label.startsWith(q)) return 3;
  if (label.includes(q)) return 2;
  if (hay.includes(q)) return 1;
  // subsequence fallback (fuzzy)
  let i = 0; for (const c of hay) { if (c === q[i]) i++; if (i === q.length) return 0.5; }
  return 0;
}

function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);
  const index = React.useMemo(() => (open ? buildCommandIndex() : []), [open]);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setOpen((v) => !v); setQ(""); setSel(0); }
      else if (e.key === "Escape" && open) { setOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  React.useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const ql = q.trim().toLowerCase();
  const results = React.useMemo(() => {
    if (!open) return [];
    let list = index;
    if (ql) list = index.map((it) => ({ it, s: cmdScore(it, ql) })).filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s).map((r) => r.it);
    else list = index.filter((it) => it.kind === "Screen" || it.kind === "System");
    return list.slice(0, 40);
  }, [index, ql, open]);
  React.useEffect(() => { setSel(0); }, [ql]);

  const run = (it) => { setOpen(false); it && it.run && it.run(); };
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); run(results[sel]); }
  };
  React.useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('[data-i="' + sel + '"]');
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [sel]);

  if (!open) return null;
  let lastKind = null;
  return (
    <div className="cmdk-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cmdk-in">
          <Icon name="search" size={18} color="var(--slate-400)" />
          <input ref={inputRef} className="cmdk-input" placeholder="Search screens, systems, alarms, parameters…"
            value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} />
          <span className="cmdk-esc">esc</span>
        </div>
        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 && <div className="cmdk-empty">No matches for “{q}”</div>}
          {results.map((it, i) => {
            const head = it.kind !== lastKind ? it.kind : null; lastKind = it.kind;
            return (
              <React.Fragment key={i}>
                {head && <div className="cmdk-group">{head}</div>}
                <button data-i={i} className={"cmdk-row" + (i === sel ? " sel" : "")}
                  onMouseEnter={() => setSel(i)} onClick={() => run(it)}>
                  <span className="cmdk-lead">{it.status ? <Dot level={it.status} /> : null}</span>
                  <span className="cmdk-lbl">{it.label}</span>
                  {it.hint && <span className="cmdk-hint">{it.hint}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
window.CommandPalette = CommandPalette;
window.__njOpenCommandPalette = function () { window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true })); };
