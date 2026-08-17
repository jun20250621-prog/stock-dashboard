/**
 * DataTrack 爬蟲整合範例
 * 
 * 這個檔案展示如何將 DataTrack 爬蟲輸出整合到 Dashboard
 * 
 * 使用方式:
 * 1. 修改 scraper_output_path 指向 dashboard 的 api/scraper-data.json
 * 2. 執行爬蟲
 * 3. Dashboard 會自動讀取並顯示資料
 */

const fs = require('fs');
const path = require('path');

// 輸出路徑（相對於專案根目錄）
const OUTPUT_PATH = path.join(__dirname, '..', 'api', 'scraper-data.json');

// 爬蟲資料格式
const scraperData = {
    "更新時間": new Date().toLocaleString('zh-TW'),
    "資料來源": "DataTrack 爬蟲",
    // 在此新增您的爬蟲欄位
};

// 寫入 JSON 檔案
function saveScraperData(data) {
    try {
        const combined = { ...scraperData, ...data };
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(combined, null, 2), 'utf8');
        console.log(`✅ 爬蟲資料已更新: ${OUTPUT_PATH}`);
    } catch (error) {
        console.error('❌ 寫入失敗:', error.message);
    }
}

// 範例：模擬爬蟲資料更新
function updateExample() {
    saveScraperData({
        "USD/TWD": (31 + Math.random()).toFixed(2),
        "黃金現價": (2400 + Math.random() * 50).toFixed(2)
    });
}

// 如果直接執行此檔案
if (require.main === module) {
    updateExample();
}

module.exports = { saveScraperData };
