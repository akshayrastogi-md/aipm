"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditProject = auditProject;
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const utils_1 = require("./utils");
const registry_1 = require("./registry");
const lockfile_1 = require("./lockfile");
async function buildDependencyGraph(packageJson, lockfile) {
    const spinner = (0, ora_1.default)('Building dependency graph').start();
    const graph = [];
    try {
        const dependencies = packageJson.dependencies || {};
        for (const [name, versionRange] of Object.entries(dependencies)) {
            const version = lockfile[name] || versionRange.replace(/^[^\d]+/, '');
            const metadata = await (0, registry_1.getPackageMetadata)(name);
            const resolvedVersion = metadata.versions[version] ? version : metadata['dist-tags'].latest;
            const node = {
                name,
                version: resolvedVersion,
                dependencies: [],
            };
            const subDependencies = metadata.versions[resolvedVersion].dependencies || {};
            for (const subName of Object.keys(subDependencies)) {
                const subVersion = lockfile[subName] || subDependencies[subName].replace(/^[^\d]+/, '');
                node.dependencies.push({
                    name: subName,
                    version: subVersion,
                    dependencies: [],
                });
            }
            graph.push(node);
        }
        spinner.succeed(chalk_1.default.green('Dependency graph built'));
        return graph;
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to build dependency graph: ${error.message}`));
        throw error;
    }
}
function printDependencyGraph(graph, depth = 0) {
    const indent = '  '.repeat(depth);
    graph.forEach((node) => {
        console.log(`${indent}${chalk_1.default.cyan(node.name)}@${chalk_1.default.gray(node.version)}`);
        printDependencyGraph(node.dependencies, depth + 1);
    });
}
async function auditProject(projectPath) {
    const spinner = (0, ora_1.default)('Auditing project dependencies').start();
    try {
        const packageJson = await (0, utils_1.readPackageJson)(projectPath);
        const lockfile = await (0, lockfile_1.readLockfile)(projectPath);
        const response = await axios_1.default.post('https://registry.npmjs.org/-/npm/v1/security/audits', packageJson, { headers: { 'Content-Type': 'application/json' } });
        const auditData = response.data;
        const vulnerabilities = auditData.metadata.vulnerabilities;
        const totalVulns = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);
        const dependencyGraph = await buildDependencyGraph(packageJson, lockfile);
        spinner.succeed(chalk_1.default.green('Audit completed'));
        console.log(chalk_1.default.bold('\nDependency Graph:'));
        printDependencyGraph(dependencyGraph);
        console.log(chalk_1.default.bold('\nVulnerability Report:'));
        if (totalVulns === 0) {
            console.log(chalk_1.default.green(`Found ${totalVulns} vulnerabilities`));
        }
        else {
            console.log(chalk_1.default.red(`Found ${totalVulns} vulnerabilities:`));
            for (const [severity, count] of Object.entries(vulnerabilities)) {
                if (count > 0)
                    console.log(chalk_1.default.red(`  ${severity}: ${count}`));
            }
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Audit failed: ${error.message}`));
        process.exit(1);
    }
}
