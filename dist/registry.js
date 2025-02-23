"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageMetadata = getPackageMetadata;
exports.getPackageVersionMetadata = getPackageVersionMetadata;
const axios_1 = __importDefault(require("axios"));
async function getPackageMetadata(packageName) {
    try {
        const url = `https://registry.npmjs.org/${packageName}`;
        const response = await axios_1.default.get(url);
        return response.data;
    }
    catch (error) {
        throw new Error(`Failed to fetch metadata for ${packageName}: ${error.message}`);
    }
}
async function getPackageVersionMetadata(packageName, version) {
    try {
        const metadata = await getPackageMetadata(packageName);
        const resolvedVersion = version === 'latest' ? metadata['dist-tags'].latest : version;
        if (!metadata.versions[resolvedVersion]) {
            throw new Error(`Version ${resolvedVersion} not found for ${packageName}`);
        }
        return metadata.versions[resolvedVersion];
    }
    catch (error) {
        throw new Error(`Failed to fetch version metadata for ${packageName}@${version}: ${error.message}`);
    }
}
