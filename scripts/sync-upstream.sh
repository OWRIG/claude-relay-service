#!/bin/bash

# 同步上游仓库更新脚本
# 用途：从原项目 (upstream) 获取最新更新并合并到本地 main 分支

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 检查是否在 git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "当前目录不是 Git 仓库"
    exit 1
fi

# 检查 upstream 远程仓库是否存在
if ! git remote get-url upstream > /dev/null 2>&1; then
    print_error "未找到 upstream 远程仓库"
    print_info "正在添加 upstream 远程仓库..."
    git remote add upstream https://github.com/Wei-Shaw/claude-relay-service.git
    print_success "已添加 upstream 远程仓库"
fi

# 获取当前分支
CURRENT_BRANCH=$(git branch --show-current)
print_info "当前分支: $CURRENT_BRANCH"

# 检查是否有未提交的更改（使用 git status --porcelain 更准确）
if [ -n "$(git status --porcelain)" ]; then
    print_warning "检测到未提交的更改"
    read -p "是否要暂存这些更改？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "正在暂存更改..."
        git stash push -m "sync-upstream: $(date +%Y-%m-%d\ %H:%M:%S)"
        STASHED=true
    else
        print_error "请先提交或暂存你的更改"
        exit 1
    fi
else
    STASHED=false
fi

# 切换到 main 分支
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_info "正在切换到 main 分支..."
    git checkout main
fi

# 获取 upstream 的最新更新
print_info "正在从 upstream 获取最新更新..."
git fetch upstream

# 检查是否有更新
LOCAL_COMMIT=$(git rev-parse main)
UPSTREAM_COMMIT=$(git rev-parse upstream/main)

if [ "$LOCAL_COMMIT" = "$UPSTREAM_COMMIT" ]; then
    print_success "你的 main 分支已经是最新的，无需更新"
    
    # 如果有暂存的更改，恢复它们
    if [ "$STASHED" = true ]; then
        print_info "正在恢复暂存的更改..."
        git stash pop
    fi
    
    exit 0
fi

# 显示更新信息
print_info "发现更新："
echo "  本地提交: $(git log -1 --oneline main)"
echo "  上游提交: $(git log -1 --oneline upstream/main)"
echo ""

# 询问是否继续
read -p "是否要合并 upstream/main 到本地 main 分支？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "已取消同步"
    
    # 如果有暂存的更改，恢复它们
    if [ "$STASHED" = true ]; then
        print_info "正在恢复暂存的更改..."
        git stash pop
    fi
    
    exit 0
fi

# 合并 upstream/main
print_info "正在合并 upstream/main..."
if git merge upstream/main --no-edit; then
    print_success "合并成功"
else
    print_error "合并时发生冲突，请手动解决冲突后继续"
    print_info "解决冲突后，可以运行: git commit"
    
    # 如果有暂存的更改，恢复它们
    if [ "$STASHED" = true ]; then
        print_warning "由于合并冲突，暂存的更改未恢复"
        print_info "解决冲突后，可以运行: git stash pop"
    fi
    
    exit 1
fi

# 询问是否推送到 origin
read -p "是否要推送到你的 fork (origin)？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "正在推送到 origin/main..."
    if git push origin main; then
        print_success "已成功推送到 origin/main"
    else
        print_error "推送失败"
        exit 1
    fi
else
    print_warning "未推送到 origin，你可以稍后手动运行: git push origin main"
fi

# 如果有暂存的更改，恢复它们
if [ "$STASHED" = true ]; then
    print_info "正在恢复暂存的更改..."
    if git stash pop; then
        print_success "已恢复暂存的更改"
    else
        print_warning "恢复暂存更改时发生冲突，请手动解决"
    fi
fi

# 如果之前不在 main 分支，询问是否切换回去
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "" ]; then
    read -p "是否切换回之前的分支 ($CURRENT_BRANCH)？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout "$CURRENT_BRANCH"
        print_success "已切换回 $CURRENT_BRANCH 分支"
    fi
fi

print_success "同步完成！"

