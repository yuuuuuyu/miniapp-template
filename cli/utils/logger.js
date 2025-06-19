/**
 * 日志工具
 */

const chalk = require('chalk');

class Logger {
    constructor() {
        this.prefix = '[miniprogram-ci]';
        this.progressMessage = '';
    }

    info(message, ...args) {
        this.clearProgress();
        console.log(chalk.blue(this.prefix), message, ...args);
    }

    success(message, ...args) {
        this.clearProgress();
        console.log(chalk.green(this.prefix), chalk.green('✓'), message, ...args);
    }

    warn(message, ...args) {
        this.clearProgress();
        console.warn(chalk.yellow(this.prefix), chalk.yellow('⚠'), message, ...args);
    }

    error(message, ...args) {
        this.clearProgress();
        console.error(chalk.red(this.prefix), chalk.red('✗'), message, ...args);
    }

    debug(message, ...args) {
        if (process.env.DEBUG) {
            this.clearProgress();
            console.log(chalk.gray(this.prefix), chalk.gray('[DEBUG]'), message, ...args);
        }
    }

    progress(message) {
        this.progressMessage = message;
        process.stdout.write('\r' + chalk.blue(this.prefix) + ' ' + chalk.cyan(message) + '...');
    }

    clearProgress() {
        if (this.progressMessage) {
            process.stdout.write('\r\x1b[K');
            this.progressMessage = '';
        }
    }

    // 新增方法：显示分隔线
    separator(title = '') {
        this.clearProgress();
        const line = '─'.repeat(60);
        if (title) {
            const titleLength = title.length;
            const padding = Math.max(0, Math.floor((60 - titleLength - 2) / 2));
            const leftPadding = '─'.repeat(padding);
            const rightPadding = '─'.repeat(60 - padding - titleLength - 2);
            console.log(chalk.gray(`${leftPadding} ${title} ${rightPadding}`));
        } else {
            console.log(chalk.gray(line));
        }
    }

    // 新增方法：显示配置信息
    config(title, config) {
        this.clearProgress();
        console.log(chalk.blue(this.prefix), chalk.bold(title));
        Object.entries(config).forEach(([key, value]) => {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
            const capitalizedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
            console.log(`  ${chalk.gray('•')} ${chalk.cyan(capitalizedKey)}: ${chalk.white(value)}`);
        });
    }

    // 新增方法：显示步骤
    step(stepNumber, title, description = '') {
        this.clearProgress();
        const stepPrefix = chalk.blue(`[${stepNumber}]`);
        console.log(`${stepPrefix} ${chalk.bold(title)}`);
        if (description) {
            console.log(`    ${chalk.gray(description)}`);
        }
    }

    // 新增方法：显示结果
    result(title, data) {
        this.clearProgress();
        console.log(chalk.green(this.prefix), chalk.green('✓'), chalk.bold(title));
        if (typeof data === 'object' && data !== null) {
            Object.entries(data).forEach(([key, value]) => {
                const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
                const capitalizedKey = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
                console.log(`  ${chalk.gray('•')} ${chalk.cyan(capitalizedKey)}: ${chalk.white(value)}`);
            });
        } else if (data) {
            console.log(`  ${chalk.white(data)}`);
        }
    }

    // 新增方法：过滤和简化输出
    filterOutput(message) {
        // 确保message是字符串
        const messageStr = typeof message === 'string' ? message : String(message);

        // 过滤掉冗长的文件列表输出和重复的编译信息
        if (messageStr.includes('analyzing codes......Set(') ||
            messageStr.includes('ignoring files:') ||
            messageStr.includes('miniprogram/miniprogram_npm/@vant/weapp/') ||
            messageStr.includes('Compiling miniprogram_npm/@vant/weapp/') ||
            messageStr.includes('[object Object]') ||
            messageStr.includes('child process stdout:') ||
            (messageStr.includes('Compiling') && messageStr.includes('.js')) ||
            (messageStr.includes('Compiling') && messageStr.includes('.wxml')) ||
            (messageStr.includes('Compiling') && messageStr.includes('.wxss')) ||
            (messageStr.includes('Compiling') && messageStr.includes('.wxs'))) {

            // 如果是分析代码的输出，只显示文件数量
            if (messageStr.includes('analyzing codes......Set(')) {
                const match = messageStr.match(/Set\((\d+)\)/);
                if (match) {
                    return `正在分析代码文件 (共 ${match[1]} 个文件)`;
                }
            }

            // 如果是忽略文件的输出，只显示概要
            if (messageStr.includes('ignoring files:')) {
                const files = messageStr.split('ignoring files:')[1];
                const fileCount = (files.match(/,/g) || []).length + 1;
                return `忽略文件 (共 ${fileCount} 个文件)`;
            }

            // 如果是编译信息，只显示关键步骤
            if (messageStr.includes('Compile miniprogram')) {
                return '正在编译小程序';
            }

            if (messageStr.includes('Compile jSON files')) {
                return '正在编译配置文件';
            }

            if (messageStr.includes('Append babel helper files')) {
                return '正在添加编译辅助文件';
            }

            if (messageStr.includes('Seal code package')) {
                return '正在打包代码';
            }

            if (messageStr.includes('Pack resource file finish')) {
                return '资源文件打包完成';
            }

            // 其他冗长输出直接过滤掉
            return null;
        }

        // 保留重要的进度信息
        if (messageStr.includes('analyzing codes success') ||
            messageStr.includes('upload') ||
            messageStr.includes('preview') ||
            messageStr.includes('success') ||
            messageStr.includes('finish')) {
            return messageStr;
        }

        return messageStr;
    }

    // 新增方法：简化的信息输出
    simpleInfo(message) {
        const filtered = this.filterOutput(message);
        if (filtered) {
            this.info(filtered);
        }
    }
}

module.exports = new Logger();
