# JsonToDart(Freezed)

Generate Freezed Dart models from JSON in Flutter projects.

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
# 安装依赖
npm install

# 编译 TypeScript
npm run compile

# 开发模式（监听文件变化自动编译）
npm run watch

# 打包 VSIX 扩展
npx @vscode/vsce package
```
