# 在服务器上更改私钥

## 快速步骤

### 方法 1：使用 nano 编辑器（推荐）

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading

# 2. 备份当前 .env 文件（推荐）
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# 3. 编辑 .env 文件
nano .env

# 4. 找到并修改私钥行
#    POLYMARKET_PRIVATE_KEY=新的私钥

# 5. 保存文件
#    - 按 Ctrl+O 保存
#    - 按 Enter 确认文件名
#    - 按 Ctrl+X 退出

# 6. 验证修改
grep POLYMARKET_PRIVATE_KEY .env

# 7. 确保文件权限正确
chmod 600 .env

# 8. 重启应用
pm2 restart poly-copy-trading

# 9. 查看日志确认
pm2 logs poly-copy-trading --lines 30
```

### 方法 2：使用 sed 命令（快速）

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 备份文件
cp .env .env.backup

# 3. 使用 sed 替换（替换 NEW_PRIVATE_KEY 为实际新私钥）
sed -i 's/POLYMARKET_PRIVATE_KEY=.*/POLYMARKET_PRIVATE_KEY=NEW_PRIVATE_KEY/g' .env

# 4. 验证修改
grep POLYMARKET_PRIVATE_KEY .env

# 5. 设置权限
chmod 600 .env

# 6. 重启应用
pm2 restart poly-copy-trading
```

### 方法 3：使用 vi/vim 编辑器

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 编辑文件
vi .env

# 3. 在 vi 中操作：
#    - 按 / 进入搜索模式
#    - 输入 POLYMARKET_PRIVATE_KEY 查找
#    - 按 Enter
#    - 按 i 进入编辑模式
#    - 修改私钥
#    - 按 Esc 退出编辑模式
#    - 输入 :wq 保存并退出

# 4. 设置权限
chmod 600 .env

# 5. 重启应用
pm2 restart poly-copy-trading
```

## 完整操作流程

```bash
# ============================================
# 步骤 1: 进入项目目录
# ============================================
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading

# ============================================
# 步骤 2: 备份当前配置（重要！）
# ============================================
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 备份已创建"

# ============================================
# 步骤 3: 编辑 .env 文件
# ============================================
nano .env

# 在 nano 中：
# 1. 找到 POLYMARKET_PRIVATE_KEY=旧私钥
# 2. 修改为 POLYMARKET_PRIVATE_KEY=新私钥
# 3. 按 Ctrl+O 保存
# 4. 按 Enter 确认
# 5. 按 Ctrl+X 退出

# ============================================
# 步骤 4: 验证修改
# ============================================
echo "当前私钥配置（隐藏完整私钥）："
grep POLYMARKET_PRIVATE_KEY .env | sed 's/=.*/=***/'

# ============================================
# 步骤 5: 设置文件权限
# ============================================
chmod 600 .env
echo "✅ 文件权限已设置"

# ============================================
# 步骤 6: 重启应用
# ============================================
pm2 restart poly-copy-trading

# ============================================
# 步骤 7: 查看日志确认
# ============================================
pm2 logs poly-copy-trading --lines 30
```

## 私钥格式

私钥可以是以下两种格式：

1. **带 0x 前缀**（推荐）：
   ```env
   POLYMARKET_PRIVATE_KEY=0x1234567890abcdef...
   ```

2. **不带 0x 前缀**：
   ```env
   POLYMARKET_PRIVATE_KEY=1234567890abcdef...
   ```

两种格式都可以，SDK 会自动处理。

## 验证更改

### 检查配置文件

```bash
# 查看私钥配置（不显示完整私钥）
grep POLYMARKET_PRIVATE_KEY .env | sed 's/=.*/=***/'

# 应该显示：
# POLYMARKET_PRIVATE_KEY=***
```

### 检查应用启动

重启应用后，查看日志：

```bash
pm2 logs poly-copy-trading --lines 50
```

应该看到：
- ✅ SDK 初始化成功
- ✅ 没有 "invalid hexlify value" 错误
- ✅ 余额检查正常
- ✅ 授权检查正常

如果看到错误：
```
invalid hexlify value
```
说明私钥格式不正确，请检查私钥是否完整和正确。

## 安全注意事项

### ✅ 正确做法

1. **备份旧配置**
   ```bash
   cp .env .env.backup
   ```

2. **使用安全的方式编辑**
   - 直接在编辑器中编辑
   - 不要通过命令行传递私钥（会出现在命令历史中）

3. **设置正确的文件权限**
   ```bash
   chmod 600 .env
   ```

4. **验证修改**
   - 确认私钥已正确更新
   - 确认应用能正常启动

### ❌ 错误做法

1. ❌ 在命令行中直接传递私钥
   ```bash
   # 错误！私钥会出现在命令历史中
   echo "POLYMARKET_PRIVATE_KEY=0x..." > .env
   ```

2. ❌ 忘记设置文件权限
   ```bash
   # 确保执行
   chmod 600 .env
   ```

3. ❌ 不备份就修改
   ```bash
   # 总是先备份
   cp .env .env.backup
   ```

## 快速脚本

创建 `change-private-key.sh`：

```bash
#!/bin/bash

echo "═══════════════════════════════════════════════════"
echo "  更改私钥"
echo "═══════════════════════════════════════════════════"
echo ""

# 检测项目目录
if [ -d ~/projects/poly-copy-trading ]; then
    PROJECT_DIR=~/projects/poly-copy-trading
elif [ -d ~/poly-copy-trading ]; then
    PROJECT_DIR=~/poly-copy-trading
else
    echo "❌ 错误: 未找到项目目录"
    exit 1
fi

cd "$PROJECT_DIR" || exit 1

# 备份文件
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
cp .env "$BACKUP_FILE"
echo "✅ 备份已创建: $BACKUP_FILE"
echo ""

# 显示当前配置（隐藏私钥）
echo "当前配置："
grep POLYMARKET_PRIVATE_KEY .env | sed 's/=.*/=***/'
echo ""

# 编辑文件
echo "正在打开编辑器..."
nano .env

# 验证修改
echo ""
echo "验证修改："
grep POLYMARKET_PRIVATE_KEY .env | sed 's/=.*/=***/'
echo ""

# 设置权限
chmod 600 .env
echo "✅ 文件权限已设置"
echo ""

# 询问是否重启
read -p "是否重启应用? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v pm2 &> /dev/null; then
        pm2 restart poly-copy-trading
        echo "✅ 应用已重启"
        echo ""
        echo "查看日志："
        pm2 logs poly-copy-trading --lines 20 --nostream
    else
        echo "⚠️  未检测到 PM2，请手动重启应用"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ 完成！"
echo "═══════════════════════════════════════════════════"
```

使用方法：

```bash
# 给脚本执行权限
chmod +x change-private-key.sh

# 运行脚本
./change-private-key.sh
```

## 常见问题

### Q: 如何确认私钥是否正确？

A: 
1. 检查长度（不带 0x 是 64 字符，带 0x 是 66 字符）
2. 启动应用，如果没有 "invalid hexlify value" 错误通常就是正确的
3. 查看日志，确认 SDK 初始化成功

### Q: 更改私钥后需要重启应用吗？

A: 是的，必须重启应用才能使用新私钥。

### Q: 如何恢复旧私钥？

A: 
```bash
# 如果有备份
cp .env.backup .env
pm2 restart poly-copy-trading
```

### Q: 私钥格式是什么？

A: 私钥是 64 个十六进制字符（0-9, a-f），可以带或不带 `0x` 前缀。

### Q: 如何安全地备份私钥？

A: 
- 使用密码管理器（如 1Password、LastPass）
- 加密存储（如加密的 USB 驱动器）
- 写在纸上存放在安全的地方
- **不要**存储在云服务、邮件等不安全的地方

## 检查清单

- [ ] 已备份旧 .env 文件
- [ ] 已编辑 .env 文件，更新私钥
- [ ] 已验证私钥格式正确
- [ ] 已设置文件权限（chmod 600）
- [ ] 已重启应用
- [ ] 已查看日志确认运行正常
- [ ] 没有错误信息

---

**记住：私钥安全是加密货币安全的核心！请妥善保管您的私钥！**
