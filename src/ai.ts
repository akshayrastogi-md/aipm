import * as fs from 'fs/promises';
import * as path from 'path';
import * as esprima from 'esprima';
import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from './config';


interface Identifier {
  type: 'Identifier';
  name: string;
}

interface VariableDeclarator {
  type: 'VariableDeclarator';
  id: Identifier;
  init: any;
}

interface VariableDeclaration {
  type: 'VariableDeclaration';
  declarations: VariableDeclarator[];
  kind: 'var' | 'let' | 'const';
}

interface Program {
  type: 'Program';
  body: Array<VariableDeclaration | any>;
}

export async function analyzeProject(projectPath: string): Promise<string[]> {
  try {
    const files: string[] = await fs.readdir(projectPath);
    const jsFiles: string[] = files.filter((file: string) => file.endsWith('.js'));
    const keywords: Set<string> = new Set();

    if (jsFiles.length === 0) {
      console.warn('No JavaScript files found in the current directory to analyze.');
      return [];
    }

    for (const file of jsFiles) {
      const filePath: string = path.join(projectPath, file);
      const code: string = await fs.readFile(filePath, 'utf-8');
      const ast: Program = esprima.parseScript(code) as Program;

      ast.body.forEach((node: VariableDeclaration | any) => {
        if (node.type === 'VariableDeclaration') {
          node.declarations.forEach((decl: VariableDeclarator) => {
            if (decl.id.type === 'Identifier') {
              keywords.add(decl.id.name);
            }
          });
        }
      });
    }
    return Array.from(keywords);
  } catch (error) {
    throw new Error(`Failed to analyze project: ${(error as Error).message}`);
  }
}

export async function suggestDependencies(projectKeywords: string[]): Promise<string> {
  try {
    const apiKey: string | undefined = await getApiKey('claude');
    if (!apiKey) {
      throw new Error('Claude API key not configured. Use "aipm config set-api-key claude <key>"');
    }

    const anthropic = new Anthropic({ apiKey });
    let prompt: string;
    if (projectKeywords.length === 0) {
      prompt = 'Suggest some popular JavaScript packages for a general-purpose project.';
    } else {
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
    } else {
      throw new Error('Unexpected response format from Claude: No text content found');
    }
  } catch (error) {
    throw new Error(`Failed to suggest dependencies: ${(error as Error).message}`);
  }
}