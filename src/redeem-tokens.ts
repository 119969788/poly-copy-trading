import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// Polymarket CTF 合约地址（根据官方文档）
const CTF_ADDRESS = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';
// USDC.e 地址（Polygon 网络）
const USDCe_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

// 获取配置
let privateKey = process.env.POLYMARKET_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ 错误：请在 .env 文件中设置 POLYMARKET_PRIVATE_KEY');
  process.exit(1);
}

// 清理私钥
privateKey = privateKey.trim().replace(/\s+/g, '');
if (privateKey.startsWith('0x') || privateKey.startsWith('0X')) {
  privateKey = privateKey.slice(2);
}

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket 代币回收工具（基于官方 CTF 文档）');
  console.log('═══════════════════════════════════════════════════\n');
}

// 将 conditionId 转换为 bytes32 格式（根据官方文档要求）
function normalizeConditionId(conditionId: string): string {
  // 去除空格
  let normalized = conditionId.trim();
  
  // 如果以 0x 开头，去除它
  if (normalized.startsWith('0x') || normalized.startsWith('0X')) {
    normalized = normalized.slice(2);
  }
  
  // 确保是 64 个十六进制字符（32 字节 = bytes32）
  // 如果不足 64 个字符，前面补 0
  if (normalized.length < 64) {
    normalized = normalized.padStart(64, '0');
  } else if (normalized.length > 64) {
    // 如果超过 64 个字符，取前 64 个
    normalized = normalized.slice(0, 64);
  }
  
  // 返回带 0x 前缀的格式
  return '0x' + normalized.toLowerCase();
}

// 将 outcomeIndex 转换为 indexSets（根据官方文档）
// 对于二进制市场：YES = 1, NO = 2
function outcomeIndexToIndexSet(outcomeIndex: number): number {
  // outcomeIndex 通常从 0 开始（YES=0, NO=1）
  // 但 CTF 的 indexSets 从 1 开始（YES=1, NO=2）
  // 所以需要 +1
  if (outcomeIndex === 0 || outcomeIndex === 1) {
    return outcomeIndex + 1;
  }
  // 如果已经是 1 或 2，直接返回
  if (outcomeIndex === 1 || outcomeIndex === 2) {
    return outcomeIndex;
  }
  // 其他情况，假设已经是正确的格式
  return outcomeIndex;
}

// 使用官方 CTF redeemPositions 方法回收代币
// 根据官方文档：https://docs.polymarket.com/developers/CTF/redeem
// 参数说明：
// - collateralToken: USDC.e 地址
// - parentCollectionId: bytes32(0) - null（二进制市场）
// - conditionId: bytes32 格式的条件ID
// - indexSets: 结果索引数组，例如 [1] 或 [2]（YES=1, NO=2）
async function redeemPositionsCTF(
  sdk: PolymarketSDK,
  conditionId: string, // 应该是已经规范化的 bytes32 格式
  indexSets: number[]
): Promise<any> {
  const parentCollectionId = '0x0000000000000000000000000000000000000000000000000000000000000000'; // bytes32(0) - null
  
  // 尝试使用 SDK 的 CTF 客户端
  if ((sdk as any).ctfClient) {
    const ctfClient = (sdk as any).ctfClient;
    if (ctfClient.redeemPositions) {
      // 根据官方文档，参数为：
      // collateralToken, parentCollectionId (null), conditionId, indexSets
      return await ctfClient.redeemPositions(
        USDCe_ADDRESS,
        parentCollectionId,
        conditionId,
        indexSets
      );
    }
  }

  // 如果 SDK 没有 CTF 客户端，尝试使用 OnchainService
  const onchainService = new OnchainService({
    privateKey: privateKey as string,
  });

  // 尝试各种可能的赎回方法
  if ((onchainService as any).redeemPositions) {
    return await (onchainService as any).redeemPositions(
      USDCe_ADDRESS,
      parentCollectionId,
      conditionId,
      indexSets
    );
  }

  // 如果都没有，抛出错误
  throw new Error('SDK 不支持 CTF redeemPositions 方法');
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
      console.log('✅ 没有持仓需要回收\n');
      return;
    }

    // 过滤出有余额的持仓
    const positions = allPositions.filter((pos: any) => {
      const balance = parseFloat((pos.size || pos.amount || pos.balance || '0').toString());
      return balance > 0;
    });

    if (positions.length === 0) {
      console.log(`找到 ${allPositions.length} 个持仓，但都没有余额可回收\n`);
      return;
    }

    console.log(`\n找到 ${allPositions.length} 个持仓，其中 ${positions.length} 个有余额：\n`);

    // 检查哪些市场已结算并可以回收
    console.log('🔍 正在检查已结算的市场...\n');
    const redeemablePositions: any[] = [];
    
    for (const pos of positions) {
      // 检查是否可回收
      const isRedeemable = pos.redeemable === true;
      
      if (isRedeemable) {
        redeemablePositions.push(pos);
      } else {
        // 尝试从市场信息中获取
        const conditionId = pos.conditionId || pos.market;
        
        if (conditionId) {
          try {
            // 尝试获取市场信息
            let marketInfo: any = null;
            try {
              marketInfo = await (sdk.dataApi as any).getMarket?.(conditionId) ||
                          await (sdk.dataApi as any).getMarketInfo?.(conditionId);
            } catch (e) {
              // 忽略错误
            }

            // 检查市场是否已结算
            const isSettled = marketInfo?.resolved === true || 
                             marketInfo?.settled === true ||
                             (marketInfo?.endDate && new Date(marketInfo.endDate) < new Date());
            
            if (isSettled) {
              redeemablePositions.push({
                ...pos,
                marketInfo,
              });
            }
          } catch (error) {
            // 忽略错误，继续处理下一个持仓
          }
        }
      }
    }

    if (redeemablePositions.length === 0) {
      console.log('✅ 没有已结算的市场需要回收\n');
      console.log('💡 提示：只有已结算（resolved/settled）的市场才能回收代币\n');
      return;
    }

    console.log(`找到 ${redeemablePositions.length} 个已结算市场的持仓：\n`);

    // 显示可回收的持仓
    redeemablePositions.forEach((pos: any, index: number) => {
      console.log(`持仓 #${index + 1}:`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      const size = parseFloat(pos.size || pos.amount || pos.balance || '0');
      console.log(`   数量: ${size.toFixed(4)}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      console.log(`   方向索引: ${pos.outcomeIndex !== undefined ? pos.outcomeIndex : 'N/A'}`);
      console.log(`   代币ID (asset): ${pos.asset || pos.tokenId || 'N/A'}`);
      console.log(`   状态: ✅ 已结算 (redeemable: ${pos.redeemable})`);
      console.log('');
    });

    if (dryRun) {
      console.log('🔍 模拟模式：不会执行真实回收\n');
      console.log('如需真实回收，请在 .env 中设置 DRY_RUN=false\n');
      return;
    }

    // 确认操作
    console.log('⚠️  警告：即将回收已结算市场的代币！');
    console.log(`   模式: 💰 实盘模式`);
    console.log(`   可回收持仓数量: ${redeemablePositions.length}`);
    console.log('');
    
    // 批量回收
    console.log('🔄 开始批量回收（使用官方 CTF redeemPositions 方法）...\n');
    
    const results: Array<{ success: boolean; position: any; error?: string; txHash?: string; amount?: number }> = [];
    
    for (let i = 0; i < redeemablePositions.length; i++) {
      const pos = redeemablePositions[i];
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`回收持仓 #${i + 1}/${redeemablePositions.length}`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   数量: ${pos.size || pos.amount || pos.balance || '0'}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      
      try {
        const conditionId = pos.conditionId || pos.market;
        const outcomeIndex = pos.outcomeIndex;
        const asset = pos.asset || pos.tokenId || pos.outcomeTokenId;
        
        if (!conditionId) {
          throw new Error('条件ID（conditionId）不存在，无法赎回');
        }
        
        if (outcomeIndex === undefined || outcomeIndex === null) {
          throw new Error('方向索引（outcomeIndex）不存在，无法赎回');
        }
        
        // 验证 conditionId 格式
        let conditionIdStr = conditionId.toString();
        if (conditionIdStr.length === 0) {
          throw new Error('条件ID为空');
        }
        
        // 显示原始信息
        console.log(`   原始数据:`);
        console.log(`     conditionId: ${conditionIdStr}`);
        if (asset) {
          console.log(`     asset/tokenId: ${asset}`);
        }
        console.log(`     outcomeIndex: ${outcomeIndex}`);

        // 根据官方文档，indexSets 需要将 outcomeIndex 转换为正确的格式
        // 对于二进制市场：YES = 1, NO = 2
        // outcomeIndex 通常从 0 开始，需要转换为 CTF 的 indexSet（从 1 开始）
        const indexSet = outcomeIndexToIndexSet(outcomeIndex);
        const indexSets = [indexSet];
        
        // 规范化 conditionId
        const normalizedConditionId = normalizeConditionId(conditionId);
        
        console.log(`   使用 CTF redeemPositions 方法（基于官方文档）:`);
        console.log(`      原始 conditionId: ${conditionId}`);
        console.log(`      规范化 conditionId (bytes32): ${normalizedConditionId}`);
        console.log(`      outcomeIndex: ${outcomeIndex} -> indexSet: ${indexSet}`);
        console.log(`      indexSets: [${indexSets.join(', ')}]`);
        console.log(`      collateralToken: ${USDCe_ADDRESS}`);
        console.log(`      parentCollectionId: 0x0000...0000 (null)`);

        let tx: any = null;

        // 方法1: 使用官方 CTF redeemPositions 方法（推荐，基于官方文档）
        try {
          tx = await redeemPositionsCTF(sdk, normalizedConditionId, indexSets);
          console.log(`   ✅ 使用 CTF redeemPositions 方法提交交易`);
        } catch (ctfError: any) {
          // 如果 CTF 方法失败，尝试其他 SDK 方法
          console.log(`   ⚠️  CTF redeemPositions 失败，尝试其他 SDK 方法...`);
          
          // 方法2: 尝试使用 SDK 的其他 CTF 方法
          try {
            if ((onchainService as any).ctfRedeem) {
              tx = await (onchainService as any).ctfRedeem(conditionId, outcomeIndex);
            } else if ((onchainService as any).redeemCondition) {
              tx = await (onchainService as any).redeemCondition(conditionId, outcomeIndex);
            } else if ((sdk.tradingService as any).ctfRedeem) {
              tx = await (sdk.tradingService as any).ctfRedeem(conditionId, outcomeIndex);
            } else if ((sdk.tradingService as any).redeemCondition) {
              tx = await (sdk.tradingService as any).redeemCondition(conditionId, outcomeIndex);
            } else {
              throw new Error('SDK 不支持任何 CTF 赎回方法');
            }
            console.log(`   ✅ 使用 SDK 备用方法提交交易`);
          } catch (sdkError: any) {
            throw new Error(`所有方法都失败: ${sdkError?.message || sdkError}`);
          }
        }

        if (!tx) {
          throw new Error('无法创建交易');
        }

        // 等待交易确认
        console.log(`   ⏳ 等待交易确认...`);
        let receipt: any = null;
        let txHash: string = '';
        
        if (tx.wait) {
          receipt = await tx.wait();
          txHash = receipt.transactionHash || tx.hash || '';
        } else if (tx.hash) {
          txHash = tx.hash;
          // 如果没有 wait 方法，等待一段时间
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else if (typeof tx === 'string') {
          txHash = tx;
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        const amount = parseFloat(pos.size || pos.amount || pos.balance || '0');
        
        results.push({ 
          success: true, 
          position: pos,
          txHash,
          amount
        });
        
        console.log(`   ✅ 回收成功`);
        console.log(`   交易哈希: ${txHash}`);
        console.log(`   查看交易: https://polygonscan.com/tx/${txHash}`);
        console.log(`   回收金额: $${amount.toFixed(2)} USDC.e`);
        
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        results.push({ 
          success: false, 
          position: pos, 
          error: errorMsg
        });
        console.log(`   ❌ 回收失败`);
        console.log(`   错误: ${errorMsg}`);
        
        // 检查是否是预期的错误（持有失败方向的代币）
        if (errorMsg.includes('revert') || 
            errorMsg.includes('INVALID') || 
            errorMsg.includes('CALL_EXCEPTION') ||
            errorMsg.includes('cannot redeem') ||
            errorMsg.includes('not redeemable')) {
          console.log(`   💡 提示: 这可能表示持有的是失败方向的代币（只有获胜方向的代币才能赎回）`);
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // 避免请求过快，稍作延迟
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 显示结果统计
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 回收结果统计');
    console.log('═══════════════════════════════════════════════════\n');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalRedeemed = results
      .filter(r => r.success && r.amount)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    console.log(`总持仓数: ${redeemablePositions.length}`);
    console.log(`成功回收: ${successCount}`);
    console.log(`失败: ${failCount}`);
    if (totalRedeemed > 0) {
      console.log(`总回收金额: $${totalRedeemed.toFixed(2)} USDC.e`);
    }
    
    if (failCount > 0) {
      console.log('\n失败的持仓：');
      results.filter(r => !r.success).forEach((r, i) => {
        console.log(`   ${i + 1}. 条件ID: ${r.position.conditionId || 'N/A'}`);
        console.log(`      方向: ${r.position.outcome || r.position.side || 'N/A'}`);
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
