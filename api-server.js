#!/usr/bin/env node
/**
 * CORS Proxy + 爬蟲 API 伺服器
 * Port: 5007
 * 
 * 提供:
 * - /api/stocks - 即時行情
 * - /yahoo?symbol=^TWII - Yahoo Finance 代理
 * - /health - 健康檢查
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

const PORT = 5007;
const DATA_FILE = __dirname + '/stock-data.json';

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
                        resolve({ price, change, pct });
                    } else {
                        resolve(null);
                    }
                } catch(e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== 取得所有行情 =====
async function getAllStocks() {
    const results = {
        time: new Date().toISOString(),
        indices: {},
        stocks: {}
    };
    
    // 指數
    const indices = [
        ['twii', '^TWII'],
        ['nasdaq', '^IXIC'],
        ['sp500', '^GSPC'],
        ['vix', '^VIX'],
        ['dji', '^DJI']
    ];
    
    for (const [key, sym] of indices) {
        const data = await fetchYahoo(sym);
        if (data) results.indices[key] = data;
        await delay(600);
    }
    
    // 個股
    const stocks = [
        ['2330', '2330.TW', '台積電'],
        ['2454', '2454.TW', '聯發科'],
        ['2317', '2317.TW', '鴻海']
    ];
    
    for (const [id, sym, name] of stocks) {
        const data = await fetchYahoo(sym);
        if (data) results.stocks[id] = { name, ...data };
        await delay(1000);
    }
    
    return results;
}

// ===== HTTP 伺服器 =====
const server = http.createServer(async (req, res) => {
    // CORS
    const origin = req.headers.origin;
    if (origin && (origin.includes('github.io') || origin.includes('localhost'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // /health - 健康檢查
    if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
        return;
    }
    
    // /api/stocks - 即時行情
    if (parsedUrl.pathname === '/api/stocks') {
        try {
            const data = await getAllStocks();
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60'
            });
            res.end(JSON.stringify(data));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }
    
    // /api/stocks/cached - 快取資料
    if (parsedUrl.pathname === '/api/stocks/cached') {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No cached data' }));
            }
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }
    
    // /yahoo?symbol=^TWII - Yahoo 代理
    if (parsedUrl.pathname === '/yahoo') {
        const symbol = parsedUrl.query.symbol || '^TWII';
        const data = await fetchYahoo(symbol);
        if (data) {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(data));
        } else {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch' }));
        }
        return;
    }
    
    // 預設：說明
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        name: 'Stock API Server',
        port: PORT,
        routes: {
            '/health': '健康檢查',
            '/api/stocks': '取得即時行情 (即時抓取)',
            '/api/stocks/cached': '取得快取行情',
            '/yahoo?symbol=^TWII': 'Yahoo Finance 代理'
        }
    }));
});

server.listen(PORT, () => {
    console.log(`\n✅ Stock API Server 啟動！`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://localhost:${PORT}/health`);
    console.log(`   http://localhost:${PORT}/api/stocks`);
    console.log(`   http://localhost:${PORT}/api/stocks/cached\n`);
});

process.on('SIGTERM', () => {
    console.log('關閉中...');
    server.close(() => process.exit(0));
});
