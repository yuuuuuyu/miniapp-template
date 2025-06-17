/**
 * miniprogram-ci 配置文件
 * 请根据实际项目情况修改相关配置
 */

const path = require('path');

module.exports = {
    // 项目基本信息
    appid: 'wx12e1d849722bc528', // 从 project.config.json 获取
    projectName: 'miniapp-IDC431', // 从 project.private.config.json 获取

    // 项目路径配置
    projectPath: path.resolve(__dirname, './'), // 项目根目录
    miniprogramRoot: 'miniprogram/', // 小程序源码目录

    // 私钥文件路径 (需要从微信公众平台下载)
    // 请将私钥文件放在项目根目录下，文件名格式: private.{appid}.key
    privateKeyPath: path.resolve(__dirname, `./private.${process.env.APPID || 'wx12e1d849722bc528'}.key`),

    // 忽略文件配置
    ignores: [
        'node_modules/**/*',
        '.git/**/*',
        '.vscode/**/*',
        '*.log',
        'cli/**/*',
        'README.md',
        'ci.config.js',
        'private.*.key',
        'pnpm-lock.yaml',
        'package-lock.json',
        'yarn.lock'
    ],

    // 编译设置
    setting: {
        useProjectConfig: true, // 使用项目配置文件
        es6: true,
        minified: true,
        minifyWXSS: true,
        minifyWXML: true,
        uploadWithSourceMap: false, // 生产环境建议关闭
        ignoreUploadUnusedFiles: true
    },

    // 预览配置
    preview: {
        qrcodeFormat: 'terminal', // 二维码格式: 'image' | 'base64' | 'terminal'
        qrcodeOutputDest: path.resolve(__dirname, './preview-qrcode.jpg'), // 二维码保存路径
        pagePath: '', // 预览页面路径，如: 'pages/index/index'
        searchQuery: '', // 预览参数，如: 'a=1&b=2'
        scene: 1001, // 场景值
        desc: '预览版本' // 预览描述
    },

    // 上传配置
    upload: {
        desc: '通过 CI 上传', // 上传描述
        version: '1.0.0' // 版本号，可通过环境变量 VERSION 覆盖
    },

    // 机器人配置 (1-30)
    robot: parseInt(process.env.ROBOT) || 1,

    // 代理配置
    proxy: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '',

    // 环境变量配置
    env: {
        development: {
            desc: '开发环境',
            setting: {
                es6: true,
                minified: false,
                uploadWithSourceMap: true,
                useProjectConfig: true
            }
        },
        staging: {
            desc: '测试环境',
            setting: {
                es6: true,
                minified: true,
                uploadWithSourceMap: true,
                useProjectConfig: true
            }
        },
        production: {
            desc: '生产环境',
            setting: {
                es6: true,
                minified: true,
                uploadWithSourceMap: false,
                useProjectConfig: true
            }
        }
    }
};
