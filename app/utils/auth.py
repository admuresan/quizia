"""
Authentication utilities.
"""
import json
import hashlib
from pathlib import Path
from datetime import datetime
import uuid

AUTH_FILE = Path(__file__).parent.parent / 'data' / 'auth.json'
REQUESTS_FILE = Path(__file__).parent.parent / 'data' / 'requests.json'

def _ensure_data_dir():
    """Ensure data directory exists."""
    AUTH_FILE.parent.mkdir(exist_ok=True)
    if not AUTH_FILE.exists():
        with open(AUTH_FILE, 'w') as f:
            json.dump({'users': {}}, f)
    if not REQUESTS_FILE.exists():
        with open(REQUESTS_FILE, 'w') as f:
            json.dump({'requests': []}, f)

def _load_auth():
    """Load authentication data."""
    _ensure_data_dir()
    with open(AUTH_FILE, 'r') as f:
        return json.load(f)

def _save_auth(data):
    """Save authentication data."""
    _ensure_data_dir()
    with open(AUTH_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def _load_requests():
    """Load account requests."""
    _ensure_data_dir()
    with open(REQUESTS_FILE, 'r') as f:
        return json.load(f)

def _save_requests(data):
    """Save account requests."""
    _ensure_data_dir()
    with open(REQUESTS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def _hash_password(password):
    """Hash a password."""
    return hashlib.sha256(password.encode()).hexdigest()

def create_account_request(username, password):
    """Create an account request."""
    auth_data = _load_auth()
    
    # Check if username already exists
    if username in auth_data['users']:
        return {'success': False, 'error': 'Username already exists'}
    
    # Check if request already exists
    requests_data = _load_requests()
    for req in requests_data['requests']:
        if req['username'] == username and req['status'] == 'pending':
            return {'success': False, 'error': 'Request already pending'}
    
    # Create request
    request_id = str(uuid.uuid4())
    new_request = {
        'id': request_id,
        'username': username,
        'password_hash': _hash_password(password),
        'status': 'pending',
        'created_at': datetime.now().isoformat()
    }
    
    requests_data['requests'].append(new_request)
    _save_requests(requests_data)
    
    return {'success': True, 'request_id': request_id}

def approve_account_request(request_id):
    """Approve an account request."""
    requests_data = _load_requests()
    auth_data = _load_auth()
    
    # Find request
    request_found = None
    for req in requests_data['requests']:
        if req['id'] == request_id and req['status'] == 'pending':
            request_found = req
            break
    
    if not request_found:
        return {'success': False, 'error': 'Request not found'}
    
    # Create account
    username = request_found['username']
    if username in auth_data['users']:
        return {'success': False, 'error': 'Username already exists'}
    
    auth_data['users'][username] = {
        'password_hash': request_found['password_hash'],
        'created_at': request_found['created_at'],
        'approved_at': datetime.now().isoformat()
    }
    _save_auth(auth_data)
    
    # Update request status
    request_found['status'] = 'approved'
    request_found['approved_at'] = datetime.now().isoformat()
    _save_requests(requests_data)
    
    return {'success': True}

def reject_account_request(request_id):
    """Reject an account request."""
    requests_data = _load_requests()
    
    # Find and update request
    for req in requests_data['requests']:
        if req['id'] == request_id and req['status'] == 'pending':
            req['status'] = 'rejected'
            req['rejected_at'] = datetime.now().isoformat()
            _save_requests(requests_data)
            return {'success': True}
    
    return {'success': False, 'error': 'Request not found'}

def create_account_direct(username, password):
    """Create an account directly (by quizmaster)."""
    auth_data = _load_auth()
    
    if username in auth_data['users']:
        return {'success': False, 'error': 'Username already exists'}
    
    auth_data['users'][username] = {
        'password_hash': _hash_password(password),
        'created_at': datetime.now().isoformat(),
        'created_by_quizmaster': True
    }
    _save_auth(auth_data)
    
    return {'success': True}

def login(username, password):
    """Login a user."""
    auth_data = _load_auth()
    
    if username not in auth_data['users']:
        return {'success': False, 'error': 'Invalid username or password'}
    
    user = auth_data['users'][username]
    password_hash = _hash_password(password)
    
    if user['password_hash'] != password_hash:
        return {'success': False, 'error': 'Invalid username or password'}
    
    return {'success': True, 'username': username}

def get_account_requests():
    """Get all account requests."""
    requests_data = _load_requests()
    return [req for req in requests_data['requests'] if req['status'] == 'pending']

def get_all_quizmasters():
    """Get all quizmaster accounts."""
    auth_data = _load_auth()
    return list(auth_data['users'].keys())

