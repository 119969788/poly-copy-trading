import { PolySDK } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取配置
const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

// 初始化 SDK（使用与主文件相同的导入方式）
const sdk = new PolySDK({ privateKey });

// 批量出售配置
interface BatchSellOptions {
  dryRun?: boolean;
  minPrice?: number;  // 最小价格（可选，低于此价格不出售）
  maxSlippage?: number; // 最大滑点
  delayBetweenTrades?: number; // 每笔交易之间的延迟（毫秒）
}

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket 批量出售代币工具');
  console.log('═══════════════════════════════════════════════════\n');
}

// 批量出售代币
async function batchSellTokens(options: BatchSellOptions = {}) {
  const {
    dryRun: isDryRun = dryRun,
    minPrice = 0,
    maxSlippage = 0.03,
    delayBetweenTrades = 1000, // 默认 1 秒延迟
  } = options;

  printBanner();
  console.log('📋 配置信息：');
  console.log(`   模式: ${isDryRun ? '🔍 模拟模式 (Dry Run)' : '💰 实盘模式'}`);
  console.log(`   最小价格: ${minPrice > 0 ? `$${minPrice}` : '无限制'}`);
  console.log(`   最大滑点: ${maxSlippage * 100}%`);
  console.log(`   交易延迟: ${delayBetweenTrades}ms\n`);

  try {
    // 获取钱包地址
    const walletAddress = sdk.getAddress();
    console.log(`💰 钱包地址: ${walletAddress}\n`);

    // 获取所有持仓
    console.log('🔍 正在获取持仓信息...');
    let positions: any[] = [];

    try {
      // 尝试使用 SDK 获取持仓
      if (typeof sdk.smartMoney.getPositions === 'function') {
        positions = await sdk.smartMoney.getPositions();
      } else if (typeof sdk.getPositions === 'function') {
        positions = await sdk.getPositions();
      } else {
        console.error('❌ SDK 不支持获取持仓功能');
        console.log('   请使用 SDK 的其他方法获取持仓，或手动指定要出售的代币\n');
        return;
      }
    } catch (error: any) {
      console.error('⚠️  获取持仓失败:', error?.message || error);
      console.log('   请检查网络连接和 SDK 配置\n');
      return;
    }

    if (!positions || positions.length === 0) {
      console.log('✅ 当前没有持仓，无需出售\n');
      return;
    }

    console.log(`📊 找到 ${positions.length} 个持仓\n`);

    // 统计信息
    let totalSold = 0;
    let totalValue = 0;
    let successCount = 0;
    let failCount = 0;

    // 遍历并出售每个持仓
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const marketId = position.marketId || position.market;
      const conditionId = position.conditionId || position.condition || marketId;
      let tokenId = position.tokenId || position.id || position.positionId || position.collectionId;
      const direction = position.direction || position.outcome || position.side;
      const amount = parseFloat(position.amount || position.balance || '0');
      const price = parseFloat(position.price || position.currentPrice || '0');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📈 持仓 #${i + 1}/${positions.length}`);
      console.log(`   市场: ${marketId || 'N/A'}`);
      if (conditionId) {
        console.log(`   条件ID: ${conditionId}`);
      }
      if (direction) {
        console.log(`   方向: ${direction}`);
      }
      console.log(`   代币ID: ${tokenId || 'N/A'}`);
      console.log(`   数量: ${amount}`);
      console.log(`   当前价格: $${price.toFixed(4)}`);

      // 如果 tokenId 不存在，打印调试信息并跳过
      if (!tokenId) {
        // 打印完整数据结构（仅第一个用于调试）
        if (i === 0) {
          console.log(`   ⚠️  调试信息（第一个持仓的完整数据）:`);
          try {
            const positionStr = JSON.stringify(position, null, 2);
            console.log(`   ${positionStr.substring(0, 800)}${positionStr.length > 800 ? '...' : ''}`);
          } catch (e) {
            console.log(`   无法序列化持仓数据`);
          }
        }
        
        console.log(`   ⏭️  跳过：代币ID不存在，无法出售`);
        console.log(`   提示：持仓数据中缺少 tokenId/positionId/collectionId 字段`);
        console.log(`   建议：检查 SDK 版本或使用不同的获取持仓方法`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        failCount++;
        continue;
      }

      // 检查最小价格
      if (minPrice > 0 && price < minPrice) {
        console.log(`   ⏭️  跳过：价格 $${price.toFixed(4)} 低于最小价格 $${minPrice}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        continue;
      }

      // 计算预计价值
      const estimatedValue = amount * price;
      console.log(`   预计价值: $${estimatedValue.toFixed(2)} USDC`);

      if (isDryRun) {
        console.log(`   状态: 🔍 模拟出售（不会真实执行）`);
        totalSold++;
        totalValue += estimatedValue;
        successCount++;
      } else {
        try {
          console.log(`   ⏳ 正在出售...`);
          
          // 执行出售（根据 SDK 的实际 API 调整）
          let sellResult: any;
          
          if (typeof sdk.smartMoney.sell === 'function') {
            sellResult = await sdk.smartMoney.sell({
              tokenId,
              amount,
              maxSlippage,
            });
          } else if (typeof sdk.sell === 'function') {
            sellResult = await sdk.sell({
              tokenId,
              amount,
              maxSlippage,
            });
          } else if (typeof sdk.createOrder === 'function') {
            // 使用创建订单的方式出售
            sellResult = await sdk.createOrder({
              tokenId,
              side: 'SELL',
              amount,
              maxSlippage,
              orderType: 'FOK',
            });
          } else {
            console.log(`   ❌ 错误：SDK 不支持出售功能`);
            failCount++;
            continue;
          }

          if (sellResult && (sellResult.success || sellResult.status === 'success')) {
            console.log(`   ✅ 出售成功`);
            totalSold++;
            totalValue += estimatedValue;
            successCount++;
          } else {
            console.log(`   ❌ 出售失败: ${sellResult?.error || sellResult?.message || '未知错误'}`);
            failCount++;
          }
        } catch (error: any) {
          console.log(`   ❌ 出售失败: ${error?.message || error}`);
          failCount++;
        }
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // 延迟，避免请求过快
      if (i < positions.length - 1 && delayBetweenTrades > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenTrades));
      }
    }

    // 打印总结
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 批量出售总结');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   总持仓数: ${positions.length}`);
    console.log(`   成功出售: ${successCount}`);
    console.log(`   失败/跳过: ${failCount}`);
    console.log(`   总价值: $${totalValue.toFixed(2)} USDC`);
    if (isDryRun) {
      console.log(`\n   ⚠️  这是模拟模式，未执行真实交易`);
    }
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ 批量出售失败:', error?.message || error);
    if (error?.stack) {
      console.error('\n堆栈跟踪:', error.stack);
    }
    process.exit(1);
  }
}

// 主函数
async function main() {
  // 从命令行参数或环境变量获取配置
  const args = process.argv.slice(2);
  
  const options: BatchSellOptions = {
    dryRun: dryRun,
    minPrice: 0,
    maxSlippage: 0.03,
    delayBetweenTrades: 1000,
  };

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--min-price' && args[i + 1]) {
      options.minPrice = parseFloat(args[i + 1]);
      i++;
    } else if (arg === '--max-slippage' && args[i + 1]) {
      options.maxSlippage = parseFloat(args[i + 1]);
      i++;
    } else if (arg === '--delay' && args[i + 1]) {
      options.delayBetweenTrades = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--real') {
      options.dryRun = false;
    }
  }

  await batchSellTokens(options);
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 未处理的错误:', error);
  process.exit(1);
});
