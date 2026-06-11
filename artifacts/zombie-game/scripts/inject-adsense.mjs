// Post-export script: injects AdSense into every index.html in the dist folder.
// Usage: node scripts/inject-adsense.mjs [dist-folder]
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ADSENSE = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3938195193121476" crossorigin="anonymous"></script>`;

const distDir = process.argv[2] ?? "dist-netlify";

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (name !== "index.html") continue;
    const original = readFileSync(full, "utf8");
    if (original.includes("ca-pub-3938195193121476")) {
      console.log(`✓ already present: ${full}`);
      continue;
    }
    const patched = original.replace("</head>", `  <!-- Google AdSense -->\n  ${ADSENSE}\n</head>`);
    writeFileSync(full, patched);
    console.log(`✓ injected AdSense: ${full}`);
  }
}

walk(distDir);
