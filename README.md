# 📈 股票儀表板 (Stock Dashboard)

即時股票行情儀表板，串接真實市場數據。

## ✨ 功能特色

- **真實數據串接**
  - 🇨🇳 台股加權指數 (TWSE API)
  - 🇺🇸 NASDAQ、S&P 500 (Yahoo Finance)
  - 📊 VIX 恐慌指數
  - 🤖 DataTrack 爬蟲資料整合

- **技術亮點**
  - 即時自動更新（每分鐘刷新）
  - Loading 載入動畫
  - 完善的錯誤處理與降級機制
  - 行動優先響應式設計
  - CORS 代理解決跨域問題

## 🚀 快速開始

### 1. 安裝依賴（PHP 代理需要）

```bash
# 如果需要使用 PHP CORS 代理
# 需要 PHP 5.6+ 環境
php -S localhost:8080
```

### 2. 啟動服務

```bash
# 使用 Python（推薦）
python3 -m http.server 8080

# 或使用 PHP
php -S localhost:8080

# 或使用 Node.js
npx serve .
```

### 3. 開啟瀏覽器

```
http://localhost:8080/stock-dashboard-optimized/
```

## 📁 專案結構

```
stock-dashboard-optimized/
├── index.html          # 主頁面（完整重寫）
├── api/
│   ├── proxy.php       # CORS 代理（解決跨域）
│   └── scraper-data.json  # 爬蟲輸出位置
├── scraper/
│   └── example.js      # 爬蟲整合範例
└── README.md
```

## 🔧 DataTrack 爬蟲整合

### 輸出格式

爬蟲输出一個 JSON 檔案到 `api/scraper-data.json`:

```json
{
    "USD/TWD": "32.45",
    "黃金現價": "2,415.80",
    "比特幣": "61,250",
    "更新時間": "2026-08-17 15:30:00"
}
```

### 範例程式

```javascript
const fs = require('fs');

function saveScraperData(data) {
    const outputPath = './api/scraper-data.json';
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}

// 使用
saveScraperData({
    "USD/TWD": "32.45",
    "黃金現價": "2,415.80"
});
```

## 📡 API 說明

### Yahoo Finance（美股/VIX）

直接串接，無需代理:

```javascript
const url = 'https://query1.finance.yahoo.com/v8/finance/chart/^IXIC';
const response = await fetch(url);
const data = await response.json();
```

### TWSE 台灣證交所

使用公開 API:

```javascript
const response = await fetch('https://tw.api.omega.run/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        indexId: "IX0001",
        startDate: "2026-08-17",
        endDate: "2026-08-17"
    })
});
```

### CORS 代理（如需要）

透過 `api/proxy.php`:

```
api/proxy.php?url=https://example.com/api
```

## ⚠️ 注意事項

- 美股資料在台灣時間 22:30 - 05:00 為 closed 狀態
- 資料更新頻率：每分鐘自動刷新
- 若要即時取得完整數據，建議使用付費 API（如 Alpha Vantage）

## 📝 License

MIT
