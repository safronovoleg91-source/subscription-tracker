document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ SubTracker загружен!');

    // ========================================
    // 1. Обработка формы добавления подписки
    // ========================================
    const addForm = document.querySelector('#addModal form');
    if (addForm) {
        addForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📝 Форма отправлена');

            // Получаем данные из формы
            const name = addForm.querySelector('input[type="text"]').value;
            const category = addForm.querySelector('select').value;
            const cost = addForm.querySelector('input[type="number"]').value;
            const date = addForm.querySelector('input[type="date"]').value;

            console.log('Данные:', { name, category, cost, date });

            // Позже здесь будет отправка на сервер:
            // fetch('/api/subscriptions', { method: 'POST', ... })
        });
    }

    // ========================================
    // 2. Обработка кнопок удаления
    // ========================================
    const deleteButtons = document.querySelectorAll('.btn-outline-danger');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const name = row.querySelector('td').textContent;
            if (confirm(`Удалить "${name}"?`)) {
                console.log('🗑 Удаляем:', name);
                // Позже: fetch(`/api/subscriptions/${id}`, { method: 'DELETE' })
            }
        });
    });

    // ========================================
    // 3. Подсветка активной страницы в навбаре
    // ========================================
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});
// ==========================================
// АВТОРИЗАЦИЯ
// ==========================================

// 1. Переключение между формами
const showRegisterLink = document.querySelector('#showRegister');
const showLoginLink = document.querySelector('#showLogin');
const loginCard = document.querySelector('#loginCard');
const registerCard = document.querySelector('#registerCard');
const alertBox = document.querySelector('#alertBox');

if (showRegisterLink) {
    showRegisterLink.addEventListener('click', function(e) {
        e.preventDefault();
        alertBox.classList.add('d-none'); // скрыть ошибки
        loginCard.classList.add('d-none');
        registerCard.classList.remove('d-none');
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        alertBox.classList.add('d-none'); // скрыть ошибки
        registerCard.classList.add('d-none');
        loginCard.classList.remove('d-none');
    });
}

// Вспомогательная функция для показа сообщений
function showAlert(message, type) {
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`; // alert-danger или alert-success
}

// 2. Обработка РЕГИСТРАЦИИ
const registerForm = document.querySelector('#registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.querySelector('#regUsername').value;
        const password = document.querySelector('#regPassword').value;
        
        showAlert('Загрузка...', 'info');

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (!response.ok) {
                showAlert(data.error || 'Ошибка регистрации', 'danger');
                return;
            }

            // Успех!
            showAlert('Регистрация успешна! Войдите в аккаунт.', 'success');
            registerForm.reset();
            
            // Автоматически переключаем на форму входа через 1.5 секунды
            setTimeout(() => {
                registerCard.classList.add('d-none');
                loginCard.classList.remove('d-none');
                alertBox.classList.add('d-none');
            }, 1500);

        } catch (err) {
            showAlert('Ошибка сервера. Попробуйте позже.', 'danger');
        }
    });
}

// 3. Обработка ВХОДА
const loginForm = document.querySelector('#loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.querySelector('#loginUsername').value;
        const password = document.querySelector('#loginPassword').value;
        
        showAlert('Проверка данных...', 'info');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (!response.ok) {
                showAlert(data.error || 'Неверный логин или пароль', 'danger');
                return;
            }

            // Успешный вход!
            showAlert('Вход выполнен! Перенаправление...', 'success');
            
            // Перекидываем на дашборд через 1 секунду
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);

        } catch (err) {
            showAlert('Ошибка сервера. Попробуйте позже.', 'danger');
        }
    });
}
// 4. Кнопка ВЫХОДА
const logoutBtn = document.querySelector('#logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
        if (confirm('Вы уверены, что хотите выйти?')) {
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/login';
            } catch (err) {
                console.error('Ошибка при выходе', err);
            }
        }
    });
}