import {
  JsonValue,
  JsonObject,
  GeneratorOptions,
  ClassField,
  ClassDef,
  UserFieldConfig
} from './types';
import {
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  sanitizeIdentifier,
  singularize,
  makeNullable,
  escapeDartString,
  uniqueFieldName,
  ensureSafeClassName
} from './utils';

export class FreezedGenerator {
  private classes: ClassDef[] = [];
  private usedClassNames = new Map<string, number>();
  private userFieldConfigs: Map<string, UserFieldConfig> | null = null;

  constructor(private options: GeneratorOptions) {}

  generate(
    rootName: string,
    rootObject: JsonObject,
    converterImportPath: string,
    fieldConfigs?: UserFieldConfig[] | null
  ): string {
    this.classes = [];
    this.usedClassNames.clear();

    // 将用户配置转换为 Map 便于查找
    this.userFieldConfigs = fieldConfigs
      ? new Map(fieldConfigs.map(f => [f.jsonKey, f]))
      : null;

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
    // 检查是否有用户配置
    const userConfig = this.userFieldConfigs?.get(key);

    // 使用用户配置的名称或自动推断
    const baseName = userConfig?.dartName
      ? sanitizeIdentifier(userConfig.dartName)
      : sanitizeIdentifier(toCamelCase(key) || 'field');
    const uniqueName = uniqueFieldName(baseName, fieldNameCounts);
    const needsJsonKey = uniqueName !== key;

    // 类型推断
    const inferredType = this.inferType(key, value);

    // 使用用户配置的 nullable 或全局设置
    const shouldMakeNullable = userConfig !== undefined
      ? userConfig.nullable
      : this.options.makeNullable;

    const fieldType = shouldMakeNullable ? makeNullable(inferredType) : inferredType;
    const isNullable = fieldType.endsWith('?');
    const converter = this.converterAnnotationFor(fieldType);

    // 使用用户配置的默认值或自动推断
    let defaultValue: string | undefined;
    if (this.options.useDefaultValues) {
      if (userConfig?.defaultValue && userConfig.defaultValue !== '') {
        defaultValue = userConfig.defaultValue;
      } else {
        defaultValue = this.defaultValueFor(fieldType, isNullable);
      }
    }

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
