"""
Quiz management routes.
"""
from flask import Blueprint, request, jsonify, session, send_file
from app.utils.quiz_storage import (
    save_quiz,
    load_quiz,
    list_quizes,
    delete_quiz,
    validate_quiz_json
)
from app.utils.room_manager import get_running_rooms_for_quizmaster, end_room
from pathlib import Path
import json

bp = Blueprint('quiz', __name__, url_prefix='/api/quiz')

@bp.route('/list', methods=['GET'])
def list_quizes_route():
    """List quizzes for current quizmaster (their own + public ones)."""
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
    quiz_name = data.get('name')
    
    if not quiz_data or not quiz_name:
        return jsonify({'error': 'Quiz data and name required'}), 400
    
    username = session.get('username')
    
    # Check if quiz exists and user is creator
    existing_quiz = load_quiz(quiz_name)
    if existing_quiz and existing_quiz.get('creator') != username:
        return jsonify({'error': 'Only the creator can edit this quiz'}), 403
    
    # Track creator
    quiz_data['creator'] = username
    # Preserve public status if quiz exists, otherwise default to False
    if existing_quiz and 'public' in existing_quiz:
        quiz_data['public'] = existing_quiz.get('public', False)
    elif 'public' not in quiz_data:
        quiz_data['public'] = False
    
    result = save_quiz(quiz_name, quiz_data)
    if result['success']:
        return jsonify({'message': 'Quiz saved'}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/load/<quiz_name>', methods=['GET'])
def load_quiz_route(quiz_name):
    """Load a quiz (quizmaster only, must have access)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    quiz = load_quiz(quiz_name)
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    # Check if user has access (creator or public)
    quiz_creator = quiz.get('creator')
    is_public = quiz.get('public', False)
    
    if quiz_creator != username and not is_public:
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({'quiz': quiz}), 200

@bp.route('/delete/<quiz_name>', methods=['DELETE'])
def delete_quiz_route(quiz_name):
    """Delete a quiz (quizmaster only, must be creator)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    quiz = load_quiz(quiz_name)
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    if quiz.get('creator') != username:
        return jsonify({'error': 'Only the creator can delete this quiz'}), 403
    
    result = delete_quiz(quiz_name)
    if result['success']:
        return jsonify({'message': 'Quiz deleted'}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/download/<quiz_name>', methods=['GET'])
def download_quiz(quiz_name):
    """Download quiz as JSON file (quizmaster only, must have access)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    quiz = load_quiz(quiz_name)
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    # Check if user has access (creator or public)
    quiz_creator = quiz.get('creator')
    is_public = quiz.get('public', False)
    
    if quiz_creator != username and not is_public:
        return jsonify({'error': 'Access denied'}), 403
    
    from app import create_app
    app = create_app()
    quiz_file = app.config['QUIZES_FOLDER'] / f'{quiz_name}.json'
    
    return send_file(quiz_file, as_attachment=True, download_name=f'{quiz_name}.json')

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
        
        quiz_name = quiz_data.get('name', file.filename.replace('.json', ''))
        # Track creator for uploaded quizzes
        quiz_data['creator'] = session.get('username')
        # Preserve public status if it exists, otherwise default to False
        if 'public' not in quiz_data:
            quiz_data['public'] = False
        result = save_quiz(quiz_name, quiz_data)
        
        if result['success']:
            return jsonify({'message': 'Quiz uploaded', 'name': quiz_name}), 200
        else:
            return jsonify({'error': result['error']}), 400
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON file'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/toggle-public/<quiz_name>', methods=['POST'])
def toggle_quiz_public(quiz_name):
    """Toggle public status of a quiz (quizmaster only, must be creator)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    quiz = load_quiz(quiz_name)
    
    if not quiz:
        return jsonify({'error': 'Quiz not found'}), 404
    
    # Only creator can toggle public status
    if quiz.get('creator') != username:
        return jsonify({'error': 'Only the creator can change public status'}), 403
    
    # Toggle public status
    quiz['public'] = not quiz.get('public', False)
    result = save_quiz(quiz_name, quiz)
    
    if result['success']:
        return jsonify({'message': 'Public status updated', 'public': quiz['public']}), 200
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
    from app.utils.room_manager import get_room
    room = get_room(room_code)
    
    if not room:
        return jsonify({'error': 'Room not found or expired'}), 404
    
    if room.get('quizmaster') != username:
        return jsonify({'error': 'Only the quizmaster who started this quiz can end it'}), 403
    
    # End the room - use the same logic as websocket handler
    from app.utils.scoring import calculate_score
    from app.utils.stats import record_quiz_run
    from app import socketio
    
    # Calculate final scores
    scores = calculate_score(room)
    room['scores'] = scores
    room['ended'] = True
    
    # Record quiz run completion
    quiz_name = room.get('quiz_name')
    record_quiz_run(quiz_name, username, room_code, completed=True)
    
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
    
    # Mark room as ended
    end_room(room_code)
    
    return jsonify({'message': 'Quiz ended successfully'}), 200

