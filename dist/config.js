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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiKey = getApiKey;
exports.setApiKey = setApiKey;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const configDir = path.join(os.homedir(), '.aipm');
const configPath = path.join(configDir, 'config.json');
async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}
async function getApiKey(provider) {
    try {
        await ensureDir(configDir);
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        return config[provider];
    }
    catch (error) {
        return undefined;
    }
}
async function setApiKey(provider, key) {
    try {
        let config = {};
        await ensureDir(configDir);
        try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(configContent);
        }
        catch (error) {
            // Config file doesn't exist yet
        }
        config[provider] = key;
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
    catch (error) {
        throw new Error(`Failed to set API key for ${provider}: ${error.message}`);
    }
}
