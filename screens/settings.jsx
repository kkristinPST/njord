// settings.jsx — Settings / User Administration (Settings sidebar item)

function SetTabs({ active, onChange }) {
  const tabs = ["General", "Users", "Roles", "On-call"];
  return (
    <div className="segmented">
      {tabs.map((t) => <button key={t} className={"seg" + (t === active ? " active" : "")} onClick={() => onChange(t)}>{t}</button>)}
    </div>
  );
}

// ---- Users ----
const USERS = [
  { u: "lum", first: "Lucy", last: "Martin", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", notif: "SMS · Email" },
  { u: "jro", first: "Jeanne", last: "Rousseau", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", notif: "SMS" },
  { u: "kca", first: "Karen", last: "Carter", roles: ["Operator"], phone: "47 xxx xxx", notif: "SMS" },
  { u: "elel", first: "Elliot", last: "Ellis", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", notif: "SMS · Email" },
  { u: "kgr", first: "Kevin", last: "Garrett", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", notif: "SMS" },
  { u: "csw", first: "Clemens", last: "Schwarz", roles: ["Operator", "Supervisor"], phone: "—", notif: "—" },
  { u: "ov", first: "Olaf", last: "Vink", roles: ["Operator", "Supervisor", "Testmodul"], phone: "47 xxx xxx", notif: "SMS · Email" },
  { u: "sk", first: "Sam", last: "King", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", notif: "SMS" },
  { u: "jlo", first: "Joe", last: "Lawrence", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", notif: "Email" },
];

function UserDialog({ user, existing, onSave }) {
  const editing = !!user;
  const notifSet = new Set((user && user.notif ? user.notif : "").split("·").map((s) => s.trim()).filter(Boolean));
  const [f, setF] = React.useState(() => ({
    u: user ? user.u : "", first: user ? user.first : "", last: user ? user.last : "",
    roles: new Set(user ? user.roles : ["Operator"]), phone: user && user.phone !== "—" ? user.phone : "",
    email: user && user.email ? user.email : "",
    sms: notifSet.has("SMS"), email_notif: notifSet.has("Email"),
  }));
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleRole = (r) => setF((s) => { const n = new Set(s.roles); n.has(r) ? n.delete(r) : n.add(r); return { ...s, roles: n }; });
  const uTrim = f.u.trim().toLowerCase();
  const dupU = !editing && existing.some((x) => x.u.toLowerCase() === uTrim);
  const emailTrim = f.email.trim();
  const emailOk = !emailTrim || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTrim);
  const valid = uTrim && f.first.trim() && f.last.trim() && f.roles.size > 0 && !dupU && emailOk && !(f.email_notif && !emailTrim);
  const roleOptions = ["Operator", "Supervisor", "Testmodul", "StatusViewer"];
  const save = () => {
    const notif = [f.sms && "SMS", f.email_notif && "Email"].filter(Boolean).join(" · ") || "—";
    onSave({ u: uTrim, first: f.first.trim(), last: f.last.trim(), roles: [...f.roles], phone: f.phone.trim() || "—", email: emailTrim, notif }, editing);
    closeDialog();
  };
  return (
    <Dialog width={540}>
      <DlgHeader icon={editing ? "pencil" : "user-plus"} name={editing ? "Edit user" : "New user"} tag={editing ? user.u : undefined} onClose={closeDialog} />
      <div className="dlg-body de-form">
        <div className="de-form-2col">
          <DeField label="First name"><input className="de-input" autoFocus placeholder="First name" value={f.first} onChange={(e) => set("first", e.target.value)} /></DeField>
          <DeField label="Last name"><input className="de-input" placeholder="Last name" value={f.last} onChange={(e) => set("last", e.target.value)} /></DeField>
        </div>
        <DeField label="Username" hint={editing ? "Username can't be changed" : "Short login handle, e.g. lmartin"}>
          <input className="de-input" placeholder="username" value={f.u} disabled={editing} onChange={(e) => set("u", e.target.value)} />
        </DeField>
        {dupU && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>That username is already taken.</div>}
        <DeField label="Roles">
          <div className="usr-roles">
            {roleOptions.map((r) => (
              <button key={r} type="button" className={"usr-rolechip" + (f.roles.has(r) ? " on" : "")} onClick={() => toggleRole(r)}>
                {f.roles.has(r) && <Icon name="check" size={14} />} {r}
              </button>
            ))}
          </div>
        </DeField>
        <DeField label="Email" hint={f.email_notif && !emailTrim ? undefined : "For email alarm notifications and account recovery"}>
          <input className="de-input" type="email" placeholder="name@puresalmontech.com" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </DeField>
        {emailTrim && !emailOk && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>Enter a valid email address.</div>}
        <div className="de-form-2col">
          <DeField label="Phone"><input className="de-input" placeholder="47 xxx xxx" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></DeField>
          <DeField label="Notifications">
            <div className="usr-notif">
              <label className="usr-check" {...njCheckable(() => set("sms", !f.sms), { on: f.sms, label: "SMS notifications" })}><Check on={f.sms} /> SMS</label>
              <label className="usr-check" {...njCheckable(() => set("email_notif", !f.email_notif), { on: f.email_notif, label: "Email notifications" })}><Check on={f.email_notif} /> Email</label>
            </div>
          </DeField>
        </div>
        {f.email_notif && !emailTrim && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>Add an email address to enable email notifications.</div>}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} /> {editing ? "Save" : "Create"}</button>
      </div>
    </Dialog>
  );
}

function UsersTab() {
  const [users, setUsers] = React.useState(USERS);
  const [q, setQ] = React.useState("");
  const ql = q.trim().toLowerCase();
  const rows = users.filter((u) => !ql || [u.u, u.first, u.last, u.roles.join(" "), u.phone].join(" ").toLowerCase().includes(ql));
  const removeUser = (u) => { setUsers((s) => s.filter((x) => x.u !== u.u)); njToast(u.first + " " + u.last + " removed."); };
  const saveUser = (data, editing) => {
    if (editing) { setUsers((s) => s.map((x) => (x.u === data.u ? data : x))); njToast(data.first + " " + data.last + " updated."); }
    else { setUsers((s) => [...s, data]); njToast(data.first + " " + data.last + " added to this facility."); }
  };
  const openAdd = () => openDialog(<UserDialog existing={users} onSave={saveUser} />);
  const openEdit = (u) => openDialog(<UserDialog user={u} existing={users} onSave={saveUser} />);
  return (
    <div className="card">
      <div className="filterbar">
        <div className="field" style={{ minWidth: 280 }}>
          <Icon name="search" size={16} color="var(--slate-400)" />
          <input placeholder="Filter user, name, role…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn-primary" onClick={openAdd}><Icon name="user-plus" size={16} /> New user</button>
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr><th>Username</th><th>Name</th><th>Roles</th><th>Phone</th><th>Notifications</th><th style={{ width: 80 }}></th></tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.u}>
              <td><span className="tag">{u.u}</span></td>
              <td className="td-strong">{u.first} {u.last}</td>
              <td>
                <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                  {u.roles.map((r) => <span key={r} className="badge" style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>{r}</span>)}
                </span>
              </td>
              <td><span className="data">{u.phone}</span></td>
              <td><span className="small">{u.notif}</span></td>
              <td>
                <span className="row-actions">
                  <button className="icon-btn" title={"Edit " + u.first} onClick={() => openEdit(u)}><Icon name="pencil" size={16} /></button>
                  <button className="icon-btn" title={"Remove " + u.first} onClick={() => openDialog(<ConfirmDialog title="Remove user" message={"Remove " + u.first + " " + u.last + "?"} detail={"Their account (" + u.u + ") loses access immediately. This cannot be undone."} confirmLabel="Remove" tone="danger" onConfirm={() => removeUser(u)} />)}><Icon name="trash-2" size={16} /></button>
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <NjEmptyRow colSpan={6} reason="search" title={"No users match \u201c" + q + "\u201d"}
            action={<button className="btn btn-secondary btn-sm" onClick={() => setQ("")}>Clear search</button>} />}
        </tbody>
      </table>
    </div>
  );
}

// ---- Roles + permission matrix ----
const ROLES = [
  { name: "Operator", users: 21, desc: "Day-to-day monitoring, acknowledge alarms, log readings" },
  { name: "Supervisor", users: 13, desc: "Full control, change parameters, manage alarms & feeding" },
  { name: "Testmodul", users: 4, desc: "Commissioning & test access; no production control" },
  { name: "StatusViewer", users: 1, desc: "Read-only dashboards and trends" },
];
const PERM_MODULES = {
  "Njord": ["Change Parameters", "Control Equipment", "Create & Edit Notes", "Change Alarm Limits", "Acknowledge Alarms", "Shelve Alarms", "Deactivate Alarms", "Manage Alarm Properties", "Manage Alarm Groups", "Manage Test Alarms", "Manage Alarm Sender"],
  "Fish Feeding": ["Adjust Feed Rate", "Edit Feed Curves", "Pause / Resume Feeding", "Manage Feeders", "Edit Feed Settings"],
  "Fish Biology": ["Register Welfare Scoring", "Register Mortality", "Manage Batches", "Generate Welfare Reports"],
  "Analytics": ["View Trends", "Create & Save Trend Views", "Export Trend Data", "Configure Dashboards"],
};

function PermToggle({ value, onChange }) {
  return (
    <span className="perm-toggle">
      <button className={"allow" + (value === "allow" ? " on" : "")} onClick={() => onChange("allow")}>Allow</button>
      <button className={"deny" + (value === "deny" ? " on" : "")} onClick={() => onChange("deny")}>Deny</button>
    </span>
  );
}

function NewRoleDialog({ roleNames, onCreate }) {
  const [name, setName] = React.useState("");
  const [base, setBase] = React.useState(roleNames[0] || "");
  const [desc, setDesc] = React.useState("");
  const trimmed = name.trim();
  const dup = roleNames.some((r) => r.toLowerCase() === trimmed.toLowerCase());
  const valid = trimmed && !dup;
  const save = () => { onCreate(trimmed, base, desc.trim()); njToast(`Role "${trimmed}" created.`); closeDialog(); };
  return (
    <Dialog width={480}>
      <DlgHeader icon="shield-plus" name="New role" onClose={closeDialog} />
      <div className="dlg-body de-form">
        <DeField label="Role name" hint="e.g. Biologist, Maintenance">
          <input className="de-input" autoFocus placeholder="Role name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && valid) save(); }} />
        </DeField>
        {dup && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>A role with that name already exists.</div>}
        <DeField label="Base permissions on" hint="Copy the permission set from an existing role, then adjust">
          <select className="de-input" value={base} onChange={(e) => setBase(e.target.value)}>
            <option value="">Blank: all allowed</option>
            {roleNames.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </DeField>
        <DeField label="Description (optional)"><input className="de-input" placeholder="What this role is for…" value={desc} onChange={(e) => setDesc(e.target.value)} /></DeField>
      </div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} /> Create</button>
      </div>
    </Dialog>
  );
}

function RolesTab() {
  const [roles, setRoles] = React.useState(ROLES);
  const [role, setRole] = React.useState("Supervisor");
  const [mod, setMod] = React.useState("Njord");
  const [perms, setPerms] = React.useState({});
  const key = (m, p) => `${role}|${m}|${p}`;
  const get = (m, p) => perms[key(m, p)] || "allow";
  const set = (m, p, v) => setPerms((s) => ({ ...s, [key(m, p)]: v }));
  const mods = Object.keys(PERM_MODULES);
  const createRole = (nm, base, desc) => {
    setRoles((rs) => [...rs, { name: nm, users: 0, desc: desc || (base ? "Based on " + base : "Custom role") }]);
    if (base) setPerms((s) => { const next = { ...s }; Object.keys(s).forEach((k) => { if (k.startsWith(base + "|")) next[nm + k.slice(base.length)] = s[k]; }); return next; });
    setRole(nm); setMod("Njord");
  };
  const activeRole = roles.find((r) => r.name === role);
  return (
    <div className="role-layout">
      <div className="card">
        <div className="card-head">
          <span className="card-title">Roles</span>
          <button className="linkbtn" onClick={() => openDialog(<NewRoleDialog roleNames={roles.map((r) => r.name)} onCreate={createRole} />)}><Icon name="plus" size={14} /> New role</button>
        </div>
        <div>
          {roles.map((r) => (
            <button key={r.name} className={"role-item" + (r.name === role ? " active" : "")} onClick={() => setRole(r.name)}>
              <span className="role-item-l">
                <span className="role-name">{r.name}</span>
                {r.desc && <span className="role-desc">{r.desc}</span>}
              </span>
              <span className="role-count">{r.users} {r.users === 1 ? "user" : "users"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-head-l">
            <Icon name="shield" size={16} color="var(--slate-600)" />
            <div className="role-edit-title">
              <span className="card-title">Edit role · {role}</span>
              {activeRole && activeRole.desc && <span className="role-edit-desc">{activeRole.desc}</span>}
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: "6px 14px" }} onClick={() => njToast(role + " role permissions saved.")}><Icon name="check" size={16} /> Save</button>
        </div>
        <div style={{ padding: "14px 20px 0" }}>
          <div className="segmented">
            {mods.map((m) => <button key={m} className={"seg" + (m === mod ? " active" : "")} onClick={() => setMod(m)}>{m}</button>)}
          </div>
        </div>
        <div style={{ paddingTop: 8 }}>
          {PERM_MODULES[mod].map((p) => (
            <div className="perm-row" key={p}>
              <span className="perm-name">{p}</span>
              <PermToggle value={get(mod, p)} onChange={(v) => set(mod, p, v)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- On-call ----
// notification targets: duty phones + facility users
const OC_PHONES = [
  { id: "vt1", name: "Duty phone 1", kind: "phone" },
  { id: "vt2", name: "Duty phone 2", kind: "phone" },
];
function ocRoster() { return OC_PHONES.concat(USERS.map((u) => ({ id: u.u, name: u.first + " " + u.last, kind: "person", role: u.roles[0], notif: u.notif }))); }
function ocMember(id) { return ocRoster().find((m) => m.id === id) || { id, name: id, kind: "person" }; }

// coverage: the minimum alarm severity a group is paged for
const OC_PRIOS = [
  { id: "critical", label: "Critical", covers: "Critical only" },
  { id: "high", label: "High", covers: "High and above" },
  { id: "medium", label: "Medium", covers: "Medium and above" },
  { id: "low", label: "Low", covers: "All alarms" },
];
function ocPrio(id) { return OC_PRIOS.find((p) => p.id === id) || OC_PRIOS[3]; }

// on-call windows (which alarms reach the group by time of day)
const OC_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const OC_DAY_LABEL = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
function ocWin(all, we) { return { mon: all, tue: all, wed: all, thu: all, fri: all, sat: we != null ? we : all, sun: we != null ? we : all }; }
const OC_SHIFTS = [
  { id: "247", label: "24/7", summary: "00:00–24:00 · every day", win: () => ocWin("00:00-24:00") },
  { id: "day", label: "Daytime", summary: "07:00–15:00 · Mon–Fri", win: () => ocWin("07:00-15:00", "") },
  { id: "evening", label: "Evening", summary: "15:00–23:00 · Mon–Fri", win: () => ocWin("15:00-23:00", "") },
  { id: "night", label: "Night", summary: "23:00–07:00 · every day", win: () => ocWin("23:00-07:00") },
  { id: "weekend", label: "Weekend", summary: "00:00–24:00 · Sat–Sun", win: () => ({ mon: "", tue: "", wed: "", thu: "", fri: "", sat: "00:00-24:00", sun: "00:00-24:00" }) },
  { id: "custom", label: "Custom", summary: "Per-day schedule", win: () => ocWin("00:00-24:00") },
];
function ocShift(id) { return OC_SHIFTS.find((s) => s.id === id) || OC_SHIFTS[0]; }
function ocSchedSummary(g) {
  if (g.shift && g.shift !== "custom") return ocShift(g.shift).summary;
  const on = OC_DAYS.filter((d) => g.win && g.win[d]);
  if (!on.length) return "No active window";
  const wins = Array.from(new Set(on.map((d) => g.win[d])));
  const dayTxt = on.length === 7 ? "every day" : on.map((d) => OC_DAY_LABEL[d].slice(0, 3)).join(", ");
  return (wins.length === 1 ? wins[0].replace("-", "–") : "Mixed") + " · " + dayTxt;
}

const OC_LS = "nj_oncall_v2";
// NS 9416: a facility without 24/7 on-site personnel needs TWO independent remote-alarm paths.
// PSTech fulfils it with the GSM dispatcher (SMS / voice) and a UHF sender, so the channel is an
// attribute of each escalation tier and the first tier — the one that carries critical alarms —
// cannot be saved on a single path.
const OC_CHANNELS = [
  { id: "sms", label: "SMS", icon: "message-square", path: "GSM" },
  { id: "voice", label: "Voice", icon: "phone", path: "GSM" },
  { id: "uhf", label: "UHF", icon: "radio", path: "UHF" },
];
function ocChan(g, tier) { return (g.chan && g.chan[tier]) || []; }
// independent = different physical path. SMS + voice both ride the GSM modem, so they are ONE.
function ocPaths(list) { return new Set((list || []).map((c) => (OC_CHANNELS.find((x) => x.id === c) || {}).path).filter(Boolean)); }
function ocTierOk(g, tier) { return tier !== "p1" || ocPaths(ocChan(g, tier)).size >= 2; }
const OC_SEED = [
  { id: "g_all", name: "All Alarms", desc: "Every alarm, around the clock", enabled: true, shift: "247", win: ocWin("00:00-24:00"), minPriority: "low", tiers: { p1: ["vt1", "vt2", "lum", "jlo"], p2: ["kgr"], p3: ["elel"] }, minUsers: { p1: 1, p2: 0, p3: 0 }, chan: { p1: ["sms", "uhf"], p2: ["sms"], p3: ["voice"] } },
  { id: "g_crit", name: "Critical alarms", desc: "Critical only, immediate response", enabled: true, shift: "247", win: ocWin("00:00-24:00"), minPriority: "critical", tiers: { p1: ["ov"], p2: ["sk"], p3: [] }, minUsers: { p1: 1, p2: 1, p3: 0 }, chan: { p1: ["sms", "voice", "uhf"], p2: ["sms", "uhf"], p3: ["voice"] } },
  { id: "g_night", name: "Night shift", desc: "After-hours coverage, high & critical", enabled: true, shift: "night", win: ocShift("night").win(), minPriority: "high", tiers: { p1: ["vt1"], p2: ["kgr"], p3: [] }, minUsers: { p1: 1, p2: 0, p3: 0 }, chan: { p1: ["sms", "uhf"], p2: ["voice"], p3: [] } },
];
function ocNormalize(g) {
  const c = Object.assign({ p1: ["sms", "uhf"], p2: ["sms"], p3: ["voice"] }, g.chan || {});
  return Object.assign({}, g, { chan: c });
}
function ocClone(g) { return JSON.parse(JSON.stringify(g)); }
function ocLoad() { try { const r = JSON.parse(localStorage.getItem(OC_LS)); if (r && Array.isArray(r.groups)) return Object.assign({}, r, { groups: r.groups.map(ocNormalize) }); } catch (e) {} return { groups: OC_SEED.map(ocClone), policy: { resendMin: 5, upscaleAfter: 3 } }; }

const oncallStore = {
  data: ocLoad(), subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); try { localStorage.setItem(OC_LS, JSON.stringify(this.data)); } catch (e) {} },
  get groups() { return this.data.groups; },
  get policy() { return this.data.policy; },
  upsert(g) { const gs = this.data.groups; const i = gs.findIndex((x) => x.id === g.id); this.data.groups = i >= 0 ? gs.map((x) => (x.id === g.id ? g : x)) : gs.concat([g]); this.emit(); },
  remove(id) { this.data.groups = this.data.groups.filter((x) => x.id !== id); this.emit(); },
  duplicate(id) { const g = this.data.groups.find((x) => x.id === id); if (!g) return; const c = ocClone(g); c.id = "g" + Date.now(); c.name = g.name + " (copy)"; this.data.groups = this.data.groups.concat([c]); this.emit(); },
  toggle(id) { this.data.groups = this.data.groups.map((x) => (x.id === id ? Object.assign({}, x, { enabled: !x.enabled }) : x)); this.emit(); },
  setAll(enabled) { this.data.groups = this.data.groups.map((x) => Object.assign({}, x, { enabled })); this.emit(); },
  addMember(id, tier, mid) { this.data.groups = this.data.groups.map((g) => { if (g.id !== id) return g; const t = Object.assign({}, g.tiers); t[tier] = (t[tier] || []).includes(mid) ? t[tier] : t[tier].concat([mid]); return Object.assign({}, g, { tiers: t }); }); this.emit(); },
  removeMember(id, tier, mid) { this.data.groups = this.data.groups.map((g) => { if (g.id !== id) return g; const t = Object.assign({}, g.tiers); t[tier] = (t[tier] || []).filter((x) => x !== mid); return Object.assign({}, g, { tiers: t }); }); this.emit(); },
  setPolicy(patch) { this.data.policy = Object.assign({}, this.data.policy, patch); this.emit(); },
};
function useOncall() { const [, force] = React.useReducer((x) => x + 1, 0); React.useEffect(() => oncallStore.sub(force), []); return oncallStore; }
// delivery verification (screens/oncall-delivery.jsx) reads the same groups/channels — never fork them
Object.assign(window, { oncallStore, OC_CHANNELS, ocRoster, ocMember });

// severity dot color
function ocPrioColor(id) { const s = (window.SEV && window.SEV[id]) || {}; return s.dot || s.color || "var(--slate-400)"; }

// ── member chip ──
function OcMemberChip({ m, onRemove }) {
  return (
    <span className="oc-chip">
      <Icon name={m.kind === "phone" ? "smartphone" : "user"} size={14} color="var(--slate-400)" />
      <span className="oc-chip-name">{m.name}</span>
      <button className="oc-chip-x" title="Remove" onClick={onRemove}><Icon name="x" size={14} /></button>
    </span>
  );
}

// ── add-member popover ──
function OcAddMenu({ used, onPick, onClose }) {
  const [q, setQ] = React.useState("");
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);
  const ql = q.trim().toLowerCase();
  const avail = ocRoster().filter((m) => !used.includes(m.id) && (!ql || m.name.toLowerCase().includes(ql)));
  const phones = avail.filter((m) => m.kind === "phone");
  const people = avail.filter((m) => m.kind === "person");
  return (
    <div className="oc-menu" ref={ref}>
      <div className="oc-menu-search"><Icon name="search" size={14} color="var(--slate-400)" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people & phones…" /></div>
      <div className="oc-menu-list">
        {phones.length > 0 && <div className="oc-menu-grp">Duty phones</div>}
        {phones.map((m) => <button key={m.id} className="oc-menu-item" onClick={() => onPick(m.id)}><Icon name="smartphone" size={14} color="var(--slate-400)" /> {m.name}</button>)}
        {people.length > 0 && <div className="oc-menu-grp">Personnel</div>}
        {people.map((m) => <button key={m.id} className="oc-menu-item" onClick={() => onPick(m.id)}><Icon name="user" size={14} color="var(--slate-400)" /> <span>{m.name}</span> <span className="oc-menu-role">{m.role}</span></button>)}
        {!avail.length && <NjInline>Everyone is already assigned.</NjInline>}
      </div>
    </div>
  );
}

// ── escalation tier column ──
function OcTier({ group, tier, n }) {
  const [open, setOpen] = React.useState(false);
  const ids = group.tiers[tier] || [];
  const need = (group.minUsers && group.minUsers[tier]) || 0;
  const short = ids.length < need;
  const chans = ocChan(group, tier);
  const chanOk = ocTierOk(group, tier);
  return (
    <div className="oncall-col">
      <div className="oc-tier-h">
        <span className="oc-tier-n">{n}</span>
        <span className="oncall-col-h">Priority {n}</span>
        {need > 0 && <span className={"oc-tier-min" + (short ? " short" : "")}>min {need}</span>}
      </div>
      <div className={"oc-chans" + (chanOk ? "" : " bad")} title={tier === "p1" ? "NS 9416: critical alarms must go out on two independent paths (GSM and UHF)" : "Channels used at this escalation step"}>
        {chans.length
          ? chans.map((c) => { const m = OC_CHANNELS.find((x) => x.id === c); return m ? <span key={c} className="oc-chan"><Icon name={m.icon} size={12} /> {m.label}</span> : null; })
          : <span className="oc-tier-empty">No channel</span>}
        {!chanOk && <span className="oc-chan-warn" title="Single path · NS 9416 requires two independent remote-alarm systems"><Icon name="alert-triangle" size={12} /> one path</span>}
      </div>
      <div className="oc-tier-body">
        {ids.map((id) => <OcMemberChip key={id} m={ocMember(id)} onRemove={() => oncallStore.removeMember(group.id, tier, id)} />)}
        {!ids.length && <span className="oc-tier-empty">No one assigned</span>}
      </div>
      <div className="oc-add-wrap">
        <button className="member-add" onClick={() => setOpen((o) => !o)}><Icon name="plus" size={14} /> Assign</button>
        {open && <OcAddMenu used={ids} onPick={(mid) => { oncallStore.addMember(group.id, tier, mid); setOpen(false); }} onClose={() => setOpen(false)} />}
      </div>
    </div>
  );
}

// ── group card ──
function OcGroupCard({ g }) {
  const prio = ocPrio(g.minPriority);
  return (
    <div className={"oncall-group" + (g.enabled ? "" : " oc-off")}>
      <div className="oncall-head">
        <button className={"oc-switch" + (g.enabled ? " on" : "")} role="switch" aria-checked={g.enabled} title={g.enabled ? "On-call active" : "Paused"} onClick={() => oncallStore.toggle(g.id)}><span className="oc-switch-knob" /></button>
        <div className="oc-head-main">
          <span className="name">{g.name}</span>
          <span className="caption">{g.desc}</span>
        </div>
        <span className="oc-cover" title="Alarms this group is paged for"><span className="oc-cover-dot" style={{ background: ocPrioColor(g.minPriority) }} /> {prio.covers}</span>
        <span className="sched"><Icon name="clock" size={12} color="var(--slate-400)" /> {ocSchedSummary(g)}</span>
        <div className="oc-head-actions">
          <button className="icon-btn" title="Send a test alarm to this group and see who receives it" onClick={() => window.njOpenTestDispatch && window.njOpenTestDispatch(g.id)}><Icon name="send" size={16} /></button>
          <button className="icon-btn" title="Edit group" onClick={() => openOnCallEditor(g)}><Icon name="pencil" size={16} /></button>
          <button className="icon-btn" title="Duplicate" onClick={() => oncallStore.duplicate(g.id)}><Icon name="copy" size={16} /></button>
          <button className="icon-btn" title="Delete" onClick={() => openDialog(<ConfirmDialog title="Delete on-call group" message={"Delete “" + g.name + "”?"} detail="Assigned personnel will no longer be paged for this coverage." confirmLabel="Delete" tone="danger" onConfirm={() => { oncallStore.remove(g.id); njToast(g.name + " deleted."); }} />)}><Icon name="trash-2" size={16} /></button>
        </div>
      </div>
      <div className="oncall-cols">
        <OcTier group={g} tier="p1" n={1} />
        <OcTier group={g} tier="p2" n={2} />
        <OcTier group={g} tier="p3" n={3} />
      </div>
      {!g.enabled && <div className="oc-paused-bar"><Icon name="pause" size={12} /> Paused, no notifications sent for this group</div>}
    </div>
  );
}

// ── group editor dialog ──
function OnCallEditorDialog({ group }) {
  const editing = !!group;
  const [g, setG] = React.useState(() => group ? ocClone(ocNormalize(group)) : { id: "g" + Date.now(), name: "", desc: "", enabled: true, shift: "247", win: ocWin("00:00-24:00"), minPriority: "critical", tiers: { p1: [], p2: [], p3: [] }, minUsers: { p1: 1, p2: 0, p3: 0 }, chan: { p1: ["sms", "uhf"], p2: ["sms"], p3: ["voice"] } });
  const set = (patch) => setG((s) => Object.assign({}, s, patch));
  const setWin = (day, val) => setG((s) => Object.assign({}, s, { win: Object.assign({}, s.win, { [day]: val }) }));
  const pickShift = (id) => { const sh = ocShift(id); set({ shift: id, win: id === "custom" ? (g.win || ocWin("00:00-24:00")) : sh.win() }); };
  const setMin = (tier, v) => setG((s) => Object.assign({}, s, { minUsers: Object.assign({}, s.minUsers, { [tier]: Math.max(tier === "p1" ? 1 : 0, v) }) }));
  const toggleChan = (tier, id) => setG((s) => {
    const cur = (s.chan && s.chan[tier]) || [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : cur.concat([id]);
    return Object.assign({}, s, { chan: Object.assign({}, s.chan, { [tier]: next }) });
  });
  const chanOk = ocTierOk(g, "p1");
  const canSave = g.name.trim().length > 0 && chanOk;
  const save = () => { if (!canSave) return; oncallStore.upsert(g); closeDialog(); njToast((editing ? "Updated " : "Created ") + g.name + "."); };
  return (
    <Dialog width={640}>
      <DlgHeader icon={editing ? "pencil" : "plus"} name={editing ? "Edit on-call group" : "New on-call group"} onClose={closeDialog} />
      <div className="dlg-body oc-editor">
        <div className="oc-ed-row">
          <label className="oc-field oc-grow"><span className="oc-field-l">Name</span>
            <input className="oos-input" autoFocus value={g.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Night shift" /></label>
          <label className="oc-field"><span className="oc-field-l">Covers</span>
            <select className="nj-select" value={g.minPriority} onChange={(e) => set({ minPriority: e.target.value })}>
              {OC_PRIOS.map((p) => <option key={p.id} value={p.id}>{p.label}+ · {p.covers}</option>)}
            </select></label>
        </div>
        <label className="oc-field"><span className="oc-field-l">Description <span className="note-opt">(optional)</span></span>
          <input className="oos-input" value={g.desc} onChange={(e) => set({ desc: e.target.value })} placeholder="What this coverage is for" /></label>

        <div className="oc-ed-sec">
          <span className="oc-field-l">On-call schedule</span>
          <div className="oc-shift-row">
            {OC_SHIFTS.map((s) => <button key={s.id} type="button" className={"oc-shift" + (g.shift === s.id ? " sel" : "")} onClick={() => pickShift(s.id)}>{s.label}</button>)}
          </div>
          {g.shift === "custom"
            ? <div className="oc-days">{OC_DAYS.map((d) => (
                <div className="oc-day" key={d}><span className="oc-day-l">{OC_DAY_LABEL[d]}</span>
                  <input className="oos-input oc-day-in" value={g.win[d]} onChange={(e) => setWin(d, e.target.value)} placeholder="off" /></div>
              ))}<p className="oc-days-hint">Format <code>HH:MM-HH:MM</code>. Leave blank for a day with no coverage. Example outside work hours: <code>00:00-07:00, 15:00-24:00</code>.</p></div>
            : <p className="oc-sched-note"><Icon name="clock" size={14} color="var(--slate-400)" /> {ocShift(g.shift).summary}</p>}
        </div>

        <div className="oc-ed-sec">
          <span className="oc-field-l">Minimum assigned personnel</span>
          <p className="oc-mininfo">Warn if an escalation tier has fewer people than required. Priority 1 always needs at least one.</p>
          <div className="oc-min-row">
            {["p1", "p2", "p3"].map((t, i) => (
              <div className="oc-min" key={t}>
                <span className="oc-min-l">Priority {i + 1}</span>
                <Stepper value={g.minUsers[t]} step={1} min={t === "p1" ? 1 : 0} max={9} onChange={(v) => setMin(t, v)} />
              </div>
            ))}
          </div>
        </div>
        <div className="oc-ed-sec">
          <span className="oc-field-l">Notification channels</span>
          <p className="oc-mininfo">NS 9416 requires <b>two independent remote-alarm systems</b> where the facility is not staffed around the clock. SMS and voice both ride the GSM dispatcher, so they count as one path; pair either with UHF.</p>
          <div className="oc-chan-grid">
            {["p1", "p2", "p3"].map((t, i) => {
              const list = ocChan(g, t);
              const paths = ocPaths(list).size;
              return (
                <div className="oc-chan-row" key={t}>
                  <span className="oc-min-l">Priority {i + 1}</span>
                  <div className="oc-chan-btns">
                    {OC_CHANNELS.map((c) => (
                      <button key={c.id} type="button" className={"oc-chan-btn" + (list.includes(c.id) ? " on" : "")}
                        aria-pressed={list.includes(c.id)} onClick={() => toggleChan(t, c.id)}>
                        <Icon name={c.icon} size={14} /> {c.label}
                      </button>
                    ))}
                  </div>
                  <span className={"oc-chan-paths" + (t === "p1" && paths < 2 ? " bad" : "")}>{paths} path{paths === 1 ? "" : "s"}</span>
                </div>
              );
            })}
          </div>
          {!chanOk && <p className="oc-chan-rule"><Icon name="alert-triangle" size={14} color="var(--critical-text)" /> Priority 1 carries the critical alarms and needs two independent paths. Add UHF, or a GSM channel alongside it, before saving.</p>}
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><Icon name="users" size={14} /> Assign people on the group card after saving</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={save}><Icon name="check" size={16} /> {editing ? "Save" : "Create"}</button>
        </div>
      </div>
    </Dialog>
  );
}
function openOnCallEditor(group) { openDialog(<OnCallEditorDialog group={group} />); }

// ── alarm dispatch (GSM modem) status ──
function ocModemSeries(dayOffset) {
  // deterministic dBm signal (0 = strongest, -100 = no signal) across 24h
  const pts = []; const base = -72 - (dayOffset % 3) * 3;
  for (let i = 0; i <= 48; i++) { const s = Math.sin(i / 6 + dayOffset) * 4 + Math.sin(i / 2.3) * 2.5; pts.push(Math.max(-96, Math.min(-58, Math.round(base + s)))); }
  return pts;
}
function ModemStatusDialog() {
  const [day, setDay] = React.useState(0);
  const [show, setShow] = React.useState({ m1: true, m2: true });
  const W = 640, H = 300, padL = 40, padR = 16, padT = 14, padB = 26, min = -100, max = 0;
  const s1 = ocModemSeries(day), s2 = ocModemSeries(day + 7).map((v) => v - 6);
  const x = (i) => padL + (i / 48) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const path = (arr) => arr.map((v, i) => (i === 0 ? "M" : "L") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  const dt = new Date(window.NJ_NOW || Date.now()); dt.setDate(dt.getDate() - day); dt.setHours(0, 0, 0, 0);
  const dateLabel = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const cur1 = s1[s1.length - 1], cur2 = s2[s2.length - 1];
  const yTicks = [0, -20, -40, -60, -80, -100];
  const xTicks = [0, 12, 24, 36, 48];
  return (
    <Dialog width={720}>
      <DlgHeader icon="radio-tower" name="Alarm dispatch status" onClose={closeDialog} />
      <div className="dlg-body oc-modem">
        <p className="oc-modem-intro">Remote alarms leave the facility on <b>two independent paths</b>, as NS 9416 requires where there is no round-the-clock on-site presence: the GSM dispatcher (SMS and voice call) and the UHF sender. A path is only redundant while the other one is healthy, so watch both like any other critical asset.</p>
        <div className="oc-modem-cards">
          <div className="oc-modem-card"><div className="oc-modem-top"><span className="statusdot" style={{ background: "var(--success)" }} /> GSM modem 1 · Connected</div><span className="oc-modem-sig data">{cur1} <span className="u">dBm</span></span><span className="caption">SIM · Telenor NO · signal good</span></div>
          <div className="oc-modem-card"><div className="oc-modem-top"><span className="statusdot" style={{ background: "var(--success)" }} /> GSM modem 2 · Standby</div><span className="oc-modem-sig data">{cur2} <span className="u">dBm</span></span><span className="caption">SIM · Telia NO · failover ready</span></div>
          <div className="oc-modem-card"><div className="oc-modem-top"><span className="statusdot" style={{ background: "var(--success)" }} /> UHF sender · Online</div><span className="oc-modem-sig data">169.4 <span className="u">MHz</span></span><span className="caption">Second independent path · last test 14 Jun, ok</span></div>
        </div>
        <div className="oc-modem-chart-head">
          <span className="eyebrow">Signal strength · 24h</span>
          <div className="oc-modem-nav">
            <button className="an-nav" onClick={() => setDay((d) => d + 1)} title="Previous day"><Icon name="chevron-left" size={16} /></button>
            <span className="oc-modem-date data">{dateLabel}</span>
            <button className="an-nav" onClick={() => setDay((d) => Math.max(0, d - 1))} disabled={day === 0} title="Next day"><Icon name="chevron-right" size={16} /></button>
          </div>
        </div>
        <svg className="oc-modem-svg" viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none">
          {yTicks.map((v) => <g key={v}><line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--slate-200)" strokeWidth="1" strokeDasharray="3 4" /><text x={padL - 6} y={y(v) + 3} textAnchor="end" className="oc-modem-axl">{v}</text></g>)}
          {xTicks.map((i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="oc-modem-axl">{String(Math.round(i / 2)).padStart(2, "0")}:00</text>)}
          {show.m2 && <path d={path(s2)} fill="none" stroke="var(--slate-400)" strokeWidth="1.6" strokeLinejoin="round" />}
          {show.m1 && <path d={path(s1)} fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinejoin="round" />}
        </svg>
        <div className="oc-modem-legend">
          <label className="oc-leg" {...njCheckable(() => setShow((s) => Object.assign({}, s, { m1: !s.m1 })), { on: show.m1, label: "Modem 1" })}><Check on={show.m1} /> <span className="oc-leg-sw" style={{ background: "var(--primary)" }} /> Modem 1</label>
          <label className="oc-leg" {...njCheckable(() => setShow((s) => Object.assign({}, s, { m2: !s.m2 })), { on: show.m2, label: "Modem 2" })}><Check on={show.m2} /> <span className="oc-leg-sw" style={{ background: "var(--slate-400)" }} /> Modem 2</label>
        </div>
      </div>
      <div className="dlg-foot dlg-foot-split">
        <span className="dlg-foot-meta"><Icon name="info" size={14} /> −60 dBm strong · −85 dBm marginal · below −95 dBm unreliable</span>
        <div className="dlg-foot-btns">
          <button className="linkbtn" onClick={() => { closeDialog(); window.njOpenDeliveryLog && window.njOpenDeliveryLog(); }}>Delivery log <Icon name="arrow-up-right" size={14} /></button>
          <button className="btn btn-secondary" onClick={closeDialog}>Close</button>
        </div>
      </div>
    </Dialog>
  );
}
function openModemStatus() { openDialog(<ModemStatusDialog />); }

function OnCallTab() {
  const store = useOncall();
  const groups = store.groups;
  const policy = store.policy;
  const allOff = groups.every((g) => !g.enabled);
  return (
    <React.Fragment>
      <div className="oc-toolbar">
        <div className="oc-policy">
          <button className="oc-policy-item" onClick={() => njEditParam({ tag: "OC-RESEND", label: "Resend every", value: policy.resendMin, unit: "min", min: 1, max: 60, step: 1, group: "On-call", onApply: (v) => oncallStore.setPolicy({ resendMin: v }) })}>
            <Icon name="repeat" size={16} color="var(--slate-500)" />
            <span className="oc-policy-l">Resend every</span>
            <span className="oc-policy-v data">{policy.resendMin} <span className="u">min</span></span>
          </button>
          <button className="oc-policy-item" onClick={() => njEditParam({ tag: "OC-UPSCALE", label: "Upscale priority after", value: policy.upscaleAfter, unit: "tries", min: 1, max: 10, step: 1, group: "On-call", onApply: (v) => oncallStore.setPolicy({ upscaleAfter: v }) })}>
            <Icon name="chevrons-up" size={16} color="var(--slate-500)" />
            <span className="oc-policy-l">Upscale after</span>
            <span className="oc-policy-v data">{policy.upscaleAfter} <span className="u">tries</span></span>
          </button>
        </div>
        <div className="oc-toolbar-r">
          <button className="modem-pill oc-modem-btn" onClick={openModemStatus} title="Alarm dispatch (GSM modem) status">
            <span className="statusdot" style={{ background: "var(--success)" }} /> Dispatch online
            <Icon name="chevron-right" size={14} color="var(--success-text)" />
          </button>
          <button className="btn btn-secondary" onClick={() => oncallStore.setAll(!allOff)}><Icon name={allOff ? "bell-ring" : "bell-off"} size={16} /> {allOff ? "Enable all" : "Disable all"}</button>
          <button className="btn btn-primary" onClick={() => openOnCallEditor(null)}><Icon name="plus" size={16} /> New group</button>
        </div>
      </div>

      <div className="card">
        <div className="oncall-legend">
          <span className="oncall-legend-l">Alarm Group</span>
          <span className="oncall-legend-cols">Escalation: Priority 1 → 2 → 3 (paged in order until acknowledged) · two independent paths on Priority 1</span>
        </div>
        <div className="card-body oc-groups">
          {groups.length
            ? groups.map((g) => <OcGroupCard key={g.id} g={g} />)
            : <NjEmpty size="card" icon="phone-off" title="No on-call groups yet"
                body="A group defines who is alerted, in what order, and on which channel when an alarm escalates."
                action={<button className="btn btn-primary btn-sm" onClick={() => openOnCallEditor(null)}><Icon name="plus" size={14} /> New group</button>} />}
        </div>
      </div>

      {window.DeliveryVerificationCard && <window.DeliveryVerificationCard />}
    </React.Fragment>
  );
}

// ---- General + Project ----

// ---- Appearance / Theme ----
const THEMES = [
  { id: "light", name: "Light", desc: "Default bright operations console" },
  { id: "dark", name: "Dark", desc: "Low-light control room" },
  { id: "legacy", name: "Legacy", desc: "Classic NJORD control-room styling" },
];

function ThemePreview({ id }) {
  // self-contained mini chrome that always renders its own theme (independent of active)
  return (
    <span className={"theme-prev tp-" + id} aria-hidden="true">
      <span className="tp-side">
        <span className="tp-logo" />
        <span className="tp-nav on" /><span className="tp-nav" /><span className="tp-nav" />
      </span>
      <span className="tp-main">
        <span className="tp-bar" />
        <span className="tp-cards"><span className="tp-card" /><span className="tp-card" /></span>
        <span className="tp-block" />
      </span>
    </span>
  );
}

function DisplayRow({ label, desc, options, value, onChange }) {
  return (
    <div className="set-row">
      <div className="set-row-l"><span className="set-row-name">{label}</span><span className="set-row-desc">{desc}</span></div>
      <div className="segmented">
        {options.map(([v, l]) => <button key={v} className={"seg" + (v === value ? " active" : "")} aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>)}
      </div>
    </div>
  );
}

function AppearanceCard() {
  const theme = useTheme();
  const compact = window.useDensity ? window.useDensity() : false;
  const tsize = window.useTextSize ? window.useTextSize() : "normal";
  return (
    <div className="card" style={{ gridColumn: "1 / -1" }}>
      <div className="card-head">
        <div className="card-head-l"><Icon name="palette" size={16} color="var(--slate-600)" /><span className="card-title">Appearance</span></div>
        <span className="caption">Applies across the whole interface · saved on this device</span>
      </div>
      <div className="card-body">
        <span className="eyebrow" style={{ display: "block", marginBottom: 12 }}>Theme</span>
        <div className="theme-grid">
          {THEMES.map((t) => {
            const sel = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={"theme-tile" + (sel ? " sel" : "") + (t.soon ? " soon" : "")}
                aria-pressed={sel}
                disabled={t.soon}
                onClick={() => { if (!t.soon) njSetTheme(t.id); }}
              >
                <ThemePreview id={t.id} />
                <span className="theme-tile-meta">
                  <span className="theme-tile-name">
                    {t.name}
                    {t.soon && <span className="theme-soon">SOON</span>}
                  </span>
                  <span className="theme-tile-desc">{t.desc}</span>
                </span>
                <span className={"theme-radio" + (sel ? " on" : "")}>{sel && <Icon name="check" size={12} strokeWidth={3} />}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="set-form" style={{ borderTop: "1px solid var(--border)" }}>
        <DisplayRow label="Table density" desc="Row height in registers and lists"
          options={[["comfortable", "Comfortable"], ["compact", "Compact"]]}
          value={compact ? "compact" : "comfortable"}
          onChange={(v) => window.densityStore && window.densityStore.set(v === "compact")} />
        <DisplayRow label="Text size" desc="Scales values, labels and tables in the working area"
          options={[["normal", "Normal"], ["large", "Large"], ["xlarge", "Extra large"]]}
          value={tsize}
          onChange={(v) => window.textSizeStore && window.textSizeStore.set(v)} />
      </div>
    </div>
  );
}

// ---- Alarm performance targets (ch. 11) ----
// The philosophy asks for target values against which alarm-system performance is measured, and
// names exactly one: a flood is more than 10 alarms in 10 minutes. The rest are left for the site
// to set here — unset means Statistics reports the metric and grades nothing, which is honest.
const AT_ROWS = [
  { key: "perDay", name: "Average alarm rate", desc: "Alarms annunciated per operator, per day", unit: "alarms/day", max: 500, hint: "IEC 62682 guidance: ~150/day acceptable, 300 over-demanding" },
  { key: "peak10", name: "Peak load", desc: "Highest 10-minute count before the shift is over-loaded", unit: "/ 10 min", max: 60, hint: "" },
  { key: "flood10", name: "Flood threshold", desc: "Alarms in 10 minutes that constitute an alarm flood", unit: "/ 10 min", max: 60, hint: "Site alarm philosophy · ch. 11" },
  { key: "ackMin", name: "Acknowledge response", desc: "Mean time from annunciation to acknowledge", unit: "min", max: 240, hint: "" },
];
function AlarmTargetsCard() {
  const t = useAlarmTargets();
  const ref = React.useRef(null);
  // arriving from Statistics · "Set targets": bring the card into view and mark it once
  React.useEffect(() => {
    if (window.__njSettingsFocus !== "targets") return;
    window.__njSettingsFocus = null;
    const el = ref.current, sc = document.querySelector(".content");
    if (el && sc) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12;
    if (!el) return;
    el.classList.add("at-flash");
    const id = setTimeout(() => el.classList.remove("at-flash"), 1800);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="card" ref={ref} style={{ gridColumn: "1 / -1" }}>
      <div className="card-head">
        <div className="card-head-l"><Icon name="target" size={16} color="var(--slate-600)" /><span className="card-title">Alarm Performance Targets</span></div>
        <span className="caption">Used to grade Alarms · Statistics · unset metrics are reported, not graded</span>
      </div>
      <div className="set-form">
        {AT_ROWS.map((r) => {
          const v = t[r.key];
          return (
            <div className="set-row" key={r.key}>
              <div className="set-row-l"><span className="set-row-name">{r.name}</span><span className="set-row-desc">{r.desc}{r.hint ? " · " + r.hint : ""}</span></div>
              <span className="at-ctrl">
                <button className={"at-val" + (v == null ? " unset" : "")} onClick={() => njEditParam({
                  tag: "TARGET-" + r.key.toUpperCase(), label: r.name, value: v == null ? (r.key === "flood10" ? 10 : 0) : v,
                  unit: r.unit, min: 0, max: r.max, step: 1, group: "Alarm performance",
                  onApply: (nv) => njAlarmTargets.set({ [r.key]: nv }),
                })}>{v == null ? "Not set" : <React.Fragment><span className="data">{v}</span> <span className="u">{r.unit}</span></React.Fragment>}</button>
                {v != null && r.key !== "flood10" && <button className="linkbtn" onClick={() => njAlarmTargets.set({ [r.key]: null })}>Clear</button>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function njOpenAlarmTargets() { window.__njSettingsFocus = "targets"; if (window.__njNavigate) window.__njNavigate("settings"); }
Object.assign(window, { njOpenAlarmTargets });

function GeneralTab() {
  const [idle, setIdle] = React.useState(() => { try { return localStorage.getItem("nj_idle_logout_min") || "20"; } catch (e) { return "20"; } });
  const setIdleVal = (v) => { setIdle(v); try { localStorage.setItem("nj_idle_logout_min", v); } catch (e) {} };
  return (
    <div className="set-grid">
      <AppearanceCard />
      <AlarmTargetsCard />
      <div className="card">
        <div className="card-head"><span className="card-title">General Settings</span></div>
        <div className="set-form">
          <div className="set-row">
            <div className="set-row-l"><span className="set-row-name">Display language</span><span className="set-row-desc">Interface & report language</span></div>
            <span className="select">English <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
          </div>
          <div className="set-row">
            <div className="set-row-l"><span className="set-row-name">Show tags & description</span><span className="set-row-desc">Equipment label display mode</span></div>
            <span className="select">Tag / description <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><span className="card-title">Project Settings</span></div>
        <div className="set-form">
          <div className="set-row">
            <div className="set-row-l"><span className="set-row-name">Inactivity logout</span><span className="set-row-desc">Auto sign-out after idle</span></div>
            <span className="set-num"><input type="number" min="1" max="120" value={idle} onChange={(e) => setIdleVal(e.target.value)} onBlur={() => { const n = Math.min(120, Math.max(1, parseInt(idle, 10) || 20)); setIdleVal(String(n)); }} /> <span className="u">min</span></span>
          </div>
          <div className="set-row">
            <div className="set-row-l"><span className="set-row-name">Default landing page</span><span className="set-row-desc">Screen shown after login</span></div>
            <span className="select">Dashboard <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsScreen() {
  const [tab, setTab] = React.useState("General");
  const crumb = { General: "General", Users: "User administration", Roles: "Roles & permissions", "On-call": "On-call duty" }[tab] || tab;
  return (
    <AppShell active="settings" title="Settings" crumbs={[crumb]} statusLevel="ok" scope="facility">
      <div className="pagehead">
        <div className="pagehead-row">
          <div>
            <p className="pagehead-sub">Users, roles, on-call &amp; project configuration</p>
          </div>
          <div className="pagehead-right"><SetTabs active={tab} onChange={setTab} /></div>
        </div>
      </div>
      {tab === "Users" && <UsersTab />}
      {tab === "Roles" && <RolesTab />}
      {tab === "On-call" && <OnCallTab />}
      {tab === "General" && <GeneralTab />}
    </AppShell>
  );
}

window.SettingsScreen = SettingsScreen;
