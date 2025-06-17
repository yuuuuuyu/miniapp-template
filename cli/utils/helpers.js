/**
 * 辅助工具函数
 */

const fs = require('fs');
const path = require('path');
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
    ensureDir
};
