# miniprogram-ci 自动化脚本

这是一个基于 miniprogram-ci 的小程序自动化构建和发布脚本，支持预览和上传功能。

## 功能特性

- ✅ 支持小程序预览和上传
- ✅ 多环境配置支持 (development/staging/production)
- ✅ 灵活的命令行参数
- ✅ 详细的日志输出和错误处理
- ✅ 二维码生成 (终端/图片/base64)
- ✅ 版本号自动管理
- ✅ 机器人编号配置

## 快速开始

### 1. 获取私钥文件

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序管理后台
3. 开发 -> 开发管理 -> 开发设置 -> 小程序代码上传
4. 生成并下载私钥文件
5. 将私钥文件重命名为 `private.{你的appid}.key` 并放在项目根目录

### 2. 配置项目

编辑 `ci.config.js` 文件，确保以下配置正确：

```javascript
module.exports = {
  appid: 'wx12e1d849722bc528', // 你的小程序 AppID
  privateKeyPath: path.resolve(__dirname, './private.wx12e1d849722bc528.key'), // 私钥文件路径
  // ... 其他配置
};
```

### 3. 使用脚本

#### 预览小程序

```bash
# 基本预览 (终端显示二维码)
npm run preview

# 生成二维码图片
npm run preview:image

# 自定义预览配置
node cli/index.js preview --desc "测试预览" --qrcode-format image --qrcode-output ./qr.jpg
```

#### 上传小程序

```bash
# 基本上传
npm run upload

# 生产环境上传
npm run upload:prod

# 测试环境上传
npm run upload:staging

# 自定义上传配置
node cli/index.js upload --version 1.0.1 --desc "修复重要bug" --robot 2
```

## 命令行参数

### 预览命令 (preview)

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `--desc` | string | 预览描述 | `--desc "测试版本"` |
| `--qrcode-format` | string | 二维码格式 (image/base64/terminal) | `--qrcode-format image` |
| `--qrcode-output` | string | 二维码输出路径 | `--qrcode-output ./qr.jpg` |
| `--page-path` | string | 预览页面路径 | `--page-path pages/index/index` |
| `--search-query` | string | 预览参数 | `--search-query "a=1&b=2"` |
| `--scene` | number | 场景值 | `--scene 1001` |

### 上传命令 (upload)

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `--version` | string | 版本号 | `--version 1.0.1` |
| `--desc` | string | 上传描述 | `--desc "修复bug"` |
| `--robot` | number | 机器人编号 (1-30) | `--robot 2` |

## 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 环境 (development/staging/production) | `NODE_ENV=production` |
| `VERSION` | 版本号 | `VERSION=1.0.1` |
| `ROBOT` | 机器人编号 | `ROBOT=2` |
| `APPID` | 小程序 AppID | `APPID=wx12e1d849722bc528` |
| `DEBUG` | 调试模式 | `DEBUG=1` |

## 配置文件说明

### ci.config.js

```javascript
module.exports = {
  // 项目基本信息
  appid: 'wx12e1d849722bc528',
  projectName: 'miniapp-IDC431',
  
  // 路径配置
  projectPath: path.resolve(__dirname, './'),
  miniprogramRoot: 'miniprogram/',
  privateKeyPath: path.resolve(__dirname, './private.wx12e1d849722bc528.key'),
  
  // 忽略文件
  ignores: [
    'node_modules/**/*',
    '.git/**/*',
    // ...
  ],
  
  // 编译设置
  setting: {
    useProjectConfig: true,
    es6: true,
    minified: true,
    // ...
  },
  
  // 环境配置
  env: {
    development: {
      desc: '开发环境',
      setting: {
        minified: false,
        uploadWithSourceMap: true
      }
    },
    production: {
      desc: '生产环境',
      setting: {
        minified: true,
        uploadWithSourceMap: false
      }
    }
  }
};
```

## 使用示例

### 1. 开发环境预览

```bash
# 终端显示二维码
npm run preview

# 生成二维码图片
npm run preview:image
```

### 2. 测试环境上传

```bash
NODE_ENV=staging VERSION=1.0.1 npm run upload
```

### 3. 生产环境发布

```bash
NODE_ENV=production VERSION=1.0.2 ROBOT=1 npm run upload
```

### 4. 自定义配置

```bash
# 预览特定页面
node cli/index.js preview --page-path pages/detail/detail --scene 1011

# 上传并指定机器人
node cli/index.js upload --version 1.0.3 --robot 3 --desc "新功能发布"
```

## 常见问题

### 1. 私钥文件错误

```
错误: 私钥文件不存在
解决: 确保私钥文件路径正确，文件名格式为 private.{appid}.key
```

### 2. AppID 不匹配

```
错误: appid 不正确
解决: 检查 ci.config.js 中的 appid 配置
```

### 3. 机器人编号错误

```
错误: 机器人编号不正确
解决: 机器人编号必须在 1-30 之间
```

### 4. 网络问题

```
错误: 网络连接失败
解决: 检查网络连接，或配置代理
```

## 调试模式

启用调试模式可以查看详细的错误信息：

```bash
DEBUG=1 node cli/index.js preview
```

## 注意事项

1. 私钥文件请勿提交到版本控制系统
2. 生产环境建议关闭 sourceMap 上传
3. 机器人编号需要在微信公众平台配置
4. 版本号建议使用语义化版本规范

## 更多信息

- [miniprogram-ci 官方文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
