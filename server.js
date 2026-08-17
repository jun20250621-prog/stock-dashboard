#!/usr/bin/env node
/**
 * 簡單 CORS 代理伺服器
 * 用途：代理 Yahoo Finance API 請求，解決 CORS 問題
 * Port: 5007
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 5007;

//允許的來源
const ALLOWED_ORIGINS = [
    'https://jun20250621-prog.github.io',
    'http://localhost:3000',
    'http://localhost:5173'
];

function fetchUrl(targetUrl) {
    return new Promise((resolve, reject) => {
        const protocol = targetUrl.startsWith('https') ? https : http;
        
        const req = protocol.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/html, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://finance.yahoo.com/'
            },
            timeout: 15000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                data: data
            }));
        });
        
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // 路由: /proxy?url=...
    if (parsedUrl.pathname === '/proxy' && parsedUrl.query.url) {
        const targetUrl = decodeURIComponent(parsedUrl.query.url);
        
        // 安全檢查：只允許特定的 API
        if (!targetUrl.includes('finance.yahoo.com') && !targetUrl.includes('query')) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden: Only Yahoo Finance allowed' }));
            return;
        }
        
        try {
            console.log(`[${new Date().toISOString()}] Proxying: ${targetUrl.substring(0, 80)}...`);
            const result = await fetchUrl(targetUrl);
            
            res.writeHead(result.status, {
                'Content-Type': result.headers['content-type'] || 'application/json',
                'Cache-Control': 'public, max-age=300'
            });
            res.end(result.data);
        } catch (err) {
            console.error('Proxy error:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
    }
    // 路由: /health
    else if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    }
    // 路由: / yahoo-finance 專用
    else if (parsedUrl.pathname === '/yahoo') {
        const symbol = parsedUrl.query.symbol || '^TWII';
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        
        try {
            console.log(`[${new Date().toISOString()}] Yahoo: ${symbol}`);
            const result = await fetchUrl(targetUrl);
            
            res.writeHead(result.status, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=60'
            });
            res.end(result.data);
        } catch (err) {
            console.error('Yahoo error:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
    }
    else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            name: 'CORS Proxy Server',
            port: PORT,
            routes: {
                '/health': '健康檢查',
                '/yahoo?symbol=^TWII': 'Yahoo Finance 代理 (e.g., ^TWII, ^IXIC, ^VIX, 2330.TW)',
                '/proxy?url=URL': '通用代理 (需 URL encode)'
            }
        }));
    }
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║     CORS Proxy Server 啟動成功！              ║
╠═══════════════════════════════════════════════╣
║  Port: ${PORT}                                  ║
║  URL:  http://localhost:${PORT}                   ║
║                                               ║
║  路由:                                        ║
║   /health              - 健康檢查             ║
║   /yahoo?symbol=^TWII  - Yahoo Finance 代理   ║
║   /proxy?url=URL       - 通用代理             ║
╚═══════════════════════════════════════════════╝
    `);
});

// 優雅關閉
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM，關閉中...');
    server.close(() => process.exit(0));
});
