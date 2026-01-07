import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

interface GeneratorOptions {
  makeNullable: boolean;
  useDefaultValues: boolean;
  defaults: {
    stringValue: string;
    intValue: string;
    doubleValue: string;
    boolValue: string;
    listValue: string;
  };
}

interface ClassField {
  name: string;
  type: string;
  jsonKey?: string;
  converter?: string;
  defaultValue?: string;
  required: boolean;
}

interface ClassDef {
  name: string;
  fields: ClassField[];
}

const RESERVED_WORDS = new Set([
  'abstract',
  'else',
  'import',
  'show',
  'as',
  'enum',
  'in',
  'static',
  'assert',
  'export',
  'interface',
  'super',
  'async',
  'extends',
  'is',
  'switch',
  'await',
  'extension',
  'late',
  'sync',
  'break',
  'external',
  'library',
  'this',
  'case',
  'factory',
  'mixin',
  'throw',
  'catch',
  'false',
  'new',
  'true',
  'class',
  'final',
  'null',
  'try',
  'const',
  'finally',
  'on',
  'typedef',
  'continue',
  'for',
  'operator',
  'var',
  'covariant',
  'Function',
  'part',
  'void',
  'default',
  'get',
  'required',
  'while',
  'deferred',
  'hide',
  'rethrow',
  'with',
  'do',
  'if',
  'return',
  'yield'
]);

const DISALLOWED_CLASS_NAMES = new Set([
  'List',
  'Map',
  'Set',
  'Iterable',
  'Object',
  'String'
]);

const JSON_VALUE_CONVERTER_CONTENT = `import 'package:freezed_annotation/freezed_annotation.dart';

class IntJsonConverter implements JsonConverter<int, Object?> {
  const IntJsonConverter();

  @override
  int fromJson(Object? json) {
    if (json == null) {
      return 0;
    }
    if (json is int) {
      return json;
    }
    if (json is double) {
      return json.toInt();
    }
    if (json is String) {
      final int? parsed = int.tryParse(json);
      if (parsed != null) {
        return parsed;
      }
      final double? parsedDouble = double.tryParse(json);
      if (parsedDouble != null) {
        return parsedDouble.toInt();
      }
    }
    if (json is bool) {
      return json ? 1 : 0;
    }
    throw FormatException('Invalid int value: $json');
  }

  @override
  Object toJson(int object) => object;
}

class DoubleJsonConverter implements JsonConverter<double, Object?> {
  const DoubleJsonConverter();

  @override
  double fromJson(Object? json) {
    if (json == null) {
      return 0.0;
    }
    if (json is double) {
      return json;
    }
    if (json is int) {
      return json.toDouble();
    }
    if (json is String) {
      final double? parsed = double.tryParse(json);
      if (parsed != null) {
        return parsed;
      }
    }
    if (json is bool) {
      return json ? 1.0 : 0.0;
    }
    throw FormatException('Invalid double value: $json');
  }

  @override
  Object toJson(double object) => object;
}

class BoolJsonConverter implements JsonConverter<bool, Object?> {
  const BoolJsonConverter();

  @override
  bool fromJson(Object? json) {
    if (json == null) {
      return false;
    }
    if (json is bool) {
      return json;
    }
    if (json is int) {
      return json == 1;
    }
    if (json is double) {
      return json != 0;
    }
    if (json is String) {
      final String normalized = json.toLowerCase().trim();
      if (normalized == '1' || normalized == 'true') {
        return true;
      }
      if (normalized == '0' || normalized == 'false') {
        return false;
      }
    }
    throw FormatException('Invalid bool value: $json');
  }

  @override
  Object toJson(bool object) => object;
}

class StringJsonConverter implements JsonConverter<String, Object?> {
  const StringJsonConverter();

  @override
  String fromJson(Object? json) {
    if (json == null) {
      return '';
    }
    if (json is String) {
      return json;
    }
    return json.toString();
  }

  @override
  Object toJson(String object) => object;
}
`;

export function activate(context: vscode.ExtensionContext) {
  const updateFlutterContext = async () => {
    const isFlutterProject = await hasPubspec();
    await vscode.commands.executeCommand(
      'setContext',
      'jsonToDartFreezed.isFlutterProject',
      isFlutterProject
    );
  };

  updateFlutterContext();

  const watcher = vscode.workspace.createFileSystemWatcher('**/pubspec.yaml');
  watcher.onDidCreate(updateFlutterContext);
  watcher.onDidDelete(updateFlutterContext);
  watcher.onDidChange(updateFlutterContext);
  context.subscriptions.push(watcher);

  const command = vscode.commands.registerCommand(
    'jsonToDartFreezed.generate',
    async (targetUri?: vscode.Uri) => {
      if (!targetUri) {
        vscode.window.showErrorMessage('Please right-click a folder in the Explorer.');
        return;
      }

      let stat: vscode.FileStat;
      try {
        stat = await vscode.workspace.fs.stat(targetUri);
      } catch {
        vscode.window.showErrorMessage('Unable to access the selected folder.');
        return;
      }

      if ((stat.type & vscode.FileType.Directory) === 0) {
        vscode.window.showErrorMessage('Please select a folder, not a file.');
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        'jsonToDartFreezed',
        'JsonToDart (Freezed)',
        vscode.ViewColumn.Active,
        {
          enableScripts: true
        }
      );

      panel.webview.html = getWebviewContent(panel.webview);

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'cancel') {
          panel.dispose();
          return;
        }

        if (message.type !== 'generate') {
          return;
        }

        const rawClassNameInput = typeof message.className === 'string' ? message.className.trim() : '';
        const classNameInput = ensureEntitySuffix(rawClassNameInput);
        const jsonText = typeof message.jsonText === 'string' ? message.jsonText.trim() : '';

        if (!rawClassNameInput) {
          panel.webview.postMessage({
            type: 'error',
            message: 'Class name is required.'
          });
          return;
        }

        if (!jsonText) {
          panel.webview.postMessage({
            type: 'error',
            message: 'JSON text is required.'
          });
          return;
        }

        const className = toPascalCase(classNameInput);
        if (!className || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(className)) {
          panel.webview.postMessage({
            type: 'error',
            message: 'Class name must be a valid Dart identifier.'
          });
          return;
        }

        let parsed: JsonValue;
        try {
          parsed = JSON.parse(jsonText) as JsonValue;
        } catch (error) {
          panel.webview.postMessage({
            type: 'error',
            message: `Invalid JSON: ${(error as Error).message}`
          });
          return;
        }

        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
          panel.webview.postMessage({
            type: 'error',
            message: 'JSON must be an object (top-level map).' 
          });
          return;
        }

        const options: GeneratorOptions = {
          makeNullable: !!message.options?.makeNullable,
          useDefaultValues: !!message.options?.useDefaultValues,
          defaults: {
            stringValue: String(message.options?.defaults?.stringValue ?? ''),
            intValue: String(message.options?.defaults?.intValue ?? ''),
            doubleValue: String(message.options?.defaults?.doubleValue ?? ''),
            boolValue: String(message.options?.defaults?.boolValue ?? ''),
            listValue: String(message.options?.defaults?.listValue ?? '')
          }
        };

        const projectRoot = await getFlutterProjectRoot(targetUri);
        if (!projectRoot) {
          panel.webview.postMessage({
            type: 'error',
            message: 'Unable to locate Flutter project root (pubspec.yaml).'
          });
          return;
        }

        let converterFile: vscode.Uri;
        try {
          converterFile = await ensureJsonConverter(projectRoot);
        } catch (error) {
          panel.webview.postMessage({
            type: 'error',
            message: `Failed to prepare json_value_converter.dart: ${(error as Error).message}`
          });
          return;
        }

        const converterImportPath = getRelativeImportPath(targetUri, converterFile);
        const generator = new FreezedGenerator(options);
        const content = generator.generate(className, parsed as JsonObject, converterImportPath);
        const fileBase = toSnakeCase(className) || 'model';
        const fileUri = vscode.Uri.joinPath(targetUri, `${fileBase}.dart`);

        const shouldWrite = await confirmOverwrite(fileUri);
        if (!shouldWrite) {
          return;
        }

        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
        panel.dispose();
        vscode.window.showInformationMessage(`Generated ${fileBase}.dart`);

        try {
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Running build_runner...',
              cancellable: false
            },
            async () => {
              await runBuildRunner(projectRoot);
            }
          );
          vscode.window.showInformationMessage('build_runner completed.');
        } catch (error) {
          vscode.window.showErrorMessage(
            `build_runner failed: ${(error as Error).message}`
          );
        }
      });
    }
  );

  context.subscriptions.push(command);
}

export function deactivate() {}

async function hasPubspec(): Promise<boolean> {
  if (!vscode.workspace.workspaceFolders?.length) {
    return false;
  }

  const files = await vscode.workspace.findFiles('pubspec.yaml', '**/build/**', 1);
  return files.length > 0;
}

async function getFlutterProjectRoot(targetUri: vscode.Uri): Promise<vscode.Uri | undefined> {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
  if (!workspaceFolder) {
    return undefined;
  }

  const pubspecs = await vscode.workspace.findFiles(
    new vscode.RelativePattern(workspaceFolder, 'pubspec.yaml'),
    '**/build/**',
    1
  );

  if (!pubspecs.length) {
    return undefined;
  }

  return vscode.Uri.file(path.dirname(pubspecs[0].fsPath));
}

async function ensureJsonConverter(projectRoot: vscode.Uri): Promise<vscode.Uri> {
  const generateDir = vscode.Uri.file(path.join(projectRoot.fsPath, 'lib', 'generate'));
  const converterFile = vscode.Uri.joinPath(generateDir, 'json_value_converter.dart');

  try {
    await vscode.workspace.fs.stat(converterFile);
    return converterFile;
  } catch {
    await vscode.workspace.fs.createDirectory(generateDir);
    await vscode.workspace.fs.writeFile(
      converterFile,
      Buffer.from(JSON_VALUE_CONVERTER_CONTENT, 'utf8')
    );
    return converterFile;
  }
}

function getRelativeImportPath(fromFolder: vscode.Uri, targetFile: vscode.Uri): string {
  const relativePath = path.relative(fromFolder.fsPath, targetFile.fsPath);
  let relative = relativePath.replace(/\\/g, '/');

  if (!relative.startsWith('.')) {
    relative = `./${relative}`;
  }

  return relative;
}

async function confirmOverwrite(fileUri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(fileUri);
  } catch {
    return true;
  }

  const answer = await vscode.window.showWarningMessage(
    `${vscode.workspace.asRelativePath(fileUri)} already exists. Overwrite?`,
    { modal: true },
    'Overwrite'
  );

  return answer === 'Overwrite';
}

async function runBuildRunner(projectRoot: vscode.Uri): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const command = 'dart';
    const args = ['run', 'build_runner', 'build', '--delete-conflicting-outputs'];
    const process = spawn(command, args, {
      cwd: projectRoot.fsPath,
      shell: true
    });

    let stderr = '';

    process.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    process.on('error', (err) => {
      reject(err);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const message = stderr.trim() || `build_runner exited with code ${code}`;
        reject(new Error(message));
      }
    });
  });
}

class FreezedGenerator {
  private classes: ClassDef[] = [];
  private usedClassNames = new Map<string, number>();

  constructor(private options: GeneratorOptions) {}

  generate(rootName: string, rootObject: JsonObject, converterImportPath: string): string {
    this.classes = [];
    this.usedClassNames.clear();

    this.createClass(rootName, rootObject);

    const fileBase = toSnakeCase(rootName) || 'model';
    const parts = `part '${fileBase}.freezed.dart';\npart '${fileBase}.g.dart';`;
    const imports = [
      "import 'package:freezed_annotation/freezed_annotation.dart';",
      `import '${converterImportPath}';`
    ].join('\n');

    const body = this.classes.map((classDef) => this.renderClass(classDef)).join('\n\n');

    return `${imports}\n\n${parts}\n\n${body}\n`;
  }

  private createClass(
    nameHint: string,
    obj: JsonObject,
    fallbackName = 'Model',
    reservedSuffix = 'Model'
  ): string {
    const baseName = toPascalCase(nameHint) || fallbackName;
    const className = this.uniqueClassName(ensureSafeClassName(baseName, reservedSuffix));
    const classDef: ClassDef = { name: className, fields: [] };
    this.classes.push(classDef);

    const fieldNameCounts = new Map<string, number>();

    for (const [key, value] of Object.entries(obj)) {
      const field = this.inferField(key, value, fieldNameCounts);
      classDef.fields.push(field);
    }

    return className;
  }

  private inferField(
    key: string,
    value: JsonValue,
    fieldNameCounts: Map<string, number>
  ): ClassField {
    const baseName = sanitizeIdentifier(toCamelCase(key) || 'field');
    const uniqueName = uniqueFieldName(baseName, fieldNameCounts);
    const needsJsonKey = uniqueName !== key;

    const inferredType = this.inferType(key, value);
    const fieldType = this.options.makeNullable ? makeNullable(inferredType) : inferredType;
    const isNullable = fieldType.endsWith('?');
    const converter = this.converterAnnotationFor(fieldType);

    const defaultValue = this.options.useDefaultValues
      ? this.defaultValueFor(fieldType, isNullable)
      : undefined;

    return {
      name: uniqueName,
      type: fieldType,
      jsonKey: needsJsonKey ? key : undefined,
      converter,
      defaultValue,
      required: !isNullable && !defaultValue
    };
  }

  private inferType(key: string, value: JsonValue): string {
    if (value === null) {
      return 'Object?';
    }

    if (Array.isArray(value)) {
      return this.inferArrayType(key, value);
    }

    if (typeof value === 'object') {
      return this.createClass(key, value as JsonObject, 'Nested', 'Model');
    }

    if (typeof value === 'string') {
      return 'String';
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'int' : 'double';
    }

    if (typeof value === 'boolean') {
      return 'bool';
    }

    return 'dynamic';
  }

  private inferArrayType(key: string, values: JsonValue[]): string {
    if (values.length === 0) {
      return 'List<dynamic>';
    }

    let elementType = 'dynamic';
    let resolved = false;
    let hasNull = false;

    for (const item of values) {
      if (item === null) {
        hasNull = true;
        continue;
      }

      if (!resolved) {
        if (Array.isArray(item)) {
          elementType = this.inferArrayType(key, item);
        } else if (typeof item === 'object') {
          elementType = this.createClass(
            singularize(key),
            item as JsonObject,
            'Item',
            'Item'
          );
        } else {
          elementType = this.inferType(key, item);
        }

        resolved = true;
      }
    }

    if (!resolved) {
      return 'List<dynamic>';
    }

    if (hasNull && elementType !== 'dynamic' && !elementType.endsWith('?')) {
      elementType = `${elementType}?`;
    }

    return `List<${elementType}>`;
  }

  private defaultValueFor(fieldType: string, isNullable: boolean): string | undefined {
    const baseType = fieldType.replace(/\?$/, '');
    const isList = baseType.startsWith('List<');

    if (isNullable && !this.options.useDefaultValues) {
      return undefined;
    }

    if (isList) {
      const listValue = this.options.defaults.listValue.trim();
      return listValue ? listValue : 'const []';
    }

    switch (baseType) {
      case 'String': {
        const raw = this.options.defaults.stringValue;
        return `'${escapeDartString(raw)}'`;
      }
      case 'int': {
        const value = parseInt(this.options.defaults.intValue, 10);
        return Number.isFinite(value) ? String(value) : '0';
      }
      case 'double': {
        const value = parseFloat(this.options.defaults.doubleValue);
        return Number.isFinite(value) ? String(value) : '0.0';
      }
      case 'bool': {
        const raw = this.options.defaults.boolValue.trim().toLowerCase();
        return raw === 'true' || raw === 'false' ? raw : 'false';
      }
      default:
        return undefined;
    }
  }

  private converterAnnotationFor(fieldType: string): string | undefined {
    const baseType = fieldType.replace(/\?$/, '');
    if (baseType.startsWith('List<')) {
      return undefined;
    }

    switch (baseType) {
      case 'int':
        return '@IntJsonConverter()';
      case 'double':
        return '@DoubleJsonConverter()';
      case 'bool':
        return '@BoolJsonConverter()';
      case 'String':
        return '@StringJsonConverter()';
      default:
        return undefined;
    }
  }

  private renderClass(classDef: ClassDef): string {
    const lines: string[] = [];

    lines.push('@Freezed(fromJson: true, toJson: true)');
    lines.push(`abstract class ${classDef.name} with _$${classDef.name} {`);
    lines.push(`  const factory ${classDef.name}({`);

    for (const field of classDef.fields) {
      if (field.jsonKey) {
        lines.push(`    @JsonKey(name: '${escapeDartString(field.jsonKey)}')`);
      }
      if (field.converter) {
        lines.push(`    ${field.converter}`);
      }
      if (field.defaultValue) {
        lines.push(`    @Default(${field.defaultValue})`);
      }

      const requiredText = field.required ? 'required ' : '';
      lines.push(`    ${requiredText}${field.type} ${field.name},`);
    }

    lines.push(`  }) = _${classDef.name};`);
    lines.push('');
    lines.push(
      `  factory ${classDef.name}.fromJson(Map<String, dynamic> json) => _$${classDef.name}FromJson(json);`
    );
    lines.push('}');

    return lines.join('\n');
  }

  private uniqueClassName(baseName: string): string {
    const existing = this.usedClassNames.get(baseName);
    if (existing === undefined) {
      this.usedClassNames.set(baseName, 1);
      return baseName;
    }

    const next = existing + 1;
    this.usedClassNames.set(baseName, next);
    return `${baseName}${next}`;
  }
}

function uniqueFieldName(baseName: string, counts: Map<string, number>): string {
  const existing = counts.get(baseName);
  if (existing === undefined) {
    counts.set(baseName, 1);
    return baseName;
  }

  const next = existing + 1;
  counts.set(baseName, next);
  return `${baseName}${next}`;
}

function ensureEntitySuffix(input: string): string {
  if (!input) {
    return input;
  }
  if (/_entity$/i.test(input)) {
    return input;
  }
  return `${input}_entity`;
}

function ensureSafeClassName(name: string, suffix: string): string {
  if (DISALLOWED_CLASS_NAMES.has(name)) {
    return `${name}${suffix}`;
  }
  return name;
}

function toPascalCase(input: string): string {
  const parts = input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (!parts.length) {
    return '';
  }

  const result = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return /^[0-9]/.test(result) ? `X${result}` : result;
}

function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  if (!pascal) {
    return '';
  }

  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(input: string): string {
  const snake = input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .toLowerCase()
    .replace(/^_+|_+$/g, '');

  return snake;
}

function sanitizeIdentifier(input: string): string {
  let result = input.replace(/[^A-Za-z0-9_]/g, '');
  if (!result) {
    result = 'field';
  }

  if (/^[0-9]/.test(result)) {
    result = `field${result}`;
  }

  if (RESERVED_WORDS.has(result)) {
    result = `${result}Field`;
  }

  return result;
}

function singularize(input: string): string {
  if (input.length > 1 && input.endsWith('s')) {
    return input.slice(0, -1);
  }
  return input;
}

function makeNullable(typeName: string): string {
  if (typeName.endsWith('?') || typeName === 'dynamic') {
    return typeName;
  }

  return `${typeName}?`;
}

function escapeDartString(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getWebviewContent(webview: vscode.Webview): string {
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JsonToDart</title>
  <style>
    :root {
      color-scheme: dark;
      --text: #f0f6ff;
      --text-secondary: #a8c5e8;
      --muted: #6b8bb8;
      --accent: #00d4aa;
      --accent-hover: #00f5c4;
      --accent-2: #4da3ff;
      --accent-purple: #a855f7;
      --panel: rgba(12, 20, 35, 0.92);
      --panel-hover: rgba(18, 28, 48, 0.95);
      --border: rgba(100, 140, 200, 0.25);
      --border-hover: rgba(100, 180, 255, 0.4);
      --input: rgba(8, 15, 28, 0.9);
      --input-border: rgba(80, 120, 180, 0.3);
      --input-focus: #4da3ff;
      --success: #22c55e;
      --error: #ef4444;
      --warning: #f59e0b;
      --shadow-soft: 0 4px 24px rgba(0, 0, 0, 0.4);
      --shadow-glow: 0 0 40px rgba(77, 163, 255, 0.15);
      --ring: 0 0 0 3px rgba(77, 163, 255, 0.3);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #030712;
      background-image:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(77, 163, 255, 0.15), transparent),
        radial-gradient(ellipse 60% 40% at 100% 0%, rgba(168, 85, 247, 0.1), transparent),
        radial-gradient(ellipse 60% 40% at 0% 100%, rgba(0, 212, 170, 0.08), transparent);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
    }

    .canvas {
      min-height: 100vh;
      padding: 40px 24px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    .panel {
      width: min(720px, 100%);
      padding: 0;
      border-radius: 24px;
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-soft), var(--shadow-glow);
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(20px) saturate(150%);
      animation: panel-in 400ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .panel::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 80%, transparent);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 28px 32px 24px;
      background: linear-gradient(180deg, rgba(77, 163, 255, 0.08) 0%, transparent 100%);
      border-bottom: 1px solid var(--border);
    }

    .logo {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(0, 212, 170, 0.3);
      position: relative;
      overflow: hidden;
    }

    .logo::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.3), transparent 60%);
    }

    .logo svg {
      width: 26px;
      height: 26px;
      position: relative;
      z-index: 1;
    }

    .header-text {
      flex: 1;
    }

    .title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, var(--text), var(--text-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-top: 4px;
    }

    .version-badge {
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(77, 163, 255, 0.15);
      border: 1px solid rgba(77, 163, 255, 0.3);
      font-size: 11px;
      font-weight: 600;
      color: var(--accent-2);
      letter-spacing: 0.02em;
    }

    .content {
      padding: 24px 32px 28px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-row {
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }

    .form-row .form-group {
      flex: 1;
      margin-bottom: 0;
    }

    label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
    }

    label svg {
      width: 14px;
      height: 14px;
      opacity: 0.7;
    }

    input[type="text"], textarea {
      width: 100%;
      border-radius: 12px;
      border: 1px solid var(--input-border);
      background: var(--input);
      color: var(--text);
      padding: 12px 16px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: all 200ms ease;
    }

    input[type="text"]:hover, textarea:hover {
      border-color: var(--border-hover);
    }

    input[type="text"]:focus, textarea:focus {
      border-color: var(--input-focus);
      box-shadow: var(--ring);
      background: rgba(12, 20, 38, 0.95);
    }

    input[type="text"]::placeholder, textarea::placeholder {
      color: var(--muted);
      opacity: 0.6;
    }

    textarea {
      min-height: 220px;
      resize: vertical;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      font-size: 13px;
      line-height: 1.6;
    }

    .options-section {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      padding: 16px 0;
    }

    .toggle-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-radius: 12px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--input-border);
      cursor: pointer;
      transition: all 200ms ease;
      user-select: none;
    }

    .toggle-wrapper:hover {
      background: rgba(40, 55, 80, 0.6);
      border-color: var(--border-hover);
    }

    .toggle-wrapper.active {
      background: rgba(0, 212, 170, 0.1);
      border-color: rgba(0, 212, 170, 0.4);
    }

    .toggle {
      position: relative;
      width: 40px;
      height: 22px;
      background: rgba(100, 116, 139, 0.4);
      border-radius: 11px;
      transition: all 200ms ease;
      flex-shrink: 0;
    }

    .toggle::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .toggle-wrapper.active .toggle {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
    }

    .toggle-wrapper.active .toggle::after {
      transform: translateX(18px);
    }

    .toggle-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: color 200ms ease;
    }

    .toggle-wrapper.active .toggle-label {
      color: var(--text);
    }

    input[type="checkbox"] {
      display: none;
    }

    .defaults-card {
      margin-top: 16px;
      padding: 20px;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--input-border);
      animation: expand-in 300ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .defaults-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }

    .defaults-header svg {
      width: 18px;
      height: 18px;
      color: var(--accent-2);
    }

    .defaults-header span {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .defaults-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
    }

    .default-item {
      display: flex;
      flex-direction: column;
    }

    .default-item label {
      font-size: 11px;
      margin-bottom: 6px;
      color: var(--muted);
    }

    .default-item input {
      padding: 10px 12px;
      font-size: 13px;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .type-string { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
    .type-int { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .type-double { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .type-bool { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .type-list { background: rgba(236, 72, 153, 0.15); color: #f472b6; }

    .error-box {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      display: none;
      animation: shake 400ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
    }

    .error-box.show {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .error-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: #f87171;
    }

    .error-content {
      flex: 1;
    }

    .error-title {
      font-size: 13px;
      font-weight: 600;
      color: #fca5a5;
      margin-bottom: 2px;
    }

    .error-message {
      font-size: 12px;
      color: #fca5a5;
      opacity: 0.9;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 20px 32px;
      background: rgba(15, 23, 42, 0.5);
      border-top: 1px solid var(--border);
    }

    .footer-hint {
      font-size: 12px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .footer-hint svg {
      width: 14px;
      height: 14px;
    }

    .footer-actions {
      display: flex;
      gap: 10px;
    }

    button {
      border: none;
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: all 200ms ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    button svg {
      width: 16px;
      height: 16px;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #030712;
      box-shadow: 0 4px 16px rgba(0, 212, 170, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 212, 170, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-secondary {
      background: rgba(51, 65, 85, 0.6);
      color: var(--text);
      border: 1px solid var(--input-border);
    }

    .btn-secondary:hover {
      background: rgba(71, 85, 105, 0.7);
      border-color: var(--border-hover);
    }

    .btn-ghost {
      background: transparent;
      color: var(--muted);
      padding: 12px 16px;
    }

    .btn-ghost:hover {
      color: var(--text);
      background: rgba(51, 65, 85, 0.4);
    }

    .btn-icon {
      padding: 10px;
      border-radius: 10px;
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid var(--input-border);
    }

    .btn-icon:hover {
      background: rgba(71, 85, 105, 0.6);
      border-color: var(--border-hover);
    }

    @keyframes panel-in {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes expand-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes shake {
      10%, 90% { transform: translateX(-1px); }
      20%, 80% { transform: translateX(2px); }
      30%, 50%, 70% { transform: translateX(-3px); }
      40%, 60% { transform: translateX(3px); }
    }

    @media (max-width: 640px) {
      .canvas {
        padding: 16px;
      }
      .panel {
        border-radius: 20px;
      }
      .header {
        padding: 20px;
      }
      .content {
        padding: 20px;
      }
      .footer {
        flex-direction: column;
        padding: 16px 20px;
      }
      .footer-actions {
        width: 100%;
      }
      .footer-actions button {
        flex: 1;
      }
      .options-section {
        flex-direction: column;
        align-items: stretch;
      }
      .toggle-wrapper {
        justify-content: space-between;
      }
    }
  </style>
</head>
<body>
  <div class="canvas">
    <div class="panel">
      <div class="header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#030712" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="header-text">
          <div class="title">JsonToDart (Freezed)</div>
          <div class="subtitle">Generate type-safe Freezed models from JSON</div>
        </div>
        <div class="version-badge">v0.1.2</div>
      </div>

      <div class="content">
        <div class="form-row">
          <div class="form-group">
            <label>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Class Name
            </label>
            <input id="className" type="text" placeholder="e.g. UserProfile, OrderItem" />
          </div>
          <button class="btn-icon" id="formatBtn" title="Format JSON">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 7 4 4 20 4 20 7"/>
              <line x1="9" y1="20" x2="15" y2="20"/>
              <line x1="12" y1="4" x2="12" y2="20"/>
            </svg>
          </button>
        </div>

        <div class="form-group">
          <label>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            JSON Input
          </label>
          <textarea id="jsonText" placeholder='{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "isActive": true
}'></textarea>
        </div>

        <div class="options-section">
          <label class="toggle-wrapper" id="nullableWrapper">
            <input type="checkbox" id="nullableToggle" />
            <div class="toggle"></div>
            <span class="toggle-label">Nullable Fields</span>
          </label>
          <label class="toggle-wrapper" id="defaultWrapper">
            <input type="checkbox" id="defaultToggle" />
            <div class="toggle"></div>
            <span class="toggle-label">Default Values</span>
          </label>
        </div>

        <div class="defaults-card" id="defaultsSection" style="display: none;">
          <div class="defaults-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v10"/>
              <path d="M20.66 4.93l-4.24 4.24m-8.84 0L3.34 4.93"/>
              <path d="M20.66 19.07l-4.24-4.24m-8.84 0l-4.24 4.24"/>
            </svg>
            <span>Configure Default Values</span>
          </div>
          <div class="defaults-grid">
            <div class="default-item">
              <label><span class="type-badge type-string">String</span></label>
              <input id="defaultString" type="text" value="" placeholder='""' />
            </div>
            <div class="default-item">
              <label><span class="type-badge type-int">int</span></label>
              <input id="defaultInt" type="text" value="0" />
            </div>
            <div class="default-item">
              <label><span class="type-badge type-double">double</span></label>
              <input id="defaultDouble" type="text" value="0.0" />
            </div>
            <div class="default-item">
              <label><span class="type-badge type-bool">bool</span></label>
              <input id="defaultBool" type="text" value="false" />
            </div>
            <div class="default-item">
              <label><span class="type-badge type-list">List</span></label>
              <input id="defaultList" type="text" value="[]" />
            </div>
          </div>
        </div>

        <div id="error" class="error-box">
          <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div class="error-content">
            <div class="error-title">Error</div>
            <div class="error-message" id="errorMessage"></div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Model will be generated with Freezed annotations
        </div>
        <div class="footer-actions">
          <button class="btn-ghost" id="cancelBtn">Cancel</button>
          <button class="btn-primary" id="makeBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
            Generate
          </button>
        </div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const errorBox = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const nullableToggle = document.getElementById('nullableToggle');
    const nullableWrapper = document.getElementById('nullableWrapper');
    const defaultToggle = document.getElementById('defaultToggle');
    const defaultWrapper = document.getElementById('defaultWrapper');
    const defaultsSection = document.getElementById('defaultsSection');

    function setError(message) {
      if (message) {
        errorMessage.textContent = message;
        errorBox.classList.add('show');
      } else {
        errorMessage.textContent = '';
        errorBox.classList.remove('show');
      }
    }

    function updateToggleUI(checkbox, wrapper) {
      if (checkbox.checked) {
        wrapper.classList.add('active');
      } else {
        wrapper.classList.remove('active');
      }
    }

    function updateDefaultsState() {
      const enabled = defaultToggle.checked;
      defaultsSection.style.display = enabled ? 'block' : 'none';
      defaultsSection.querySelectorAll('input').forEach((input) => {
        input.disabled = !enabled;
      });
    }

    // Toggle click handlers
    nullableWrapper.addEventListener('click', (e) => {
      if (e.target === nullableToggle) return;
      nullableToggle.checked = !nullableToggle.checked;
      updateToggleUI(nullableToggle, nullableWrapper);
    });

    nullableToggle.addEventListener('change', () => {
      updateToggleUI(nullableToggle, nullableWrapper);
    });

    defaultWrapper.addEventListener('click', (e) => {
      if (e.target === defaultToggle) return;
      defaultToggle.checked = !defaultToggle.checked;
      updateToggleUI(defaultToggle, defaultWrapper);
      updateDefaultsState();
    });

    defaultToggle.addEventListener('change', () => {
      updateToggleUI(defaultToggle, defaultWrapper);
      updateDefaultsState();
    });

    document.getElementById('formatBtn').addEventListener('click', () => {
      const jsonText = document.getElementById('jsonText');
      try {
        const parsed = JSON.parse(jsonText.value);
        jsonText.value = JSON.stringify(parsed, null, 2);
        setError('');
      } catch (error) {
        setError(error.message);
      }
    });

    document.getElementById('makeBtn').addEventListener('click', () => {
      const payload = {
        type: 'generate',
        className: document.getElementById('className').value,
        jsonText: document.getElementById('jsonText').value,
        options: {
          makeNullable: nullableToggle.checked,
          useDefaultValues: defaultToggle.checked,
          defaults: {
            stringValue: document.getElementById('defaultString').value,
            intValue: document.getElementById('defaultInt').value,
            doubleValue: document.getElementById('defaultDouble').value,
            boolValue: document.getElementById('defaultBool').value,
            listValue: document.getElementById('defaultList').value
          }
        }
      };
      vscode.postMessage(payload);
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });

    // Initialize states
    updateToggleUI(nullableToggle, nullableWrapper);
    updateToggleUI(defaultToggle, defaultWrapper);
    updateDefaultsState();

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'error') {
        setError(message.message);
      }
      if (message.type === 'info') {
        setError('');
      }
    });
  </script>
</body>
</html>`;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
