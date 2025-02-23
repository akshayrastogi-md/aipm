#!/usr/bin/env node

import { Command, OptionValues } from 'commander';
import { installPackage, removePackage, updatePackage } from './install';
import { analyzeProject, suggestDependencies } from './ai';
import { setApiKey } from './config';
import { auditProject } from './audit';
import { runCommand } from './run';

const program: Command = new Command();

program
  .name('aipm')
  .description('AI-powered JavaScript Package Manager')
  .version('1.0.0');

program
  .command('install [package]')
  .description('Install a package or all dependencies from package.json if no package is specified')
  .option('--version <version>', 'Specify package version', 'latest')
  .option('-g, --global', 'Install the package globally', false)
  .action(async (packageName: string | undefined, options: OptionValues) => {
    await installPackage(process.cwd(), packageName, options.version as string, options.global as boolean);
  });

program
  .command('remove <package>')
  .description('Remove a package')
  .action(async (packageName: string) => {
    await removePackage(process.cwd(), packageName);
  });

program
  .command('update <package>')
  .description('Update a package to a specific version')
  .option('--version <version>', 'Specify version to update to', 'latest')
  .action(async (packageName: string, options: OptionValues) => {
    await updatePackage(process.cwd(), packageName, options.version as string);
  });

program
  .command('ai suggest')
  .description('Suggest dependencies using AI')
  .action(async () => {
    try {
      const keywords: string[] = await analyzeProject(process.cwd());
      const suggestion: string = await suggestDependencies(keywords);
      console.log('Suggested packages:', suggestion);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Configuration commands')
  .command('set-api-key <provider> <key>')
  .description('Set API key for AI provider (currently supports claude)')
  .action(async (provider: string, key: string) => {
    const normalizedProvider: string = provider.toLowerCase().trim();
    try {
      if (normalizedProvider !== 'claude') {
        console.error('Error: Unsupported provider. Use "claude".');
        process.exit(1);
      }
      await setApiKey(normalizedProvider as 'claude', key);
      console.log(`API key for ${normalizedProvider} set successfully`);
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

program
  .command('audit')
  .description('Audit project dependencies and display dependency graph')
  .action(async () => {
    await auditProject(process.cwd());
  });

program
  .command('run <script>')
  .description('Run a script for the project (e.g., dev, build, start)')
  .action(async (script: string) => {
    await runCommand(process.cwd(), script);
  });

program.parse(process.argv);