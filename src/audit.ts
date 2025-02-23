import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { PackageJson, readPackageJson } from './utils';
import { getPackageMetadata } from './registry';
import { readLockfile } from './lockfile';

interface AuditResponse {
  actions: any[];
  advisories: Record<string, any>;
  muted: any[];
  metadata: {
    vulnerabilities: Record<string, number>;
    dependencies: number;
    devDependencies: number;
    optionalDependencies: number;
    totalDependencies: number;
  };
}

interface DependencyNode {
  name: string;
  version: string;
  dependencies: DependencyNode[];
}

async function buildDependencyGraph(
  packageJson: PackageJson,
  lockfile: Record<string, string>
): Promise<DependencyNode[]> {
  const spinner = ora('Building dependency graph').start();
  const graph: DependencyNode[] = [];

  try {
    const dependencies = packageJson.dependencies || {};
    for (const [name, versionRange] of Object.entries(dependencies)) {
      const version = lockfile[name] || versionRange.replace(/^[^\d]+/, '');
      const metadata = await getPackageMetadata(name);
      const resolvedVersion = metadata.versions[version] ? version : metadata['dist-tags'].latest;

      const node: DependencyNode = {
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
    spinner.succeed(chalk.green('Dependency graph built'));
    return graph;
  } catch (error) {
    spinner.fail(chalk.red(`Failed to build dependency graph: ${(error as Error).message}`));
    throw error;
  }
}

function printDependencyGraph(graph: DependencyNode[], depth: number = 0): void {
  const indent = '  '.repeat(depth);
  graph.forEach((node) => {
    console.log(`${indent}${chalk.cyan(node.name)}@${chalk.gray(node.version)}`);
    printDependencyGraph(node.dependencies, depth + 1);
  });
}

export async function auditProject(projectPath: string): Promise<void> {
  const spinner = ora('Auditing project dependencies').start();
  try {
    const packageJson: PackageJson = await readPackageJson(projectPath);
    const lockfile = await readLockfile(projectPath);

    const response = await axios.post<AuditResponse>(
      'https://registry.npmjs.org/-/npm/v1/security/audits',
      packageJson,
      { headers: { 'Content-Type': 'application/json' } }
    );
    const auditData: AuditResponse = response.data;
    const vulnerabilities = auditData.metadata.vulnerabilities;
    const totalVulns = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);

    const dependencyGraph = await buildDependencyGraph(packageJson, lockfile);

    spinner.succeed(chalk.green('Audit completed'));
    console.log(chalk.bold('\nDependency Graph:'));
    printDependencyGraph(dependencyGraph);

    console.log(chalk.bold('\nVulnerability Report:'));
    if (totalVulns === 0) {
      console.log(chalk.green(`Found ${totalVulns} vulnerabilities`));
    } else {
      console.log(chalk.red(`Found ${totalVulns} vulnerabilities:`));
      for (const [severity, count] of Object.entries(vulnerabilities)) {
        if (count > 0) console.log(chalk.red(`  ${severity}: ${count}`));
      }
    }
  } catch (error) {
    spinner.fail(chalk.red(`Audit failed: ${(error as Error).message}`));
    process.exit(1);
  }
}