#!/usr/bin/env node
const http = require("http");

const url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const target = `${url.replace(/\/$/, "")}/api/`;

console.log(`[CHECK] Pinging CollaboNet backend at ${target}...`);

const req = http.get(target, (res) => {
  let body = "";
  res.on("data", (chunk) => {
    body += chunk;
  });
  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`[OK] Backend healthy (HTTP ${res.statusCode}): ${body.trim()}`);
      process.exit(0);
    } else {
      console.error(`[ERROR] Backend returned unexpected status ${res.statusCode}: ${body.trim()}`);
      process.exit(1);
    }
  });
});

req.on("error", (err) => {
  console.error(`[ERROR] Unable to reach backend at ${target}: ${err.message}`);
  console.error("[HINT] Ensure backend services are running with 'npm run docker:up'.");
  process.exit(1);
});

req.setTimeout(5000, () => {
  req.destroy();
  console.error(`[TIMEOUT] Request to ${target} timed out after 5000ms.`);
  process.exit(1);
});
