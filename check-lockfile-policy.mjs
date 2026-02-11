import { existsSync } from "node:fs";

const lockfiles = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"];
const present = lockfiles.filter((file) => existsSync(file));

if (!present.includes("package-lock.json")) {
  console.error("Lockfile policy failed: package-lock.json is required.");
  process.exit(1);
}

if (present.length > 1) {
  console.error(`Lockfile policy failed: found multiple lockfiles (${present.join(", ")}).`);
  console.error("Use npm only and keep package-lock.json as the single lockfile.");
  process.exit(1);
}

console.log("Lockfile policy passed: npm-only lockfile configuration is valid.");
