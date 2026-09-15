// 라우트별 Lighthouse 측정 → docs/perf-history.csv 누적.
// 사용: node scripts/perf.mjs [origin]
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, rmSync } from "node:fs";

const ORIGIN = process.argv[2] ?? "https://seoko-maps.bini59.dev";
const OUT = "docs/perf-history.csv";
const METRICS = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
];

const events = await fetch(`${ORIGIN}/api/events`).then((r) => r.json());
const slug = events.events?.[0]?.slug;
const routes = ["#/", "#/wishlist", "#/settings", ...(slug ? [`#/events/${slug}`] : [])];

const ranAt = new Date().toISOString();
if (!existsSync(OUT)) {
  appendFileSync(OUT, `ran_at,route,performance,${METRICS.join(",")}\n`);
}

for (const route of routes) {
  const tmp = `/tmp/lh-${Date.now()}.json`;
  execFileSync(
    "npx",
    ["-y", "lighthouse", ORIGIN + "/" + route, "--quiet", "--output=json",
     `--output-path=${tmp}`, "--chrome-flags=--headless=new"],
    { stdio: "inherit" },
  );
  const lh = JSON.parse(readFileSync(tmp, "utf8"));
  rmSync(tmp);
  const row = [
    ranAt,
    route,
    Math.round((lh.categories.performance.score ?? 0) * 100),
    ...METRICS.map((m) => Math.round(lh.audits[m].numericValue * 1000) / 1000),
  ];
  appendFileSync(OUT, row.join(",") + "\n");
  console.log(row.join("\t"));
}
