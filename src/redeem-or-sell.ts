import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// Polymarket CTF 合约地址（根据官方文档）
const CTF_ADDRESS = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';
// USDC.e 地址（Polygon 网络）
const USDCe_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

// Polygon RPC URL
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

// CTF 合约 ABI（用于检查 payout）
const CTF_ABI = [
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId, uint256 indexSet) view returns (uint256)',
  'function getCondition(bytes32 conditionId) view returns (uint256, uint256, uint256, uint256, uint256)',
];

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

// 解析是否只尝试卖出（跳过赎回尝试）
const SELL_ONLY = process.env.SELL_ONLY === 'true';

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   智能赎回/卖出工具（优先赎回，失败则卖出）');
  console.log('═══════════════════════════════════════════════════\n');
}

// 将 conditionId 转换为 bytes32 格式
function normalizeConditionId(conditionId: string): string {
  let normalized = conditionId.trim();
  
  if (normalized.startsWith('0x') || normalized.startsWith('0X')) {
    normalized = normalized.slice(2);
  }
  
  if (normalized.length < 64) {
    normalized = normalized.padStart(64, '0');
  } else if (normalized.length > 64) {
    normalized = normalized.slice(0, 64);
  }
  
  return '0x' + normalized.toLowerCase();
}

// 将 outcomeIndex 转换为 indexSets
function outcomeIndexToIndexSet(outcomeIndex: number): number {
  if (outcomeIndex === 0 || outcomeIndex === 1) {
    return outcomeIndex + 1;
  }
  if (outcomeIndex === 1 || outcomeIndex === 2) {
    return outcomeIndex;
  }
  return outcomeIndex;
}

// 检查 payout（修复版本：正确处理 bigint）
async function checkPayout(
  provider: ethers.Provider,
  conditionId: string,
  indexSet: number
): Promise<{ payout: number; canRedeem: boolean }> {
  try {
    const ctfContract = new ethers.Contract(CTF_ADDRESS, CTF_ABI, provider);
    const normalizedConditionId = normalizeConditionId(conditionId);
    
    // 读取 payoutDenominator（使用 bigint 比较，不使用 .eq）
    const denominator = await ctfContract.payoutDenominator(normalizedConditionId);
    const denominatorValue = typeof denominator === 'bigint' ? denominator : BigInt(denominator.toString());
    
    // 如果 denominator 为 0，说明市场未结算
    if (denominatorValue === 0n) {
      return { payout: 0, canRedeem: false };
    }
    
    // 读取 payoutNumerator
    const numerator = await ctfContract.payoutNumerators(normalizedConditionId, indexSet);
    const numeratorValue = typeof numerator === 'bigint' ? numerator : BigInt(numerator.toString());
    
    // 计算 payout = numerator / denominator
    // 对于二元市场，获胜方 payout = 1 (numerator == denominator)，失败方 payout = 0
    const payout = Number(numeratorValue) / Number(denominatorValue);
    const canRedeem = numeratorValue > 0n;
    
    return { payout, canRedeem };
  } catch (error: any) {
    console.warn(`   ⚠️  检查 payout 失败: ${error?.message || error}`);
    // 如果检查失败，返回默认值（保守策略：不赎回）
    return { payout: 0, canRedeem: false };
  }
}

// 使用官方 CTF redeemPositions 方法回收代币
async function redeemPositionsCTF(
  sdk: PolymarketSDK,
  conditionId: string,
  indexSets: number[]
): Promise<any> {
  const parentCollectionId = '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  // 尝试使用 SDK 的 CTF 客户端
  if ((sdk as any).ctfClient) {
    const ctfClient = (sdk as any).ctfClient;
    if (ctfClient.redeemPositions) {
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

  if ((onchainService as any).redeemPositions) {
    return await (onchainService as any).redeemPositions(
      USDCe_ADDRESS,
      parentCollectionId,
      conditionId,
      indexSets
    );
  }

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

    // 创建 ethers provider（用于检查 payout）
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);

    // 获取钱包地址
    const walletAddress = sdk.tradingService.getAddress();
    console.log(`钱包地址: ${walletAddress}`);
    console.log(`模式: ${dryRun ? '🔍 模拟模式' : '💰 实盘模式'}`);
    if (SELL_ONLY) {
      console.log(`策略: 只卖出（跳过赎回尝试）`);
    } else {
      console.log(`策略: 优先赎回，失败则卖出`);
    }
    console.log('');

    // 获取持仓
    console.log('📊 正在获取持仓信息...');
    const allPositions = await sdk.dataApi.getPositions(walletAddress);
    
    if (!allPositions || allPositions.length === 0) {
      console.log('✅ 没有持仓需要处理\n');
      return;
    }

    // 过滤出有余额的持仓
    const positions = allPositions.filter((pos: any) => {
      const balance = parseFloat((pos.size || pos.amount || pos.balance || '0').toString());
      return balance > 0;
    });

    if (positions.length === 0) {
      console.log(`找到 ${allPositions.length} 个持仓，但都没有余额可处理\n`);
      return;
    }

    console.log(`\n找到 ${allPositions.length} 个持仓，其中 ${positions.length} 个有余额：\n`);

    // 尝试为每个持仓获取 tokenId
    console.log('🔍 正在解析持仓信息...\n');
    const positionsWithTokenId = [];
    
    for (let idx = 0; idx < positions.length; idx++) {
      const pos = positions[idx];
      
      // 从持仓数据中获取 tokenId
      let tokenId = pos.asset || 
                    pos.tokenId || 
                    pos.outcomeTokenId || 
                    pos.token_id || 
                    pos.outcome_token_id;
      
      // 如果 tokenId 是数字，转换为字符串
      if (tokenId && typeof tokenId === 'number') {
        tokenId = tokenId.toString();
      }
      
      // 如果 tokenId 是 BigInt 或大整数，转换为字符串
      if (tokenId && (typeof tokenId === 'bigint' || (typeof tokenId === 'object' && tokenId.toString))) {
        tokenId = tokenId.toString();
      }
      
      // 如果 tokenId 不存在，尝试从 conditionId 和 outcomeIndex 计算
      if (!tokenId && pos.conditionId && pos.outcomeIndex !== undefined) {
        try {
          if ((sdk.tradingService as any).getTokenId) {
            try {
              tokenId = await (sdk.tradingService as any).getTokenId(pos.conditionId, pos.outcomeIndex);
            } catch (e) {
              // 忽略错误
            }
          }
          
          if (!tokenId && (sdk as any).ctfClient) {
            try {
              const ctfClient = (sdk as any).ctfClient;
              if (ctfClient.getTokenId) {
                tokenId = await ctfClient.getTokenId(pos.conditionId, pos.outcomeIndex);
              }
            } catch (e) {
              // 忽略错误
            }
          }
        } catch (error) {
          // 忽略错误
        }
      }
      
      positionsWithTokenId.push({
        ...pos,
        _resolvedTokenId: tokenId,
      });
    }

    // 显示持仓信息
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 持仓列表');
    console.log('═══════════════════════════════════════════════════\n');

    positionsWithTokenId.forEach((pos: any, index: number) => {
      console.log(`持仓 #${index + 1}:`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   代币ID: ${pos._resolvedTokenId || '未找到'}`);
      const size = parseFloat(pos.size || pos.amount || pos.balance || '0');
      console.log(`   数量: ${size.toFixed(4)}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
      console.log(`   可赎回: ${pos.redeemable ? '✅ 是' : '❌ 否'}`);
      console.log('');
    });

    if (dryRun) {
      console.log('🔍 模拟模式：不会执行真实操作\n');
      console.log('如需真实操作，请在 .env 中设置 DRY_RUN=false\n');
      return;
    }

    // 确认操作
    console.log('⚠️  警告：即将处理所有持仓！');
    console.log(`   模式: 💰 实盘模式`);
    console.log(`   持仓数量: ${positionsWithTokenId.length}`);
    console.log('');

    // 处理每个持仓
    console.log('🔄 开始处理持仓...\n');

    const results: Array<{
      success: boolean;
      method: 'redeem' | 'sell' | 'none';
      position: any;
      error?: string;
      txHash?: string;
      amount?: number;
    }> = [];

    for (let i = 0; i < positionsWithTokenId.length; i++) {
      const pos = positionsWithTokenId[i];
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`处理持仓 #${i + 1}/${positionsWithTokenId.length}`);
      console.log(`   市场: ${pos.market || pos.conditionId || 'N/A'}`);
      console.log(`   条件ID: ${pos.conditionId || 'N/A'}`);
      console.log(`   数量: ${pos.size || pos.amount || pos.balance || '0'}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);

      let success = false;
      let method: 'redeem' | 'sell' | 'none' = 'none';
      let error: string | undefined;
      let txHash: string | undefined;
      let amount: number | undefined;

      // 策略 1: 尝试赎回（如果未设置 SELL_ONLY）
      if (!SELL_ONLY && (pos.redeemable === true || pos.redeemable === 'true')) {
        try {
          const conditionId = pos.conditionId || pos.market;
          const outcomeIndex = pos.outcomeIndex;

          if (!conditionId) {
            throw new Error('条件ID（conditionId）不存在，无法赎回');
          }

          if (outcomeIndex === undefined || outcomeIndex === null) {
            throw new Error('方向索引（outcomeIndex）不存在，无法赎回');
          }

          const indexSet = outcomeIndexToIndexSet(outcomeIndex);
          const indexSets = [indexSet];
          const normalizedConditionId = normalizeConditionId(conditionId);

          // 先检查 payout（修复版本）
          console.log(`   🔍 检查 payout...`);
          const payoutInfo = await checkPayout(provider, conditionId, indexSet);
          
          console.log(`      payout: ${payoutInfo.payout.toFixed(4)}`);
          console.log(`      可赎回: ${payoutInfo.canRedeem ? '✅ 是' : '❌ 否'}`);

          if (!payoutInfo.canRedeem) {
            throw new Error(`持仓 payout = 0，这是失败方向，无法赎回（这是正常情况）`);
          }

          console.log(`   🔄 尝试赎回（payout > 0，获胜方向）...`);
          console.log(`      conditionId: ${normalizedConditionId}`);
          console.log(`      indexSets: [${indexSets.join(', ')}]`);

          let tx: any = null;

          try {
            tx = await redeemPositionsCTF(sdk, normalizedConditionId, indexSets);
            console.log(`      ✅ 赎回交易已提交`);
          } catch (ctfError: any) {
            throw new Error(`赎回失败: ${ctfError?.message || ctfError}`);
          }

          if (!tx) {
            throw new Error('无法创建赎回交易');
          }

          console.log(`      ⏳ 等待交易确认...`);
          let receipt: any = null;
          
          if (tx.wait) {
            receipt = await tx.wait();
            txHash = receipt.transactionHash || tx.hash || '';
          } else if (tx.hash) {
            txHash = tx.hash;
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else if (typeof tx === 'string') {
            txHash = tx;
            await new Promise(resolve => setTimeout(resolve, 5000));
          }

          amount = parseFloat(pos.size || pos.amount || pos.balance || '0');
          success = true;
          method = 'redeem';

          console.log(`      ✅ 赎回成功`);
          console.log(`      交易哈希: ${txHash}`);
          console.log(`      查看交易: https://polygonscan.com/tx/${txHash}`);
          console.log(`      回收金额: $${amount.toFixed(2)} USDC.e`);

        } catch (redeemError: any) {
          const errorMsg = redeemError?.message || String(redeemError);
          console.log(`      ❌ 赎回失败: ${errorMsg}`);
          console.log(`      🔄 将尝试卖出...`);
          
          // 继续尝试卖出
          error = errorMsg;
        }
      } else if (!SELL_ONLY) {
        console.log(`   ℹ️  持仓不可赎回，将尝试卖出...`);
      }

      // 策略 2: 如果赎回失败或不可赎回，尝试卖出
      if (!success) {
        try {
          let tokenId = pos._resolvedTokenId;
          const amountValue = pos.size || pos.amount || pos.balance || '1';

          if (!tokenId) {
            tokenId = pos.asset || pos.tokenId || pos.outcomeTokenId || pos.token_id || pos.outcome_token_id;
          }

          if (tokenId) {
            if (typeof tokenId === 'number' || typeof tokenId === 'bigint') {
              tokenId = tokenId.toString();
            } else if (typeof tokenId === 'object' && tokenId.toString) {
              tokenId = tokenId.toString();
            }
          }

          if (!tokenId) {
            throw new Error('代币ID不存在：无法从持仓数据中获取 tokenId');
          }

          const tokenIdStr = String(tokenId);
          console.log(`   🔄 尝试卖出...`);
          console.log(`      代币ID: ${tokenIdStr}`);
          console.log(`      数量: ${amountValue}`);

          const order = await sdk.tradingService.createMarketOrder({
            tokenId: tokenIdStr,
            side: 'SELL',
            amount: parseFloat(amountValue.toString()),
            orderType: 'FAK',
          });

          const hasError = order?.error || order?.message || order?.success === false;
          const hasOrderId = !!order?.id;
          const filledAmount = order?.filled || order?.filledAmount || order?.filledSize || order?.amountFilled;
          const hasReceipt = order?.receipt || order?.txHash;
          const isSuccess = order?.success === true || (hasOrderId && !hasError && (filledAmount || hasReceipt));

          if (isSuccess) {
            success = true;
            method = 'sell';
            amount = parseFloat(order.usdcReceived || order.receivedAmount || amountValue || '0');

            console.log(`      ✅ 卖出成功`);
            if (order.id) {
              console.log(`      订单ID: ${order.id}`);
            }
            if (filledAmount) {
              console.log(`      成交数量: ${filledAmount}`);
            }
            if (order.usdcReceived || order.receivedAmount) {
              console.log(`      收到金额: $${order.usdcReceived || order.receivedAmount} USDC.e`);
            }
            if (hasReceipt) {
              txHash = order.receipt?.transactionHash || order.txHash;
              console.log(`      交易哈希: ${txHash}`);
              console.log(`      查看交易: https://polygonscan.com/tx/${txHash}`);
            }
          } else {
            const errorMsg = order?.error || order?.message || '订单执行失败（未找到成功标志）';
            throw new Error(errorMsg);
          }

        } catch (sellError: any) {
          const errorMsg = sellError?.message || String(sellError);
          error = error || errorMsg;
          console.log(`      ❌ 卖出失败: ${errorMsg}`);
        }
      }

      results.push({
        success,
        method,
        position: pos,
        error,
        txHash,
        amount,
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // 避免请求过快，稍作延迟
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 显示结果统计
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 处理结果统计');
    console.log('═══════════════════════════════════════════════════\n');

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const redeemCount = results.filter(r => r.method === 'redeem' && r.success).length;
    const sellCount = results.filter(r => r.method === 'sell' && r.success).length;
    const totalAmount = results
      .filter(r => r.success && r.amount)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    console.log(`总持仓数: ${positionsWithTokenId.length}`);
    console.log(`成功处理: ${successCount}`);
    console.log(`   - 赎回成功: ${redeemCount}`);
    console.log(`   - 卖出成功: ${sellCount}`);
    console.log(`失败: ${failCount}`);
    if (totalAmount > 0) {
      console.log(`总回收/卖出金额: $${totalAmount.toFixed(2)} USDC.e`);
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