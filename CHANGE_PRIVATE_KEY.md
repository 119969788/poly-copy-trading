# 更改私钥指南

## ⚠️ 重要提示

更改私钥后：
- 新私钥对应的钱包将用于交易
- 旧私钥对应的钱包将不再使用
- 如果旧钱包中有资金，需要手动转移
- 确保新私钥安全保存，不要泄露

## 更改步骤

### 在本地（Windows）

#### 方法 1：使用文本编辑器（推荐）

1. **打开 `.env` 文件**
   - 在 Cursor/VS Code 中打开项目根目录的 `.env` 文件

2. **找到私钥行**
   ```env
   POLYMARKET_PRIVATE_KEY=旧的私钥
   ```

3. **替换为新私钥**
   ```env
   POLYMARKET_PRIVATE_KEY=新的私钥
   ```
   
   **注意**：
   - 私钥可以带 `0x` 前缀，也可以不带
   - 确保私钥完整（通常是 64 个十六进制字符）
   - 不要有多余的空格

4. **保存文件**（Ctrl+S）

5. **重启应用**（如果正在运行）
   - 按 `Ctrl+C` 停止
   - 重新运行 `pnpm start`

#### 方法 2：使用 PowerShell

```powershell
# 进入项目目录
cd J:\poly-copy-trading

# 读取文件
$content = Get-Content .env

# 替换私钥（替换为新私钥）
$newPrivateKey = "你的新私钥"
$content = $content -replace 'POLYMARKET_PRIVATE_KEY=.*', "POLYMARKET_PRIVATE_KEY=$newPrivateKey"

# 保存文件
$content | Set-Content .env

# 验证
Get-Content .env | Select-String POLYMARKET_PRIVATE_KEY
```

### 在服务器（Linux）

#### 方法 1：使用 nano 编辑器（推荐）

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading
# 或
cd ~/poly-copy-trading

# 编辑 .env 文件
nano .env

# 找到并修改私钥行
# POLYMARKET_PRIVATE_KEY=新的私钥

# 保存文件（nano: Ctrl+O, Enter, Ctrl+X）
```

#### 方法 2：使用 sed 命令

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 备份文件（推荐）
cp .env .env.backup

# 使用 sed 替换（替换 NEW_PRIVATE_KEY 为实际新私钥）
sed -i 's/POLYMARKET_PRIVATE_KEY=.*/POLYMARKET_PRIVATE_KEY=NEW_PRIVATE_KEY/g' .env

# 验证修改
grep POLYMARKET_PRIVATE_KEY .env
```

#### 方法 3：使用 vi/vim 编辑器

```bash
# 进入项目目录
cd ~/projects/poly-copy-trading

# 编辑文件
vi .env

# 在 vi 中：
# 1. 按 / 进入搜索模式
# 2. 输入 POLYMARKET_PRIVATE_KEY 查找
# 3. 按 Enter
# 4. 按 i 进入编辑模式
# 5. 修改私钥
# 6. 按 Esc 退出编辑模式
# 7. 输入 :wq 保存并退出
```

## 完整操作流程

### 在服务器上完整步骤

```bash
# 1. 进入项目目录
cd ~/projects/poly-copy-trading

# 2. 备份当前 .env 文件（推荐）
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# 3. 编辑 .env 文件
nano .env

# 4. 修改私钥行（在 nano 中）
#    POLYMARKET_PRIVATE_KEY=新的私钥

# 5. 保存文件（Ctrl+O, Enter, Ctrl+X）

# 6. 验证修改
grep POLYMARKET_PRIVATE_KEY .env

# 7. 确保文件权限正确
chmod 600 .env

# 8. 重启应用（如果使用 PM2）
pm2 restart poly-copy-trading

# 9. 查看日志确认运行正常
pm2 logs poly-copy-trading --lines 50
```

### 在本地完整步骤

1. 打开 `.env` 文件
2. 找到 `POLYMARKET_PRIVATE_KEY=` 行
3. 替换为新私钥
4. 保存文件（Ctrl+S）
5. 如果应用正在运行，停止后重新启动

## 验证更改

### 检查配置文件

```bash
# 查看私钥配置（不显示完整私钥）
grep POLYMARKET_PRIVATE_KEY .env | sed 's/=.*/=***/'
```

### 检查应用启动

启动应用后，应该正常初始化，不应该有私钥相关的错误。

如果看到错误：
```
invalid hexlify value
```
说明私钥格式不正确，请检查私钥是否完整和正确。

## 私钥格式

私钥可以是以下两种格式：

1. **带 0x 前缀**（推荐）：
   ```
   POLYMARKET_PRIVATE_KEY=0x1234567890abcdef...
   ```

2. **不带 0x 前缀**：
   ```
   POLYMARKET_PRIVATE_KEY=1234567890abcdef...
   ```

两种格式都可以，SDK 会自动处理。

## 安全注意事项

### ✅ 正确做法

1. **备份旧配置**
   ```bash
   cp .env .env.backup
   ```

2. **使用安全的方式编辑**
   - 直接在编辑器中编辑，不要通过命令行传递私钥
   - 不要在命令行历史中留下私钥

3. **设置正确的文件权限**
   ```bash
   chmod 600 .env
   ```

4. **不要提交到 Git**
   - `.env` 文件已在 `.gitignore` 中
   - 确认不会被提交到版本控制

5. **安全存储备份**
   - 将私钥备份到安全的地方（加密存储、密码管理器等）
   - 不要存储在云笔记、邮件等不安全的地方

### ❌ 错误做法

1. ❌ 在命令行中直接传递私钥
   ```bash
   # 错误！私钥会出现在命令历史中
   echo "POLYMARKET_PRIVATE_KEY=0x..." > .env
   ```

2. ❌ 在公开的地方存储私钥
   - 不要存储在 GitHub、GitLab 等公开仓库
   - 不要存储在云笔记、邮件中

3. ❌ 分享私钥
   - 永远不要与任何人分享私钥
   - 私钥就是钱包，谁有私钥谁就能控制钱包

4. ❌ 使用不安全的传输方式
   - 不要通过聊天工具、邮件等传输私钥

## 更改私钥后

### 1. 验证新私钥

- 启动应用，确认没有错误
- 检查日志，确认 SDK 初始化成功

### 2. 处理旧钱包（如果适用）

如果旧钱包中有资金：
- 使用旧私钥登录钱包
- 将资金转移到新钱包或安全的钱包
- 确认资金已转移后，可以废弃旧私钥

### 3. 更新所有使用该私钥的地方

如果私钥在其他地方使用（如其他服务器、其他脚本）：
- 确保所有地方都更新为新私钥
- 或者创建新的独立钱包用于不同用途

## 常见问题

### Q: 私钥格式是什么？

A: 私钥是 64 个十六进制字符（0-9, a-f），可以带或不带 `0x` 前缀。

### Q: 如何确认私钥是否正确？

A: 
1. 检查长度（不带 0x 是 64 字符，带 0x 是 66 字符）
2. 启动应用，如果没有错误通常就是正确的
3. 如果看到 "invalid hexlify value" 错误，说明格式不对

### Q: 更改私钥后需要重启应用吗？

A: 是的，必须重启应用才能使用新私钥。

### Q: 旧私钥还能用吗？

A: 可以。私钥本身不会失效，只是应用不再使用它。如果旧钱包中有资金，仍然可以用旧私钥访问。

### Q: 如何安全地备份私钥？

A: 
- 使用密码管理器（如 1Password、LastPass）
- 加密存储（如加密的 USB 驱动器）
- 写在纸上存放在安全的地方
- 不要存储在云服务、邮件等不安全的地方

### Q: 私钥泄露了怎么办？

A: 
1. **立即转移资金**到新钱包
2. 停止使用泄露的私钥
3. 创建新钱包使用新私钥
4. 如果已提交到 Git/GitHub，参考 `SECURITY_EMERGENCY.md`

## 快速参考

### 本地更改

1. 打开 `.env` 文件
2. 修改 `POLYMARKET_PRIVATE_KEY=` 行
3. 保存文件
4. 重启应用

### 服务器更改

```bash
cd ~/projects/poly-copy-trading
nano .env
# 修改私钥
# 保存: Ctrl+O, Enter, Ctrl+X
chmod 600 .env
pm2 restart poly-copy-trading
pm2 logs poly-copy-trading --lines 30
```

---

**记住：私钥安全是加密货币安全的核心！请妥善保管您的私钥！**
