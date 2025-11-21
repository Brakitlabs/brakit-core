import chalk from "chalk";
import path from "path";
import fs from "fs";
import https from "https";

const packageJson = require(path.resolve(__dirname, "../../../package.json"));

interface UpdateCheckOptions {
  isVerbose?: boolean;
}

interface CacheData {
  lastChecked: number;
  latestVersion: string;
}

const CACHE_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || "/tmp",
  ".brakit-update-cache.json"
);
const CHECK_INTERVAL = 1000 * 60 * 60 * 24; // 24 hours

export async function checkForUpdates(
  options: UpdateCheckOptions = {}
): Promise<void> {
  const { isVerbose } = options;

  try {
    // Check if we should run the update check (once per day)
    const shouldCheck = shouldCheckForUpdate();
    if (!shouldCheck) {
      if (isVerbose) {
        console.log(chalk.gray("  Update check skipped (cached)"));
      }
      return;
    }

    // Fetch latest version from npm registry
    const latestVersion = await fetchLatestVersion();

    if (!latestVersion) {
      if (isVerbose) {
        console.log(chalk.gray("  Could not fetch latest version"));
      }
      return;
    }

    // Save to cache
    saveCacheData({ lastChecked: Date.now(), latestVersion });

    // Compare versions
    const currentVersion = packageJson.version;
    if (isNewerVersion(latestVersion, currentVersion)) {
      showUpdateNotification(currentVersion, latestVersion, isVerbose);
    }
  } catch (error) {
    // Silently fail - don't interrupt user's workflow
    if (isVerbose) {
      console.log(
        chalk.gray(`  Update check failed: ${(error as Error).message}`)
      );
    }
  }
}

function shouldCheckForUpdate(): boolean {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return true;
    }

    const cacheData: CacheData = JSON.parse(
      fs.readFileSync(CACHE_FILE, "utf8")
    );
    const timeSinceLastCheck = Date.now() - cacheData.lastChecked;

    return timeSinceLastCheck > CHECK_INTERVAL;
  } catch (error) {
    // If cache is corrupted, check for update
    return true;
  }
}

function saveCacheData(data: CacheData): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), "utf8");
  } catch (error) {
    // Silently fail if can't write cache
  }
}

function fetchLatestVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: "registry.npmjs.org",
      path: "/brakit/latest",
      method: "GET",
      timeout: 3000, // 3 second timeout
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json.version || null);
        } catch (error) {
          resolve(null);
        }
      });
    });

    req.on("error", () => {
      resolve(null);
    });

    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

function isNewerVersion(latest: string, current: string): boolean {
  try {
    const latestParts = latest.split(".").map(Number);
    const currentParts = current.split(".").map(Number);

    for (let i = 0; i < 3; i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }

    return false;
  } catch (error) {
    return false;
  }
}

function showUpdateNotification(
  current: string,
  latest: string,
  isVerbose?: boolean
): void {
  const installCommand = `npm install --save-dev brakit@latest`;

  const updateBox = `
╭${"─".repeat(58)}╮
│${" ".repeat(58)}│
│   ${chalk.yellow("Update available:")} ${chalk.dim(current)} ${chalk.reset("→")} ${chalk.green(latest)}${" ".repeat(58 - 26 - current.length - latest.length)}│
│${" ".repeat(58)}│
│   ${chalk.cyan("Run:")} ${chalk.bold(installCommand)}${" ".repeat(58 - 6 - installCommand.length)}│
│${" ".repeat(58)}│
╰${"─".repeat(58)}╯
`;

  console.log(updateBox);

  if (isVerbose) {
    console.log(chalk.gray(`  Current: ${current}`));
    console.log(chalk.gray(`  Latest: ${latest}`));
    console.log("");
  }
}
