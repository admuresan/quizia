"""
Main routes for the application.
"""
from flask import Blueprint, render_template, send_from_directory
from pathlib import Path

bp = Blueprint('main', __name__)

@bp.route('/favicon.ico')
def favicon():
    """Serve favicon or return 204 No Content to stop browser requests."""
    from flask import Response
    import os
    from pathlib import Path
    
    # Try to serve favicon from static folder if it exists
    favicon_path = Path(__file__).parent.parent / 'static' / 'favicon.ico'
    if favicon_path.exists():
        return send_from_directory(str(favicon_path.parent), 'favicon.ico', mimetype='image/vnd.microsoft.icon')
    
    # If no favicon exists, return 204 No Content to stop browser requests
    return Response(status=204)

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

@bp.route('/api/public-rooms', methods=['GET'])
def get_public_rooms():
    """Get all public running rooms for participants to browse."""
    from app.utils.room_manager import get_public_rooms
    from flask import jsonify
    
    public_rooms = get_public_rooms()
    return jsonify({'public_rooms': public_rooms}), 200

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
    
    # Get base URL for Playwright to use
    # Auto-detect: localhost uses port 6005 (direct Flask), server uses port 80 (through nginx)
    import os
    
    # Detect if we're on localhost/development or production server
    is_localhost = False
    try:
        # Check environment variable first (most reliable)
        flask_env = os.environ.get('FLASK_ENV', '').lower()
        flask_debug = os.environ.get('FLASK_DEBUG', '').lower()
        
        # Development indicators:
        # 1. FLASK_ENV is 'development'
        # 2. FLASK_DEBUG is set
        # 3. Request came from localhost/127.0.0.1 (not a public IP)
        # 4. WERKZEUG_RUN_MAIN is set (Flask dev server)
        if (flask_env == 'development' or 
            flask_debug == '1' or 
            flask_debug == 'true' or
            os.environ.get('WERKZEUG_RUN_MAIN') == 'true'):
            is_localhost = True
        else:
            # Check request host - if it's localhost/127.0.0.1, likely development
            request_host = request.host.lower() if request.host else ''
            if 'localhost' in request_host or '127.0.0.1' in request_host:
                # But check if it's port 6005 (dev) or port 80 (production nginx)
                if ':6005' in request_host or request_host.endswith('localhost') or request_host.endswith('127.0.0.1'):
                    is_localhost = True
    except Exception as e:
        print(f"[TV Display API] Error detecting environment: {e}, defaulting to production")
    
    if is_localhost:
        # Development/localhost: use direct Flask on port 6005
        base_url = "http://127.0.0.1:6005"
        print(f"[TV Display API] Detected localhost/development - using direct Flask on port 6005")
    else:
        # Production/server: use nginx on port 80
        base_url = "http://127.0.0.1:80"
        print(f"[TV Display API] Detected production/server - using nginx on port 80")
    
    # Log the original request URL for debugging
    try:
        original_url = request.url_root.rstrip('/')
        request_host = request.host if request.host else 'unknown'
        print(f"[TV Display API] Request came from: {original_url} (host: {request_host})")
        print(f"[TV Display API] Using base_url: {base_url} for room {room_code}")
    except Exception as e:
        print(f"[TV Display API] Error reading request URL: {e}, using default: {base_url}")
    
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
            # Try to get last successful image from renderer
            from app.utils.display_renderer import _last_successful_image
            if room_code in _last_successful_image:
                last_image = _last_successful_image[room_code]
                print(f"[TV Display API] Returning last successful image for room {room_code}")
                return Response(last_image, mimetype='image/png')
            # If no last image, return a 1x1 transparent PNG (will show as black, but better than error)
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

