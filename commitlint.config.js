// 提交类型和范围定义
const types = [
  { value: 'feat', name: 'feat:     新功能' },
  { value: 'fix', name: 'fix:      修复bug' },
  { value: 'docs', name: 'docs:     文档更新' },
  { value: 'style', name: 'style:    代码格式' },
  { value: 'refactor', name: 'refactor: 重构' },
  { value: 'perf', name: 'perf:     性能优化' },
  { value: 'test', name: 'test:     增加测试' },
  { value: 'chore', name: 'chore:    构建/工具变动' },
  { value: 'revert', name: 'revert:   回滚' },
  { value: 'build', name: 'build:    构建系统' },
  { value: 'ci', name: 'ci:       CI配置' },
  { value: 'wip', name: 'wip:      开发中' },
  { value: 'release', name: 'release:  发布版本' }
];

const scopes = ['pages', 'components', 'utils', 'api', 'config', 'cli', 'miniprogram', 'build', 'deps', 'scripts', 'husky', 'git'];

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', types.map(t => t.value)],
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
  },
  // 导出配置供其他脚本使用
  types,
  scopes
};
