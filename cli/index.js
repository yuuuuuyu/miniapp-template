#!/usr/bin/env node

/**
 * miniprogram-ci CLI 工具
 * 支持预览和上传小程序
 */

const ci = require('miniprogram-ci');
const path = require('path');
const inquirer = require('inquirer');
const logger = require('./utils/logger');
const { validateConfig, getVersion, getAndIncrementVersion, getTimestamp, fileExists } = require('./utils/helpers');

// 加载配置文件
function loadConfig() {
    const configPath = path.resolve(__dirname, '../ci.config.js');

    if (!fileExists(configPath)) {
        logger.error('配置文件不存在: ci.config.js');
        logger.info('请先创建配置文件');
        process.exit(1);
    }

    try {
        const config = require(configPath);

        // 根据环境变量调整配置
        const env = process.env.NODE_ENV || 'development';
        if (config.env && config.env[env]) {
            config.setting = { ...config.setting, ...config.env[env].setting };
            if (config.env[env].desc) {
                config.upload.desc = config.env[env].desc + ' - ' + config.upload.desc;
            }
        }

        return config;
    } catch (error) {
        logger.error('加载配置文件失败:', error.message);
        process.exit(1);
    }
}

// 创建项目实例
function createProject(config) {
    try {
        return new ci.Project({
            appid: config.appid,
            type: 'miniProgram',
            projectPath: config.projectPath,
            privateKeyPath: config.privateKeyPath,
            ignores: config.ignores || []
        });
    } catch (error) {
        logger.error('创建项目实例失败:', error.message);
        throw error;
    }
}

// 交互式获取预览配置
async function getPreviewConfig(config, options = {}) {
    // 如果明确禁用交互模式，或者在非交互环境中，直接返回选项
    if (options.interactive === false || !process.stdin.isTTY) {
        return options;
    }

    const questions = [];

    // 预览描述
    if (!options.desc) {
        questions.push({
            type: 'input',
            name: 'desc',
            message: '请输入预览描述:',
            default: config.preview.desc || `预览版本 - ${getTimestamp()}`
        });
    }

    // 二维码格式
    if (!options.qrcodeFormat) {
        questions.push({
            type: 'list',
            name: 'qrcodeFormat',
            message: '请选择二维码格式:',
            choices: [
                { name: '终端显示 (terminal)', value: 'terminal' },
                { name: '图片文件 (image)', value: 'image' },
                { name: 'Base64 编码 (base64)', value: 'base64' }
            ],
            default: config.preview.qrcodeFormat || 'terminal'
        });
    }

    // 预览页面路径
    if (!options.pagePath) {
        questions.push({
            type: 'input',
            name: 'pagePath',
            message: '请输入预览页面路径 (可选):',
            default: config.preview.pagePath || ''
        });
    }

    // 预览参数
    if (!options.searchQuery) {
        questions.push({
            type: 'input',
            name: 'searchQuery',
            message: '请输入预览参数 (可选):',
            default: config.preview.searchQuery || ''
        });
    }

    // 场景值
    if (!options.scene) {
        questions.push({
            type: 'input',
            name: 'scene',
            message: '请输入场景值 (可选):',
            default: config.preview.scene ? config.preview.scene.toString() : '1001',
            validate: (input) => {
                if (!input) return true;
                const num = parseInt(input);
                return !isNaN(num) && num > 0 ? true : '请输入有效的场景值';
            }
        });
    }

    if (questions.length === 0) {
        return options;
    }

    const answers = await inquirer.prompt(questions);

    // 处理场景值转换
    if (answers.scene) {
        answers.scene = parseInt(answers.scene) || undefined;
    }

    // 如果选择了图片格式，询问输出路径
    const qrcodeFormat = answers.qrcodeFormat || options.qrcodeFormat;
    if (qrcodeFormat === 'image' && !options.qrcodeOutput) {
        const outputQuestion = await inquirer.prompt([{
            type: 'input',
            name: 'qrcodeOutput',
            message: '请输入二维码图片保存路径:',
            default: config.preview.qrcodeOutputDest || './preview-qrcode.jpg'
        }]);
        answers.qrcodeOutput = outputQuestion.qrcodeOutput;
    }

    return { ...options, ...answers };
}

// 预览功能
async function preview(options = {}) {
    logger.info('开始预览小程序...');

    const config = loadConfig();

    // 验证配置
    if (!validateConfig(config)) {
        process.exit(1);
    }

    try {
        // 获取交互式配置
        const interactiveOptions = await getPreviewConfig(config, options);

        const project = createProject(config);

        // 合并预览配置
        const previewOptions = {
            project,
            desc: interactiveOptions.desc || config.preview.desc || `预览版本 - ${getTimestamp()}`,
            setting: config.setting,
            qrcodeFormat: interactiveOptions.qrcodeFormat || config.preview.qrcodeFormat || 'terminal',
            onProgressUpdate: (info) => {
                logger.progress(`预览进度: ${info.message || info}`);
            }
        };

        // 设置二维码输出路径（所有格式都需要，即使不实际保存文件）
        if (previewOptions.qrcodeFormat === 'image') {
            previewOptions.qrcodeOutputDest = interactiveOptions.qrcodeOutput || config.preview.qrcodeOutputDest;
        } else {
            // 为 base64 和 terminal 格式提供默认路径，避免 invalid qrcodeOutputDest 错误
            previewOptions.qrcodeOutputDest = config.preview.qrcodeOutputDest || './preview-qrcode.jpg';
        }

        // 设置预览页面
        if (interactiveOptions.pagePath || config.preview.pagePath) {
            previewOptions.pagePath = interactiveOptions.pagePath || config.preview.pagePath;
        }

        // 设置预览参数
        if (interactiveOptions.searchQuery || config.preview.searchQuery) {
            previewOptions.searchQuery = interactiveOptions.searchQuery || config.preview.searchQuery;
        }

        // 设置场景值
        if (interactiveOptions.scene || config.preview.scene) {
            previewOptions.scene = interactiveOptions.scene || config.preview.scene;
        }

        logger.info('预览配置:', {
            desc: previewOptions.desc,
            qrcodeFormat: previewOptions.qrcodeFormat,
            pagePath: previewOptions.pagePath || '默认首页',
            scene: previewOptions.scene || '默认场景'
        });

        const result = await ci.preview(previewOptions);

        logger.clearProgress();
        logger.success('预览成功!');

        if (previewOptions.qrcodeFormat === 'image' && previewOptions.qrcodeOutputDest) {
            logger.info(`二维码已保存到: ${previewOptions.qrcodeOutputDest}`);
        }

        if (result.subPackageInfo) {
            logger.info('分包信息:', result.subPackageInfo);
        }

        return result;

    } catch (error) {
        logger.clearProgress();
        logger.error('预览失败:', error.message);

        if (error.message.includes('privatekey')) {
            logger.info('请检查私钥文件是否正确');
        } else if (error.message.includes('appid')) {
            logger.info('请检查 appid 是否正确');
        }

        throw error;
    }
}

// 交互式获取上传配置
async function getUploadConfig(config, options = {}) {
    // 如果明确禁用交互模式，或者在非交互环境中，直接返回选项
    if (options.interactive === false || !process.stdin.isTTY) {
        return options;
    }

    const questions = [];

    // 版本号处理
    if (!options.version && options.autoIncrement !== false) {
        questions.push({
            type: 'list',
            name: 'versionAction',
            message: '请选择版本号处理方式:',
            choices: [
                { name: '自动递增 Patch 版本 (x.x.X)', value: 'patch' },
                { name: '自动递增 Minor 版本 (x.X.0)', value: 'minor' },
                { name: '自动递增 Major 版本 (X.0.0)', value: 'major' },
                { name: '手动输入版本号', value: 'manual' },
                { name: '使用当前版本号', value: 'current' }
            ],
            default: options.incrementType || 'patch'
        });
    }

    // 上传描述
    if (!options.desc) {
        questions.push({
            type: 'input',
            name: 'desc',
            message: '请输入上传描述:',
            default: config.upload.desc || '通过 CI 上传'
        });
    }

    // 机器人编号
    if (!options.robot) {
        questions.push({
            type: 'input',
            name: 'robot',
            message: '请输入机器人编号 (1-30):',
            default: (config.robot || 1).toString(),
            validate: (input) => {
                const num = parseInt(input);
                return !isNaN(num) && num >= 1 && num <= 30 ? true : '请输入 1-30 之间的数字';
            }
        });
    }

    if (questions.length === 0) {
        return options;
    }

    const answers = await inquirer.prompt(questions);

    // 处理版本号
    if (answers.versionAction) {
        if (answers.versionAction === 'manual') {
            const versionQuestion = await inquirer.prompt([{
                type: 'input',
                name: 'version',
                message: '请输入版本号:',
                default: getVersion(config),
                validate: (input) => {
                    const versionRegex = /^\d+\.\d+\.\d+$/;
                    return versionRegex.test(input) ? true : '请输入有效的版本号格式 (如: 1.0.0)';
                }
            }]);
            answers.version = versionQuestion.version;
            answers.autoIncrement = false;
        } else if (answers.versionAction === 'current') {
            answers.autoIncrement = false;
        } else {
            answers.incrementType = answers.versionAction;
        }
        delete answers.versionAction;
    }

    // 处理机器人编号转换
    if (answers.robot) {
        answers.robot = parseInt(answers.robot);
    }

    return { ...options, ...answers };
}

// 上传功能
async function upload(options = {}) {
    logger.info('开始上传小程序...');

    const config = loadConfig();

    // 验证配置
    if (!validateConfig(config)) {
        process.exit(1);
    }

    try {
        // 获取交互式配置
        const interactiveOptions = await getUploadConfig(config, options);

        const project = createProject(config);

        // 版本号处理逻辑
        let version;
        if (interactiveOptions.version) {
            // 如果明确指定了版本号，使用指定的版本号
            version = interactiveOptions.version;
        } else if (interactiveOptions.autoIncrement !== false) {
            // 默认自动递增版本号（除非明确设置 --no-auto-increment）
            const incrementType = interactiveOptions.incrementType || 'patch';
            version = getAndIncrementVersion(config, incrementType);
        } else {
            // 不自动递增，使用当前版本号
            version = getVersion(config);
        }

        const desc = interactiveOptions.desc || `${config.upload.desc} - v${version} - ${getTimestamp()}`;

        const uploadOptions = {
            project,
            version,
            desc,
            setting: config.setting,
            robot: interactiveOptions.robot || config.robot || 1,
            onProgressUpdate: (info) => {
                logger.progress(`上传进度: ${info.message || info}`);
            }
        };

        logger.info('上传配置:', {
            version: uploadOptions.version,
            desc: uploadOptions.desc,
            robot: uploadOptions.robot
        });

        const result = await ci.upload(uploadOptions);

        logger.clearProgress();
        logger.success('上传成功!');
        logger.info('上传结果:', {
            version: result.version || version,
            desc: result.desc || desc
        });

        if (result.subPackageInfo) {
            logger.info('分包信息:', result.subPackageInfo);
        }

        return result;

    } catch (error) {
        logger.clearProgress();
        logger.error('上传失败:', error.message);

        if (error.message.includes('privatekey')) {
            logger.info('请检查私钥文件是否正确');
        } else if (error.message.includes('appid')) {
            logger.info('请检查 appid 是否正确');
        } else if (error.message.includes('robot')) {
            logger.info('请检查机器人编号是否正确 (1-30)');
        }

        throw error;
    }
}

// 命令行参数解析
function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const options = {};

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];

        if (arg && arg.startsWith('--')) {
            const key = arg.slice(2);

            // 处理布尔标志
            if (key === 'no-auto-increment') {
                options.autoIncrement = false;
                continue;
            }

            if (key === 'no-interactive') {
                options.interactive = false;
                continue;
            }

            if (key === 'interactive') {
                options.interactive = true;
                continue;
            }

            // 处理键值对参数
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('--')) {
                const optionName = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                options[optionName] = nextArg;
                i++; // 跳过下一个参数，因为它是当前参数的值
            }
        }
    }

    return { command, options };
}

// 显示帮助信息
function showHelp() {
    console.log(`
miniprogram-ci CLI 工具

用法:
  node cli/index.js <command> [options]

命令:
  preview                预览小程序
  upload                 上传小程序
  help                   显示帮助信息

通用选项:
  --interactive          启用交互模式 (默认启用)
  --no-interactive       禁用交互模式

预览选项:
  --desc <string>        预览描述
  --qrcode-format <type> 二维码格式 (image|base64|terminal)
  --qrcode-output <path> 二维码输出路径 (仅当格式为image时)
  --page-path <path>     预览页面路径
  --search-query <query> 预览参数
  --scene <number>       场景值

上传选项:
  --version <string>     版本号 (指定后不会自动递增)
  --desc <string>        上传描述
  --robot <number>       机器人编号 (1-30)
  --increment-type <type> 版本递增类型 (major|minor|patch，默认: patch)
  --no-auto-increment    禁用自动版本递增

环境变量:
  NODE_ENV              环境 (development|staging|production)
  VERSION               版本号
  ROBOT                 机器人编号
  APPID                 小程序 AppID
  DEBUG                 调试模式

示例:
  # 交互式预览小程序 (默认模式)
  node cli/index.js preview

  # 非交互式预览小程序
  node cli/index.js preview --no-interactive --qrcode-format terminal

  # 预览并保存二维码图片
  node cli/index.js preview --qrcode-format image --qrcode-output ./qr.jpg

  # 交互式上传小程序 (默认模式)
  node cli/index.js upload

  # 非交互式上传小程序 (自动递增 patch 版本号)
  node cli/index.js upload --no-interactive --desc "修复bug"

  # 上传小程序 (自动递增 minor 版本号)
  node cli/index.js upload --increment-type minor --desc "新功能"

  # 上传小程序 (指定版本号，不自动递增)
  node cli/index.js upload --version 1.0.1 --desc "指定版本"

  # 上传小程序 (禁用自动递增)
  node cli/index.js upload --no-auto-increment --desc "保持当前版本"

  # 使用环境变量
  VERSION=1.0.2 ROBOT=2 node cli/index.js upload
`);
}

// 主函数
async function main() {
    try {
        const { command, options } = parseArgs();

        switch (command) {
            case 'preview':
                await preview(options);
                break;

            case 'upload':
                await upload(options);
                break;

            case 'help':
            case '--help':
            case '-h':
                showHelp();
                break;

            default:
                if (!command) {
                    logger.error('请指定命令');
                } else {
                    logger.error(`未知命令: ${command}`);
                }
                showHelp();
                process.exit(1);
        }

    } catch (error) {
        logger.error('执行失败:', error.message);
        if (process.env.DEBUG) {
            console.error(error);
        }
        process.exit(1);
    }
}

// 导出函数供外部调用
module.exports = {
    preview,
    upload,
    loadConfig,
    createProject
};

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
    main();
}