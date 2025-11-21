import fs from "fs";
import path from "path";
import chalk from "chalk";

export async function initCommand(): Promise<void> {
  console.log(chalk.blue("🚀 Initializing Brakit..."));

  const projectRoot = process.cwd();

  await ensureConfigFile(projectRoot);
  await ensureLoaderFile(projectRoot);
  await ensureGitignoreEntries(projectRoot);

  console.log(chalk.green("\n✅ Brakit initialized successfully!"));
  console.log(chalk.cyan("\n📝 Next steps:"));
  console.log(
    chalk.white("  1. Run 'npx brakit start' to start the development server")
  );
  console.log(
    chalk.white(
      "  2. Brakit will pick free ports automatically — check the console output"
    )
  );
  console.log(chalk.white("  3. Look for the ✨ bubble to start editing!\n"));
}

async function ensureConfigFile(projectRoot: string): Promise<void> {
  const brakitDir = path.join(projectRoot, ".brakit");
  if (!fs.existsSync(brakitDir)) {
    fs.mkdirSync(brakitDir, { recursive: true });
    console.log(chalk.green("✅ Created .brakit/ directory"));
  }

  const configPath = path.join(brakitDir, "config.json");
  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow("⚠️  .brakit/config.json already exists"));
    return;
  }

  const configContent = {
    backend: {
      host: "localhost",
    },
    overlay: {
      enabled: true,
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2), "utf8");
  console.log(chalk.green("✅ Created .brakit/config.json"));
}

async function ensureLoaderFile(projectRoot: string): Promise<void> {
  const loaderPath = path.join(projectRoot, ".brakit", "loader.js");
  const loaderDir = path.dirname(loaderPath);
  if (!fs.existsSync(loaderDir)) {
    fs.mkdirSync(loaderDir, { recursive: true });
  }

  if (fs.existsSync(loaderPath)) {
    console.log(chalk.yellow("⚠️  .brakit/loader.js already exists"));
    return;
  }

  const loaderContent = `// Brakit loader - automatically generated
// This file is used by the Brakit proxy to inject the overlay
module.exports = {
  inject: true,
};
`;

  fs.writeFileSync(loaderPath, loaderContent, "utf8");
  console.log(chalk.green("✅ Created .brakit/loader.js"));
}

async function ensureGitignoreEntries(projectRoot: string): Promise<void> {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  const entries = [".brakit/"];

  if (fs.existsSync(gitignorePath)) {
    let content = fs.readFileSync(gitignorePath, "utf8");
    let updated = false;

    for (const entry of entries) {
      if (!content.includes(entry)) {
        content += `\n${entry}`;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(gitignorePath, content, "utf8");
      console.log(chalk.green("✅ Updated .gitignore"));
    } else {
      console.log(chalk.yellow("⚠️  .gitignore already has Brakit entries"));
    }
  } else {
    fs.writeFileSync(gitignorePath, `${entries.join("\n")}\n`, "utf8");
    console.log(chalk.green("✅ Created .gitignore"));
  }
}

export default { initCommand };
