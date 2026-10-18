/* ==========================================================================
   SubTracker — core.js
   Общий код фронтенда: настройки, форматирование, адаптер API, клиент API
   (с демо-режимом, если сервер недоступен) и расчёт статистики.

   ВАЖНО ДЛЯ СТЫКОВКИ С БЭКЕНДОМ:
   всё, что зависит от API (адреса и названия полей), собрано в трёх местах:
     1) CONFIG.endpoints  — адреса запросов
     2) normalize()       — как читаем подписку из ответа сервера
     3) toPayload()       — как отправляем подписку на сервер
   Если Кирилл назовёт поля иначе — правится только здесь.
   Подробнее в файле API_CONTRACT.md.
   ========================================================================== */
(function (global) {
    'use strict';

    // ---------------------------------------------------------------------
    // 1. Настройки
    // ---------------------------------------------------------------------
    const CONFIG = {
        endpoints: {
            subscriptions: '/api/subscriptions',                 // GET (список), POST (создать)
            subscription: (id) => `/api/subscriptions/${id}`,    // PUT (изменить), DELETE (удалить)
            usage: (id) => `/api/subscriptions/${id}/usage`,     // POST — «отметить использование»
            me: '/api/me',                                       // GET — профиль
            changePassword: '/api/change-password',              // POST — смена пароля
            logout: '/api/logout'                                // POST — выход
        },
        // Если API не отвечает (сеть / 404 / 405 / 501), показываем демо-данные,
        // чтобы можно было разрабатывать и показывать интерфейс без бэкенда.
        // Когда бэкенд будет готов — можно поставить false.
        demoFallback: true,

        // Пороги для оценки использования
        rareUsagePerMonth: 2   // 1–2 использования в месяц = «редко»
    };

    // Категории: цвет бейджа и цвет на графиках
    const CATEGORIES = {
        'Развлечения': { badge: 'bg-danger', color: '#dc3545' },
        'Музыка': { badge: 'bg-success', color: '#198754' },
        'Здоровье': { badge: 'bg-warning text-dark', color: '#ffc107' },
        'Учёба': { badge: 'bg-info text-dark', color: '#0dcaf0' },
        'Другое': { badge: 'bg-secondary', color: '#6c757d' }
    };

    // Статусы использования подписки
    const USAGE_STATUS = {
        unused: { text: 'Не используется', badge: 'bg-danger-subtle text-danger-emphasis', color: '#dc3545' },
        rare: { text: 'Редко', badge: 'bg-warning-subtle text-warning-emphasis', color: '#f0ad00' },
        active: { text: 'Активно', badge: 'bg-success-subtle text-success-emphasis', color: '#198754' }
    };

    function categoryInfo(name) {
        return CATEGORIES[name] || CATEGORIES['Другое'];
    }

    // ---------------------------------------------------------------------
    // 2. Форматирование
    // ---------------------------------------------------------------------
    const moneyFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

    function money(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
        return moneyFmt.format(Math.round(Number(value))) + ' ₽';
    }

    // Дата 'YYYY-MM-DD' понимаем как локальную (без сдвига часового пояса)
    function toDate(value) {
        if (!value) return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
        const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    function formatDate(value) {
        const d = toDate(value);
        return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : '—';
    }

    function todayISO() {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function daysSince(value, now) {
        const d = toDate(value);
        if (!d) return null;
        const n = now || new Date();
        const a = new Date(n.getFullYear(), n.getMonth(), n.getDate());
        const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return Math.round((a - b) / 86400000);
    }

    function lastUsedText(value) {
        const n = daysSince(value);
        if (n === null) return 'ни разу';
        if (n <= 0) return 'сегодня';
        if (n === 1) return 'вчера';
        return `${n} дн. назад`;
    }

    // plural(5, ['раз', 'раза', 'раз']) → 'раз'
    function plural(n, forms) {
        const a = Math.abs(n) % 100;
        const b = a % 10;
        if (a > 10 && a < 20) return forms[2];
        if (b > 1 && b < 5) return forms[1];
        if (b === 1) return forms[0];
        return forms[2];
    }

    // Безопасное создание DOM-элементов: текст вставляется как текст (без innerHTML),
    // поэтому данные с сервера не могут внедрить разметку (защита от XSS).
    function el(tag, props, ...children) {
        const node = document.createElement(tag);
        Object.entries(props || {}).forEach(([key, val]) => {
            if (val === null || val === undefined || val === false) return;
            if (key === 'class') node.className = val;
            else if (key === 'dataset') Object.assign(node.dataset, val);
            else node.setAttribute(key, val === true ? '' : val);
        });
        children.flat().forEach((child) => {
            if (child === null || child === undefined || child === false) return;
            node.append(child instanceof Node ? child : document.createTextNode(String(child)));
        });
        return node;
    }

    // ---------------------------------------------------------------------
    // 3. Адаптер API: сервер <-> интерфейс
    // ---------------------------------------------------------------------

    // Как читаем подписку из ответа сервера (несколько вариантов названий полей)
    function normalize(raw) {
        const r = raw || {};
        return {
            id: r.id,
            name: String(r.name !== undefined && r.name !== null ? r.name : ''),
            category: r.category || 'Другое',
            cost: Number(r.cost !== undefined ? r.cost : (r.price !== undefined ? r.price : r.amount)) || 0,
            billingDate: r.billing_date || r.date || r.next_payment || null,
            usageCount: Number(r.usage_count !== undefined ? r.usage_count : r.uses_this_month) || 0,
            lastUsedAt: r.last_used_at || r.last_used || null,
            startedAt: r.started_at || r.created_at || null
        };
    }

    // Как отправляем подписку на сервер
    function toPayload(sub) {
        return {
            name: sub.name,
            category: sub.category,
            cost: Number(sub.cost),
            billing_date: sub.billingDate
        };
    }

    // ---------------------------------------------------------------------
    // 4. Статистика использования
    // ---------------------------------------------------------------------

    // Добавляет к подписке «цену одного использования» и статус
    function enrich(sub) {
        const costPerUse = sub.usageCount > 0 ? sub.cost / sub.usageCount : null;
        let status = 'active';
        if (!sub.usageCount) status = 'unused';
        else if (sub.usageCount <= CONFIG.rareUsagePerMonth) status = 'rare';
        return Object.assign({}, sub, { costPerUse, status });
    }

    // Сколько платежей уже прошло с начала подписки (оценка: 1 платёж = 30,44 дня)
    function paymentsCount(startedAt) {
        const days = daysSince(startedAt);
        if (days === null) return null;
        if (days < 0) return 0;
        return Math.floor(days / 30.44) + 1;
    }

    function sum(list, fn) {
        return list.reduce((acc, item) => acc + fn(item), 0);
    }

    function computeStats(rawList) {
        const list = rawList.map(enrich);
        const monthly = sum(list, (s) => s.cost);

        const byCategory = {};
        list.forEach((s) => { byCategory[s.category] = (byCategory[s.category] || 0) + s.cost; });

        // «Подписочный долг» — сколько потрачено за всё время
        let totalSpent = null;
        list.forEach((s) => {
            const p = paymentsCount(s.startedAt);
            if (p !== null) totalSpent = (totalSpent || 0) + s.cost * p;
        });

        const totalUses = sum(list, (s) => s.usageCount);
        const unused = list.filter((s) => s.status === 'unused');
        const candidates = list
            .filter((s) => s.status !== 'active')
            .sort((a, b) => b.cost - a.cost);
        const savingsMonth = sum(candidates, (s) => s.cost);

        return {
            list,
            monthly,
            yearly: monthly * 12,
            totalSpent,
            byCategory,
            totalUses,
            avgCostPerUse: totalUses > 0 ? monthly / totalUses : null,
            unused,
            unusedCost: sum(unused, (s) => s.cost),
            candidates,
            savingsMonth,
            savingsYear: savingsMonth * 12
        };
    }

    // ---------------------------------------------------------------------
    // 5. Клиент API (+ демо-режим)
    // ---------------------------------------------------------------------
    class ApiError extends Error {
        constructor(status, message) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
        }
    }

    let demoMode = false;

    function showDemoBanner() {
        if (typeof document === 'undefined') return;
        const host = document.querySelector('main');
        if (!host || document.getElementById('demoBanner')) return;
        host.prepend(el('div', { id: 'demoBanner', class: 'alert alert-warning', role: 'alert' },
            '⚠️ Сервер API недоступен — показаны демо-данные, изменения не сохраняются.'));
    }

    function enableDemo(reason) {
        if (demoMode) return;
        demoMode = true;
        if (typeof console !== 'undefined') console.warn('[SubTracker] API недоступен, включён демо-режим:', reason);
        showDemoBanner();
    }

    async function request(method, url, body) {
        if (demoMode) return demoRequest(method, url, body);

        let resp;
        try {
            resp = await fetch(url, {
                method,
                headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
                body: body !== undefined ? JSON.stringify(body) : undefined,
                credentials: 'same-origin'
            });
        } catch (err) {
            if (CONFIG.demoFallback) {
                enableDemo(err && err.message);
                return demoRequest(method, url, body);
            }
            throw new ApiError(0, 'Нет связи с сервером. Попробуйте позже.');
        }

        let data = null;
        try { data = await resp.json(); } catch (_) { /* пустое тело или не JSON */ }

        if (resp.status === 401) {
            window.location.href = '/login';
            throw new ApiError(401, 'Требуется вход в аккаунт');
        }
        if (!resp.ok) {
            // Адреса API ещё нет на сервере (ответ — страница 404/405, а не JSON)
            if (CONFIG.demoFallback && data === null && [404, 405, 501].includes(resp.status)) {
                enableDemo(`HTTP ${resp.status} ${url}`);
                return demoRequest(method, url, body);
            }
            throw new ApiError(resp.status, (data && data.error) || `Ошибка сервера (${resp.status})`);
        }
        return data;
    }

    const ep = CONFIG.endpoints;
    const api = {
        async list() {
            const raw = await request('GET', ep.subscriptions);
            const arr = Array.isArray(raw) ? raw : ((raw && (raw.subscriptions || raw.items)) || []);
            return arr.map(normalize);
        },
        create(sub) { return request('POST', ep.subscriptions, toPayload(sub)); },
        update(id, sub) { return request('PUT', ep.subscription(id), toPayload(sub)); },
        remove(id) { return request('DELETE', ep.subscription(id)); },
        markUsed(id) { return request('POST', ep.usage(id), {}); },
        me() { return request('GET', ep.me); },
        changePassword(current, next) {
            return request('POST', ep.changePassword, { current_password: current, new_password: next });
        },
        logout() { return request('POST', ep.logout, {}); }
    };

    // ---------------------------------------------------------------------
    // 6. Демо-данные (работают только если API недоступен)
    // ---------------------------------------------------------------------
    const demo = { list: null, nextId: 100 };

    function demoSeed() {
        const ago = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d; };
        const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const day = (n) => { const d = new Date(); d.setDate(n); return iso(d); };
        return [
            { id: 1, name: 'Netflix', category: 'Развлечения', cost: 799, billing_date: day(15), usage_count: 12, last_used_at: ago(1).toISOString(), started_at: iso(ago(400)) },
            { id: 2, name: 'Spotify', category: 'Музыка', cost: 299, billing_date: day(20), usage_count: 60, last_used_at: new Date().toISOString(), started_at: iso(ago(700)) },
            { id: 3, name: 'YouTube Premium', category: 'Развлечения', cost: 199, billing_date: day(1), usage_count: 1, last_used_at: ago(12).toISOString(), started_at: iso(ago(250)) },
            { id: 4, name: 'Фитнес', category: 'Здоровье', cost: 1500, billing_date: day(5), usage_count: 0, last_used_at: null, started_at: iso(ago(180)) },
            { id: 5, name: 'Облако', category: 'Другое', cost: 199, billing_date: day(10), usage_count: 0, last_used_at: null, started_at: iso(ago(90)) }
        ];
    }

    async function demoRequest(method, url, body) {
        if (!demo.list) demo.list = demoSeed();
        const clone = (x) => JSON.parse(JSON.stringify(x));
        const m = /\/api\/subscriptions\/([^/]+)(\/usage)?$/.exec(url);

        if (url === ep.subscriptions && method === 'GET') return clone(demo.list);

        if (url === ep.subscriptions && method === 'POST') {
            if (!body || !String(body.name || '').trim()) throw new ApiError(400, 'Укажите название подписки');
            const item = Object.assign({ id: demo.nextId++, usage_count: 0, last_used_at: null, started_at: todayISO() }, body);
            demo.list.push(item);
            return clone(item);
        }

        if (m) {
            const item = demo.list.find((s) => String(s.id) === m[1]);
            if (!item) throw new ApiError(404, 'Подписка не найдена');
            if (m[2] && method === 'POST') {
                item.usage_count = (item.usage_count || 0) + 1;
                item.last_used_at = new Date().toISOString();
                return clone(item);
            }
            if (method === 'PUT') { Object.assign(item, body); return clone(item); }
            if (method === 'DELETE') { demo.list = demo.list.filter((s) => s !== item); return { ok: true }; }
        }

        if (url === ep.me && method === 'GET') return { username: 'demo', created_at: todayISO() };
        if (url === ep.changePassword && method === 'POST') return { ok: true };
        if (url === ep.logout && method === 'POST') return { ok: true };

        throw new ApiError(404, 'Адрес не найден (демо-режим)');
    }

    // ---------------------------------------------------------------------
    // Экспорт
    // ---------------------------------------------------------------------
    const SubTracker = {
        CONFIG, CATEGORIES, USAGE_STATUS, categoryInfo,
        money, formatDate, todayISO, lastUsedText, plural, el,
        normalize, toPayload, enrich, computeStats,
        api, ApiError, isDemo: () => demoMode
    };

    global.SubTracker = SubTracker;
    if (typeof module !== 'undefined' && module.exports) module.exports = SubTracker;
})(typeof window !== 'undefined' ? window : globalThis);
