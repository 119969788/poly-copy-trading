import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取配置
let privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 清理私钥：去除空格、换行符，处理 0x 前缀
privateKey = privateKey.trim().replace(/\s+/g, '');

// 如果私钥以 0x 开头，去除它（SDK 会自动添加）
if (privateKey.startsWith('0x') || privateKey.startsWith('0X')) {
  privateKey = privateKey.slice(2);
}

// 验证私钥长度（应该是 64 个十六进制字符，即 32 字节）
if (privateKey.length !== 64) {
  console.error(`❌ 错误：私钥长度不正确。期望 64 个字符（32 字节），实际 ${privateKey.length} 个字符`);
  console.error('   请检查 .env 文件中的 POLYMARKET_PRIVATE_KEY 是否正确');
  process.exit(1);
}

// 验证私钥格式（只包含十六进制字符）
if (!/^[0-9a-fA-F]+$/.test(privateKey)) {
  console.error('❌ 错误：私钥格式不正确，应只包含十六进制字符（0-9, a-f, A-F）');
  console.error('   请检查 .env 文件中的 POLYMARKET_PRIVATE_KEY 是否正确');
  process.exit(1);
}

// 解析目标地址（可选）
const targetAddressesStr = process.env.TARGET_ADDRESSES;
const targetAddresses = targetAddressesStr 
  ? targetAddressesStr.split(',').map(addr => addr.trim()).filter(Boolean)
  : undefined;

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

// 解析是否跳过余额和授权检查
const skipBalanceCheck = process.env.SKIP_BALANCE_CHECK === 'true';
const skipApprovalCheck = process.env.SKIP_APPROVAL_CHECK === 'true';

// 统计信息
interface TradingStats {
  totalTrades: number;
  totalVolume: number;
  successfulTrades: number;
  failedTrades: number;
  startTime: Date;
}

const stats: TradingStats = {
  totalTrades: 0,
  totalVolume: 0,
  successfulTrades: 0,
  failedTrades: 0,
  startTime: new Date(),
};

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket 聪明钱自动跟单系统');
  console.log('═══════════════════════════════════════════════════\n');
}

// 打印配置信息
function printConfig() {
  console.log('📋 配置信息：');
  console.log(`   模式: ${dryRun ? '🔍 模拟模式 (Dry Run)' : '💰 实盘模式'}`);
  console.log(`   跟随规模: 20% (sizeScale: 0.2)`);
  console.log(`   最大单笔金额: $100 USDC`);
  console.log(`   最大滑点: 5%`);
  console.log(`   订单类型: FOK (Fill or Kill)`);
  console.log(`   最小交易金额: $1 USDC`);
  if (skipBalanceCheck) {
    console.log(`   余额检查: ⏭️  已跳过`);
  }
  if (skipApprovalCheck) {
    console.log(`   授权检查: ⏭️  已跳过`);
  }
  
  if (targetAddresses && targetAddresses.length > 0) {
    console.log(`   指定地址数量: ${targetAddresses.length}`);
    console.log(`   目标地址: ${targetAddresses.slice(0, 3).join(', ')}${targetAddresses.length > 3 ? '...' : ''}`);
  } else {
    console.log(`   跟随排行榜: 前 50 名`);
  }
  console.log('');
}

// 打印统计信息
function printStats() {
  const runtime = Math.floor((Date.now() - stats.startTime.getTime()) / 1000);
  const hours = Math.floor(runtime / 3600);
  const minutes = Math.floor((runtime % 3600) / 60);
  const seconds = runtime % 60;
  
  console.log('\n📊 统计信息：');
  console.log(`   运行时间: ${hours}h ${minutes}m ${seconds}s`);
  console.log(`   总交易数: ${stats.totalTrades}`);
  console.log(`   成功交易: ${stats.successfulTrades}`);
  console.log(`   失败交易: ${stats.failedTrades}`);
  console.log(`   总交易量: $${stats.totalVolume.toFixed(2)} USDC`);
  if (stats.totalTrades > 0) {
    console.log(`   成功率: ${((stats.successfulTrades / stats.totalTrades) * 100).toFixed(2)}%`);
  }
  console.log('');
}

// 主函数
async function main() {
  printBanner();
  printConfig();

  let sdk: PolymarketSDK | null = null;
  let autoCopyTrading: any = null;

  try {
    // 初始化 SDK（推荐使用 create 方法，会自动初始化）
    console.log('🚀 正在初始化 SDK...');
    sdk = await PolymarketSDK.create({ privateKey });
    console.log('✅ SDK 初始化成功\n');

    // 创建 OnchainService 用于授权和余额检查
    // privateKey 已在前面检查，这里可以安全使用
    const onchainService = new OnchainService({
      privateKey: privateKey as string,
    });

    // 检查余额（可选）
    if (!skipBalanceCheck) {
      console.log('💰 检查钱包余额...');
      try {
        const balances = await onchainService.getTokenBalances();
        const usdcBalance = parseFloat(balances.usdcE || '0');
        const maticBalance = parseFloat(balances.matic || '0');
        
        console.log(`   USDC.e 余额: ${usdcBalance.toFixed(2)} USDC`);
        console.log(`   MATIC 余额: ${maticBalance.toFixed(4)} MATIC`);
        
        if (usdcBalance < 10) {
          console.warn('⚠️  警告: USDC.e 余额不足，建议至少 $10 USDC');
          console.warn('   当前余额可能不足以执行交易');
        } else if (usdcBalance < 50) {
          console.warn('⚠️  提示: USDC.e 余额较低，建议保持至少 $50-100 USDC');
        } else {
          console.log('✅ USDC.e 余额充足');
        }
        
        if (maticBalance < 0.01) {
          console.error('❌ 错误: MATIC 余额不足，无法支付 Gas 费');
          console.error('   请向钱包充值 MATIC（建议至少 0.1 MATIC）');
        } else if (maticBalance < 0.1) {
          console.warn('⚠️  警告: MATIC 余额较低，建议至少 0.1 MATIC');
        } else {
          console.log('✅ MATIC 余额充足');
        }
      } catch (error: any) {
        console.error('⚠️  余额检查失败:', error?.message || error);
        console.error('   请手动检查钱包余额');
      }
      console.log('');
    } else {
      console.log('💰 跳过余额检查（已设置 SKIP_BALANCE_CHECK=true）\n');
      console.log('⚠️  警告：如果出现 "not enough balance" 错误，请检查钱包余额\n');
    }

    // 检查并授权 USDC.e（可选）
    if (!skipApprovalCheck) {
      console.log('🔐 正在检查并授权 USDC.e...');
      let authorizationSuccess = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!authorizationSuccess && retryCount < maxRetries) {
        try {
          // 检查授权状态（使用较大的金额以确保授权足够）
          const status = await onchainService.checkReadyForCTF('10000');
          
          if (!status.ready) {
            console.log(`⚠️  需要授权（尝试 ${retryCount + 1}/${maxRetries}）`);
            if (status.issues && status.issues.length > 0) {
              console.log(`   问题: ${status.issues.join(', ')}`);
            }
            
            console.log('正在授权 USDC.e...');
            const result = await onchainService.approveAll();
            
            console.log('✅ 授权交易已提交');
            const totalApprovals = (result.erc20Approvals?.length || 0) + (result.erc1155Approvals?.length || 0);
            if (totalApprovals > 0) {
              console.log(`   已授权 ${totalApprovals} 个代币`);
            }
            if (result.summary) {
              console.log(`   摘要: ${result.summary}`);
            }
            
            // 等待交易确认（增加等待时间）
            console.log('   等待交易确认（约 10-15 秒）...');
            await new Promise(resolve => setTimeout(resolve, 12000));
            
            // 再次检查授权状态，确认授权成功
            console.log('   验证授权状态...');
            const verifyStatus = await onchainService.checkReadyForCTF('10000');
            if (verifyStatus.ready) {
              authorizationSuccess = true;
              console.log('✅ USDC.e 授权验证成功\n');
            } else {
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`⚠️  授权验证失败，将在 ${5 * retryCount} 秒后重试...\n`);
                await new Promise(resolve => setTimeout(resolve, 5000 * retryCount));
              } else {
                console.error('❌ 授权验证失败，已达到最大重试次数');
                console.error('   请检查：');
                console.error('   1. 钱包余额是否足够（需要 USDC.e 和 MATIC）');
                console.error('   2. 网络连接是否正常');
                console.error('   3. 可以在 Polymarket 网站上手动授权 USDC.e\n');
              }
            }
          } else {
            authorizationSuccess = true;
            console.log('✅ USDC.e 已授权\n');
          }
        } catch (error: any) {
          retryCount++;
          const errorMsg = error?.message || String(error);
          console.error(`⚠️  授权失败（尝试 ${retryCount}/${maxRetries}）:`, errorMsg);
          
          if (errorMsg.includes('user rejected') || errorMsg.includes('denied')) {
            console.error('❌ 授权被拒绝，请手动授权或重试');
            console.error('   可以在 Polymarket 网站上手动授权 USDC.e\n');
            break; // 用户拒绝，不再重试
          } else if (retryCount < maxRetries) {
            console.log(`   将在 ${5 * retryCount} 秒后重试...\n`);
            await new Promise(resolve => setTimeout(resolve, 5000 * retryCount));
          } else {
            console.error('❌ 授权失败，已达到最大重试次数');
            console.error('   如果已经授权过，可以设置 SKIP_APPROVAL_CHECK=true 跳过检查\n');
          }
        }
      }
      
      if (!authorizationSuccess && !skipApprovalCheck) {
        console.error('⚠️  警告：授权未成功，交易可能会失败');
        console.error('   建议：');
        console.error('   1. 检查钱包余额（USDC.e 和 MATIC）');
        console.error('   2. 手动在 Polymarket 网站上授权 USDC.e');
        console.error('   3. 或设置 SKIP_APPROVAL_CHECK=true 跳过检查（不推荐）\n');
      }
    } else {
      console.log('🔐 跳过授权检查（已设置 SKIP_APPROVAL_CHECK=true）\n');
      console.log('⚠️  警告：如果出现 "not enough balance / allowance" 错误，请检查授权状态\n');
    }

    // 准备跟单选项
    const copyTradingOptions = {
      sizeScale: 0.2,          // 跟随 20% 规模
      maxSizePerTrade: 100,    // 最大单笔 $100
      maxSlippage: 0.05,       // 最大滑点 5%
      orderType: 'FOK' as const, // Fill or Kill
      minTradeSize: 1,         // 最小交易 $1
      dryRun,                  // 模拟模式
      ...(targetAddresses && targetAddresses.length > 0 
        ? { targetAddresses } 
        : { topN: 50 }),       // 如果没有指定地址，则跟随前 50 名
      
      // 回调函数
      onTrade: (trade: any, result: any) => {
        stats.totalTrades++;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📈 跟单交易 #${stats.totalTrades}`);
        console.log(`   时间: ${new Date().toLocaleString('zh-CN')}`);
        console.log(`   跟随地址: ${trade.traderAddress || trade.address || 'N/A'}`);
        console.log(`   交易者: ${trade.traderName || 'N/A'}`);
        console.log(`   市场: ${trade.conditionId || trade.marketId || 'N/A'}`);
        console.log(`   方向: ${trade.side || 'N/A'}`);
        console.log(`   结果: ${trade.outcome || 'N/A'}`);
        console.log(`   金额: $${trade.size || trade.amount || 0}`);
        console.log(`   价格: ${trade.price || 'N/A'}`);
        
        if (result?.success || result === true) {
          stats.successfulTrades++;
          const tradeSize = parseFloat(trade.size || trade.amount || '0');
          if (!isNaN(tradeSize)) {
            stats.totalVolume += tradeSize;
          }
          console.log(`   状态: ✅ 成功`);
        } else {
          stats.failedTrades++;
          console.log(`   状态: ❌ 失败`);
          if (result?.error || result?.message) {
            console.log(`   错误: ${result.error || result.message}`);
          }
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // 每 10 笔交易打印一次统计
        if (stats.totalTrades % 10 === 0) {
          printStats();
        }
      },
      onError: (error: any) => {
        console.error('❌ 跟单错误:', error?.message || error);
      },
    };

    console.log('🚀 正在启动自动跟单系统...\n');

    // 启动自动跟单（回调函数已在 copyTradingOptions 中定义）
    autoCopyTrading = await sdk.smartMoney.startAutoCopyTrading(copyTradingOptions);
    
    console.log(`✅ 已开始跟踪 ${autoCopyTrading.targetAddresses?.length || 0} 个钱包地址\n`);

    // 定期打印统计（每 5 分钟）
    const statsInterval = setInterval(() => {
      printStats();
    }, 5 * 60 * 1000);

    // 定期获取和打印统计信息（使用 getStats 方法）
    const statsFetchInterval = setInterval(async () => {
      try {
        if (autoCopyTrading && typeof autoCopyTrading.getStats === 'function') {
          const currentStats = autoCopyTrading.getStats();
          if (currentStats) {
            console.log('\n📊 SDK 统计信息：');
            console.log(JSON.stringify(currentStats, null, 2));
            console.log('');
          }
        }
        // 同时打印本地统计
        printStats();
      } catch (error: any) {
        // 忽略统计获取错误，只打印本地统计
        console.log('⚠️  获取 SDK 统计信息失败，显示本地统计：');
        printStats();
      }
    }, 10 * 60 * 1000); // 每 10 分钟获取一次

    // 优雅停止处理
    let isStopping = false;
    const gracefulShutdown = async (signal: string) => {
      if (isStopping) return;
      isStopping = true;

      console.log(`\n\n🛑 收到 ${signal} 信号，正在优雅停止...`);
      clearInterval(statsInterval);
      clearInterval(statsFetchInterval);

      try {
        // 停止自动跟单
        if (autoCopyTrading && typeof autoCopyTrading.stop === 'function') {
          autoCopyTrading.stop();
        }
        
        // 停止 SDK
        if (sdk) {
          sdk.stop();
        }

        // 打印最终统计
        console.log('\n');
        printStats();
        console.log('✅ 已安全停止自动跟单系统\n');
        
        process.exit(0);
      } catch (error: any) {
        console.error('❌ 停止时发生错误:', error?.message || error);
        process.exit(1);
      }
    };

    // 监听退出信号
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    console.log('✅ 自动跟单系统已启动！');
    console.log('   按 Ctrl+C 可以优雅停止\n');
    console.log('⏳ 等待跟单交易...\n');

  } catch (error: any) {
    console.error('\n❌ 启动失败:', error?.message || error);
    if (error?.stack) {
      console.error('\n堆栈跟踪:', error.stack);
    }
    
    // 清理资源
    if (autoCopyTrading && typeof autoCopyTrading.stop === 'function') {
      autoCopyTrading.stop();
    }
    if (sdk) {
      sdk.stop();
    }
    
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 未处理的错误:', error);
  process.exit(1);
});
