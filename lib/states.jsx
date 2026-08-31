// states.jsx — the app's empty, loading and progress states. One place, so a new screen
// cannot invent a fifth shape of "nothing here".
//
// EMPTY: always say WHY it is empty, because the operator's next action differs:
//   reason="empty"    nothing exists yet   → offer the action that creates the first one
//   reason="filtered" a filter excludes    → offer to clear the filter, never a create action
//   reason="search"   a query excludes     → echo the query, offer to clear it
//   reason="resolved" nothing is WRONG     → good news in a control room. Reads positive, no action.
//                     ONLY legal when nothing is narrowing the list. If a query or filter is
//                     active, an empty table means "hidden", not "healthy" — telling an operator
//                     there are no standing alarms while 18 are filtered out is the worst thing
//                     this component can say. Compute the reason, never hard-code `resolved` on
//                     a view that has filter inputs.
//   reason="blocked"  not permitted / off  → says who can change it
//   reason="error"    the fetch failed     → offers retry
// LOADING, by duration:
//   under ~1 s   nothing at all (a flash of skeleton is worse than a beat of stillness)
//   1–2 s        NjSpinner inside the control that was pressed (button keeps its label)
//   over ~2 s    NjSkeleton in the shape of the content, or NjProgress when the total is known
// Progress is never faked: njChunkRun reports real chunks of real work.

const NJ_EMPTY_PRESET = {
  empty:    { icon: "inbox",           tone: "info" },
  filtered: { icon: "filter-x",        tone: "neutral" },
  search:   { icon: "search-x",        tone: "neutral" },
  resolved: { icon: "check-circle-2",  tone: "good" },
  blocked:  { icon: "lock",            tone: "warn" },
  error:    { icon: "alert-triangle",  tone: "warn" },
};
// icon sizes come from the NJORD icon scale: 12 micro-mark · 14 inline with body text ·
// 16 default UI · 20 prominent · 24 hero. Never an off-scale value.
const NJ_EMPTY_IC = { region: 24, card: 24, compact: 20, row: 16 };

function NjEmpty({ reason = "empty", icon, tone, title, body, action, secondary, size = "region", className = "" }) {
  const p = NJ_EMPTY_PRESET[reason] || NJ_EMPTY_PRESET.empty;
  const tn = tone || p.tone;
  const cls = ["nj-empty", "size-" + size, tn && tn !== "neutral" ? "tone-" + tn : "", className].filter(Boolean).join(" ");
  const titleCls = size === "region" ? "card-title nj-empty-t" : "body-strong nj-empty-t";
  return (
    <div className={cls} role="status">
      <span className="nj-empty-ic"><Icon name={icon || p.icon} size={NJ_EMPTY_IC[size] || 24} /></span>
      <div className={titleCls}>{title}</div>
      {body ? <p className="nj-empty-body body">{body}</p> : null}
      {(action || secondary) ? <div className="nj-empty-acts">{action}{secondary}</div> : null}
    </div>
  );
}

// the same thing inside a <tbody>: one cell spanning the table, laid out on one line
function NjEmptyRow({ colSpan = 1, size = "row", ...rest }) {
  return <tr className="nj-empty-tr"><td colSpan={colSpan}><NjEmpty size={size} {...rest} /></td></tr>;
}

// the smallest tier: a single muted line inside a dropdown, popover or sub-panel. Not an empty
// STATE (no icon tile, no title, no action) — use it where a full one would dominate its container.
function NjInline({ icon, children, align = "center", className = "" }) {
  return (
    <div className={"nj-inline small" + (align === "left" ? " left" : "") + (className ? " " + className : "")} role="status">
      {icon ? <Icon name={icon} size={14} color="var(--slate-400)" /> : null}
      <span>{children}</span>
    </div>
  );
}

function NjSpinner({ size = 16, className = "" }) {
  return <span className={"nj-spin " + className} style={{ width: size, height: size, borderWidth: size <= 14 ? 2 : 2 }} aria-hidden="true" />;
}

// shape-of-the-content placeholders. `note` is required in spirit: say what is loading.
function NjSkeleton({ variant = "text", lines = 3, rows = 5, cols = 4, height = 180, note, className = "" }) {
  const widths = ["92%", "78%", "86%", "64%", "80%"];
  let body;
  if (variant === "chart") {
    const bars = [46, 68, 54, 82, 61, 74, 90, 58, 70, 84, 52, 66];
    body = <div className="nj-sk-chart" style={{ height }}>{bars.map((h, i) => <span key={i} className="nj-sk" style={{ height: h + "%" }} />)}</div>;
  } else if (variant === "table") {
    body = <div className="nj-sk-tbl">{Array.from({ length: rows }).map((_, r) => (
      <div className="nj-sk-tr" key={r}>{Array.from({ length: cols }).map((_, c) => (
        <span key={c} className="nj-sk" style={{ flex: c === 0 ? 2 : 1 }} />))}</div>))}</div>;
  } else if (variant === "block") {
    body = <span className="nj-sk" style={{ display: "block", height, borderRadius: "var(--r-md)" }} />;
  } else {
    body = <div className="nj-sk-lines">{Array.from({ length: lines }).map((_, i) => (
      <span key={i} className="nj-sk nj-sk-line" style={{ width: widths[i % widths.length] }} />))}</div>;
  }
  return (
    <div className={"nj-sk-wrap " + className} role="status" aria-busy="true" aria-label={note || "Loading"}>
      {body}
      {note ? <span className="nj-sk-note small"><NjSpinner size={12} /> {note}</span> : null}
    </div>
  );
}

function NjProgress({ value = 0, total = 0, label, sub, onCancel, cancelLabel = "Cancel", indeterminate }) {
  const pct = indeterminate ? 0 : total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className={"nj-prog" + (indeterminate ? " indeterminate" : "")} role="progressbar"
      aria-valuemin={0} aria-valuemax={indeterminate ? undefined : 100} aria-valuenow={indeterminate ? undefined : pct} aria-label={label}>
      <div className="nj-prog-head">
        <span className="nj-prog-l body-strong">{label}</span>
        {!indeterminate && <span className="nj-prog-pct">{pct} %</span>}
      </div>
      <div className="nj-prog-track"><span className="nj-prog-fill" style={indeterminate ? undefined : { width: pct + "%" }} /></div>
      {(sub || onCancel) ? (
        <div className="nj-prog-sub small">
          {sub}
          {onCancel ? <button className="btn btn-secondary btn-sm nj-prog-cancel" onClick={onCancel}>{cancelLabel}</button> : null}
        </div>
      ) : null}
    </div>
  );
}

// Real work in real chunks, one chunk per animation frame: the UI stays responsive, the
// percentage is the honest ratio of work done, and cancelling actually stops it.
// Returns { promise, cancel }.
function njChunkRun({ total, chunk = 2000, step, onProgress }) {
  const state = { cancelled: false };
  const promise = new Promise((resolve, reject) => {
    let i = 0;
    const tick = () => {
      if (state.cancelled) { reject(new Error("cancelled")); return; }
      const end = Math.min(total, i + chunk);
      for (; i < end; i++) step(i);
      if (onProgress) onProgress(i, total);
      if (i < total) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
  return { promise, cancel: () => { state.cancelled = true; } };
}

// "pretend to fetch" for prototype screens whose data is local but would be a server call
// in the real product. Keeps every simulated latency in ONE place so it can be tuned or removed.
const NJ_FAKE_LATENCY = 700;
function useNjLoading(deps, ms = NJ_FAKE_LATENCY) {
  const [loading, setLoading] = React.useState(false);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, deps);
  return loading;
}

Object.assign(window, { NjEmpty, NjEmptyRow, NjInline, NjSpinner, NjSkeleton, NjProgress, njChunkRun, useNjLoading, NJ_EMPTY_PRESET });
