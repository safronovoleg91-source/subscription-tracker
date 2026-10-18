/* ==========================================================================
   SubTracker — auth.js (страница входа и регистрации)
   ========================================================================== */
(function () {
    'use strict';

    const showRegisterLink = document.querySelector('#showRegister');
    const showLoginLink = document.querySelector('#showLogin');
    const loginCard = document.querySelector('#loginCard');
    const registerCard = document.querySelector('#registerCard');
    const alertBox = document.querySelector('#alertBox');
    const registerForm = document.querySelector('#registerForm');
    const loginForm = document.querySelector('#loginForm');

    if (!loginForm || !registerForm) return;

    function hideAlert() {
        alertBox.className = 'alert d-none';
        alertBox.textContent = '';
    }

    // Вспомогательная функция для показа сообщений (type: danger | success | info)
    function showAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
    }

    // Запрос к API авторизации; возвращает {ok, data}
    async function post(url, payload) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload)
        });
        let data = {};
        try { data = await response.json(); } catch (_) { /* ответ не JSON */ }
        return { ok: response.ok, data };
    }

    // 1. Переключение между формами
    showRegisterLink.addEventListener('click', function (e) {
        e.preventDefault();
        hideAlert();
        loginCard.classList.add('d-none');
        registerCard.classList.remove('d-none');
    });

    showLoginLink.addEventListener('click', function (e) {
        e.preventDefault();
        hideAlert();
        registerCard.classList.add('d-none');
        loginCard.classList.remove('d-none');
    });

    // 2. Регистрация
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.querySelector('#regUsername').value.trim();
        const password = document.querySelector('#regPassword').value;

        if (password.length < 6) {
            showAlert('Пароль должен быть не короче 6 символов.', 'danger');
            return;
        }

        showAlert('Загрузка...', 'info');
        try {
            const { ok, data } = await post('/api/register', { username, password });
            if (!ok) {
                showAlert(data.error || 'Ошибка регистрации', 'danger');
                return;
            }

            showAlert('Регистрация успешна! Войдите в аккаунт.', 'success');
            registerForm.reset();

            // Через 1,5 секунды переключаем на форму входа
            setTimeout(function () {
                registerCard.classList.add('d-none');
                loginCard.classList.remove('d-none');
                hideAlert();
            }, 1500);
        } catch (err) {
            showAlert('Ошибка сервера. Попробуйте позже.', 'danger');
        }
    });

    // 3. Вход
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.querySelector('#loginUsername').value.trim();
        const password = document.querySelector('#loginPassword').value;

        showAlert('Проверка данных...', 'info');
        try {
            const { ok, data } = await post('/api/login', { username, password });
            if (!ok) {
                showAlert(data.error || 'Неверный логин или пароль', 'danger');
                return;
            }

            showAlert('Вход выполнен! Перенаправление...', 'success');
            // Как и раньше, отправляем на дашборд
            setTimeout(function () { window.location.href = '/dashboard'; }, 1000);
        } catch (err) {
            showAlert('Ошибка сервера. Попробуйте позже.', 'danger');
        }
    });
})();
