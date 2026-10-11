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