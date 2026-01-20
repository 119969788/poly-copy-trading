# 🔧 修复：服务器上缺少 batch-sell.ts 文件

## ⚠️ 错误信息
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/root/projects/poly-copy-trading/src/batch-sell.ts'
```

## ✅ 解决方法（选择一种）

### 方法 1：使用 SCP 上传文件（推荐，最快）

在**本地电脑**的 PowerShell 中执行：

```powershell
# 进入项目目录
cd D:\000\poly-copy-trading-main

# 上传文件到服务器（替换为你的服务器IP）
scp src/batch-sell.ts root@你的服务器IP:/root/projects/poly-copy-trading/src/

# 如果路径不同，可能是：
scp src/batch-sell.ts root@你的服务器IP:/root/poly-copy-trading/src/
```

**注意**：根据错误信息，服务器路径是 `/root/projects/poly-copy-trading/`，如果上传失败，尝试另一个路径。

### 方法 2：在服务器上直接创建文件

在**服务器**上执行：

```bash
# 1. 进入项目目录（根据错误信息，可能是这个路径）
cd /root/projects/poly-copy-trading

# 或者尝试：
cd ~/poly-copy-trading

# 2. 确认当前路径
pwd

# 3. 创建 src 目录（如果不存在）
mkdir -p src

# 4. 创建 batch-sell.ts 文件
nano src/batch-sell.ts
```

然后：
1. 打开本地文件 `batch-sell-complete.txt` 或 `src/batch-sell.ts`
2. **完整复制**所有内容（从第1行到最后一行）
3. 在服务器的 nano 编辑器中粘贴：`Shift+Insert` 或右键粘贴
4. 保存：`Ctrl+O` → `Enter` → `Ctrl+X`

### 方法 3：使用 cat 命令快速创建（如果服务器支持）

在**服务器**上执行：

```bash
cd /root/projects/poly-copy-trading
mkdir -p src
cat > src/batch-sell.ts << 'EOF'
```

然后粘贴 `batch-sell-complete.txt` 的完整内容，最后输入：
```
EOF
```

---

## ✅ 验证文件已上传

在**服务器**上执行：

```bash
# 检查文件是否存在
ls -la src/batch-sell.ts

# 查看文件前几行（确认内容正确）
head -20 src/batch-sell.ts

# 应该看到类似这样的内容：
# // 尝试多种导入方式以兼容不同的 SDK 版本
# import dotenv from 'dotenv';
# ...
```

---

## 🧪 测试运行

在**服务器**上执行：

```bash
# 测试运行（模拟模式）
npx tsx src/batch-sell.ts

# 如果成功，应该看到：
# ═══════════════════════════════════════════════════
#    Polymarket 批量出售代币工具
# ═══════════════════════════════════════════════════
```

---

## 🔍 如果仍然出错

### 检查路径是否正确

```bash
# 在服务器上检查实际路径
pwd
ls -la src/

# 确认文件确实存在
file src/batch-sell.ts
```

### 检查文件权限

```bash
# 确保文件有读取权限
chmod 644 src/batch-sell.ts
```

### 检查项目目录结构

```bash
# 查看完整的项目结构
cd /root/projects/poly-copy-trading
tree -L 2
# 或
find . -name "*.ts" -type f
```

---

## 📝 完整文件内容位置

本地文件位置：
- `d:\000\poly-copy-trading-main\src\batch-sell.ts`
- `d:\000\poly-copy-trading-main\batch-sell-complete.txt`（完整内容）

两个文件内容相同，可以任选一个复制。

---

## ⚡ 快速命令总结

**本地（PowerShell）**：
```powershell
cd D:\000\poly-copy-trading-main
scp src/batch-sell.ts root@服务器IP:/root/projects/poly-copy-trading/src/
```

**服务器（Bash）**：
```bash
cd /root/projects/poly-copy-trading
mkdir -p src
nano src/batch-sell.ts  # 然后粘贴内容
npx tsx src/batch-sell.ts  # 测试运行
```
