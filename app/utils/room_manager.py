"""
Room management utilities.
Handles quiz room creation, expiration, and participant management.
"""
import string
import random
import time
import json
from datetime import datetime, timedelta
from threading import Lock
from pathlib import Path

# In-memory storage for active rooms
rooms = {}
rooms_lock = Lock()

# Room expiration time: 3 hours in seconds
ROOM_EXPIRATION = 3 * 60 * 60

# Room persistence folder
ROOMS_FOLDER = Path(__file__).parent.parent / 'rooms'
ROOMS_FOLDER.mkdir(exist_ok=True)

def _get_room_file_path(room_code):
    """Get the file path for a room's state file."""
    return ROOMS_FOLDER / f'{room_code}.json'

def _save_room_state(room_code, room_data):
    """Save room state to disk."""
    try:
        file_path = _get_room_file_path(room_code)
        # Create a copy without socket_id (not serializable and not needed for persistence)
        room_copy = {}
        for key, value in room_data.items():
            if key == 'participants':
                # Remove socket_id from participants for persistence
                participants_copy = {}
                for pid, participant in value.items():
                    participant_copy = participant.copy()
                    participant_copy.pop('socket_id', None)  # Remove socket_id
                    participants_copy[pid] = participant_copy
                room_copy[key] = participants_copy
            else:
                room_copy[key] = value
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(room_copy, f, indent=2, default=str)
    except Exception as e:
        # Log error but don't fail - persistence is best effort
        print(f"Warning: Failed to save room {room_code}: {e}")

def _load_room_state(room_code):
    """Load room state from disk."""
    try:
        file_path = _get_room_file_path(room_code)
        if not file_path.exists():
            return None
        
        with open(file_path, 'r', encoding='utf-8') as f:
            room_data = json.load(f)
        
        # Restore socket_id fields (set to None, will be updated when participants reconnect)
        if 'participants' in room_data:
            for participant in room_data['participants'].values():
                participant['socket_id'] = None
                participant['connected'] = False  # Mark as disconnected until they reconnect
        
        return room_data
    except Exception as e:
        print(f"Warning: Failed to load room {room_code}: {e}")
        return None

def _delete_room_file(room_code):
    """Delete room state file from disk."""
    try:
        file_path = _get_room_file_path(room_code)
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        print(f"Warning: Failed to delete room file {room_code}: {e}")

def generate_room_code():
    """Generate a unique 4-character alphanumeric room code."""
    characters = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choice(characters) for _ in range(4))
        with rooms_lock:
            if code not in rooms:
                # Also check if file exists to avoid conflicts after restart
                if not _get_room_file_path(code).exists():
                    return code

def create_room(quiz_id, quiz_name, quiz_data, quizmaster_username):
    """Create a new quiz room."""
    room_code = generate_room_code()
    
    room = {
        'code': room_code,
        'quiz_id': quiz_id,
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
        # Save room state immediately
        _save_room_state(room_code, room)
    
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
            # Delete room file
            _delete_room_file(room_code)
            return None
        
        # Update last activity (but don't save on every get_room call to avoid excessive I/O)
        # We'll save periodically when state actually changes
        room['last_activity'] = time.time()
        return room

def end_room(room_code):
    """End a room and remove it from active rooms."""
    with rooms_lock:
        if room_code in rooms:
            rooms[room_code]['ended'] = True
            # Remove the room immediately so it's no longer accessible
            del rooms[room_code]
        # Delete room file
        _delete_room_file(room_code)

def add_participant(room_code, name, avatar, socket_id):
    """
    Add a participant to a room.
    Participants are uniquely identified by avatar+name combo.
    Returns participant_id (avatar+name combo) or None if combo already exists.
    """
    room = get_room(room_code)
    if not room:
        return None
    
    # Create unique participant ID from avatar+name combo
    import hashlib
    combo_string = f"{avatar}|{name}"
    participant_id = hashlib.md5(combo_string.encode()).hexdigest()[:16]  # 16-char ID
    
    with rooms_lock:
        # Check if this combo already exists
        if participant_id in room.get('participants', {}):
            # Participant with this combo already exists
            return None
        
        participant = {
            'id': participant_id,
            'name': name,
            'avatar': avatar,
            'socket_id': socket_id,
            'joined_at': time.time(),
            'score': 0,
            'connected': True
        }
        
        room['participants'][participant_id] = participant
        room['last_activity'] = time.time()
        # Save room state when participants change
        _save_room_state(room_code, room)
    
    return participant_id

def find_participant_by_combo(room_code, name, avatar):
    """
    Find a participant by avatar+name combo.
    Returns participant_id if found, None otherwise.
    """
    room = get_room(room_code)
    if not room:
        return None
    
    import hashlib
    combo_string = f"{avatar}|{name}"
    participant_id = hashlib.md5(combo_string.encode()).hexdigest()[:16]
    
    if participant_id in room.get('participants', {}):
        return participant_id
    
    return None

def remove_participant(room_code, participant_id):
    """Remove a participant from a room."""
    room = get_room(room_code)
    if not room:
        return False
    
    with rooms_lock:
        if participant_id in room['participants']:
            room['participants'][participant_id]['connected'] = False
            room['last_activity'] = time.time()
            # Save room state when participants change
            _save_room_state(room_code, room)
            return True
    
    return False

def get_participants(room_code):
    """Get all participants in a room, returned as a dictionary keyed by participant_id."""
    room = get_room(room_code)
    if not room:
        return {}
    
    # Return a copy to prevent external modification
    return {pid: {k: v for k, v in p.items() if k != 'socket_id'} 
            for pid, p in room.get('participants', {}).items()}

def update_room_state(room_code, state_updates):
    """Update room state."""
    room = get_room(room_code)
    if not room:
        return False
    
    with rooms_lock:
        room['state'].update(state_updates)
        room['last_activity'] = time.time()
        # Save room state when state changes
        _save_room_state(room_code, room)
    
    return True

def get_running_rooms_for_quizmaster(quizmaster_username):
    """Get all running (non-ended) rooms for a specific quizmaster."""
    current_time = time.time()
    running_rooms = []
    
    with rooms_lock:
        for code, room in rooms.items():
            # Check if room belongs to this quizmaster and is not ended
            if room.get('quizmaster') == quizmaster_username and not room.get('ended', False):
                # Check if room is still active (not expired)
                if current_time - room['last_activity'] <= ROOM_EXPIRATION:
                    running_rooms.append({
                        'code': code,
                        'quiz_name': room.get('quiz_name', 'Unknown'),
                        'created_at': room.get('created_at', current_time),
                        'last_activity': room.get('last_activity', current_time),
                        'current_page': room.get('current_page', 0),
                        'participant_count': len(room.get('participants', {}))
                    })
                else:
                    # Room expired - mark as ended and delete file
                    room['ended'] = True
                    _delete_room_file(code)
    
    return running_rooms

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
            # Delete room file when expired
            _delete_room_file(code)
    
    return len(expired_codes)

def restore_rooms():
    """Restore all rooms from disk on server startup."""
    restored_count = 0
    current_time = time.time()
    
    with rooms_lock:
        # Find all room files
        for room_file in ROOMS_FOLDER.glob('*.json'):
            room_code = room_file.stem  # Get filename without extension
            
            # Load room state
            room_data = _load_room_state(room_code)
            if not room_data:
                continue
            
            # Check if room is expired
            last_activity = room_data.get('last_activity', 0)
            if current_time - last_activity > ROOM_EXPIRATION:
                # Room expired - delete file
                _delete_room_file(room_code)
                continue
            
            # Check if room was already ended
            if room_data.get('ended', False):
                # Room was ended - delete file
                _delete_room_file(room_code)
                continue
            
            # Restore room to memory
            rooms[room_code] = room_data
            restored_count += 1
    
    return restored_count

def save_room_state_now(room_code):
    """Explicitly save room state (called when important state changes like page navigation)."""
    with rooms_lock:
        if room_code in rooms:
            _save_room_state(room_code, rooms[room_code])

