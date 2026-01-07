export type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface GeneratorOptions {
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

export interface ClassField {
  name: string;
  type: string;
  jsonKey?: string;
  converter?: string;
  defaultValue?: string;
  required: boolean;
}

export interface ClassDef {
  name: string;
  fields: ClassField[];
}

export interface UserFieldConfig {
  jsonKey: string;
  dartName: string;
  type: string;
  nullable: boolean;
  defaultValue: string;
}

export interface I18nTexts {
  title: string;
  subtitle: string;
  className: string;
  classNamePlaceholder: string;
  jsonInput: string;
  jsonInputPlaceholder: string;
  nullableFields: string;
  defaultValues: string;
  configureDefaults: string;
  footerHint: string;
  cancel: string;
  generate: string;
  error: string;
  format: string;
  invalidJson: string;
  fieldConfig: string;
  fieldName: string;
  dartName: string;
  comment: string;
  nullable: string;
  defaultValue: string;
  type: string;
  actions: string;
  parseJson: string;
  collapsePanel: string;
  expandPanel: string;
  noFieldsFound: string;
  reset: string;
}
