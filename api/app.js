// Auto-generated app logic — loads window.STOCK_DATA from stock-data.js
(function() {
    'use strict';

    var colors = {
        primary: '#00d4ff',
        secondary: '#7c3aed',
        success: '#00c853',
        danger: '#ff5252',
        warning: '#ff9800'
    };

    function fmt(n, dec) {
        return (n == null) ? '--' : n.toFixed(dec || 2);
    }

    function fmtPct(n) {
        return (n == null) ? '--' : ((n >= 0 ? '+' : '') + n.toFixed(2) + '%');
    }

    function pctColor(n) {
        return (n == null) ? '#888' : (n >= 0 ? '#00c853' : '#ff5252');
    }

    function applyStockData() {
        var d = window.STOCK_DATA;
        if (!d) {
            console.warn('STOCK_DATA not found');
            return;
        }

        var twii   = d.twii   || {};
        var nasdaq = d.nasdaq || {};
        var vix    = d.vix    || {};

        var el;
        el = document.getElementById('twii-price');
        if (el) el.textContent = fmt(twii.price, 2);
        el = document.getElementById('twii-pct');
        if (el) {
            el.textContent = fmtPct(twii.change_pct);
            el.style.color = pctColor(twii.change_pct);
        }
        el = document.getElementById('nasdaq-price');
        if (el) el.textContent = fmt(nasdaq.price, 2);
        el = document.getElementById('nasdaq-pct');
        if (el) {
            el.textContent = fmtPct(nasdaq.change_pct);
            el.style.color = pctColor(nasdaq.change_pct);
        }
        el = document.getElementById('vix-price');
        if (el) el.textContent = fmt(vix.price, 2);

        // chart data
        var labels = d.history || [];
        if (labels.length > 0 && window.marketChart) {
            window.marketChart.data.labels = labels.map(function(l) { return l.label || l.date || ''; });
            window.marketChart.data.datasets[0].data = labels.map(function(l) { return l.twii; });
            window.marketChart.update();
        }
        if (labels.length > 0 && window.compareChart) {
            window.compareChart.data.labels = labels.map(function(l) { return l.label || l.date || ''; });
            window.compareChart.data.datasets[0].data = labels.map(function(l) { return l.twii; });
            window.compareChart.data.datasets[1].data = labels.map(function(l) { return l.sp500 || null; });
            window.compareChart.update();
        }
    }

    // Load margin data and update risk table
    function loadMarginData() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/stock-dashboard/api/margin.json', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4 || xhr.status !== 200) return;
            try {
                var d = JSON.parse(xhr.responseText);
                var mb = d.margin_balance;
                var sb = d.short_balance;
                // 融資使用率: 簡單用 40% 當估算值 (無完整資料時)
                if (mb && mb > 0) {
                    var el = document.getElementById('margin-usage');
                    if (el) el.textContent = mb.toLocaleString();
                }
                if (sb && sb > 0) {
                    var el = document.getElementById('short-balance');
                    if (el) el.textContent = sb.toLocaleString();
                }
            } catch(e) {
                console.warn('margin.json parse error', e);
            }
        };
        xhr.send();
    }

    // Load institutional data and update cards
    function loadInstitutionalData() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/stock-dashboard/api/institutional.json', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4 || xhr.status !== 200) return;
            try {
                var d = JSON.parse(xhr.responseText);
                var stocks = d.data || {};
                // Update top movers table if visible
                updateInstTable(stocks);
            } catch(e) {
                console.warn('institutional.json parse error', e);
            }
        };
        xhr.send();
    }

    function updateInstTable(stocks) {
        // Find top 3 by absolute total_net
        var sorted = Object.keys(stocks).map(function(sid) {
            return { sid: sid, name: stocks[sid].name, total: stocks[sid].total_net };
        }).sort(function(a, b) {
            return Math.abs(b.total) - Math.abs(a.total);
        }).slice(0, 5);

        var tbody = document.querySelector('#page-dashboard #inst-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        sorted.forEach(function(item) {
            var tr = document.createElement('tr');
            var sign = item.total >= 0 ? '+' : '';
            tr.innerHTML = '<td>' + item.name + '</td>' +
                '<td style="color:' + (item.total >= 0 ? '#00c853' : '#ff5252') + ';">' +
                sign + item.total.toLocaleString() + '</td>';
            tbody.appendChild(tr);
        });
    }

    var marketChart, instChart, compareChart, industryChart, instTrendChart, marginChart;

    function initCharts() {
        marketChart = new Chart(document.getElementById('marketChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Taiwan',
                    data: [],
                    borderColor: colors.primary,
                    backgroundColor: 'rgba(0,212,255,0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });

        instChart = new Chart(document.getElementById('instChart'), {
            type: 'bar',
            data: {
                labels: ['Trust', 'Dealer', 'Foreign'],
                datasets: [{ data: [0, 0, 0], backgroundColor: [colors.success, colors.success, colors.danger] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });

        compareChart = new Chart(document.getElementById('compareChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Taiwan', data: [], borderColor: colors.primary, tension: 0.4 },
                    { label: 'US', data: [], borderColor: colors.secondary, tension: 0.4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff', font: { size: 9 } } },
                scales: {
                    x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                } }
            }
        });

        industryChart = new Chart(document.getElementById('industryChart'), {
            type: 'bar',
            data: {
                labels: ['Semi', 'AI', 'Optic', 'Elec', 'Trad', 'Fin'],
                datasets: [{ label: '%', data: [0, 0, 0, 0, 0, 0], backgroundColor: [colors.success, colors.success, colors.success, colors.success, colors.danger, colors.danger] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#fff', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });

        instTrendChart = new Chart(document.getElementById('instTrendChart'), {
            type: 'line',
            data: {
                labels: ['1W', '2W', '3W', '4W', 'This'],
                datasets: [
                    { label: 'Trust', data: [0, 0, 0, 0, 0], borderColor: colors.success, tension: 0.4 },
                    { label: 'Dealer', data: [0, 0, 0, 0, 0], borderColor: colors.warning, tension: 0.4 },
                    { label: 'Foreign', data: [0, 0, 0, 0, 0], borderColor: colors.danger, tension: 0.4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff', font: { size: 9 } } },
                scales: {
                    x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                } }
            }
        });

        marginChart = new Chart(document.getElementById('marginChart'), {
            type: 'line',
            data: {
                labels: ['1M', '2M', '3M', '4M', '5M', '6M', '7M', '8M'],
                datasets: [
                    { label: 'Margin(100M)', data: [0, 0, 0, 0, 0, 0, 0, 0], borderColor: colors.primary, tension: 0.4 },
                    { label: 'Short(10K)', data: [0, 0, 0, 0, 0, 0, 0, 0], borderColor: colors.warning, tension: 0.4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff', font: { size: 9 } } },
                scales: {
                    x: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                } }
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        initCharts();
        applyStockData();
        loadMarginData();
        loadInstitutionalData();
    });

    function showPage(page) {
        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        document.querySelectorAll('.nav-links a').forEach(function(a) { a.classList.remove('active'); });
        document.getElementById('page-' + page).classList.add('active');
        if (event && event.target && event.target.classList) event.target.classList.add('active');
    }
})();
