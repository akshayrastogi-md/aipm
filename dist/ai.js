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
exports.analyzeProject = analyzeProject;
exports.suggestDependencies = suggestDependencies;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const esprima = __importStar(require("esprima"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const config_1 = require("./config");
async function analyzeProject(projectPath) {
    try {
        const files = await fs.readdir(projectPath);
        const jsFiles = files.filter((file) => file.endsWith('.js'));
        const keywords = new Set();
        if (jsFiles.length === 0) {
            console.warn('No JavaScript files found in the current directory to analyze.');
            return [];
        }
        for (const file of jsFiles) {
            const filePath = path.join(projectPath, file);
            const code = await fs.readFile(filePath, 'utf-8');
            const ast = esprima.parseScript(code);
            ast.body.forEach((node) => {
                if (node.type === 'VariableDeclaration') {
                    node.declarations.forEach((decl) => {
                        if (decl.id.type === 'Identifier') {
                            keywords.add(decl.id.name);
                        }
                    });
                }
            });
        }
        return Array.from(keywords);
    }
    catch (error) {
        throw new Error(`Failed to analyze project: ${error.message}`);
    }
}
async function suggestDependencies(projectKeywords) {
    try {
        const apiKey = await (0, config_1.getApiKey)('claude');
        if (!apiKey) {
            throw new Error('Claude API key not configured. Use "aipm config set-api-key claude <key>"');
        }
        const anthropic = new sdk_1.default({ apiKey });
        let prompt;
        if (projectKeywords.length === 0) {
            prompt = 'Suggest some popular JavaScript packages for a general-purpose project.';
        }
        else {
            prompt = `Suggest JavaScript packages based on these keywords: ${projectKeywords.join(', ')}`;
        }
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 100,
            messages: [{ role: 'user', content: prompt }],
        });
        const contentBlock = response.content[0];
        if (contentBlock.type === 'text') {
            return contentBlock.text.trim();
        }
        else {
            throw new Error('Unexpected response format from Claude: No text content found');
        }
    }
    catch (error) {
        throw new Error(`Failed to suggest dependencies: ${error.message}`);
    }
}
