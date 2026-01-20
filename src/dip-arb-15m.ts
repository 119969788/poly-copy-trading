import { PolymarketSDK } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取配置
const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 解析配置参数
const dryRun = process.env.DRY_RUN !== 'false';
const slidingWindowMs = parseInt(process.env.SLIDING_WINDOW_MS || '3000', 10); // 3秒滑动窗口
const dipThreshold = parseFloat(process.env.DIP_THRESHOLD || '0.3'); // 30%暴跌阈值
const sumTarget = parseFloat(process.env.SUM_TARGET || '0.95'); // 用0.95u成本获得1u
const leg2TimeoutSeconds = parseInt(process.env.LEG2_TIMEOUT_SECONDS || '100', 10); // 100秒止损
const coin = process.env.COIN || 'ETH'; // 默认ETH市场

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   15分钟市场暴跌套利策略 (Dip Arbitrage)');
  console.log('═══════════════════════════════════════════════════\n');
}

// 打印配置
function printConfig() {
  console.log('📋 配置信息：');
  console.log(`   模式: ${dryRun ? '🔍 模拟模式 (Dry Run)' : '💰 实盘模式'}`);
  console.log(`   币种: ${coin}`);
  console.log(`   市场周期: 15分钟`);
  console.log(`   Leg1 滑动窗口: ${slidingWindowMs}ms (${slidingWindowMs / 1000}秒)`);
  console.log(`   Leg1 暴跌阈值: ${(dipThreshold * 100).toFixed(0)}%`);
  console.log(`   Leg2 成本目标: ${sumTarget} USDC (获得 1 USDC)`);
  console.log(`   Leg2 止损时间: ${leg2TimeoutSeconds}秒`);
  console.log('');
}

// 主函数
async function main() {
  printBanner();
  printConfig();

  let sdk: PolymarketSDK | null = null;
  let dipArbService: any = null;

  try {
    // 初始化 SDK
    console.log('🚀 正在初始化 SDK...');
    sdk = await PolymarketSDK.create({ privateKey });
    console.log('✅ SDK 初始化成功\n');

    // 获取 DipArbService
    if (!sdk.dipArb) {
      console.error('❌ 错误：SDK 不支持 DipArbService');
      console.error('   请确保使用最新版本的 @catalyst-team/poly-sdk');
      process.exit(1);
    }

    dipArbService = sdk.dipArb;

    // 配置 DipArb 参数
    const dipArbConfig = {
      // Leg1 信号检测参数
      slidingWindowMs,        // 3秒滑动窗口
      dipThreshold,           // 30%暴跌阈值

      // Leg2 退出参数
      sumTarget,              // 用0.95u成本获得1u

      // 止损参数
      leg2TimeoutSeconds,     // 100秒后如果leg2未执行，自动卖出leg1

      // 模拟模式
      dryRun,

      // 自动merge回USDC.e
      autoMerge: true,

      // 自动旋转到下一个市场
      autoRotate: true,
      preferDuration: '15m',  // 15分钟市场

      // 市场结束后的赎回
      autoRedeem: true,
      redeemWaitMinutes: 5,   // 市场结束5分钟后赎回
    };

    console.log('⚙️  配置 DipArb 服务...');
    console.log(`   Leg1: ${slidingWindowMs}ms 内检测 ${(dipThreshold * 100).toFixed(0)}% 暴跌`);
    console.log(`   Leg2: ${sumTarget} USDC 成本获得 1 USDC`);
    console.log(`   止损: ${leg2TimeoutSeconds}秒后自动卖出`);
    console.log(`   自动 Merge: ✅`);
    console.log(`   自动旋转: ✅`);
    console.log(`   自动赎回: ✅`);
    console.log('');

    // 监听事件
    dipArbService.on('started', (config: any) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 已启动监控市场');
      console.log(`   市场: ${config.market?.name || config.marketId || 'N/A'}`);
      console.log(`   币种: ${coin}`);
      console.log(`   周期: 15分钟`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    dipArbService.on('newRound', (data: any) => {
      console.log('🔄 新一轮开始');
      console.log(`   Round ID: ${data.roundId || 'N/A'}`);
      console.log(`   UP Open: ${data.upOpen || 'N/A'}`);
      console.log(`   DOWN Open: ${data.downOpen || 'N/A'}`);
      console.log('');
    });

    dipArbService.on('signal', (signal: any) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 ${signal.leg === 'leg1' ? 'Leg1' : 'Leg2'} 信号检测到！`);
      console.log(`   时间: ${new Date().toLocaleString('zh-CN')}`);
      console.log(`   市场: ${signal.marketId || 'N/A'}`);
      console.log(`   方向: ${signal.direction || 'N/A'}`);
      console.log(`   价格变化: ${signal.priceChange ? (signal.priceChange * 100).toFixed(2) + '%' : 'N/A'}`);
      console.log(`   当前价格: ${signal.currentPrice || 'N/A'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    dipArbService.on('execution', (result: any) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`💰 ${result.leg === 'leg1' ? 'Leg1' : 'Leg2'} 执行${result.success ? '成功' : '失败'}`);
      console.log(`   时间: ${new Date().toLocaleString('zh-CN')}`);
      if (result.success) {
        console.log(`   金额: $${result.amount || result.usdcAmount || '0'}`);
        console.log(`   价格: ${result.price || 'N/A'}`);
        if (result.profit !== undefined) {
          console.log(`   利润: $${result.profit.toFixed(4)}`);
        }
        console.log(`   状态: ✅ 成功`);
      } else {
        console.log(`   状态: ❌ 失败`);
        if (result.error) {
          console.log(`   错误: ${result.error}`);
        }
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    dipArbService.on('roundComplete', (result: any) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🏁 本轮完成');
      console.log(`   时间: ${new Date().toLocaleString('zh-CN')}`);
      if (result.profit !== undefined) {
        console.log(`   利润: $${result.profit.toFixed(4)}`);
      }
      if (result.profitRate !== undefined) {
        console.log(`   利润率: ${(result.profitRate * 100).toFixed(2)}%`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    dipArbService.on('rotate', (data: any) => {
      console.log('🔄 自动旋转到新市场');
      console.log(`   原因: ${data.reason || 'N/A'}`);
      console.log(`   新市场: ${data.newMarket?.name || data.newMarketId || 'N/A'}`);
      console.log('');
    });

    dipArbService.on('settled', (result: any) => {
      console.log('💰 持仓已赎回');
      console.log(`   时间: ${new Date().toLocaleString('zh-CN')}`);
      if (result.success) {
        console.log(`   收到金额: $${result.amountReceived || '0'}`);
        console.log(`   状态: ✅ 成功`);
      } else {
        console.log(`   状态: ❌ 失败`);
        if (result.error) {
          console.log(`   错误: ${result.error}`);
        }
      }
      console.log('');
    });

    dipArbService.on('stopped', () => {
      console.log('🛑 DipArb 服务已停止\n');
    });

    // 启动 DipArb 服务
    console.log('🚀 正在启动 DipArb 服务...');
    console.log(`   寻找 ${coin} 15分钟市场...\n`);

    // 启用自动旋转
    await dipArbService.enableAutoRotate({
      enabled: true,
      underlyings: [coin],
      duration: '15m',
      settleStrategy: 'redeem',
      redeemWaitMinutes: 5,
    });

    // 查找并启动市场
    const market = await dipArbService.findAndStart({
      coin,
      preferDuration: '15m',
      slidingWindowMs,
      dipThreshold,
      sumTarget,
      leg2TimeoutSeconds,
      dryRun,
      autoMerge: true,
    });

    if (!market) {
      console.error('❌ 未找到合适的市场');
      process.exit(1);
    }

    console.log(`✅ 已启动监控: ${market.market?.name || market.marketId || 'N/A'}\n`);

    // 优雅停止处理
    let isStopping = false;
    const gracefulShutdown = async (signal: string) => {
      if (isStopping) return;
      isStopping = true;

      console.log(`\n\n🛑 收到 ${signal} 信号，正在优雅停止...\n`);

      try {
        if (dipArbService && typeof dipArbService.stop === 'function') {
          await dipArbService.stop();
        }

        if (sdk) {
          sdk.stop();
        }

        // 获取统计信息
        if (dipArbService && typeof dipArbService.getStats === 'function') {
          const stats = dipArbService.getStats();
          if (stats) {
            console.log('\n📊 最终统计：');
            console.log(`   信号检测: ${stats.signalsDetected || 0}`);
            console.log(`   Leg1 执行: ${stats.leg1Filled || 0}`);
            console.log(`   Leg2 执行: ${stats.leg2Filled || 0}`);
            console.log('');
          }
        }

        console.log('✅ 已安全停止\n');
        process.exit(0);
      } catch (error: any) {
        console.error('❌ 停止时发生错误:', error?.message || error);
        process.exit(1);
      }
    };

    // 监听退出信号
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    console.log('✅ DipArb 服务已启动！');
    console.log('   按 Ctrl+C 可以优雅停止\n');
    console.log('⏳ 等待暴跌信号...\n');

    // 定期打印统计信息
    const statsInterval = setInterval(() => {
      if (dipArbService && typeof dipArbService.getStats === 'function') {
        const stats = dipArbService.getStats();
        if (stats) {
          console.log('\n📊 统计信息：');
          console.log(`   信号检测: ${stats.signalsDetected || 0}`);
          console.log(`   Leg1 执行: ${stats.leg1Filled || 0}`);
          console.log(`   Leg2 执行: ${stats.leg2Filled || 0}`);
          if (stats.profit !== undefined) {
            console.log(`   总利润: $${stats.profit.toFixed(4)}`);
          }
          console.log('');
        }
      }
    }, 5 * 60 * 1000); // 每5分钟打印一次统计

    // 保持运行
    await new Promise(() => {});

  } catch (error: any) {
    console.error('\n❌ 启动失败:', error?.message || error);
    if (error?.stack) {
      console.error('\n堆栈跟踪:', error.stack);
    }

    if (dipArbService && typeof dipArbService.stop === 'function') {
      await dipArbService.stop();
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
