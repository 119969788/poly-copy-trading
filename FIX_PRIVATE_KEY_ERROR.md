# 修复私钥格式错误

## 错误信息

```
❌ 启动失败: invalid hexlify value (argument="value", value="0xa83f387cc59399b4842136f74675110fbfce530ced5935ab8b31c9d7c2ef0d3b0xa83f387cc59399b4842136f74675110fbfce530ced5935ab8b31c9d7c2ef0d3b"
```

## 问题原因

这个错误通常由以下原因引起：

1. **私钥被重复**：`.env` 文件中的私钥可能被复制了两次
2. **包含 `0x` 前缀**：私钥包含了 `0x` 前缀，但代码会自动添加
3. **包含空格或换行符**：私钥中可能包含空格、换行符等无效字符
4. **私钥格式不正确**：私钥长度或格式不符合要求

## 解决方案

### 方法 1：检查并修复 .env 文件

1. **编辑 .env 文件**：

```bash
nano ~/projects/poly-copy-trading/.env
```

2. **检查私钥格式**：

私钥应该是：
- **64 个十六进制字符**（0-9, a-f, A-F）
- **不包含 `0x` 前缀**（可以包含，代码会自动处理）
- **不包含空格或换行符**
- **只占一行**

**正确格式示例：**
```env
POLYMARKET_PRIVATE_KEY=a83f387cc59399b4842136f74675110fbfce530ced5935ab8b31c9d7c2ef0d3b
```

或者（带 0x 前缀也可以，代码会自动处理）：
```env
POLYMARKET_PRIVATE_KEY=0xa83f387cc59399b4842136f74675110fbfce530ced5935ab8b31c9d7c2ef0d3b
```

**错误格式示例：**
```env
# ❌ 错误：私钥被重复
POLYMARKET_PRIVATE_KEY=0xa83f387cc59399b4842136f74675110fbfce530ced5935ab8b31c9d7c2ef0d3b0xa83f387cc59399b4842136f74675110fbfce530ced5935ab8b31c9d7c2ef0d3b

# ❌ 错误：包含空格
POLYMARKET_PRIVATE_KEY= a83f387cc59399b4842136f74675110fbfce530ced5935ab8b31c9d7c2ef0d3b

# ❌ 错误：包含换行符
POLYMARKET_PRIVATE_KEY=a83f387cc59399b4842136f74675110fbfce530ced5935ab8b31c9d7c2ef0d3b
```

3. **保存文件**：
   - 按 `Ctrl + O`（保存）
   - 按 `Enter`（确认）
   - 按 `Ctrl + X`（退出）

4. **验证私钥格式**：

```bash
# 查看私钥（不会显示完整内容，但可以检查格式）
cd ~/projects/poly-copy-trading
cat .env | grep POLYMARKET_PRIVATE_KEY

# 检查私钥长度（应该是 64 或 66 个字符，如果包含 0x 前缀）
cat .env | grep POLYMARKET_PRIVATE_KEY | cut -d'=' -f2 | wc -c
```

### 方法 2：使用脚本自动修复

创建一个临时脚本来修复私钥：

```bash
cd ~/projects/poly-copy-trading

# 备份 .env 文件
cp .env .env.backup

# 提取私钥并清理
PRIVATE_KEY=$(grep POLYMARKET_PRIVATE_KEY .env | cut -d'=' -f2 | tr -d ' \n\r' | sed 's/^0x//' | sed 's/^0X//')

# 检查私钥长度
if [ ${#PRIVATE_KEY} -ne 64 ]; then
    echo "❌ 错误：私钥长度不正确（${#PRIVATE_KEY} 个字符，期望 64 个）"
    echo "请手动检查 .env 文件"
    exit 1
fi

# 重新创建 .env 文件
cat > .env << EOF
# Polymarket 私钥
POLYMARKET_PRIVATE_KEY=$PRIVATE_KEY

# 可选：指定要跟随的钱包地址
# TARGET_ADDRESSES=0x1234...,0x5678...

# 可选：设置是否启用模拟模式（true/false，默认 true）
DRY_RUN=true
EOF

echo "✅ .env 文件已修复"
chmod 600 .env
```

### 方法 3：手动重新输入私钥

1. **获取原始私钥**（从你的钱包或密钥管理工具）

2. **编辑 .env 文件**：

```bash
nano ~/projects/poly-copy-trading/.env
```

3. **删除旧的私钥行，重新输入**：

```env
POLYMARKET_PRIVATE_KEY=你的私钥（64个十六进制字符，不包含0x前缀）
```

4. **保存并退出**

## 验证修复

修复后，重新运行应用：

```bash
cd ~/projects/poly-copy-trading

# 测试运行
pnpm start
```

如果使用 PM2：

```bash
pm2 restart poly-copy-trading
pm2 logs poly-copy-trading
```

## 私钥格式要求

- ✅ **长度**：64 个十六进制字符（32 字节）
- ✅ **字符**：只包含 0-9, a-f, A-F
- ✅ **前缀**：可以包含 `0x` 前缀（代码会自动处理），也可以不包含
- ✅ **格式**：单行，不包含空格、换行符、制表符

## 常见错误

### 错误 1：私钥被重复

**症状：**
```
invalid hexlify value (value="0x...0x...")
```

**解决方法：**
检查 `.env` 文件，确保私钥只出现一次。

### 错误 2：私钥包含空格

**症状：**
```
invalid hexlify value
```

**解决方法：**
去除私钥中的所有空格。

### 错误 3：私钥长度不正确

**症状：**
```
私钥长度不正确。期望 64 个字符，实际 XX 个字符
```

**解决方法：**
检查私钥是否完整，确保是 64 个十六进制字符。

## 安全提示

⚠️ **重要**：
- 私钥是敏感信息，不要分享给任何人
- `.env` 文件权限应设置为 600（只有所有者可读）
- 不要将 `.env` 文件提交到 Git
- 定期备份私钥到安全位置

## 代码更新

最新版本的代码已经添加了自动清理和验证功能：
- 自动去除 `0x` 前缀
- 自动去除空格和换行符
- 自动验证私钥长度和格式
- 提供清晰的错误提示

如果问题仍然存在，请检查：
1. `.env` 文件是否正确保存
2. 私钥是否完整（64 个字符）
3. 是否有其他配置问题
