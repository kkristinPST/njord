// navshow.jsx — sidebar / navigation showcase (expanded + collapsed)
function NavExpanded() {
  return <div className="nav-frame"><Sidebar active="start" collapsed={false} /></div>;
}
function NavCollapsed() {
  return <div className="nav-frame"><Sidebar active="start" collapsed={true} /></div>;
}
function NavPage() {
  return (
    <div className="nav-page">
      <Sidebar active="start" collapsed={false} />
      <Sidebar active="start" collapsed={true} />
    </div>
  );
}
Object.assign(window, { NavExpanded, NavCollapsed, NavPage });
