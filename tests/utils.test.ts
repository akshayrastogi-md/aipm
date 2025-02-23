import { readPackageJson, PackageJson } from '../src/utils';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('utils', () => {
  test('readPackageJson reads and parses package.json', async () => {
    const mockData: PackageJson = { name: 'test', version: '1.0.0' };
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockData));
    const result: PackageJson = await readPackageJson('/mock/path');
    expect(result).toEqual(mockData);
  });

  test('readPackageJson throws error on failure', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
    await expect(readPackageJson('/mock/path')).rejects.toThrow('Failed to read package.json');
  });
});