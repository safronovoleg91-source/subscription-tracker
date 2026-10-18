/* ==========================================================================
   SubTracker — dashboard.js (страница «Дашборд»)
   Расходы, график по категориям и блок «Использование подписок».
   Все цифры считаются из списка подписок (SubTracker.computeStats).
   ========================================================================== */
(function () {
    'use strict';

    const monthEl = document.getElementById('monthTotal');
    if (!monthEl || !window.SubTracker) return;

    const { el, money, categoryInfo, USAGE_STATUS, computeStats, plural, api } = window.SubTracker;

    const $ = (id) => document.getElementById(id);
    const pageAlert = $('pageAlert');

    let categoryChart = null;
    let usageChart = null;

    function chartsAvailable() {
        return typeof Chart !== 'undefined';
    }

    function setText(id, text) {
        $(id).textContent = text;
    }

    // ---- график «Траты по категориям» ------------------------------------
    function drawCategoryChart(stats) {
        const labels = Object.keys(stats.byCategory);
        if (categoryChart) categoryChart.destroy();
        if (!chartsAvailable() || !labels.length) return;

        categoryChart = new Chart($('categoryChart'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: labels.map((l) => stats.byCategory[l]),
                    backgroundColor: labels.map((l) => categoryInfo(l).color)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${money(ctx.parsed)} / мес` } }
                }
            }
        });
    }

    // ---- график «Цена одного использования» ------------------------------
    function drawUsageChart(stats) {
        const used = stats.list
            .filter((s) => s.costPerUse !== null)
            .sort((a, b) => b.costPerUse - a.costPerUse);

        if (usageChart) usageChart.destroy();
        $('usageChartEmpty').classList.toggle('d-none', used.length > 0);
        $('usageChart').classList.toggle('d-none', used.length === 0);
        if (!chartsAvailable() || !used.length) return;

        usageChart = new Chart($('usageChart'), {
            type: 'bar',
            data: {
                labels: used.map((s) => s.name),
                datasets: [{
                    data: used.map((s) => Math.round(s.costPerUse)),
                    backgroundColor: used.map((s) => USAGE_STATUS[s.status].color),
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const s = used[ctx.dataIndex];
                                return ` ${money(s.costPerUse)} за раз (${s.usageCount} ${plural(s.usageCount, ['раз', 'раза', 'раз'])} в месяц)`;
                            }
                        }
                    }
                },
                scales: { x: { beginAtZero: true, ticks: { callback: (v) => `${v} ₽` } } }
            }
        });
    }

    // ---- список «Кандидаты на отмену» ------------------------------------
    function reason(s) {
        if (s.status === 'unused') return 'В этом месяце не использовалась';
        return `${s.usageCount} ${plural(s.usageCount, ['раз', 'раза', 'раз'])} в месяц · ${money(s.costPerUse)} за раз`;
    }

    function drawCandidates(stats) {
        const list = $('candidates');
        list.replaceChildren();
        $('candidatesEmpty').classList.toggle('d-none', stats.candidates.length > 0);

        stats.candidates.forEach((s) => {
            const status = USAGE_STATUS[s.status];
            list.append(el('li', { class: 'list-group-item d-flex justify-content-between align-items-center gap-3' },
                el('div', null,
                    el('span', { class: 'fw-semibold me-2' }, s.name),
                    el('span', { class: `badge ${status.badge}` }, status.text),
                    el('div', { class: 'small text-muted' }, reason(s))),
                el('div', { class: 'text-end text-nowrap' }, `${money(s.cost)} / мес`)));
        });
    }

    // ---- общая отрисовка --------------------------------------------------
    function render(stats) {
        // Расходы
        setText('monthTotal', money(stats.monthly));
        setText('yearTotal', money(stats.yearly));
        setText('spentTotal', stats.totalSpent === null ? '—' : money(stats.totalSpent));

        // Использование
        setText('unusedCount', String(stats.unused.length));
        setText('unusedCost', stats.unused.length ? `${money(stats.unusedCost)} в месяц уходит впустую` : 'Все подписки используются');
        setText('avgCostPerUse', stats.avgCostPerUse === null ? '—' : money(stats.avgCostPerUse));
        setText('savingsMonth', money(stats.savingsMonth));
        setText('savingsYear', stats.savingsMonth ? `≈ ${money(stats.savingsYear)} в год` : 'Отменять нечего');

        drawCategoryChart(stats);
        drawUsageChart(stats);
        drawCandidates(stats);
    }

    async function init() {
        try {
            const list = await api.list();
            pageAlert.className = 'alert d-none';
            render(computeStats(list));
        } catch (err) {
            pageAlert.textContent = err.message || 'Не удалось загрузить данные.';
            pageAlert.className = 'alert alert-danger';
        }
    }

    init();
})();
