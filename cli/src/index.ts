#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import path from "path";

import { initCommand } from "./commands/init";
import { startCommand } from "./commands/start";
import fs from "fs";

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")
) as { version: string };

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("brakit")
    .description("AI-powered visual code editing tool")
    .version(packageJson.version);

  program
    .command("init")
    .description("Initialize Brakit in your project")
    .action(async () => {
      await initCommand();
    });

  program
    .command("start")
    .description("Start Brakit development server with transparent proxy")
    .option("-v, --verbose", "Show detailed startup logs")
    .action(async (options) => {
      await startCommand({ verbose: options.verbose });
    });

  if (process.argv.length <= 2) {
    program.outputHelp();
    return;
  }

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`❌ ${message}`));
  process.exit(1);
});
