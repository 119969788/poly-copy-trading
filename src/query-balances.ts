import { PolymarketSDK, OnchainService } from '@catalyst-team/poly-sdk';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// ERC20 ABI（只需要 balanceOf）
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

// Polygon 网络配置
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || '';

// USDC.e 地址（Polygon 网络）
const USDCe_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
// MATIC (POL) 地址（原生代币）
const MATIC_ADDRESS = '0x0000000000000000000000000000000000000000';

// 常见代币地址（用于快速查询）
const COMMON_TOKENS: Record<string, { symbol: string; name: string; address: string }> = {
  'POL': { symbol: 'POL', name: 'Polygon', address: MATIC_ADDRESS },
  'MATIC': { symbol: 'MATIC', name: 'Polygon', address: MATIC_ADDRESS },
  'USDC.e': { symbol: 'USDC.e', name: 'USD Coin (Bridged)', address: USDCe_ADDRESS },
  'USDC': { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' }, // Native USDC on Polygon
  'WETH': { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619' },
  'WBTC': { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6' },
  'DAI': { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' },
  'AAVE': { symbol: 'AAVE', name: 'Aave Token', address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B' },
  'LINK': { symbol: 'LINK', name: 'Chainlink Token', address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39' },
};

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

// 解析代币地址列表（可选）
const TOKEN_ADDRESSES = process.env.TOKEN_ADDRESSES 
  ? process.env.TOKEN_ADDRESSES.split(',').map(addr => addr.trim()).filter(Boolean)
  : null;

// 解析是否只显示有余额的代币
const SHOW_ONLY_WITH_BALANCE = process.env.SHOW_ONLY_BALANCE === 'true';

// 解析是否包含常见代币
const INCLUDE_COMMON_TOKENS = process.env.INCLUDE_COMMON_TOKENS !== 'false';

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   代币余额查询工具');
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

// 获取 ERC20 代币余额
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

// 获取 MATIC (POL) 原生代币余额
async function getNativeBalance(
  provider: ethers.Provider,
  walletAddress: string
): Promise<bigint> {
  try {
    return await provider.getBalance(walletAddress);
  } catch (error) {
    return 0n;
  }
}

// 使用 PolygonScan API 获取代币列表
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

    // 创建 ethers provider
    provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);

    // 首先查询原生代币 POL (MATIC) 余额
    console.log('📊 正在查询代币余额...\n');
    
    const tokenBalances: Array<{
      address: string;
      balance: bigint;
      info: { symbol: string; name: string; decimals: number } | null;
    }> = [];

    // 1. 查询 POL (MATIC) 余额
    if (INCLUDE_COMMON_TOKENS) {
      try {
        const balance = await getNativeBalance(provider, walletAddress);
        tokenBalances.push({
          address: MATIC_ADDRESS,
          balance,
          info: { symbol: 'POL', name: 'Polygon', decimals: 18 },
        });
      } catch (error: any) {
        console.warn(`   ⚠️  无法获取 POL 余额: ${error?.message || error}`);
      }
    }

    // 2. 获取要查询的代币地址列表
    let tokenAddresses: string[] = [];

    // 2.1 添加常见代币（排除 POL，因为已单独处理）
    if (INCLUDE_COMMON_TOKENS) {
      for (const [key, token] of Object.entries(COMMON_TOKENS)) {
        if (token.address.toLowerCase() !== MATIC_ADDRESS.toLowerCase()) {
          tokenAddresses.push(token.address);
        }
      }
    }

    // 2.2 添加用户指定的代币地址
    if (TOKEN_ADDRESSES && TOKEN_ADDRESSES.length > 0) {
      console.log(`📋 使用环境变量中的代币地址列表（${TOKEN_ADDRESSES.length} 个）`);
      for (const addr of TOKEN_ADDRESSES) {
        if (!tokenAddresses.includes(addr.toLowerCase())) {
          tokenAddresses.push(addr);
        }
      }
    }

    // 2.3 从 PolygonScan 获取代币列表
    if (!TOKEN_ADDRESSES || TOKEN_ADDRESSES.length === 0) {
      if (POLYGONSCAN_API_KEY) {
        console.log('🔍 正在从 PolygonScan 获取代币列表...');
        const polygonScanTokens = await getTokensFromPolygonScan(walletAddress);
        if (polygonScanTokens.length > 0) {
          for (const addr of polygonScanTokens) {
            if (!tokenAddresses.includes(addr.toLowerCase())) {
              tokenAddresses.push(addr);
            }
          }
          console.log(`   ✅ 从 PolygonScan 获取到 ${polygonScanTokens.length} 个代币地址`);
        } else {
          console.log('   ⚠️  无法从 PolygonScan 获取代币列表');
        }
      } else {
        console.log('   💡 提示：设置 POLYGONSCAN_API_KEY 可自动获取所有代币列表');
      }
    }

    console.log('');

    // 3. 查询所有代币余额
    for (const tokenAddress of tokenAddresses) {
      try {
        const balance = await getTokenBalance(provider, tokenAddress, walletAddress);
        const info = await getTokenInfo(provider, tokenAddress);
        
        // 如果设置了只显示有余额的代币，且余额为0，则跳过
        if (SHOW_ONLY_WITH_BALANCE && balance === 0n) {
          continue;
        }

        tokenBalances.push({
          address: tokenAddress,
          balance,
          info,
        });
      } catch (error: any) {
        // 对于常见代币，即使查询失败也显示（可能合约不存在）
        if (INCLUDE_COMMON_TOKENS) {
          const isCommonToken = Object.values(COMMON_TOKENS).some(t => 
            t.address.toLowerCase() === tokenAddress.toLowerCase()
          );
          if (isCommonToken) {
            tokenBalances.push({
              address: tokenAddress,
              balance: 0n,
              info: COMMON_TOKENS[Object.keys(COMMON_TOKENS).find(key => 
                COMMON_TOKENS[key].address.toLowerCase() === tokenAddress.toLowerCase()
              ) || ''] || null,
            });
          }
        }
      }
    }

    // 4. 使用 OnchainService 查询 USDC.e 余额（更准确）
    try {
      const balances = await onchainService.getTokenBalances();
      const usdcBalance = balances.usdcE ? ethers.parseUnits(balances.usdcE, 6) : 0n;
      const maticBalance = balances.matic ? ethers.parseEther(balances.matic) : 0n;

      // 更新 USDC.e 余额（如果已存在）
      const usdcIndex = tokenBalances.findIndex(t => 
        t.address.toLowerCase() === USDCe_ADDRESS.toLowerCase()
      );
      if (usdcIndex >= 0) {
        tokenBalances[usdcIndex].balance = usdcBalance;
      } else if (!SHOW_ONLY_WITH_BALANCE || usdcBalance > 0n) {
        tokenBalances.push({
          address: USDCe_ADDRESS,
          balance: usdcBalance,
          info: { symbol: 'USDC.e', name: 'USD Coin (Bridged)', decimals: 6 },
        });
      }

      // 更新 POL 余额（如果已存在）
      const polIndex = tokenBalances.findIndex(t => 
        t.address.toLowerCase() === MATIC_ADDRESS.toLowerCase()
      );
      if (polIndex >= 0) {
        tokenBalances[polIndex].balance = maticBalance;
      }
    } catch (error: any) {
      console.warn(`   ⚠️  无法使用 OnchainService 查询余额: ${error?.message || error}`);
    }

    // 5. 排序：按余额降序排列
    tokenBalances.sort((a, b) => {
      const aValue = parseFloat(ethers.formatUnits(a.balance, a.info?.decimals || 18));
      const bValue = parseFloat(ethers.formatUnits(b.balance, b.info?.decimals || 18));
      return bValue - aValue;
    });

    // 6. 显示结果
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 代币余额查询结果');
    console.log('═══════════════════════════════════════════════════\n');

    if (tokenBalances.length === 0) {
      console.log('❌ 没有找到任何代币余额\n');
      return;
    }

    // 统计信息
    let totalTokensWithBalance = 0;
    let totalValueUSDC = 0;

    // 显示每个代币的余额
    tokenBalances.forEach((token, index) => {
      const decimals = token.info?.decimals || 18;
      const formattedBalance = ethers.formatUnits(token.balance, decimals);
      const symbol = token.info?.symbol || 'UNKNOWN';
      const name = token.info?.name || 'Unknown Token';
      const balanceValue = parseFloat(formattedBalance);

      // 只统计有余额的代币
      if (balanceValue > 0) {
        totalTokensWithBalance++;
      }

      // 计算 USDC 等值（如果是 USDC.e，直接使用；其他代币暂时无法准确计算）
      if (symbol === 'USDC.e' || symbol === 'USDC') {
        totalValueUSDC += balanceValue;
      }

      // 显示代币信息
      const statusIcon = balanceValue > 0 ? '✅' : '⚪';
      console.log(`${statusIcon} ${index + 1}. ${name} (${symbol})`);
      console.log(`   地址: ${token.address}`);
      console.log(`   余额: ${formattedBalance} ${symbol}`);
      if (symbol === 'USDC.e' || symbol === 'USDC') {
        console.log(`   价值: $${balanceValue.toFixed(2)}`);
      }
      console.log('');
    });

    // 显示统计摘要
    console.log('═══════════════════════════════════════════════════');
    console.log('📈 统计摘要');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`总代币数: ${tokenBalances.length}`);
    console.log(`有余额的代币数: ${totalTokensWithBalance}`);
    console.log(`USDC.e 总价值: $${totalValueUSDC.toFixed(2)}`);
    console.log('');

    // 显示环境变量提示
    if (tokenBalances.length === 0 || (!TOKEN_ADDRESSES && !POLYGONSCAN_API_KEY)) {
      console.log('💡 提示：');
      console.log('   1. 设置 POLYGONSCAN_API_KEY 可自动获取所有代币列表');
      console.log('   2. 设置 TOKEN_ADDRESSES 可手动指定要查询的代币地址（用逗号分隔）');
      console.log('   3. 设置 SHOW_ONLY_BALANCE=true 可只显示有余额的代币');
      console.log('   4. 设置 INCLUDE_COMMON_TOKENS=false 可排除常见代币\n');
    }

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