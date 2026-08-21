// main.jsx — app entry. Must be the LAST entry in the build manifest: it references
// the screen components that the earlier files define as globals.
document.body.classList.add("standalone");
window.__njNavSub = "plan";

// nav id -> screen component (built screens). Navigation is a sub-router across
// the active department's systems (Fish Tank / RAS / Fish Summary).
const SCREENS = {
  start:      StartScreen,
  navigation: NavigationView,
  alarms:     AlarmsView,
  maneuver:   ManeuverHistoryScreen,
  reports:    ReportsScreen,
  settings:   SettingsScreen,
  feeding:    FeedingScreen,
  biology:    FishBiologyScreen,
  energy:      EnergyConsumptionScreen,
  consumption: ConsumptionScreen,
  heatpumps:  HeatPumpsScreen,
  analytics:  AnalyticsScreen,
};

function ComingSoon({ id }) {
  const item = NAV.find((n) => n.id === id) || { label: id, icon: "square" };
  return (
    <AppShell active={id} title={item.label} statusLevel="ok">
      <div className="pagehead">
        <p className="pagehead-sub">This screen has not been redesigned yet.</p>
      </div>
      <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "72px 24px", textAlign: "center" }}>
        <span style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--slate-100)", color: "var(--slate-400)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={item.icon} size={26} />
        </span>
        <div className="body-strong">{item.label} is queued for redesign</div>
        <p className="body" style={{ maxWidth: 360, margin: 0 }}>Pick this page from the sidebar list to design it next.</p>
      </div>
    </AppShell>
  );
}

function App() {
  const [active, setActive] = React.useState("start");
  // __njRoute mirrors the live route so shared code (njPickContext) can tell which top-level
  // screen is showing without prop threading.
  React.useEffect(() => { window.__njNavigate = (id) => { window.__njRoute = id; setActive(id); }; window.__njRoute = active; }, []);
  React.useEffect(() => { window.__njRoute = active; }, [active]);
  const Screen = SCREENS[active];
  return (
    <React.Fragment>
      {Screen ? <Screen /> : <ComingSoon id={active} />}
      <DialogHost />
      <TrendWindow />
      <ReportWindow />
      <CommandPalette />
      <AlarmDrawer />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
