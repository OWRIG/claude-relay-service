#!/bin/bash

###############################################################################
# 上游同步脚本（简化版）
# 快速同步上游更新到 dev 分支
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
UPSTREAM_REPO="https://github.com/Wei-Shaw/claude-relay-service.git"
UPSTREAM_REMOTE="upstream"
MAIN_BRANCH="main"
DEV_BRANCH="dev"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Claude Relay - 上游同步${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 检查 git 仓库
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}❌ 错误: 不在 git 仓库中${NC}"
    exit 1
fi

# 检查上游仓库
if ! git remote | grep -q "^${UPSTREAM_REMOTE}$"; then
    echo -e "${YELLOW}⚠️  上游仓库未配置，正在添加...${NC}"
    git remote add ${UPSTREAM_REMOTE} ${UPSTREAM_REPO}
    echo -e "${GREEN}✅ 上游仓库已添加${NC}"
fi

echo -e "${BLUE}📥 步骤 1: 同步 main 分支${NC}"
echo ""

# 保存当前分支
CURRENT_BRANCH=$(git branch --show-current)

# 切换到 main
git checkout ${MAIN_BRANCH}
echo -e "${BLUE}   获取上游更新...${NC}"
git fetch ${UPSTREAM_REMOTE}

echo -e "${BLUE}   合并上游更新...${NC}"
if git merge ${UPSTREAM_REMOTE}/${MAIN_BRANCH} --no-edit; then
    echo -e "${GREEN}   ✅ main 分支已更新${NC}"
else
    echo -e "${RED}   ❌ 合并失败，请手动解决冲突${NC}"
    exit 1
fi

echo -e "${BLUE}   推送到远程...${NC}"
git push origin ${MAIN_BRANCH}

echo ""
echo -e "${BLUE}📥 步骤 2: 合并到 dev 分支${NC}"
echo ""

# 检查 dev 分支是否存在
if ! git rev-parse --verify ${DEV_BRANCH} > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  dev 分支不存在，正在创建...${NC}"
    git checkout -b ${DEV_BRANCH}
    echo -e "${GREEN}   ✅ dev 分支已创建${NC}"
else
    git checkout ${DEV_BRANCH}
fi

echo -e "${BLUE}   合并 main 到 dev...${NC}"
if git merge ${MAIN_BRANCH} --no-edit; then
    echo -e "${GREEN}   ✅ 合并成功${NC}"

    echo ""
    echo -e "${BLUE}   推送到远程...${NC}"
    git push origin ${DEV_BRANCH}

    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  ✅ 同步完成！${NC}"
    echo -e "${GREEN}======================================${NC}"
else
    echo -e "${YELLOW}   ⚠️  发生冲突，需要手动解决${NC}"
    echo ""
    echo -e "${BLUE}冲突解决步骤：${NC}"
    echo "  1. 查看冲突文件: ${YELLOW}git status${NC}"
    echo "  2. 搜索定制代码: ${YELLOW}grep -rn 'CUSTOM:' src/${NC}"
    echo "  3. 编辑冲突文件，保留 CUSTOM 标记内的代码"
    echo "  4. 标记已解决: ${YELLOW}git add <文件>${NC}"
    echo "  5. 完成合并: ${YELLOW}git commit${NC}"
    echo "  6. 推送: ${YELLOW}git push origin ${DEV_BRANCH}${NC}"
    echo ""
    echo -e "${BLUE}💡 提示: 参考 custom/README.md 的冲突处理章节${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📊 更新摘要：${NC}"
git log --oneline --graph --decorate -5 ${UPSTREAM_REMOTE}/${MAIN_BRANCH}

echo ""
echo -e "${BLUE}📝 后续步骤：${NC}"
echo "  1. 测试应用: ${YELLOW}npm run dev${NC}"
echo "  2. 更新记录: ${YELLOW}vim custom/CHANGELOG.md${NC}"
echo "  3. 搜索定制代码: ${YELLOW}grep -rn 'CUSTOM:' src/${NC}"
echo ""
echo -e "${GREEN}✨ 完成！${NC}"
