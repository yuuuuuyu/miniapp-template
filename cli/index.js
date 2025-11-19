#!/usr/bin/env node

/**
 * miniprogram-ci CLI 工具
 * 支持预览和上传小程序
 */

const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');
const logger = require('./utils/logger');
const { validateConfig, getVersion, getAndIncrementVersion, getTimestamp, fileExists, getGitCommits, getGitUser, formatCommitsForUpload } = require('./utils/helpers');

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
                { name: '图片文件 (image)', value: 'image' }
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
    logger.separator('小程序预览');
    logger.step(1, '初始化配置', '加载配置文件并获取预览参数');

    const config = loadConfig();

    // 验证配置
    if (!validateConfig(config)) {
        process.exit(1);
    }

    // 重写console.log和process.stdout.write来过滤冗长输出
    const originalConsoleLog = console.log;
    const originalStdoutWrite = process.stdout.write;

    console.log = function (...args) {
        const message = args.join(' ');
        const filtered = logger.filterOutput(message);
        if (filtered && filtered !== message) {
            originalConsoleLog.call(console, chalk.blue(logger.prefix), filtered);
        } else if (filtered) {
            originalConsoleLog.apply(console, args);
        }
        // 如果filtered为null，则不输出任何内容
    };

    process.stdout.write = function (chunk, encoding, callback) {
        if (typeof chunk === 'string') {
            const filtered = logger.filterOutput(chunk);
            if (filtered && filtered !== chunk) {
                return originalStdoutWrite.call(this, chalk.blue(logger.prefix) + ' ' + filtered, encoding, callback);
            } else if (filtered) {
                return originalStdoutWrite.call(this, chunk, encoding, callback);
            }
            // 如果filtered为null，则不输出任何内容
            if (callback) callback();
            return true;
        }
        return originalStdoutWrite.call(this, chunk, encoding, callback);
    };

    try {
        // 获取交互式配置
        const interactiveOptions = await getPreviewConfig(config, options);
        const project = createProject(config);

        logger.step(2, '配置预览参数', '设置预览选项和二维码格式');

        // 合并预览配置
        const previewOptions = {
            project,
            desc: interactiveOptions.desc || config.preview.desc || `预览版本 - ${getTimestamp()}`,
            setting: config.setting,
            qrcodeFormat: interactiveOptions.qrcodeFormat || config.preview.qrcodeFormat || 'terminal',
            onProgressUpdate: (info) => {
                const message = info.message || info;
                const filtered = logger.filterOutput(message);
                if (filtered) {
                    logger.progress(filtered);
                }
            }
        };

        // 设置二维码输出路径
        if (previewOptions.qrcodeFormat === 'image') {
            previewOptions.qrcodeOutputDest = interactiveOptions.qrcodeOutput || config.preview.qrcodeOutputDest;
        } else {
            // 为 terminal 格式提供默认路径，避免 invalid qrcodeOutputDest 错误
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

        // 显示预览配置
        const configInfo = {
            '描述': previewOptions.desc,
            '二维码格式': previewOptions.qrcodeFormat === 'terminal' ? '终端显示' : '图片文件',
            '预览页面': previewOptions.pagePath || '默认首页',
            '场景值': previewOptions.scene || '默认场景'
        };

        if (previewOptions.qrcodeFormat === 'image') {
            configInfo['输出路径'] = previewOptions.qrcodeOutputDest;
        }

        logger.config('预览配置', configInfo);

        logger.step(3, '生成预览', '正在生成预览二维码');

        const result = await ci.preview(previewOptions);

        logger.clearProgress();
        logger.separator();

        // 显示预览结果
        const resultInfo = {
            '生成时间': new Date().toLocaleString('zh-CN'),
            '二维码格式': previewOptions.qrcodeFormat === 'terminal' ? '终端显示' : '图片文件'
        };

        if (previewOptions.qrcodeFormat === 'image' && previewOptions.qrcodeOutputDest) {
            resultInfo['保存路径'] = previewOptions.qrcodeOutputDest;
        }

        logger.result('预览生成成功', resultInfo);

        // 显示分包信息
        if (result.subPackageInfo && result.subPackageInfo.length > 0) {
            logger.info('分包信息:');
            result.subPackageInfo.forEach((pkg, index) => {
                console.log(`  ${chalk.gray('•')} ${chalk.cyan(`分包${index + 1}`)}: ${chalk.white(pkg.name || '主包')} (${chalk.yellow(pkg.size || '未知大小')})`);
            });
        }

        logger.separator();
        return result;

    } catch (error) {
        logger.clearProgress();
        logger.separator();
        logger.error('预览失败', error.message);

        if (error.message.includes('privatekey')) {
            logger.warn('请检查私钥文件是否存在且正确');
            logger.info(`私钥路径: ${config.privateKeyPath}`);
        } else if (error.message.includes('appid')) {
            logger.warn('请检查 AppID 是否正确');
            logger.info(`当前 AppID: ${config.appid}`);
        }

        logger.separator();
        throw error;
    } finally {
        // 恢复原始的console.log和process.stdout.write
        console.log = originalConsoleLog;
        process.stdout.write = originalStdoutWrite;
    }
}

// 获取上传配置（非交互式）
function getUploadConfig(config, options = {}) {
    // 获取Git提交信息作为描述
    const commits = getGitCommits(options.commitCount || 5);

    // 确定描述格式
    const descFormat = options.descFormat || config.upload?.descFormat || 'detailed';
    const formatOptions = {
        format: descFormat,
        maxLength: options.descMaxLength || config.upload?.descMaxLength || 500,
        includeHash: options.includeHash !== false,
        groupByType: descFormat === 'changelog'
    };

    const defaultDesc = formatCommitsForUpload(commits, formatOptions);

    // 获取Git用户信息作为默认robot
    const gitUser = getGitUser();
    const defaultRobot = options.robot || config.robot || 1;

    return {
        // 版本号处理：默认自动递增patch版本
        autoIncrement: options.autoIncrement !== false,
        incrementType: options.incrementType || 'patch',
        version: options.version, // 如果指定了版本号，则使用指定的

        // 描述：使用Git提交信息
        desc: options.desc || defaultDesc,

        // 机器人编号：必须是1-30之间的数字
        robot: defaultRobot,

        // Git信息
        gitUser: gitUser,
        commits: commits,

        // 格式化选项
        descFormat: descFormat,
        formatOptions: formatOptions,

        ...options
    };
}



// 创建页面功能
async function createPage(pageName, options = {}) {
    logger.separator('创建小程序页面');

    if (!pageName) {
        logger.error('请指定页面名称');
        logger.info('用法: node cli/index.js create-page <页面名称>');
        process.exit(1);
    }

    logger.step(1, '验证页面名称', '检查页面名称格式');

    // 验证页面名称格式
    if (!/^[a-zA-Z0-9_-]+$/.test(pageName)) {
        logger.error('页面名称只能包含字母、数字、下划线和中划线');
        process.exit(1);
    }

    logger.step(2, '检查页面路径', '确认页面是否已存在');

    // 获取项目路径
    const projectPath = path.resolve(__dirname, '../miniprogram');
    const pagePath = path.join(projectPath, 'pages', pageName);

    // 检查页面是否已存在
    if (fs.existsSync(pagePath)) {
        logger.error(`页面已存在: pages/${pageName}`);
        process.exit(1);
    }

    logger.step(3, '创建页面文件', '生成页面所需的四个文件');

    try {
        // 创建页面目录
        fs.mkdirSync(pagePath, { recursive: true });
        logger.info(`创建目录: pages/${pageName}`);

        // 模板内容
        const templates = {
            ts: `Page({

  // 页面的初始数据
  data: {

  },

  // 生命周期函数--监听页面加载
  onLoad: function (options) {

  },

  // 生命周期函数--监听页面初次渲染完成
  onReady: function () {

  },

  // 生命周期函数--监听页面显示
  onShow: function () {

  },

  // 生命周期函数--监听页面隐藏
  onHide: function () {

  },

  // 生命周期函数--监听页面卸载
  onUnload: function () {

  },

  // 页面相关事件处理函数--监听用户下拉动作
  onPullDownRefresh: function () {

  },

  // 页面上拉触底事件的处理函数
  onReachBottom: function () {

  },

  // 用户点击右上角分享
  onShareAppMessage: function () {

  }
});`,
            json: `{
  "usingComponents": {}
}`,
            wxml: `<text>pages/${pageName}/${pageName}.wxml</text>`,
            scss: `.${pageName} {}`
        };

        // 创建文件
        const files = ['ts', 'json', 'wxml', 'scss'];
        files.forEach(ext => {
            const filePath = path.join(pagePath, `${pageName}.${ext}`);
            fs.writeFileSync(filePath, templates[ext], 'utf8');
            logger.success(`创建文件: pages/${pageName}/${pageName}.${ext}`);
        });

        logger.step(4, '更新配置文件', '在 app.json 中注册新页面');

        // 更新 app.json
        const appJsonPath = path.join(projectPath, 'app.json');
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

        // 添加新页面路径
        const newPagePath = `pages/${pageName}/${pageName}`;
        if (!appJson.pages.includes(newPagePath)) {
            appJson.pages.push(newPagePath);
            fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, '\t'), 'utf8');
            logger.success(`页面路径已添加到 app.json: ${newPagePath}`);
        } else {
            logger.warn(`页面路径已存在于 app.json: ${newPagePath}`);
        }

        logger.separator();

        // 显示创建结果
        const resultInfo = {
            '页面名称': pageName,
            '页面路径': `pages/${pageName}`,
            '创建时间': new Date().toLocaleString('zh-CN'),
            '文件数量': '4 个文件 (ts, json, wxml, scss)'
        };

        logger.result('页面创建成功', resultInfo);
        logger.info('你可以在微信开发者工具中查看并编辑新创建的页面');
        logger.separator();

        return {
            pageName,
            pagePath,
            files: files.map(ext => `${pageName}.${ext}`)
        };

    } catch (error) {
        logger.separator();
        logger.error('创建页面失败', error.message);

        // 清理已创建的文件
        if (fs.existsSync(pagePath)) {
            try {
                fs.rmSync(pagePath, { recursive: true, force: true });
                logger.info('已清理创建的文件');
            } catch (cleanupError) {
                logger.warn('清理文件失败:', cleanupError.message);
            }
        }

        logger.separator();
        throw error;
    }
}

// 删除页面功能
async function deletePage(pageName, options = {}) {
    logger.separator('删除小程序页面');

    if (!pageName) {
        logger.error('请指定页面名称');
        logger.info('用法: node cli/index.js delete-page <页面名称>');
        process.exit(1);
    }

    logger.step(1, '验证页面名称', '检查页面名称格式');

    // 验证页面名称格式
    if (!/^[a-zA-Z0-9_-]+$/.test(pageName)) {
        logger.error('页面名称只能包含字母、数字、下划线和中划线');
        process.exit(1);
    }

    logger.step(2, '检查页面路径', '确认页面是否存在');

    // 获取项目路径
    const projectPath = path.resolve(__dirname, '../miniprogram');
    const pagePath = path.join(projectPath, 'pages', pageName);

    // 检查页面是否存在
    if (!fs.existsSync(pagePath)) {
        logger.error(`页面不存在: pages/${pageName}`);
        process.exit(1);
    }

    logger.step(3, '确认删除操作', '请确认是否删除页面');

    // 如果不是强制删除模式，需要确认
    if (!options.force) {
        const answer = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirmDelete',
            message: `确定要删除页面 "${pageName}" 吗？此操作不可恢复。`,
            default: false
        }]);

        if (!answer.confirmDelete) {
            logger.info('已取消删除操作');
            logger.separator();
            process.exit(0);
        }
    }

    logger.step(4, '删除页面文件', '移除页面目录及所有文件');

    try {
        // 检查要删除的文件
        const files = ['ts', 'json', 'wxml', 'scss'];
        const existingFiles = [];

        files.forEach(ext => {
            const filePath = path.join(pagePath, `${pageName}.${ext}`);
            if (fs.existsSync(filePath)) {
                existingFiles.push(`${pageName}.${ext}`);
            }
        });

        // 删除页面目录
        fs.rmSync(pagePath, { recursive: true, force: true });
        logger.success(`删除目录: pages/${pageName}`);

        existingFiles.forEach(file => {
            logger.info(`  - 已删除: ${file}`);
        });

        logger.step(5, '更新配置文件', '从 app.json 中移除页面路径');

        // 更新 app.json
        const appJsonPath = path.join(projectPath, 'app.json');
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

        // 移除页面路径
        const pagePathToRemove = `pages/${pageName}/${pageName}`;
        const originalLength = appJson.pages.length;
        appJson.pages = appJson.pages.filter(page => page !== pagePathToRemove);

        if (appJson.pages.length < originalLength) {
            fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, '\t'), 'utf8');
            logger.success(`页面路径已从 app.json 中移除: ${pagePathToRemove}`);
        } else {
            logger.warn(`页面路径未在 app.json 中找到: ${pagePathToRemove}`);
        }

        logger.separator();

        // 显示删除结果
        const resultInfo = {
            '页面名称': pageName,
            '页面路径': `pages/${pageName}`,
            '删除时间': new Date().toLocaleString('zh-CN'),
            '删除文件数': `${existingFiles.length} 个文件`
        };

        logger.result('页面删除成功', resultInfo);
        logger.separator();

        return {
            pageName,
            pagePath,
            deletedFiles: existingFiles
        };

    } catch (error) {
        logger.separator();
        logger.error('删除页面失败', error.message);
        logger.separator();
        throw error;
    }
}

// 构建npm功能
async function buildNpm(options = {}) {
    logger.separator('构建npm');
    logger.step(1, '初始化配置', '加载配置文件并检查构建环境');

    const config = loadConfig();

    // 验证配置
    if (!validateConfig(config)) {
        process.exit(1);
    }

    try {
        const project = createProject(config);

        // 构建npm配置
        const buildOptions = {
            ignores: options.ignores || config.buildNpm?.ignores || [],
            reporter: (infos) => {
                if (options.verbose || config.buildNpm?.verbose) {
                    logger.debug('构建详细信息:', infos);
                }
            }
        };

        // 显示构建配置
        const configInfo = {
            '排除规则': buildOptions.ignores.length > 0 ? buildOptions.ignores.join(', ') : '无',
            '详细模式': options.verbose || config.buildNpm?.verbose || false
        };
        logger.config('构建配置', configInfo);

        logger.step(2, '检测构建方式', '分析项目配置选择最佳构建策略');

        let warnings;

        // 检查项目配置是否启用了手动构建npm
        const projectConfigPath = path.resolve(config.projectPath, 'project.config.json');
        let projectConfig = {};
        try {
            projectConfig = require(projectConfigPath);
        } catch (error) {
            logger.warn('无法读取 project.config.json，使用默认构建方式');
        }

        // 检查是否有packNpmRelationList配置，如果有则优先使用手动构建
        if (projectConfig.setting?.packNpmRelationList && projectConfig.setting.packNpmRelationList.length > 0) {
            logger.info('检测到npm构建关系配置，使用手动构建方式');
            logger.step(3, '手动构建npm', '根据配置的关系列表构建npm包');

            // 使用手动构建npm的方式
            const relationList = projectConfig.setting.packNpmRelationList;
            const results = [];

            for (let i = 0; i < relationList.length; i++) {
                const relation = relationList[i];
                const packageJsonPath = path.resolve(config.projectPath, relation.packageJsonPath);
                const miniprogramNpmDistDir = path.resolve(config.projectPath, relation.miniprogramNpmDistDir);

                logger.progress(`构建第 ${i + 1}/${relationList.length} 个npm包`);

                const result = await ci.packNpmManually({
                    packageJsonPath,
                    miniprogramNpmDistDir,
                    ignores: buildOptions.ignores
                });

                results.push(result);
                logger.info(`包 ${i + 1}: 小程序包=${result.miniProgramPackNum}, 其他包=${result.otherNpmPackNum}`);
            }

            // 合并所有警告
            warnings = results.reduce((allWarnings, result) => {
                return allWarnings.concat(result.warnList || []);
            }, []);

        } else {
            // 使用标准构建npm的方式
            logger.info('使用标准构建方式');
            logger.step(3, '标准构建npm', '使用微信开发者工具标准构建流程');

            try {
                warnings = await ci.packNpm(project, buildOptions);
            } catch (error) {
                if (error.message.includes('__NO_NODE_MODULES__')) {
                    logger.warn('标准构建失败，切换到手动构建方式');

                    // 如果标准方式失败，尝试手动构建到项目根目录
                    const packageJsonPath = path.resolve(config.projectPath, 'package.json');
                    const miniprogramNpmDistDir = config.projectPath; // 构建到项目根目录

                    logger.progress('使用手动构建方式重试');

                    const result = await ci.packNpmManually({
                        packageJsonPath,
                        miniprogramNpmDistDir,
                        ignores: buildOptions.ignores
                    });

                    warnings = result.warnList || [];
                    logger.info(`构建结果: 小程序包=${result.miniProgramPackNum}, 其他包=${result.otherNpmPackNum}`);
                } else {
                    throw error;
                }
            }
        }

        logger.clearProgress();
        logger.separator();

        // 显示构建结果
        const resultInfo = {
            '构建时间': new Date().toLocaleString('zh-CN'),
            '警告数量': warnings ? warnings.length : 0
        };

        logger.result('构建npm成功', resultInfo);

        // 显示警告信息
        if (warnings && warnings.length > 0) {
            logger.warn(`发现 ${warnings.length} 个构建警告:`);
            warnings.forEach((warning, index) => {
                console.log(`  ${chalk.yellow(`${index + 1}.`)} ${chalk.white(warning.msg)}`);
                if (warning.code) {
                    console.log(`     ${chalk.gray('代码:')} ${chalk.cyan(warning.code)}`);
                }
                if (warning.jsPath) {
                    console.log(`     ${chalk.gray('位置:')} ${chalk.cyan(warning.jsPath)}:${chalk.yellow(warning.startLine)}-${chalk.yellow(warning.endLine)}`);
                }
                if (index < warnings.length - 1) {
                    console.log('');
                }
            });
        } else {
            logger.success('构建过程无警告');
        }

        logger.separator();
        return warnings;

    } catch (error) {
        logger.clearProgress();
        logger.separator();
        logger.error('构建npm失败', error.message);

        if (error.message.includes('privatekey')) {
            logger.warn('请检查私钥文件是否存在且正确');
            logger.info(`私钥路径: ${config.privateKeyPath}`);
        } else if (error.message.includes('appid')) {
            logger.warn('请检查 AppID 是否正确');
            logger.info(`当前 AppID: ${config.appid}`);
        } else if (error.message.includes('package.json')) {
            logger.warn('请检查项目中是否存在 package.json 文件');
            logger.info(`项目路径: ${config.projectPath}`);
        } else if (error.message.includes('node_modules')) {
            logger.warn('请检查项目中是否存在 node_modules 目录');
            logger.info('请先运行 npm install 或 pnpm install 安装依赖');
        }

        logger.separator();
        throw error;
    }
}

// 上传功能
async function upload(options = {}) {
    logger.separator('小程序上传');
    logger.step(1, '初始化配置', '加载配置文件并验证参数');

    const config = loadConfig();

    // 验证配置
    if (!validateConfig(config)) {
        process.exit(1);
    }

    // 重写console.log和process.stdout.write来过滤冗长输出
    const originalConsoleLog = console.log;
    const originalStdoutWrite = process.stdout.write;

    console.log = function (...args) {
        const message = args.join(' ');
        const filtered = logger.filterOutput(message);
        if (filtered && filtered !== message) {
            originalConsoleLog.call(console, chalk.blue(logger.prefix), filtered);
        } else if (filtered) {
            originalConsoleLog.apply(console, args);
        }
        // 如果filtered为null，则不输出任何内容
    };

    process.stdout.write = function (chunk, encoding, callback) {
        if (typeof chunk === 'string') {
            const filtered = logger.filterOutput(chunk);
            if (filtered && filtered !== chunk) {
                return originalStdoutWrite.call(this, chalk.blue(logger.prefix) + ' ' + filtered, encoding, callback);
            } else if (filtered) {
                return originalStdoutWrite.call(this, chunk, encoding, callback);
            }
            // 如果filtered为null，则不输出任何内容
            if (callback) callback();
            return true;
        }
        return originalStdoutWrite.call(this, chunk, encoding, callback);
    };

    try {
        // 获取上传配置（非交互式）
        const uploadConfig = getUploadConfig(config, options);
        const project = createProject(config);

        logger.step(2, '处理版本号', '确定上传版本号');

        // 版本号处理逻辑
        let version;
        let versionInfo = {};

        if (uploadConfig.version) {
            // 如果明确指定了版本号，使用指定的版本号
            version = uploadConfig.version;
            versionInfo = {
                type: '指定版本',
                version: version,
                source: '命令行参数'
            };
        } else if (uploadConfig.autoIncrement !== false) {
            // 默认自动递增版本号（除非明确设置 --no-auto-increment）
            const incrementType = uploadConfig.incrementType || 'patch';
            const currentVersion = getVersion(config);
            version = getAndIncrementVersion(config, incrementType);
            versionInfo = {
                type: '自动递增',
                '当前版本': currentVersion,
                '新版本': version,
                '递增类型': incrementType
            };
        } else {
            // 不自动递增，使用当前版本号
            version = getVersion(config);
            versionInfo = {
                type: '当前版本',
                version: version,
                source: 'package.json'
            };
        }

        logger.config('版本信息', versionInfo);

        logger.step(3, '准备上传参数', '配置上传选项和描述信息');

        // 使用Git提交信息作为描述
        const desc = uploadConfig.desc;

        const uploadOptions = {
            project,
            version,
            desc,
            setting: config.setting,
            robot: uploadConfig.robot,
            onProgressUpdate: (info) => {
                const message = info.message || info;
                const filtered = logger.filterOutput(message);
                if (filtered) {
                    logger.progress(filtered);
                }
            }
        };

        // 显示上传配置
        const configInfo = {
            '版本号': uploadOptions.version,
            '机器人编号': uploadOptions.robot,
            '开发者': uploadConfig.gitUser.name || '未知用户',
            '提交数量': uploadConfig.commits.length + ' 个'
        };
        logger.config('上传配置', configInfo);

        // 显示上传描述（如果太长则截断显示）
        const maxDescLength = 100;
        const displayDesc = desc.length > maxDescLength
            ? desc.substring(0, maxDescLength) + '...'
            : desc;
        logger.info('上传描述:');
        console.log(`  ${chalk.gray(displayDesc)}`);

        logger.step(4, '开始上传', '正在上传小程序到微信服务器');

        const result = await ci.upload(uploadOptions);

        logger.clearProgress();
        logger.separator();

        // 显示上传结果
        const resultInfo = {
            '版本号': result.version || version,
            '上传时间': new Date().toLocaleString('zh-CN'),
            '机器人': uploadOptions.robot
        };

        logger.result('上传成功', resultInfo);

        // 显示分包信息
        if (result.subPackageInfo && result.subPackageInfo.length > 0) {
            logger.info('分包信息:');
            result.subPackageInfo.forEach((pkg, index) => {
                console.log(`  ${chalk.gray('•')} ${chalk.cyan(`分包${index + 1}`)}: ${chalk.white(pkg.name || '主包')} (${chalk.yellow(pkg.size || '未知大小')})`);
            });
        }

        logger.separator();
        return result;

    } catch (error) {
        logger.clearProgress();
        logger.separator();
        logger.error('上传失败', error.message);

        // 提供具体的错误提示
        if (error.message.includes('privatekey')) {
            logger.warn('请检查私钥文件是否存在且正确');
            logger.info(`私钥路径: ${config.privateKeyPath}`);
        } else if (error.message.includes('appid')) {
            logger.warn('请检查 AppID 是否正确');
            logger.info(`当前 AppID: ${config.appid}`);
        } else if (error.message.includes('robot')) {
            logger.warn('请检查机器人编号是否正确 (1-30)');
            logger.info(`当前机器人编号: ${options.robot || config.robot || 1}`);
        } else if (error.message.includes('version')) {
            logger.warn('版本号可能存在问题');
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            logger.warn('网络连接问题，请检查网络或稍后重试');
        }

        logger.separator();
        throw error;
    } finally {
        // 恢复原始的console.log和process.stdout.write
        console.log = originalConsoleLog;
        process.stdout.write = originalStdoutWrite;
    }
}

// 命令行参数解析
function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const options = {};

    // 对于 create-page 命令，第二个参数是页面名称
    if (command === 'create-page') {
        options.pageName = args[1];
        return { command, options };
    }

    // 对于 delete-page 命令，第二个参数是页面名称
    if (command === 'delete-page') {
        options.pageName = args[1];
        // 检查是否有 --force 参数
        if (args.includes('--force') || args.includes('-f')) {
            options.force = true;
        }
        return { command, options };
    }

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

            if (key === 'verbose') {
                options.verbose = true;
                continue;
            }

            if (key === 'no-include-hash') {
                options.includeHash = false;
                continue;
            }

            // 处理键值对参数
            const nextArg = args[i + 1];
            if (nextArg && !nextArg.startsWith('--')) {
                const optionName = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

                // 特殊处理不同类型的参数
                if (optionName === 'ignores') {
                    // 逗号分隔的字符串转换为数组
                    options[optionName] = nextArg.split(',').map(pattern => pattern.trim());
                } else if (optionName === 'commitCount' || optionName === 'descMaxLength' || optionName === 'robot' || optionName === 'scene') {
                    // 数字类型参数
                    options[optionName] = parseInt(nextArg, 10);
                } else {
                    options[optionName] = nextArg;
                }
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
  build-npm              构建npm (对应开发者工具的构建npm功能)
  create-page <name>     创建新页面 (自动生成ts/json/wxml/scss文件并更新app.json)
  delete-page <name>     删除页面 (删除页面文件和目录，并从app.json中移除)
  help                   显示帮助信息

通用选项:
  --interactive          启用交互模式 (默认启用)
  --no-interactive       禁用交互模式

创建页面选项:
  <name>                 页面名称 (必需，只能包含字母、数字、下划线和中划线)

删除页面选项:
  <name>                 页面名称 (必需)
  --force, -f            强制删除，不需要确认

预览选项:
  --desc <string>        预览描述
  --qrcode-format <type> 二维码格式 (image|terminal)
  --qrcode-output <path> 二维码输出路径 (仅当格式为image时)
  --page-path <path>     预览页面路径
  --search-query <query> 预览参数
  --scene <number>       场景值

上传选项:
  --version <string>     版本号 (指定后不会自动递增)
  --desc <string>        上传描述 (默认使用Git提交信息)
  --robot <number>       CI机器人编号 (1-30，默认: 1)
  --increment-type <type> 版本递增类型 (major|minor|patch，默认: patch)
  --no-auto-increment    禁用自动版本递增
  --desc-format <type>   描述格式 (simple|detailed|changelog，默认: detailed)
  --commit-count <number> 获取提交记录数量 (默认: 5)
  --desc-max-length <number> 描述最大长度 (默认: 500)
  --no-include-hash      不包含提交哈希值

构建npm选项:
  --ignores <patterns>   指定需要排除的规则 (逗号分隔)
  --verbose              显示详细构建信息

环境变量:
  NODE_ENV              环境 (development|staging|production)
  VERSION               版本号
  ROBOT                 机器人编号
  APPID                 小程序 AppID
  DEBUG                 调试模式

示例:
  # 创建新页面
  node cli/index.js create-page my-page
  node cli/index.js create-page user-profile

  # 删除页面 (交互式确认)
  node cli/index.js delete-page my-page

  # 强制删除页面 (不需要确认)
  node cli/index.js delete-page my-page --force
  node cli/index.js delete-page my-page -f

  # 交互式预览小程序 (默认模式)
  node cli/index.js preview

  # 非交互式预览小程序
  node cli/index.js preview --no-interactive --qrcode-format terminal

  # 预览并保存二维码图片
  node cli/index.js preview --qrcode-format image --qrcode-output ./qr.jpg

  # 上传小程序 (自动递增 patch 版本号，使用Git提交信息作为描述)
  node cli/index.js upload

  # 上传小程序 (自动递增 minor 版本号)
  node cli/index.js upload --increment-type minor

  # 上传小程序 (指定版本号，不自动递增)
  node cli/index.js upload --version 1.0.1

  # 上传小程序 (禁用自动递增，使用当前版本号)
  node cli/index.js upload --no-auto-increment

  # 上传小程序 (自定义描述和机器人编号)
  node cli/index.js upload --desc "手动指定的描述" --robot 2

  # 使用变更日志格式的描述
  node cli/index.js upload --desc-format changelog

  # 使用简单格式的描述（只显示最新提交）
  node cli/index.js upload --desc-format simple

  # 自定义提交记录数量和描述长度
  node cli/index.js upload --commit-count 10 --desc-max-length 300

  # 使用环境变量
  VERSION=1.0.2 ROBOT=2 node cli/index.js upload

  # 构建npm
  node cli/index.js build-npm

  # 构建npm (显示详细信息)
  node cli/index.js build-npm --verbose

  # 构建npm (排除特定文件)
  node cli/index.js build-npm --ignores "test/**/*,docs/**/*"
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

            case 'build-npm':
                await buildNpm(options);
                break;

            case 'create-page':
                await createPage(options.pageName, options);
                break;

            case 'delete-page':
                await deletePage(options.pageName, options);
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
    buildNpm,
    createPage,
    deletePage,
    loadConfig,
    createProject
};

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
    main();
}