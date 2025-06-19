#!/usr/bin/env node

/**
 * 演示不同更新日志格式的效果
 * 用于测试和预览不同格式的输出
 */

const { formatCommitsForUpload } = require('../cli/utils/helpers');
const chalk = require('chalk');

// 模拟的提交数据
const mockCommits = [
    {
        hash: 'a1b2c3d',
        author: '张三',
        date: '2024-01-15',
        message: 'feat(pages): 添加用户个人中心页面'
    },
    {
        hash: 'b2c3d4e',
        author: '李四',
        date: '2024-01-14',
        message: 'fix(api): 修复登录接口超时问题'
    },
    {
        hash: 'c3d4e5f',
        author: '王五',
        date: '2024-01-14',
        message: 'style(components): 优化按钮组件样式'
    },
    {
        hash: 'd4e5f6g',
        author: '赵六',
        date: '2024-01-13',
        message: 'docs: 更新API文档'
    },
    {
        hash: 'e5f6g7h',
        author: '钱七',
        date: '2024-01-13',
        message: 'chore: 更新依赖版本'
    },
    {
        hash: 'f6g7h8i',
        author: '孙八',
        date: '2024-01-12',
        message: 'feat(api): 新增数据导出功能'
    },
    {
        hash: 'g7h8i9j',
        author: '周九',
        date: '2024-01-12',
        message: 'fix(components): 修复表单验证错误'
    },
    {
        hash: 'h8i9j0k',
        author: '吴十',
        date: '2024-01-11',
        message: 'perf(database): 优化数据库查询性能'
    }
];

function printSeparator(title) {
    console.log('\n' + chalk.blue('='.repeat(60)));
    console.log(chalk.blue.bold(`  ${title}`));
    console.log(chalk.blue('='.repeat(60)));
}

function printFormat(formatName, description, result) {
    console.log(chalk.green.bold(`\n📋 ${formatName}`));
    console.log(chalk.gray(`   ${description}`));
    console.log(chalk.yellow('-'.repeat(50)));
    console.log(result);
    console.log(chalk.yellow('-'.repeat(50)));
}

function main() {
    console.log(chalk.cyan.bold('\n🚀 更新日志格式演示工具\n'));
    console.log(chalk.gray('本工具演示不同格式的更新日志输出效果，帮助您选择最适合的格式。\n'));

    printSeparator('模拟提交数据');
    console.log(chalk.white('使用以下模拟提交数据进行演示：'));
    mockCommits.forEach((commit, index) => {
        console.log(`${chalk.gray(`${index + 1}.`)} ${chalk.cyan(commit.hash)} ${chalk.white(commit.message)} ${chalk.gray(`(${commit.author}, ${commit.date})`)}`);
    });

    printSeparator('格式演示');

    // 1. 简单格式
    const simpleResult = formatCommitsForUpload(mockCommits, {
        format: 'simple',
        includeHash: true
    });
    printFormat(
        '简单格式 (simple)',
        '只显示最新的一条提交信息，适合快速迭代',
        simpleResult
    );

    // 2. 详细格式
    const detailedResult = formatCommitsForUpload(mockCommits.slice(0, 5), {
        format: 'detailed',
        includeHash: true
    });
    printFormat(
        '详细格式 (detailed)',
        '显示最近几条提交的详细列表，适合常规发布',
        detailedResult
    );

    // 3. 变更日志格式
    const changelogResult = formatCommitsForUpload(mockCommits, {
        format: 'changelog',
        includeHash: true
    });
    printFormat(
        '变更日志格式 (changelog)',
        '按提交类型分组显示，符合标准变更日志格式',
        changelogResult
    );

    printSeparator('不同参数配置演示');

    // 4. 不包含哈希值
    const noHashResult = formatCommitsForUpload(mockCommits.slice(0, 3), {
        format: 'changelog',
        includeHash: false
    });
    printFormat(
        '变更日志格式 (不含哈希值)',
        '设置 includeHash: false',
        noHashResult
    );

    // 5. 限制长度
    const limitedResult = formatCommitsForUpload(mockCommits, {
        format: 'detailed',
        maxLength: 150,
        includeHash: true
    });
    printFormat(
        '详细格式 (限制长度)',
        '设置 maxLength: 150，超出部分会被截断',
        limitedResult
    );

    printSeparator('使用建议');
    console.log(chalk.white(`
📌 ${chalk.green.bold('选择建议：')}

${chalk.yellow('开发阶段：')} 使用 ${chalk.cyan('simple')} 格式
  - 快速迭代，只需要知道最新变更
  - 命令：${chalk.gray('--desc-format simple')}

${chalk.yellow('测试阶段：')} 使用 ${chalk.cyan('detailed')} 格式  
  - 测试人员需要了解所有变更内容
  - 命令：${chalk.gray('--desc-format detailed --commit-count 5')}

${chalk.yellow('生产发布：')} 使用 ${chalk.cyan('changelog')} 格式
  - 提供专业的版本说明，便于用户理解
  - 命令：${chalk.gray('--desc-format changelog')}

${chalk.green.bold('配置示例：')}

在 ${chalk.cyan('ci.config.js')} 中配置：
${chalk.gray(`upload: {
    descFormat: 'changelog',     // 格式类型
    commitCount: 8,              // 提交数量
    descMaxLength: 500,          // 最大长度
    includeHash: true            // 包含哈希值
}`)}

${chalk.green.bold('命令行使用：')}
${chalk.gray('node cli/index.js upload --desc-format changelog --commit-count 5')}
    `));

    printSeparator('完成');
    console.log(chalk.green('✅ 演示完成！您可以根据需要选择合适的格式。'));
    console.log(chalk.gray('💡 提示：使用 npm run commit 可以生成符合规范的提交信息。\n'));
}

if (require.main === module) {
    main();
}

module.exports = { main, mockCommits };
