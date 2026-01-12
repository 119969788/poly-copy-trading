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

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket 批量卖出代币工具');
  console.log('═══════════════════════════════════════════════════\n');
}

// 主函数
async function main() {
  printBanner();

  let sdk: PolymarketSDK | null = null;
  let onchainService: OnchainService | null = null;

  try {
    // 初始化 SDK
    console.log('🚀 正在初始化 SDK...');
    sdk = await PolymarketSDK.create({ privateKey });
    console.log('✅ SDK 初始化成功\n');

    // 创建 OnchainService
    onchainService = new OnchainService({
      privateKey: privateKey as string,
    });

    // 获取钱包地址
    const walletAddress = sdk.tradingService.getAddress();
    console.log(`钱包地址: ${walletAddress}\n`);

    // 获取持仓
    console.log('📊 正在获取持仓信息...');
    const allPositions = await sdk.dataApi.getPositions(walletAddress);
    
    if (!allPositions || allPositions.length === 0) {
      console.log('✅ 没有持仓需要卖出\n');
      return;
    }

    // 过滤出有余额的持仓（可以卖出的）
    const positions = allPositions.filter((pos: any) => {
      const balance = parseFloat((pos.size || pos.amount || pos.balance || '0').toString());
      return balance > 0;
    });

    if (positions.length === 0) {
      console.log(`找到 ${allPositions.length} 个持仓，但都没有余额可卖出\n`);
      return;
    }

    console.log(`\n找到 ${allPositions.length} 个持仓，其中 ${positions.length} 个有余额可卖出：\n`);
    
    // 显示持仓信息
    positions.forEach((pos: any, index: number) => {
      console.log(`持仓 #${index + 1}:`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   代币ID: ${pos.tokenId || pos.outcomeTokenId || 'N/A'}`);
      console.log(`   数量: ${pos.size || pos.amount || pos.balance || '0'}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      console.log(`   价值: $${pos.value || pos.usdcValue || '0'}`);
      console.log(`   PnL: $${pos.cashPnl || pos.pnl || '0'}`);
      console.log('');
    });

    if (dryRun) {
      console.log('🔍 模拟模式：不会执行真实卖出\n');
      console.log('如需真实卖出，请在 .env 中设置 DRY_RUN=false\n');
      return;
    }

    // 确认操作
    console.log('⚠️  警告：即将卖出所有持仓！');
    console.log(`   模式: 💰 实盘模式`);
    console.log(`   持仓数量: ${positions.length}`);
    console.log('');
    
    // 批量卖出
    console.log('🔄 开始批量卖出...\n');
    
    const results: Array<{ success: boolean; position: any; error?: string }> = [];
    
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`卖出持仓 #${i + 1}/${positions.length}`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   代币ID: ${pos.tokenId || pos.outcomeTokenId || 'N/A'}`);
      console.log(`   数量: ${pos.size || pos.amount || pos.balance || '0'}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      
      try {
        // 获取代币ID和数量
        const tokenId = pos.tokenId || pos.outcomeTokenId;
        const amount = pos.size || pos.amount || pos.balance || '1';
        
        if (!tokenId) {
          throw new Error('代币ID不存在');
        }
        
        // 尝试使用市场订单卖出
        // 注意：对于 SELL，amount 是 shares 数量
        const order = await sdk.tradingService.createMarketOrder({
          tokenId: tokenId,
          side: 'SELL',
          amount: parseFloat(amount.toString()), // 转换为数字
          orderType: 'FAK', // Fill and Kill，部分成交也可以
        });
        
        results.push({ success: true, position: pos });
        console.log(`   状态: ✅ 成功`);
        if (order.id) {
          console.log(`   订单ID: ${order.id}`);
        }
        if (order.success === false && order.error) {
          console.log(`   警告: ${order.error}`);
        }
      } catch (error: any) {
        results.push({ 
          success: false, 
          position: pos, 
          error: error?.message || String(error) 
        });
        console.log(`   状态: ❌ 失败`);
        console.log(`   错误: ${error?.message || error}`);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // 避免请求过快，稍作延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 显示结果统计
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 卖出结果统计');
    console.log('═══════════════════════════════════════════════════\n');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`总持仓数: ${positions.length}`);
    console.log(`成功卖出: ${successCount}`);
    console.log(`失败: ${failCount}`);
    
    if (failCount > 0) {
      console.log('\n失败的持仓：');
      results.filter(r => !r.success).forEach((r, i) => {
        console.log(`   ${i + 1}. 代币ID: ${r.position.tokenId || 'N/A'}`);
        console.log(`      错误: ${r.error}`);
      });
    }
    
    console.log('');

  } catch (error: any) {
    console.error('\n❌ 发生错误:', error?.message || error);
    if (error?.stack) {
      console.error('\n堆栈跟踪:', error.stack);
    }
  } finally {
    // 清理资源
    if (sdk) {
      sdk.stop();
    }
  }
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 未处理的错误:', error);
  process.exit(1);
});
