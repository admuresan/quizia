"""
WebSocket routes for real-time communication.
"""
from flask import Blueprint, session, request
from flask_socketio import emit, join_room, leave_room
from app import socketio
from app.utils.room_manager import (
    create_room,
    get_room,
    end_room,
    add_participant,
    remove_participant,
    get_participants,
    update_room_state
)
from app.utils.scoring import calculate_score
import time

bp = Blueprint('websocket', __name__)

@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    emit('connected', {'message': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    # Clean up participant if they were in a room
    pass

@socketio.on('quizmaster_start_quiz')
def handle_start_quiz(data):
    """Quizmaster starts a quiz session."""
    quiz_name = data.get('quiz_name')
    if not quiz_name:
        emit('error', {'message': 'Quiz name required'})
        return
    
    # Load quiz
    from app.utils.quiz_storage import load_quiz
    quiz = load_quiz(quiz_name)
    if not quiz:
        emit('error', {'message': 'Quiz not found'})
        return
    
    quizmaster_username = session.get('username', 'unknown')
    
    # Create room
    room_code = create_room(quiz_name, quiz, quizmaster_username)
    
    # Record quiz run start
    from app.utils.stats import record_quiz_run
    import time
    record_quiz_run(quiz_name, quizmaster_username, room_code, completed=False)
    
    emit('quiz_started', {'room_code': room_code})
    
    # Join quizmaster to control room
    join_room(f'control_{room_code}')
    emit('room_created', {'room_code': room_code}, room=f'control_{room_code}')
    
    # Redirect quizmaster to control page
    emit('redirect', {'url': f'/control/{room_code}'}, room=f'control_{room_code}')

@socketio.on('quizmaster_join_control')
def handle_quizmaster_join_control(data):
    """Quizmaster joins control room."""
    room_code = data.get('room_code')
    if not room_code:
        emit('error', {'message': 'Room code required'})
        return
    
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found'})
        return
    
    join_room(f'control_{room_code}')
    emit('joined_control', {
        'room_code': room_code,
        'quiz': room.get('quiz')  # Send quiz data when joining
    })

@socketio.on('participant_join')
def handle_participant_join(data):
    """Participant joins a quiz room."""
    room_code = data.get('room_code')
    name = data.get('name')
    avatar = data.get('avatar')
    participant_id = data.get('participant_id')  # For rejoining
    
    if not room_code:
        emit('error', {'message': 'Room code required'})
        return
    
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found or expired'})
        return
    
    # Add participant
    if participant_id:
        # Rejoining
        participant = room.get('participants', {}).get(participant_id)
        if participant:
            participant['connected'] = True
            participant['socket_id'] = request.sid
        else:
            emit('error', {'message': 'Participant not found'})
            return
    else:
        # New participant
        if not name or not avatar:
            emit('error', {'message': 'Name and avatar required'})
            return
        
        participant_id = add_participant(room_code, name, avatar, request.sid)
    
    # Join rooms
    join_room(f'participant_{room_code}')
    join_room(f'display_{room_code}')
    
    # Get current page data
    quiz = room.get('quiz', {})
    pages = quiz.get('pages', [])
    current_page_index = room.get('current_page', 0)
    current_page = pages[current_page_index] if current_page_index < len(pages) else None
    
    # Get participant info for the response
    participant = room.get('participants', {}).get(participant_id)
    participant_name = participant.get('name') if participant else name
    participant_avatar = participant.get('avatar') if participant else avatar
    
    # Send current state
    emit('joined_room', {
        'room_code': room_code,
        'participant_id': participant_id,
        'participant_name': participant_name,
        'participant_avatar': participant_avatar,
        'current_page': current_page_index,
        'page': current_page,
        'state': room.get('state', {})
    })
    
    # Notify others
    emit('participant_joined', {
        'participant_id': participant_id,
        'name': name or room['participants'][participant_id]['name'],
        'avatar': avatar or room['participants'][participant_id]['avatar']
    }, room=f'control_{room_code}')

@socketio.on('display_join')
def handle_display_join(data):
    """Display view joins a quiz room."""
    room_code = data.get('room_code')
    if not room_code:
        emit('error', {'message': 'Room code required'})
        return
    
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found'})
        return
    
    join_room(f'display_{room_code}')
    
    # Get current page data
    quiz = room.get('quiz', {})
    pages = quiz.get('pages', [])
    current_page_index = room.get('current_page', 0)
    current_page = pages[current_page_index] if current_page_index < len(pages) else None
    
    # Send current state
    emit('display_state', {
        'room_code': room_code,
        'current_page': current_page_index,
        'page': current_page,
        'state': room.get('state', {})
    })

@socketio.on('quizmaster_navigate')
def handle_navigate(data):
    """Quizmaster navigates to a different page."""
    room_code = data.get('room_code')
    page_index = data.get('page_index')
    direction = data.get('direction')  # 'next' or 'prev'
    
    if not room_code:
        emit('error', {'message': 'Room code required'})
        return
    
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found'})
        return
    
    quiz = room.get('quiz', {})
    pages = quiz.get('pages', [])
    
    if direction == 'next':
        new_index = min(room.get('current_page', 0) + 1, len(pages) - 1)
    elif direction == 'prev':
        new_index = max(room.get('current_page', 0) - 1, 0)
    elif page_index is not None:
        new_index = max(0, min(page_index, len(pages) - 1))
    else:
        emit('error', {'message': 'Invalid navigation'})
        return
    
    room['current_page'] = new_index
    room['page_start_time'] = time.time()
    
    current_page = pages[new_index] if new_index < len(pages) else None
    
    # Broadcast to all views
    emit('page_changed', {
        'page_index': new_index,
        'page': current_page
    }, room=f'display_{room_code}')
    
    emit('page_changed', {
        'page_index': new_index,
        'page': current_page
    }, room=f'participant_{room_code}')
    
    emit('page_changed', {
        'page_index': new_index,
        'page': current_page,
        'quiz': room.get('quiz')  # Include full quiz for audio controls
    }, room=f'control_{room_code}')

@socketio.on('participant_submit_answer')
def handle_submit_answer(data):
    """Participant submits an answer."""
    room_code = data.get('room_code')
    participant_id = data.get('participant_id')
    question_id = data.get('question_id')
    answer = data.get('answer')
    answer_type = data.get('answer_type')
    
    if not all([room_code, participant_id, question_id, answer is not None]):
        emit('error', {'message': 'Missing required fields'})
        return
    
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found'})
        return
    
    # Record submission time
    page_start_time = room.get('page_start_time', time.time())
    submission_time = time.time() - page_start_time
    
    # Store answer
    if 'answers' not in room:
        room['answers'] = {}
    
    if question_id not in room['answers']:
        room['answers'][question_id] = {}
    
    room['answers'][question_id][participant_id] = {
        'answer': answer,
        'submission_time': submission_time,
        'timestamp': time.time(),
        'correct': False,
        'bonus_points': 0
    }
    
    participant = room.get('participants', {}).get(participant_id)
    
    # Notify quizmaster
    emit('answer_submitted', {
        'participant_id': participant_id,
        'participant_name': participant.get('name') if participant else 'Unknown',
        'participant_avatar': participant.get('avatar') if participant else '👤',
        'question_id': question_id,
        'answer': answer,
        'answer_type': answer_type,
        'submission_time': submission_time,
        'timestamp': time.time()
    }, room=f'control_{room_code}')

@socketio.on('quizmaster_mark_answer')
def handle_mark_answer(data):
    """Quizmaster marks an answer as correct/incorrect."""
    room_code = data.get('room_code')
    participant_id = data.get('participant_id')
    question_id = data.get('question_id')
    correct = data.get('correct', False)
    bonus_points = data.get('bonus_points', 0)
    
    if not all([room_code, participant_id, question_id]):
        emit('error', {'message': 'Missing required fields'})
        return
    
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found'})
        return
    
    # Update answer
    if 'answers' not in room:
        room['answers'] = {}
    if question_id not in room['answers']:
        room['answers'][question_id] = {}
    if participant_id not in room['answers'][question_id]:
        emit('error', {'message': 'Answer not found'})
        return
    
    room['answers'][question_id][participant_id]['correct'] = correct
    room['answers'][question_id][participant_id]['bonus_points'] = bonus_points
    
    # Recalculate scores
    scores = calculate_score(room)
    room['scores'] = scores
    
    # Update participant score
    if participant_id in room.get('participants', {}):
        room['participants'][participant_id]['score'] = scores.get(participant_id, 0)
    
    # Broadcast score update
    emit('score_updated', {
        'scores': scores,
        'participant_id': participant_id,
        'question_id': question_id
    }, room=f'participant_{room_code}')
    
    emit('score_updated', {
        'scores': scores,
        'participant_id': participant_id,
        'question_id': question_id
    }, room=f'control_{room_code}')

@socketio.on('quizmaster_control_element')
def handle_control_element(data):
    """Quizmaster controls an element (show/hide/play/pause)."""
    room_code = data.get('room_code')
    element_id = data.get('element_id')
    action = data.get('action')  # 'show', 'hide', 'play', 'pause'
    
    if not all([room_code, element_id, action]):
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Broadcast to display
    emit('element_control', {
        'element_id': element_id,
        'action': action
    }, room=f'display_{room_code}')

@socketio.on('quizmaster_end_quiz')
def handle_end_quiz(data):
    """Quizmaster ends the quiz."""
    room_code = data.get('room_code')
    if not room_code:
        emit('error', {'message': 'Room code required'})
        return
    
    # Calculate final scores
    room = get_room(room_code)
    if room:
        scores = calculate_score(room)
        room['scores'] = scores
        room['ended'] = True
        
        # Record quiz run completion
        from app.utils.stats import record_quiz_run
        quiz_name = room.get('quiz_name')
        quizmaster_username = room.get('quizmaster', session.get('username', 'unknown'))
        record_quiz_run(quiz_name, quizmaster_username, room_code, completed=True)
        
        # Broadcast end to all
        emit('quiz_ended', {
            'scores': scores,
            'final_rankings': get_final_rankings(room)
        }, room=f'display_{room_code}')
        
        emit('quiz_ended', {
            'scores': scores,
            'final_rankings': get_final_rankings(room)
        }, room=f'participant_{room_code}')
        
        emit('quiz_ended', {
            'scores': scores,
            'final_rankings': get_final_rankings(room)
        }, room=f'control_{room_code}')
    
    end_room(room_code)

def get_final_rankings(room):
    """Get final rankings sorted by score."""
    participants = room.get('participants', {})
    scores = room.get('scores', {})
    
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
    
    return rankings

