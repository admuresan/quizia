"""
WebSocket routes for real-time communication.
"""
from flask import Blueprint, session, request
from flask_socketio import emit, join_room, leave_room, close_room
from app import socketio
from app.utils.room_manager import (
    create_room,
    get_room,
    end_room,
    add_participant,
    remove_participant,
    get_participants,
    find_participant_by_combo,
    update_room_state,
    save_room_state_now
)
from app.utils.scoring import calculate_score
import time

bp = Blueprint('websocket', __name__)

def check_quizmaster_access(room_code, emit_error=True):
    """
    Check if current user is the EXACT quizmaster who started this specific quiz instance.
    
    For example, if room_code 4567 was started by "bob", only "bob" can access it.
    Even if "alice" is also a quizmaster, she cannot access room_code 4567's control functions.
    
    Args:
        room_code: The room code for the quiz instance
        emit_error: Whether to emit an error message if access is denied
    
    Returns:
        True if user is the quizmaster who started this quiz, False otherwise
    """
    # First check: User must be logged in as a quizmaster
    if not session.get('is_quizmaster'):
        if emit_error:
            emit('error', {'message': 'Access denied. You must be logged in as a quizmaster.'})
        return False
    
    # Second check: Room must exist
    room = get_room(room_code)
    if not room:
        if emit_error:
            emit('error', {'message': 'Room not found or expired'})
        return False
    
    # Third check: User must be the EXACT quizmaster who started THIS specific quiz instance
    username = session.get('username')
    room_quizmaster = room.get('quizmaster')  # The username who started this specific quiz instance
    
    if room_quizmaster != username:
        if emit_error:
            emit('error', {'message': f'Access denied. This quiz (Room: {room_code}) was started by "{room_quizmaster}". Only that user can perform control actions.'})
        return False
    
    return True

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
    """
    Quizmaster starts a quiz session.
    
    IMPORTANT: Must receive quiz_id (not quiz_name). Multiple quizzes can have the same name,
    so we always identify quizzes by their unique ID.
    """
    quiz_id = data.get('quiz_id')
    if not quiz_id:
        emit('error', {'message': 'Quiz ID required. Quiz name cannot be used - multiple quizzes can share the same name.'})
        return
    
    # Load quiz by ID (never by name)
    from app.utils.quiz_storage import load_quiz
    quiz = load_quiz(quiz_id)
    if not quiz:
        emit('error', {'message': f'Quiz not found with ID: {quiz_id}'})
        return
    
    quizmaster_username = session.get('username', 'unknown')
    quiz_name = quiz.get('name', 'Unknown Quiz')  # Name is only for display
    
    # Initialize visibility states for all elements in all pages
    # This ensures display page respects control visibility settings from the start
    for page in quiz.get('pages', []):
        if page.get('elements'):
            for element_id, element_data in page['elements'].items():
                appearance_config = element_data.get('appearance_config', {})
                appearance_type = appearance_config.get('appearance_type', 'on_load')
                
                # Set initial visibility based on appearance_type
                if appearance_type == 'control':
                    element_data['appearance_visible'] = False  # Control mode starts hidden
                elif appearance_type == 'timer':
                    element_data['appearance_visible'] = False  # Timer mode starts hidden
                else:
                    element_data['appearance_visible'] = True  # on_load starts visible
    
    # Create room (stores both quiz_id and quiz_name - quiz_id is the authoritative identifier)
    room_code = create_room(quiz_id, quiz_name, quiz, quizmaster_username)
    
    # Record quiz run start (use quiz_id, not quiz_name)
    from app.utils.stats import record_quiz_run
    import time
    record_quiz_run(quiz_id, quizmaster_username, room_code, completed=False)
    
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
    
    # Check if user is logged in as quizmaster
    if not session.get('is_quizmaster'):
        emit('error', {'message': 'Access denied. You must be logged in as a quizmaster.'})
        return
    
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found or expired'})
        return
    
    # Check if user is the quizmaster who started this quiz
    username = session.get('username')
    room_quizmaster = room.get('quizmaster')
    
    if room_quizmaster != username:
        emit('error', {'message': 'Access denied. Only the quizmaster who started this quiz can access the control page.'})
        return
    
    join_room(f'control_{room_code}')
    
    # Get current page
    quiz = room.get('quiz', {})
    pages = quiz.get('pages', [])
    current_page_index = room.get('current_page', 0)
    current_page = pages[current_page_index] if current_page_index < len(pages) else None
    
    # Get participants dictionary for control page
    participants_dict = {pid: {'name': p.get('name'), 'avatar': p.get('avatar')} 
                         for pid, p in room.get('participants', {}).items()}
    
    # Debug: Log participant IDs being sent
    print(f"[DEBUG] joined_control for room {room_code}: participant IDs = {list(participants_dict.keys())}")
    print(f"[DEBUG] Total participants in room: {len(room.get('participants', {}))}")
    
    emit('joined_control', {
        'room_code': room_code,
        'quiz': quiz,
        'current_page': current_page_index,  # Always send to keep views in sync
        'page': current_page,
        'scores': room.get('scores', {}),
        'participants': participants_dict,
        'answers': room.get('answers', {})  # Send all submitted answers
    })

@socketio.on('quizmaster_rerender_quiz')
def handle_quizmaster_rerender_quiz(data):
    """Quizmaster reloads quiz from file and updates running quiz."""
    room_code = data.get('room_code')
    if not room_code:
        emit('error', {'message': 'Room code required'})
        return
    
    # Check access
    if not check_quizmaster_access(room_code):
        return
    
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found or expired'})
        return
    
    # Get quiz_id from room
    quiz_id = room.get('quiz_id')
    if not quiz_id:
        emit('error', {'message': 'Quiz ID not found in room'})
        return
    
    # Reload quiz from file
    from app.utils.quiz_storage import load_quiz
    updated_quiz = load_quiz(quiz_id)
    if not updated_quiz:
        emit('error', {'message': f'Failed to load quiz with ID: {quiz_id}'})
        return
    
    # Preserve visibility states from old quiz before updating
    old_quiz = room.get('quiz', {})
    visibility_states = {}  # {page_index: {element_id: appearance_visible}}
    for old_page_idx, old_page in enumerate(old_quiz.get('pages', [])):
        if old_page.get('elements'):
            visibility_states[old_page_idx] = {}
            for element_id, element_data in old_page['elements'].items():
                if 'appearance_visible' in element_data:
                    visibility_states[old_page_idx][element_id] = element_data['appearance_visible']
    
    # Update room's quiz data
    room['quiz'] = updated_quiz
    # Update quiz_name in case it changed
    room['quiz_name'] = updated_quiz.get('name', 'Unknown Quiz')
    
    # RESET visibility states to defaults from editor settings when rerendering
    # This ensures rerender starts fresh with default visibility from editor
    for page_idx, page in enumerate(updated_quiz.get('pages', [])):
        if page.get('elements'):
            for element_id, element_data in page['elements'].items():
                # Always reset to defaults when rerendering (don't preserve previous state)
                appearance_config = element_data.get('appearance_config', {})
                appearance_type = appearance_config.get('appearance_type', 'on_load')
                
                # Set initial visibility based on appearance_type (editor defaults)
                if appearance_type == 'control':
                    element_data['appearance_visible'] = False  # Control mode starts hidden
                elif appearance_type == 'timer':
                    element_data['appearance_visible'] = False  # Timer mode starts hidden
                else:
                    element_data['appearance_visible'] = True  # on_load starts visible
                
                # Reset media playing state to False when rerendering
                is_media = (element_data.get('type') in ['audio', 'video', 'counter'] or 
                           element_data.get('media_type') in ['audio', 'video'])
                if is_media:
                    element_data['media_playing'] = False
    
    # Ensure current_page is still valid after reload
    pages = updated_quiz.get('pages', [])
    current_page_index = room.get('current_page', 0)
    if current_page_index >= len(pages):
        # Current page is out of bounds, reset to 0
        current_page_index = 0
        room['current_page'] = 0
        room['page_start_time'] = time.time()
    
    room['last_activity'] = time.time()
    save_room_state_now(room_code)
    
    # Clear TV display render cache so it gets fresh image
    try:
        from app.utils.display_renderer import clear_cache
        clear_cache(room_code)
    except Exception as e:
        print(f"Warning: Failed to clear TV display cache: {e}")
    
    # Get current page
    current_page = pages[current_page_index] if current_page_index < len(pages) else None
    
    # Get participants dictionary for control page
    participants_dict = {pid: {'name': p.get('name'), 'avatar': p.get('avatar')} 
                         for pid, p in room.get('participants', {}).items()}
    room_scores = room.get('scores', {})
    
    # Broadcast updated quiz to control view
    emit('quiz_state', {
        'quiz': updated_quiz,
        'current_page': current_page_index,
        'answers': room.get('answers', {})
    }, room=f'control_{room_code}')
    
    # Also emit page_changed for control view (some handlers might listen to this)
    emit('page_changed', {
        'page_index': current_page_index,
        'page': current_page,
        'quiz': updated_quiz
    }, room=f'control_{room_code}')
    
    # Broadcast to display view
    emit('display_state', {
        'room_code': room_code,
        'current_page': current_page_index,
        'page': current_page,
        'quiz': updated_quiz,
        'participants': participants_dict,
        'scores': room_scores
    }, room=f'display_{room_code}')
    
    # Also emit page_changed for display view
    emit('page_changed', {
        'page_index': current_page_index,
        'page': current_page,
        'quiz': updated_quiz,
        'participants': participants_dict,
        'scores': room_scores
    }, room=f'display_{room_code}')
    
    # Broadcast to participant views
    emit('page_changed', {
        'page_index': current_page_index,
        'page': current_page,
        'quiz': updated_quiz
    }, room=f'participant_{room_code}')

@socketio.on('participant_join')
def handle_participant_join(data):
    """Participant joins a quiz room."""
    room_code = data.get('room_code')
    name = data.get('name')
    avatar = data.get('avatar')
    participant_id = data.get('participant_id')  # For rejoining (legacy support)
    
    if not room_code:
        emit('error', {'message': 'Room code required'})
        return
    
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'No such quiz is currently running'})
        emit('quiz_not_running', {'room_code': room_code})
        return
    
    # Check if room is ended
    if room.get('ended', False):
        emit('error', {'message': 'No such quiz is currently running'})
        emit('quiz_not_running', {'room_code': room_code})
        return
    
    # Add participant
    if participant_id:
        # Rejoining with explicit participant_id (legacy support)
        participant = room.get('participants', {}).get(participant_id)
        if participant:
            participant['connected'] = True
            participant['socket_id'] = request.sid
            room['last_activity'] = time.time()
            # Save room state when participant rejoins
            save_room_state_now(room_code)
        else:
            emit('error', {'message': 'Participant not found'})
            return
    else:
        # New participant - check if name+avatar combo already exists
        if not name or not avatar:
            emit('error', {'message': 'Name and avatar required'})
            return
        
        # Check if combo already exists
        from app.utils.room_manager import find_participant_by_combo
        existing_id = find_participant_by_combo(room_code, name, avatar)
        if existing_id:
            # Combo already exists - this is a rejoin
            participant = room.get('participants', {}).get(existing_id)
            if participant:
                participant['connected'] = True
                participant['socket_id'] = request.sid
                participant_id = existing_id
                room['last_activity'] = time.time()
                save_room_state_now(room_code)
            else:
                emit('error', {'message': 'Participant profile found but data corrupted'})
                return
        else:
            # New participant - try to add
            participant_id = add_participant(room_code, name, avatar, request.sid)
            if not participant_id:
                # Combo was taken between check and add (race condition) - treat as rejoin
                existing_id = find_participant_by_combo(room_code, name, avatar)
                if existing_id:
                    participant = room.get('participants', {}).get(existing_id)
                    participant['connected'] = True
                    participant['socket_id'] = request.sid
                    participant_id = existing_id
                    room['last_activity'] = time.time()
                    save_room_state_now(room_code)
                else:
                    emit('error', {'message': 'This name and avatar combination is already taken. Please choose a different combination.'})
                    return
    
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
    
    # Get this participant's current score
    # Prefer room['scores'] if it exists, otherwise use participant['score'], or calculate if needed
    participant_score = 0
    if 'scores' in room and participant_id in room['scores']:
        participant_score = room['scores'][participant_id]
    elif participant and 'score' in participant:
        participant_score = participant['score']
    else:
        # Calculate score if not available
        from app.utils.scoring import calculate_score
        scores = calculate_score(room)
        participant_score = scores.get(participant_id, 0)
    
    # Get this participant's submitted answers
    participant_answers = {}
    room_answers = room.get('answers', {})
    for question_id, question_answers in room_answers.items():
        if participant_id in question_answers:
            participant_answers[question_id] = question_answers[participant_id]
    
    # Send current state - always include current_page to ensure synchronization
    emit('joined_room', {
        'room_code': room_code,
        'participant_id': participant_id,
        'participant_name': participant_name,
        'participant_avatar': participant_avatar,
        'participant_score': participant_score,  # Include participant's current score
        'current_page': current_page_index,  # Always send to keep views in sync
        'page': current_page,
        'quiz': quiz,
        'state': room.get('state', {}),
        'submitted_answers': participant_answers  # Send this participant's submitted answers
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
        emit('error', {'message': 'No such quiz is currently running'})
        emit('quiz_not_running', {'room_code': room_code})
        return
    
    # Check if room is ended
    if room.get('ended', False):
        emit('error', {'message': 'No such quiz is currently running'})
        emit('quiz_not_running', {'room_code': room_code})
        return
    
    join_room(f'display_{room_code}')
    
    # Get current page data
    quiz = room.get('quiz', {})
    pages = quiz.get('pages', [])
    current_page_index = room.get('current_page', 0)
    current_page = pages[current_page_index] if current_page_index < len(pages) else None
    
    # Debug: Log what we're sending
    print(f"[DEBUG] Display join for room {room_code}: quiz has {len(pages)} pages, current_page={current_page_index}")
    if quiz:
        print(f"[DEBUG] Quiz keys: {list(quiz.keys())}")
    if current_page:
        elements = current_page.get('elements', {})
        elements_count = len(elements) if isinstance(elements, dict) else 0
        print(f"[DEBUG] Current page type: {current_page.get('type')}, elements: {elements_count}")
    
    # Get participants and scores for status page
    participants_dict = {pid: {'name': p.get('name'), 'avatar': p.get('avatar')}
                          for pid, p in room.get('participants', {}).items()}
    scores = room.get('scores', {})
    
    # Get active answer overlay state if any
    answer_overlay = room.get('answer_overlay', {})
    if answer_overlay and answer_overlay.get('visible'):
        # Get answers and participants for the overlay
        question_id = answer_overlay.get('question_id')
        overlay_answers = room.get('answers', {}).get(question_id, {}) if question_id else {}
        
        # Send overlay state with display_state so it can be recreated on page load
        answer_overlay_with_data = answer_overlay.copy()
        answer_overlay_with_data['answers'] = overlay_answers
        answer_overlay_with_data['participants'] = participants_dict
    else:
        answer_overlay_with_data = None
    
    # Send current state
    emit('display_state', {
        'room_code': room_code,
        'current_page': current_page_index,
        'page': current_page,
        'quiz': quiz,
        'state': room.get('state', {}),
        'participants': participants_dict,
        'scores': scores,
        'answer_overlay': answer_overlay_with_data  # Include overlay state
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
    
    # Check authorization
    if not check_quizmaster_access(room_code):
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
    # Reset question start times when page changes
    if 'question_start_times' not in room:
        room['question_start_times'] = {}
    room['last_activity'] = time.time()
    
    # Preserve visibility states when navigating - only set defaults if not already set
    # This ensures user-set visibility toggles are preserved when navigating between pages
    current_page = pages[new_index] if new_index < len(pages) else None
    if current_page and current_page.get('elements'):
        for element_id, element_data in current_page['elements'].items():
            # Only set defaults if appearance_visible is not already set (preserve user-set state)
            if 'appearance_visible' not in element_data:
                appearance_config = element_data.get('appearance_config', {})
                appearance_type = appearance_config.get('appearance_type', 'on_load')
                
                # Set initial visibility based on appearance_type (editor defaults)
                if appearance_type == 'control':
                    element_data['appearance_visible'] = False  # Control mode starts hidden
                elif appearance_type == 'timer':
                    element_data['appearance_visible'] = False  # Timer mode starts hidden
                else:
                    element_data['appearance_visible'] = True  # on_load starts visible
    
    # Save room state when page changes
    save_room_state_now(room_code)
    
    # Clear TV display render cache so it gets fresh image
    try:
        from app.utils.display_renderer import clear_cache
        clear_cache(room_code)
    except Exception as e:
        print(f"Warning: Failed to clear TV display cache: {e}")
    
    # Get participants and scores for status page
    participants_dict = {pid: {'name': p.get('name'), 'avatar': p.get('avatar')}
                          for pid, p in room.get('participants', {}).items()}
    room_scores = room.get('scores', {})
    
    # Broadcast to all views
    emit('page_changed', {
        'page_index': new_index,
        'page': current_page,
        'quiz': quiz,
        'participants': participants_dict,
        'scores': room_scores
    }, room=f'display_{room_code}')
    
    emit('page_changed', {
        'page_index': new_index,
        'page': current_page,
        'quiz': quiz
    }, room=f'participant_{room_code}')
    
    emit('page_changed', {
        'page_index': new_index,
        'page': current_page,
        'quiz': room.get('quiz')  # Include full quiz for all elements
    }, room=f'control_{room_code}')
    
    # Also send quiz_state to control to ensure it has all data
    emit('quiz_state', {
        'quiz': room.get('quiz'),
        'current_page': new_index,
        'answers': room.get('answers', {})  # Include answers
    }, room=f'control_{room_code}')

@socketio.on('question_visible')
def handle_question_visible(data):
    """Display page notifies that a question has become visible."""
    room_code = data.get('room_code')
    question_id = data.get('question_id')
    
    if not all([room_code, question_id]):
        return
    
    room = get_room(room_code)
    if not room:
        return
    
    # Initialize question_start_times if it doesn't exist
    if 'question_start_times' not in room:
        room['question_start_times'] = {}
    
    # Only set the start time if it hasn't been set yet (first time question becomes visible)
    if question_id not in room['question_start_times']:
        room['question_start_times'][question_id] = time.time()
        room['last_activity'] = time.time()
        save_room_state_now(room_code)

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
    
    # Record submission time - use question-specific start time if available,
    # otherwise fall back to page_start_time
    question_start_times = room.get('question_start_times', {})
    if question_id in question_start_times:
        question_start_time = question_start_times[question_id]
    else:
        # Fallback to page_start_time if question hasn't been marked as visible yet
        question_start_time = room.get('page_start_time', time.time())
    
    submission_time = time.time() - question_start_time
    
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
    room['last_activity'] = time.time()
    # Save room state when answers are submitted
    save_room_state_now(room_code)
    
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
    
    # Also send updated participants list to control for answer display
    participants_dict_update = {pid: {'name': p.get('name'), 'avatar': p.get('avatar')} 
                               for pid, p in room.get('participants', {}).items()}
    
    # Debug: Log participant IDs being sent
    print(f"[DEBUG] participant_list_update for room {room_code}: participant IDs = {list(participants_dict_update.keys())}")
    print(f"[DEBUG] Total participants in room: {len(room.get('participants', {}))}")
    
    emit('participant_list_update', {
        'participants': participants_dict_update
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
    
    # Check authorization
    if not check_quizmaster_access(room_code):
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
    
    # Recalculate scores for all participants
    scores = calculate_score(room)
    room['scores'] = scores
    room['last_activity'] = time.time()
    
    # Update all participant scores in the participants dictionary
    for pid, participant in room.get('participants', {}).items():
        participant['score'] = scores.get(pid, 0)
    
    # Save room state when scores are updated
    save_room_state_now(room_code)
    
    # Clear TV display render cache (scores affect status/result pages)
    try:
        from app.utils.display_renderer import clear_cache
        clear_cache(room_code)
    except Exception as e:
        print(f"Warning: Failed to clear TV display cache: {e}")
    
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
    
    # Check authorization
    if not check_quizmaster_access(room_code):
        return
    
    # Broadcast to display FIRST (before any blocking operations)
    # This ensures immediate response for play/pause actions
    emit('element_control', {
        'element_id': element_id,
        'action': action
    }, room=f'display_{room_code}')
    
    # Also broadcast to control room so media controls update
    if action in ['play', 'pause']:
        emit('element_media_control', {
            'element_id': element_id,
            'playing': action == 'play'
        }, room=f'control_{room_code}')
    
    # Update media playing state AFTER broadcasting (non-blocking for user experience)
    # This happens in the background and doesn't delay the play action
    if action in ['play', 'pause']:
        room = get_room(room_code)
        if room:
            for page in room['quiz']['pages']:
                elements = page.get('elements', {})
                if element_id in elements:
                    element = elements[element_id]
                    # Check if this is a media element or counter
                    is_media = (element.get('type') in ['audio', 'video', 'counter'] or 
                               element.get('media_type') in ['audio', 'video'])
                    if is_media:
                        element['media_playing'] = (action == 'play')
                        # Save room state after broadcast (non-blocking)
                        save_room_state_now(room_code)  # Persist the change
                    break
    
    # Clear TV display render cache if showing/hiding elements
    if action in ['show', 'hide']:
        try:
            from app.utils.display_renderer import clear_cache
            clear_cache(room_code)
        except Exception as e:
            print(f"Warning: Failed to clear TV display cache: {e}")

@socketio.on('quizmaster_control_element_appearance')
def handle_control_element_appearance(data):
    """Quizmaster controls element appearance (show/hide via control mode)."""
    room_code = data.get('room_code')
    element_id = data.get('element_id')
    visible = data.get('visible')
    
    if not all([room_code, element_id, visible is not None]):
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Check authorization
    if not check_quizmaster_access(room_code):
        return
    
    # Update the element's visibility state in the room data
    room = get_room(room_code)
    if room:
        for page in room['quiz']['pages']:
            elements = page.get('elements', {})
            # Elements is a dict with element IDs as keys
            if element_id in elements:
                element = elements[element_id]
                element['appearance_visible'] = visible
                # If it's a question, also update its answer_input's visibility
                if element.get('is_question'):
                    for child_id, child_element in elements.items():
                        if child_element.get('parent_id') == element_id and child_element.get('type') == 'answer_input':
                            child_element['appearance_visible'] = visible
                break
        update_room_state(room_code, room['quiz']) # Persist the change
    
    # Clear TV display render cache so it gets fresh image
    try:
        from app.utils.display_renderer import clear_cache
        clear_cache(room_code)
    except Exception as e:
        print(f"Warning: Failed to clear TV display cache: {e}")
    
    # Broadcast to display
    emit('element_appearance_control', {
        'element_id': element_id,
        'visible': visible
    }, room=f'display_{room_code}')
    
    # Also broadcast to control room so toggles update
    emit('element_appearance_control', {
        'element_id': element_id,
        'visible': visible
    }, room=f'control_{room_code}')
    
    # Broadcast to participant room so answer elements can be hidden/shown
    # When a question element is hidden on display, its answer should be hidden on participant page
    emit('element_appearance_control', {
        'element_id': element_id,
        'visible': visible
    }, room=f'participant_{room_code}')

@socketio.on('element_appearance_changed')
def handle_element_appearance_changed(data):
    """Display screen notifies that an element appeared via timer/delay.
    
    This is different from control toggles - timers on display can update visibility
    and the server will sync this to control. Control remains the source of truth
    for manual toggles, but timer-based changes are accepted from display.
    """
    room_code = data.get('room_code')
    element_id = data.get('element_id')
    visible = data.get('visible')
    
    if not all([room_code, element_id, visible is not None]):
        return
    
    # Update the element's visibility state in the room data (timer-based changes)
    room = get_room(room_code)
    if room:
        for page in room['quiz']['pages']:
            elements = page.get('elements', {})
            if element_id in elements:
                elements[element_id]['appearance_visible'] = visible
                break
        update_room_state(room_code, room['quiz'])
    
    # Clear TV display render cache so it gets fresh image
    try:
        from app.utils.display_renderer import clear_cache
        clear_cache(room_code)
    except Exception as e:
        print(f"Warning: Failed to clear TV display cache: {e}")
    
    # Broadcast to control room so toggles update (timer-based visibility change)
    emit('element_appearance_control', {
        'element_id': element_id,
        'visible': visible
    }, room=f'control_{room_code}')
    
    # Broadcast to display room so element becomes visible (triggered by control toggle change)
    emit('element_appearance_control', {
        'element_id': element_id,
        'visible': visible
    }, room=f'display_{room_code}')
    
    # Broadcast to participant room so answer elements appear when questions appear on display
    emit('element_appearance_changed', {
        'element_id': element_id,
        'visible': visible
    }, room=f'participant_{room_code}')

@socketio.on('stopwatch_start_trigger')
def handle_stopwatch_start_trigger(data):
    """Display screen triggers stopwatch start for a question.
    
    This is called when a stopwatch question should auto-start based on timer_start_method.
    """
    room_code = data.get('room_code')
    question_id = data.get('question_id')
    trigger_type = data.get('trigger_type')
    
    if not all([room_code, question_id, trigger_type]):
        return
    
    # Broadcast to participant room to start the stopwatch
    emit('stopwatch_start', {
        'question_id': question_id,
        'trigger_type': trigger_type
    }, room=f'participant_{room_code}')

@socketio.on('quizmaster_toggle_answer_display')
def handle_toggle_answer_display(data):
    """Quizmaster toggles answer display on display screen."""
    room_code = data.get('room_code')
    question_id = data.get('question_id')
    visible = data.get('visible')
    
    if not all([room_code, question_id, visible is not None]):
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Check authorization
    if not check_quizmaster_access(room_code):
        return
    
    # Get room to access answers and participants
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found'})
        return
    
    # Get answers and participants from room if not provided
    answers = data.get('answers') or room.get('answers', {}).get(question_id, {})
    participants_dict = data.get('participants') or {pid: {'name': p.get('name'), 'avatar': p.get('avatar')}
                                                      for pid, p in room.get('participants', {}).items()}
    
    # Get answer visibility state and correct answer from data
    answer_visibility = data.get('answerVisibility', {})
    correct_answer = data.get('correctAnswer')
    
    # Store overlay state in room data so it can be recreated on page load
    if 'answer_overlay' not in room:
        room['answer_overlay'] = {}
    
    if visible:
        # Store active overlay state
        room['answer_overlay'] = {
            'question_id': question_id,
            'visible': True,
            'questionTitle': data.get('questionTitle', 'Question'),
            'answerType': data.get('answerType', 'text'),
            'imageSrc': data.get('imageSrc'),
            'answerVisibility': answer_visibility,
            'correctAnswer': correct_answer
        }
    else:
        # Clear overlay state
        room['answer_overlay'] = {}
    
    # Save room state
    save_room_state_now(room_code)
    
    # Clear TV display render cache so it gets fresh image
    try:
        from app.utils.display_renderer import clear_cache
        clear_cache(room_code)
    except Exception as e:
        print(f"Warning: Failed to clear TV display cache: {e}")
    
    # Broadcast to display room
    emit('answer_display_toggle', {
        'question_id': question_id,
        'visible': visible,
        'questionTitle': data.get('questionTitle', 'Question'),
        'answers': answers,
        'participants': participants_dict,
        'answerType': data.get('answerType', 'text'),
        'imageSrc': data.get('imageSrc'),
        'answerVisibility': answer_visibility,
        'correctAnswer': correct_answer
    }, room=f'display_{room_code}')

@socketio.on('quizmaster_end_quiz')
def handle_end_quiz(data):
    """Quizmaster ends the quiz."""
    room_code = data.get('room_code')
    if not room_code:
        emit('error', {'message': 'Room code required'})
        return
    
    # Check authorization
    if not check_quizmaster_access(room_code):
        return
    
    # Calculate final scores
    room = get_room(room_code)
    if room:
        scores = calculate_score(room)
        room['scores'] = scores
        room['ended'] = True
        room['last_activity'] = time.time()
        # Don't save state - we're about to delete the room file
        
        # Record quiz run completion (use quiz_id, not quiz_name)
        from app.utils.stats import record_quiz_run
        quiz_id = room.get('quiz_id')
        quizmaster_username = room.get('quizmaster', session.get('username', 'unknown'))
        if quiz_id:
            record_quiz_run(quiz_id, quizmaster_username, room_code, completed=True)
        
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
        
        # Disconnect all clients from the rooms
        close_room(f'display_{room_code}')
        close_room(f'participant_{room_code}')
        close_room(f'control_{room_code}')
    
    # End and remove the room
    end_room(room_code)

@socketio.on('quizmaster_finalize_scores')
def handle_finalize_scores(data):
    """Quizmaster finalizes scores on results page."""
    room_code = data.get('room_code')
    if not room_code:
        emit('error', {'message': 'Room code required'})
        return
    
    # Check authorization
    if not check_quizmaster_access(room_code):
        return
    
    # Calculate final scores
    room = get_room(room_code)
    if not room:
        emit('error', {'message': 'Room not found'})
        return
    
    scores = calculate_score(room)
    room['scores'] = scores
    room['last_activity'] = time.time()
    
    # Update all participant scores in the participants dictionary
    for pid, participant in room.get('participants', {}).items():
        participant['score'] = scores.get(pid, 0)
    
    # Save room state when scores are finalized
    save_room_state_now(room_code)
    
    # Clear TV display render cache (final scores affect result pages)
    try:
        from app.utils.display_renderer import clear_cache
        clear_cache(room_code)
    except Exception as e:
        print(f"Warning: Failed to clear TV display cache: {e}")
    
    # Get final rankings
    final_rankings = get_final_rankings(room)
    
    # Get winner (first in rankings)
    winner_id = final_rankings[0]['id'] if final_rankings else None
    
    # Broadcast final scores to display page
    emit('final_scores_finalized', {
        'final_rankings': final_rankings,
        'scores': scores
    }, room=f'display_{room_code}')
    
    # Broadcast to control page
    emit('final_scores_finalized', {
        'final_rankings': final_rankings,
        'scores': scores
    }, room=f'control_{room_code}')
    
    # Broadcast winner event to participants
    if winner_id:
        emit('winner_announced', {
            'winner_id': winner_id,
            'final_rankings': final_rankings,
            'scores': scores
        }, room=f'participant_{room_code}')

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

