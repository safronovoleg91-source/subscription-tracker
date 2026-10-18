from flask import Flask, jsonify, render_template, request, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from models import db, User, Category, Subscription, Payment
from datetime import datetime

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)


login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Войдите, чтобы продолжить'
login_manager.login_message_category = 'warning'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@app.route('/')
def index():
    """Главная страница"""
    return render_template('index.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    """Регистрация пользователя"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')


        if not username or not email or not password:
            flash('Заполните все поля', 'danger')
            return redirect(url_for('register'))

        if len(password) < 6:
            flash('Пароль минимум 6 символов', 'danger')
            return redirect(url_for('register'))

        if User.query.filter_by(username=username).first():
            flash('Такое имя уже занято', 'danger')
            return redirect(url_for('register'))
            
        if User.query.filter_by(email=email).first():
            flash('Такая почта уже зарегистрирована', 'danger')
            return redirect(url_for('register'))


        hashed_pw = generate_password_hash(password)
        
        user = User(username=username, email=email, password_hash=hashed_pw)
        db.session.add(user)
        db.session.commit()

        flash('Регистрация успешна! Теперь войдите.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Вход в систему"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        user = User.query.filter_by(username=username).first()
        

        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            flash(f'Привет, {user.username}!', 'success')
            return redirect(url_for('dashboard'))
        
        flash('Неверное имя или пароль', 'danger')
        return redirect(url_for('login'))

    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    """Выход из системы"""
    logout_user()
    flash('Вы вышли из аккаунта', 'info')
    return redirect(url_for('index'))


@app.route('/dashboard')
@login_required
def dashboard():
    """Защищённая страница (только для авторизованных)"""
    subs = Subscription.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', subs=subs)


@app.route('/api/health')
def api_health():
    """Проверка статуса БД и таблиц"""
    try:
        return jsonify({
            'status': 'ok',
            'database': 'postgresql',
            'tables': {
                'users': User.query.count(),
                'categories': Category.query.count(),
                'subscriptions': Subscription.query.count(),
                'payments': Payment.query.count()
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/profile')
@login_required
def api_profile():
    """Возвращает данные текущего пользователя в формате JSON"""
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'joined': current_user.created_at.strftime('%Y-%m-%d %H:%M:%S')
    })




@app.route('/init-db')
def init_db():
    """Создаёт таблицы и наполняет категориями"""
    try:
        db.create_all()

        if Category.query.count() == 0:
            default_categories = [
                Category(name='Музыка', icon='🎵'),
                Category(name='Кино', icon='🎬'),
                Category(name='Софт', icon='💻'),
                Category(name='Спорт', icon='🏋️'),
                Category(name='Облако', icon='☁️'),
                Category(name='Игры', icon='🎮'),
            ]
            db.session.add_all(default_categories)
            db.session.commit()

        return jsonify({
            'status': 'ok',
            'message': 'Таблицы созданы в PostgreSQL',
            'categories_added': Category.query.count()
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)