# 修复语法错误 "Unexpected <<" 指南

## 问题

运行 `pnpm start` 时出现错误：
```
ERROR: Unexpected "<<"
/root/projects/poly-copy-trading/src/index.ts:51:0
```

这通常是因为：
1. 文件编码问题（Windows CRLF vs Linux LF）
2. 文件在传输过程中损坏
3. 服务器上的文件版本不同步

## 解决方案

### 方法 1：重新拉取代码（推荐）

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 备份当前文件（可选）
cp src/index.ts src/index.ts.backup

# 3. 放弃本地修改，重新拉取
git reset --hard HEAD
git clean -fd

# 4. 拉取最新代码
git pull origin main

# 5. 重新安装依赖
pnpm install

# 6. 测试运行
pnpm start
```

### 方法 2：修复文件编码

```bash
# 1. 检查文件编码
file src/index.ts

# 2. 转换行尾符（如果有问题）
dos2unix src/index.ts

# 3. 或者使用 sed
sed -i 's/\r$//' src/index.ts

# 4. 测试运行
pnpm start
```

### 方法 3：手动修复文件

如果上述方法都不行，可以手动检查第 51 行：

```bash
# 1. 查看第 51 行内容
sed -n '51p' src/index.ts | cat -A

# 2. 查看第 50-52 行
sed -n '50,52p' src/index.ts

# 3. 如果发现异常字符，可以重新创建这一行
```

### 方法 4：使用更新脚本

```bash
cd ~/projects/poly-copy-trading
bash update-server.sh
```

## 快速修复命令

一键修复：

```bash
cd ~/projects/poly-copy-trading && \
git reset --hard HEAD && \
git clean -fd && \
git pull origin main && \
pnpm install && \
echo "✅ 修复完成，测试运行..." && \
pnpm start 2>&1 | head -20
```

## 验证修复

修复后验证：

```bash
# 1. 检查文件是否存在语法错误
pnpm typecheck

# 2. 检查文件编码
file src/index.ts

# 3. 查看第 51 行
sed -n '51p' src/index.ts

# 4. 测试运行
pnpm start
```

## 预防措施

1. **使用 Git 管理代码**：避免手动修改服务器上的文件
2. **统一行尾符**：在 `.gitattributes` 中设置
3. **定期更新**：使用 `update-server.sh` 脚本更新

## 如果仍然失败

如果所有方法都失败，可以：

1. **检查 Node.js 和 pnpm 版本**
   ```bash
   node --version
   pnpm --version
   ```

2. **清除缓存重新安装**
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

3. **检查 tsx 版本**
   ```bash
   pnpm list tsx
   pnpm update tsx
   ```

4. **使用 tsc 编译后运行**
   ```bash
   pnpm build
   node dist/index.js
   ```

---

**推荐**：使用方法 1（重新拉取代码），这是最可靠的方法。
