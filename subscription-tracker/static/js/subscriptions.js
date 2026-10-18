/* ==========================================================================
   SubTracker — subscriptions.js (страница «Мои подписки»)
   Таблица рисуется из данных API; кнопки: «Использовал», изменить, удалить.
   ========================================================================== */
(function () {
    'use strict';

    const tbody = document.getElementById('subsBody');
    if (!tbody || !window.SubTracker) return;

    const { el, money, formatDate, lastUsedText, categoryInfo, USAGE_STATUS, enrich, plural, todayISO, api } = window.SubTracker;

    const pageAlert = document.getElementById('pageAlert');
    const summary = document.getElementById('subsSummary');
    const modalEl = document.getElementById('subModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const form = document.getElementById('subForm');
    const formAlert = document.getElementById('formAlert');
    const modalTitle = document.getElementById('subModalTitle');
    const saveBtn = document.getElementById('subSaveBtn');
    const idInput = document.getElementById('subId');
    const nameInput = document.getElementById('subName');
    const categoryInput = document.getElementById('subCategory');
    const costInput = document.getElementById('subCost');
    const dateInput = document.getElementById('subDate');

    let subs = [];

    // ---- сообщения --------------------------------------------------------
    function showAlert(box, message, type) {
        box.textContent = message;
        box.className = `alert alert-${type || 'danger'}`;
    }

    function hideAlert(box) {
        box.className = 'alert d-none';
        box.textContent = '';
    }

    // ---- отрисовка таблицы ------------------------------------------------
    function actionButton(action, label, cls, title) {
        return el('button', {
            type: 'button',
            class: `btn btn-sm ${cls}`,
            dataset: { action },
            title,
            'aria-label': title
        }, label);
    }

    function renderRow(s) {
        const status = USAGE_STATUS[s.status];
        return el('tr', { dataset: { id: s.id } },
            el('td', { class: 'fw-semibold' }, s.name),
            el('td', null, el('span', { class: `badge ${categoryInfo(s.category).badge}` }, s.category)),
            el('td', { class: 'text-nowrap' }, money(s.cost)),
            el('td', { class: 'text-nowrap' }, formatDate(s.billingDate)),
            el('td', { class: 'text-nowrap' },
                el('span', { class: 'me-2' }, String(s.usageCount)),
                el('span', { class: `badge ${status.badge}` }, status.text)),
            el('td', { class: 'text-nowrap' }, lastUsedText(s.lastUsedAt)),
            el('td', { class: 'text-nowrap' }, s.costPerUse === null ? '—' : money(s.costPerUse)),
            el('td', { class: 'text-end text-nowrap' },
                actionButton('use', '✔ Использовал', 'btn-outline-success', 'Отметить использование'),
                ' ',
                actionButton('edit', '✏️', 'btn-outline-secondary', 'Изменить'),
                ' ',
                actionButton('delete', '🗑', 'btn-outline-danger', 'Удалить')));
    }

    function render() {
        tbody.replaceChildren();
        if (!subs.length) {
            tbody.append(el('tr', null,
                el('td', { colspan: 8, class: 'text-center text-muted py-4' },
                    'Подписок пока нет. Нажмите «+ Добавить подписку».')));
            summary.textContent = '';
            return;
        }
        subs.forEach((s) => tbody.append(renderRow(s)));

        const total = subs.reduce((acc, s) => acc + s.cost, 0);
        const n = subs.length;
        summary.textContent = `${n} ${plural(n, ['подписка', 'подписки', 'подписок'])} · ${money(total)} в месяц`;
    }

    async function load() {
        try {
            subs = (await api.list()).map(enrich);
            hideAlert(pageAlert);
            render();
        } catch (err) {
            tbody.replaceChildren(el('tr', null,
                el('td', { colspan: 8, class: 'text-center text-muted py-4' }, 'Не удалось загрузить подписки.')));
            showAlert(pageAlert, err.message || 'Не удалось загрузить подписки.');
        }
    }

    // ---- форма добавления / редактирования -------------------------------
    function setMode(sub) {
        hideAlert(formAlert);
        form.classList.remove('was-validated');
        if (sub) {
            modalTitle.textContent = 'Изменить подписку';
            idInput.value = sub.id;
            nameInput.value = sub.name;
            if (![...categoryInput.options].some((o) => o.value === sub.category)) {
                categoryInput.append(new Option(sub.category, sub.category));
            }
            categoryInput.value = sub.category;
            costInput.value = sub.cost;
            dateInput.value = (sub.billingDate || '').slice(0, 10);
        } else {
            modalTitle.textContent = 'Добавить подписку';
            form.reset();
            idInput.value = '';
            dateInput.value = todayISO();
        }
    }

    // Кнопка «+ Добавить подписку» открывает окно в режиме создания
    modalEl.addEventListener('show.bs.modal', function (e) {
        if (e.relatedTarget) setMode(null);
    });

    modalEl.addEventListener('shown.bs.modal', function () { nameInput.focus(); });

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideAlert(formAlert);

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const sub = {
            name: nameInput.value.trim(),
            category: categoryInput.value,
            cost: costInput.value,
            billingDate: dateInput.value
        };
        const id = idInput.value;

        saveBtn.disabled = true;
        try {
            if (id) await api.update(id, sub);
            else await api.create(sub);
            modal.hide();
            await load();
        } catch (err) {
            showAlert(formAlert, err.message || 'Не удалось сохранить подписку.');
        } finally {
            saveBtn.disabled = false;
        }
    });

    // ---- кнопки в строках таблицы ----------------------------------------
    tbody.addEventListener('click', async function (e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const row = btn.closest('tr');
        const id = row.dataset.id;
        const sub = subs.find((s) => String(s.id) === id);
        if (!sub) return;

        try {
            if (btn.dataset.action === 'use') {
                btn.disabled = true;
                await api.markUsed(id);
                await load();
            } else if (btn.dataset.action === 'edit') {
                setMode(sub);
                modal.show();
            } else if (btn.dataset.action === 'delete') {
                if (!confirm(`Удалить «${sub.name}»?`)) return;
                await api.remove(id);
                await load();
            }
        } catch (err) {
            btn.disabled = false;
            showAlert(pageAlert, err.message || 'Не удалось выполнить действие.');
        }
    });

    load();
})();
