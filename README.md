# 📈 專業投資儀表板 Pro

即時股票行情儀表板，串接 Yahoo Finance API 取得台股、美股即時報價。

## 🚀 功能特色

- 📊 **台股行情**：加權指數、台灣50、櫃買指數
- 🇺🇸 **美股行情**：道瓊、NASDAQ、S&P 500、費城半導體
- 🏆 **權值股**：台積電、聯發科、鴻海即時報價
- 📉 **VIX 恐慌指數**
- 🤖 **DataTrack 爬蟲整合**：半導體、LED、顯示器、總經指標
- 🔄 **自動更新**：每 5 分鐘刷新數據

## 📁 檔案結構

```
stock-dashboard-optimized/
├── index.html          # 主頁面 (完整即時行情)
├── api/
│   ├── proxy.php       # CORS 代理 (PHP)
│   └── scraper-data.json # DataTrack 爬蟲資料
├── scraper/            # DataTrack 爬蟲原始碼
└── README.md
```

## ⚙️ 技術說明

### 即時行情 API

使用 Yahoo Finance API + CORS 代理取得：

| 市場 | 符號 | 說明 |
|------|------|------|
| 台股加權 | ^TWII | 台灣加權股價指數 |
| 道瓊 | ^DJI | 道瓊工業平均 |
| NASDAQ | ^IXIC | 那斯達克綜合 |
| S&P 500 | ^GSPC | 標普500 |
| 費城半導體 | ^SOX | 半導體類股 |

### 台股個股

使用 Yahoo Finance `.TW` 尾碼：

- `2330.TW` - 台積電
- `2454.TW` - 聯發科
- `2317.TW` - 鴻海

## 🔧 執行 DataTrack 爬蟲

```bash
cd scraper
pip install -r requirements.txt
python3 datatrack_scraper.py
```

## 📝 API 說明

### Yahoo Finance CORS 代理

使用 `https://api.allorigins.win/raw?url=` 代理解決跨域問題。

如需自行架設，可使用 `api/proxy.php`。

## ⚠️ 注意事項

- 行情資料來自 Yahoo Finance，可能有延遲
- 投資僅供參考，不構成投資建議
- DataTrack 需要先執行爬蟲才會顯示資料

## 📜 授權

僅供個人學習與研究使用。
