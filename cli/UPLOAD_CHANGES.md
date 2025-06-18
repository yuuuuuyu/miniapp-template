# Upload功能更新说明

## 更新概述

根据新需求，upload功能已从交互式模式改为非交互式模式，以适配CI/CD环境。

## 主要变更

### 1. 移除交互式界面
- ❌ 不再使用inquirer进行交互式配置
- ✅ 直接使用命令行参数和自动化逻辑
- ✅ 适用于GitLab CI/CD等自动化环境

### 2. 版本号处理
- ✅ 自动从`package.json`获取当前版本号
- ✅ 默认自动递增patch版本（x.x.X+1）
- ✅ 支持通过`--increment-type`指定递增类型（major/minor/patch）
- ✅ 支持通过`--version`手动指定版本号
- ✅ 支持通过`--no-auto-increment`禁用自动递增

### 3. 上传描述自动化
- ✅ 自动获取最近5条Git提交记录
- ✅ 格式化为上传描述：`最近更新:\n1. 提交信息 (hash)\n2. ...`
- ✅ 支持通过`--desc`手动指定描述

### 4. 机器人编号处理
- ✅ 默认使用CI机器人编号1
- ✅ 支持通过`--robot`自定义机器人编号（1-30）
- ✅ 获取Git用户信息用于日志显示和参考

### 5. 开发者信息说明
- 📝 微信开发者平台显示的开发者信息由上传密钥决定，不是robot参数
- 📝 robot参数(1-30)仅用于区分不同的CI机器人
- 📝 要更改开发者显示信息，需要使用对应开发者的密钥文件

## 使用示例

### 基本用法（推荐用于CI/CD）
```bash
# 自动递增patch版本，使用Git提交信息作为描述
node cli/index.js upload
```

### 高级用法
```bash
# 递增minor版本
node cli/index.js upload --increment-type minor

# 指定版本号
node cli/index.js upload --version 2.0.0

# 使用当前版本号（不递增）
node cli/index.js upload --no-auto-increment

# 自定义描述和机器人编号
node cli/index.js upload --desc "发布新功能" --robot 2
```

### 环境变量支持
```bash
# 通过环境变量指定配置
VERSION=1.2.0 ROBOT=3 node cli/index.js upload
```

## CI/CD集成示例

### GitLab CI
```yaml
upload:
  stage: deploy
  script:
    - npm install
    - node cli/index.js upload --increment-type patch
  only:
    - master
```

### GitHub Actions
```yaml
- name: Upload to WeChat
  run: |
    npm install
    node cli/index.js upload --increment-type minor
```

## 版本号管理策略

1. **开发阶段**: 手动修改`package.json`中的大版本号
2. **CI/CD**: 自动递增小版本号
3. **紧急修复**: 使用`--version`指定具体版本号

## 兼容性说明

- ✅ Preview功能保持不变，仍支持交互式模式
- ✅ 所有原有的命令行参数仍然有效
- ✅ 配置文件格式无变化
- ✅ 向后兼容现有的使用方式

## 新增依赖

无新增外部依赖，仅使用Node.js内置的`child_process`模块来执行Git命令。
