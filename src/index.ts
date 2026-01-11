import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取配置
const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 解析目标地址（可选）
const targetAddressesStr = process.env.TARGET_ADDRESSES;
const targetAddresses = targetAddressesStr 
  ? targetAddressesStr.split(',').map(addr => addr.trim()).filter(Boolean)
  : undefined;

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

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
    const onchainService = new OnchainService({
      privateKey,
    });

    // 检查余额
    console.log('💰 检查钱包余额...');
    try {
      const balances = await onchainService.getBalances();
      const usdcBalance = parseFloat(balances.usdcE || '0');
      const maticBalance = parseFloat(balances.matic || '0');
      
      console.log(`   USDC.e 余额: ${usdcBalance.toFixed(2)} USDC`);
      console.log(`   MATIC 余额: ${maticBalance.toFixed(4)} MATIC`);
      
      if (usdcBalance < 1) {
        console.warn('⚠️  警告: USDC.e 余额不足，建议至少 $10 USDC');
      }
      if (maticBalance < 0.01) {
        console.warn('⚠️  警告: MATIC 余额不足，需要 Gas 费进行交易');
      }
    } catch (error: any) {
      console.error('⚠️  余额检查失败:', error?.message || error);
    }
    console.log('');

    // 检查并授权 USDC.e
    console.log('🔐 正在检查并授权 USDC.e...');
    try {
      const status = await onchainService.checkReadyForCTF('100');
      if (!status.ready) {
        console.log('⚠️  需要授权，问题:', status.issues);
        console.log('正在授权 USDC.e...');
        const result = await onchainService.approveAll();
        console.log('✅ 授权完成');
        if (result.approvals) {
          console.log(`   已授权 ${result.approvals.length} 个代币`);
        }
        console.log('   请等待交易确认（约 5-10 秒）...\n');
        
        // 等待交易确认
        await new Promise(resolve => setTimeout(resolve, 8000));
      } else {
        console.log('✅ USDC.e 已授权\n');
      }
    } catch (error: any) {
      console.error('⚠️  授权失败:', error?.message || error);
      if (error?.message?.includes('user rejected') || error?.message?.includes('denied')) {
        console.error('❌ 授权被拒绝，请手动授权或重试');
        console.error('   可以在 Polymarket 网站上手动授权 USDC.e\n');
      } else {
        console.log('   如果已经授权过，可以忽略此错误\n');
      }
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
