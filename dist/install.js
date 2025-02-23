"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.installPackage = installPackage;
exports.removePackage = removePackage;
exports.updatePackage = updatePackage;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const tar = __importStar(require("tar"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const utils_1 = require("./utils");
const registry_1 = require("./registry");
const lockfile_1 = require("./lockfile");
const cacheDir = path.join(os.homedir(), '.aipm', 'cache');
const storeDir = path.join(os.homedir(), '.aipm', 'store');
const globalDir = path.join(os.homedir(), '.aipm', 'global');
async function ensureDir(dir) {
    const spinner = (0, ora_1.default)(`Creating directory ${dir}`).start();
    try {
        await fs.mkdir(dir, { recursive: true });
        spinner.succeed(chalk_1.default.gray(`Directory ${dir} ensured`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to ensure directory ${dir}: ${error.message}`));
        throw error;
    }
}
async function fetchPackageTarball(packageName, version) {
    const spinner = (0, ora_1.default)(`Fetching ${packageName}@${version}`).start();
    try {
        const url = `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz`;
        const response = await axios_1.default.get(url, { responseType: 'arraybuffer' });
        spinner.succeed(chalk_1.default.green(`Fetched ${packageName}@${version}`));
        return response.data;
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to fetch ${packageName}@${version}: ${error.message}`));
        throw error;
    }
}
async function cachePackage(packageName, version, data) {
    const spinner = (0, ora_1.default)(`Caching ${packageName}@${version}`).start();
    try {
        await ensureDir(cacheDir);
        const cachePath = path.join(cacheDir, `${packageName}-${version}.tgz`);
        await fs.writeFile(cachePath, data);
        spinner.succeed(chalk_1.default.gray(`Cached ${packageName}@${version}`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to cache ${packageName}@${version}: ${error.message}`));
        throw error;
    }
}
async function getPackageHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}
async function storePackage(packageName, version, data) {
    const spinner = (0, ora_1.default)(`Storing ${packageName}@${version}`).start();
    try {
        const hash = await getPackageHash(data);
        const storePath = path.join(storeDir, hash);
        await ensureDir(storePath);
        const tempTarballPath = path.join(cacheDir, `${packageName}-${version}-temp.tgz`);
        await fs.writeFile(tempTarballPath, data);
        await tar.x({ file: tempTarballPath, cwd: storePath });
        await fs.unlink(tempTarballPath);
        spinner.succeed(chalk_1.default.gray(`Stored ${packageName}@${version}`));
        return storePath;
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to store ${packageName}@${version}: ${error.message}`));
        throw error;
    }
}
async function linkPackage(installPath, packageName, storePath, isGlobal) {
    const spinner = (0, ora_1.default)(`Linking ${packageName}${isGlobal ? ' globally' : ''}`).start();
    try {
        const nodeModulesPath = path.join(installPath, 'node_modules', packageName);
        await ensureDir(path.dirname(nodeModulesPath));
        try {
            await fs.lstat(nodeModulesPath);
            await fs.rm(nodeModulesPath, { recursive: true, force: true });
            spinner.text = chalk_1.default.yellow(`Replacing existing ${packageName}${isGlobal ? ' globally' : ''}`);
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
        await fs.symlink(storePath, nodeModulesPath, 'junction');
        spinner.succeed(chalk_1.default.green(`Linked ${packageName}${isGlobal ? ' globally' : ''}`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Failed to link ${packageName}: ${error.message}`));
        throw error;
    }
}
async function checkPackageStatus(packageJson, packageName, version) {
    const currentDependencies = packageJson.dependencies || {};
    const previousVersion = currentDependencies[packageName];
    const isNew = !previousVersion || previousVersion !== `^${version}`;
    return { isNew, previousVersion };
}
async function ensureGlobalPackageJson() {
    const globalPackageJsonPath = path.join(globalDir, 'package.json');
    try {
        await fs.access(globalPackageJsonPath);
    }
    catch {
        await ensureDir(globalDir);
        await fs.writeFile(globalPackageJsonPath, JSON.stringify({ dependencies: {} }, null, 2));
    }
}
async function installSinglePackage(installPath, packageName, version, isGlobal, stats) {
    const spinner = (0, ora_1.default)(`Installing ${packageName}${isGlobal ? ' globally' : ''}`).start();
    try {
        if (isGlobal)
            await ensureGlobalPackageJson();
        const packageJson = await (0, utils_1.readPackageJson)(installPath);
        const metadata = await (0, registry_1.getPackageVersionMetadata)(packageName, version);
        const resolvedVersion = metadata.version;
        const { isNew } = await checkPackageStatus(packageJson, packageName, resolvedVersion);
        if (!isNew) {
            spinner.warn(chalk_1.default.yellow(`${packageName}@${resolvedVersion} is already installed${isGlobal ? ' globally' : ''}`));
            return;
        }
        const tarball = await fetchPackageTarball(packageName, resolvedVersion);
        await cachePackage(packageName, resolvedVersion, tarball);
        const storePath = await storePackage(packageName, resolvedVersion, tarball);
        await linkPackage(installPath, packageName, storePath, isGlobal);
        packageJson.dependencies = packageJson.dependencies || {};
        packageJson.dependencies[packageName] = `^${resolvedVersion}`;
        await (0, utils_1.writePackageJson)(installPath, packageJson);
        const lockfile = await (0, lockfile_1.readLockfile)(installPath);
        lockfile[packageName] = resolvedVersion;
        await (0, lockfile_1.generateLockfile)(installPath, lockfile);
        stats.added += 1;
        spinner.succeed(chalk_1.default.green(`Installed ${packageName}@${resolvedVersion}${isGlobal ? ' globally' : ''}`));
        console.log(chalk_1.default.green(`+ ${packageName}@${resolvedVersion}`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Installation failed for ${packageName}: ${error.message}`));
        throw error;
    }
}
async function installPackage(projectPath, packageName, version = 'latest', isGlobal = false) {
    const stats = { added: 0, removed: 0 };
    const startTime = Date.now();
    const installPath = isGlobal ? globalDir : projectPath;
    try {
        if (packageName) {
            // Install a single package
            await installSinglePackage(installPath, packageName, version, isGlobal, stats);
        }
        else if (!isGlobal) {
            // Install all dependencies from package.json
            const spinner = (0, ora_1.default)('Installing project dependencies').start();
            const packageJson = await (0, utils_1.readPackageJson)(projectPath);
            const dependencies = packageJson.dependencies || {};
            if (Object.keys(dependencies).length === 0) {
                spinner.warn(chalk_1.default.yellow('No dependencies found in package.json'));
                console.log(chalk_1.default.cyan(`added ${stats.added} packages, removed ${stats.removed} packages`));
                return;
            }
            await Promise.all(Object.entries(dependencies).map(([pkg, ver]) => installSinglePackage(projectPath, pkg, ver.replace(/^[^\d]+/, ''), false, stats)));
            spinner.succeed(chalk_1.default.green('Installed all project dependencies'));
        }
        else {
            throw new Error('Global install requires a package name');
        }
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(chalk_1.default.cyan(`added ${stats.added} packages, removed ${stats.removed} packages in ${duration}s`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`Error: ${error.message}`));
        process.exit(1);
    }
}
async function removePackage(projectPath, packageName) {
    const stats = { added: 0, removed: 0 };
    const spinner = (0, ora_1.default)(`Removing ${packageName}`).start();
    const startTime = Date.now();
    try {
        const packageJson = await (0, utils_1.readPackageJson)(projectPath);
        if (!packageJson.dependencies || !packageJson.dependencies[packageName]) {
            spinner.warn(chalk_1.default.yellow(`${packageName} is not installed`));
            console.log(chalk_1.default.cyan(`added ${stats.added} packages, removed ${stats.removed} packages`));
            return;
        }
        const nodeModulesPath = path.join(projectPath, 'node_modules', packageName);
        try {
            await fs.lstat(nodeModulesPath);
            await fs.rm(nodeModulesPath, { recursive: true, force: true });
            spinner.succeed(chalk_1.default.green(`Removed ${packageName} from node_modules`));
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            spinner.warn(chalk_1.default.yellow(`${packageName} not found in node_modules`));
        }
        delete packageJson.dependencies[packageName];
        await (0, utils_1.writePackageJson)(projectPath, packageJson);
        const lockfile = await (0, lockfile_1.readLockfile)(projectPath);
        delete lockfile[packageName];
        await (0, lockfile_1.generateLockfile)(projectPath, lockfile);
        stats.removed = 1;
        console.log(chalk_1.default.red(`- ${packageName}`));
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(chalk_1.default.cyan(`added ${stats.added} packages, removed ${stats.removed} packages in ${duration}s`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Removal failed for ${packageName}: ${error.message}`));
        process.exit(1);
    }
}
async function updatePackage(projectPath, packageName, version) {
    const stats = { added: 0, removed: 0 };
    const spinner = (0, ora_1.default)(`Updating ${packageName} to ${version}`).start();
    const startTime = Date.now();
    try {
        const packageJson = await (0, utils_1.readPackageJson)(projectPath);
        if (!packageJson.dependencies || !packageJson.dependencies[packageName]) {
            spinner.fail(chalk_1.default.red(`${packageName} is not installed. Use 'install' instead.`));
            process.exit(1);
        }
        const metadata = await (0, registry_1.getPackageVersionMetadata)(packageName, version);
        const resolvedVersion = metadata.version;
        const { isNew } = await checkPackageStatus(packageJson, packageName, resolvedVersion);
        if (!isNew) {
            spinner.warn(chalk_1.default.yellow(`${packageName}@${resolvedVersion} is already up-to-date`));
            console.log(chalk_1.default.cyan(`added ${stats.added} packages, removed ${stats.removed} packages`));
            return;
        }
        const tarball = await fetchPackageTarball(packageName, resolvedVersion);
        await cachePackage(packageName, resolvedVersion, tarball);
        const storePath = await storePackage(packageName, resolvedVersion, tarball);
        await linkPackage(projectPath, packageName, storePath, false);
        packageJson.dependencies[packageName] = `^${resolvedVersion}`;
        await (0, utils_1.writePackageJson)(projectPath, packageJson);
        const lockfile = await (0, lockfile_1.readLockfile)(projectPath);
        lockfile[packageName] = resolvedVersion;
        await (0, lockfile_1.generateLockfile)(projectPath, lockfile);
        stats.added = 1;
        spinner.succeed(chalk_1.default.green(`Updated ${packageName} to ${resolvedVersion}`));
        console.log(chalk_1.default.green(`+ ${packageName}@${resolvedVersion}`));
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(chalk_1.default.cyan(`added ${stats.added} packages, removed ${stats.removed} packages in ${duration}s`));
    }
    catch (error) {
        spinner.fail(chalk_1.default.red(`Update failed for ${packageName}: ${error.message}`));
        process.exit(1);
    }
}
