import axios from 'axios';

export interface PackageMetadata {
  name: string;
  'dist-tags': { latest: string; [key: string]: string };
  versions: Record<string, VersionMetadata>;
}

export interface VersionMetadata {
  version: string;
  dist: {
    shasum: string;
    tarball: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function getPackageMetadata(packageName: string): Promise<PackageMetadata> {
  try {
    const url: string = `https://registry.npmjs.org/${packageName}`;
    const response = await axios.get<PackageMetadata>(url);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch metadata for ${packageName}: ${(error as Error).message}`);
  }
}

export async function getPackageVersionMetadata(
  packageName: string,
  version: string
): Promise<VersionMetadata> {
  try {
    const metadata: PackageMetadata = await getPackageMetadata(packageName);
    const resolvedVersion: string = version === 'latest' ? metadata['dist-tags'].latest : version;
    if (!metadata.versions[resolvedVersion]) {
      throw new Error(`Version ${resolvedVersion} not found for ${packageName}`);
    }
    return metadata.versions[resolvedVersion];
  } catch (error) {
    throw new Error(
      `Failed to fetch version metadata for ${packageName}@${version}: ${(error as Error).message}`
    );
  }
}