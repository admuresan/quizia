"""
Room management utilities.
Handles quiz room creation, expiration, and participant management.
"""
import string
import random
import time
from datetime import datetime, timedelta
from threading import Lock

# In-memory storage for active rooms
rooms = {}
rooms_lock = Lock()

# Room expiration time: 3 hours in seconds
ROOM_EXPIRATION = 3 * 60 * 60

def generate_room_code():
    """Generate a unique 4-character alphanumeric room code."""
    characters = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choice(characters) for _ in range(4))
        with rooms_lock:
            if code not in rooms:
                return code

def create_room(quiz_name, quiz_data, quizmaster_username):
    """Create a new quiz room."""
    room_code = generate_room_code()
    
    room = {
        'code': room_code,
        'quiz_name': quiz_name,
        'quiz': quiz_data,
        'quizmaster': quizmaster_username,
        'created_at': time.time(),
        'last_activity': time.time(),
        'current_page': 0,
        'page_start_time': time.time(),
        'participants': {},
        'answers': {},
        'scores': {},
        'state': {},
        'ended': False
    }
    
    with rooms_lock:
        rooms[room_code] = room
    
    return room_code

def get_room(room_code):
    """Get a room by code. Returns None if not found or expired."""
    with rooms_lock:
        if room_code not in rooms:
            return None
        
        room = rooms[room_code]
        
        # Check expiration
        if time.time() - room['last_activity'] > ROOM_EXPIRATION:
            # Room expired - end it but don't delete quiz
            room['ended'] = True
            del rooms[room_code]
            return None
        
        # Update last activity
        room['last_activity'] = time.time()
        return room

def end_room(room_code):
    """End a room (but don't delete the quiz)."""
    with rooms_lock:
        if room_code in rooms:
            rooms[room_code]['ended'] = True
            # Don't delete immediately, let it expire naturally
            # Or delete after a short delay
            pass

def add_participant(room_code, name, avatar, socket_id):
    """Add a participant to a room."""
    room = get_room(room_code)
    if not room:
        return None
    
    import uuid
    participant_id = str(uuid.uuid4())
    
    participant = {
        'id': participant_id,
        'name': name,
        'avatar': avatar,
        'socket_id': socket_id,
        'joined_at': time.time(),
        'score': 0,
        'connected': True
    }
    
    with rooms_lock:
        room['participants'][participant_id] = participant
        room['last_activity'] = time.time()
    
    return participant_id

def remove_participant(room_code, participant_id):
    """Remove a participant from a room."""
    room = get_room(room_code)
    if not room:
        return False
    
    with rooms_lock:
        if participant_id in room['participants']:
            room['participants'][participant_id]['connected'] = False
            room['last_activity'] = time.time()
            return True
    
    return False

def get_participants(room_code):
    """Get all participants in a room."""
    room = get_room(room_code)
    if not room:
        return []
    
    return list(room.get('participants', {}).values())

def update_room_state(room_code, state_updates):
    """Update room state."""
    room = get_room(room_code)
    if not room:
        return False
    
    with rooms_lock:
        room['state'].update(state_updates)
        room['last_activity'] = time.time()
    
    return True

def cleanup_expired_rooms():
    """Clean up expired rooms. Should be called periodically."""
    current_time = time.time()
    expired_codes = []
    
    with rooms_lock:
        for code, room in rooms.items():
            if current_time - room['last_activity'] > ROOM_EXPIRATION:
                expired_codes.append(code)
        
        for code in expired_codes:
            del rooms[code]
    
    return len(expired_codes)

