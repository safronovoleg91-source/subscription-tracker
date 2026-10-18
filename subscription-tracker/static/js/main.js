/* ==========================================================================
   SubTracker — main.js
   Общее для всех страниц: подсветка пункта меню и кнопки «Выйти».
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // 1. Подсветка активной страницы в навбаре ("/" — это страница подписок)
    const path = window.location.pathname === '/' ? '/subscriptions' : window.location.pathname;
    document.querySelectorAll('.navbar-nav .nav-link').forEach(function (link) {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });

    // 2. Кнопки «Выйти» (в навбаре и в настройках) — любая кнопка с классом js-logout
    document.querySelectorAll('.js-logout').forEach(function (btn) {
        btn.addEventListener('click', async function () {
            if (!confirm('Вы уверены, что хотите выйти?')) return;
            try {
                await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
            } catch (err) {
                console.error('Ошибка при выходе', err);
            } finally {
                window.location.href = '/login';
            }
        });
    });
});
