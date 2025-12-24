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
    from flask import request
    error = request.args.get('error')
    room = request.args.get('room')
    return render_template('join.html', error=error, room=room)

@bp.route('/api/participants/<room_code>')
def get_room_participants(room_code):
    """Get list of participants in a room for rejoin selection."""
    from app.utils.room_manager import get_room
    from flask import jsonify
    
    room = get_room(room_code)
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    
    if room.get('ended', False):
        return jsonify({'error': 'Quiz has ended'}), 404
    
    # Return participants as list with name, avatar, and participant_id
    participants_list = []
    for pid, participant in room.get('participants', {}).items():
        participants_list.append({
            'participant_id': pid,
            'name': participant.get('name'),
            'avatar': participant.get('avatar')
        })
    
    return jsonify({'participants': participants_list})

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
    """Display page for quiz room - publicly accessible, no authentication required."""
    from app.utils.room_manager import get_room
    
    # Check if room exists and is running
    room = get_room(room_code)
    if not room or room.get('ended', False):
        return render_template('quiz_not_running.html', room_code=room_code, view_type='display')
    
    return render_template('display.html', room_code=room_code)

@bp.route('/participant/<room_code>')
def participant(room_code):
    """Participant page for quiz room - publicly accessible, participants join via room code."""
    from app.utils.room_manager import get_room
    
    # Check if room exists and is running
    room = get_room(room_code)
    if not room or room.get('ended', False):
        return render_template('quiz_not_running.html', room_code=room_code, view_type='participant')
    
    return render_template('participant.html', room_code=room_code)

@bp.route('/control/<room_code>')
def control(room_code):
    """Quizmaster control page for quiz room - ONLY accessible by the specific user who started this quiz instance."""
    from flask import session, redirect, url_for, flash
    from app.utils.room_manager import get_room
    
    # First check: User must be logged in as a quizmaster
    if not session.get('is_quizmaster'):
        return redirect(url_for('main.quizmaster_login'))
    
    # Second check: Room must exist
    room = get_room(room_code)
    if not room:
        flash('Room not found or expired', 'error')
        return redirect(url_for('main.quizmaster'))
    
    # Third check: User must be the EXACT quizmaster who started THIS specific quiz instance
    # For example, if room_code 4567 was started by "bob", only "bob" can access it
    # Even if "alice" is also a quizmaster, she cannot access room_code 4567's control page
    username = session.get('username')
    room_quizmaster = room.get('quizmaster')  # The username who started this specific quiz instance
    
    if room_quizmaster != username:
        flash(f'Access denied. This quiz (Room: {room_code}) was started by "{room_quizmaster}". Only that user can access the control page.', 'error')
        return redirect(url_for('main.quizmaster'))
    
    return render_template('control.html', room_code=room_code)

