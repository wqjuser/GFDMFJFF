import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

import { JsonValue, JsonObject, GeneratorOptions, UserFieldConfig } from './types';
import { JSON_VALUE_CONVERTER_CONTENT } from './constants';
import { toPascalCase, toSnakeCase, ensureEntitySuffix } from './utils';
import { FreezedGenerator } from './generator';
import { getWebviewContent } from './webview';

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

      const extensionVersion = vscode.extensions.getExtension('wqjuser.json-to-dart-freezed')?.packageJSON?.version || '0.0.0';
      panel.webview.html = getWebviewContent(panel.webview, extensionVersion);

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
        const fieldConfigs = message.fieldConfigs as UserFieldConfig[] | null;
        const content = generator.generate(className, parsed as JsonObject, converterImportPath, fieldConfigs);
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
