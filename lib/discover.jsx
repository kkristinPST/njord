// discover.jsx — "Discover Njord": what this facility's licence includes, and which further
// modules exist. Deliberately NOT a lock screen: additional modules are never rendered as
// disabled navigation, greyed controls or fake feature screens — they are described in words,
// in the same document language as the manuals (ManBlocks / man-lead / man-sec from manuals.jsx).
// Loaded after manuals.jsx (uses Dialog / DlgHeader / openDialog / ManBlocks / Icon).

// The licensed package. Edit `NJ_PACKAGE` per installation — everything below reads from it.
const NJ_PACKAGE = {
  name: "SCADA",
  tier: "Basic",
  includes: ["Dashboard", "Site Plan", "Alarms", "Maneuver History", "Reports", "Trends", "Settings"],
};

const NJ_MODULES = [
  {
    id: "feeding", icon: "utensils", name: "Fish Feeding", manual: "feeding",
    tagline: "Dose feed to every tank from the control room.",
    caps: ["Feeding"],
    lead: "Feed control for the whole facility: feed tables, distribution curves, feeder calibration and per-feedscrew dosing, run from the same console as the process.",
    blocks: [
      { t: "sub", x: "Included functionality" },
      { t: "defs", x: [
        ["Feeding", "One screen per department with a card per tank: daily target, feed factor, activity factor and biomass, plus the dosing progress of every feedscrew the tank drives."],
        ["Feed tables & curves", "Biomass-based feed tables imported from Excel, and distribution curves that shape how the daily ration is spread across the feeding window."],
        ["Feeder calibration", "Grams per rotation per screw, with the calibration history kept alongside the machine."],
        ["Feed types & hoppers", "Pellet size and feed type per screw, so a tank can run two products at once."],
      ] },
      { t: "sub", x: "Where it appears" },
      { t: "p", x: "Adds a Fish Feeding entry to the sidebar and feed readouts to the tank pages. Nothing else in the console changes." },
    ],
  },
  {
    id: "biology", icon: "fish", name: "Fish Biology",
    tagline: "Register mortality and score welfare where the fish are.",
    caps: ["Overview", "Mortality", "Welfare"],
    lead: "The biological record of the facility: what died and why, and how the stock scores against the welfare protocol, registered at the tank, reported to the authority.",
    blocks: [
      { t: "sub", x: "Included functionality" },
      { t: "defs", x: [
        ["Overview", "Welfare and mortality at a glance for the whole facility: open welfare registrations, the current mortality picture per department, and a way into either register."],
        ["Mortality", "Registration per tank with a full cause-of-death tree (handling, environmental, disease, destruction / culling and more), several lines per registration, and a mortality summary report."],
        ["Welfare", "Scored welfare rounds against the indicator protocol: fish per round, score 1–3 per indicator with a reference-photo guide, aggregated into the welfare register and the authority's bubble-chart report."],
      ] },
      { t: "sub", x: "Where it appears" },
      { t: "p", x: "Adds a Fish Biology entry to the sidebar, two report definitions to the report catalog, and both registrations to the mobile app so they can be done at the tank." },
    ],
  },
  {
    id: "analytics", icon: "line-chart", name: "Analytics",
    tagline: "Manual readings, commissioning sheets and biofilter maturation.",
    caps: ["Data Entry", "Commissioning / Trial Period", "Biofilter Maturation (MBBR)"],
    lead: "The structured record for everything the instruments do not measure themselves: manual rounds, the commissioning trial period, and the nitrogen chemistry of biofilter start-up.",
    blocks: [
      { t: "note", x: "Trends is part of the SCADA Basic package, so you already have it. Analytics adds the registration and start-up tooling described below." },
      { t: "sub", x: "Included functionality" },
      { t: "defs", x: [
        ["Data Entry", "A register of manual measurement points organised by location: expected range per measurement, out-of-range marking, reading history, and full entry from the mobile app."],
        ["Commissioning / Trial Period", "The commissioning log sheet: one row per round, one column per parameter, with the instrument-bucket comparison and the trend of each parameter through the trial."],
        ["Biofilter Maturation (MBBR)", "Stoichiometric dosing model for biofilter start-up: nitrogen vitals per round, expected versus recorded chemical doses, and a pH strategy per department."],
      ] },
      { t: "sub", x: "Where it appears" },
      { t: "p", x: "Adds an Analytics entry to the sidebar alongside Trends, and its three registrations to the mobile app." },
    ],
  },
];

function njDiscoverModule(id) {
  if (NJ_MODULES.some((x) => x.id === id)) openDialog(<DiscoverDialog start={id} />);
}

// Module detail — the manual document pattern (lead + sections + ManBlocks), single column
// because the content is short. Rendered INSIDE the Discover dialog, not stacked on top of it:
// one modal, two views, Back at the top where a back control belongs.
function DiscoverModuleView({ mod, onBack }) {
  return (
    <React.Fragment>
      <div className="dlg-body dsc-mod-body">
        <button className="dsc-back" onClick={onBack}><Icon name="chevron-left" size={15} /> All modules</button>
        <div className="man-lead">
          <div className="man-lead-t">{mod.name}</div>
          <p className="man-lead-s">{mod.lead}</p>
          <div className="dsc-caps">{mod.caps.map((c) => <span className="dsc-cap" key={c}>{c}</span>)}</div>
        </div>
        <section className="man-sec"><ManBlocks blocks={mod.blocks} /></section>
        <div className="dsc-avail">
          <Icon name="package-plus" size={16} color="var(--primary)" />
          <span><strong>Available as an additional module.</strong> It is not part of your SCADA Basic package. Your Pure Salmon contact can scope it for this facility.</span>
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        {mod.manual
          ? <button className="btn btn-secondary" onClick={() => { closeDialog(); if (window.openManual) window.openManual(mod.manual); }}><Icon name="book-open" size={16} /> Read the manual</button>
          : <span className="help-powered">Njord {NJ_PACKAGE.name} · {NJ_PACKAGE.tier}</span>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
          <button className="btn btn-primary" onClick={() => { closeDialog(); if (window.njToast) window.njToast("Request sent. Your Pure Salmon contact will be in touch about " + mod.name + "."); }}><Icon name="mail" size={16} /> Request information</button>
        </div>
      </div>
    </React.Fragment>
  );
}

function DiscoverFeedback() {
  const [v, setV] = React.useState("");
  const send = () => {
    if (!v.trim()) return;
    setV("");
    if (window.njToast) window.njToast("Thanks. Sent to the Njord product team.");
  };
  return (
    <div className="dsc-fb">
      <div className="dsc-fb-t">Couldn't find what you need?</div>
      <p className="dsc-fb-s">Tell us what functionality or capabilities would make Njord more useful for you.</p>
      <div className="dsc-fb-row">
        <input className="de-input dsc-fb-in" value={v} placeholder="e.g. oxygen cone efficiency per department" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button className="btn btn-secondary" disabled={!v.trim()} onClick={send}><Icon name="send" size={14} /> Send feedback</button>
      </div>
    </div>
  );
}

function DiscoverDialog({ start }) {
  const [view, setView] = React.useState(start || null);
  const mod = view ? NJ_MODULES.filter((x) => x.id === view)[0] : null;
  return (
    <Dialog width={720}>
      <DlgHeader icon={mod ? mod.icon : "compass"} name={mod ? mod.name : "Discover Njord"} tag={mod ? "MODULE" : null} onClose={closeDialog} />
      {mod ? <DiscoverModuleView mod={mod} onBack={() => setView(null)} /> : (
      <React.Fragment>
      <div className="dlg-body dsc-body">
        <div className="dsc-grp">
          <div className="dsc-grp-h">Your package</div>
          <div className="dsc-pkg">
            <div className="dsc-pkg-h">
              <Icon name="check-circle-2" size={16} color="var(--success)" />
              <span className="dsc-pkg-n">{NJ_PACKAGE.name} · {NJ_PACKAGE.tier}</span>
              <span className="dsc-pkg-tag">ACTIVE</span>
            </div>
            <div className="dsc-pkg-list">{NJ_PACKAGE.includes.map((i) => <span className="dsc-inc" key={i}>{i}</span>)}</div>
          </div>
        </div>
        <div className="dsc-grp">
          <div className="dsc-grp-h">Additional modules</div>
          <p className="dsc-grp-s">Capabilities that can be added to this installation.</p>
          {NJ_MODULES.map((m) => (
            <button className="dsc-mod" key={m.id} onClick={() => setView(m.id)}>
              <span className="dsc-mod-icn"><Icon name={m.icon} size={18} /></span>
              <span className="dsc-mod-txt">
                <span className="dsc-mod-n">{m.name}</span>
                <span className="dsc-mod-c">{m.caps.join(" · ")}</span>
                <span className="dsc-mod-s">{m.tagline}</span>
              </span>
              <Icon name="chevron-right" size={16} color="var(--slate-400)" />
            </button>
          ))}
        </div>
        <DiscoverFeedback />
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="help-powered">Njord {NJ_PACKAGE.name} · {NJ_PACKAGE.tier}</span>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
      </React.Fragment>
      )}
    </Dialog>
  );
}
function openDiscover() { openDialog(<DiscoverDialog />); }

Object.assign(window, { NJ_PACKAGE, NJ_MODULES, DiscoverDialog, openDiscover, njDiscoverModule });
