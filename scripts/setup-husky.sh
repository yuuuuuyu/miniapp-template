#!/bin/bash

echo "🚀 设置 Husky Git hooks..."

# 初始化 husky
npx husky install

# 设置 Git hooks
npx husky add .husky/commit-msg 'npx --no-install commitlint --edit "$1"'
npx husky add .husky/pre-commit 'echo "🔍 执行 pre-commit 检查..."; if [ -n "$(git diff --name-only)" ]; then echo "📁 自动暂存修改的文件..."; git add .; fi; echo "✅ Pre-commit 检查完成"'

# 设置文件权限
chmod +x .husky/commit-msg
chmod +x .husky/pre-commit

echo "✅ Husky 设置完成！"
echo "📖 使用方法："
echo "1. 标准提交: npm run commit (使用 Commitizen)"
