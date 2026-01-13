# 服务器快速添加 redeem 脚本

## 问题

`pnpm redeem` 命令找不到，因为服务器上的 `package.json` 还没有更新。

## 快速修复

在服务器上执行以下命令，手动添加 `redeem` 脚本：

```bash
cd ~/projects/poly-copy-trading

# 方法1: 使用 sed 命令添加（推荐）
sed -i 's/"dip-arb": "tsx src\/dip-arb-15m.ts"/"dip-arb": "tsx src\/dip-arb-15m.ts",\n    "redeem": "tsx src\/redeem-settled.ts"/' package.json

# 方法2: 使用 nano 手动编辑
nano package.json
# 在 "dip-arb" 行后面添加：
# "redeem": "tsx src/redeem-settled.ts",
```

或者使用以下命令直接添加（如果上面不行）：

```bash
cd ~/projects/poly-copy-trading

# 备份 package.json
cp package.json package.json.bak

# 使用 cat 和 sed 添加脚本
cat > /tmp/add_redeem.sh << 'EOF'
#!/bin/bash
awk '/"dip-arb"/ {
    print $0
    print "    \"redeem\": \"tsx src/redeem-settled.ts\","
    next
}1' package.json > package.json.tmp && mv package.json.tmp package.json
EOF

chmod +x /tmp/add_redeem.sh
/tmp/add_redeem.sh
```

## 验证

添加后验证：

```bash
# 检查 package.json 是否包含 redeem 脚本
grep -A 1 "redeem" package.json

# 应该看到：
# "redeem": "tsx src/redeem-settled.ts"
```

## 运行

```bash
# 模拟模式
DRY_RUN=true pnpm redeem

# 实盘模式
DRY_RUN=false pnpm redeem
```

---

**提示**：如果网络恢复，可以使用 `git pull origin main` 更新代码，这样就不需要手动修改了。
