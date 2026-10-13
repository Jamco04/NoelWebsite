// Builds assets/js/icons.js with only the Lucide icons the site uses.
// Usage, from the repo root (needs Node and npm):
//   cd /tmp && npm pack lucide@0.453.0 && tar xzf lucide-0.453.0.tgz && cd -
//   node tools/build-icons.mjs . /tmp/package
// Icons are found from data-lucide="..." in the pages and icon: "..." in contact.js.
// Browse names at https://lucide.dev/icons.
import fs from "node:fs";
import path from "node:path";
const [site, pkg] = process.argv.slice(2);
const names = new Set();
for (const f of fs.readdirSync(site).filter((f) => f.endsWith(".html")).map((f) => path.join(site, f)).concat([path.join(site, "assets/js/contact.js")])) {
  const s = fs.readFileSync(f, "utf8");
  for (const m of s.matchAll(/data-lucide="([a-z0-9-]+)"/g)) names.add(m[1]);
  for (const m of s.matchAll(/icon: "([a-z0-9-]+)"/g)) names.add(m[1]);
}
for (const n of ["lightbulb", "check", "send", "arrow-left", "arrow-right", "pencil"]) names.add(n);
const out = {};
for (const n of [...names].sort()) {
  const file = path.join(pkg, "dist/esm/icons", n + ".js");
  if (!fs.existsSync(file)) { console.error("MISSING", n); continue; }
  const src = fs.readFileSync(file, "utf8");
  const body = src.slice(src.indexOf("defaultAttributes,") + "defaultAttributes,".length, src.lastIndexOf("];"));
  const nodes = Function('"use strict";return (' + body.trim() + ")")();
  out[n] = nodes.map(([tag, attrs]) => "<" + tag + Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => ` ${k}="${v}"`).join("") + "/>").join("");
}
const js = `// Icons from Lucide (https://lucide.dev, ISC licence), only the ones this site uses.
// Regenerate if you add a data-lucide="..." icon that isn't listed here.
(function () {
  var ICONS = ${JSON.stringify(out, null, 0).replace(/","/g, '",\n    "')};
  function render(root) {
    var nodes = (root || document).querySelectorAll("[data-lucide]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i], name = el.getAttribute("data-lucide"), inner = ICONS[name];
      if (!inner) continue;
      var span = document.createElement("span");
      span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide lucide-' + name + '">' + inner + "</svg>";
      el.parentNode.replaceChild(span.firstChild, el);
    }
  }
  window.lucide = { createIcons: function () { render(document); } };
})();
`;
fs.writeFileSync(path.join(site, "assets/js/icons.js"), js);
console.log(Object.keys(out).length, "icons,", js.length, "bytes");
