#!/usr/bin/env node

/**
 * miniprogram-ci 测试脚本
 * 用于测试 CI 脚本的各种功能
 */

const { loadConfig, createProject } = require('./index.js');
const logger = require('./utils/logger.js');
const { validateConfig } = require('./utils/helpers.js');

async function testConfig() {
    logger.info('测试配置文件加载...');

    try {
        const config = loadConfig();
        logger.success('配置文件加载成功');
        logger.info('配置信息:', {
            appid: config.appid,
            projectName: config.projectName,
            projectPath: config.projectPath,
            miniprogramRoot: config.miniprogramRoot
        });

        // 测试配置验证
        logger.info('验证配置...');
        const isValid = validateConfig(config);

        if (isValid) {
            logger.success('配置验证通过');
        } else {
            logger.error('配置验证失败');
            return false;
        }

        return true;

    } catch (error) {
        logger.error('配置测试失败:', error.message);
        return false;
    }
}

async function testProjectCreation() {
    logger.info('测试项目实例创建...');

    try {
        const config = loadConfig();

        // 只有在私钥文件存在时才测试项目创建
        const { fileExists } = require('./utils/helpers.js');
        if (!fileExists(config.privateKeyPath)) {
            logger.warn('私钥文件不存在，跳过项目实例创建测试');
            logger.info('请按照 README-CI.md 中的说明获取私钥文件');
            return true;
        }

        const project = createProject(config);
        logger.success('项目实例创建成功');
        logger.info('项目信息:', {
            appid: project.appid,
            type: project.type,
            projectPath: project.projectPath
        });

        return true;

    } catch (error) {
        logger.error('项目实例创建失败:', error.message);
        return false;
    }
}

async function runTests() {
    logger.info('开始运行 miniprogram-ci 测试...');

    const tests = [
        { name: '配置文件测试', fn: testConfig },
        { name: '项目实例创建测试', fn: testProjectCreation }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        logger.info(`\n运行测试: ${test.name}`);
        try {
            const result = await test.fn();
            if (result) {
                logger.success(`✓ ${test.name} 通过`);
                passed++;
            } else {
                logger.error(`✗ ${test.name} 失败`);
                failed++;
            }
        } catch (error) {
            logger.error(`✗ ${test.name} 异常:`, error.message);
            failed++;
        }
    }

    logger.info(`\n测试结果: ${passed} 通过, ${failed} 失败`);

    if (failed === 0) {
        logger.success('所有测试通过! 🎉');
        logger.info('现在你可以使用以下命令:');
        logger.info('  npm run preview     - 预览小程序');
        logger.info('  npm run upload      - 上传小程序');
        logger.info('  npm run ci:help     - 查看帮助');
    } else {
        logger.error('部分测试失败，请检查配置');
    }

    return failed === 0;
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
    runTests().catch(error => {
        logger.error('测试运行失败:', error.message);
        process.exit(1);
    });
}

module.exports = { runTests, testConfig, testProjectCreation };
