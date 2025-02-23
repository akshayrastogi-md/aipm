#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const install_1 = require("./install");
const ai_1 = require("./ai");
const config_1 = require("./config");
const audit_1 = require("./audit");
const program = new commander_1.Command();
program
    .name('aipm')
    .description('AI-powered JavaScript Package Manager')
    .version('1.0.0');
program
    .command('install [package]')
    .description('Install a package or all dependencies from package.json if no package is specified')
    .option('--version <version>', 'Specify package version', 'latest')
    .option('-g, --global', 'Install the package globally', false)
    .action(async (packageName, options) => {
    await (0, install_1.installPackage)(process.cwd(), packageName, options.version, options.global);
});
program
    .command('remove <package>')
    .description('Remove a package')
    .action(async (packageName) => {
    await (0, install_1.removePackage)(process.cwd(), packageName);
});
program
    .command('update <package>')
    .description('Update a package to a specific version')
    .option('--version <version>', 'Specify version to update to', 'latest')
    .action(async (packageName, options) => {
    await (0, install_1.updatePackage)(process.cwd(), packageName, options.version);
});
program
    .command('ai suggest')
    .description('Suggest dependencies using AI')
    .action(async () => {
    try {
        const keywords = await (0, ai_1.analyzeProject)(process.cwd());
        const suggestion = await (0, ai_1.suggestDependencies)(keywords);
        console.log('Suggested packages:', suggestion);
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('config')
    .description('Configuration commands')
    .command('set-api-key <provider> <key>')
    .description('Set API key for AI provider (currently supports claude)')
    .action(async (provider, key) => {
    const normalizedProvider = provider.toLowerCase().trim();
    try {
        if (normalizedProvider !== 'claude') {
            console.error('Error: Unsupported provider. Use "claude".');
            process.exit(1);
        }
        await (0, config_1.setApiKey)(normalizedProvider, key);
        console.log(`API key for ${normalizedProvider} set successfully`);
    }
    catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
});
program
    .command('audit')
    .description('Audit project dependencies and display dependency graph')
    .action(async () => {
    await (0, audit_1.auditProject)(process.cwd());
});
program.parse(process.argv);
