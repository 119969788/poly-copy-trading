# SDK 导入修复指南

## 问题

错误信息：
```
Cannot find module '/root/projects/poly-copy-trading/node_modules/@catalyst-team/poly-sdk/dist/src/index.js'
```

这是因为从 GitHub 安装的 SDK 包结构可能与 npm 版本不同。

## 解决方案

### 方法 1：检查 SDK 的实际导出路径

```bash
# 在服务器上检查 SDK 的实际结构
cd ~/projects/poly-copy-trading
ls -la node_modules/@catalyst-team/poly-sdk/
cat node_modules/@catalyst-team/poly-sdk/package.json | grep -A 10 '"exports"'
cat node_modules/@catalyst-team/poly-sdk/package.json | grep '"main"'
```

### 方法 2：重新安装依赖

```bash
# 删除并重新安装
cd ~/projects/poly-copy-trading
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 如果还是失败，尝试清除缓存
pnpm store prune
pnpm install
```

### 方法 3：切换回 npm 版本（临时方案）

如果 GitHub 版本有问题，可以临时切换回 npm 版本：

```bash
# 编辑 package.json
# 将：
"@catalyst-team/poly-sdk": "github:cyl19970726/poly-sdk#main"
# 改为：
"@catalyst-team/poly-sdk": "latest"

# 然后重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 方法 4：使用不同的导入路径

如果 SDK 的导出路径不同，可能需要修改导入语句。检查 SDK 的 package.json 来确定正确的导入路径。

## 诊断步骤

1. **检查 SDK 包结构**
   ```bash
   ls -R node_modules/@catalyst-team/poly-sdk/ | head -50
   ```

2. **检查 package.json**
   ```bash
   cat node_modules/@catalyst-team/poly-sdk/package.json
   ```

3. **检查是否有 dist 目录**
   ```bash
   ls -la node_modules/@catalyst-team/poly-sdk/dist/
   ```

4. **检查主入口文件**
   ```bash
   cat node_modules/@catalyst-team/poly-sdk/package.json | grep -E '"main"|"module"|"exports"'
   ```

## 临时解决方案

如果急需运行，可以：

1. **切换回 npm 版本**
   ```bash
   # 修改 package.json
   nano package.json
   # 将 GitHub URL 改为 "latest"
   
   # 重新安装
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

2. **或者等待 SDK 仓库修复**

---

**建议**：先使用方法 2（重新安装），如果还不行，使用方法 3（切换回 npm 版本）。
