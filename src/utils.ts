import * as fs from 'fs/promises';
import * as path from 'path';

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: any;
}

export async function readPackageJson(projectPath: string): Promise<PackageJson> {
  try {
    const packageJsonPath: string = path.join(projectPath, 'package.json');
    const content: string = await fs.readFile(packageJsonPath, 'utf-8');
    return JSON.parse(content) as PackageJson;
  } catch (error) {
    throw new Error(`Failed to read package.json: ${(error as Error).message}`);
  }
}

export async function writePackageJson(projectPath: string, data: PackageJson): Promise<void> {
  try {
    const packageJsonPath: string = path.join(projectPath, 'package.json');
    await fs.writeFile(packageJsonPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write package.json: ${(error as Error).message}`);
  }
}