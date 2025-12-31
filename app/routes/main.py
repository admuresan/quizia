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

@bp.route('/tvdisplay/<room_code>')
def tvdisplay(room_code):
    """TV-safe display page - shows server-rendered image stream."""
    from app.utils.room_manager import get_room
    
    # Check if room exists and is running
    room = get_room(room_code)
    if not room or room.get('ended', False):
        return render_template('quiz_not_running.html', room_code=room_code, view_type='display')
    
    return render_template('tvdisplay_image.html', room_code=room_code)

@bp.route('/tvdisplay_old/<room_code>')
def tvdisplay_old(room_code):
    """Old TV-safe display page - uses polling instead of WebSockets (kept for fallback)."""
    from app.utils.room_manager import get_room
    
    # Check if room exists and is running
    room = get_room(room_code)
    if not room or room.get('ended', False):
        return render_template('quiz_not_running.html', room_code=room_code, view_type='display')
    
    return render_template('tvdisplay.html', room_code=room_code)

@bp.route('/api/tvdisplay/version/<room_code>')
def api_tvdisplay_version(room_code):
    """Lightweight endpoint that returns the current version number for a room."""
    from app.utils.room_manager import get_room
    from flask import jsonify
    from app.utils.display_renderer import get_version
    
    room = get_room(room_code)
    if not room:
        return jsonify({'error': 'Room not found', 'version': 0}), 404
    
    if room.get('ended', False):
        return jsonify({'error': 'Quiz has ended', 'version': 0}), 404
    
    version = get_version(room_code)
    return jsonify({'version': version, 'running': True})

@bp.route('/api/tvdisplay/image/<room_code>')
def api_tvdisplay_image(room_code):
    """API endpoint that returns a rendered screenshot of the display page."""
    from app.utils.room_manager import get_room
    from flask import Response, request
    from app.utils.display_renderer import render_display_page_sync
    import os
    
    room = get_room(room_code)
    if not room:
        return Response('Room not found', status=404, mimetype='text/plain')
    
    if room.get('ended', False):
        return Response('Quiz has ended', status=404, mimetype='text/plain')
    
    # Get base URL from request or use default
    # Try to get from request, but fallback to 127.0.0.1 for local development
    APP_PORT = 6005  # Default port
    try:
        # Use request.url_root which includes scheme and host
        base_url = request.url_root.rstrip('/')
        # If it's localhost, use 127.0.0.1 instead (more reliable for Playwright)
        if 'localhost' in base_url:
            base_url = base_url.replace('localhost', '127.0.0.1')
        # Extract port from URL if present, otherwise use default
        if ':' in base_url.split('//')[1] if '//' in base_url else '':
            # Port is already in URL, use as is but replace host with 127.0.0.1
            parts = base_url.split('//')
            if len(parts) > 1:
                host_port = parts[1].split('/')[0]
                if ':' in host_port:
                    port = host_port.split(':')[1]
                    base_url = f"{parts[0]}//127.0.0.1:{port}"
                else:
                    base_url = f"{parts[0]}//127.0.0.1:{APP_PORT}"
        else:
            # No port in URL, add default port
            if '//' in base_url:
                base_url = f"{base_url.split('//')[0]}//127.0.0.1:{APP_PORT}"
            else:
                base_url = f"http://127.0.0.1:{APP_PORT}"
        if not base_url.startswith('http'):
            base_url = f"http://127.0.0.1:{APP_PORT}"
        print(f"[TV Display API] Using base_url: {base_url} for room {room_code}")
    except Exception as e:
        # Fallback to 127.0.0.1 if we can't determine from request
        base_url = f"http://127.0.0.1:{APP_PORT}"
        print(f"[TV Display API] Error determining base_url, using fallback: {base_url}, error: {e}")
    
    # Render the display page
    try:
        print(f"[TV Display API] Starting render for room {room_code}")
        print(f"[TV Display API] Room exists: {room is not None}, Room ended: {room.get('ended', False) if room else 'N/A'}")
        image_data = render_display_page_sync(room_code, base_url)
        if image_data:
            print(f"[TV Display API] Render successful for room {room_code}, image size: {len(image_data)} bytes")
            return Response(image_data, mimetype='image/png')
        else:
            print(f"[TV Display API] Render returned None for room {room_code}")
            # Return a 1x1 transparent PNG instead of 500 error to prevent continuous retries
            import base64
            # 1x1 transparent PNG
            transparent_png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
            return Response(transparent_png, mimetype='image/png')
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[TV Display API] ERROR rendering display image for room {room_code}: {e}")
        print(f"[TV Display API] Traceback: {error_trace}")
        # Return error details in response for debugging (in production, might want to hide this)
        error_msg = f"Error rendering display: {str(e)}\n\nCheck server logs for full traceback."
        return Response(error_msg, status=500, mimetype='text/plain')

@bp.route('/api/tvdisplay/<room_code>')
def api_tvdisplay(room_code):
    """API endpoint for TV display - returns current quiz state as JSON."""
    from app.utils.room_manager import get_room
    from flask import jsonify
    
    room = get_room(room_code)
    if not room:
        return jsonify({'error': 'Room not found', 'running': False}), 404
    
    if room.get('ended', False):
        return jsonify({'error': 'Quiz has ended', 'running': False}), 404
    
    # Get current page data
    quiz = room.get('quiz', {})
    pages = quiz.get('pages', [])
    current_page_index = room.get('current_page', 0)
    current_page = pages[current_page_index] if current_page_index < len(pages) else None
    
    # Get participants and scores
    participants_dict = {pid: {'name': p.get('name'), 'avatar': p.get('avatar')}
                          for pid, p in room.get('participants', {}).items()}
    scores = room.get('scores', {})
    
    return jsonify({
        'running': True,
        'room_code': room_code,
        'current_page': current_page_index,
        'page': current_page,
        'quiz': quiz,
        'participants': participants_dict,
        'scores': scores
    })

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

