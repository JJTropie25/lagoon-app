// Publishes an OTA update to one environment and checks that the bundle points
// at that environment's Supabase project.
//
//   npm run update:demo -- "message"
//   npm run update:prod -- "message"
//
// Why a script: `eas update` bundles locally, inlining EXPO_PUBLIC_* from .env,
// and Metro's cache can keep stale values. Getting either wrong silently ships
// the demo app pointed at the production DB (or vice versa).
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const ENVIRONMENTS = {
  demo: { envFile: ".env.demo", branch: "demo", variant: "demo" },
  prod: { envFile: ".env.prod", branch: "production", variant: "production" },
};

const [target, ...messageParts] = process.argv.slice(2);
const env = ENVIRONMENTS[target];
if (!env) {
  console.error(`Usage: node scripts/publish-update.mjs <${Object.keys(ENVIRONMENTS).join("|")}> "message"`);
  process.exit(1);
}
const message = messageParts.join(" ") || `Update ${new Date().toISOString().slice(0, 10)}`;

const readSupabaseUrl = (file) =>
  readFileSync(file, "utf8").match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1].trim();
const expectedUrl = readSupabaseUrl(env.envFile);

let exitCode = 0;
try {
  copyFileSync(env.envFile, ".env");
  rmSync("dist", { recursive: true, force: true });
  console.log(`Publishing to "${env.branch}" (DB ${expectedUrl})...`);

  const result = spawnSync(
    "npx",
    // shell: true (needed for npx on Windows) joins args unquoted, so quote the message
    ["eas-cli", "update", "--branch", env.branch, "--clear-cache", "--message", `"${message.replace(/"/g, "'")}"`, "--non-interactive"],
    { stdio: "inherit", shell: true, env: { ...process.env, APP_VARIANT: env.variant } }
  );
  if (result.status !== 0) throw new Error("eas update failed");

  const bundleDir = path.join("dist", "_expo", "static", "js", "android");
  const bundle = readdirSync(bundleDir).find((f) => f.startsWith("entry-"));
  const urls = new Set(readFileSync(path.join(bundleDir, bundle), "latin1").match(/https:\/\/[a-z]+\.supabase\.co/g) ?? []);
  if (urls.size !== 1 || !urls.has(expectedUrl)) {
    throw new Error(`Bundle points at ${[...urls].join(", ") || "no Supabase URL"}, expected ${expectedUrl}. Republish!`);
  }
  console.log(`\nOK: published update for "${env.branch}" uses ${expectedUrl}`);
} catch (err) {
  console.error(`\nERROR: ${err.message}`);
  exitCode = 1;
} finally {
  copyFileSync(".env.demo", ".env"); // day-to-day work happens against demo
}
process.exit(exitCode);
