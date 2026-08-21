// icon.jsx — Lucide wrapper (imperative, React-safe)
// Two things matter for performance here, because the app renders hundreds of icons per screen:
//   1. the effect is keyed on [name, strokeWidth] — without a dependency array it re-ran on EVERY
//      render of every icon;
//   2. it builds its own SVG from lucide.icons instead of calling lucide.createIcons(), which
//      rescans the WHOLE document for [data-lucide] on each call. Together those made any state
//      change O(icons²): toggling one checkbox on the rationalization table cost ~2.4s.
const NJ_ICON_CACHE = new Map();
const njIconPascal = (n) => String(n).split(/[-_]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");

function njIconSvg(name, strokeWidth) {
  const key = name + "|" + strokeWidth;
  const hit = NJ_ICON_CACHE.get(key);
  if (hit) return hit.cloneNode(true);
  const lib = window.lucide;
  if (!lib) return null;
  const node = (lib.icons && (lib.icons[njIconPascal(name)] || lib.icons[name])) || null;
  let svg = null;
  if (node && lib.createElement) {
    try { svg = lib.createElement(node); } catch (e) { svg = null; }
  }
  if (!svg) return null;
  svg.setAttribute("stroke-width", strokeWidth);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  NJ_ICON_CACHE.set(key, svg);
  return svg.cloneNode(true);
}

const Icon = React.memo(function Icon({ name, size = 16, strokeWidth = 2, color, style, className }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const svg = njIconSvg(name, strokeWidth);
    el.textContent = "";
    if (svg) { el.appendChild(svg); return; }
    // fallback for older lucide builds that only expose createIcons()
    const lib = window.lucide;
    if (!lib || !lib.createIcons) return;
    const i = document.createElement("i");
    i.setAttribute("data-lucide", name);
    el.appendChild(i);
    try { lib.createIcons({ attrs: { "stroke-width": strokeWidth } }); } catch (e) {}
  }, [name, strokeWidth]);
  return (
    <span ref={ref} className={"njicon " + (className || "")} aria-hidden="true"
      style={{ display: "inline-flex", width: size, height: size, color: color || "currentColor", flexShrink: 0, ...style }} />
  );
});
window.Icon = Icon;
