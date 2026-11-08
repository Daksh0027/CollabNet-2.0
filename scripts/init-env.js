#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = [
  { example: "backend/.env.example", target: "backend/.env" },
  { example: "frontend/.env.example", target: "frontend/.env" },
];

let created = 0;
files.forEach(({ example, target }) => {
  const examplePath = path.join(root, example);
  const targetPath = path.join(root, target);

  if (!fs.existsSync(targetPath)) {
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, targetPath);
      console.log(`[INIT] Created ${target} from ${example}`);
      created++;
    } else {
      console.warn(`[WARN] Example file not found: ${example}`);
    }
  } else {
    console.log(`[INFO] Configuration exists: ${target}`);
  }
});

if (created > 0) {
  console.log(`[OK] Environment initialized (${created} new file(s)).`);
} else {
  console.log("[OK] Environment files already present.");
}
