#!/usr/bin/env python3
"""
專業投資儀表板 Pro — 資料更新腳本
由 GitHub Actions 每天 09:00 與 15:00 (台灣時間) 自動執行
"""

import json, re, ssl
from datetime import datetime, date, timedelta
from pathlib import Path

import requests

# ─── TWSE SSL context (for cert issues) ────────────────────────────────────
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.twse.com.tw/",
    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
})
# 先訪問 T86 頁面取得 JSESSIONID cookie
SESSION.get("https://www.twse.com.tw/rwd/zh/fund/T86", verify=False, timeout=10)

# 找到最近有資料的交易日（最多往回查 7 天，避免假日/週末/長假無資料）
def find_latest_trading_date(base_date=None, max_lookback=7):
    """往回找第一個 TWSE 有資料的日子"""
    d = base_date or date.today()
    for i in range(max_lookback + 1):
        check = d - timedelta(days=i)
        date_str = check.strftime("%Y%m%d")
        r = SESSION.post(
            "https://www.twse.com.tw/rwd/zh/fund/T86",
            data={"date": date_str, "selectType": "ALLBUT0999", "response": "json"},
            verify=False, timeout=15,
        )
        try:
            d_json = r.json()
            if d_json.get("stat") == "OK" and d_json.get("data"):
                print(f"  🔍 找到最近交易日: {date_str} ({check.strftime('%Y/%m/%d')}, 往前回溯 {i} 天)")
                return date_str, check.strftime("%Y/%m/%d")
        except Exception:
            pass
    # fallback: 今天
    return d.strftime("%Y%m%d"), d.strftime("%Y/%m/%d")

TODAY = date.today()
DATE_STR, DATE_DISPLAY = find_latest_trading_date(TODAY)

API_DIR = Path(__file__).parent.parent / "api"
API_DIR.mkdir(exist_ok=True)

# ─── 1. Yahoo Finance ────────────────────────────────────────────────────────
YAHOO_SYMBOLS = {
    "twii":    "^TWII",    # 台灣加權
    "nasdaq":  "^IXIC",    # Nasdaq
    "sp500":   "^GSPC",    # S&P 500
    "vix":     "^VIX",     # VIX
    "dji":     "^DJI",     # 道瓊
    "tsmc":    "2330.TW",  # 台積電
    "mediatek":"2454.TW",  # 聯發科
    "foxconn": "2317.TW",  # 鴻海
}

def fetch_yahoo(key, symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d"
    r = SESSION.get(url, verify=False, timeout=15)
    data = r.json()
    result = data["chart"]["result"][0]
    meta = result["meta"]
    price = meta.get("regularMarketPrice") or meta.get("previousClose")
    prev  = meta.get("chartPreviousClose") or meta.get("previousClose")
    if price is None or prev is None:
        return None
    change     = round(price - prev, 2)
    change_pct = round((change / prev) * 100, 2)
    return {"price": price, "change": change, "change_pct": change_pct}

def fetch_all_yahoo():
    out = {}
    for key, symbol in YAHOO_SYMBOLS.items():
        try:
            data = fetch_yahoo(key, symbol)
            if data:
                out[key] = data
                print(f"  ✅ {key}: {data['price']} ({data['change_pct']:+.2f}%)")
            else:
                print(f"  ⚠️  {key}: 無法取得")
        except Exception as e:
            print(f"  ❌ {key}: {e}")
    return out

# ─── 2. TWSE 法人買賣超 (T86) — POST 完整版 ─────────────────────────────────
def fetch_twse_institutional(date_str):
    """取得指定日期全部股票法人買賣超資料"""
    r = SESSION.post(
        "https://www.twse.com.tw/rwd/zh/fund/T86",
        data={
            "date":       date_str,
            "selectType": "ALLBUT0999",
            "response":   "json",
        },
        verify=False,
        timeout=30,
    )
    d = r.json()
    if d.get("stat") != "OK":
        print(f"  ⚠️  T86 stat={d.get('stat')}")
        return {}

    # fields: 證券代號, 證券名稱, 外陸資買進, 外陸資賣出, 外陸資買賣超,
    #         外自營買進, 外自營賣出, 外自營買賣超,
    #         投信買進, 投信賣出, 投信買賣超,
    #         自營商買賣超(自行), 自營商買賣超(避險), 三大法人買賣超
    TARGETS = {"2330", "2454", "2317", "2498", "3034"}
    result = {}
    for row in d.get("data", []):
        sid = row[0].strip()
        if sid in TARGETS:
            name       = row[1].strip()
            foreign_net  = _parse_num(row[4])   # 外陸資淨
            dealer_net   = _parse_num(row[10])  # 投信淨
            prop_net     = _parse_num(row[11])  # 自營商淨
            total_net    = _parse_num(row[13])  # 三大法人淨
            result[sid] = {
                "name":        name,
                "foreign_net": foreign_net,
                "dealer_net":  dealer_net,
                "prop_net":    prop_net,
                "total_net":   total_net,
            }
    return result

def _parse_num(val):
    """把 '1,234,567' 或 '+1,234,567' 轉成 int，None/空傳 0"""
    if val is None:
        return 0
    s = str(val).strip().replace(",", "").replace(" ", "")
    if not s or s in ("N/A", "--", "NaN", ""):
        return 0
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return 0

# ─── 3. TWSE 融資融券 (MI_MARGN) — POST ─────────────────────────────────────
def fetch_twse_margin(date_str):
    """取得市場整體融資融券使用率"""
    r = SESSION.post(
        "https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN",
        data={"date": date_str, "response": "json"},
        verify=False,
        timeout=15,
    )
    d = r.json()
    if d.get("stat") != "OK":
        print(f"  ⚠️  MI_MARGN stat={d.get('stat')}")
        return {}

    # 找出融資與融券的今日餘額 (交易單位)
    margin_balance  = None   # 融資餘額
    short_balance   = None   # 融券餘額
    margin_limit    = None   # 融資限額
    short_limit     = None   # 融券限額

    for tbl in d.get("tables", []):
        rows = tbl.get("data", [])
        for row in rows:
            label = str(row[0]).strip() if row else ""
            if "融資" in label and "交易單位" in label and "金額" not in label:
                # [項目, 買進, 賣出, 現金(券)償還, 前日餘額, 今日餘額]
                margin_balance = _parse_num(row[5])
            if "融券" in label and "交易單位" in label and "金額" not in label:
                short_balance = _parse_num(row[5])

    return {
        "margin_balance": margin_balance  or 0,
        "short_balance":  short_balance   or 0,
        "date":           date_str,
    }

# ─── 主程式 ─────────────────────────────────────────────────────────────────
def main():
    print(f"\n📡 開始更新 — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"   日期: {DATE_STR}")

    # 1. Yahoo Finance
    print("\n── Yahoo Finance ──")
    yahoo = fetch_all_yahoo()

    stock_data = {
        "date":     DATE_DISPLAY,
        "updated":  datetime.now().isoformat(),
        **yahoo,
    }

    # 同時寫入 JS 版（index.html 直接<script src載入，無需 fetch）
    js_path = API_DIR / "stock-data.js"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write(f"// Auto-generated {datetime.now().isoformat()}\n")
        f.write(f"window.STOCK_DATA = {json.dumps(stock_data, ensure_ascii=False)};\n")
    print(f"  💾 寫入 api/stock-data.js")

    with open(API_DIR / "stock-data.json", "w", encoding="utf-8") as f:
        json.dump(stock_data, f, ensure_ascii=False, indent=2)
    print(f"  💾 寫入 api/stock-data.json")

    # 2. TWSE 法人
    print("\n── TWSE 法人買賣超 (T86) ──")
    inst = fetch_twse_institutional(DATE_STR)
    inst_data = {
        "date":   DATE_DISPLAY,
        "source": "TWSE T86",
        "updated": datetime.now().isoformat(),
        "data":   inst,
    }
    with open(API_DIR / "institutional.json", "w", encoding="utf-8") as f:
        json.dump(inst_data, f, ensure_ascii=False, indent=2)
    print(f"  💾 寫入 api/institutional.json ({len(inst)} 檔股票)")

    # 3. TWSE 融資融券
    print("\n── TWSE 融資融券 (MI_MARGN) ──")
    margin = fetch_twse_margin(DATE_STR)
    margin_data = {
        "date":   DATE_DISPLAY,
        "source": "TWSE MI_MARGN",
        "updated": datetime.now().isoformat(),
        **margin,
    }
    with open(API_DIR / "margin.json", "w", encoding="utf-8") as f:
        json.dump(margin_data, f, ensure_ascii=False, indent=2)
    print(f"  💾 寫入 api/margin.json")

    print(f"\n✅ 更新完成 — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
