<?php
/**
 * CORS Proxy for Stock Dashboard
 * 解決前端 JavaScript 直接呼叫外部 API 的 CORS 問題
 * 
 * 使用方式:
 *   proxy.php?url=URL編碼的目標網址
 */

// 允許的來源
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 預處理OPTIONS請求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 取得目標 URL
$targetUrl = isset($_GET['url']) ? $_GET['url'] : '';

if (empty($targetUrl)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing url parameter']);
    exit;
}

// 驗證 URL（安全檢查）
$parsedUrl = parse_url($targetUrl);
if (!$parsedUrl || !in_array($parsedUrl['scheme'], ['http', 'https'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid URL scheme']);
    exit;
}

// 允許的目標主機（白名單）
$allowedHosts = [
    'query1.finance.yahoo.com',
    'query2.finance.yahoo.com',
    'tw.api.omega.run',
    'mis.twse.com.tw',
    'www.twse.com.tw',
    'api.finmindtrade.com'
];

if (!in_array($parsedUrl['host'], $allowedHosts)) {
    http_response_code(403);
    echo json_encode(['error' => 'Host not allowed']);
    exit;
}

// 初始化 cURL
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $targetUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 5,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    ]
]);

// 執行請求
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// 處理錯誤
if ($error) {
    http_response_code(502);
    echo json_encode(['error' => 'Proxy error: ' . $error]);
    exit;
}

// 檢查 HTTP 狀態碼
if ($httpCode >= 400) {
    http_response_code($httpCode);
    echo json_encode(['error' => 'Target server error: ' . $httpCode]);
    exit;
}

// 輸出回應
echo $response;
