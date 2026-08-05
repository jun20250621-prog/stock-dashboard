# 📊 DataTrack 爬蟲與儀表板整合方案

## 目錄結構

```
/home/node/.openclaw/workspace/
├── scraper/
│   ├── datatrack_scraper.py    # 主要爬蟲腳本
│   ├── requirements.txt          # Python 依賴套件
│   ├── run_scraper.sh          # 執行腳本 (Linux/Mac)
│   ├── datatrack_data.json     # 輸出的數據 (執行後產生)
│   └── datatrack_dashboard.html # 爬蟲產生的儀表板
│
└── dashboard-integrated.html    # 整合版儀表板 (可直接使用)
```

---

## 🚀 快速開始

### 1. 安裝依賴

```bash
cd /home/node/.openclaw/workspace/scraper
pip install -r requirements.txt
```

### 2. 執行爬蟲

```bash
python3 datatrack_scraper.py
```

### 3. 產出檔案

- `datatrack_data.json` - 原始數據
- `datatrack_dashboard.html` - 獨立儀表板

### 4. 使用整合版

將 `dashboard-integrated.html` 上傳到 GitHub，即可顯示爬蟲數據。

---

## ⚙️ 設定排程 (Linux Crontab)

### 每日執行

```bash
# 編輯 crontab
crontab -e

# 加入這行 (每天凌晨 6 點執行)
0 6 * * * cd /home/node/.openclaw/workspace/scraper && python3 datatrack_scraper.py >> scraper.log 2>&1
```

### 每週執行

```bash
# 每週一凌晨 6 點
0 6 * * 1 cd /home/node/.openclaw/workspace/scraper && python3 datatrack_scraper.py
```

---

## 📊 功能說明

### 爬蟲功能

| 功能 | 說明 |
|------|------|
| 取得指標列表 | 自動抓取所有分類的指標 |
| 取得說明文字 | 擷取指標的描述與解讀 |
| 產生 JSON | 輸出結構化數據 |
| 產生 HTML | 自動生成獨立儀表板 |

### 整合版儀表板功能

| 功能 | 說明 |
|------|------|
| 股票數據 | 台股、美股即時行情 |
| 總經指標 | ISM PMI、GDP、利率等 |
| DataTrack 整合 | 顯示爬蟲取得的數據 |
| 點擊詳情 | 彈出視窗顯示詳細說明 |
| 響應式設計 | 支援手機/電腦 |

---

## 🔧 技術細節

### 爬蟲邏輯

```
1. 取得指標列表頁面
2. 解析所有指標連結
3. 逐一訪問每個指標
4. 擷取說明文字
5. 儲存為 JSON
```

### 資料結構

```json
{
  "last_updated": "2026-08-05 12:00:00",
  "categories": {
    "總體經濟": [...],
    "半導體": [...]
  },
  "indicators": [
    {
      "id": "123",
      "title": "ISM 製造業 PMI",
      "category": "總體經濟",
      "description": "採購經理人指數...",
      "url": "https://..."
    }
  ]
}
```

---

## ⚠️ 注意事項

1. **遵守使用條款** - 請遵守 DataTrack 網站的使用規範
2. **合理請求頻率** - 腳本已加入延遲，避免對伺服器造成負擔
3. **登入限制** - 部分數據需要付費會員才能存取
4. **資料備份** - 建議定期備份 JSON 資料

---

## 📝 更新日誌

### 2026-08-05
- 初始版本發布
- 支援總體經濟、半導體、LED、顯示器、能源分類
- 產生 JSON 和 HTML 輸出
- 整合版儀表板發布

---

## ❓ 疑難排解

### 爬蟲失敗

```bash
# 檢查網路連線
ping datatrack.trendforce.com.tw

# 檢查 Python 版本
python3 --version

# 手動執行查看錯誤
python3 datatrack_scraper.py
```

### 資料未更新

```bash
# 檢查 JSON 檔案時間
ls -la datatrack_data.json

# 手動重新執行
python3 datatrack_scraper.py
```

---

## 📞 取得協助

如有問題，請告訴我：
1. 錯誤訊息
2. 執行環境 (Linux/Windows/Mac)
3. Python 版本

---
