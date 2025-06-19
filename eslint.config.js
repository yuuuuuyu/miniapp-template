const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');

module.exports = [
  // 忽略文件配置
  {
    ignores: [
      'node_modules/**',
      'miniprogram/miniprogram_npm/**',
      'miniprogram/pages/cases/**', // 忽略案例页面，可能有大量生成代码
      'typings/**', // 忽略类型定义文件
      'dist/**',
      'build/**',
      '*.min.js',
      'private.*.key',
      'preview-qrcode.jpg',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock'
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // TypeScript 相关规则
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',

      // 基础规则 - 较为宽松
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      'eqeqeq': 'warn',

      // 小程序特定规则
      'no-undef': 'off', // 小程序全局变量较多，关闭此规则
    },
  },
  {
    files: ['cli/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // CLI 工具允许使用 console
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // 脚本文件允许使用 console
    },
  },
];
