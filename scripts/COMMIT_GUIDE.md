# Git 提交规范指南

## 快速开始

### 标准提交方式：Commitizen
```bash
npm run commit
```
**自动暂存文件**并使用 Commitizen 引导您填写规范的提交信息。

Commitizen 提供了完整的 Conventional Commits 支持，包括：
- 详细的提交类型说明
- Breaking Changes 专门处理
- Issue 关联支持
- 标准化的提交格式

## 提交格式

```
<type>(<scope>): <subject>
```

### 提交类型

| 类型 | 描述 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复bug |
| `docs` | 文档更新 |
| `style` | 代码格式 |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 增加测试 |
| `chore` | 构建/工具变动 |
| `ci` | CI配置 |
| `build` | 构建系统 |

### 影响范围（可选）

`pages`, `components`, `utils`, `api`, `config`, `cli`, `miniprogram`, `build`, `deps`

## 示例

```bash
feat: 添加用户认证功能
fix(pages): 修复首页加载问题
docs: 更新 API 文档
```

## 自动化功能

- ✅ 自动暂存修改的文件
- ✅ 自动检查提交信息格式
- ✅ 支持中文描述

如果提交信息不符合规范，提交将被拒绝，您需要修改提交信息后重新提交。

## 配置文件

- `commitlint.config.js`: Commitlint 配置
- `.husky/`: Husky Git hooks 配置
- `package.json`: Commitizen 配置

## 跳过检查（不推荐）

如果在特殊情况下需要跳过检查：

```bash
git commit -m "message" --no-verify
```

但请谨慎使用，建议始终遵循提交规范。

## 与 CI/CD 集成

本项目的 CLI 工具会自动获取 Git 提交信息作为小程序上传描述，规范的提交信息有助于：

1. 更好的版本追踪
2. 自动生成更新日志
3. 提高团队协作效率
4. 便于问题定位和回滚

## 常见问题

### Q: 提交被拒绝怎么办？
A: 检查提交信息是否符合规范，修改后重新提交。

### Q: 如何修改最后一次提交信息？
A: 使用 `git commit --amend` 修改最后一次提交。

### Q: 可以自定义提交类型吗？
A: 可以在 `commitlint.config.js` 中修改 `type-enum` 规则。

### Q: 如何临时禁用检查？
A: 设置环境变量 `HUSKY=0` 或使用 `--no-verify` 参数。
