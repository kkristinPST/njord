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
  { u: "lum", first: "Lucy", last: "Martin", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", email: "lum@puresalmontech.com", contact: "sms", notif: "SMS" },
  { u: "jro", first: "Jeanne", last: "Rousseau", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", contact: "sms", notif: "SMS" },
  { u: "kca", first: "Karen", last: "Carter", roles: ["Operator"], phone: "47 xxx xxx", contact: "sms", notif: "SMS" },
  { u: "elel", first: "Elliot", last: "Ellis", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", email: "elel@puresalmontech.com", contact: "voice", notif: "Voice call" },
  { u: "kgr", first: "Kevin", last: "Garrett", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", contact: "sms", notif: "SMS" },
  { u: "csw", first: "Clemens", last: "Schwarz", roles: ["Operator", "Supervisor"], phone: "—", contact: null, notif: "—" },
  { u: "ov", first: "Olaf", last: "Vink", roles: ["Operator", "Supervisor", "Testmodul"], phone: "47 xxx xxx", email: "ov@puresalmontech.com", contact: "sms", notif: "SMS" },
  { u: "sk", first: "Sam", last: "King", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", contact: "voice", notif: "Voice call" },
  { u: "jlo", first: "Joe", last: "Lawrence", roles: ["Operator", "Supervisor"], phone: "47 xxx xxx", email: "jlo@puresalmontech.com", contact: "email", notif: "Email" },
];

function UserDialog({ user, existing, onSave }) {
  const editing = !!user;
  const [f, setF] = React.useState(() => ({
    u: user ? user.u : "", first: user ? user.first : "", last: user ? user.last : "",
    roles: new Set(user ? user.roles : ["Operator"]), phone: user && user.phone !== "—" ? user.phone : "",
    email: user && user.email ? user.email : "",
    contact: user ? ocUserVia(user) || "" : "sms",
  }));
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleRole = (r) => setF((s) => { const n = new Set(s.roles); n.has(r) ? n.delete(r) : n.add(r); return { ...s, roles: n }; });
  const uTrim = f.u.trim().toLowerCase();
  const dupU = !editing && existing.some((x) => x.u.toLowerCase() === uTrim);
  const emailTrim = f.email.trim();
  const emailOk = !emailTrim || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTrim);
  // ONE preferred contact per person. It needs the matching detail: SMS / voice need a phone,
  // email needs an address. No contact = not listed in any on-call picker.
  const needPhone = (f.contact === "sms" || f.contact === "voice") && !f.phone.trim();
  const needEmail = f.contact === "email" && !emailTrim;
  const valid = uTrim && f.first.trim() && f.last.trim() && f.roles.size > 0 && !dupU && emailOk && !needPhone && !needEmail;
  const roleOptions = ["Operator", "Supervisor", "Testmodul", "StatusViewer"];
  // the one way an assigned person could end up with no contact: taken off every list on save
  const paged = editing && window.njPagedFor ? window.njPagedFor(user.u) : [];
  const dropsOff = editing && !f.contact && paged.length > 0;
  const save = () => {
    const meta = ocContactMeta(f.contact);
    onSave({ u: uTrim, first: f.first.trim(), last: f.last.trim(), roles: [...f.roles], phone: f.phone.trim() || "—", email: emailTrim, contact: f.contact || null, notif: meta ? meta.label : "—" }, editing);
    if (dropsOff && window.oncallStore) { window.oncallStore.purgeMember(user.u); if (window.njOcLog) window.njOcLog.add(user.first + " " + user.last + " taken off on-call", "No contact on the account"); }
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
        <DeField label="Email" hint="For email alarms and account recovery">
          <input className="de-input" type="email" placeholder="name@puresalmontech.com" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </DeField>
        {emailTrim && !emailOk && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>Enter a valid email address.</div>}
        <DeField label="Phone"><input className="de-input" placeholder="47 xxx xxx" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></DeField>
        <DeField label="On-call contact" hint="How alarms reach this person on every on-call list. Without one they are not listed for on-call.">
          <div className="segmented">
            {OC_CONTACTS.concat([{ id: "", label: "None", icon: "minus" }]).map((c) => <button key={c.id || "none"} type="button" className={"seg" + (f.contact === c.id ? " active" : "")} aria-pressed={f.contact === c.id} onClick={() => set("contact", c.id)}><Icon name={c.icon} size={14} /> {c.label}</button>)}
          </div>
        </DeField>
        {needPhone && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>Add a phone number for {ocContactMeta(f.contact).label.toLowerCase()}.</div>}
        {needEmail && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>Add an email address for email alarms.</div>}
        {dropsOff && <div className="de-field-hint" style={{ color: "var(--warning-text)" }}>On {paged.length} on-call {paged.length === 1 ? "list" : "lists"} ({paged.map((x) => x.g.name).join(", ")}). Without a contact they come off {paged.length === 1 ? "it" : "them"} when you save.</div>}
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
  // USERS is the facility roster that On-call reads through ocRoster(); UsersTab's state is a
  // VIEW of it. Mutating the module array in place is what keeps a newly created person
  // appearing in the Assign picker and a removed one disappearing from it — without it the two
  // tabs quietly disagree about who works here.
  const syncUsers = (next) => { USERS.length = 0; next.forEach((x) => USERS.push(x)); return next; };
  const removeUser = (u) => {
    setUsers((s) => syncUsers(s.filter((x) => x.u !== u.u)));
    if (window.oncallStore) window.oncallStore.purgeMember(u.u);
    if (window.shiftStore) window.shiftStore.assign(u.u, null);
    njToast(u.first + " " + u.last + " removed.");
  };
  const saveUser = (data, editing) => {
    if (editing) { setUsers((s) => syncUsers(s.map((x) => (x.u === data.u ? data : x)))); njToast(data.first + " " + data.last + " updated."); }
    else { setUsers((s) => syncUsers([...s, data])); njToast(data.first + " " + data.last + " added to this facility."); }
  };
  const setActive = (u, active) => {
    setUsers((s) => syncUsers(s.map((x) => (x.u === u.u ? Object.assign({}, x, { status: active ? "active" : "inactive" }) : x))));
    if (!active) {
      if (window.oncallStore) window.oncallStore.purgeMember(u.u);
      if (window.shiftStore) window.shiftStore.assign(u.u, null);
    }
    if (window.njOcLog) window.njOcLog.add((active ? "Reactivated " : "Deactivated ") + u.first + " " + u.last, active ? "" : "Removed from every on-call group and shift");
    njToast(u.first + " " + u.last + (active ? " reactivated." : " deactivated."));
  };
  const openAdd = () => openDialog(<UserDialog existing={users} onSave={saveUser} />);
  const openEdit = (u) => openDialog(<UserDialog user={u} existing={users} onSave={saveUser} />);
  return (
    <div className="card">
      <div className="filterbar">
        <div className="field usr-search" style={{ minWidth: 280 }}>
          <Icon name="search" size={16} color="var(--slate-400)" />
          <input placeholder="Filter user, name, role…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="ocr-search-x" title="Clear" aria-label="Clear search" onClick={() => setQ("")}><Icon name="x" size={14} /></button>}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn-primary" onClick={openAdd}><Icon name="user-plus" size={16} /> New user</button>
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr><th>Username</th><th>Name</th><th>Roles</th><th>Phone</th><th>On-call contact</th><th>On-call</th><th style={{ width: 80 }}></th></tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.u} className={u.status === "inactive" ? "usr-row-off" : undefined}>
              <td><span className="tag">{u.u}</span></td>
              <td className="td-strong">{u.first} {u.last}{u.status === "inactive" && <span className="usr-off-badge">Inactive</span>}</td>
              <td>
                <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                  {u.roles.map((r) => <span key={r} className="badge" style={{ background: "var(--info-bg)", color: "var(--info-text)" }}>{r}</span>)}
                </span>
              </td>
              <td><span className="data">{u.phone}</span></td>
              <td>{(() => { const c = ocUserContact(u), m = c && ocContactMeta(c.via); return m ? <span className="small usr-contact"><Icon name={m.icon} size={14} color="var(--slate-400)" /> {m.label}</span> : <span className="usr-oncall-none">None · not listed</span>; })()}</td>
              {/* Users owned the contact details and On-call owned who gets paged, and neither
                  showed the other — so an admin could edit a person with no idea they were the
                  only one a critical group would reach. Derived, never a second model. */}
              <td>
                {(() => {
                  const paged = window.njPagedFor ? window.njPagedFor(u.u) : [];
                  const sole = window.njSoleFirstLine ? window.njSoleFirstLine(u.u) : [];
                  if (!paged.length) return <span className="usr-oncall-none">Not on call</span>;
                  return (
                    <span className="usr-oncall">
                      {window.ShiftBadge && <window.ShiftBadge id={u.u} />}
                      <span className="usr-oncall-n" title={paged.map((x) => "P" + x.n + " · " + x.g.name).join("\n")}>{paged.length} {paged.length === 1 ? "group" : "groups"}</span>
                      {sole.length > 0 && <span className="oc-unreach" title={"Only Priority 1 recipient on: " + sole.map((g) => g.name).join(", ")}><Icon name="alert-triangle" size={11} /> only P1</span>}
                    </span>
                  );
                })()}
              </td>
              <td>
                <span className="row-actions">
                  <button className="icon-btn" title={"Edit " + u.first} onClick={() => openEdit(u)}><Icon name="pencil" size={16} /></button>
                  {/* Deactivate, not delete, is the normal end of an account: someone who left
                      must stop being paged while their name stays readable in every log that
                      already records it. Delete stays for accounts created in error. */}
                  {u.status === "inactive"
                    ? <button className="icon-btn" title={"Reactivate " + u.first} onClick={() => setActive(u, true)}><Icon name="user-check" size={16} /></button>
                    : <button className="icon-btn" title={"Deactivate " + u.first} onClick={() => { const sole = window.njSoleFirstLine ? window.njSoleFirstLine(u.u) : []; openDialog(<ConfirmDialog title="Deactivate user" message={"Deactivate " + u.first + " " + u.last + "?"} detail={"They keep their history but lose access, and are removed from every on-call group and the duty roster." + (sole.length ? " They are the ONLY Priority 1 recipient on " + sole.map((g) => "“" + g.name + "”").join(" and ") + ", which would then page nobody." : "")} confirmLabel="Deactivate" tone="danger" icon="alert-triangle" onConfirm={() => setActive(u, false)} />); }}><Icon name="user-x" size={16} /></button>}
                  <button className="icon-btn" title={"Remove " + u.first} onClick={() => { const sole = window.njSoleFirstLine ? window.njSoleFirstLine(u.u) : []; openDialog(<ConfirmDialog title="Remove user" message={"Remove " + u.first + " " + u.last + "?"} detail={"Their account (" + u.u + ") loses access immediately. This cannot be undone." + (sole.length ? " They are the ONLY Priority 1 recipient on " + sole.map((g) => "“" + g.name + "”").join(" and ") + " — removing them leaves " + (sole.length === 1 ? "that group" : "those groups") + " paging nobody." : "")} confirmLabel="Remove" tone="danger" onConfirm={() => removeUser(u)} />); }}><Icon name="trash-2" size={16} /></button>
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
  "NJORD": ["Change Parameters", "Control Equipment", "Create & Edit Notes", "Change Alarm Limits", "Acknowledge Alarms", "Block Alarms", "Deactivate Alarms", "Manage Alarm Properties", "Manage Alarm Groups", "Manage Test Alarms", "Manage Alarm Sender"],
  "Fish Feeding": ["Adjust Feed Rate", "Edit Feed Curves", "Pause / Resume Feeding", "Manage Feeders", "Edit Feed Settings"],
  "Fish Biology": ["Register Welfare Scoring", "Register Mortality", "Manage Batches", "Generate Welfare Reports"],
  "Analytics": ["View Trends", "Create & Save Trend Views", "Export Trend Data", "Configure Dashboards"],
  // the two permissions the on-call screens actually enforce. Default: Supervisor only.
  "On-call": ["Change Priority 3", "Pause & Resume Groups"],
};
// Role permissions, persisted. Everything defaults to Allow except the On-call module, which is
// Supervisor-only until a role is set otherwise.
// SESSION ROLE (demo): the app has no login yet. A role's "Use for my session" switch makes the
// current user act as that role everywhere, so both permission levels can be shown. Off = the
// user's own roles (USERS[0]).
const PERM_LS = "nj_role_perms_v1", SESS_LS = "nj_session_role_v1";
const njPerms = {
  data: (function () { try { return JSON.parse(localStorage.getItem(PERM_LS)) || {}; } catch (e) { return {}; } })(),
  session: (function () { try { return localStorage.getItem(SESS_LS) || null; } catch (e) { return null; } })(),
  subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { try { localStorage.setItem(PERM_LS, JSON.stringify(this.data)); if (this.session) localStorage.setItem(SESS_LS, this.session); else localStorage.removeItem(SESS_LS); } catch (e) {} this.subs.forEach((f) => f()); if (window.oncallStore) window.oncallStore.subs.forEach((f) => f()); },
  get(role, m, p) { const k = role + "|" + m + "|" + p; if (k in this.data) return this.data[k]; return m === "On-call" && role !== "Supervisor" ? "deny" : "allow"; },
  set(role, m, p, v) { this.data = Object.assign({}, this.data, { [role + "|" + m + "|" + p]: v }); this.emit(); },
  copy(from, to) { const n = Object.assign({}, this.data); Object.keys(PERM_MODULES).forEach((m) => PERM_MODULES[m].forEach((p) => { n[to + "|" + m + "|" + p] = this.get(from, m, p); })); this.data = n; this.emit(); },
  setSession(role) { this.session = role || null; if (window.njOcLog) window.njOcLog.add(role ? "Session role set to " + role : "Session role reset", "Demo: permissions follow " + (role || "the account's own roles")); this.emit(); },
};
function usePerms() { const [, f] = React.useReducer((x) => x + 1, 0); React.useEffect(() => njPerms.sub(f), []); return njPerms; }
function njCan(m, p) { return njSessionRoles().some((r) => njPerms.get(r, m, p) === "allow"); }

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
  const [mod, setMod] = React.useState("NJORD");
  const perms = usePerms();
  const get = (m, p) => perms.get(role, m, p);
  const set = (m, p, v) => perms.set(role, m, p, v);
  const mods = Object.keys(PERM_MODULES);
  const sessOn = perms.session === role;
  const createRole = (nm, base, desc) => {
    setRoles((rs) => [...rs, { name: nm, users: 0, desc: desc || (base ? "Based on " + base : "Custom role") }]);
    if (base) perms.copy(base, nm);
    setRole(nm); setMod("NJORD");
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
          <div className="role-head-r">
            <span className="role-sess" title="Demo only. The app has no login yet: this makes you act as this role on every screen, so both permission levels can be shown.">
              <button className={"oc-switch" + (sessOn ? " on" : "")} role="switch" aria-checked={sessOn} aria-label="Use this role for my session" onClick={() => { perms.setSession(sessOn ? null : role); njToast(sessOn ? "Session role reset. You act with your own roles." : "You now act as " + role + " on every screen."); }}><span className="oc-switch-knob" /></button>
              Use for my session
            </span>
            <button className="btn btn-primary" style={{ padding: "6px 14px" }} onClick={() => njToast(role + " role permissions saved.")}><Icon name="check" size={16} /> Save</button>
          </div>
        </div>
        {perms.session && <div className="role-sess-bar"><Icon name="user-cog" size={14} /> Demo session: you act as <b>{perms.session}</b> on every screen.<button className="linkbtn" onClick={() => perms.setSession(null)}>Reset</button></div>}
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
// CONTACT is per recipient, not per escalation level: each person (and each duty phone) has ONE
// preferred way to be reached. UHF is not a person's channel at all — it is the site's sender,
// configured once for the whole system (Site channels). A recipient with no usable contact is
// simply not listed in any picker, so there is no "unreachable" state to show on a list.
const OC_CONTACTS = [
  { id: "sms", label: "SMS", icon: "message-square" },
  { id: "voice", label: "Voice call", icon: "phone" },
  { id: "email", label: "Email", icon: "mail" },
];
function ocContactMeta(id) { return OC_CONTACTS.find((c) => c.id === id) || null; }
// accounts saved before `contact` existed still carry the old notif string
function ocUserVia(u) { if (!u) return null; if (u.contact !== undefined) return u.contact; return /SMS/.test(u.notif || "") ? "sms" : /Email/.test(u.notif || "") ? "email" : null; }
function ocUserContact(u) {
  const via = ocUserVia(u); if (!via) return null;
  const phone = u.phone && u.phone !== "—" ? u.phone : "";
  if ((via === "sms" || via === "voice") && phone) return { via: via, to: phone };
  if (via === "email" && u.email) return { via: via, to: u.email };
  return null;
}
// duty phones are SITE configuration: some sites have one, some two. A phone without a number
// is not listed. Read live from the store so Site channels edits show up everywhere.
const OC_PHONE_SEED = [
  { id: "vt1", name: "Duty phone 1", number: "+47 900 10 001", via: "sms" },
  { id: "vt2", name: "Duty phone 2", number: "+47 900 10 002", via: "sms" },
];
function ocSite() { return (window.oncallStore && window.oncallStore.site) || ocSiteDefault(); }
function ocSiteDefault() { return { phones: OC_PHONE_SEED.map((p) => Object.assign({}, p)), uhf: { on: true, minPriority: "critical" }, rule247: true }; }
function ocContactOfId(id) {
  const p = ocSite().phones.find((x) => x.id === id);
  if (p) return p.number ? { via: p.via || "sms", to: p.number } : null;
  return ocUserContact(USERS.find((u) => u.u === id));
}
// A DEACTIVATED user keeps their name resolvable everywhere it was already written (the alarm
// log, maneuver history, this change log) but stops being assignable and stops being paged.
// That is why there are two lists: pickers read ocRoster(), lookups read ocRosterAll().
// Duty phones first (a different kind of recipient, one or two of them), then people A–Z by the
// name as displayed. Every picker reads this, so the order is the same everywhere.
function ocRosterAll() { return ocSite().phones.map((p) => ({ id: p.id, name: p.name, kind: "phone", contact: ocContactOfId(p.id) })).concat(USERS.map((u) => ({ id: u.u, name: u.first + " " + u.last, kind: "person", role: u.roles[0], contact: ocUserContact(u), inactive: u.status === "inactive" })).sort((a, b) => a.name.localeCompare(b.name, "nb"))); }
// pickers: active AND reachable. Someone with no contact is left out, not shown with a warning.
function ocRoster() { return ocRosterAll().filter((m) => !m.inactive && m.contact); }
function ocMember(id) { return ocRosterAll().find((m) => m.id === id) || { id, name: /^vt\d/.test(id) ? "Removed duty phone" : id, kind: /^vt\d/.test(id) ? "phone" : "person" }; }

// coverage: the minimum alarm severity a group is paged for
const OC_PRIOS = [
  { id: "critical", label: "Critical", covers: "Critical only" },
  { id: "high", label: "High", covers: "High and above" },
  { id: "medium", label: "Medium", covers: "Medium and above" },
  { id: "low", label: "Low", covers: "All alarms" },
];
function ocPrio(id) { return OC_PRIOS.find((p) => p.id === id) || OC_PRIOS[3]; }

// on-call PAGING WINDOWS — when the GROUP is paged, not when a person works.
// Assigning someone to a group does not schedule them: it says an alarm inside this window
// reaches them. Keep every label in this file on that side of the line.
const OC_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const OC_DAY_LABEL = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
function ocWin(all, we) { return { mon: all, tue: all, wed: all, thu: all, fri: all, sat: we != null ? we : all, sun: we != null ? we : all }; }
// PAGING-WINDOW PRESETS. Renamed off "shift": a shift is now a real, separate concept (a
// person's duty window, oncall-roster.jsx) and one word for two unrelated things is how a
// label or a dropdown eventually shows the wrong one. This is the GROUP's window: when an
// alarm may leave. It says nothing about who is working.
const OC_WIN_PRESETS = [
  { id: "247", label: "Around the clock", summary: "00:00–24:00 · every day", win: () => ocWin("00:00-24:00") },
  { id: "day", label: "Daytime", summary: "07:00–15:00 · Mon–Fri", win: () => ocWin("07:00-15:00", "") },
  { id: "evening", label: "Evening", summary: "15:00–23:00 · Mon–Fri", win: () => ocWin("15:00-23:00", "") },
  { id: "night", label: "Night", summary: "23:00–07:00 · every day", win: () => ocWin("23:00-07:00") },
  { id: "weekend", label: "Weekend", summary: "00:00–24:00 · Sat–Sun", win: () => ({ mon: "", tue: "", wed: "", thu: "", fri: "", sat: "00:00-24:00", sun: "00:00-24:00" }) },
  // the customer's duty list: one window Mon–Fri, another Sat–Sun (Evening 14:50–20:30 / 07:00–19:00)
  { id: "split", label: "Weekdays + weekend", summary: "Own hours Mon–Fri and Sat–Sun", win: () => ocWin("07:00-15:00", "") },
  { id: "custom", label: "Custom", summary: "Per-day windows", win: () => ocWin("00:00-24:00") },
];
// a window value is free text: "07:00-15:00" or "00:00-07:00, 15:00-24:00"; blank = not paged
function ocIvOk(iv) { const m = /^([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-4]):([0-5]\d)$/.exec(String(iv).trim()); return !!m && !(+m[3] === 24 && +m[4] > 0); }
function ocWinBad(g) { return OC_DAYS.filter((d) => g.win && g.win[d] && String(g.win[d]).split(",").some((x) => !ocIvOk(x))); }
function ocWinPreset(id) { return OC_WIN_PRESETS.find((s) => s.id === id) || OC_WIN_PRESETS[0]; }
// `g.winPreset` replaced `g.shift`; groups saved before the rename still carry the old key.
function ocPresetOf(g) { return g.winPreset || g.shift; }
function ocFmtWin(w) { return String(w).split(",").map((s) => s.trim().replace("-", "–")).join(", "); }
// one line per distinct window, so a weekday/weekend group reads as two lines in the duty list
function ocSchedLines(g) {
  if (ocPresetOf(g) !== "split") return [ocSchedSummary(g)];
  const out = [];
  if (g.win && g.win.mon) out.push(ocFmtWin(g.win.mon) + " Mon–Fri");
  if (g.win && g.win.sat) out.push(ocFmtWin(g.win.sat) + " Sat–Sun");
  return out.length ? out : ["No active window"];
}
function ocSchedSummary(g) {
  const p = ocPresetOf(g);
  if (p === "split") return ocSchedLines(g).join(" · ");
  if (p && p !== "custom") return ocWinPreset(p).summary;
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
  { id: "g_all", name: "All Alarms", desc: "Every alarm, around the clock", enabled: true, winPreset: "247", win: ocWin("00:00-24:00"), minPriority: "low", tiers: { p1: ["vt1", "vt2", "lum", "jlo"], p2: ["kgr"], p3: ["elel"] }, minUsers: { p1: 1, p2: 0, p3: 0 }, chan: { p1: ["sms", "uhf"], p2: ["sms"], p3: ["voice"] } },
  { id: "g_crit", name: "Critical alarms", desc: "Critical only, immediate response", enabled: true, winPreset: "247", win: ocWin("00:00-24:00"), minPriority: "critical", tiers: { p1: ["ov"], p2: ["sk"], p3: [] }, minUsers: { p1: 1, p2: 1, p3: 0 }, chan: { p1: ["sms", "voice", "uhf"], p2: ["sms", "uhf"], p3: ["voice"] } },
  { id: "g_night", name: "Night shift", desc: "After-hours coverage, high & critical", enabled: true, winPreset: "night", win: ocWinPreset("night").win(), minPriority: "high", tiers: { p1: ["vt1"], p2: ["kgr"], p3: [] }, minUsers: { p1: 1, p2: 0, p3: 0 }, chan: { p1: ["sms", "uhf"], p2: ["voice"], p3: [] } },
];
// ── area coverage ──
// A group used to be facility-wide by definition, so the only way to page one building's duty
// phone was to lean on priority. Coverage is now an explicit set of departments; empty means
// the whole facility, which is what every existing group loads as.
const OC_AREAS = FACILITY.reduce((out, b) => out.concat(b.depts.map((d) => ({ id: d.id, b: b.name, d: d.name, label: b.name + " · " + d.name }))), []);
window.OC_AREAS = OC_AREAS;
function ocArea(id) { return OC_AREAS.find((a) => a.id === id) || null; }
function ocAreaSummary(g) {
  const ids = (g.areas || []).filter((id) => ocArea(id));
  if (!ids.length) return "Whole facility";
  if (ids.length <= 2) return ids.map((id) => ocArea(id).label).join(" · ");
  return ids.length + " departments";
}

function ocNormalize(g) {
  const c = Object.assign({ p1: ["sms", "uhf"], p2: ["sms"], p3: ["voice"], b247: ["sms", "voice"] }, g.chan || {});
  const t = Object.assign({ p1: [], p2: [], p3: [], b247: [] }, g.tiers || {});
  return Object.assign({}, g, { chan: c, tiers: t, areas: g.areas || [], alarmAdd: g.alarmAdd || [], alarmDel: g.alarmDel || [], required: Object.assign({ p1: true }, g.required || {}) });
}

// ── the rules the customer's duty list carries ──
// REQUIRED (their yellow cells): a level that may never stand empty. The last name on it has no
// remove — a swap is add the new name, then remove the old one. Admin setting, per group/level.
function ocRequired(g, tier) { return !!(g.required && g.required[tier]); }
// Priority 3 is changed by a Supervisor (their superbruker) only. The one screen that checks a
// role; the app has no session yet, so the role is read from the same account oclWho uses.
function njSessionRoles() { try { return window.NJ_SESSION_ROLES || (njPerms.session ? [njPerms.session] : (USERS[0] && USERS[0].roles)) || []; } catch (e) { return []; } }
function ocCanEdit(tier) { return tier !== "p3" || njCan("On-call", "Change Priority 3"); }
// pausing a group takes its whole window offline, so it is a permission, not an everyday act
function ocCanPause() { return njCan("On-call", "Pause & Resume Groups"); }
// The last name on a required level is NOT locked any more: edits are a draft, so a level may
// be empty in between, and Save is what refuses a required level left empty.
function ocLockReason(g, tier) { return ocCanEdit(tier) ? null : "Only a Supervisor can change Priority 3"; }
// a person sits on ONE escalation level of a group, so the picker leaves out anyone already on
// Priority 1–3 of it. Two Priority 1 duties in DIFFERENT groups is allowed and common.
function ocEscIds(g) { return ["p1", "p2", "p3"].reduce((o, t) => o.concat((g.tiers && g.tiers[t]) || []), []); }
// Personal duty shifts are OPTIONAL. Off (default): a name on a group is reachable for the whole
// of that group's paging window, which is how the customer's duty list works. On: the Duty
// roster narrows it further per person (lunch breaks, sites that plan shifts separately).
function njOcShiftsOn() { return !!(oncallStore.policy && oncallStore.policy.personalShifts); }
function ocClone(g) { return JSON.parse(JSON.stringify(g)); }
function ocLoad() {
  const r = njOcPersist.read(OC_LS, null);
  const d = r && Array.isArray(r.groups) ? Object.assign({}, r, { groups: r.groups.map(ocNormalize) }) : { groups: OC_SEED.map((g) => ocNormalize(ocClone(g))), policy: { resendMin: 5, upscaleAfter: 3, personalShifts: false }, pending: [] };
  d.site = Object.assign(ocSiteDefault(), d.site || {});
  return d;
}

const oncallStore = {
  data: ocLoad(), subs: new Set(),
  sub(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit() { this.subs.forEach((f) => f()); njOcPersist.write(OC_LS, this.data); },
  get groups() { return this.data.groups; },
  get policy() { return this.data.policy; },
  get site() { return this.data.site; },
  // rev / savedBy / savedAt: lets an open draft see that someone else saved the list meanwhile
  _stamp() { this.data.rev = (this.data.rev || 0) + 1; this.data.savedBy = window.NJ_SESSION_USER || (USERS[0] ? USERS[0].first + " " + USERS[0].last : "Operator"); this.data.savedAt = window.oclNow ? window.oclNow() : Date.now(); },
  setSite(s) {
    const keep = new Set(s.phones.filter((p) => p.number).map((p) => p.id));
    const gone = this.data.site.phones.filter((p) => !keep.has(p.id)).map((p) => p.id);
    gone.forEach((id) => { this.data.pending = this.pending.filter((x) => x.mid !== id); this.data.groups = this.data.groups.map((g) => { const t = Object.assign({}, g.tiers); Object.keys(t).forEach((k) => { t[k] = (t[k] || []).filter((x) => x !== id); }); return Object.assign({}, g, { tiers: t }); }); });
    this.data.site = s;
    if (window.njOcLog) window.njOcLog.add("Site channels changed", s.phones.filter((p) => p.number).length + " duty phone(s) · UHF " + (s.uhf.on ? "on, " + ocPrio(s.uhf.minPriority).covers.toLowerCase() : "off"));
    this._stamp(); this.emit();
  },
  // ONE batch from the draft. Re-checked against the LATEST list, so a colleague's save in
  // between is built on, not overwritten: a change that is already true, or no longer possible,
  // is skipped and reported. `at` = planned batch (queued) instead of now.
  commit(changes, at) {
    const applied = [], skipped = [];
    const gs = this.data.groups;
    changes.forEach((c) => {
      const g = gs.find((x) => x.id === c.gid);
      if (!g) { skipped.push({ c: c, why: "the group was deleted" }); return; }
      const has = ((g.tiers && g.tiers[c.tier]) || []).includes(c.mid);
      if (c.op === "add" && has) { skipped.push({ c: c, why: "already on it" }); return; }
      if (c.op === "remove" && !has) { skipped.push({ c: c, why: "already removed" }); return; }
      if (c.op === "add" && !ocContactOfId(c.mid)) { skipped.push({ c: c, why: "no contact on the account" }); return; }
      applied.push(c);
    });
    const nm = (id) => ocMember(id).name;
    const gname = (id) => (gs.find((x) => x.id === id) || {}).name || "";
    // a remove + add of the same name in one group is a MOVE, and is logged as one
    const lines = [];
    applied.forEach((c) => {
      if (c.op !== "add") return;
      const out = applied.find((r) => r.op === "remove" && r.gid === c.gid && r.mid === c.mid);
      lines.push(out ? nm(c.mid) + " moved to " + ocTierLabel(c.tier) + " · " + gname(c.gid) + " (from " + ocTierLabel(out.tier) + ")" : nm(c.mid) + " added to " + gname(c.gid) + " · " + ocTierLabel(c.tier));
    });
    applied.forEach((c) => { if (c.op === "remove" && !applied.some((a) => a.op === "add" && a.gid === c.gid && a.mid === c.mid)) lines.push(nm(c.mid) + " removed from " + gname(c.gid) + " · " + ocTierLabel(c.tier)); });
    if (at) {
      this.data.pending = this.pending.concat(applied.map((c, i) => ({ id: "pc" + Date.now() + i + Math.random().toString(36).slice(2, 5), gid: c.gid, tier: c.tier, mid: c.mid, op: c.op, at: at })));
      if (window.njOcLog) lines.forEach((l) => window.njOcLog.add("Planned: " + l, "from " + njOcFmtAt(at)));
    } else {
      // removes first, then adds: the batch lands at one instant, a level is never half-done
      applied.filter((c) => c.op === "remove").forEach((c) => this._removeMember(c.gid, c.tier, c.mid, true));
      applied.filter((c) => c.op === "add").forEach((c) => {
        // one escalation level per person: if a colleague moved them meanwhile, this add wins
        if (c.tier !== "b247") ["p1", "p2", "p3"].forEach((t) => { if (t !== c.tier) this._removeMember(c.gid, t, c.mid, true); });
        this._addMember(c.gid, c.tier, c.mid, true);
      });
      if (window.njOcLog) lines.forEach((l) => window.njOcLog.add(l, ""));
    }
    this._stamp(); this.emit();
    return { applied: applied, skipped: skipped };
  },
  upsert(g) { const gs = this.data.groups; const i = gs.findIndex((x) => x.id === g.id); this.data.groups = i >= 0 ? gs.map((x) => (x.id === g.id ? g : x)) : gs.concat([g]); this.emit(); },
  remove(id) { this.data.groups = this.data.groups.filter((x) => x.id !== id); this.emit(); },
  duplicate(id) { const g = this.data.groups.find((x) => x.id === id); if (!g) return; const c = ocClone(g); c.id = "g" + Date.now(); c.name = g.name + " (copy)"; this.data.groups = this.data.groups.concat([c]); this.emit(); },
  toggle(id) {
    if (!ocCanPause()) return;
    const g0 = this.data.groups.find((x) => x.id === id);
    if (window.njOcLog && g0) window.njOcLog.add((g0.enabled ? "Paused " : "Resumed ") + g0.name, g0.enabled ? "No notifications sent for this group" : "");
    this.data.groups = this.data.groups.map((x) => (x.id === id ? Object.assign({}, x, { enabled: !x.enabled }) : x)); this.emit();
  },
  // "Disable all" takes the WHOLE facility's paging offline. Enabling all is NOT its inverse:
  // a group someone deliberately paused must not come back on because of a mis-click, so the
  // pre-pause state is snapshotted and restored. Without this, the obvious correction to a
  // mis-click silently re-arms a group that was meant to stay off, and the only symptom is
  // the Coverage panel going quiet.
  pauseAll() {
    this.data.prevEnabled = this.data.groups.reduce((m, g) => { m[g.id] = !!g.enabled; return m; }, {});
    if (window.njOcLog) window.njOcLog.add("Paused all on-call groups", "No alarm leaves the facility while paused");
    this.data.groups = this.data.groups.map((x) => Object.assign({}, x, { enabled: false }));
    this.emit();
  },
  restoreAll() {
    const prev = this.data.prevEnabled;
    const kept = prev ? Object.keys(prev).filter((k) => prev[k] === false).length : 0;
    if (window.njOcLog) window.njOcLog.add(prev ? "Restored on-call groups" : "Enabled all on-call groups", kept ? kept + " group" + (kept === 1 ? "" : "s") + " left paused, as before" : "");
    this.data.groups = this.data.groups.map((x) => Object.assign({}, x, { enabled: prev ? !!prev[x.id] : true }));
    this.data.prevEnabled = null;
    this.emit();
  },
  pausedByAll() { return !!this.data.prevEnabled; },
  setAll(enabled) { return enabled ? this.restoreAll() : this.pauseAll(); },
  addMember(id, tier, mid) { const g0 = this.data.groups.find((x) => x.id === id); if (window.njOcLog && g0) window.njOcLog.add((window.ocMember ? window.ocMember(mid).name : mid) + " added to " + g0.name, "Priority " + tier.slice(1)); return this._addMember(id, tier, mid); },
  _addMember(id, tier, mid, quiet) { this.data.groups = this.data.groups.map((g) => { if (g.id !== id) return g; const t = Object.assign({}, g.tiers); t[tier] = (t[tier] || []).includes(mid) ? t[tier] : (t[tier] || []).concat([mid]); return Object.assign({}, g, { tiers: t }); }); if (!quiet) this.emit(); },
  // ── planned changes ── a Monday swap planned on Friday. Stored as a queue of single adds and
  // removes, applied when their time comes (screens/oncall-dutylist.jsx runs the clock).
  get pending() { return this.data.pending || (this.data.pending = []); },
  plan(c) {
    const g0 = this.data.groups.find((x) => x.id === c.gid);
    if (window.njOcLog && g0) window.njOcLog.add("Planned: " + ocMember(c.mid).name + (c.op === "add" ? " added to " : " removed from ") + g0.name, ocTierLabel(c.tier) + " · from " + njOcFmtAt(c.at));
    this.data.pending = this.pending.concat([Object.assign({ id: "pc" + Date.now() + Math.random().toString(36).slice(2, 6) }, c)]); this.emit();
  },
  // planned removals on a REQUIRED level that only pass because this planned add lands first:
  // cancel the add alone and those removals are skipped when their time comes
  dependents(id) {
    const c = this.pending.find((x) => x.id === id);
    if (!c || c.op !== "add") return [];
    const g = this.data.groups.find((x) => x.id === c.gid);
    if (!g || !ocRequired(g, c.tier)) return [];
    const rest = this.pending.filter((x) => x.id !== id && x.gid === c.gid && x.tier === c.tier);
    const n0 = ((g.tiers && g.tiers[c.tier]) || []).length;
    return rest.filter((r) => r.op === "remove" && r.at >= c.at && n0 - rest.filter((x) => x.op === "remove" && x.at <= r.at).length + rest.filter((x) => x.op === "add" && x.at <= r.at).length < 1);
  },
  cancelPlan(id) { const c0 = this.pending.find((x) => x.id === id); if (c0 && !ocCanEdit(c0.tier)) return; const c = c0; if (c && window.njOcLog) window.njOcLog.add("Cancelled planned change", ocMember(c.mid).name + " · " + ocTierLabel(c.tier) + " · " + njOcFmtAt(c.at)); this.data.pending = this.pending.filter((x) => x.id !== id); this.emit(); },
  applyDue(now) {
    const due = this.pending.filter((x) => x.at <= now).sort((a, b) => a.at - b.at || (a.op === "add" ? -1 : 1));
    if (!due.length) return;
    this.data.pending = this.pending.filter((x) => x.at > now);
    due.forEach((c) => {
      const g = this.data.groups.find((x) => x.id === c.gid); if (!g) return;
      const nm = ocMember(c.mid).name;
      if (c.op === "add") { this._addMember(c.gid, c.tier, c.mid); if (window.njOcLog) window.njOcLog.add("Planned change applied: " + nm + " added to " + g.name, ocTierLabel(c.tier)); return; }
      // a planned removal never empties a required level: it is skipped and says so
      const n = ((g.tiers && g.tiers[c.tier]) || []).length;
      if (ocRequired(g, c.tier) && n <= 1) { if (window.njOcLog) window.njOcLog.add("Planned removal skipped: " + nm + " on " + g.name, ocTierLabel(c.tier) + " is required and would be empty"); return; }
      this._removeMember(c.gid, c.tier, c.mid); if (window.njOcLog) window.njOcLog.add("Planned change applied: " + nm + " removed from " + g.name, ocTierLabel(c.tier));
    });
    this.emit();
  },
  removeMember(id, tier, mid) { const g0 = this.data.groups.find((x) => x.id === id); if (window.njOcLog && g0) window.njOcLog.add((window.ocMember ? window.ocMember(mid).name : mid) + " removed from " + g0.name, "Priority " + tier.slice(1)); return this._removeMember(id, tier, mid); },
  _removeMember(id, tier, mid, quiet) { this.data.groups = this.data.groups.map((g) => { if (g.id !== id) return g; const t = Object.assign({}, g.tiers); t[tier] = (t[tier] || []).filter((x) => x !== mid); return Object.assign({}, g, { tiers: t }); }); if (!quiet) this.emit(); },
  // A removed user must not survive as a dangling id on a tier: ocMember falls back to the raw
  // id, so the chip would have read "sk" and the group would still look staffed.
  purgeMember(mid) { this.data.pending = this.pending.filter((x) => x.mid !== mid); this.data.groups = this.data.groups.map((g) => { const t = Object.assign({}, g.tiers); ["p1", "p2", "p3", "b247"].forEach((k) => { t[k] = (t[k] || []).filter((x) => x !== mid); }); return Object.assign({}, g, { tiers: t }); }); this.emit(); },
  setPolicy(patch) { this.data.policy = Object.assign({}, this.data.policy, patch); this.emit(); },
};
function useOncall() { const [, force] = React.useReducer((x) => x + 1, 0); React.useEffect(() => oncallStore.sub(force), []); return oncallStore; }
// Lists saved before contact became per-person can still hold a name with no contact. The rule
// is that nobody on a list is unreachable, so they are taken off once, on load, and logged.
function ocPurgeNoContact() {
  const d = oncallStore.data, gone = [];
  d.groups = d.groups.map((g) => {
    const t = Object.assign({}, g.tiers);
    Object.keys(t).forEach((k) => { t[k] = (t[k] || []).filter((id) => { if (ocContactOfId(id)) return true; gone.push({ g: g.name, tier: k, id: id }); return false; }); });
    return Object.assign({}, g, { tiers: t });
  });
  const p0 = oncallStore.pending.length;
  d.pending = oncallStore.pending.filter((x) => x.op !== "add" || ocContactOfId(x.mid));
  if (!gone.length && d.pending.length === p0) return;
  if (window.njOcLog) gone.forEach((x) => window.njOcLog.add(ocMember(x.id).name + " taken off " + x.g + " · " + ocTierLabel(x.tier), "No contact on the account"));
  oncallStore.emit();
}
setTimeout(ocPurgeNoContact, 0);
// another operator (another tab / workstation) saved the list: pick it up live, never write back
window.addEventListener("storage", (e) => { if (e.key !== OC_LS) return; oncallStore.data = ocLoad(); oncallStore.subs.forEach((f) => f()); });
window.addEventListener("storage", (e) => { if (e.key === OC_LS) setTimeout(ocPurgeNoContact, 0); });
function ocTierLabel(t) { return t === "b247" ? "24/7" : "Priority " + t.slice(1); }
function njOcFmtAt(ms) { const d = new Date(ms); return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + ", " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
// delivery verification (screens/oncall-delivery.jsx) reads the same groups/channels — never fork them
Object.assign(window, { OC_PRIOS, OC_CONTACTS, ocContactMeta, ocContactOfId, ocUserContact, ocSite, ocRosterAll, njPerms, usePerms, njCan, ocCanPause, oncallStore, useOncall, OC_CHANNELS, ocRoster, ocMember, njOcShiftsOn, ocRequired, ocCanEdit, ocLockReason, ocEscIds, ocTierLabel, njOcFmtAt, ocSchedLines, ocAreaSummary, ocPrio, ocPrioColor });

// severity dot color
function ocPrioColor(id) { const s = (window.SEV && window.SEV[id]) || {}; return s.dot || s.color || "var(--slate-400)"; }

// ── escalation tier column ── chips, level dropdown and Add are the draft list (oncall-draft.jsx)
function OcTier({ group, tier, n }) {
  const req = ocRequired(group, tier);
  const editable = ocCanEdit(tier);
  return (
    <div className="oncall-col">
      <div className="oc-tier-h">
        <span className="oc-tier-n">{n}</span>
        <span className="oncall-col-h">Priority {n}</span>
        {!editable && <span className="oc-tier-sup" title="Only a Supervisor can change Priority 3"><Icon name="lock" size={12} /></span>}
        {req && <span className="oc-tier-req" title="Required: Save is refused while this level is empty">Required</span>}
      </div>
      {window.OcLevelList && <window.OcLevelList g={group} tier={tier} />}
    </div>
  );
}

// ── group card ──
function OcGroupCard({ g, flash }) {
  const prio = ocPrio(g.minPriority);
  return (
    <div className={"oncall-group" + (g.enabled ? "" : " oc-off") + (flash ? " oc-flash" : "")} data-oc-id={g.id}>
      <div className="oncall-head">
        <button className={"oc-switch" + (g.enabled ? " on" : "")} role="switch" aria-checked={g.enabled} disabled={!ocCanPause()} title={!ocCanPause() ? "Pausing a group needs the Pause & Resume Groups permission" : g.enabled ? "On-call active" : "Paused"} onClick={() => { const gap = g.enabled && window.njOcGapDelta ? window.njOcGapDelta(oncallStore.groups.map((x) => (x.id === g.id ? Object.assign({}, x, { enabled: false }) : x))) : []; oncallStore.toggle(g.id); if (gap.length) njToast(g.name + " paused. All alarms now uncovered: " + window.njOcGapText(gap) + "."); }}><span className="oc-switch-knob" /></button>
        <div className="oc-head-main">
          <span className="name">{g.name}</span>
          <span className="caption">{g.desc}</span>
        </div>
        <span className="oc-cover" title="Alarms this group is paged for"><span className="oc-cover-dot" style={{ background: ocPrioColor(g.minPriority) }} /> {prio.covers}</span>
        <span className="sched" title="Where an alarm has to come from to reach this group"><Icon name="building-2" size={12} color="var(--slate-400)" /> {ocAreaSummary(g)}</span>
        <span className="sched" title="When an alarm reaches this group: the group's paging window, not anyone's working hours"><Icon name="clock" size={12} color="var(--slate-400)" /> {ocSchedSummary(g)}</span>
        <div className="oc-head-actions">
          <button className="icon-btn" title="Send a test alarm to this group and see who receives it" onClick={() => window.njOpenTestDispatch && window.njOpenTestDispatch(g.id)}><Icon name="send" size={16} /></button>
          <button className="icon-btn" title="Edit group" onClick={() => openOnCallEditor(g)}><Icon name="pencil" size={16} /></button>
          <button className="icon-btn" title="Duplicate" onClick={() => oncallStore.duplicate(g.id)}><Icon name="copy" size={16} /></button>
          <button className="icon-btn" title="Delete" onClick={() => openDialog(<ConfirmDialog title="Delete on-call group" message={"Delete “" + g.name + "”?"} detail={(() => { const gap = window.njOcGapDelta ? window.njOcGapDelta(oncallStore.groups.filter((x) => x.id !== g.id)) : []; return gap.length ? "All alarms will be uncovered " + window.njOcGapText(gap) + ". The Coverage panel will flag it until another group holds those hours." : "Assigned recipients will no longer be paged for this coverage."; })()} confirmLabel="Delete" tone="danger" onConfirm={() => { oncallStore.remove(g.id); njToast(g.name + " deleted."); }} />)}><Icon name="trash-2" size={16} /></button>
        </div>
      </div>
      <div className="oncall-cols">
        <OcTier group={g} tier="p1" n={1} />
        <OcTier group={g} tier="p2" n={2} />
        <OcTier group={g} tier="p3" n={3} />
      </div>
      <OcBackstop g={g} />
      {!g.enabled && <div className="oc-paused-bar"><Icon name="pause" size={12} /> Paused, no notifications sent for this group</div>}
    </div>
  );
}

// ── around the clock ── the duty list's "Alle alarmer 24/7" column, read as a backstop on each
// group: reached for this group's alarms at every hour, whatever its paging window. It is not
// an escalation level, so it does not count toward the round-the-clock Priority 1 check.
function OcBackstop({ g }) {
  const req = ocRequired(g, "b247");
  return (
    <div className="oc-backstop">
      <span className="oc-backstop-l" title="Receives this group's alarms at every hour, whatever the paging window"><Icon name="clock-4" size={12} /> 24/7{req && <span className="oc-tier-req">Required</span>}</span>
      {window.OcLevelList && <window.OcLevelList g={g} tier="b247" row />}
    </div>
  );
}

// ── group editor dialog ──
// the group's own settings (covers, area, window, required levels). Rendered by the group
// drawer (screens/oncall-page.jsx) and by the dialog fallback below; it owns no Save.
function OcGroupFields({ g, setG }) {
  const setReq = (tier, v) => setG((s) => Object.assign({}, s, { required: Object.assign({}, s.required, { [tier]: v }) }));
  const setSplit = (part, v) => setG((s) => Object.assign({}, s, { win: part === "wd" ? Object.assign({}, s.win, { mon: v, tue: v, wed: v, thu: v, fri: v }) : Object.assign({}, s.win, { sat: v, sun: v }) }));
  const winBad = ocWinBad(g);
  const toggleArea = (id) => setG((s) => { const cur = s.areas || []; return Object.assign({}, s, { areas: cur.includes(id) ? cur.filter((x) => x !== id) : cur.concat([id]) }); });
  const set = (patch) => setG((s) => Object.assign({}, s, patch));
  const setWin = (day, val) => setG((s) => Object.assign({}, s, { win: Object.assign({}, s.win, { [day]: val }) }));
  const pickPreset = (id) => { const p = ocWinPreset(id); set({ winPreset: id, shift: undefined, win: id === "custom" ? (g.win || ocWin("00:00-24:00")) : id === "split" ? ocWin((g.win && g.win.mon) || "07:00-15:00", (g.win && g.win.sat) || "") : p.win() }); };
  return (
      <div className="oc-editor">
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
          <span className="oc-field-l">Area coverage</span>
          <p className="oc-mininfo">Where an alarm has to come from to reach this group. Leave everything off for the whole facility. Pick departments to give a building its own duty phone.</p>
          <div className="oc-area-grid">
            <button type="button" className={"oc-area" + (!(g.areas || []).length ? " sel" : "")} onClick={() => set({ areas: [] })}>
              <Icon name="globe" size={14} /> Whole facility
            </button>
            {OC_AREAS.map((a) => (
              <button key={a.id} type="button" className={"oc-area" + ((g.areas || []).includes(a.id) ? " sel" : "")}
                aria-pressed={(g.areas || []).includes(a.id)} onClick={() => toggleArea(a.id)}>
                <span className="oc-area-b">{a.b}</span> {a.d}
              </button>
            ))}
          </div>
        </div>

        {window.OcAlarmsSection && <window.OcAlarmsSection g={g} setG={setG} />}

        <div className="oc-ed-sec">
          <span className="oc-field-l">Paging window</span>
          <p className="oc-mininfo">When an alarm reaches this group. This is the <b>group's</b> window: assigning someone to it on Paging groups makes them reachable in it, it does not set their working hours.</p>
          <div className="oc-shift-row">
            {OC_WIN_PRESETS.map((s) => <button key={s.id} type="button" className={"oc-shift" + (ocPresetOf(g) === s.id ? " sel" : "")} onClick={() => pickPreset(s.id)}>{s.label}</button>)}
          </div>
          {ocPresetOf(g) === "split" && (
            <div className="oc-split">
              <label className="oc-field"><span className="oc-min-l">Monday–Friday</span><input className="oos-input oc-day-in" value={g.win.mon} onChange={(e) => setSplit("wd", e.target.value)} placeholder="not paged" /></label>
              <label className="oc-field"><span className="oc-min-l">Saturday–Sunday</span><input className="oos-input oc-day-in" value={g.win.sat} onChange={(e) => setSplit("we", e.target.value)} placeholder="not paged" /></label>
              <p className="oc-days-hint">Format <code>HH:MM-HH:MM</code>. An end earlier than the start runs past midnight into the next day. Leave blank where the group is not paged.</p>
            </div>
          )}
          {winBad.length > 0 && <p className="oc-chan-rule"><Icon name="alert-triangle" size={14} color="var(--warning-text)" /> Not a valid window on {winBad.map((d) => OC_DAY_LABEL[d].slice(0, 3)).join(", ")}. Use HH:MM-HH:MM.</p>}
          {ocPresetOf(g) === "split" ? null : ocPresetOf(g) === "custom"
            ? <div className="oc-days">{OC_DAYS.map((d) => (
                <div className="oc-day" key={d}><span className="oc-day-l">{OC_DAY_LABEL[d]}</span>
                  <input className="oos-input oc-day-in" value={g.win[d]} onChange={(e) => setWin(d, e.target.value)} placeholder="off" /></div>
              ))}<p className="oc-days-hint">Format <code>HH:MM-HH:MM</code>. Leave blank for a day this group is not paged. Two windows in one day: <code>00:00-07:00, 15:00-24:00</code>.</p></div>
            : <p className="oc-sched-note"><Icon name="clock" size={14} color="var(--slate-400)" /> {ocWinPreset(ocPresetOf(g)).summary}</p>}
        </div>

        <div className="oc-ed-sec">
          <span className="oc-field-l">Required levels</span>
          <p className="oc-mininfo">A <b>required</b> level can never be saved empty. Leave a level off when this site does not use it.</p>
          <div className="oc-min-row">
            {["p1", "p2", "p3", "b247"].map((t) => (
              <div className="oc-min" key={t}>
                <label className="oc-leg" {...njCheckable(() => setReq(t, !ocRequired(g, t)), { on: ocRequired(g, t), label: ocTierLabel(t) + " required" })}><Check on={ocRequired(g, t)} /> {ocTierLabel(t)}</label>
              </div>
            ))}
          </div>
        </div>
        <p className="oc-sched-note"><Icon name="message-square" size={14} color="var(--slate-400)" /> Each recipient is paged on their own contact (SMS, voice call or email, set on the user). UHF is one sender for the whole site, under More · On-call settings.</p>
      </div>
  );
}
// a blank group: Priority 1 required, whole facility, around the clock
function ocNewGroup() { return { id: "g" + Date.now(), name: "", desc: "", enabled: true, winPreset: "247", win: ocWin("00:00-24:00"), minPriority: "critical", areas: [], tiers: { p1: [], p2: [], p3: [], b247: [] }, required: { p1: true }, minUsers: { p1: 1, p2: 0, p3: 0 }, chan: {} }; }
// what saving this group does to all-alarms cover — shown, never blocked (Coverage flags it after)
function ocGapFor(g, editing) { if (ocWinBad(g).length || !window.njOcGapDelta) return []; return window.njOcGapDelta(editing ? oncallStore.groups.map((x) => (x.id === g.id ? g : x)) : oncallStore.groups.concat([g])); }
function OcGapNote({ gap }) { return gap.length ? <p className="oc-gap-note"><Icon name="alert-triangle" size={14} /> <span>Saving leaves all alarms uncovered <b className="data">{window.njOcGapText(gap)}</b>. The Coverage panel will flag it until another group holds those hours.</span></p> : null; }
// fallback only: pages that load the group drawer (screens/oncall-page.jsx) open that instead
function OnCallEditorDialog({ group }) {
  const editing = !!group;
  const [g, setG] = React.useState(() => group ? ocClone(ocNormalize(group)) : ocNewGroup());
  const canSave = g.name.trim().length > 0 && !ocWinBad(g).length;
  const save = () => { if (!canSave) return; oncallStore.upsert(g); closeDialog(); njToast((editing ? "Updated " : "Created ") + g.name + "."); };
  return (
    <Dialog width={640}>
      <DlgHeader icon={editing ? "pencil" : "plus"} name={editing ? "Edit on-call group" : "New on-call group"} onClose={closeDialog} />
      <div className="dlg-body"><OcGroupFields g={g} setG={setG} /><OcGapNote gap={ocGapFor(g, editing)} />{!editing && <p className="oc-sched-note"><Icon name="users" size={14} color="var(--slate-400)" /> Recipients are added on the duty list after the group is created.</p>}</div>
      <div className="dlg-foot">
        <button className="btn btn-secondary" onClick={closeDialog}>Cancel</button>
        <button className="btn btn-primary" disabled={!canSave} onClick={save}><Icon name="check" size={16} /> {editing ? "Save changes" : "Create group"}</button>
      </div>
    </Dialog>
  );
}
function openOnCallEditor(group) { if (group && window.openOcGroup) { window.openOcGroup(group); return; } openDialog(<OnCallEditorDialog group={group} />); }
Object.assign(window, { OcGroupFields, ocNewGroup, ocGapFor, OcGapNote, ocNormalize, ocClone, openOnCallEditor });

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
// njOcReveal is exported DIRECTLY, not as `njOcReveal: (sel) => njOcReveal(sel)`. The bundle is
// a plain concatenation of classic scripts, so `function njOcReveal` IS window.njOcReveal —
// the lazy-arrow alias overwrote that binding with itself and every call recursed until the
// stack blew, blanking the page from the Coverage card. The declaration below is hoisted, so
// naming it here needs no indirection.
Object.assign(window, { openModemStatus, ocModemSeries, njOcReveal });

// Scroll the content container by computed offset — scrollIntoView is banned in this app
// because it can move the whole shell.
//
// SCROLL ONCE, THEN CORRECT ONCE. Three earlier versions failed by looping: gating on
// cross-frame stability meant a target that never held still got no scroll at all, and
// re-issuing a smooth scrollTo from inside the loop restarted the easing every time two
// frames agreed, livelocking the animation near its start. There is no polling here — scroll
// as soon as the element exists, then after it settles re-measure and make at most one
// corrective jump if the subtree grew underneath it.
function njOcReveal(sel) {
  const PAD = 24;
  let raf = 0, t1 = 0, t2 = 0, tries = 0;
  const box = () => document.querySelector(".content");
  const off = (el, b) => el.getBoundingClientRect().top - b.getBoundingClientRect().top;
  const correct = () => {
    const el = document.querySelector(sel), b = box();
    if (!el || !b) return;
    const o = off(el, b);
    if (o >= 0 && o < b.clientHeight) return;            // visible: done
    b.scrollTo({ top: Math.max(0, b.scrollTop + o - PAD), behavior: "auto" });
  };
  const start = () => {
    const el = document.querySelector(sel), b = box();
    if (!el || !b) { if (++tries > 20) return; raf = requestAnimationFrame(start); return; }
    b.scrollTo({ top: Math.max(0, b.scrollTop + off(el, b) - PAD), behavior: "smooth" });
    t1 = setTimeout(correct, 420);   // after the smooth scroll has arrived
    t2 = setTimeout(correct, 900);   // after a late-mounting subtree has settled
  };
  start();
  return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
}

// OnCallTab moved to screens/oncall-page.jsx (simplified On-call page).

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

// NOTE: AppearanceCard is no longer rendered in Settings. Theme / density / text size are
// per-operator, per-device state and live in Preferences (lib/dialogs.jsx) — one home, not two.
// Kept here only as the full-size form of that group if a personal-settings screen is ever added.
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

// Settings · General is the FACILITY's record — one shared truth for everyone on the plant.
// Anything that is per-operator or per-device (theme, density, text size, language, equipment
// label mode, units, default screen) lives in Preferences and is NOT duplicated here.
function GeneralTab() {
  const [idle, setIdle] = React.useState(() => { try { return localStorage.getItem("nj_idle_logout_min") || "20"; } catch (e) { return "20"; } });
  const setIdleVal = (v) => { setIdle(v); try { localStorage.setItem("nj_idle_logout_min", v); } catch (e) {} };
  return (
    <div className="set-grid">
      <AlarmTargetsCard />
      <div className="card">
        <div className="card-head"><span className="card-title">Project Settings</span></div>
        <div className="set-form">
          <div className="set-row">
            <div className="set-row-l"><span className="set-row-name">Inactivity logout</span><span className="set-row-desc">Auto sign-out after idle · applies to every operator</span></div>
            <span className="set-num"><input type="number" min="1" max="120" value={idle} onChange={(e) => setIdleVal(e.target.value)} onBlur={() => { const n = Math.min(120, Math.max(1, parseInt(idle, 10) || 20)); setIdleVal(String(n)); }} /> <span className="u">min</span></span>
          </div>
          <div className="set-row">
            <div className="set-row-l"><span className="set-row-name">Report language</span><span className="set-row-desc">Language of generated reports and exports</span></div>
            <span className="select">English <Icon name="chevron-down" size={14} color="var(--slate-400)" /></span>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><div className="card-head-l"><Icon name="sliders-horizontal" size={16} color="var(--slate-600)" /><span className="card-title">Your Preferences</span></div></div>
        <div className="set-form">
          <div className="set-row">
            <div className="set-row-l"><span className="set-row-name">Theme, density, text size, interface language, equipment labels, units, default screen</span><span className="set-row-desc">Saved for you on this device — they do not change what anyone else sees</span></div>
            <button className="btn btn-secondary btn-sm" onClick={() => window.openPreferences && window.openPreferences()}><Icon name="sliders-horizontal" size={14} /> Preferences</button>
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
      {tab === "On-call" && window.OnCallTab && <window.OnCallTab />}
      {tab === "General" && <GeneralTab />}
    </AppShell>
  );
}

window.SettingsScreen = SettingsScreen;
