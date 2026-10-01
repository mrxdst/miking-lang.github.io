import type * as monaco from "monaco-editor";

export const conf: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '--',
    blockComment: ['/-', '-/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string', 'comment'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '/-', close: '-/', notIn: ['string'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  wordPattern: /[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/,
};

export const language: monaco.languages.IMonarchLanguage = {
  // defaultToken: 'invalid',
  tokenPostfix: '.mc',

  // Keywords registered via `identIsKeyword` in parser.mc.
  keywords: [
    'all', 'case', 'con', 'else', 'end', 'external', 'if', 'in', 'include',
    'lam', 'lang', 'let', 'match', 'mexpr', 'recursive', 'sem', 'switch',
    'syn', 'then', 'type', 'use', 'using', 'utest', 'with',
  ],

  constants: ['true', 'false', 'never'],

  // Upper-case identifiers the parser treats as built-in types.
  builtinTypes: ['Bool', 'Char', 'Float', 'Int', 'String', 'Tensor', 'Unknown'],

  // Operator characters, as accepted by `parseOperatorCont` in lexer.mc.
  opchars: /[%<>!?~:.$&*+\-\/=@^|]/,

  // Escapes accepted by `matchChar` in lexer.mc.
  escapes: /\\[\\nt"'?abfrv]/,

  lident: /[a-z_][a-zA-Z0-9_]*/,
  uident: /[A-Z][a-zA-Z0-9_]*/,

  tokenizer: {
    root: [
      { include: '@whitespace' },

      // Declarations: highlight the name being introduced.
      [/(lang)(\s+)(@uident)/, ['keyword', 'white', 'type.identifier']],
      [/(syn|type|con)(\s+)(@uident)/, ['keyword', 'white', 'type.identifier']],
      [/(sem|let|external)(\s+)(@lident)/, ['keyword', 'white', 'entity.name.function']],
      [/(lam)(\s+)(@lident)/, ['keyword', 'white', 'variable.parameter']],

      // Hash strings: #var"...", #con"...", #label"...", #frozen"...
      [/#[a-zA-Z0-9_]*"/, { token: 'string.hash', next: '@hashstring' }],

      // Identifiers and keywords.
      [/@lident/, {
        cases: {
          '@keywords': 'keyword',
          '@constants': 'constant',
          '_': 'keyword.wildcard',
          '@default': 'identifier',
        },
      }],
      [/@uident/, {
        cases: {
          '@builtinTypes': 'type',
          '@default': 'type.identifier',
        },
      }],

      // Numbers: an integer, optionally followed by `.digits` and/or an exponent.
      [/\d+\.\d*(?:[eE][+-]?\d+)?/, 'number.float'],
      [/\d+[eE][+-]?\d+/, 'number.float'],
      [/\d+/, 'number'],

      // Strings and characters.
      [/"/, { token: 'string.quote', next: '@string' }],
      [/'@escapes'/, 'string.char'],
      [/'[^\\']'/, 'string.char'],
      [/'/, 'string.invalid'],

      // Delimiters and brackets.
      [/[{}()\[\]]/, '@brackets'],
      [/[;,]/, 'delimiter'],

      // Operators: a maximal run of operator characters.
      [/@opchars+/, 'operator'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/\/-/, 'comment', '@comment'],
      [/--.*$/, 'comment'],
    ],

    // Multiline comments nest.
    comment: [
      [/[^\/-]+/, 'comment'],
      [/\/-/, 'comment', '@push'],
      [/-\//, 'comment', '@pop'],
      [/[\/-]/, 'comment'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', next: '@pop' }],
    ],

    hashstring: [
      [/[^\\"]+/, 'string.hash'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.hash', next: '@pop' }],
    ],
  },
};
