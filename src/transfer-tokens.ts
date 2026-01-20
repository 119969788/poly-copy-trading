import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// ERC20 ABI（只需要 transfer 和 balanceOf）
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

// Polygon 网络配置
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || '';

// USDC.e 地址（Polygon 网络）
const USDCe_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
// MATIC (POL) 地址（原生代币，地址为 0）
const MATIC_ADDRESS = '0x0000000000000000000000000000000000000000';

// 要排除的代币地址（小写）
const EXCLUDED_TOKENS = new Set([
  USDCe_ADDRESS.toLowerCase(),
  MATIC_ADDRESS.toLowerCase(),
]);

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

// 获取目标地址
const TARGET_ADDRESS = process.env.TRANSFER_TARGET_ADDRESS;
if (!TARGET_ADDRESS) {
  console.error('❌ 错误：请在 .env 文件中设置 TRANSFER_TARGET_ADDRESS');
  process.exit(1);
}

// 验证目标地址格式
if (!ethers.isAddress(TARGET_ADDRESS)) {
  console.error('❌ 错误：TRANSFER_TARGET_ADDRESS 不是有效的以太坊地址');
  process.exit(1);
}

// 解析 dryRun 设置
const dryRun = process.env.DRY_RUN !== 'false';

// 解析代币地址列表（可选，如果提供则只转移列表中的代币）
const TOKEN_ADDRESSES = process.env.TOKEN_ADDRESSES 
  ? process.env.TOKEN_ADDRESSES.split(',').map(addr => addr.trim()).filter(Boolean)
  : null;

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   转移代币工具（排除 POL 和 USDC.e）');
  console.log('═══════════════════════════════════════════════════\n');
}

// 获取代币信息
async function getTokenInfo(provider: ethers.Provider, tokenAddress: string): Promise<{
  symbol: string;
  name: string;
  decimals: number;
} | null> {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const [symbol, name, decimals] = await Promise.all([
      tokenContract.symbol().catch(() => 'UNKNOWN'),
      tokenContract.name().catch(() => 'Unknown Token'),
      tokenContract.decimals().catch(() => 18),
    ]);
    return { symbol, name, decimals };
  } catch (error) {
    return null;
  }
}

// 获取代币余额
async function getTokenBalance(
  provider: ethers.Provider,
  tokenAddress: string,
  walletAddress: string
): Promise<bigint> {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    return await tokenContract.balanceOf(walletAddress);
  } catch (error) {
    return 0n;
  }
}

// 使用 PolygonScan API 获取代币列表（如果有 API Key）
async function getTokensFromPolygonScan(walletAddress: string): Promise<string[]> {
  if (!POLYGONSCAN_API_KEY) {
    return [];
  }

  try {
    const url = `https://api.polygonscan.com/api?module=account&action=tokentx&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${POLYGONSCAN_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '1' && data.result) {
      const tokenAddresses = new Set<string>();
      for (const tx of data.result) {
        if (tx.contractAddress) {
          tokenAddresses.add(tx.contractAddress.toLowerCase());
        }
      }
      return Array.from(tokenAddresses);
    }
  } catch (error) {
    console.warn('⚠️  无法从 PolygonScan 获取代币列表:', error);
  }

  return [];
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

    // 创建 OnchainService 获取钱包地址
    const onchainService = new OnchainService({
      privateKey: privateKey as string,
    });

    // 获取钱包地址
    const walletAddress = sdk.tradingService.getAddress();
    console.log(`钱包地址: ${walletAddress}`);
    console.log(`目标地址: ${TARGET_ADDRESS}`);
    console.log(`模式: ${dryRun ? '🔍 模拟模式' : '💰 实盘模式'}\n`);

    // 验证目标地址
    if (walletAddress.toLowerCase() === TARGET_ADDRESS.toLowerCase()) {
      console.error('❌ 错误：目标地址不能是当前钱包地址');
      process.exit(1);
    }

    // 创建 ethers provider 和 wallet
    provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    wallet = new ethers.Wallet('0x' + privateKey, provider);

    // 获取要检查的代币地址列表
    let tokenAddresses: string[] = [];

    if (TOKEN_ADDRESSES && TOKEN_ADDRESSES.length > 0) {
      // 使用用户提供的代币地址列表
      console.log(`📋 使用环境变量中的代币地址列表（${TOKEN_ADDRESSES.length} 个）\n`);
      tokenAddresses = TOKEN_ADDRESSES;
    } else {
      // 尝试从 PolygonScan 获取代币列表
      console.log('🔍 正在获取代币列表...');
      if (POLYGONSCAN_API_KEY) {
        console.log('   使用 PolygonScan API 获取代币列表...');
        const polygonScanTokens = await getTokensFromPolygonScan(walletAddress);
        if (polygonScanTokens.length > 0) {
          tokenAddresses = polygonScanTokens;
          console.log(`   ✅ 从 PolygonScan 获取到 ${tokenAddresses.length} 个代币地址\n`);
        } else {
          console.log('   ⚠️  无法从 PolygonScan 获取代币列表\n');
        }
      } else {
        console.log('   ⚠️  未设置 POLYGONSCAN_API_KEY，无法自动获取代币列表');
        console.log('   💡 提示：可以设置以下环境变量：');
        console.log('      1. POLYGONSCAN_API_KEY - 从 PolygonScan API 获取代币列表');
        console.log('      2. TOKEN_ADDRESSES - 手动指定要转移的代币地址（用逗号分隔）\n');
      }
    }

    if (tokenAddresses.length === 0) {
      console.error('❌ 错误：没有找到要检查的代币地址');
      console.error('   请设置以下环境变量之一：');
      console.error('   1. POLYGONSCAN_API_KEY - 从 PolygonScan API 获取代币列表');
      console.error('   2. TOKEN_ADDRESSES - 手动指定要转移的代币地址（用逗号分隔）');
      console.error('\n   示例：');
      console.error('   TOKEN_ADDRESSES=0x1234...,0x5678...');
      process.exit(1);
    }

    // 检查每个代币的余额
    console.log('📊 正在检查代币余额...\n');
    const tokensWithBalance: Array<{
      address: string;
      balance: bigint;
      info: { symbol: string; name: string; decimals: number } | null;
    }> = [];

    for (const tokenAddress of tokenAddresses) {
      // 跳过排除的代币
      if (EXCLUDED_TOKENS.has(tokenAddress.toLowerCase())) {
        continue;
      }

      try {
        const balance = await getTokenBalance(provider, tokenAddress, walletAddress);
        
        // 只保留有余额的代币
        if (balance > 0n) {
          const info = await getTokenInfo(provider, tokenAddress);
          tokensWithBalance.push({
            address: tokenAddress,
            balance,
            info,
          });

          const decimals = info?.decimals || 18;
          const formattedBalance = ethers.formatUnits(balance, decimals);
          const symbol = info?.symbol || 'UNKNOWN';
          
          console.log(`   ✅ ${symbol} (${tokenAddress.slice(0, 10)}...): ${formattedBalance}`);
        }
      } catch (error: any) {
        // 忽略获取失败的代币
        console.warn(`   ⚠️  无法获取 ${tokenAddress} 的余额: ${error?.message || error}`);
      }
    }

    if (tokensWithBalance.length === 0) {
      console.log('\n✅ 没有找到需要转移的代币（除 POL 和 USDC.e 外）\n');
      return;
    }

    console.log(`\n找到 ${tokensWithBalance.length} 个需要转移的代币：\n`);

    // 显示代币信息
    tokensWithBalance.forEach((token, index) => {
      const decimals = token.info?.decimals || 18;
      const formattedBalance = ethers.formatUnits(token.balance, decimals);
      const symbol = token.info?.symbol || 'UNKNOWN';
      const name = token.info?.name || 'Unknown Token';

      console.log(`代币 #${index + 1}:`);
      console.log(`   名称: ${name}`);
      console.log(`   符号: ${symbol}`);
      console.log(`   地址: ${token.address}`);
      console.log(`   余额: ${formattedBalance} ${symbol}`);
      console.log('');
    });

    if (dryRun) {
      console.log('🔍 模拟模式：不会执行真实转移\n');
      console.log('如需真实转移，请在 .env 中设置 DRY_RUN=false\n');
      return;
    }

    // 确认操作
    console.log('⚠️  警告：即将转移所有代币（除 POL 和 USDC.e 外）！');
    console.log(`   模式: 💰 实盘模式`);
    console.log(`   代币数量: ${tokensWithBalance.length}`);
    console.log(`   目标地址: ${TARGET_ADDRESS}`);
    console.log('');

    // 批量转移
    console.log('🔄 开始批量转移...\n');

    const results: Array<{
      success: boolean;
      token: typeof tokensWithBalance[0];
      error?: string;
      txHash?: string;
    }> = [];

    for (let i = 0; i < tokensWithBalance.length; i++) {
      const token = tokensWithBalance[i];
      const decimals = token.info?.decimals || 18;
      const formattedBalance = ethers.formatUnits(token.balance, decimals);
      const symbol = token.info?.symbol || 'UNKNOWN';
      const name = token.info?.name || 'Unknown Token';

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`转移代币 #${i + 1}/${tokensWithBalance.length}`);
      console.log(`   名称: ${name}`);
      console.log(`   符号: ${symbol}`);
      console.log(`   地址: ${token.address}`);
      console.log(`   余额: ${formattedBalance} ${symbol}`);

      try {
        const tokenContract = new ethers.Contract(token.address, ERC20_ABI, wallet);
        
        // 发送转移交易
        const tx = await tokenContract.transfer(TARGET_ADDRESS, token.balance);
        console.log(`   ⏳ 等待交易确认...`);
        console.log(`   交易哈希: ${tx.hash}`);
        console.log(`   查看交易: https://polygonscan.com/tx/${tx.hash}`);

        // 等待交易确认
        const receipt = await tx.wait();
        const txHash = receipt.hash;

        results.push({
          success: true,
          token,
          txHash,
        });

        console.log(`   ✅ 转移成功`);
        console.log(`   交易哈希: ${txHash}`);

      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        results.push({
          success: false,
          token,
          error: errorMsg,
        });

        console.log(`   ❌ 转移失败`);
        console.log(`   错误: ${errorMsg}`);

        // 检查是否是常见的错误
        if (errorMsg.includes('insufficient funds')) {
          console.log(`   💡 提示: Gas 费不足，请检查 MATIC 余额`);
        } else if (errorMsg.includes('user rejected') || errorMsg.includes('ACTION_REJECTED')) {
          console.log(`   💡 提示: 交易被拒绝`);
        }
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // 避免请求过快，稍作延迟
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 显示结果统计
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 转移结果统计');
    console.log('═══════════════════════════════════════════════════\n');

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`总代币数: ${tokensWithBalance.length}`);
    console.log(`成功转移: ${successCount}`);
    console.log(`失败: ${failCount}`);

    if (failCount > 0) {
      console.log('\n失败的代币：');
      results.filter(r => !r.success).forEach((r, i) => {
        const symbol = r.token.info?.symbol || 'UNKNOWN';
        console.log(`   ${i + 1}. ${symbol} (${r.token.address.slice(0, 10)}...)`);
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