from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('subscriptions.html')

@app.route('/subscriptions')
def subscriptions():
    return render_template('subscriptions.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

if __name__ == '__main__':
    app.run(debug=True)