# 项目文档说明

本文档目录包含小程序项目的开发规范和工具使用指南。

## 📚 文档导航

### 核心指南
- **[Git 提交规范指南](COMMIT_GUIDE.md)** - 详细的提交规范说明和使用指南
- **[更新日志格式配置](CHANGELOG_FORMATS.md)** - 小程序上传时的更新日志格式配置

## 🚀 快速开始

### 提交代码
```bash
npm run commit
```
使用标准化的 Commitizen 工具进行代码提交，自动暂存文件并引导填写规范的提交信息。

### 上传小程序
```bash
# 使用变更日志格式上传（推荐）
node cli/index.js upload --desc-format changelog

# 预览小程序
node cli/index.js preview
```

## 🛠️ 项目特性

### Git 提交规范
- ✅ 基于 **Conventional Commits** 标准
- ✅ 自动暂存修改的文件
- ✅ 交互式提交信息填写
- ✅ 自动格式验证和检查
- ✅ 支持中文描述

### 更新日志格式
- ✅ **简单格式** - 适合快速迭代
- ✅ **详细格式** - 适合常规发布
- ✅ **变更日志格式** - 适合正式发布（推荐）
- ✅ 灵活的配置选项
- ✅ 自动按提交类型分组

### CI/CD 集成
- ✅ 自动版本号递增
- ✅ Git 提交信息作为上传描述
- ✅ 支持多种环境配置
- ✅ 完整的错误处理和日志

## 📋 配置文件

| 文件 | 用途 |
|------|------|
| `commitlint.config.js` | 提交信息验证规则 |
| `.husky/` | Git hooks 配置 |
| `ci.config.js` | CI 工具配置 |
| `package.json` | 项目依赖和脚本 |

## 🔧 初始化设置

新环境首次使用时：

```bash
# 安装依赖
npm install

# 设置 Git hooks（如果需要）
bash scripts/setup-husky.sh

# 测试配置
npm run commit:test
```

## 📖 详细文档

- **[COMMIT_GUIDE.md](COMMIT_GUIDE.md)** - 完整的 Git 提交规范指南
  - 快速开始和使用方法
  - 提交格式和类型说明
  - Husky 配置和自动化功能
  - 常见问题和故障排除

- **[CHANGELOG_FORMATS.md](CHANGELOG_FORMATS.md)** - 更新日志格式详细配置
  - 三种格式类型的使用场景
  - 命令行参数和配置文件设置
  - 最佳实践和环境配置
  - CI/CD 集成示例

## 💡 使用建议

1. **日常开发**: 使用 `npm run commit` 进行标准化提交
2. **测试阶段**: 使用详细格式的更新日志
3. **生产发布**: 使用变更日志格式提供专业的版本说明
4. **团队协作**: 遵循 Conventional Commits 规范提高协作效率

## 🆘 获取帮助

如果遇到问题，请查看：
1. 相关文档的"常见问题"部分
2. 运行 `npm run commit:test` 检查配置
3. 查看项目的 Git 提交历史作为参考
