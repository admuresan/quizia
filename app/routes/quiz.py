"""
Quiz management routes.
"""
from flask import Blueprint, request, jsonify, session, send_file
from app.utils.quiz_storage import (
    save_quiz,
    load_quiz,
    list_quizes,
    delete_quiz,
    validate_quiz_json,
    generate_quiz_id,
    copy_quiz
)
from app.utils.room_manager import get_running_rooms_for_quizmaster, end_room
from pathlib import Path
import json
import time

bp = Blueprint('quiz', __name__, url_prefix='/api/quiz')

@bp.route('/list', methods=['GET'])
def list_quizes_route():
    """
    List quizzes for current quizmaster (their own + public ones).
    
    Returns quiz objects with 'id' field. The 'id' must be used for all subsequent
    API calls (load, start, delete, etc.). Never use quiz name for lookups.
    """
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    quizes = list_quizes(username=username)
    return jsonify({'quizes': quizes}), 200

@bp.route('/save', methods=['POST'])
def save_quiz_route():
    """Save a quiz (quizmaster only)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    quiz_data = data.get('quiz')
    quiz_id = data.get('id')
    force_recreate = data.get('force_recreate', False)
    
    if not quiz_data:
        return jsonify({'error': 'Quiz data required'}), 400
    
    username = session.get('username')
    
    # If quiz_id is provided, check if quiz exists and user is creator
    if quiz_id:
        existing_quiz = load_quiz(quiz_id)
        if existing_quiz and existing_quiz.get('creator') != username:
            return jsonify({'error': 'Only the creator can edit this quiz'}), 403
        # Preserve creator and public status from existing quiz
        if existing_quiz:
            quiz_data['creator'] = existing_quiz.get('creator')
            quiz_data['public'] = existing_quiz.get('public', False)
    else:
        # New quiz - generate ID and set creator
        quiz_id = generate_quiz_id()
        quiz_data['creator'] = username
        quiz_data['public'] = quiz_data.get('public', False)
    
    # Ensure name is set
    if 'name' not in quiz_data:
        quiz_data['name'] = 'Untitled Quiz'
    
    # Set ID in quiz data
    quiz_data['id'] = quiz_id
    
    result = save_quiz(quiz_id, quiz_data, force_recreate=force_recreate)
    if result['success']:
        return jsonify({'message': 'Quiz saved', 'id': quiz_id}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/load/<quiz_id>', methods=['GET'])
def load_quiz_route(quiz_id):
    """Load a quiz (quizmaster only, must have access)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    quiz = load_quiz(quiz_id)
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    # Check if user has access (creator or public)
    quiz_creator = quiz.get('creator')
    is_public = quiz.get('public', False)
    
    if quiz_creator != username and not is_public:
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({'quiz': quiz}), 200

@bp.route('/delete/<quiz_id>', methods=['DELETE'])
def delete_quiz_route(quiz_id):
    """Delete a quiz (quizmaster only, must be creator)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    quiz = load_quiz(quiz_id)
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    if quiz.get('creator') != username:
        return jsonify({'error': 'Only the creator can delete this quiz'}), 403
    
    result = delete_quiz(quiz_id)
    if result['success']:
        return jsonify({'message': 'Quiz deleted'}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/download/<quiz_id>', methods=['GET'])
def download_quiz(quiz_id):
    """Download quiz as JSON file (quizmaster only, must have access)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    quiz = load_quiz(quiz_id)
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    # Check if user has access (creator or public)
    quiz_creator = quiz.get('creator')
    is_public = quiz.get('public', False)
    
    if quiz_creator != username and not is_public:
        return jsonify({'error': 'Access denied'}), 403
    
    from app import create_app
    app = create_app()
    quiz_file = app.config['QUIZES_FOLDER'] / f'{quiz_id}.json'
    
    # Use quiz name for download filename
    quiz_name = quiz.get('name', 'quiz')
    # Sanitize filename
    safe_name = "".join(c for c in quiz_name if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_name = safe_name.replace(' ', '_')
    
    return send_file(quiz_file, as_attachment=True, download_name=f'{safe_name}.json')

@bp.route('/upload', methods=['POST'])
def upload_quiz():
    """Upload quiz from JSON file (quizmaster only)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        content = file.read().decode('utf-8')
        quiz_data = json.loads(content)
        
        # Validate quiz structure
        validation_result = validate_quiz_json(quiz_data)
        if not validation_result['valid']:
            return jsonify({'error': f'Invalid quiz: {validation_result["error"]}'}), 400
        
        # Generate new ID for uploaded quiz (always creates new quiz)
        quiz_id = generate_quiz_id()
        quiz_data['id'] = quiz_id
        # Track creator for uploaded quizzes
        quiz_data['creator'] = session.get('username')
        # Preserve public status if it exists, otherwise default to False
        if 'public' not in quiz_data:
            quiz_data['public'] = False
        
        result = save_quiz(quiz_id, quiz_data)
        
        if result['success']:
            return jsonify({'message': 'Quiz uploaded', 'id': quiz_id, 'name': quiz_data.get('name')}), 200
        else:
            return jsonify({'error': result['error']}), 400
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON file'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/toggle-public/<quiz_id>', methods=['POST'])
def toggle_quiz_public(quiz_id):
    """Toggle public status of a quiz (quizmaster only, must be creator)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    quiz = load_quiz(quiz_id)
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    # Only creator can toggle public status
    if quiz.get('creator') != username:
        return jsonify({'error': 'Only the creator can change public status'}), 403
    
    # Toggle public status
    quiz['public'] = not quiz.get('public', False)
    result = save_quiz(quiz_id, quiz)
    
    if result['success']:
        return jsonify({'message': 'Public status updated', 'public': quiz['public']}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/copy/<quiz_id>', methods=['POST'])
def copy_quiz_route(quiz_id):
    """Copy a public quiz to create a new editable quiz (quizmaster only)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    original_quiz = load_quiz(quiz_id)
    
    if not original_quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    # Only allow copying public quizzes
    if not original_quiz.get('public', False):
        return jsonify({'error': 'Only public quizzes can be copied'}), 403
    
    # Create copy
    result = copy_quiz(quiz_id, username)
    
    if result['success']:
        return jsonify({
            'message': 'Quiz copied successfully',
            'id': result['id'],
            'name': result.get('name', original_quiz.get('name'))
        }), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/running', methods=['GET'])
def get_running_quizzes():
    """Get all running quizzes for the current quizmaster."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    running_rooms = get_running_rooms_for_quizmaster(username)
    
    return jsonify({'running_quizzes': running_rooms}), 200

@bp.route('/end/<room_code>', methods=['POST'])
def end_running_quiz(room_code):
    """End a running quiz (quizmaster only, must be owner)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    
    # Check if room exists and belongs to this quizmaster
    from app.utils.room_manager import get_room, end_room
    room = get_room(room_code)
    
    if not room:
        return jsonify({'error': 'Room not found or expired'}), 404
    
    if room.get('quizmaster') != username:
        return jsonify({'error': 'Only the quizmaster who started this quiz can end it'}), 403
    
    # End the room - use the same logic as websocket handler
    # Wrap in try-except to ensure room is always ended even if stats/socket operations fail
    try:
        from app.utils.scoring import calculate_score
        from app.utils.stats import record_quiz_run
        from app import socketio
        
        # Calculate final scores
        scores = calculate_score(room)
        room['scores'] = scores
        room['ended'] = True
        room['last_activity'] = time.time()
        
        # Don't save state - we're about to delete the room file
        
        # Record quiz run completion (use quiz_id, not quiz_name)
        quiz_id = room.get('quiz_id')
        try:
            if quiz_id:
                record_quiz_run(quiz_id, username, room_code, completed=True)
        except Exception as e:
            # Log error but don't fail - stats recording is not critical
            print(f"Warning: Failed to record quiz run stats: {e}")
        
        # Get final rankings
        participants = room.get('participants', {})
        rankings = []
        for participant_id, participant in participants.items():
            rankings.append({
                'id': participant_id,
                'name': participant.get('name'),
                'avatar': participant.get('avatar'),
                'score': scores.get(participant_id, 0)
            })
        
        rankings.sort(key=lambda x: x['score'], reverse=True)
        for i, ranking in enumerate(rankings):
            ranking['rank'] = i + 1
        
        # Broadcast end to all rooms
        try:
            socketio.emit('quiz_ended', {
                'scores': scores,
                'final_rankings': rankings
            }, room=f'display_{room_code}')
            
            socketio.emit('quiz_ended', {
                'scores': scores,
                'final_rankings': rankings
            }, room=f'participant_{room_code}')
            
            socketio.emit('quiz_ended', {
                'scores': scores,
                'final_rankings': rankings
            }, room=f'control_{room_code}')
        except Exception as e:
            # Log error but don't fail - socket operations are not critical
            print(f"Warning: Failed to emit quiz_ended events: {e}")
        
        # Disconnect all clients from the rooms
        try:
            from flask_socketio import close_room
            close_room(f'display_{room_code}')
            close_room(f'participant_{room_code}')
            close_room(f'control_{room_code}')
        except Exception as e:
            # Log error but don't fail
            print(f"Warning: Failed to close rooms: {e}")
    except Exception as e:
        # Log the error but ensure room is still ended
        print(f"Error during quiz end operations: {e}")
    
    # Mark room as ended and remove it (always do this, even if other operations failed)
    try:
        end_room(room_code)
    except Exception as e:
        print(f"Warning: Failed to end room: {e}")
    
    return jsonify({'message': 'Quiz ended successfully'}), 200

