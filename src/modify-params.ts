import * as fs from 'fs';
import * as path from 'path';
import readline from 'readline';

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 询问问题并返回答案
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// 打印横幅
function printBanner() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   参数配置工具');
  console.log('═══════════════════════════════════════════════════\n');
}

// 读取 .env 文件
function readEnvFile(): Map<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  const envMap = new Map<string, string>();
  
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  .env 文件不存在，将创建新文件\n');
    return envMap;
  }
  
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        const value = trimmed.substring(equalIndex + 1).trim();
        envMap.set(key, value);
      }
    }
  }
  
  return envMap;
}

// 写入 .env 文件
function writeEnvFile(envMap: Map<string, string>, comments: Map<string, string>) {
  const envPath = path.join(process.cwd(), '.env');
  const lines: string[] = [];
  
  // 读取原始文件以保留注释和格式
  if (fs.existsSync(envPath)) {
    const originalContent = fs.readFileSync(envPath, 'utf-8');
    const originalLines = originalContent.split('\n');
    
    for (const line of originalLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        lines.push(line);
      } else if (trimmed && trimmed.includes('=')) {
        const key = trimmed.substring(0, trimmed.indexOf('=')).trim();
        if (envMap.has(key)) {
          const comment = comments.get(key);
          if (comment) {
            lines.push(comment);
          }
          lines.push(`${key}=${envMap.get(key)}`);
          envMap.delete(key);
        } else {
          lines.push(line);
        }
      } else if (trimmed === '') {
        lines.push('');
      }
    }
  }
  
  // 添加新的配置项
  for (const [key, value] of envMap.entries()) {
    const comment = comments.get(key);
    if (comment) {
      lines.push(comment);
    }
    lines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
}

// 显示当前配置
function showCurrentConfig(envMap: Map<string, string>) {
  console.log('📋 当前配置：\n');
  
  const params = [
    { key: 'COIN', label: '币种', default: 'ETH' },
    { key: 'SLIDING_WINDOW_MS', label: 'Leg1 滑动窗口（毫秒）', default: '3000' },
    { key: 'DIP_THRESHOLD', label: 'Leg1 暴跌阈值', default: '0.3' },
    { key: 'SUM_TARGET', label: 'Leg2 成本目标', default: '0.95' },
    { key: 'LEG2_TIMEOUT_SECONDS', label: 'Leg2 止损时间（秒）', default: '100' },
  ];
  
  for (const param of params) {
    const value = envMap.get(param.key) || param.default;
    console.log(`   ${param.label}: ${value}`);
  }
  console.log('');
}

// 主函数
async function main() {
  printBanner();
  
  const envMap = readEnvFile();
  
  // 显示当前配置
  showCurrentConfig(envMap);
  
  console.log('请选择要修改的参数：\n');
  console.log('1. 币种 (COIN)');
  console.log('2. Leg1 滑动窗口 (SLIDING_WINDOW_MS)');
  console.log('3. Leg1 暴跌阈值 (DIP_THRESHOLD)');
  console.log('4. Leg2 成本目标 (SUM_TARGET)');
  console.log('5. Leg2 止损时间 (LEG2_TIMEOUT_SECONDS)');
  console.log('6. 使用推荐配置（保守）');
  console.log('7. 使用推荐配置（中等）');
  console.log('8. 查看所有参数说明');
  console.log('0. 退出\n');
  
  const choice = await question('请选择 (0-8): ');
  
  const comments = new Map<string, string>([
    ['COIN', '# ===== 15分钟市场暴跌套利策略配置 =====\n# 币种（ETH, BTC 等）'],
    ['SLIDING_WINDOW_MS', '# Leg1 滑动窗口（毫秒，默认 3000，即3秒）'],
    ['DIP_THRESHOLD', '# Leg1 暴跌阈值（0.3 表示 30%，默认 0.3）'],
    ['SUM_TARGET', '# Leg2 成本目标（默认 0.95，即用 0.95 USDC 获得 1 USDC）'],
    ['LEG2_TIMEOUT_SECONDS', '# Leg2 止损时间（秒，默认 100，100秒后如果leg2未执行自动卖出leg1）'],
  ]);
  
  switch (choice) {
    case '1': {
      console.log('\n当前币种:', envMap.get('COIN') || 'ETH (默认)');
      console.log('可选值: ETH, BTC 等');
      const value = await question('请输入新值 (直接回车使用默认值 ETH): ');
      envMap.set('COIN', value.trim() || 'ETH');
      break;
    }
    
    case '2': {
      console.log('\n当前滑动窗口:', envMap.get('SLIDING_WINDOW_MS') || '3000 (默认，3秒)');
      console.log('推荐值: 2000-5000 (毫秒)');
      console.log('  2000 = 2秒（更敏感）');
      console.log('  3000 = 3秒（推荐）');
      console.log('  5000 = 5秒（更宽松）');
      const value = await question('请输入新值 (直接回车使用默认值 3000): ');
      envMap.set('SLIDING_WINDOW_MS', value.trim() || '3000');
      break;
    }
    
    case '3': {
      console.log('\n当前暴跌阈值:', envMap.get('DIP_THRESHOLD') || '0.3 (默认，30%)');
      console.log('推荐值: 0.2-0.35');
      console.log('  0.25 = 25%暴跌（保守）');
      console.log('  0.3 = 30%暴跌（推荐）');
      console.log('  0.35 = 35%暴跌（更保守）');
      const value = await question('请输入新值 (直接回车使用默认值 0.3): ');
      envMap.set('DIP_THRESHOLD', value.trim() || '0.3');
      break;
    }
    
    case '4': {
      console.log('\n当前成本目标:', envMap.get('SUM_TARGET') || '0.95 (默认，5%利润)');
      console.log('推荐值: 0.90-0.97');
      console.log('  0.93 = 7%利润（保守）');
      console.log('  0.95 = 5%利润（推荐）');
      console.log('  0.97 = 3%利润（激进）');
      const value = await question('请输入新值 (直接回车使用默认值 0.95): ');
      envMap.set('SUM_TARGET', value.trim() || '0.95');
      break;
    }
    
    case '5': {
      console.log('\n当前止损时间:', envMap.get('LEG2_TIMEOUT_SECONDS') || '100 (默认，100秒)');
      console.log('推荐值: 60-120 (秒)');
      console.log('  60 = 60秒（激进）');
      console.log('  100 = 100秒（推荐）');
      console.log('  120 = 120秒（保守）');
      const value = await question('请输入新值 (直接回车使用默认值 100): ');
      envMap.set('LEG2_TIMEOUT_SECONDS', value.trim() || '100');
      break;
    }
    
    case '6': {
      console.log('\n✅ 应用保守配置...');
      envMap.set('COIN', 'ETH');
      envMap.set('SLIDING_WINDOW_MS', '3000');
      envMap.set('DIP_THRESHOLD', '0.25');
      envMap.set('SUM_TARGET', '0.93');
      envMap.set('LEG2_TIMEOUT_SECONDS', '120');
      console.log('   币种: ETH');
      console.log('   滑动窗口: 3000ms (3秒)');
      console.log('   暴跌阈值: 0.25 (25%)');
      console.log('   成本目标: 0.93 (7%利润)');
      console.log('   止损时间: 120秒');
      break;
    }
    
    case '7': {
      console.log('\n✅ 应用中等配置...');
      envMap.set('COIN', 'ETH');
      envMap.set('SLIDING_WINDOW_MS', '3000');
      envMap.set('DIP_THRESHOLD', '0.3');
      envMap.set('SUM_TARGET', '0.95');
      envMap.set('LEG2_TIMEOUT_SECONDS', '100');
      console.log('   币种: ETH');
      console.log('   滑动窗口: 3000ms (3秒)');
      console.log('   暴跌阈值: 0.3 (30%)');
      console.log('   成本目标: 0.95 (5%利润)');
      console.log('   止损时间: 100秒');
      break;
    }
    
    case '8': {
      console.log('\n📚 参数说明：\n');
      console.log('1. COIN (币种)');
      console.log('   选择要监控的市场，如 ETH, BTC');
      console.log('');
      console.log('2. SLIDING_WINDOW_MS (滑动窗口)');
      console.log('   检测暴跌的时间窗口（毫秒）');
      console.log('   例如：3000 = 3秒内检测暴跌');
      console.log('');
      console.log('3. DIP_THRESHOLD (暴跌阈值)');
      console.log('   触发买入的暴跌幅度');
      console.log('   例如：0.3 = 30%暴跌时买入');
      console.log('');
      console.log('4. SUM_TARGET (成本目标)');
      console.log('   Leg2 的利润目标');
      console.log('   例如：0.95 = 用0.95 USDC获得1 USDC（5%利润）');
      console.log('');
      console.log('5. LEG2_TIMEOUT_SECONDS (止损时间)');
      console.log('   Leg2 超时时间（秒）');
      console.log('   例如：100 = 100秒后自动卖出Leg1');
      console.log('');
      console.log('💡 详细说明请查看: DIP_ARB_PARAMS_GUIDE.md\n');
      const _ = await question('按回车键继续...');
      rl.close();
      return main();
    }
    
    case '0': {
      console.log('\n👋 退出\n');
      rl.close();
      process.exit(0);
    }
    
    default: {
      console.log('\n❌ 无效选择\n');
      rl.close();
      return main();
    }
  }
  
  // 保存配置
  writeEnvFile(envMap, comments);
  console.log('\n✅ 配置已保存到 .env 文件\n');
  
  // 显示更新后的配置
  showCurrentConfig(envMap);
  
  // 询问是否继续修改
  const continueChoice = await question('是否继续修改其他参数？(y/n): ');
  if (continueChoice.toLowerCase() === 'y' || continueChoice.toLowerCase() === 'yes') {
    rl.close();
    return main();
  } else {
    console.log('\n✅ 完成！\n');
    rl.close();
  }
}

// 运行主函数
main().catch((error) => {
  console.error('\n❌ 发生错误:', error);
  rl.close();
  process.exit(1);
});
