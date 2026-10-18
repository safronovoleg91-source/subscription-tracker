/* ==========================================================================
   SubTracker — settings.js (страница «Настройки»)
   Профиль и смена пароля.
   ========================================================================== */
(function () {
    'use strict';

    const form = document.getElementById('passwordForm');
    if (!form || !window.SubTracker) return;

    const { api, formatDate } = window.SubTracker;

    const alertBox = document.getElementById('settingsAlert');
    const currentInput = document.getElementById('currentPassword');
    const newInput = document.getElementById('newPassword');
    const repeatInput = document.getElementById('repeatPassword');
    const saveBtn = document.getElementById('passwordSaveBtn');

    function showAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`;
    }

    // Профиль
    async function loadProfile() {
        try {
            const me = await api.me();
            document.getElementById('profileUsername').textContent = me.username || '—';
            document.getElementById('profileCreated').textContent = formatDate(me.created_at);
        } catch (err) {
            document.getElementById('profileUsername').textContent = '—';
            document.getElementById('profileCreated').textContent = '—';
        }
    }

    // Смена пароля
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (newInput.value.length < 6) {
            showAlert('Новый пароль должен быть не короче 6 символов.', 'danger');
            return;
        }
        if (newInput.value !== repeatInput.value) {
            showAlert('Пароли не совпадают.', 'danger');
            return;
        }

        saveBtn.disabled = true;
        try {
            await api.changePassword(currentInput.value, newInput.value);
            showAlert('Пароль изменён.', 'success');
            form.reset();
        } catch (err) {
            showAlert(err.message || 'Не удалось изменить пароль.', 'danger');
        } finally {
            saveBtn.disabled = false;
        }
    });

    loadProfile();
})();
