# AIPM - AI-Powered JavaScript Package Manager

[![npm version](https://badge.fury.io/js/aipm.svg)](https://www.npmjs.com/package/aipm)  

`aipm` is a modern, fast, and intelligent JavaScript package manager designed to streamline dependency management with a sleek user experience. Powered by Anthropic's Claude Sonnet 3.5 for AI-driven package suggestions, it offers a feature-rich alternative to traditional tools like `npm`, `pnpm`, and `bun`.

- **Version**: 1.0.0  
- **Published**: Available on npm as `aipm`

## Installation

Install `aipm` globally using npm to use it from any directory:

```bash
npm install -g aipm
```

You'll need a Claude API key for AI features (see Configuration below).

## Features

- **Fast Installation**: Efficiently installs packages with caching and content-addressable storage
- **Global and Local Installs**: Use -g for global installs or manage project-specific dependencies
- **Package Management**:
  - Install individual packages or all from package.json with `aipm install`
  - Remove packages with `aipm remove`
  - Update to specific versions with `aipm update`
- **AI-Powered Suggestions**: Analyzes .js, .jsx, .ts, and .tsx files to suggest packages using Claude Sonnet 3.5
- **Dependency Auditing**: Checks vulnerabilities and displays a dependency graph with `aipm audit`
- **Modern UX**:
  - Colorful CLI output (green for success, red for errors)
  - Real-time spinners for progress feedback
  - Timing stats (e.g., "added 1 packages in 1.23s")
- **Portable**: Bundled into a single executable with esbuild

## Getting Started

### Prerequisites

- Node.js: Version 18 or higher (tested with v23.7.0)
- Claude API Key: Required for AI suggestions (obtain from Anthropic)

### Install Globally

```bash
npm install -g aipm
```

Verify installation:

```bash
aipm --version
```
Output: 1.0.0

### Configuration

Set your Claude API key for AI-powered suggestions:

```bash
aipm config set-api-key claude YOUR_CLAUDE_API_KEY
```

## Usage

### Install a Package

**Local Install**:
```bash
aipm install axios
```
Output:
```text
✔ Installed axios@1.7.9
+ axios@1.7.9
added 1 packages, removed 0 packages in 1.23s
```

**Global Install**:
```bash
aipm install axios -g
```
Installs to ~/.aipm/global.

**Install All Dependencies**: Run in a directory with a package.json:
```bash
aipm install
```
Installs all listed dependencies.

### Remove a Package

```bash
aipm remove axios
```
Output:
```text
✔ Removed axios from node_modules
- axios
added 0 packages, removed 1 packages in 0.12s
```

### Update a Package

Update to a specific version:

```bash
aipm update axios --version 1.7.8
```
Output:
```text
✔ Updated axios to 1.7.8
+ axios@1.7.8
added 1 packages, removed 0 packages in 1.30s
```

### AI Suggestions

Suggest packages based on your code:

```bash
aipm ai suggest
```
Analyzes .js, .jsx, .ts, and .tsx files in the current directory.

Example with `let express = require('express');`:
```text
Suggested packages: express
```

If no files are found:
```text
No .ts, .js, .jsx, or .tsx files found in the current directory to analyze.
Suggested packages: Here are some popular JavaScript packages: lodash, axios, moment
```

### Audit Dependencies

Check vulnerabilities and view the dependency graph:

```bash
aipm audit
```
Output:
```text
✔ Audit completed

Dependency Graph:
axios@1.7.9
  follow-redirects@1.15.6
  form-data@4.0.0
  proxy-from-env@1.1.0

Vulnerability Report:
Found 0 vulnerabilities
```

## Commands

| Command | Description | Options |
|---------|-------------|----------|
| `aipm install [package]` | Install a package or all from package.json | `-g`, `--version <version>` |
| `aipm remove <package>` | Remove a package (local only) | |
| `aipm update <package>` | Update a package to a specific version | `--version <version>` |
| `aipm ai suggest` | Suggest packages based on code analysis | |
| `aipm config set-api-key <provider> <key>` | Set Claude API key | Provider: claude |
| `aipm audit` | Audit dependencies and show graph | |

## Configuration

- **Cache**: Stored in ~/.aipm/cache
- **Store**: Packages are kept in ~/.aipm/store using content hashes
- **Global Installs**: Managed in ~/.aipm/global

## Limitations

- **TypeScript Parsing**: Uses esprima, which supports .js and .jsx fully but may skip .ts/.tsx files with TypeScript-specific syntax (e.g., types). Warnings are provided for unparsable files.
- **Nested Dependencies**: Installs top-level dependencies only; sub-dependencies are listed in the audit graph but not recursively installed.
- **Global Remove**: `remove` is currently local-only; global uninstall is not yet supported.

## Contributing

We welcome contributions to AIPM! Here's how you can help:

### Development Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/akshayrastogi-md/aipm.git
cd aipm
```

2. Install dependencies:
```bash
npm install
```

3. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

### Guidelines

- Follow the existing code style and formatting
- Write clear commit messages following [Conventional Commits](https://www.conventionalcommits.org/)
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting a pull request

### Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the version number following [SemVer](https://semver.org/)
3. Submit a pull request with a clear description of the changes
4. Wait for code review and address any feedback

### Bug Reports

When filing an issue, please include:

- A clear description of the problem
- Steps to reproduce the issue
- Expected vs actual behavior
- Version of AIPM and Node.js
- Operating system information

## Keywords

`package-manager`, `javascript`, `nodejs`, `ai`, `claude`, `dependency-management`, `npm-alternative`, `fast-install`, `typescript`, `package-installer`, `cli-tool`, `anthropic`, `content-addressable-storage`, `caching`, `package-auditing`