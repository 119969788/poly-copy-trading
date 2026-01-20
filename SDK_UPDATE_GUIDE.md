# SDK 更新指南

## 已切换到 GitHub 仓库版本

项目已更新为使用 GitHub 仓库版本的 SDK：
- **仓库**: https://github.com/cyl19970726/poly-sdk
- **分支**: main

## 更新步骤

### 在本地

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 删除旧的 node_modules 和锁文件
rm -rf node_modules pnpm-lock.yaml

# 3. 重新安装依赖
pnpm install

# 4. 测试运行
pnpm start
```

### 在服务器上

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 拉取最新代码
git pull origin main

# 3. 删除旧的依赖
rm -rf node_modules pnpm-lock.yaml

# 4. 重新安装依赖
pnpm install

# 5. 重启应用
pm2 restart poly-copy-trading

# 6. 查看日志
pm2 logs poly-copy-trading --lines 30
```

## 为什么使用 GitHub 版本？

GitHub 仓库版本可能包含：
- 最新的功能和修复
- 社区贡献的改进
- 更频繁的更新

## 切换回 npm 版本

如果需要切换回 npm 官方版本：

```bash
# 编辑 package.json，将：
"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"

# 改为：
"@catalyst-team/poly-sdk": "latest"

# 然后重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 使用特定分支或标签

如果需要使用特定分支或标签：

```json
{
  "dependencies": {
    "@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#分支名",
    // 或使用标签
    "@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#v1.0.0"
  }
}
```

## 注意事项

1. **首次安装可能较慢**：从 GitHub 安装需要克隆仓库
2. **需要 Git**：确保系统已安装 Git
3. **网络要求**：需要能够访问 GitHub

## 故障排除

### 如果安装失败

```bash
# 1. 检查 Git 是否安装
git --version

# 2. 检查网络连接
ping github.com

# 3. 清除缓存重试
pnpm store prune
pnpm install
```

### 如果遇到权限问题

```bash
# 使用 SSH URL（需要配置 SSH 密钥）
# 在 package.json 中使用：
"@catalyst-team/poly-sdk": "git+ssh://git@github.com/cyl19970726/poly-sdk.git#main"
```

---

**提示**：GitHub 仓库版本会直接从源代码构建，确保代码是最新的。
