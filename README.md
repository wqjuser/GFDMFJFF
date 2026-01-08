# JsonToDart(Freezed)

Generate Freezed Dart models from JSON in Flutter projects.
Available on the VS Code Marketplace.

## Usage

1. Open a Flutter workspace (a folder containing `pubspec.yaml`).
2. Right-click a folder in the Explorer.
3. Choose **JsonToDart(Freezed)**.
4. Fill in the class name and JSON text, then click **MAKE**.

The extension creates a `.dart` file in the selected folder with Freezed models.

## Build

### Requirements

- Node.js
- npm

### Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (rebuild on changes)
npm run watch

# Package the VSIX extension
npx @vscode/vsce package
```
