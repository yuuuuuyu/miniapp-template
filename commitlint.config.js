// 提交范围定义
const scopes = ['pages', 'components', 'utils', 'api', 'config', 'cli', 'miniprogram', 'build', 'deps', 'scripts', 'husky', 'git'];

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 使用 @commitlint/config-conventional 的默认类型，无需自定义
    'scope-enum': [2, 'always', scopes],
    'subject-max-length': [2, 'always', 100],
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
    'type-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [0], // 允许中文
    'body-leading-blank': [1, 'always'],
    'footer-leading-blank': [1, 'always'],
    'header-max-length': [2, 'always', 100],
    'scope-case': [2, 'always', 'lower-case']
  }
};
