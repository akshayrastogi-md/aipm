import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface Config {
  claude?: string;
  [key: string]: string | undefined;
}

const configDir: string = path.join(os.homedir(), '.aipm');
const configPath: string = path.join(configDir, 'config.json');

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function getApiKey(provider: 'claude'): Promise<string | undefined> {
  try {
    await ensureDir(configDir);
    const configContent: string = await fs.readFile(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);
    return config[provider];
  } catch (error) {
    return undefined;
  }
}

export async function setApiKey(provider: 'claude', key: string): Promise<void> {
  try {
    let config: Config = {};
    await ensureDir(configDir);
    try {
      const configContent: string = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch (error) {
    }
    config[provider] = key;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new Error(`Failed to set API key for ${provider}: ${(error as Error).message}`);
  }
}