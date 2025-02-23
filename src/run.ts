import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { PackageJson, readPackageJson } from './utils';

interface ProjectConfig {
  type: string;
  commands: Record<string, string[]>;
}

async function detectProjectType(projectPath: string): Promise<ProjectConfig> {
  const spinner = ora('Detecting project type').start();
  try {
    const packageJson: PackageJson = await readPackageJson(projectPath);
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const files = await fs.readdir(projectPath);
    
    if (files.includes('next.config.js') || dependencies['next']) {
      spinner.succeed(chalk.green('Detected Next.js project'));
      return {
        type: 'Next.js',
        commands: {
          dev: ['next', 'dev'],
          build: ['next', 'build'],
          start: ['next', 'start'],
        },
      };
    } else if (dependencies['react-native'] || files.includes('App.js')) {
      spinner.succeed(chalk.green('Detected React Native project'));
      return {
        type: 'React Native',
        commands: {
          dev: ['react-native', 'run-ios'],
          build: ['react-native', 'bundle', '--platform', 'ios', '--dev', 'false'],
          start: ['react-native', 'start'],
        },
      };
    } else if (dependencies['@nestjs/core']) {
      spinner.succeed(chalk.green('Detected Nest.js project'));
      return {
        type: 'Nest.js',
        commands: {
          dev: ['nest', 'start', '--watch'],
          build: ['nest', 'build'],
          start: ['nest', 'start'],
        },
      };
    } else if (dependencies['react'] && !dependencies['next']) {
      spinner.succeed(chalk.green('Detected React.js project'));
      return {
        type: 'React.js',
        commands: {
          dev: ['react-scripts', 'start'],
          build: ['react-scripts', 'build'],
          start: ['serve', '-s', 'build'],
        },
      };
    } else if (dependencies['express'] || !Object.keys(dependencies).length) {
      spinner.succeed(chalk.green('Detected Node.js project'));
      return {
        type: 'Node.js',
        commands: {
          dev: ['node', 'index.js'],
          build: ['tsc'],
          start: ['node', 'dist/index.js'],
        },
      };
    }

    spinner.succeed(chalk.green('Detected generic JavaScript project'));
    return {
      type: 'JavaScript',
      commands: {
        dev: ['node', 'index.js'],
        build: [],
        start: ['node', 'index.js'],
      },
    };
  } catch (error) {
    spinner.fail(chalk.red(`Failed to detect project type: ${(error as Error).message}`));
    throw error;
  }
}

export async function runCommand(projectPath: string, script: string): Promise<void> {
  const spinner = ora(`Running ${script}`).start();
  try {
    const packageJson: PackageJson = await readPackageJson(projectPath);
    const scripts = packageJson.scripts || {};

    if (scripts[script]) {
      spinner.text = `Executing npm run ${script}`;
      await executeCommand(projectPath, ['npm', 'run', script]);
      spinner.succeed(chalk.green(`Ran ${script} successfully`));
      return;
    }

    const projectConfig = await detectProjectType(projectPath);
    const command = projectConfig.commands[script];

    if (!command || command.length === 0) {
      spinner.fail(chalk.red(`No ${script} command defined for ${projectConfig.type} project`));
      console.log(chalk.yellow(`Try adding a "${script}" script to your package.json`));
      process.exit(1);
    }

    spinner.text = `Running ${script} for ${projectConfig.type}`;
    await executeCommand(projectPath, command);
    spinner.succeed(chalk.green(`Ran ${script} for ${projectConfig.type} successfully`));
  } catch (error) {
    spinner.fail(chalk.red(`Failed to run ${script}: ${(error as Error).message}`));
    process.exit(1);
  }
}

function executeCommand(projectPath: string, command: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command[0], command.slice(1), {
      cwd: projectPath,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('error', (error) => reject(error));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });
  });
}