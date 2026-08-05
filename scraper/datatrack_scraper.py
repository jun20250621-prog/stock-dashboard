#!/usr/bin/env python3
"""
DataTrack 免費資源爬蟲
Author: AI Assistant
Date: 2026-08-05
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import os
from datetime import datetime
import re

# 設定
BASE_URL = "https://datatrack.trendforce.com.tw"
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(OUTPUT_DIR, "datatrack_data.json")

# Headers 模擬瀏覽器
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
}

class DataTrackScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.data = {
            "last_updated": "",
            "categories": {},
            "indicators": []
        }
    
    def get_page(self, url, retries=3):
        """取得頁面內容"""
        for i in range(retries):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                return response.text
            except Exception as e:
                print(f"取得頁面失敗 (嘗試 {i+1}/{retries}): {e}")
                time.sleep(2)
        return None
    
    def get_indicator_list(self):
        """取得指標列表"""
        print("📡 正在取得指標列表...")
        
        indicators = []
        
        # 總體經濟指標
        categories = [
            ('macro', '總體經濟', '/Chart'),
            ('semi', '半導體', '/Chart?category=semi'),
            ('led', 'LED', '/Chart?category=led'),
            ('display', '顯示器', '/Chart?category=display'),
            ('energy', '能源', '/Chart?category=energy'),
        ]
        
        for cat_id, cat_name, cat_path in categories:
            print(f"  📂 處理分類: {cat_name}")
            html = self.get_page(BASE_URL + cat_path)
            
            if html:
                soup = BeautifulSoup(html, 'html.parser')
                links = soup.find_all('a', href=re.compile(r'/Chart/content/\d+'))
                
                for link in links:
                    href = link.get('href', '')
                    title = link.get_text(strip=True)
                    
                    if title and '/Chart/content/' in href:
                        indicator = {
                            'id': self.extract_id(href),
                            'title': title,
                            'category': cat_name,
                            'url': BASE_URL + href,
                            'description': ''
                        }
                        indicators.append(indicator)
            
            time.sleep(1)  # 避免請求過快
        
        return indicators
    
    def extract_id(self, url):
        """從URL提取ID"""
        match = re.search(r'/content/(\d+)', url)
        return match.group(1) if match else ''
    
    def get_indicator_detail(self, indicator):
        """取得單一指標詳情"""
        html = self.get_page(indicator['url'])
        
        if not html:
            return indicator
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # 取得描述
        desc_elem = soup.find('h4', string=re.compile('描述|說明'))
        if desc_elem:
            desc_text = desc_elem.get_text(strip=True)
            indicator['description'] = desc_text
        
        # 取得主要內容
        main_content = soup.find('div', class_=re.compile('content|description|detail', re.I))
        if main_content:
            text = main_content.get_text(separator=' ', strip=True)
            # 擷取前500字
            indicator['full_description'] = text[:500] if len(text) > 500 else text
        
        # 取得標籤
        tags = []
        tag_elements = soup.find_all('a', href=re.compile('/wordcloud-tag-list'))
        for tag in tag_elements:
            tags.append(tag.get_text(strip=True))
        indicator['tags'] = tags
        
        return indicator
    
    def scrape_all(self):
        """執行完整爬取"""
        print("=" * 50)
        print("🚀 DataTrack 爬蟲開始")
        print("=" * 50)
        
        # 取得指標列表
        indicators = self.get_indicator_list()
        print(f"📊 找到 {len(indicators)} 個指標")
        
        # 取得每個指標的詳情
        print("\n📝 正在取得指標詳情...")
        
        for i, indicator in enumerate(indicators):
            print(f"  [{i+1}/{len(indicators)}] 處理: {indicator['title']}")
            indicator = self.get_indicator_detail(indicator)
            time.sleep(0.5)  # 避免請求過快
        
        # 更新資料
        self.data['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.data['indicators'] = indicators
        
        # 按分類整理
        self.organize_by_category()
        
        # 儲存
        self.save_data()
        
        print("\n" + "=" * 50)
        print("✅ 爬蟲完成!")
        print(f"📊 共處理 {len(indicators)} 個指標")
        print(f"📁 資料已儲存至: {DATA_FILE}")
        print("=" * 50)
        
        return self.data
    
    def organize_by_category(self):
        """按分類整理"""
        categories = {}
        
        for indicator in self.data['indicators']:
            cat = indicator.get('category', '其他')
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(indicator)
        
        self.data['categories'] = categories
    
    def save_data(self):
        """儲存資料"""
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)


class DataTrackAPIServer:
    """簡單的 API 伺服器"""
    
    def __init__(self):
        self.data = {}
        self.load_data()
    
    def load_data(self):
        """載入資料"""
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
    
    def get_all_indicators(self):
        """取得所有指標"""
        return self.data.get('indicators', [])
    
    def get_by_category(self, category):
        """依分類取得"""
        categories = self.data.get('categories', {})
        return categories.get(category, [])
    
    def get_by_id(self, indicator_id):
        """依ID取得"""
        for indicator in self.data.get('indicators', []):
            if indicator.get('id') == indicator_id:
                return indicator
        return None
    
    def to_html(self):
        """轉換為HTML儀表板"""
        html = """
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DataTrack 數據儀表板</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: linear-gradient(135deg, #1a1a2e, #16213e); min-height: 100vh; color: #fff; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; }
        .header h1 { background: linear-gradient(90deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .update-time { color: #888; font-size: 14px; margin-top: 10px; }
        .category { margin-bottom: 30px; }
        .category-title { font-size: 20px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #00d4ff; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
        .card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; cursor: pointer; transition: all 0.3s; border-left: 3px solid #7c3aed; }
        .card:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
        .card-title { color: #00d4ff; font-weight: 600; margin-bottom: 8px; }
        .card-desc { font-size: 12px; color: #aaa; line-height: 1.5; }
        .tags { margin-top: 10px; }
        .tag { display: inline-block; padding: 2px 8px; background: rgba(124,58,237,0.3); border-radius: 4px; font-size: 10px; margin: 2px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 DataTrack 數據資源中心</h1>
        <div class="update-time">最後更新: """ + self.data.get('last_updated', 'N/A') + """</div>
    </div>
"""
        
        categories = self.data.get('categories', {})
        
        for cat_name, indicators in categories.items():
            html += f'<div class="category"><div class="category-title">{cat_name}</div><div class="grid">'
            
            for ind in indicators[:10]:  # 每分類顯示前10個
                desc = ind.get('description', ind.get('full_description', ''))[:100]
                tags = ind.get('tags', [])
                tags_html = ''.join([f'<span class="tag">{t}</span>' for t in tags[:3]])
                
                html += f"""
                <div class="card" onclick="showDetail('{ind['id']}')">
                    <div class="card-title">{ind['title']}</div>
                    <div class="card-desc">{desc}...</div>
                    <div class="tags">{tags_html}</div>
                </div>
                """
            
            html += '</div></div>'
        
        html += """
    <script>
        const data = """ + json.dumps(self.data) + """;
        
        function showDetail(id) {
            const indicator = data.indicators.find(i => i.id === id);
            if (indicator) {
                alert(indicator.title + '\\n\\n' + (indicator.full_description || indicator.description || '無說明'));
            }
        }
    </script>
</body>
</html>
"""
        
        return html


def main():
    """主程式"""
    scraper = DataTrackScraper()
    data = scraper.scrape_all()
    
    # 產生HTML
    server = DataTrackAPIServer()
    html = server.to_html()
    
    output_html = os.path.join(OUTPUT_DIR, "datatrack_dashboard.html")
    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"\n📄 HTML儀表板已產生: {output_html}")


if __name__ == "__main__":
    main()
