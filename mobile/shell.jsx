// shell.jsx — device frame, chrome, navigation store and shared mobile primitives.
// One iPhone 16 Pro frame (393×852) with status bar, dynamic island, home indicator,
// a persistent alarm ribbon, a 5-tab bottom bar, and a stack-based in-tab navigator.

// ---- Lucide icon wrapper (mirrors lib/icon.jsx) ----
function MIcon({ name, size = 20, strokeWidth = 2, color, style, className }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const lib = window.lucide, el = ref.current;
    if (!lib || !el) return;
    el.innerHTML = "";
    const i = document.createElement("i"); i.setAttribute("data-lucide", name); el.appendChild(i);
    try { lib.createIcons({ attrs: { "stroke-width": strokeWidth } }); } catch (e) {}
  });
  return <span ref={ref} className={"micon " + (className || "")} style={{ display: "inline-flex", width: size, height: size, color: color || "currentColor", flexShrink: 0, ...style }} />;
}

// ---- shared primitives ----
function MDot({ level, size = 8 }) { const s = MSEV[level] || MSEV.ok; return <span className="mdot" style={{ width: size, height: size, background: s.dot }} />; }
function MBadge({ level, children }) { const s = MSEV[level] || MSEV.ok; const solid = level === "critical"; return <span className="mbadge" data-lvl={level} style={solid ? { background: s.solid, color: "#fff" } : { background: s.bg, color: s.text }}>{children || s.label}</span>; }
function MStat({ state }) { const map = { unack: ["UNACK", "crit"], ack: ["ACK", "ok"], returned: ["RTN", "muted"] }; const m = map[state] || map.ack; return <span className={"mstate mstate-" + m[1]}>{m[0]}</span>; }
// accessible toggle switch (role=switch + keyboard) — replaces bare <span onClick>
function MSwitch({ on, onToggle, label }) {
  return <button type="button" role="switch" aria-checked={on ? "true" : "false"} aria-label={label}
    className={"m-switch" + (on ? " on" : "")} onClick={(e) => { e.stopPropagation(); onToggle && onToggle(); }} />;
}

// Keyboard/screen-reader activation for non-<button> elements that carry an onClick
// (alarm rows, vital tiles, tank cards, health cells). Mirrors desktop `njActivate`:
// spreading it makes the element announce as a button AND be operable by keyboard or
// switch access — never a touch-only control. (WCAG 2.1.1 / 4.1.2)
function mActivate(fn, label) {
  return {
    role: "button", tabIndex: 0, "aria-label": label || undefined,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); e.stopPropagation(); fn(e); }
    },
  };
}

// mini sparkline / trend line (SVG, scales to container)
function MSpark({ data, color = "var(--primary)", h = 40, fill = false, thr = null, base = null }) {
  const w = 300; const min = Math.min(...data, thr != null ? thr : Infinity), max = Math.max(...data, thr != null ? thr : -Infinity);
  const rng = (max - min) || 1; const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / rng) * (h - 6) - 3]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = d + ` L${w},${h} L0,${h} Z`;
  const thrY = thr != null ? h - ((thr - min) / rng) * (h - 6) - 3 : null;
  return (
    <svg className="mspark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h }}>
      {fill && <path d={area} fill={color} opacity="0.10" />}
      {thrY != null && <line x1="0" y1={thrY} x2={w} y2={thrY} stroke="var(--critical)" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.7" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.2" fill={color} />
    </svg>
  );
}

// ---- navigation store: per-tab stack ----
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { id: "alarms", label: "Alarms", icon: "bell" },
  { id: "navigation", label: "Site Plan", icon: "map" },
  { id: "activity", label: "Activity", icon: "history" },
  { id: "more", label: "More", icon: "menu" },
];
const navStore = {
  tab: "dashboard", stacks: { dashboard: [], alarms: [], navigation: [], activity: [], more: [] },
  subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); },
  emit() { this.subs.forEach((f) => f()); },
  snap() { return this._s || (this._s = { tab: this.tab, stack: this.stacks[this.tab] }); },
  _bump() { this._s = { tab: this.tab, stack: this.stacks[this.tab] }; this.emit(); },
  setTab(t) { if (this.tab === t) { this.stacks[t] = []; } this.tab = t; this._bump(); },
  push(screen, props) { this.stacks[this.tab] = this.stacks[this.tab].concat([{ screen, props: props || {} }]); this._bump(); },
  back() { const s = this.stacks[this.tab]; if (s.length) { this.stacks[this.tab] = s.slice(0, -1); this._bump(); } },
  reset() { this.stacks[this.tab] = []; this._bump(); },
};
function useNav() { return React.useSyncExternalStore(navStore.sub.bind(navStore), navStore.snap.bind(navStore)); }
function mPush(screen, props) { navStore.push(screen, props); }
function mBack() { navStore.back(); }
function mTab(t) { navStore.setTab(t); }

// ---- toast ----
// a toast may carry ONE action: {label, fn} — used for Undo on bulk/destructive actions.
// Toasts with an action hold longer (6s) so the undo is actually reachable.
const toastStore = { msg: null, subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.msg; },
  show(msg, icon, action) { this.msg = { msg, icon, action, id: Date.now() }; this.subs.forEach((f) => f()); clearTimeout(this._t); this._t = setTimeout(() => { this.msg = null; this.subs.forEach((f) => f()); }, action ? 6000 : 2600); },
  hide() { clearTimeout(this._t); this.msg = null; this.subs.forEach((f) => f()); } };
function useToast() { return React.useSyncExternalStore(toastStore.sub.bind(toastStore), toastStore.snap.bind(toastStore)); }
function mToast(msg, icon, action) { toastStore.show(msg, icon, action); }
// role=status + aria-live: confirmations were previously silent to a screen reader.
function MToast() {
  const t = useToast();
  return <div className="m-toast-live" role="status" aria-live="polite" aria-atomic="true">
    {t && <div className="m-toast" key={t.id}><MIcon name={t.icon || "check"} size={16} color="#fff" /> <span>{t.msg}</span>
      {t.action && <button type="button" className="m-toast-act" onClick={() => { toastStore.hide(); t.action.fn(); }}>{t.action.label}</button>}</div>}
  </div>;
}

// ---- outdoor / high-contrast mode (persisted: an operator sets this once, for their shift) ----
const hcStore = { on: (() => { try { return localStorage.getItem("nj_mobile_hc") === "1"; } catch (e) { return false; } })(),
  subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.on; },
  apply() { document.body.setAttribute("data-hc", this.on ? "on" : "off"); },
  toggle() { this.on = !this.on; this.apply(); try { localStorage.setItem("nj_mobile_hc", this.on ? "1" : "0"); } catch (e) {} this.subs.forEach((f) => f()); } };
hcStore.apply();
function useHC() { return React.useSyncExternalStore(hcStore.sub.bind(hcStore), hcStore.snap.bind(hcStore)); }

// ---- offline mode ----
const offlineStore = { on: false, queue: 0, subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this._s || (this._s = { on: false, queue: 0 }); },
  toggle() { this.on = !this.on; if (!this.on) this.queue = 0; this._s = { on: this.on, queue: this.queue }; this.subs.forEach((f) => f()); },
  enqueue() { if (this.on) { this.queue++; this._s = { on: this.on, queue: this.queue }; this.subs.forEach((f) => f()); return true; } return false; } };
function useOffline() { return React.useSyncExternalStore(offlineStore.sub.bind(offlineStore), offlineStore.snap.bind(offlineStore)); }

// ---- status bar ----
function StatusBar() {
  const off = useOffline();
  return (
    <div className="m-statusbar">
      <span className="m-sb-time">9:41</span>
      <div className="m-island" />
      <div className="m-sb-right">
        {off.on ? <MIcon name="cloud-off" size={15} /> : <MIcon name="signal" size={15} />}
        <MIcon name="wifi" size={15} />
        <MIcon name="battery-full" size={17} />
      </div>
    </div>
  );
}

// ---- persistent alarm ribbon (ISA-18.2 annunciator, mobile) ----
function AlarmRibbon() {
  const nav = useNav();
  const unacked = M_ALARMS.filter((a) => a.state === "unack" && a.supp === "none").sort((x, y) => MSEV[x.level].rank - MSEV[y.level].rank || x.min - y.min);
  if (!unacked.length) return <div className="m-ribbon m-ribbon-clear"><MIcon name="check-circle-2" size={15} /> All active alarms acknowledged</div>;
  const top = unacked[0]; const s = MSEV[top.level]; const rest = unacked.length - 1;
  return (
    <button className="m-ribbon" data-lvl={top.level} style={{ borderLeftColor: s.dot }}
      onClick={() => { mTab("alarms"); setTimeout(() => mPush("alarmDetail", { id: top.id }), 0); }}>
      <span className="m-ribbon-sev" style={{ background: s.chip, color: s.chipInk }}>{s.label}</span>
      <span className="m-ribbon-txt"><b>{top.alarm}</b><span className="m-ribbon-meta"><span className="tag">{top.tag}</span> · {mAgo(top.min)}{top.min > 1440 ? " · stale" : ""}</span></span>
      {rest > 0 && <span className="m-ribbon-more">+{rest}</span>}
      <MIcon name="chevron-right" size={18} />
    </button>
  );
}

// ---- bottom tab bar ----
function TabBar() {
  const nav = useNav(); const c = mCounts();
  return (
    <nav className="m-tabbar">
      {TABS.map((t) => {
        const active = nav.tab === t.id;
        return (
          <button key={t.id} className={"m-tab" + (active ? " on" : "")} onClick={() => mTab(t.id)}>
            <span className="m-tab-ic">
              <MIcon name={t.icon} size={23} strokeWidth={active ? 2.4 : 2} />
              {t.id === "alarms" && c.unack > 0 && <span className="m-tab-badge">{c.unack}</span>}
            </span>
            <span className="m-tab-lbl">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ---- generic screen header (with optional back) ----
function MHeader({ title, sub, back, right, onBack }) {
  return (
    <div className="m-head">
      <div className="m-head-l">
        {back && <button className="m-back" aria-label="Back" onClick={onBack || mBack}><MIcon name="chevron-left" size={26} /></button>}
        <div className="m-head-titles"><div className="m-head-title">{title}</div>{sub && <div className="m-head-sub">{sub}</div>}</div>
      </div>
      {right && <div className="m-head-r">{right}</div>}
    </div>
  );
}

// ---- pull-to-refresh wrapper ----
function PullScroll({ children, className }) {
  const [pull, setPull] = React.useState(0); const [refreshing, setRefreshing] = React.useState(false);
  const start = React.useRef(null); const ref = React.useRef(null);
  const onStart = (e) => { if (ref.current && ref.current.scrollTop <= 0) start.current = e.touches ? e.touches[0].clientY : e.clientY; };
  const onMove = (e) => { if (start.current == null) return; const y = e.touches ? e.touches[0].clientY : e.clientY; const d = y - start.current; if (d > 0) { setPull(Math.min(d * 0.5, 80)); } };
  const onEnd = () => { if (pull > 55) { setRefreshing(true); mToast("Refreshed · live data synced", "refresh-cw"); setTimeout(() => { setRefreshing(false); setPull(0); }, 900); } else setPull(0); start.current = null; };
  return (
    <div className={"m-scroll " + (className || "")} ref={ref} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onMouseDown={onStart} onMouseMove={(e) => e.buttons && onMove(e)} onMouseUp={onEnd} onMouseLeave={onEnd}>
      <div className="m-pull" style={{ height: refreshing ? 44 : pull, opacity: pull > 10 || refreshing ? 1 : 0 }}>
        <MIcon name="refresh-cw" size={18} className={refreshing ? "spin" : ""} style={{ transform: `rotate(${pull * 4}deg)` }} />
      </div>
      <div style={{ transform: `translateY(${refreshing ? 0 : pull}px)`, transition: start.current == null ? "transform .25s" : "none" }}>{children}</div>
    </div>
  );
}

// ---- global search sheet ----
const searchStore = { open: false, subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.open; }, set(v) { this.open = v; this.subs.forEach((f) => f()); } };
function useSearch() { return React.useSyncExternalStore(searchStore.sub.bind(searchStore), searchStore.snap.bind(searchStore)); }
function mSearch(v) { searchStore.set(v); }

// ---- generic bottom-sheet host (confirm dialogs, composers) ----
const sheetStore = { node: null, subs: new Set(), sub(f) { this.subs.add(f); return () => this.subs.delete(f); }, snap() { return this.node; },
  open(node) { this.node = node; this.subs.forEach((f) => f()); }, close() { this.node = null; this.subs.forEach((f) => f()); } };
function useSheet() { return React.useSyncExternalStore(sheetStore.sub.bind(sheetStore), sheetStore.snap.bind(sheetStore)); }
function mSheet(node) { sheetStore.open(node); }
function mCloseSheet() { sheetStore.close(); }

// ---- modal semantics for bottom sheets (WCAG 4.1.2 / 2.4.3) ----
// Sheets are announced as dialogs, take focus on open, keep Tab inside, and hand focus back to
// the control that opened them. Applied here ONCE for every sheet pushed through sheetStore, so
// individual sheet components stay plain markup. Escape is handled by App.
function mTrapTab(e) {
  if (e.key !== "Tab") return;
  const el = e.currentTarget.querySelector(".m-sheet"); if (!el) return;
  const f = [...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function MSheetHost() {
  const node = useSheet(); const wrap = React.useRef(null); const opener = React.useRef(null);
  React.useEffect(() => {
    if (!node) { const p = opener.current; opener.current = null; if (p && p.isConnected) p.focus(); return; }
    opener.current = document.activeElement;
    const el = wrap.current && wrap.current.querySelector(".m-sheet"); if (!el) return;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.tabIndex = -1;
    if (!el.getAttribute("aria-label")) {
      const t = el.querySelector(".m-confirm-t,.m-sheet-title");
      el.setAttribute("aria-label", t ? t.textContent.trim() : "Dialog");
    }
    const f = el.querySelector('input:not([type=hidden]),textarea,select,button:not([disabled])');
    const id = setTimeout(() => { (f || el).focus(); }, 40);
    return () => clearTimeout(id);
  }, [node]);
  if (!node) return null;
  return <div ref={wrap} style={{ display: "contents" }} onKeyDown={mTrapTab}>{node}</div>;
}

Object.assign(window, { MIcon, MDot, MBadge, MStat, MSwitch, mActivate, MSpark, TABS, navStore, useNav, mPush, mBack, mTab,
  useToast, mToast, MToast, useHC, hcStore, useOffline, offlineStore, StatusBar, AlarmRibbon, TabBar, MHeader, PullScroll, useSearch, mSearch, searchStore,
  sheetStore, useSheet, mSheet, mCloseSheet, MSheetHost, mTrapTab, toastStore });
