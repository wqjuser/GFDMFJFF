export const RESERVED_WORDS = new Set([
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

export const DISALLOWED_CLASS_NAMES = new Set([
  'List',
  'Map',
  'Set',
  'Iterable',
  'Object',
  'String'
]);

export const JSON_VALUE_CONVERTER_CONTENT = `import 'package:freezed_annotation/freezed_annotation.dart';

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
