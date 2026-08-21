// ras-mimic.jsx — faithful RAS process mimic (P&ID-style), rebuilt from the legacy
// SCADA capture. Symbols (pump / blower / motor / CO₂-fan / dose valve / O₂ cone /
// vessels) are recreated from the customer's own symbol set so the picture reads the
// way operators already know it. Two interaction layers:
//   • clicking a piece of EQUIPMENT (pump, blower, valve, cone, drum filter) → its popup
//   • hovering a VALUE readout reveals a small trend icon; clicking ONLY that icon
//     sends the parameter to the Trends register and surfaces a subtle toast (the
//     floating Trends window is opened separately, from the top-bar "Trends" button)
// Pure SVG (scales to its card); window.RasMimic replaces the old abstract mimic.

/* ───────────────────────── symbols ───────────────────────── */
// centrifugal pump — light "windowed" disc; HP-HMI: solid neutral when running, light when stopped
function SymPump({ cx, cy, s = 1.25, running }) {
  const body = running ? "var(--sc-run)" : "var(--sc-stop)";
  return (
    <g transform={`translate(${cx},${cy}) scale(${s}) translate(-17.32,-16.43)`}>
      <path d="M33.75 16.4297C33.75 7.3558 26.3942 0 17.3203 0C8.24645 0 0.890625 7.3558 0.890625 16.4297C0.890625 25.5035 8.24645 32.8594 17.3203 32.8594C26.3942 32.8594 33.75 25.5035 33.75 16.4297Z" fill="var(--sc-fill-lite)" />
      <path d="M17.2688 0.102936C8.22342 0.102936 0.890625 7.43573 0.890625 16.4812C0.890625 25.5267 8.22353 32.8594 17.2688 32.8594C26.3142 32.8594 33.6471 25.5266 33.6471 16.4812C33.6471 7.43562 26.3142 0.102936 17.2688 0.102936ZM17.013 2.66203L3.48148 17.2165C3.46834 16.9704 3.44972 16.73 3.44972 16.4807C3.44972 8.93509 9.50045 2.80004 17.013 2.66203ZM17.5247 2.66203C25.0374 2.80013 31.088 8.93565 31.088 16.4816C31.088 16.7309 31.0694 16.9713 31.0562 17.2174L17.5247 2.66203ZM4.44119 21.6318L30.0967 21.6318C28.0529 26.7094 23.0782 30.3007 17.2695 30.3007C11.4608 30.3007 6.48472 26.7094 4.44119 21.6318Z" fill={body} />
    </g>
  );
}
// CO₂ stripping fan / blower — two-leaf rotor
function SymFan({ cx, cy, s = 1.25, running }) {
  const body = running ? "var(--sc-run)" : "var(--sc-stop)";
  return (
    <g transform={`translate(${cx},${cy}) scale(${s}) translate(-17.32,-16.43)`}>
      <path d="M33.75 16.4297C33.75 7.3558 26.3942 0 17.3203 0C8.24645 0 0.890625 7.3558 0.890625 16.4297C0.890625 25.5035 8.24645 32.8594 17.3203 32.8594C26.3942 32.8594 33.75 25.5035 33.75 16.4297Z" fill="var(--sc-fill-lite)" />
      <path d="M0.890625 16.4324C0.890625 7.38686 8.21067 0.0664062 17.2567 0.0664062C26.3026 0.0664062 33.6227 7.38635 33.6227 16.4324C33.6227 25.4785 26.3026 32.7985 17.2567 32.7985C8.21067 32.7985 0.890625 25.4785 0.890625 16.4324ZM3.26523 16.4324C3.26523 22.1259 6.6631 27.0193 11.5443 29.2045L7.91822 6.06838C5.07763 8.62916 3.26523 12.3066 3.26523 16.4324ZM22.9685 29.2045C27.8497 27.0203 31.2476 22.1265 31.2476 16.4324C31.2476 12.3068 29.4353 8.62833 26.5947 6.06735L22.9685 29.2045Z" fill={body} />
    </g>
  );
}
// motor / impeller in a ring — used inside drum filter & MBBR blower cabinet
function SymMotor({ cx, cy, s = 1, running }) {
  const inner = running ? "var(--sc-run)" : "var(--sc-stop)";
  return (
    <g transform={`translate(${cx},${cy}) scale(${s}) translate(-21.08,-18.55)`}>
      <path d="M39.637 18.5555C39.637 8.30849 31.3302 0.00164795 21.0832 0.00164795C10.8361 0.00164795 2.5293 8.30849 2.5293 18.5555C2.5293 28.8025 10.8361 37.1094 21.0832 37.1094C31.3302 37.1094 39.637 28.8025 39.637 18.5555Z" fill="var(--sc-edge)" />
      <path d="M36.7374 18.5561C36.7374 9.91019 29.7285 2.90129 21.0826 2.90129C12.4366 2.90129 5.42773 9.91019 5.42773 18.5561C5.42773 27.202 12.4366 34.2109 21.0826 34.2109C29.7285 34.2109 36.7374 27.202 36.7374 18.5561Z" fill={inner} />
      <path d="M15.2852 5.79898L15.2852 31.3105H26.8813V5.79898H15.2852Z" fill="var(--sc-edge)" />
    </g>
  );
}
// dose / control valve — bowtie
function SymValve({ cx, cy, s = 1.1, running }) {
  const body = running ? "var(--sc-run)" : "var(--sc-stop)";
  return (
    <g transform={`translate(${cx},${cy}) scale(${s}) translate(-10.32,-16.15)`}>
      <path fillRule="evenodd" clipRule="evenodd" d="M19.6426 1.79492L10.3217 15.7762L1.00081 1.79492L19.6426 1.79492Z" fill={body} stroke="var(--sc-edge)" strokeWidth="0.926" />
      <path fillRule="evenodd" clipRule="evenodd" d="M19.6426 30.5008H1.00081L10.3217 16.5195L19.6426 30.5008Z" fill={body} stroke="var(--sc-edge)" strokeWidth="0.926" />
    </g>
  );
}
// oxygenation cone (DOX) — static
function SymCone({ cx, cy, s = 1.05 }) {
  return (
    <g transform={`translate(${cx},${cy}) scale(${s}) translate(-14.18,-22.6)`}>
      <path fillRule="evenodd" clipRule="evenodd" d="M14.1813 0.0395715C12.079 0.0395715 10.3748 0.32475 10.3748 0.676527V1.18609C10.3748 1.36717 10.837 1.53962 11.6436 1.66033V3.7339L4.10116 41.5981C4.05696 41.7154 4.03337 41.8333 4.03077 41.9514C4.03077 41.9909 4.03727 42.0296 4.04572 42.0678C4.04572 42.0737 4.05221 42.0797 4.05221 42.0857C4.28151 43.7894 8.7468 45.1341 14.1814 45.1361C19.615 45.1342 24.0799 43.79 24.3106 42.0867C24.3106 42.0906 24.3041 42.0946 24.3041 42.0986C24.3197 42.0504 24.3301 42.0016 24.3301 41.9513C24.3236 41.8416 24.3047 41.732 24.2646 41.6229L22.9596 35.0721L22.0229 30.37L16.7171 3.73341V1.65932C17.5229 1.53873 17.9842 1.36648 17.9859 1.18559V0.676018C17.9859 0.324241 16.2817 0.0390625 14.1794 0.0390625L14.1813 0.0395715Z" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="0.926" />
      <path d="M14 41.6453C16.5068 41.6453 18.539 39.5653 18.539 36.9994C18.539 34.4336 16.5068 32.3535 14 32.3535C11.4931 32.3535 9.46094 34.4336 9.46094 36.9994C9.46094 39.5653 11.4931 41.6453 14 41.6453Z" fill="var(--sc-line)" stroke="var(--sc-edge)" strokeWidth="0.69" />
      <path d="M14 27.6453C16.5068 27.6453 18.539 25.5653 18.539 22.9994C18.539 20.4336 16.5068 18.3535 14 18.3535C11.4931 18.3535 9.46094 20.4336 9.46094 22.9994C9.46094 25.5653 11.4931 27.6453 14 27.6453Z" fill="var(--sc-line)" stroke="var(--sc-edge)" strokeWidth="0.69" />
    </g>
  );
}
// auto / manual mode chip
function ModeChip({ x, y, mode }) {
  const man = mode === "M";
  return (
    <g>
      <rect x={x} y={y} width="17" height="17" rx="3" fill={man ? "var(--warning)" : "#fff"} stroke={man ? "var(--warning)" : "var(--slate-300)"} strokeWidth="1.2" />
      <text className="rasm-mode" x={x + 8.5} y={y + 12.5} textAnchor="middle" fill={man ? "#3d2c00" : "var(--slate-600)"}>{mode}</text>
    </g>
  );
}
// "signal online" marker (left of sensor readouts and lye pumps) — neutral per HP-HMI (normal isn't colored)
function GreenMark({ x, y }) {
  return (
    <g>
      <rect x={x} y={y} width="17" height="17" rx="3" fill="var(--slate-500)" />
      <path d={`M${x + 5},${y + 5} L${x + 12},${y + 12} M${x + 12},${y + 5} L${x + 5},${y + 12}`} stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </g>
  );
}

/* ───────────── labelled bits ───────────── */
function Tag2({ x, y, tag, desc, anchor = "middle" }) {
  return (
    <g aria-hidden="true">
      {tag && <text className="rasm-tag" x={x} y={y} textAnchor={anchor}>{tag}</text>}
      {desc && desc.map((d, i) => <text key={i} className="rasm-desc" x={x} y={y + 13 + i * 12} textAnchor={anchor}>{d}</text>)}
    </g>
  );
}
const lcPath = "M3 3 L3 13 L15 13"; // y-axis + x-axis for the mini line-chart glyph
// value readout. The box itself is NOT clickable — hovering it reveals a small trend
// icon, and clicking ONLY that icon sends the parameter to the Trends register.
// active-state hook: is a pen for this tag currently on the Trends register?
function useTrendActive(tag) {
  const [, f] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { const s = window.trendStore; return s && s.sub ? s.sub(f) : undefined; }, []);
  const s = window.trendStore;
  return !!(tag && s && (s.pens || []).some((p) => p.id === tag));
}
function RD({ x, y, w = 60, h = 25, value, unit, tag, name, group, accent, mono = true }) {
  const trendable = !!tag;
  const active = useTrendActive(tag);
  const send = (e) => { e.stopPropagation(); e.preventDefault(); njSendToTrend(tag, { name, unit, value: String(value), group }); };
  return (
    <g className={"rasm-rd" + (trendable ? " t" : "")}>
      <title>{name || tag || ""}</title>
      <rect className="rasm-rd-box" x={x} y={y} width={w} height={h} rx="4" />
      <text className={"rasm-rd-v" + (mono ? "" : " s")} x={x + w / 2} y={y + h / 2 + 5} textAnchor="middle" fill={accent}>{value}<tspan className="rasm-rd-u"> {unit}</tspan></text>
      {trendable && (
        <g className={"rasm-rd-tr" + (active ? " on" : "")} transform={`translate(${x + w + 13},${y + h / 2})`} onClick={send} role="button" {...njActivate(send)}>
          <title>{(active ? "On Trends · " : "Trend value · ") + (name || tag)}</title>
          <rect className="rasm-rd-trhit" x={-11} y={-11} width={22} height={22} />
          <rect className="rasm-rd-trbg" x={-9} y={-9} width={18} height={18} rx={4.5} />
          <g className="rasm-rd-trln" transform="translate(-6.3,-5.6) scale(0.7)"><path d={lcPath} /><path d="M6 10 L9 7 L11 9 L15 4" /></g>
        </g>
      )}
    </g>
  );
}
// equipment hit wrapper (click → popup)
function Eq({ onClick, title, children }) {
  return (
    <g className={onClick ? "rasm-eq" : undefined} onClick={onClick} role={onClick ? "button" : undefined} {...(onClick ? njActivate(onClick) : null)}>
      {title && <title>{title}</title>}
      {children}
    </g>
  );
}
// run/stop (binary) trend affordance for an equipment symbol. Mirrors the RD trend
// button but sends the on/off running signal (tied to the symbol graphic) — as opposed
// to the analog value readout, which trends the measured value. Placed to the RIGHT of
// the symbol (same side as the value's trend icon) so it reads as "trend this symbol".
function SymTrend({ cx, cy, tag, name, group, running }) {
  const active = useTrendActive(tag + "-RUN");
  const send = (e) => { e.stopPropagation(); e.preventDefault(); njSendToTrend(tag + "-RUN", { name: name + " · run/stop", unit: "on/off", value: running ? "1" : "0", group }); };
  return (
    <g className={"rasm-symtrend" + (active ? " on" : "")} transform={`translate(${cx},${cy})`} onClick={send} role="button" {...njActivate(send)}>
      <title>{(active ? "On Trends · " : "Trend run/stop · ") + name}</title>
      <rect x={-11} y={-11} width={22} height={22} fill="transparent" />
      <rect className="rasm-symtrend-bg" x={-9} y={-9} width={18} height={18} rx={4.5} />
      <g className="rasm-symtrend-ln" transform="translate(-6.5,-5) scale(0.72)"><path d="M1 12 H4 V3 H8 V12 H11 V3 H15" /></g>
    </g>
  );
}
// inlet/outlet flow flag
function Flag({ x, y, label, dir = "r" }) {
  const tip = 14;
  const w = Math.max(96, Math.ceil((label || "").length * 7.1) + tip + 22), h = 34;
  const d = dir === "r"
    ? `M${x},${y} H${x + w - tip} L${x + w},${y + h / 2} L${x + w - tip},${y + h} H${x} Z`
    : `M${x + w},${y} H${x + tip} L${x},${y + h / 2} L${x + tip},${y + h} H${x + w} Z`;
  return (
    <g aria-hidden="true">
      <path d={d} fill="var(--sc-node)" stroke="var(--slate-400)" strokeWidth="1.4" />
      <text className="rasm-flag" x={x + w / 2 + (dir === "r" ? -4 : 4)} y={y + h / 2 + 4} textAnchor="middle">{label}</text>
    </g>
  );
}

/* ───────────── vessels ───────────── */
function Bioreactor({ x, y, w, h }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="4" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
      <rect x={x + 6} y={y + h * 0.42} width={w - 12} height={h * 0.58 - 6} fill="var(--sc-water)" opacity="0.55" />
      {/* diffuser grid along the floor */}
      {Array.from({ length: 2 }).map((_, b) => (
        <g key={b}>
          {Array.from({ length: 7 }).map((_, i) => (
            <line key={i} x1={x + 18 + b * (w / 2 - 8) + i * 7} y1={y + h - 10} x2={x + 18 + b * (w / 2 - 8) + i * 7} y2={y + h - 26} stroke="var(--sc-line)" strokeWidth="1.3" />
          ))}
          <line x1={x + 16 + b * (w / 2 - 8)} y1={y + h - 10} x2={x + 16 + b * (w / 2 - 8) + 50} y2={y + h - 10} stroke="var(--sc-line)" strokeWidth="1.6" />
        </g>
      ))}
    </g>
  );
}
function StripperColumn({ x, y, w, h }) {
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="3" fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
      {/* packing media: stacked hatch */}
      <rect x={x + 7} y={y + 8} width={w - 14} height={h - 40} fill="var(--sc-node)" stroke="var(--sc-line)" strokeWidth="1" />
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={i} x1={x + 7} y1={y + 16 + i * ((h - 56) / 9)} x2={x + w - 7} y2={y + 16 + i * ((h - 56) / 9)} stroke="var(--sc-line)" strokeWidth="1.2" />
      ))}
      <rect x={x + 7} y={y + h - 30} width={w - 14} height={22} fill="var(--sc-water)" opacity="0.5" />
    </g>
  );
}
function SumpBasin({ x, y, w, h }) {
  return (
    <g aria-hidden="true">
      <path d={`M${x},${y} H${x + w} V${y + h} H${x} Z`} fill="var(--sc-vessel)" stroke="var(--sc-edge)" strokeWidth="1.4" />
      <rect x={x + 5} y={y + h * 0.34} width={w - 10} height={h * 0.66 - 5} fill="var(--sc-water)" opacity="0.5" />
    </g>
  );
}

/* ───────────── pipe network ───────────── */
// Each run is tagged with the fluid it carries (see NJ_FLUIDS): proc = process water,
// drain = backwash/effluent, gas = air & CO₂ off-gas, o2 = oxygen, chem = lye dosing.
const RASM_PIPES = [
  // inlet → backwash pumps + drum filters (riser offset left of the label column)
  { k: "proc",  d: "M118,415 H214" },      // inlet trunk (level-before-filter sits inline here)
  { k: "drain", d: "M118,300 V520" },      // riser feeding both backwash pumps
  { k: "drain", d: "M118,300 H150" },      // riser → backwash pump 1
  { k: "drain", d: "M118,520 H150" },      // riser → backwash pump 2
  { k: "drain", d: "M150,300 H236" },      // backwash pump 1 → drum filter 1
  { k: "drain", d: "M150,520 H236" },      // backwash pump 2 → drum filter 2
  // drum filters → bioreactor
  { k: "proc", d: "M360,300 H392 V560" },
  { k: "proc", d: "M360,470 H392" },
  // blower cabinets → bioreactor (process air)
  { k: "gas", d: "M470,408 V470" }, { k: "gas", d: "M602,408 V470" },
  // bioreactor → CO₂ stripper
  { k: "proc", d: "M620,650 H700" },
  // CO₂ fans → stripper (off-gas extraction)
  { k: "gas", d: "M752,330 V556" }, { k: "gas", d: "M848,330 V556" },
  // stripper → pump sump
  { k: "proc", d: "M884,650 H904" },
  // pump sump riser → oxygenation
  { k: "proc", d: "M1052,604 V196 H1010" },
  // oxygenation pumps → cone
  { k: "proc", d: "M1052,150 H1150" }, { k: "proc", d: "M1052,250 H1108" },
  // oxygen supply → cone dose valves
  { k: "o2", d: "M1206,210 H1262" }, { k: "o2", d: "M1206,210 V150 H1262" },
  // cone → fish tank outlet
  { k: "proc", d: "M1232,260 V470 H1404" },
  { k: "proc", d: "M1232,150 V96 H1404" },
  // lye pumps → bioreactor loop
  { k: "chem", d: "M150,705 H280 V650 H392" }, { k: "chem", d: "M260,815 H280" },
];

function RasMimic() {
  const open = (t) => () => openEquipment(t);
  return (
    <svg className="rasm" viewBox="0 0 1600 900" role="img" aria-label="RAS process mimic" preserveAspectRatio="xMidYMid meet">
      {/* pipes */}
      {RASM_PIPES.map((p, i) => <path key={"p" + i} d={p.d} className={"rasm-pipe fl-" + p.k} />)}

      {/* ───── inlet ───── */}
      <Flag x={40} y={398} label="Fish tanks" dir="r" />

      {/* ───── FILTER / BACKWASH ───── */}
      <Eq title="Backwash pump filter 1" onClick={open("DPT1-SMP0-PU1")}><SymPump cx={150} cy={300} running={false} /></Eq>
      <ModeChip x={110} y={292} mode="A" />
      <SymTrend cx={180} cy={300} tag="DPT1-FIL0-PU1" name="Backwash pump filter 1" group="Filter" running={false} />
      <RD x={120} y={250} value="0" unit="Hz" tag="DPT1-FIL0-PU1" name="Backwash pump 1 speed" group="Filter" />
      <Tag2 x={150} y={220} tag="DPT1-FIL0-PU1" desc={["Backwash pump filter 1"]} />

      <Eq title="Backwash pump filter 2" onClick={open("DPT1-SMP0-PU1")}><SymPump cx={150} cy={520} running={false} /></Eq>
      <ModeChip x={110} y={512} mode="A" />
      <SymTrend cx={180} cy={520} tag="DPT1-FIL0-PU2" name="Backwash pump filter 2" group="Filter" running={false} />
      <RD x={120} y={555} value="0" unit="Hz" tag="DPT1-FIL0-PU2" name="Backwash pump 2 speed" group="Filter" />
      <Tag2 x={150} y={601} tag="DPT1-FIL0-PU2" desc={["Backwash pump filter 2"]} />

      <Eq title="Drum filter 1" onClick={open("DPT1-FIL0")}>
        <rect className="rasm-box" x={236} y={270} width={62} height={58} rx="6" />
        <SymMotor cx={267} cy={299} s={0.7} running={false} />
      </Eq>
      <ModeChip x={215} y={290} mode="A" />
      <SymTrend cx={312} cy={299} tag="DPT1-FIL1-FE1" name="Drum filter 1" group="Filter" running={false} />
      <RD x={237} y={236} value="0" unit="Hz" tag="DPT1-FIL1-FE1" name="Drum filter 1 speed" group="Filter" />
      <Tag2 x={267} y={344} tag="DPT1-FIL1-FE1" desc={["Drum filter 1"]} />

      <Eq title="Drum filter 2" onClick={open("DPT1-FIL0")}>
        <rect className="rasm-box" x={236} y={490} width={62} height={58} rx="6" />
        <SymMotor cx={267} cy={519} s={0.7} running={false} />
      </Eq>
      <ModeChip x={215} y={510} mode="A" />
      <SymTrend cx={312} cy={519} tag="DPT1-FIL2-FE1" name="Drum filter 2" group="Filter" running={false} />
      <RD x={237} y={456} value="0" unit="Hz" tag="DPT1-FIL2-FE1" name="Drum filter 2 speed" group="Filter" />
      <Tag2 x={267} y={564} tag="DPT1-FIL2-FE1" desc={["Drum filter 2"]} />

      <RD x={150} y={398} w={66} value="16" unit="cm" tag="DPT1-FIL0-LT1" name="Level before filter" group="Filter" />
      <Tag2 x={183} y={388} tag="DPT1-FIL0-LT1" desc={["Level before filter"]} />

      {/* ───── LYE DOSING ───── */}
      <Flag x={40} y={688} label="Lye" dir="r" />
      <Eq title="Lye pump 1" onClick={open("DPT1-DNA0-PU1")}><SymPump cx={222} cy={705} running={false} /></Eq>
      <GreenMark x={176} y={697} /><ModeChip x={148} y={697} mode="M" />
      <SymTrend cx={252} cy={705} tag="DPT1-DNA0-PU1" name="Lye pump 1" group="Lye Dosing" running={false} />
      <RD x={163} y={655} w={64} value="0.0" unit="l/h" tag="DPT1-DNA0-PU1" name="Lye pump 1 rate" group="Lye Dosing" />
      <Tag2 x={222} y={742} tag="DPT1-DNA0-PU1" desc={["Lye pump 1"]} />

      <Eq title="Lye pump 2" onClick={open("DPT1-DNA0-PU2")}><SymPump cx={222} cy={815} running={false} /></Eq>
      <GreenMark x={176} y={807} /><ModeChip x={148} y={807} mode="M" />
      <SymTrend cx={252} cy={815} tag="DPT1-DNA0-PU2" name="Lye pump 2" group="Lye Dosing" running={false} />
      <RD x={163} y={848} w={64} value="0.0" unit="l/h" tag="DPT1-DNA0-PU2" name="Lye pump 2 rate" group="Lye Dosing" />
      <Tag2 x={222} y={773} tag="DPT1-DNA0-PU2" desc={["Lye pump 2"]} />

      {/* ───── MBBR / BIOREACTOR ───── */}
      <Tag2 x={470} y={148} tag="DPT1-AEB0-BM1-TT1" desc={["Blower cabinet", "temperature 1"]} />
      <RD x={437} y={186} w={66} value="24.0" unit="°C" tag="DPT1-AEB0-BM1-TT1" name="Blower cabinet temp 1" group="MBBR" />
      <Eq title="Blower 1 MBBR" onClick={open("DPT1-AEB0-BL1")}>
        <rect className="rasm-cab" x={437} y={222} width={66} height={86} rx="5" />
        <SymFan cx={470} cy={282} s={0.82} running={true} />
      </Eq>
      <RD x={444} y={226} w={52} h={24} value="42" unit="Hz" tag="DPT1-AEB0-BM1" name="Blower 1 MBBR speed" group="MBBR" />
      <ModeChip x={412} y={262} mode="A" />
      <SymTrend cx={515} cy={282} tag="DPT1-AEB0-BM1" name="Blower 1 MBBR" group="MBBR" running={true} />
      <Tag2 x={470} y={326} tag="DPT1-AEB0-BM1" desc={["Blower 1 MBBR"]} />

      <Tag2 x={602} y={148} tag="DPT1-AEB0-BM2-TT1" desc={["Blower cabinet", "temperature 2"]} />
      <RD x={569} y={186} w={66} value="16.8" unit="°C" tag="DPT1-AEB0-BM2-TT1" name="Blower cabinet temp 2" group="MBBR" />
      <Eq title="Blower 2 MBBR" onClick={open("DPT1-AEB0-BL1")}>
        <rect className="rasm-cab" x={569} y={222} width={66} height={86} rx="5" />
        <SymFan cx={602} cy={282} s={0.82} running={false} />
      </Eq>
      <RD x={576} y={226} w={52} h={24} value="0" unit="Hz" tag="DPT1-AEB0-BM2" name="Blower 2 MBBR speed" group="MBBR" />
      <ModeChip x={544} y={262} mode="A" />
      <SymTrend cx={647} cy={282} tag="DPT1-AEB0-BM2" name="Blower 2 MBBR" group="MBBR" running={false} />
      <Tag2 x={602} y={326} tag="DPT1-AEB0-BM2" desc={["Blower 2 MBBR"]} />

      <Eq title="Bioreactor (MBBR)" onClick={open("DPT1-AEB0-BL1")}><Bioreactor x={392} y={470} w={228} h={180} /></Eq>
      <RD x={473} y={508} w={66} value="248" unit="cm" tag="DPT1-AEB0-LT1" name="Level in bioreactor" group="MBBR" />
      <Tag2 x={506} y={498} tag="DPT1-AEB0-LT1" desc={["Level in bioreactor"]} />

      {/* ───── CO₂ STRIPPER ───── */}
      <Tag2 x={752} y={246} tag="DPT1-STR0-AV1" desc={["CO₂-fan 1"]} />
      <RD x={719} y={284} value="0" unit="Hz" tag="DPT1-STR0-AV1" name="CO₂-fan 1 speed" group="CO₂ Stripper" />
      <Eq title="CO₂-fan 1" onClick={open("DPT1-STR0-FAN")}><SymFan cx={752} cy={330} running={false} /></Eq>
      <ModeChip x={712} y={322} mode="M" />
      <SymTrend cx={782} cy={330} tag="DPT1-STR0-AV1" name="CO₂-fan 1" group="CO₂ Stripper" running={false} />

      <Tag2 x={848} y={246} tag="DPT1-STR0-AV2" desc={["CO₂-fan 2"]} />
      <RD x={815} y={284} value="0" unit="Hz" tag="DPT1-STR0-AV2" name="CO₂-fan 2 speed" group="CO₂ Stripper" />
      <Eq title="CO₂-fan 2" onClick={open("DPT1-STR0-FAN")}><SymFan cx={848} cy={330} running={false} /></Eq>
      <ModeChip x={808} y={322} mode="M" />
      <SymTrend cx={878} cy={330} tag="DPT1-STR0-AV2" name="CO₂-fan 2" group="CO₂ Stripper" running={false} />

      <Eq title="CO₂ stripper column" onClick={open("DPT1-STR0-FAN")}><StripperColumn x={700} y={556} w={184} h={150} /></Eq>
      <RD x={759} y={742} w={86} value="−14.4" unit="mbar" tag="DPT1-STR0-PT1" name="Vacuum in CO₂ stripping" group="CO₂ Stripper" />
      <Tag2 x={802} y={788} tag="DPT1-STR1-PT1" desc={["Vacuum in CO₂ stripping"]} />

      {/* ───── PUMP SUMP ───── */}
      <Eq title="Pump sump" onClick={open("DPT1-SMP0")}><SumpBasin x={904} y={604} w={296} h={120} /></Eq>

      <Eq title="Lift pump 1" onClick={open("DPT1-SMP0-PU1")}><SymPump cx={985} cy={668} running={true} /></Eq>
      <ModeChip x={945} y={660} mode="A" />
      <SymTrend cx={1015} cy={668} tag="DPT1-SMP0-PU1" name="Lift pump 1" group="Pump Sump" running={true} />
      <RD x={952} y={620} value="37" unit="Hz" tag="DPT1-SMP0-PU1" name="Lift pump 1 speed" group="Pump Sump" />
      <Tag2 x={985} y={708} tag="DPT1-SMP0-PU1" desc={["Lift pump 1"]} />

      <Eq title="Lift pump 2" onClick={open("DPT1-SMP0-PU1")}><SymPump cx={1100} cy={668} running={false} /></Eq>
      <ModeChip x={1060} y={660} mode="A" />
      <SymTrend cx={1130} cy={668} tag="DPT1-SMP0-PU2" name="Lift pump 2" group="Pump Sump" running={false} />
      <RD x={1067} y={620} value="0" unit="Hz" tag="DPT1-SMP0-PU2" name="Lift pump 2 speed" group="Pump Sump" />
      <Tag2 x={1100} y={708} tag="DPT1-SMP0-PU2" desc={["Lift pump 2"]} />

      <RD x={952} y={470} w={70} value="1.2" unit="mVs" tag="DPT1-SMP0-PT1" name="Fish tank pressure" group="Pump Sump" />
      <Tag2 x={987} y={460} tag="DPT1-SMP0-PT1" desc={["Fish tank pressure"]} />
      <RD x={1098} y={470} w={66} value="8.7" unit="°C" tag="DPT1-SMP0-TT1" name="Pump sump temperature" group="Pump Sump" />
      <Tag2 x={1131} y={460} tag="DPT1-SMP0-TT1" desc={["Pump sump temperature"]} />

      {/* sensor cluster (right of sump) */}
      {[
        { v: "4", u: "mg/l", tag: "DPT1-SMP0-QT1", d: "DPT1-SMP0-QT1 · CO₂ in pump sump" },
        { v: "95.3", u: "%", tag: "DPT1-SMP0-OT1", d: "DPT1-SMP0-QT2 · O₂ in pump sump", accent: "var(--success-text)" },
        { v: "6.9", u: "pH", tag: "DPT1-SMP0-PH1", d: "DPT1-SMP0-QT3 · pH 1 in pump sump" },
        { v: "6.7", u: "pH", tag: "DPT1-SMP0-PH2", d: "DPT1-SMP0-QT4 · pH 2 in pump sump" },
        { v: "193", u: "cm", tag: "DPT1-SMP0-LT1", d: "DPT1-SMP0-LT1 · Level in pump sump" },
      ].map((s, i) => {
        const y = 606 + i * 33;
        return (
          <g key={i}>
            <GreenMark x={1238} y={y} />
            <RD x={1262} y={y - 4} w={70} value={s.v} unit={s.u} tag={s.tag} name={s.d.split(" · ")[1]} group="Pump Sump" accent={s.accent} />
            <text className="rasm-sensl" x={1366} y={y + 13}>{s.d}</text>
          </g>
        );
      })}

      {/* ───── OXYGENATION ───── */}
      <Tag2 x={1010} y={78} tag="DPT1-DOX0-PU1" desc={["Oxygenation pump 1"]} anchor="middle" />
      <RD x={977} y={106} value="0" unit="Hz" tag="DPT1-DOX0-PU1" name="Oxygenation pump 1 speed" group="Oxygenation" />
      <Eq title="Oxygenation pump 1" onClick={open("DPT1-DOX0")}><SymPump cx={1010} cy={150} running={false} /></Eq>
      <ModeChip x={970} y={142} mode="M" />
      <SymTrend cx={1040} cy={150} tag="DPT1-DOX0-PU1" name="Oxygenation pump 1" group="Oxygenation" running={false} />

      <Eq title="Oxygenation pump 2" onClick={open("DPT1-DOX0")}><SymPump cx={1010} cy={250} running={false} /></Eq>
      <ModeChip x={970} y={242} mode="M" />
      <SymTrend cx={1040} cy={250} tag="DPT1-DOX0-PU2" name="Oxygenation pump 2" group="Oxygenation" running={false} />
      <RD x={977} y={284} value="0" unit="Hz" tag="DPT1-DOX0-PU2" name="Oxygenation pump 2 speed" group="Oxygenation" />
      <Tag2 x={1010} y={324} tag="DPT1-DOX0-PU2" desc={["Oxygenation pump 2"]} />

      <Eq title="O₂ cone" onClick={open("DPT1-DOX0")}><SymCone cx={1180} cy={210} s={1.15} /></Eq>
      <RD x={1147} y={300} w={66} value="0.3" unit="bar" tag="DPT1-DOX0-PT1" name="Oxygen water pressure" group="Oxygenation" />
      <Tag2 x={1158} y={340} tag="DPT1-DOX1-PT1" desc={["Oxygen water pressure"]} />

      <Eq title="Base dose valve" onClick={open(njBuildEquip("DPT1-DOX1-SV1", "Base dose valve", "valve", { primary: { l: "Opening", v: "0", u: "%" }, readouts: [{ l: "Valve opening", v: "0", u: "%", tag: "DPT1-DOX1-SV1" }] }))}><SymValve cx={1266} cy={150} running={false} /></Eq>
      <ModeChip x={1282} y={142} mode="M" />
      <Tag2 x={1266} y={190} tag="DPT1-DOX1-SV1" desc={["Base dose valve"]} />

      <Eq title="Extra dose valve" onClick={open(njBuildEquip("DPT1-DOX1-SV2", "Extra dose valve", "valve", { primary: { l: "Opening", v: "0", u: "%" }, readouts: [{ l: "Valve opening", v: "0", u: "%", tag: "DPT1-DOX1-SV2" }] }))}><SymValve cx={1392} cy={150} running={false} /></Eq>
      <ModeChip x={1408} y={142} mode="M" />
      <Tag2 x={1392} y={190} tag="DPT1-DOX1-SV2" desc={["Extra dose valve"]} />

      {/* ───── right-edge flags ───── */}
      <Flag x={1404} y={80} label="Oxygen" dir="r" />
      <Flag x={1404} y={233} label="Fish tanks" dir="r" />
      <Flag x={1404} y={453} label="Fish tanks" dir="r" />
    </svg>
  );
}

Object.assign(window, { RasMimic, SymPump, SymFan, SymMotor, SymValve, SymCone,
  RD, Tag2, Eq, Flag, SumpBasin, StripperColumn, Bioreactor, GreenMark, ModeChip, SymTrend });
