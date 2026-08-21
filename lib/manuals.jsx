// manuals.jsx — Help-menu content: SCADA Manual, Fish Feeding Manual, and About NJORD
// (release notes). Adapted from the Njord user guides and re-mapped onto this redesign
// (persistent left sidebar, floating Trends window, Deactivated alarm tab, etc.).
// Loaded after dialogs.jsx (uses Dialog / DlgHeader / openDialog / closeDialog / Icon).

// ── block renderer ───────────────────────────────────────────────────────────
function ManBlocks({ blocks }) {
  return blocks.map((b, i) => {
    if (b.t === "p") return <p className="man-p" key={i}>{b.x}</p>;
    if (b.t === "sub") return <h4 className="man-sub" key={i}>{b.x}</h4>;
    if (b.t === "ul") return <ul className="man-ul" key={i}>{b.x.map((it, j) => <li key={j}>{it}</li>)}</ul>;
    if (b.t === "steps") return <ol className="man-ol" key={i}>{b.x.map((it, j) => <li key={j}>{it}</li>)}</ol>;
    if (b.t === "note") return <div className="man-note" key={i}><Icon name="info" size={15} color="var(--primary)" /><span>{b.x}</span></div>;
    if (b.t === "defs") return (
      <dl className="man-defs" key={i}>
        {b.x.map((d, j) => <div className="man-def" key={j}><dt>{d[0]}</dt><dd>{d[1]}</dd></div>)}
      </dl>
    );
    return null;
  });
}

// ── generic manual viewer (TOC + scrollable content) ──────────────────────────
function ManualDialog({ manual }) {
  const [active, setActive] = React.useState(manual.sections[0].id);
  const contentRef = React.useRef(null);
  const go = (id) => {
    const c = contentRef.current; if (!c) return;
    const el = c.querySelector("#sec-" + id);
    if (el) c.scrollTop = el.offsetTop - 6;
    setActive(id);
  };
  const onScroll = () => {
    const c = contentRef.current; if (!c) return;
    const y = c.scrollTop + 24;
    let cur = manual.sections[0].id;
    manual.sections.forEach((s) => { const el = c.querySelector("#sec-" + s.id); if (el && el.offsetTop <= y) cur = s.id; });
    setActive(cur);
  };
  return (
    <Dialog width={960}>
      <DlgHeader icon={manual.icon} name={manual.title} tag={"Rev " + manual.rev} onClose={closeDialog} />
      <div className="dlg-body man-body">
        <nav className="man-toc" aria-label="Contents">
          <div className="man-toc-h">Contents</div>
          {manual.sections.map((s) => (
            <button key={s.id} className={"man-toc-i" + (active === s.id ? " on" : "")} onClick={() => go(s.id)}>{s.title}</button>
          ))}
        </nav>
        <div className="man-content" ref={contentRef} onScroll={onScroll}>
          <div className="man-lead">
            <div className="man-lead-t">{manual.title}</div>
            <p className="man-lead-s">{manual.subtitle}</p>
          </div>
          {manual.sections.map((s) => (
            <section className="man-sec" id={"sec-" + s.id} key={s.id}>
              <h3 className="man-h">{s.title}</h3>
              <ManBlocks blocks={s.blocks} />
            </section>
          ))}
          <div className="man-end">Njord {manual.title} · Rev {manual.rev} · © Pure Salmon Technology</div>
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><Icon name="book-open" size={13} /> {manual.sections.length} sections</span>
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn btn-secondary" href={(window.__resources && window.__resources[manual.resId]) || manual.pdf} download><Icon name="download" size={15} /> Download PDF</a>
          <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
        </div>
      </div>
    </Dialog>
  );
}

// ── SCADA manual content ──────────────────────────────────────────────────────
const SCADA_MANUAL = {
  key: "scada", icon: "book-open", title: "SCADA Manual", rev: "2.0", resId: "njScadaPdf",
  pdf: "assets/manuals/Njord_SCADA_userguide_EN.pdf",
  subtitle: "Operating the Njord SCADA console, navigation, process objects, trends, reports, maneuver history and alarms.",
  sections: [
    { id: "signin", title: "Signing in", blocks: [
      { t: "p", x: "Open the platform in a supported web browser (or the Workstation app) from any device on a network with access to the SCADA server. Everyone can view most of the plant, but changing values and using advanced functions requires a signed-in account." },
      { t: "p", x: "Your identity and role are shown at the bottom of the left sidebar. Once signed in you gain access based on your role: more navigation options, the ability to edit parameters and alarm limits, and manual operation of equipment." },
    ]},
    { id: "menus", title: "Menu areas", blocks: [
      { t: "sub", x: "Top bar" },
      { t: "p", x: "Always visible. It shows the facility breadcrumb (Building → Department → System), live alarm pills that deep-link into the alarm list, and quick-access icons for search, maneuver history and help. The NJORD logo returns you to the Dashboard from anywhere." },
      { t: "p", x: "The search button (or Ctrl-K / Cmd-K anywhere in the console) opens the command palette: type a screen, system, department, alarm view or tag name to jump straight to it, or send a tag to Trends without leaving the page." },
      { t: "sub", x: "Left sidebar" },
      { t: "p", x: "The persistent navigation rail: Dashboard, Site Plan, Alarms, Maneuver History, Reports, Fish Feeding, Fish Biology, Analytics and Settings. It can be collapsed to an icon rail to free up screen space." },
      { t: "sub", x: "Right-side docks" },
      { t: "p", x: "Process screens carry context docks that change per page, parameters, alarm limits and preconfigured trends for the system currently open. Expand them from the icon rail on the right edge." },
    ]},
    { id: "nav", title: "Site Plan", blocks: [
      { t: "p", x: "The Site Plan screen is a top-down view of the facility: buildings are footprints, departments are zones, and each system is a node showing only its name and status. Click a system node to open its process mimic." },
      { t: "p", x: "Every pipe on a mimic is tinted by the fluid it carries, process water, raw water, drain, sludge, glycol loop, brine loop, lye dosing, and gas lines (oxygen, air and CO₂ off-gas) are dashed. The legend strip under each mimic lists only the fluids that screen carries. Equipment status keeps its own colours (green running, gray stopped, red alarm), which always read louder than the pipework." },
      { t: "p", x: "Within a process area, the department tab bar switches between the systems of that department. Flow arrows on a mimic show where process fluid comes from or goes to; bold arrows are shortcuts you can click to jump to the connected process page." },
    ]},
    { id: "objects", title: "Process objects", blocks: [
      { t: "p", x: "Process mimics use live objects for equipment. Each object shows status through color and shape and opens a details popup when clicked." },
      { t: "defs", x: [
        ["Analog sensors", "Value fields on the mimic. A red border means an active alarm on the sensor; a red fill means an invalid reading (sensor fault). Open the equipment popup to trend the value or inspect details."],
        ["Motors", "Dynamic circles that turn green and rotate in the flow direction while running, sit black at standstill, and blink red on alarm. The popup exposes start/stop, mode and setpoints where permitted."],
        ["Valves", "Change color by state: gray = manual/unpowered, black = closed, green = open, amber = no position feedback, red = alarm."],
        ["Value fields", "Display parameters, alarm limits and other values. Read-only fields can be sent to Trends; writable fields open an edit popup with a change history and (where configured) a required comment."],
      ]},
      { t: "note", x: "Value changes use a two-step confirm, you enter the new value, review the delta against the current value and allowed range, then confirm. Every change is written to maneuver history." },
    ]},
    { id: "trends", title: "Trends", blocks: [
      { t: "p", x: "Trending gives access to all logged data. Preconfigured trends live in the right-side dock of a process page and in equipment popups. The custom Trends workspace lets you plot any signals together." },
      { t: "p", x: "Send any readout to Trends with its line-chart button, it opens as a floating, movable Trends window so you can keep adding pens while a popup stays open. Choose a range (1h / 6h / 24h / 7d), toggle alarm markers, hide/show pens, and open the full Analytics workspace for a larger view." },
      { t: "p", x: "The Analytics screen adds a pen catalog, per-pen focus on the Y-axis, statistics, live updates and total-flow calculations, plus CSV / Excel export of the plotted data." },
      { t: "sub", x: "Trend groups" },
      { t: "p", x: "A trend group is a saved collection of parameters you analyse together. Save the current pens as a group from the Pens panel, then reopen it later from the Groups library, where groups can be searched, loaded, duplicated, edited or deleted. A group is private to you or shared with the whole plant, and the creator is shown on every shared group." },
      { t: "sub", x: "Alarm linkage" },
      { t: "p", x: "Alarms and trends are linked one to one. Investigating an alarm plots the process value that triggered it, centred on the alarm moment with a ±30 minute focus window, its threshold drawn as a dashed line. Alarm markers on a pen open a detail popover with a link back to the alarm row. Discrete alarms with no measured value open an event timeline instead of a chart." },
    ]},
    { id: "reports", title: "Reports", blocks: [
      { t: "p", x: "Reporting combines logged data into key-figures tables for a chosen period and scope, Fish Calculation, Feed Report, Fish Summary and Key Numbers." },
      { t: "p", x: "Pick a start and end date, review the daily rows with an expandable Sum / Average / Min / Max calculation section, download the data as CSV or Excel, or open it in the report viewer, a movable, printable document window that stays open while you navigate." },
    ]},
    { id: "maneuver", title: "Maneuver history", blocks: [
      { t: "p", x: "Every maneuver is logged at signal level so changes can be reviewed later." },
      { t: "ul", x: [
        "Quick access: the history icon in the top bar opens the last week of maneuvers from any page.",
        "Overview screen: the full site-wide log, filtered by source (operator or automatic), area, tag and operator, plus free-text search.",
        "Each row carries the time, area, tag, signal, the from → to value, the operator and the comment typed on confirmation.",
        "Object and parameter history: each equipment popup and each writable field carries its own change log with timestamp, from → to value and operator.",
      ]},
    ]},
    { id: "notes", title: "Notes", blocks: [
      { t: "p", x: "Notes capture deviations and useful information about the plant. They can be general or linked to specific equipment." },
      { t: "p", x: "Equipment notes live on the Notes tab of an equipment popup, with Active / Archived views and a New note form, add a note, archive it when resolved, or restore it. General notes are managed the same way from the notes area." },
    ]},
    { id: "alarms", title: "Alarms", blocks: [
      { t: "p", x: "The alarm system follows ISA-18.2 / IEC 62682. Alarms are categorized by priority (Critical, High, Medium, Low, Diagnostic) and tracked through their full lifecycle." },
      { t: "sub", x: "Alarm rationalization" },
      { t: "p", x: "Alarms start out not-configured and must be rationalized before they annunciate, setting alarm text, priority, limits, delays, consequence and operator response. The Rationalization tab holds the master register: filter by status and priority, edit inline, bulk-edit selections and import/export, and re-evaluate or de-rationalize any alarm at any time (authorized users)." },
      { t: "sub", x: "Alarm list" },
      { t: "p", x: "Tabs switch between Active, All Alarms, Historical, Statistics, Deactivated and Rationalization. Sort by any column, select one or more rows (or the whole page) to Acknowledge, Block or set Out of service, and open an object popup for a pre-filtered, area-level view. Deactivated splits into Blocked (by operator, optionally with an auto-reactivate timer, or logic-controlled) and Out of service." },
      { t: "sub", x: "Statistics & on-call" },
      { t: "p", x: "The Statistics tab compares alarm activity across periods to surface repeat offenders. On-call management (in Settings) routes notifications by alarm group over SMS / call / e-mail, with escalation to higher-priority users and a resend interval until an alarm is acknowledged or returns to normal." },
    ]},
    { id: "users", title: "User administration", blocks: [
      { t: "p", x: "Settings holds user and role management. Roles carry a set of granted or denied permissions so uniform access can be set for each user level; a user with multiple roles combines their permissions." },
      { t: "ul", x: [
        "Users: create, edit and delete accounts, set basic details and notification info, and assign roles.",
        "Roles: a permission matrix per module (Njord, Fish Feeding, Fish Biology, Analytics) that can be freely created, modified and deleted.",
        "On-call: alarm groups with per-group notification priorities and minimum staffing rules.",
        "Preferences: theme (light, dark or the classic skin), table density, default screen and units. Stored per device from the user menu.",
      ]},
    ]},
    { id: "mobile", title: "Mobile view", blocks: [
      { t: "p", x: "On phones and tablets the console adopts a compact, mobile-first layout, the process flow view is replaced by equipment cards that keep controls and key information reachable on a small screen." },
    ]},
  ],
};

// ── Fish Feeding manual content ───────────────────────────────────────────────
const FEEDING_MANUAL = {
  key: "feeding", icon: "utensils", title: "Fish Feeding Manual", rev: "1.1", resId: "njFeedingPdf",
  pdf: "assets/manuals/Njord_FishFeeding_userguide_EN.pdf",
  subtitle: "Controlling feed dosing to fish tanks, feed tables, feeders, distribution curves, profiles and calibration.",
  sections: [
    { id: "general", title: "General description", blocks: [
      { t: "p", x: "Njord Fish Feeding controls feed dosing to fish tanks. It combines a feed table with live tank data and per-feeder calibration to calculate and control the amount of feed dosed to each tank per day." },
      { t: "p", x: "Feed can be dosed evenly over 24 hours or shaped with a custom distribution and feed profiles. Distribution, profiles and feed types are set individually per tank. Calibration data is stored per feed type, so switching feed types is easy once feeders are calibrated." },
      { t: "note", x: "Best results depend on operators keeping the feed factor and activity factor in each tank up to date to avoid inefficient feeding." },
    ]},
    { id: "start", title: "How to start feeding to a tank", blocks: [
      { t: "steps", x: [
        "Confirm settings: tank feeding is paused; the correct feed tables are selected for the department; every feeder has the right feed-type calibration, minimum runtime and interval; population and average weight are correct; feed factor, activity factor and recalculation time are set; and distribution/profile settings match the intended behavior.",
        "Verify equipment is ready: feeders in automatic control, safety switches/e-stops in operational positions, and the feed-delivery system able to supply the correct feed type.",
        "Either set base feed manually for the first day, or move the recalculation time to now to trigger an automatic calculation from biomass data (then restore the recalculation time).",
        "Set the feeding control from Paused to In operation when you are ready to begin.",
      ]},
    ]},
    { id: "tankcard", title: "Fish tank card", blocks: [
      { t: "p", x: "The tank overview card shows feed-control information and parameters. Values with a black frame are editable if you have sufficient rights. Clicking the feeder graphic at the top opens feeder-specific popups." },
      { t: "sub", x: "Feeder object" },
      { t: "p", x: "Shows feeder status (gray = stopped, green = in operation, yellow = paused, blue = calibrating, red = error) and a two-line indicator: a green line for feed actually dosed and a gray line for what should have been dosed under uninterrupted auto control. A gap between them signals pauses, hand/boost feeding, forced/manual runs, errors or a mid-day recalibration. Small gaps are normal (hardware delay)." },
      { t: "defs", x: [
        ["Today's target", "Feed target for the current feed cycle, from base feed and activity factor."],
        ["Recalc. time", "Time of day that starts a new feed cycle: resets counters and recalculates base feed and average weight."],
        ["Feed factor (FCR)", "Expected feed-to-growth ratio; used to update average weight at the start of a cycle."],
        ["Activity factor", "How hungry the fish are / how much dosed feed is eaten; adjusted through the day to optimize the target."],
        ["Average weight", "Average fish weight, auto-updated each cycle and manually correctable after sampling."],
        ["Base feed", "Calculation base for today's target, combined with activity factor; auto-set each cycle from the feed table and biomass."],
        ["Hand feed / Boost feed", "Register manual feeding, or force feeders to max speed for a set time. Both trigger a recalculation so the tank still finishes its plan on time."],
      ]},
    ]},
    { id: "view", title: "Adjusting the view", blocks: [
      { t: "p", x: "The information shown on tank cards is set per user from the right-side menu, toggle functions on or off to tailor the cards. These preferences are stored per user and apply to every tank card for that user." },
    ]},
    { id: "feedtables-set", title: "Feed table settings", blocks: [
      { t: "p", x: "Feed tables are set per department and viewed in a right-side dock (edit requires a high enough access level). Select which tables to use and set weight breakpoints to switch tables: for example one table up to 100 g and another above 100 g." },
    ]},
    { id: "feederpopup", title: "Feeder popup", blocks: [
      { t: "p", x: "Opened by clicking a feeder object; shows data and parameters for that feeder. Black-framed values are editable with sufficient access." },
      { t: "defs", x: [
        ["Status", "Feeder state (gray = stopped, green = running, yellow = paused, blue = calibrating, red = error)."],
        ["Current target", "Reference to the feeder in kilograms of feed per hour."],
        ["Capacity", "Percentage of the feeder's maximum capacity in use; 100% means continuous max speed. Tooltip shows kg/h."],
        ["Feed type", "Selects the dosed feed type and loads the matching calibration."],
        ["Current calibration", "Grams of feed dosed per feeder rotation for the selected feed type."],
        ["Minimum operation time / interval", "Shortest allowed run per interval and the desired on/off interval; the current interval can lengthen to honor the minimum runtime."],
      ]},
      { t: "note", x: "Interval settings are overridden by any active feed profile while it is in use." },
    ]},
    { id: "distribution", title: "Custom feed distribution", blocks: [
      { t: "p", x: "The distribution popup shapes today's target across a 24-hour period. Each column is one hour: taller columns receive more feed. Read the result as a percentage or as actual feed per hour in the lowest table rows." },
      { t: "p", x: "Adjust by dragging columns or editing the value row, then save with a commit button. Commit applies at the next feed cycle; Commit & activate applies immediately. Named curve setups can be stored and reused across tanks (e.g. 16-hour cycle, 12-hour cycle, batch feeding)." },
      { t: "note", x: "Distribution only affects the setpoint when custom distribution is enabled; otherwise the daily setpoint is spread evenly across the hours." },
    ]},
    { id: "profiles", title: "Feed profiles", blocks: [
      { t: "p", x: "Feed profiles customize how the setpoint for a single hour is distributed instead of an even spread. Hours with an active profile are marked above the columns in the distribution view; click a marker to open the profile wizard." },
      { t: "p", x: "Break the hour into 5-minute intervals and allocate the setpoint as you like, any leftover feed spreads evenly over the remaining time. Each profile has its own interval that overrides feeder interval for its duration. Examples: front-load most feed early then trickle the rest, or dump large batches a few times per hour." },
      { t: "note", x: "With the max-speed option, duration is computed from feeder capacity, leave buffer time so the profile does not exceed 60 min, otherwise it cannot hit the hourly target and raises an alarm." },
    ]},
    { id: "calibration", title: "Calibration admin", blocks: [
      { t: "p", x: "Calibration admin (from the Fish Feeding menu) manages feed types and feeder calibration data as a matrix of feed types × feeders. Click a cell and use the right-side dock to edit. Once a feeder is calibrated for a feed type, that type becomes selectable in the feeder popup." },
      { t: "defs", x: [
        ["New / Delete feed type", "Add or remove a feed type from the plant."],
        ["Calibration value", "Current value for the selected feeder/feed-type; editable to change it directly."],
        ["Update calibration", "Writes the calibration value to the database for the selected feeder."],
        ["Open calibration interface", "Starts (or resumes) a calibration sequence for the feeder."],
        ["Delete calibration", "Removes the value for a feeder/feed-type combination, disallowing that feed type for the feeder."],
      ]},
    ]},
    { id: "feedtables", title: "Feed tables", blocks: [
      { t: "p", x: "Users with sufficient access can upload, view, modify and delete feed tables from the Fish Feeding menu. A built-in tool lets you enter a temperature and average weight to preview the SGR the table will calculate." },
      { t: "p", x: "Import a new table by giving it a unique name and uploading a CSV file. In v2.0 feed-table import also works directly with Excel files." },
      { t: "note", x: "CSV files need a specific layout to import, contact your system provider for help formatting the file the first time." },
    ]},
  ],
};

const NJ_MANUALS = { scada: SCADA_MANUAL, feeding: FEEDING_MANUAL };
function openManual(key) { const m = NJ_MANUALS[key]; if (m) openDialog(<ManualDialog manual={m} />); }

// ── About NJORD (release notes) ───────────────────────────────────────────────
const NJ_RELEASES = [
  { module: "SCADA", version: "2.0", changes: [
      "Screens rebuilt with a responsive, mobile-first layout",
      "Alarm system reworked around a new alarm philosophy (ISA-18.2)",
      "Alarm rationalization implemented",
      "Alarm grouping expanded with more configurable settings",
      "New role-based permission system: fully customizable roles and permissions",
      "User maneuvers reworked: value changes now use a two-step confirmation",
      "Maneuver tracking improved with a new site-wide overview screen",
      "Language & translation system improved",
      "Support ticketing to Pure Salmon built directly into the Help menu",
    ], improvements: [
      "General performance: faster responsiveness and loading",
      "Trend tool now supports live updates and total-flow calculations",
    ] },
  { module: "Fish Feeding", version: "2.0", changes: [
      "Feed-table import now works directly with Excel files",
    ] },
  { module: "Fish Biology", version: "2.0", changes: [
      "Categorization updated to conform with current standards",
      "Dead-fish module released",
    ] },
  { module: "Analytics", version: "2.0", changes: [
      "Overhauled MBBR maturation sheet with an improved interface",
    ] },
  { module: "Integrations", version: "2.0", changes: [
      "Added built-in VNC solution for displaying external systems (PCs, HMIs, etc.)",
    ] },
];
function AboutDialog() {
  return (
    <Dialog width={620}>
      <DlgHeader icon="info" name="About NJORD" onClose={closeDialog} />
      <div className="dlg-body about-body">
        <div className="about-hero">
          <div className="about-mark">NJORD</div>
          <div className="about-hero-r">
            <div className="about-ver">Platform version <strong>2.0</strong></div>
            <div className="about-prod">A product of Pure Salmon Technology · land-based RAS salmon farming</div>
          </div>
        </div>
        <div className="about-eyebrow">Release notes</div>
        {NJ_RELEASES.map((r) => (
          <div className="about-rel" key={r.module}>
            <div className="about-rel-h">
              <span className="about-rel-name">{r.module}</span>
              <span className="about-rel-ver">v{r.version}</span>
            </div>
            <div className="about-grp"><span className="about-grp-l about-chg">Changes</span>
              <ul className="about-ul">{r.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
            {r.improvements && (
              <div className="about-grp"><span className="about-grp-l about-imp">Improvements</span>
                <ul className="about-ul">{r.improvements.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta">© Pure Salmon Technology · puresalmontech.com</span>
        <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
      </div>
    </Dialog>
  );
}
function openAbout() { openDialog(<AboutDialog />); }

Object.assign(window, { ManualDialog, openManual, AboutDialog, openAbout, NJ_MANUALS });
