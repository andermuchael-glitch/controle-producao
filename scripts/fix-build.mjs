import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

const broken = 'alocGrid: { display: "grid", g\n  };';
const fixed = 'alocGrid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr 0.8fr auto", gap: 8 },\n};';

if (source.includes(broken)) {
  source = source.replace(broken, fixed);
  fs.writeFileSync(path, source, "utf8");
  console.log("NeoCooler: truncated alocGrid style repaired before Vite build.");
} else {
  console.log("NeoCooler: no truncated alocGrid style found; continuing build.");
}
