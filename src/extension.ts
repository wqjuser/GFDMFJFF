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

        const classNameInput = typeof message.className === 'string' ? message.className.trim() : '';
        const jsonText = typeof message.jsonText === 'string' ? message.jsonText.trim() : '';

        if (!classNameInput) {
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
      --text: #e8f0fa;
      --muted: #9fb0c6;
      --accent: #2ad3c1;
      --accent-2: #3aa7ff;
      --panel: rgba(7, 15, 25, 0.88);
      --border: rgba(73, 111, 158, 0.45);
      --input: #0c172b;
      --input-border: #274461;
      --input-focus: #3aa7ff;
      --shadow: 0 20px 60px rgba(1, 6, 14, 0.65), 0 0 0 1px rgba(120, 160, 210, 0.18);
      --ring: 0 0 0 2px rgba(58, 167, 255, 0.25);
    }

    body {
      margin: 0;
      font-family: "Trebuchet MS", "Candara", "Segoe UI", sans-serif;
      background-color: #05070e;
      background-image:
        radial-gradient(1200px 480px at 10% -10%, rgba(58, 167, 255, 0.28), transparent 60%),
        radial-gradient(900px 500px at 90% 0%, rgba(42, 211, 193, 0.22), transparent 55%),
        linear-gradient(160deg, #05070e, #061427 55%, #050c18),
        repeating-linear-gradient(120deg, rgba(255, 255, 255, 0.03) 0, rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 48px);
      color: var(--text);
      min-height: 100vh;
    }

    .canvas {
      min-height: 100vh;
      padding: 32px 24px 40px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    .panel {
      width: min(980px, 100%);
      padding: 28px 28px 22px;
      border-radius: 18px;
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(14px) saturate(120%);
      animation: panel-in 320ms ease-out;
    }

    .panel::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(120deg, rgba(58, 167, 255, 0.12), transparent 45%);
      pointer-events: none;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .info-badge {
      width: 32px;
      height: 32px;
      border-radius: 12px;
      background: linear-gradient(135deg, #2ad3c1, #3aa7ff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #041523;
      font-weight: 700;
      box-shadow: 0 10px 20px rgba(58, 167, 255, 0.3);
    }

    .title {
      font-size: 18px;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 13px;
      color: var(--muted);
    }

    label {
      display: block;
      font-size: 13px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--muted);
    }

    input[type="text"], textarea {
      width: 100%;
      box-sizing: border-box;
      border-radius: 10px;
      border: 1px solid var(--input-border);
      background: var(--input);
      color: var(--text);
      padding: 10px 12px;
      font-size: 14px;
      outline: none;
      box-shadow: inset 0 0 0 1px rgba(44, 198, 255, 0.05);
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    input[type="text"]:focus, textarea:focus {
      border-color: var(--input-focus);
      box-shadow: var(--ring);
    }

    textarea {
      min-height: 260px;
      resize: vertical;
    }

    .row {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 18px;
    }

    .checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #cdd8e5;
    }

    .defaults {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-top: 12px;
      padding: 12px;
      border-radius: 12px;
      background: rgba(8, 17, 31, 0.6);
      border: 1px solid rgba(60, 90, 130, 0.25);
    }

    .defaults label {
      font-size: 11px;
      margin-bottom: 6px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 18px;
    }

    button {
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.4px;
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #2ad3c1, #3aa7ff);
      color: #041523;
      box-shadow: 0 12px 24px rgba(58, 167, 255, 0.25);
    }

    .btn-secondary {
      background: rgba(15, 27, 46, 0.6);
      color: var(--text);
      border: 1px solid rgba(133, 160, 197, 0.35);
    }

    .btn-ghost {
      background: transparent;
      color: var(--muted);
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    button:hover {
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0);
    }

    .top-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }

    .error {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(248, 113, 113, 0.15);
      border: 1px solid rgba(248, 113, 113, 0.4);
      color: #fecaca;
      font-size: 13px;
      display: none;
    }

    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.3), transparent);
      margin: 20px 0;
    }

    @keyframes panel-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .panel {
        padding: 22px 18px;
      }
      .actions {
        flex-direction: column;
        align-items: stretch;
      }
      .top-actions {
        justify-content: stretch;
      }
    }
  </style>
</head>
<body>
  <div class="canvas">
    <div class="panel">
    <div class="header">
      <div class="info-badge">i</div>
      <div>
        <div class="title">JsonToDart (Freezed)</div>
        <div class="subtitle">Please input the class name and JSON string for generating a Freezed model</div>
      </div>
    </div>

    <div>
      <label for="className">Class Name</label>
      <input id="className" type="text" placeholder="Example: UserProfile" />
    </div>

    <div class="top-actions">
      <button class="btn-secondary" id="formatBtn">FORMAT</button>
    </div>

    <div style="margin-top: 12px;">
      <label for="jsonText">JSON Text</label>
      <textarea id="jsonText" placeholder="{\n  \"name\": \"value\"\n}"></textarea>
    </div>

    <div class="row">
      <label class="checkbox">
        <input type="checkbox" id="nullableToggle" />
        nullable
      </label>
      <label class="checkbox">
        <input type="checkbox" id="defaultToggle" />
        default value
      </label>
    </div>

    <div class="defaults" id="defaultsSection">
      <div>
        <label for="defaultString">String</label>
        <input id="defaultString" type="text" value="" />
      </div>
      <div>
        <label for="defaultInt">int</label>
        <input id="defaultInt" type="text" value="0" />
      </div>
      <div>
        <label for="defaultDouble">double</label>
        <input id="defaultDouble" type="text" value="0.0" />
      </div>
      <div>
        <label for="defaultBool">bool</label>
        <input id="defaultBool" type="text" value="false" />
      </div>
      <div>
        <label for="defaultList">List</label>
        <input id="defaultList" type="text" value="[]" />
      </div>
    </div>

    <div id="error" class="error"></div>

    <div class="divider"></div>

    <div class="actions">
      <button class="btn-primary" id="makeBtn">MAKE</button>
      <button class="btn-ghost" id="cancelBtn">CANCEL</button>
    </div>
  </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const errorBox = document.getElementById('error');
    const nullableToggle = document.getElementById('nullableToggle');
    const defaultToggle = document.getElementById('defaultToggle');
    const defaultsSection = document.getElementById('defaultsSection');

    function setError(message) {
      if (message) {
        errorBox.textContent = message;
        errorBox.style.display = 'block';
      } else {
        errorBox.textContent = '';
        errorBox.style.display = 'none';
      }
    }

    function updateDefaultsState() {
      const disabled = !defaultToggle.checked;
      defaultsSection.querySelectorAll('input').forEach((input) => {
        input.disabled = disabled;
        input.style.opacity = disabled ? '0.5' : '1';
      });
    }

    document.getElementById('formatBtn').addEventListener('click', () => {
      const jsonText = document.getElementById('jsonText');
      try {
        const parsed = JSON.parse(jsonText.value);
        jsonText.value = JSON.stringify(parsed, null, 2);
        setError('');
      } catch (error) {
        setError('Invalid JSON: ' + error.message);
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

    defaultToggle.addEventListener('change', updateDefaultsState);
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
