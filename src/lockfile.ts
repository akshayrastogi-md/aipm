import * as fs from 'fs/promises';
import * as path from 'path';

export type Lockfile = Record<string, string>;

export async function readLockfile(projectPath: string): Promise<Lockfile> {
  try {
    const lockfilePath: string = path.join(projectPath, 'aipm-lock.json');
    const content: string = await fs.readFile(lockfilePath, 'utf-8');
    return JSON.parse(content) as Lockfile;
  } catch (error) {
    return {};
  }
}

export async function generateLockfile(projectPath: string, installedPackages: Lockfile): Promise<void> {
  try {
    const lockfilePath: string = path.join(projectPath, 'aipm-lock.json');
    await fs.writeFile(lockfilePath, JSON.stringify(installedPackages, null, 2));
  } catch (error) {
    throw new Error(`Failed to generate lockfile: ${(error as Error).message}`);
  }
}