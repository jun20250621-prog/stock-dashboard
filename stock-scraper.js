#!/usr/bin/env node
/**
 * 台股即時行情爬蟲
 * 直接從 Yahoo Finance 抓取，無 CORS 限制
 */

const https = require('https');
const fs = require('fs');

// ===== Yahoo Finance =====
function fetchYahoo(symbol) {
    return new Promise((resolve) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json, */*',
                'Referer': 'https://finance.yahoo.com/'
            },
            timeout: 15000
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const j = JSON.parse(data);
                    const r = j.chart?.result?.[0];
                    if (r) {
                        const m = r.meta;
                        const price = m.regularMarketPrice;
                        const prev = m.chartPreviousClose || m.previousClose;
                        const change = price - prev;
                        const pct = (change / prev) * 100;
                        resolve({ symbol, price, change, pct, prev });
                    } else {
                        resolve({ symbol, error: 'No data', raw: data.substring(0, 100) });
                    }
                } catch(e) {
                    resolve({ symbol, error: e.message });
                }
            });
        }).on('error', (e) => resolve({ symbol, error: e.message }));
    });
}

// ===== 延遲 =====
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== 主程式 =====
async function main() {
    console.log('📡 開始取得行情資料...\n');
    const start = Date.now();
    
    const results = {
        time: new Date().toISOString(),
        indices: {},
        stocks: {}
    };
    
    // 指數
    console.log('📊 取得指數...');
    const symbols = [
        ['twii', '^TWII'],
        ['nasdaq', '^IXIC'],
        ['sp500', '^GSPC'],
        ['vix', '^VIX'],
        ['dji', '^DJI']
    ];
    
    for (const [key, sym] of symbols) {
        await delay(800);
        const data = await fetchYahoo(sym);
        if (!data.error) {
            results.indices[key] = data;
            console.log(`  ${sym}: ${data.price?.toLocaleString()} (${data.change >= 0 ? '+' : ''}${data.pct?.toFixed(2)}%)`);
        } else {
            console.log(`  ${sym}: 失敗 - ${data.error}`);
        }
    }
    
    // 個股
    console.log('\n🏆 取得個股...');
    const stocks = [
        ['2330', '2330.TW', '台積電'],
        ['2454', '2454.TW', '聯發科'],
        ['2317', '2317.TW', '鴻海'],
        ['2498', '2498.TW', '宏達電'],
        ['3034', '3034.TW', '聯詠']
    ];
    
    for (const [id, sym, name] of stocks) {
        await delay(1200);
        const data = await fetchYahoo(sym);
        if (!data.error) {
            results.stocks[id] = { name, ...data };
            console.log(`  ${name}(${id}): ${data.price?.toLocaleString()} (${data.change >= 0 ? '+' : ''}${data.pct?.toFixed(2)}%)`);
        } else {
            console.log(`  ${name}(${id}): 失敗`);
        }
    }
    
    results.elapsed = Date.now() - start;
    
    console.log(`\n✅ 完成！耗時 ${results.elapsed}ms`);
    
    // 儲存
    const json = JSON.stringify(results, null, 2);
    fs.writeFileSync(__dirname + '/stock-data.json', json);
    console.log('💾 已儲存到 stock-data.json\n');
    
    return results;
}

main().catch(console.error);
