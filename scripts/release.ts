import { execSync } from "child_process";
import * as readline from "readline";

const branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
if (branch === "HEAD") {
  console.error("Error: detached HEAD state. Checkout a branch first.");
  process.exit(1);
}

const pkg = await Bun.file("package.json").json();
const currentVersion: string = pkg.version;
const [major, minor, patch] = currentVersion.split(".").map(Number);

console.log(`\nCurrent version: ${currentVersion}\n`);
console.log("Select release type:");
console.log(`  1) patch  → ${major}.${minor}.${patch + 1}`);
console.log(`  2) minor  → ${major}.${minor + 1}.0`);
console.log(`  3) major  → ${major + 1}.0.0`);
console.log("  q) quit\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const answer = await new Promise<string>((resolve) => {
  rl.question("Choice [1/2/3/q]: ", (input) => {
    rl.close();
    resolve(input.trim());
  });
});

const versionMap: Record<string, string> = {
  "1": `${major}.${minor}.${patch + 1}`,
  "2": `${major}.${minor + 1}.0`,
  "3": `${major + 1}.0.0`,
};

const nextVersion = versionMap[answer];
if (!nextVersion) {
  console.log("Aborted.");
  process.exit(0);
}

console.log(`\nReleasing v${nextVersion}...`);

pkg.version = nextVersion;
await Bun.write("package.json", JSON.stringify(pkg, null, 2) + "\n");

execSync(`git add package.json`, { stdio: "inherit" });
execSync(`git commit -m "chore: release v${nextVersion}"`, { stdio: "inherit" });
execSync(`git tag v${nextVersion}`, { stdio: "inherit" });
execSync(`git push origin ${branch} --follow-tags`, { stdio: "inherit" });

console.log(`\nv${nextVersion} pushed! GitHub Actions will handle the npm publish.`);
