import { RESERVED_WORDS, DISALLOWED_CLASS_NAMES } from './constants';

export function uniqueFieldName(baseName: string, counts: Map<string, number>): string {
  const existing = counts.get(baseName);
  if (existing === undefined) {
    counts.set(baseName, 1);
    return baseName;
  }

  const next = existing + 1;
  counts.set(baseName, next);
  return `${baseName}${next}`;
}

export function ensureEntitySuffix(input: string): string {
  if (!input) {
    return input;
  }
  if (/_entity$/i.test(input)) {
    return input;
  }
  return `${input}_entity`;
}

export function ensureSafeClassName(name: string, suffix: string): string {
  if (DISALLOWED_CLASS_NAMES.has(name)) {
    return `${name}${suffix}`;
  }
  return name;
}

export function toPascalCase(input: string): string {
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

export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input);
  if (!pascal) {
    return '';
  }

  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toSnakeCase(input: string): string {
  const snake = input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .toLowerCase()
    .replace(/^_+|_+$/g, '');

  return snake;
}

export function sanitizeIdentifier(input: string): string {
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

export function singularize(input: string): string {
  if (input.length > 1 && input.endsWith('s')) {
    return input.slice(0, -1);
  }
  return input;
}

export function makeNullable(typeName: string): string {
  if (typeName.endsWith('?') || typeName === 'dynamic') {
    return typeName;
  }

  return `${typeName}?`;
}

export function escapeDartString(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
