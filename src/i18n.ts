import * as vscode from 'vscode';
import { I18nTexts } from './types';

export const i18n: Record<string, I18nTexts> = {
  // English
  en: {
    title: 'JsonToDart (Freezed)',
    subtitle: 'Generate type-safe Freezed models from JSON',
    className: 'Class Name',
    classNamePlaceholder: 'e.g. UserProfile, OrderItem',
    jsonInput: 'JSON Input',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "isActive": true
}`,
    nullableFields: 'Nullable Fields',
    defaultValues: 'Default Values',
    configureDefaults: 'Configure Default Values',
    footerHint: 'Model will be generated with Freezed annotations',
    cancel: 'Cancel',
    generate: 'Generate',
    error: 'Error',
    format: 'Format',
    invalidJson: 'Invalid JSON format. Please check your input.',
    fieldConfig: 'Field Configuration',
    fieldName: 'JSON Key',
    dartName: 'Dart Name',
    comment: 'Comment',
    nullable: 'Nullable',
    defaultValue: 'Default',
    type: 'Type',
    actions: 'Actions',
    parseJson: 'Parse Fields',
    collapsePanel: 'Collapse',
    expandPanel: 'Configure Fields',
    noFieldsFound: 'No fields found. Please enter valid JSON first.',
    reset: 'Reset'
  },
  // 简体中文
  zh: {
    title: 'JsonToDart (Freezed)',
    subtitle: '从 JSON 生成类型安全的 Freezed 模型',
    className: '类名',
    classNamePlaceholder: '例如: UserProfile, OrderItem',
    jsonInput: 'JSON 输入',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "张三",
  "email": "zhangsan@example.com",
  "isActive": true
}`,
    nullableFields: '可空字段',
    defaultValues: '默认值',
    configureDefaults: '配置默认值',
    footerHint: '将生成带有 Freezed 注解的模型',
    cancel: '取消',
    generate: '生成',
    error: '错误',
    format: '格式化',
    invalidJson: 'JSON 格式无效，请检查输入内容。',
    fieldConfig: '字段配置',
    fieldName: 'JSON 键名',
    dartName: 'Dart 名称',
    comment: '注释',
    nullable: '可空',
    defaultValue: '默认值',
    type: '类型',
    actions: '操作',
    parseJson: '解析字段',
    collapsePanel: '收起',
    expandPanel: '配置字段',
    noFieldsFound: '未找到字段，请先输入有效的 JSON。',
    reset: '重置'
  },
  // 繁體中文
  'zh-tw': {
    title: 'JsonToDart (Freezed)',
    subtitle: '從 JSON 生成類型安全的 Freezed 模型',
    className: '類名',
    classNamePlaceholder: '例如: UserProfile, OrderItem',
    jsonInput: 'JSON 輸入',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "張三",
  "email": "zhangsan@example.com",
  "isActive": true
}`,
    nullableFields: '可空欄位',
    defaultValues: '預設值',
    configureDefaults: '配置預設值',
    footerHint: '將生成帶有 Freezed 註解的模型',
    cancel: '取消',
    generate: '生成',
    error: '錯誤',
    format: '格式化',
    invalidJson: 'JSON 格式無效，請檢查輸入內容。',
    fieldConfig: '欄位配置',
    fieldName: 'JSON 鍵名',
    dartName: 'Dart 名稱',
    comment: '註釋',
    nullable: '可空',
    defaultValue: '預設值',
    type: '類型',
    actions: '操作',
    parseJson: '解析欄位',
    collapsePanel: '收起',
    expandPanel: '配置欄位',
    noFieldsFound: '未找到欄位，請先輸入有效的 JSON。',
    reset: '重置'
  },
  // 日本語
  ja: {
    title: 'JsonToDart (Freezed)',
    subtitle: 'JSONから型安全なFreezedモデルを生成',
    className: 'クラス名',
    classNamePlaceholder: '例: UserProfile, OrderItem',
    jsonInput: 'JSON入力',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "山田太郎",
  "email": "yamada@example.com",
  "isActive": true
}`,
    nullableFields: 'Null許容フィールド',
    defaultValues: 'デフォルト値',
    configureDefaults: 'デフォルト値の設定',
    footerHint: 'Freezedアノテーション付きのモデルが生成されます',
    cancel: 'キャンセル',
    generate: '生成',
    error: 'エラー',
    format: '整形',
    invalidJson: 'JSON形式が無効です。入力内容を確認してください。',
    fieldConfig: 'フィールド設定',
    fieldName: 'JSONキー',
    dartName: 'Dart名',
    comment: 'コメント',
    nullable: 'Null許容',
    defaultValue: 'デフォルト',
    type: '型',
    actions: '操作',
    parseJson: 'フィールド解析',
    collapsePanel: '折りたたむ',
    expandPanel: 'フィールド設定',
    noFieldsFound: 'フィールドが見つかりません。有効なJSONを入力してください。',
    reset: 'リセット'
  },
  // 한국어
  ko: {
    title: 'JsonToDart (Freezed)',
    subtitle: 'JSON에서 타입 안전한 Freezed 모델 생성',
    className: '클래스 이름',
    classNamePlaceholder: '예: UserProfile, OrderItem',
    jsonInput: 'JSON 입력',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "홍길동",
  "email": "hong@example.com",
  "isActive": true
}`,
    nullableFields: 'Nullable 필드',
    defaultValues: '기본값',
    configureDefaults: '기본값 설정',
    footerHint: 'Freezed 어노테이션이 포함된 모델이 생성됩니다',
    cancel: '취소',
    generate: '생성',
    error: '오류',
    format: '포맷',
    invalidJson: 'JSON 형식이 올바르지 않습니다. 입력 내용을 확인하세요.',
    fieldConfig: '필드 설정',
    fieldName: 'JSON 키',
    dartName: 'Dart 이름',
    comment: '주석',
    nullable: 'Nullable',
    defaultValue: '기본값',
    type: '타입',
    actions: '작업',
    parseJson: '필드 분석',
    collapsePanel: '접기',
    expandPanel: '필드 설정',
    noFieldsFound: '필드를 찾을 수 없습니다. 유효한 JSON을 먼저 입력하세요.',
    reset: '초기화'
  },
  // Français
  fr: {
    title: 'JsonToDart (Freezed)',
    subtitle: 'Générer des modèles Freezed typés depuis JSON',
    className: 'Nom de classe',
    classNamePlaceholder: 'ex: UserProfile, OrderItem',
    jsonInput: 'Entrée JSON',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "isActive": true
}`,
    nullableFields: 'Champs nullables',
    defaultValues: 'Valeurs par défaut',
    configureDefaults: 'Configurer les valeurs par défaut',
    footerHint: 'Le modèle sera généré avec les annotations Freezed',
    cancel: 'Annuler',
    generate: 'Générer',
    error: 'Erreur',
    format: 'Formater',
    invalidJson: 'Format JSON invalide. Veuillez vérifier votre saisie.',
    fieldConfig: 'Configuration des champs',
    fieldName: 'Clé JSON',
    dartName: 'Nom Dart',
    comment: 'Commentaire',
    nullable: 'Nullable',
    defaultValue: 'Par défaut',
    type: 'Type',
    actions: 'Actions',
    parseJson: 'Analyser les champs',
    collapsePanel: 'Réduire',
    expandPanel: 'Configurer les champs',
    noFieldsFound: 'Aucun champ trouvé. Veuillez d\'abord entrer un JSON valide.',
    reset: 'Réinitialiser'
  },
  // Deutsch
  de: {
    title: 'JsonToDart (Freezed)',
    subtitle: 'Typsichere Freezed-Modelle aus JSON generieren',
    className: 'Klassenname',
    classNamePlaceholder: 'z.B. UserProfile, OrderItem',
    jsonInput: 'JSON-Eingabe',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "Max Mustermann",
  "email": "max@example.com",
  "isActive": true
}`,
    nullableFields: 'Nullable Felder',
    defaultValues: 'Standardwerte',
    configureDefaults: 'Standardwerte konfigurieren',
    footerHint: 'Modell wird mit Freezed-Annotationen generiert',
    cancel: 'Abbrechen',
    generate: 'Generieren',
    error: 'Fehler',
    format: 'Formatieren',
    invalidJson: 'Ungültiges JSON-Format. Bitte überprüfen Sie Ihre Eingabe.',
    fieldConfig: 'Feldkonfiguration',
    fieldName: 'JSON-Schlüssel',
    dartName: 'Dart-Name',
    comment: 'Kommentar',
    nullable: 'Nullable',
    defaultValue: 'Standard',
    type: 'Typ',
    actions: 'Aktionen',
    parseJson: 'Felder analysieren',
    collapsePanel: 'Einklappen',
    expandPanel: 'Felder konfigurieren',
    noFieldsFound: 'Keine Felder gefunden. Bitte geben Sie zuerst gültiges JSON ein.',
    reset: 'Zurücksetzen'
  },
  // Español
  es: {
    title: 'JsonToDart (Freezed)',
    subtitle: 'Generar modelos Freezed con tipos seguros desde JSON',
    className: 'Nombre de clase',
    classNamePlaceholder: 'ej: UserProfile, OrderItem',
    jsonInput: 'Entrada JSON',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "Juan García",
  "email": "juan@example.com",
  "isActive": true
}`,
    nullableFields: 'Campos anulables',
    defaultValues: 'Valores por defecto',
    configureDefaults: 'Configurar valores por defecto',
    footerHint: 'El modelo se generará con anotaciones Freezed',
    cancel: 'Cancelar',
    generate: 'Generar',
    error: 'Error',
    format: 'Formatear',
    invalidJson: 'Formato JSON inválido. Por favor, revise su entrada.',
    fieldConfig: 'Configuración de campos',
    fieldName: 'Clave JSON',
    dartName: 'Nombre Dart',
    comment: 'Comentario',
    nullable: 'Nullable',
    defaultValue: 'Por defecto',
    type: 'Tipo',
    actions: 'Acciones',
    parseJson: 'Analizar campos',
    collapsePanel: 'Contraer',
    expandPanel: 'Configurar campos',
    noFieldsFound: 'No se encontraron campos. Por favor, ingrese JSON válido primero.',
    reset: 'Restablecer'
  },
  // Português
  pt: {
    title: 'JsonToDart (Freezed)',
    subtitle: 'Gerar modelos Freezed tipados a partir de JSON',
    className: 'Nome da classe',
    classNamePlaceholder: 'ex: UserProfile, OrderItem',
    jsonInput: 'Entrada JSON',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "João Silva",
  "email": "joao@example.com",
  "isActive": true
}`,
    nullableFields: 'Campos anuláveis',
    defaultValues: 'Valores padrão',
    configureDefaults: 'Configurar valores padrão',
    footerHint: 'O modelo será gerado com anotações Freezed',
    cancel: 'Cancelar',
    generate: 'Gerar',
    error: 'Erro',
    format: 'Formatar',
    invalidJson: 'Formato JSON inválido. Por favor, verifique sua entrada.',
    fieldConfig: 'Configuração de campos',
    fieldName: 'Chave JSON',
    dartName: 'Nome Dart',
    comment: 'Comentário',
    nullable: 'Nullable',
    defaultValue: 'Padrão',
    type: 'Tipo',
    actions: 'Ações',
    parseJson: 'Analisar campos',
    collapsePanel: 'Recolher',
    expandPanel: 'Configurar campos',
    noFieldsFound: 'Nenhum campo encontrado. Por favor, insira JSON válido primeiro.',
    reset: 'Redefinir'
  },
  // Русский
  ru: {
    title: 'JsonToDart (Freezed)',
    subtitle: 'Генерация типобезопасных моделей Freezed из JSON',
    className: 'Имя класса',
    classNamePlaceholder: 'напр: UserProfile, OrderItem',
    jsonInput: 'Ввод JSON',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "isActive": true
}`,
    nullableFields: 'Nullable поля',
    defaultValues: 'Значения по умолчанию',
    configureDefaults: 'Настроить значения по умолчанию',
    footerHint: 'Модель будет сгенерирована с аннотациями Freezed',
    cancel: 'Отмена',
    generate: 'Создать',
    error: 'Ошибка',
    format: 'Форматировать',
    invalidJson: 'Неверный формат JSON. Пожалуйста, проверьте ввод.',
    fieldConfig: 'Настройка полей',
    fieldName: 'Ключ JSON',
    dartName: 'Имя Dart',
    comment: 'Комментарий',
    nullable: 'Nullable',
    defaultValue: 'По умолчанию',
    type: 'Тип',
    actions: 'Действия',
    parseJson: 'Анализ полей',
    collapsePanel: 'Свернуть',
    expandPanel: 'Настроить поля',
    noFieldsFound: 'Поля не найдены. Сначала введите корректный JSON.',
    reset: 'Сбросить'
  },
  // Italiano
  it: {
    title: 'JsonToDart (Freezed)',
    subtitle: 'Genera modelli Freezed tipizzati da JSON',
    className: 'Nome classe',
    classNamePlaceholder: 'es: UserProfile, OrderItem',
    jsonInput: 'Input JSON',
    jsonInputPlaceholder: `{
  "id": 1,
  "name": "Mario Rossi",
  "email": "mario@example.com",
  "isActive": true
}`,
    nullableFields: 'Campi nullable',
    defaultValues: 'Valori predefiniti',
    configureDefaults: 'Configura valori predefiniti',
    footerHint: 'Il modello verrà generato con annotazioni Freezed',
    cancel: 'Annulla',
    generate: 'Genera',
    error: 'Errore',
    format: 'Formatta',
    invalidJson: 'Formato JSON non valido. Controlla il tuo input.',
    fieldConfig: 'Configurazione campi',
    fieldName: 'Chiave JSON',
    dartName: 'Nome Dart',
    comment: 'Commento',
    nullable: 'Nullable',
    defaultValue: 'Predefinito',
    type: 'Tipo',
    actions: 'Azioni',
    parseJson: 'Analizza campi',
    collapsePanel: 'Comprimi',
    expandPanel: 'Configura campi',
    noFieldsFound: 'Nessun campo trovato. Inserisci prima un JSON valido.',
    reset: 'Reimposta'
  }
};

export const languageNames: Record<string, string> = {
  en: 'English',
  zh: '简体中文',
  'zh-tw': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  ru: 'Русский',
  it: 'Italiano'
};

export function getLocale(): string {
  const lang = vscode.env.language.toLowerCase();
  // 繁體中文
  if (lang === 'zh-tw' || lang === 'zh-hk') {
    return 'zh-tw';
  }
  // 简体中文
  if (lang.startsWith('zh')) {
    return 'zh';
  }
  // 日本語
  if (lang.startsWith('ja')) {
    return 'ja';
  }
  // 한국어
  if (lang.startsWith('ko')) {
    return 'ko';
  }
  // Français
  if (lang.startsWith('fr')) {
    return 'fr';
  }
  // Deutsch
  if (lang.startsWith('de')) {
    return 'de';
  }
  // Español
  if (lang.startsWith('es')) {
    return 'es';
  }
  // Português
  if (lang.startsWith('pt')) {
    return 'pt';
  }
  // Русский
  if (lang.startsWith('ru')) {
    return 'ru';
  }
  // Italiano
  if (lang.startsWith('it')) {
    return 'it';
  }
  return 'en';
}
