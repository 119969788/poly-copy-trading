import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 根据官方文档：https://docs.polymarket.com/developers/CTF/redeem
// CTF 合约地址（Conditional Token Framework）
const CTF_ADDRESS = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';
// USDC.e 地址（Polygon 网络，作为 collateral token）
const USDCe_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

// Polygon RPC URL
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

// CTF 合约 ABI（根据官方文档）
const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId, uint256 indexSet) view returns (uint256)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function getCollectionId(bytes32 parentCollectionId, bytes32 conditionId, uint256 indexSet) pure returns (uint256)',
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

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   Polymarket 代币回收工具（基于官方 CTF API）');
  console.log('   参考: https://docs.polymarket.com/developers/CTF/redeem');
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

// 安全地将值转换为 bigint
function toBigInt(value: any): bigint {
  try {
    if (typeof value === 'bigint') {
      return value;
    }
    if (typeof value === 'number') {
      return BigInt(value);
    }
    if (value === null || value === undefined) {
      return 0n;
    }
    const str = String(value);
    const cleanStr = str.replace(/[^0-9-]/g, '');
    if (cleanStr === '' || cleanStr === '-') {
      return 0n;
    }
    return BigInt(cleanStr);
  } catch (e) {
    return 0n;
  }
}

// 检查 payout（根据官方文档）
async function checkPayout(
  provider: ethers.Provider,
  conditionId: string,
  indexSet: number
): Promise<{ payout: number; canRedeem: boolean; numerator: bigint; denominator: bigint }> {
  try {
    const ctfContract = new ethers.Contract(CTF_ADDRESS, CTF_ABI, provider);
    const normalizedConditionId = normalizeConditionId(conditionId);
    
    // 读取 payoutDenominator
    const denominatorRaw = await ctfContract.payoutDenominator(normalizedConditionId);
    const denominator = toBigInt(denominatorRaw);
    
    // 如果 denominator 为 0，说明市场未结算
    if (denominator === 0n) {
      return { payout: 0, canRedeem: false, numerator: 0n, denominator: 0n };
    }
    
    // 读取 payoutNumerator
    const numeratorRaw = await ctfContract.payoutNumerators(normalizedConditionId, indexSet);
    const numerator = toBigInt(numeratorRaw);
    
    // 计算 payout = numerator / denominator
    const payout = Number(numerator) / Number(denominator);
    const canRedeem = numerator > 0n;
    
    return { payout, canRedeem, numerator, denominator };
  } catch (error: any) {
    console.warn(`   ⚠️  检查 payout 失败: ${error?.message || error}`);
    return { payout: 0, canRedeem: false, numerator: 0n, denominator: 0n };
  }
}

// 获取代币余额（根据官方文档，使用 CTF 合约的 balanceOf）
async function getTokenBalance(
  provider: ethers.Provider,
  walletAddress: string,
  conditionId: string,
  indexSet: number
): Promise<bigint> {
  try {
    const ctfContract = new ethers.Contract(CTF_ADDRESS, CTF_ABI, provider);
    const normalizedConditionId = normalizeConditionId(conditionId);
    
    // 计算 collectionId（tokenId）
    const parentCollectionId = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const collectionId = await ctfContract.getCollectionId(parentCollectionId, normalizedConditionId, indexSet);
    
    // 获取余额
    const balance = await ctfContract.balanceOf(walletAddress, collectionId);
    return toBigInt(balance);
  } catch (error: any) {
    console.warn(`   ⚠️  获取代币余额失败: ${error?.message || error}`);
    return 0n;
  }
}

// 使用官方 CTF redeemPositions 方法（根据官方文档）
// 参考: https://docs.polymarket.com/developers/CTF/redeem
async function redeemPositionsOfficial(
  wallet: ethers.Wallet,
  conditionId: string,
  indexSets: number[]
): Promise<ethers.ContractTransactionResponse> {
  const ctfContract = new ethers.Contract(CTF_ADDRESS, CTF_ABI, wallet);
  const normalizedConditionId = normalizeConditionId(conditionId);
  const parentCollectionId = '0x0000000000000000000000000000000000000000000000000000000000000000'; // bytes32(0)
  
  // 根据官方文档调用 redeemPositions
  // redeemPositions(collateralToken, parentCollectionId, conditionId, indexSets)
  const tx = await ctfContract.redeemPositions(
    USDCe_ADDRESS,           // collateralToken
    parentCollectionId,      // parentCollectionId (bytes32(0))
    normalizedConditionId,   // conditionId (bytes32)
    indexSets                // indexSets (uint256[])
  );
  
  return tx;
}

// 主函数
async function main() {
  printBanner();

  let sdk: PolymarketSDK | null = null;
  let provider: ethers.Provider | null = null;
  let wallet: ethers.Wallet | null = null;

  try {
    // 初始化 SDK
    console.log('🚀 正在初始化 SDK...');
    sdk = await PolymarketSDK.create({ privateKey });
    console.log('✅ SDK 初始化成功\n');

    // 创建 ethers provider 和 wallet（用于直接调用 CTF 合约）
    provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    wallet = new ethers.Wallet('0x' + privateKey, provider);

    // 获取钱包地址
    const walletAddress = wallet.address;
    console.log(`钱包地址: ${walletAddress}`);
    console.log(`模式: ${dryRun ? '🔍 模拟模式' : '💰 实盘模式'}`);
    console.log('');

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

    // 按 conditionId 分组持仓（同一市场的不同方向）
    const positionsByCondition: Record<string, any[]> = {};
    for (const pos of positions) {
      const conditionId = pos.conditionId || pos.market;
      if (conditionId) {
        if (!positionsByCondition[conditionId]) {
          positionsByCondition[conditionId] = [];
        }
        positionsByCondition[conditionId].push(pos);
      }
    }

    // 检查每个市场的 payout 并筛选可赎回的持仓
    console.log('🔍 正在检查市场结算状态和 payout...\n');
    const redeemablePositions: Array<{
      position: any;
      conditionId: string;
      indexSet: number;
      payout: number;
      balance: bigint;
    }> = [];

    for (const [conditionId, posList] of Object.entries(positionsByCondition)) {
      console.log(`市场: ${conditionId.slice(0, 20)}...`);
      
      // 检查所有可能的方向（通常二元市场是 1 和 2）
      const possibleIndexSets = [1, 2];
      
      for (const indexSet of possibleIndexSets) {
        // 检查 payout
        const payoutInfo = await checkPayout(provider, conditionId, indexSet);
        
        if (payoutInfo.canRedeem && payoutInfo.payout > 0) {
          // 检查余额
          const balance = await getTokenBalance(provider, walletAddress, conditionId, indexSet);
          
          if (balance > 0n) {
            // 找到对应的持仓
            const matchingPos = posList.find((p: any) => {
              const posIndexSet = p.outcomeIndex !== undefined 
                ? (p.outcomeIndex === 0 ? 1 : p.outcomeIndex === 1 ? 2 : p.outcomeIndex)
                : null;
              return posIndexSet === indexSet;
            });

            if (matchingPos) {
              redeemablePositions.push({
                position: matchingPos,
                conditionId,
                indexSet,
                payout: payoutInfo.payout,
                balance,
              });
              
              const size = parseFloat(matchingPos.size || matchingPos.amount || matchingPos.balance || '0');
              console.log(`   ✅ 方向 ${indexSet}: payout=${payoutInfo.payout.toFixed(4)}, 余额=${ethers.formatUnits(balance, 6)} (${size.toFixed(4)} shares)`);
            }
          }
        }
      }
      console.log('');
    }

    if (redeemablePositions.length === 0) {
      console.log('✅ 没有可赎回的持仓（所有持仓的 payout = 0 或市场未结算）\n');
      console.log('💡 提示：只有获胜方向（payout > 0）的持仓才能赎回\n');
      return;
    }

    console.log(`找到 ${redeemablePositions.length} 个可赎回的持仓：\n`);

    // 显示可赎回的持仓
    redeemablePositions.forEach((item, index) => {
      const pos = item.position;
      const size = parseFloat(pos.size || pos.amount || pos.balance || '0');
      console.log(`持仓 #${index + 1}:`);
      console.log(`   条件ID: ${item.conditionId}`);
      console.log(`   方向索引: ${item.indexSet}`);
      console.log(`   数量: ${size.toFixed(4)} shares`);
      console.log(`   链上余额: ${ethers.formatUnits(item.balance, 6)}`);
      console.log(`   Payout: ${item.payout.toFixed(4)}`);
      console.log(`   方向: ${pos.outcome || pos.side || 'N/A'}`);
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

    // 按 conditionId 分组，批量赎回（同一市场的所有方向可以一起赎回）
    const positionsByConditionForRedeem: Record<string, number[]> = {};
    for (const item of redeemablePositions) {
      if (!positionsByConditionForRedeem[item.conditionId]) {
        positionsByConditionForRedeem[item.conditionId] = [];
      }
      if (!positionsByConditionForRedeem[item.conditionId].includes(item.indexSet)) {
        positionsByConditionForRedeem[item.conditionId].push(item.indexSet);
      }
    }

    // 批量回收
    console.log('🔄 开始批量回收（使用官方 CTF redeemPositions 方法）...\n');

    const results: Array<{
      success: boolean;
      conditionId: string;
      indexSets: number[];
      error?: string;
      txHash?: string;
      amount?: number;
    }> = [];

    for (const [conditionId, indexSets] of Object.entries(positionsByConditionForRedeem)) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`回收市场: ${conditionId.slice(0, 20)}...`);
      console.log(`   条件ID: ${conditionId}`);
      console.log(`   方向索引: [${indexSets.join(', ')}]`);

      try {
        // 使用官方方法赎回
        console.log(`   🔄 调用 CTF redeemPositions...`);
        const tx = await redeemPositionsOfficial(wallet, conditionId, indexSets);
        
        console.log(`   ⏳ 等待交易确认...`);
        console.log(`   交易哈希: ${tx.hash}`);
        console.log(`   查看交易: https://polygonscan.com/tx/${tx.hash}`);

        // 等待交易确认
        const receipt = await tx.wait();
        const txHash = receipt?.hash || tx.hash;

        // 计算总金额
        const totalAmount = redeemablePositions
          .filter(item => item.conditionId === conditionId)
          .reduce((sum, item) => {
            const size = parseFloat(item.position.size || item.position.amount || item.position.balance || '0');
            return sum + size;
          }, 0);

        results.push({
          success: true,
          conditionId,
          indexSets,
          txHash,
          amount: totalAmount,
        });

        console.log(`   ✅ 回收成功`);
        console.log(`   交易哈希: ${txHash}`);
        console.log(`   回收金额: $${totalAmount.toFixed(2)} USDC.e`);

      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        results.push({
          success: false,
          conditionId,
          indexSets,
          error: errorMsg,
        });

        console.log(`   ❌ 回收失败`);
        console.log(`   错误: ${errorMsg}`);

        // 检查是否是预期的错误
        if (errorMsg.includes('revert') || 
            errorMsg.includes('INVALID') || 
            errorMsg.includes('CALL_EXCEPTION') ||
            errorMsg.includes('cannot redeem') ||
            errorMsg.includes('not redeemable')) {
          console.log(`   💡 提示: 这可能表示持仓的 payout = 0（失败方向）或市场未结算`);
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

    console.log(`总市场数: ${Object.keys(positionsByConditionForRedeem).length}`);
    console.log(`成功回收: ${successCount}`);
    console.log(`失败: ${failCount}`);
    if (totalRedeemed > 0) {
      console.log(`总回收金额: $${totalRedeemed.toFixed(2)} USDC.e`);
    }

    if (failCount > 0) {
      console.log('\n失败的市场：');
      results.filter(r => !r.success).forEach((r, i) => {
        console.log(`   ${i + 1}. 条件ID: ${r.conditionId}`);
        console.log(`      方向索引: [${r.indexSets.join(', ')}]`);
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