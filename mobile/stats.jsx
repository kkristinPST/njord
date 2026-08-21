// stats.jsx — mobile Alarm Statistics. Desktop is the source of truth: this reads the SAME
// activation register (`AS_REG` / `asBuild` from screens/alarm-stats.jsx), so every number
// matches the control room. The desktop's date+time-of-day range picker is reduced to two
// presets — a phone in a wet corridor is a "what happened this week" surface, not a query tool.

const MST_PERIODS = [["week", "Last 7 days", 7], ["month", "Last 28 days", 28]];
const MST_ORDER = ["critical", "high", "medium", "low", "diagnostic"];

function MStatDonut({ segments, total }) {
  const size = 132, sw = 20, r = (size - sw) / 2 - 1, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="mst-donut">
      <svg viewBox={"0 0 " + size + " " + size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={sw} />
        {segments.map((s, i) => {
          const len = (s.value / (total || 1)) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={MSEV[s.level].dot}
            strokeWidth={sw} strokeDasharray={len + " " + (c - len)} strokeDashoffset={-acc} />;
          acc += len; return el;
        })}
      </svg>
      <div className="mst-donut-c"><span className="mst-donut-l">Total</span><span className="mst-donut-v data">{total.toLocaleString()}</span></div>
    </div>
  );
}

function MStatBars({ data }) {
  const max = data.dayMax;
  return (
    <div className="mst-bars">
      <div className="mst-bars-plot">
        {data.perDay.map((d, i) => {
          const tot = d.segs.reduce((s, [, v]) => s + v, 0);
          return (
            <div key={i} className="mst-col">
              <div className="mst-stack" style={{ height: Math.max(2, (tot / max) * 100) + "%" }}>
                {d.segs.map(([lvl, v], j) => <div key={j} style={{ height: (v / tot) * 100 + "%", background: MSEV[lvl].dot }} />)}
              </div>
              <span className="mst-col-x">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MStatPrioBar({ b, total }) {
  const present = MST_ORDER.filter((k) => b[k]);
  return <span className="mst-pbar">{present.map((k) => <span key={k} style={{ width: (b[k] / total) * 100 + "%", background: MSEV[k].dot }} />)}</span>;
}

function MStatLocations({ data }) {
  const [open, setOpen] = React.useState({});
  return (
    <div className="m-list">
      {data.locations.map((loc) => (
        <React.Fragment key={loc.name}>
          <button className="m-lrow" onClick={() => setOpen((o) => ({ ...o, [loc.name]: !o[loc.name] }))}>
            <div className="m-lrow-main">
              <div className="m-lrow-t" style={{ fontSize: 13.5 }}>{loc.name}</div>
              <MStatPrioBar b={loc.b} total={loc.total} />
            </div>
            <div className="m-lrow-r"><span className="data" style={{ fontWeight: 700, color: "var(--ink)" }}>{loc.total}</span>
              <MIcon name={open[loc.name] ? "chevron-up" : "chevron-down"} size={17} /></div>
          </button>
          {open[loc.name] && loc.children.map((ch) => (
            <div key={ch.name} className="m-lrow mst-child" style={{ cursor: "default" }}>
              <div className="m-lrow-main"><div className="m-lrow-s" style={{ fontSize: 12.5, color: "var(--slate-600)" }}>{ch.name}</div>
                <MStatPrioBar b={ch.b} total={ch.total} /></div>
              <span className="data" style={{ fontSize: 12, fontWeight: 700 }}>{ch.total}</span>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function MStatTop({ data }) {
  const rows = data.list.slice(0, 10);
  const max = rows.length ? rows[0].n : 1;
  return (
    <div className="m-list">
      {rows.map((r, i) => (
        <div key={r.tag + i} className="m-lrow" style={{ cursor: "default" }}>
          <span className="mst-rank data">{i + 1}</span>
          <div className="m-lrow-main">
            <div className="m-lrow-t" style={{ fontSize: 13 }}>{r.alarm}</div>
            <div className="m-lrow-s"><span className="tag">{r.tag}</span> · {r.loc}</div>
            <span className="mst-cbar"><span style={{ width: (r.n / max) * 100 + "%", background: MSEV[r.level].dot }} /></span>
          </div>
          <span className="data" style={{ fontWeight: 700 }}>{r.n}</span>
        </div>
      ))}
    </div>
  );
}

function MStatRegister({ data }) {
  const [q, setQ] = React.useState("");
  const [limit, setLimit] = React.useState(15);
  const ql = q.trim().toLowerCase();
  const rows = data.list.filter((r) => !ql || (r.alarm + " " + r.tag + " " + r.loc + " " + r.sub).toLowerCase().includes(ql));
  const shown = rows.slice(0, limit);
  return (
    <React.Fragment>
      <div className="m-searchbar" style={{ marginBottom: 8 }}>
        <MIcon name="search" size={18} color="var(--slate-400)" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(15); }} placeholder="Filter alarm, tag, location…" aria-label="Filter the activation register" />
      </div>
      <div className="m-list">
        {shown.map((r, i) => (
          <div key={r.tag + i} className="m-lrow" style={{ cursor: "default", alignItems: "flex-start" }}>
            <div className="m-lrow-main">
              <div className="m-inline" style={{ gap: 6, marginBottom: 3 }}><MBadge level={r.level} /><span className="mst-ev"><MIcon name="corner-down-left" size={11} /> {r.ev}</span></div>
              <div className="m-lrow-t" style={{ fontSize: 13 }}>{r.alarm}</div>
              <div className="m-lrow-s"><span className="tag">{r.tag}</span> · {r.loc} {r.sub}</div>
              <div className="mst-last data">Last {r.last}</div>
            </div>
            <div className="mst-ns"><span className="data mst-n">{r.n}</span><span className="mst-tot data">{r.total.toLocaleString()} total</span></div>
          </div>
        ))}
        {!shown.length && <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--slate-500)", fontSize: 13 }}>No alarms match the filter.</div>}
      </div>
      {rows.length > shown.length && <button className="m-btn m-btn-secondary" style={{ marginTop: 12 }} onClick={() => setLimit(limit + 15)}>
        <MIcon name="chevron-down" size={16} /> Load more</button>}
    </React.Fragment>
  );
}

const MST_VIEWS = ["Locations", "Top 10", "Register"];
function AlarmStatsScreen() {
  useNav();
  const [period, setPeriod] = React.useState("week");
  const [view, setView] = React.useState(MST_VIEWS[0]);
  const days = MST_PERIODS.find((p) => p[0] === period)[2];
  const data = React.useMemo(() => asBuild(period, days, 1), [period, days]);
  const prev = React.useMemo(() => asBuild(period, days, 0.86).total, [period, days]);
  const diff = data.total - prev;
  const crit = data.category.find((c) => c.level === "critical");
  const high = data.category.find((c) => c.level === "high");
  const busiestTot = data.busiest ? data.busiest.segs.reduce((s, [, v]) => s + v, 0) : 0;
  return (
    <React.Fragment>
      <MHeader back title="Alarm Statistics" sub={data.total.toLocaleString() + " activations · " + days + " days"}
        right={<button className="m-icbtn" aria-label="Export statistics" onClick={() => mToast("Export started: CSV", "download")}><MIcon name="download" size={18} /></button>} />
      <PullScroll><div className="m-pad">
        <div className="m-seg" style={{ marginBottom: 12 }}>
          {MST_PERIODS.map(([k, l]) => <button key={k} className={period === k ? "on" : ""} onClick={() => setPeriod(k)}>{l}</button>)}
        </div>
        <div className="m-vitals">
          <div className="m-vital"><div className="m-vital-lbl"><MIcon name="bell-ring" size={12} /> Activations</div><div className="m-vital-val">{data.total.toLocaleString()}</div><div className="m-vital-sub">{(diff >= 0 ? "+" : "−") + Math.abs(diff)} vs previous period</div></div>
          <div className="m-vital"><div className="m-vital-lbl"><MIcon name="calendar" size={12} /> Busiest day</div><div className="m-vital-val" style={{ fontSize: 20 }}>{data.busiest ? data.busiest.day : "—"}</div><div className="m-vital-sub">{busiestTot} activations</div></div>
          <div className="m-vital"><div className="m-vital-lbl"><MDot level="critical" /> Critical</div><div className="m-vital-val">{crit ? crit.value : 0}</div><div className="m-vital-sub">{(((crit ? crit.value : 0) / (data.total || 1)) * 100).toFixed(1)} % of total</div></div>
          <div className="m-vital"><div className="m-vital-lbl"><MDot level="high" /> High</div><div className="m-vital-val">{high ? high.value : 0}</div><div className="m-vital-sub">{(((high ? high.value : 0) / (data.total || 1)) * 100).toFixed(1)} % of total</div></div>
        </div>

        <div className="m-eyebrow">By priority</div>
        <div className="mc mc-pad">
          <div className="mst-donut-wrap">
            <MStatDonut segments={data.category} total={data.total} />
            <div className="mst-legend">
              {MST_ORDER.map((lvl) => {
                const seg = data.category.find((c) => c.level === lvl); const v = seg ? seg.value : 0;
                return <div key={lvl} className="mst-lrow"><span className="mst-ldot" style={{ background: MSEV[lvl].dot }} />
                  <span className="mst-lname">{MSEV[lvl].label}</span><span className="data mst-lval">{v}</span>
                  <span className="mst-lpct data">{((v / (data.total || 1)) * 100).toFixed(1)} %</span></div>;
              })}
            </div>
          </div>
        </div>

        <div className="m-eyebrow">Alarms per {data.bucket.toLowerCase()}</div>
        <div className="mc mc-pad"><MStatBars data={data} /></div>

        <div className="m-eyebrow">Breakdown</div>
        <div className="m-seg" style={{ marginBottom: 10 }}>
          {MST_VIEWS.map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v}</button>)}
        </div>
        {view === "Locations" && <MStatLocations data={data} />}
        {view === "Top 10" && <MStatTop data={data} />}
        {view === "Register" && <MStatRegister data={data} />}
        <div className="m-de-help" style={{ marginTop: 12 }}>Activation counts, not individual events. Single events are in the alarm history.</div>
      </div></PullScroll>
    </React.Fragment>
  );
}

Object.assign(window, { AlarmStatsScreen, MStatDonut, MStatBars });
