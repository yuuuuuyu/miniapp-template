/**
 * 辅助工具函数
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('./logger');

/**
 * 检查文件是否存在
 * @param {string} filePath 文件路径
 * @returns {boolean}
 */
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
}

/**
 * 读取JSON文件
 * @param {string} filePath 文件路径
 * @returns {object|null}
 */
function readJsonFile(filePath) {
    try {
        if (!fileExists(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        logger.error(`读取文件失败: ${filePath}`, error.message);
        return null;
    }
}

/**
 * 写入JSON文件
 * @param {string} filePath 文件路径
 * @param {object} data 数据对象
 * @returns {boolean}
 */
function writeJsonFile(filePath, data) {
    try {
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    } catch (error) {
        logger.error(`写入文件失败: ${filePath}`, error.message);
        return false;
    }
}

/**
 * 解析版本号
 * @param {string} version 版本号字符串
 * @returns {object} {major, minor, patch}
 */
function parseVersion(version) {
    const parts = version.split('.').map(Number);
    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0
    };
}

/**
 * 格式化版本号
 * @param {object} versionObj {major, minor, patch}
 * @returns {string}
 */
function formatVersion(versionObj) {
    return `${versionObj.major}.${versionObj.minor}.${versionObj.patch}`;
}

/**
 * 递增版本号
 * @param {string} version 当前版本号
 * @param {string} type 递增类型: 'major' | 'minor' | 'patch'
 * @returns {string}
 */
function incrementVersion(version, type = 'patch') {
    const versionObj = parseVersion(version);

    switch (type) {
        case 'major':
            versionObj.major += 1;
            versionObj.minor = 0;
            versionObj.patch = 0;
            break;
        case 'minor':
            versionObj.minor += 1;
            versionObj.patch = 0;
            break;
        case 'patch':
        default:
            versionObj.patch += 1;
            break;
    }

    return formatVersion(versionObj);
}

/**
 * 获取版本号
 * @param {object} config 配置对象
 * @returns {string}
 */
function getVersion(config) {
    // 优先使用环境变量
    if (process.env.VERSION) {
        return process.env.VERSION;
    }

    // 尝试从 package.json 读取
    const packageJson = readJsonFile(path.resolve(config.projectPath, 'package.json'));
    if (packageJson && packageJson.version) {
        return packageJson.version;
    }

    // 使用配置文件中的默认版本
    return config.upload.version || '1.0.0';
}

/**
 * 获取并自动递增版本号
 * @param {object} config 配置对象
 * @param {string} incrementType 递增类型: 'major' | 'minor' | 'patch'
 * @returns {string}
 */
function getAndIncrementVersion(config, incrementType = 'patch') {
    const currentVersion = getVersion(config);
    const newVersion = incrementVersion(currentVersion, incrementType);

    // 更新 package.json 中的版本号
    const packageJsonPath = path.resolve(config.projectPath, 'package.json');
    const packageJson = readJsonFile(packageJsonPath);

    if (packageJson) {
        packageJson.version = newVersion;
        if (writeJsonFile(packageJsonPath, packageJson)) {
            logger.info(`版本号已更新: ${currentVersion} → ${newVersion}`);
        } else {
            logger.warn('更新 package.json 版本号失败，但继续使用新版本号');
        }
    }

    return newVersion;
}

/**
 * 获取当前时间戳
 * @returns {string}
 */
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * 验证配置
 * @param {object} config 配置对象
 * @returns {boolean}
 */
function validateConfig(config) {
    const required = ['appid', 'projectPath', 'privateKeyPath'];

    for (const field of required) {
        if (!config[field]) {
            logger.error(`配置缺失: ${field}`);
            return false;
        }
    }

    // 检查私钥文件是否存在
    if (!fileExists(config.privateKeyPath)) {
        logger.error(`私钥文件不存在: ${config.privateKeyPath}`);
        logger.info('请从微信公众平台下载私钥文件，并放置在项目根目录');
        return false;
    }

    // 检查项目路径是否存在
    if (!fileExists(config.projectPath)) {
        logger.error(`项目路径不存在: ${config.projectPath}`);
        return false;
    }

    return true;
}

/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string}
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 创建目录（如果不存在）
 * @param {string} dirPath 目录路径
 */
function ensureDir(dirPath) {
    if (!fileExists(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * 获取Git提交信息
 * @param {number} count 获取最近几条提交记录，默认5条
 * @returns {Array} 提交信息数组
 */
function getGitCommits(count = 5) {
    try {
        // 获取最近的提交记录，格式：hash|author|date|message
        const command = `git log --oneline -${count} --pretty=format:"%h|%an|%ad|%s" --date=short`;
        const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });

        return output.trim().split('\n').map(line => {
            const [hash, author, date, message] = line.split('|');
            return {
                hash: hash.trim(),
                author: author.trim(),
                date: date.trim(),
                message: message.trim()
            };
        });
    } catch (error) {
        logger.warn('获取Git提交信息失败:', error.message);
        return [];
    }
}

/**
 * 获取Git当前用户信息
 * @returns {object} {name, email}
 */
function getGitUser() {
    try {
        const name = execSync('git config user.name', { encoding: 'utf8', cwd: process.cwd() }).trim();
        const email = execSync('git config user.email', { encoding: 'utf8', cwd: process.cwd() }).trim();
        return { name, email };
    } catch (error) {
        logger.warn('获取Git用户信息失败:', error.message);
        return { name: '', email: '' };
    }
}

/**
 * 格式化Git提交信息为上传描述
 * @param {Array} commits 提交信息数组
 * @param {object} options 格式化选项
 * @returns {string} 格式化的描述
 */
function formatCommitsForUpload(commits, options = {}) {
    if (!commits || commits.length === 0) {
        return '通过 CI/CD 自动上传';
    }

    const {
        format = 'detailed', // 'simple' | 'detailed' | 'changelog'
        maxLength = 500,
        includeHash = true,
        groupByType = false
    } = options;

    if (format === 'simple') {
        // 简单格式：只显示最新的提交信息
        const latestCommit = commits[0];
        return `${latestCommit.message}${includeHash ? ` (${latestCommit.hash})` : ''}`;
    }

    if (format === 'changelog') {
        // 变更日志格式：按类型分组
        return formatAsChangelog(commits, { maxLength, includeHash });
    }

    // 详细格式（默认）
    const commitMessages = commits.map((commit, index) => {
        const prefix = `${index + 1}.`;
        const message = commit.message;
        const hash = includeHash ? ` (${commit.hash})` : '';
        return `${prefix} ${message}${hash}`;
    }).join('\n');

    const result = `最近更新:\n${commitMessages}`;

    // 如果超过最大长度，进行截断
    if (result.length > maxLength) {
        const truncated = result.substring(0, maxLength - 3) + '...';
        return truncated;
    }

    return result;
}

/**
 * 将提交信息格式化为变更日志格式
 * @param {Array} commits 提交信息数组
 * @param {object} options 选项
 * @returns {string} 变更日志格式的描述
 */
function formatAsChangelog(commits, options = {}) {
    const { maxLength = 500, includeHash = true } = options;

    // 按提交类型分组
    const groups = {
        feat: { title: '✨ 新功能', items: [] },
        fix: { title: '🐛 问题修复', items: [] },
        docs: { title: '📝 文档更新', items: [] },
        style: { title: '💄 样式调整', items: [] },
        refactor: { title: '♻️ 代码重构', items: [] },
        perf: { title: '⚡ 性能优化', items: [] },
        test: { title: '✅ 测试相关', items: [] },
        build: { title: '📦 构建相关', items: [] },
        ci: { title: '👷 CI/CD', items: [] },
        chore: { title: '🔧 其他变更', items: [] }
    };

    // 解析提交信息并分组
    commits.forEach(commit => {
        const message = commit.message;
        const match = message.match(/^(\w+)(\(.+\))?\s*:\s*(.+)$/);

        if (match) {
            const [, type, scope, description] = match;
            const group = groups[type] || groups.chore;
            const scopeText = scope ? scope : '';
            const hash = includeHash ? ` (${commit.hash})` : '';
            group.items.push(`${scopeText}${description}${hash}`);
        } else {
            // 不符合规范的提交信息归类到其他变更
            const hash = includeHash ? ` (${commit.hash})` : '';
            groups.chore.items.push(`${message}${hash}`);
        }
    });

    // 生成变更日志
    const sections = [];
    Object.values(groups).forEach(group => {
        if (group.items.length > 0) {
            sections.push(`${group.title}:`);
            group.items.forEach(item => {
                sections.push(`• ${item}`);
            });
            sections.push(''); // 空行分隔
        }
    });

    let result = sections.join('\n').trim();

    // 如果超过最大长度，进行截断
    if (result.length > maxLength) {
        result = result.substring(0, maxLength - 3) + '...';
    }

    return result || '通过 CI/CD 自动上传';
}

module.exports = {
    fileExists,
    readJsonFile,
    writeJsonFile,
    parseVersion,
    formatVersion,
    incrementVersion,
    getVersion,
    getAndIncrementVersion,
    getTimestamp,
    validateConfig,
    formatFileSize,
    ensureDir,
    getGitCommits,
    getGitUser,
    formatCommitsForUpload,
    formatAsChangelog
};
