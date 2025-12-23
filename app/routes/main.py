"""
Main routes for the application.
"""
from flask import Blueprint, render_template, send_from_directory
from pathlib import Path

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """Home page - redirects to login or dashboard."""
    return render_template('index.html')

@bp.route('/join')
def join():
    """Participant join page."""
    return render_template('join.html')

@bp.route('/quizmaster')
def quizmaster():
    """Quizmaster dashboard."""
    return render_template('quizmaster.html')

@bp.route('/quizmaster/login')
def quizmaster_login():
    """Quizmaster login page."""
    return render_template('quizmaster_login.html')

@bp.route('/quizmaster/create')
def quizmaster_create():
    """Quiz creation/editing page."""
    return render_template('quiz_editor.html')

@bp.route('/display/<room_code>')
def display(room_code):
    """Display page for quiz room."""
    return render_template('display.html', room_code=room_code)

@bp.route('/participant/<room_code>')
def participant(room_code):
    """Participant page for quiz room."""
    return render_template('participant.html', room_code=room_code)

@bp.route('/control/<room_code>')
def control(room_code):
    """Quizmaster control page for quiz room."""
    from flask import session
    if not session.get('is_quizmaster'):
        return render_template('quizmaster_login.html'), 403
    return render_template('control.html', room_code=room_code)

