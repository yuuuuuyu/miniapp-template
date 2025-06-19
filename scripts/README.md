# Scripts 文件夹说明

本文件夹包含项目的辅助脚本，已简化为使用标准的 Commitizen 工具。

## 文件说明

### `setup-husky.sh` - Husky 初始化脚本
- **用途**: 一次性设置 Git hooks
- **功能**: 
  - 初始化 husky
  - 创建 pre-commit 和 commit-msg hooks
  - 设置文件权限
- **使用**: `bash scripts/setup-husky.sh`

### `COMMIT_GUIDE.md` - 提交规范指南
- **用途**: 详细的提交规范说明文档
- **内容**: 
  - 快速开始指南
  - 提交格式说明
  - 类型和范围定义
  - 使用示例

## 提交流程

项目现在完全使用 **Commitizen** 标准工具：

```bash
npm run commit
```

### 工作流程

```
开发者修改代码
    ↓
运行 npm run commit
    ↓
husky pre-commit hook 自动暂存文件
    ↓
Commitizen 提供交互界面
    ↓
选择提交类型、输入范围、描述等
    ↓
生成符合 Conventional Commits 规范的提交信息
    ↓
git commit 执行提交
    ↓
husky commit-msg hook 验证格式
    ↓
提交成功
```

## Commitizen 的优势

相比之前的自定义脚本，Commitizen 提供：

1. **标准化**: 完全符合 Conventional Commits 规范
2. **Breaking Changes**: 专门的 Breaking Changes 处理流程
3. **Issue 关联**: 标准化的 Issue 关联格式
4. **生态系统**: 与 changelog 生成工具无缝集成
5. **更多类型**: 包含 `revert` 等完整的提交类型
6. **详细说明**: 每个类型都有详细的英文描述

## 配置文件

- `commitlint.config.js`: 提交信息验证规则
- `.husky/`: Git hooks 配置
- `package.json`: Commitizen 配置

## 使用建议

1. **日常开发**: 使用 `npm run commit` 获得标准化的提交体验
2. **CI/CD**: 可以直接使用 `git commit` 或 `npm run commit`
3. **初始化**: 新环境使用 `bash scripts/setup-husky.sh` 快速设置

## 迁移说明

项目已从自定义提交脚本迁移到 Commitizen：

- ✅ 删除了 `scripts/commit.js` 自定义脚本
- ✅ 删除了 `scripts/test-commit.js` 测试脚本
- ✅ 简化了 package.json scripts 配置
- ✅ 保留了 `inquirer` 和 `chalk` 依赖（CLI 工具需要）
- ✅ 更新了相关文档和说明
