import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import axios from 'axios';
import * as tar from 'tar';
import chalk from 'chalk';
import ora from 'ora';
import { PackageJson, readPackageJson, writePackageJson } from './utils';
import { VersionMetadata, getPackageVersionMetadata } from './registry';
import { Lockfile, generateLockfile, readLockfile } from './lockfile';

const cacheDir: string = path.join(os.homedir(), '.aipm', 'cache');
const storeDir: string = path.join(os.homedir(), '.aipm', 'store');
const globalDir: string = path.join(os.homedir(), '.aipm', 'global');

interface InstallStats {
  added: number;
  removed: number;
}

async function ensureDir(dir: string): Promise<void> {
  const spinner = ora(`Creating directory ${dir}`).start();
  try {
    await fs.mkdir(dir, { recursive: true });
    spinner.succeed(chalk.gray(`Directory ${dir} ensured`));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to ensure directory ${dir}: ${(error as Error).message}`));
    throw error;
  }
}

async function fetchPackageTarball(packageName: string, version: string): Promise<Buffer> {
  const spinner = ora(`Fetching ${packageName}@${version}`).start();
  try {
    const url: string = `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz`;
    const response = await axios.get<Buffer>(url, { responseType: 'arraybuffer' });
    spinner.succeed(chalk.green(`Fetched ${packageName}@${version}`));
    return response.data;
  } catch (error) {
    spinner.fail(chalk.red(`Failed to fetch ${packageName}@${version}: ${(error as Error).message}`));
    throw error;
  }
}

async function cachePackage(packageName: string, version: string, data: Buffer): Promise<void> {
  const spinner = ora(`Caching ${packageName}@${version}`).start();
  try {
    await ensureDir(cacheDir);
    const cachePath: string = path.join(cacheDir, `${packageName}-${version}.tgz`);
    await fs.writeFile(cachePath, data);
    spinner.succeed(chalk.gray(`Cached ${packageName}@${version}`));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to cache ${packageName}@${version}: ${(error as Error).message}`));
    throw error;
  }
}

async function getPackageHash(data: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function storePackage(packageName: string, version: string, data: Buffer): Promise<string> {
  const spinner = ora(`Storing ${packageName}@${version}`).start();
  try {
    const hash: string = await getPackageHash(data);
    const storePath: string = path.join(storeDir, hash);
    await ensureDir(storePath);
    const tempTarballPath: string = path.join(cacheDir, `${packageName}-${version}-temp.tgz`);
    await fs.writeFile(tempTarballPath, data);
    await tar.x({ file: tempTarballPath, cwd: storePath });
    await fs.unlink(tempTarballPath);
    spinner.succeed(chalk.gray(`Stored ${packageName}@${version}`));
    return storePath;
  } catch (error) {
    spinner.fail(chalk.red(`Failed to store ${packageName}@${version}: ${(error as Error).message}`));
    throw error;
  }
}

async function linkPackage(
  installPath: string,
  packageName: string,
  storePath: string,
  isGlobal: boolean
): Promise<void> {
  const spinner = ora(`Linking ${packageName}${isGlobal ? ' globally' : ''}`).start();
  try {
    const nodeModulesPath: string = path.join(installPath, 'node_modules', packageName);
    await ensureDir(path.dirname(nodeModulesPath));
    try {
      await fs.lstat(nodeModulesPath);
      await fs.rm(nodeModulesPath, { recursive: true, force: true });
      spinner.text = chalk.yellow(`Replacing existing ${packageName}${isGlobal ? ' globally' : ''}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await fs.symlink(storePath, nodeModulesPath, 'junction');
    spinner.succeed(chalk.green(`Linked ${packageName}${isGlobal ? ' globally' : ''}`));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to link ${packageName}: ${(error as Error).message}`));
    throw error;
  }
}

async function checkPackageStatus(
  packageJson: PackageJson,
  packageName: string,
  version: string
): Promise<{ isNew: boolean; previousVersion?: string }> {
  const currentDependencies: Record<string, string> = packageJson.dependencies || {};
  const previousVersion: string | undefined = currentDependencies[packageName];
  const isNew: boolean = !previousVersion || previousVersion !== `^${version}`;
  return { isNew, previousVersion };
}

async function ensureGlobalPackageJson(): Promise<void> {
  const globalPackageJsonPath = path.join(globalDir, 'package.json');
  try {
    await fs.access(globalPackageJsonPath);
  } catch {
    await ensureDir(globalDir);
    await fs.writeFile(globalPackageJsonPath, JSON.stringify({ dependencies: {} }, null, 2));
  }
}

async function installSinglePackage(
  installPath: string,
  packageName: string,
  version: string,
  isGlobal: boolean,
  stats: InstallStats
): Promise<void> {
  const spinner = ora(`Installing ${packageName}${isGlobal ? ' globally' : ''}`).start();
  try {
    if (isGlobal) await ensureGlobalPackageJson();
    const packageJson: PackageJson = await readPackageJson(installPath);
    const metadata: VersionMetadata = await getPackageVersionMetadata(packageName, version);
    const resolvedVersion: string = metadata.version;

    const { isNew } = await checkPackageStatus(packageJson, packageName, resolvedVersion);
    if (!isNew) {
      spinner.warn(chalk.yellow(`${packageName}@${resolvedVersion} is already installed${isGlobal ? ' globally' : ''}`));
      return;
    }

    const tarball: Buffer = await fetchPackageTarball(packageName, resolvedVersion);
    await cachePackage(packageName, resolvedVersion, tarball);
    const storePath: string = await storePackage(packageName, resolvedVersion, tarball);
    await linkPackage(installPath, packageName, storePath, isGlobal);

    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies[packageName] = `^${resolvedVersion}`;
    await writePackageJson(installPath, packageJson);

    const lockfile: Lockfile = await readLockfile(installPath);
    lockfile[packageName] = resolvedVersion;
    await generateLockfile(installPath, lockfile);

    stats.added += 1;
    spinner.succeed(chalk.green(`Installed ${packageName}@${resolvedVersion}${isGlobal ? ' globally' : ''}`));
    console.log(chalk.green(`+ ${packageName}@${resolvedVersion}`));
  } catch (error) {
    spinner.fail(chalk.red(`Installation failed for ${packageName}: ${(error as Error).message}`));
    throw error;
  }
}

export async function installPackage(
  projectPath: string,
  packageName?: string,
  version: string = 'latest',
  isGlobal: boolean = false
): Promise<void> {
  const stats: InstallStats = { added: 0, removed: 0 };
  const startTime = Date.now();
  const installPath = isGlobal ? globalDir : projectPath;

  try {
    if (packageName) {
      await installSinglePackage(installPath, packageName, version, isGlobal, stats);
    } else if (!isGlobal) {
      const spinner = ora('Installing project dependencies').start();
      const packageJson: PackageJson = await readPackageJson(projectPath);
      const dependencies = packageJson.dependencies || {};

      if (Object.keys(dependencies).length === 0) {
        spinner.warn(chalk.yellow('No dependencies found in package.json'));
        console.log(chalk.cyan(`added ${stats.added} packages, removed ${stats.removed} packages`));
        return;
      }

      await Promise.all(
        Object.entries(dependencies).map(([pkg, ver]) =>
          installSinglePackage(projectPath, pkg, ver.replace(/^[^\d]+/, ''), false, stats)
        )
      );
      spinner.succeed(chalk.green('Installed all project dependencies'));
    } else {
      throw new Error('Global install requires a package name');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.cyan(`added ${stats.added} packages, removed ${stats.removed} packages in ${duration}s`));
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}

export async function removePackage(projectPath: string, packageName: string): Promise<void> {
  const stats: InstallStats = { added: 0, removed: 0 };
  const spinner = ora(`Removing ${packageName}`).start();
  const startTime = Date.now();

  try {
    const packageJson: PackageJson = await readPackageJson(projectPath);
    if (!packageJson.dependencies || !packageJson.dependencies[packageName]) {
      spinner.warn(chalk.yellow(`${packageName} is not installed`));
      console.log(chalk.cyan(`added ${stats.added} packages, removed ${stats.removed} packages`));
      return;
    }

    const nodeModulesPath: string = path.join(projectPath, 'node_modules', packageName);
    try {
      await fs.lstat(nodeModulesPath);
      await fs.rm(nodeModulesPath, { recursive: true, force: true });
      spinner.succeed(chalk.green(`Removed ${packageName} from node_modules`));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      spinner.warn(chalk.yellow(`${packageName} not found in node_modules`));
    }

    delete packageJson.dependencies[packageName];
    await writePackageJson(projectPath, packageJson);

    const lockfile: Lockfile = await readLockfile(projectPath);
    delete lockfile[packageName];
    await generateLockfile(projectPath, lockfile);

    stats.removed = 1;
    console.log(chalk.red(`- ${packageName}`));
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.cyan(`added ${stats.added} packages, removed ${stats.removed} packages in ${duration}s`));
  } catch (error) {
    spinner.fail(chalk.red(`Removal failed for ${packageName}: ${(error as Error).message}`));
    process.exit(1);
  }
}

export async function updatePackage(
  projectPath: string,
  packageName: string,
  version: string
): Promise<void> {
  const stats: InstallStats = { added: 0, removed: 0 };
  const spinner = ora(`Updating ${packageName} to ${version}`).start();
  const startTime = Date.now();

  try {
    const packageJson: PackageJson = await readPackageJson(projectPath);
    if (!packageJson.dependencies || !packageJson.dependencies[packageName]) {
      spinner.fail(chalk.red(`${packageName} is not installed. Use 'install' instead.`));
      process.exit(1);
    }

    const metadata: VersionMetadata = await getPackageVersionMetadata(packageName, version);
    const resolvedVersion: string = metadata.version;

    const { isNew } = await checkPackageStatus(packageJson, packageName, resolvedVersion);
    if (!isNew) {
      spinner.warn(chalk.yellow(`${packageName}@${resolvedVersion} is already up-to-date`));
      console.log(chalk.cyan(`added ${stats.added} packages, removed ${stats.removed} packages`));
      return;
    }

    const tarball: Buffer = await fetchPackageTarball(packageName, resolvedVersion);
    await cachePackage(packageName, resolvedVersion, tarball);
    const storePath: string = await storePackage(packageName, resolvedVersion, tarball);
    await linkPackage(projectPath, packageName, storePath, false);

    packageJson.dependencies[packageName] = `^${resolvedVersion}`;
    await writePackageJson(projectPath, packageJson);

    const lockfile: Lockfile = await readLockfile(projectPath);
    lockfile[packageName] = resolvedVersion;
    await generateLockfile(projectPath, lockfile);

    stats.added = 1;
    spinner.succeed(chalk.green(`Updated ${packageName} to ${resolvedVersion}`));
    console.log(chalk.green(`+ ${packageName}@${resolvedVersion}`));
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(chalk.cyan(`added ${stats.added} packages, removed ${stats.removed} packages in ${duration}s`));
  } catch (error) {
    spinner.fail(chalk.red(`Update failed for ${packageName}: ${(error as Error).message}`));
    process.exit(1);
  }
}