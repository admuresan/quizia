"""
Authentication routes.
"""
from flask import Blueprint, request, jsonify, session
from app.utils.auth import (
    create_account_request, 
    approve_account_request,
    reject_account_request,
    create_account_direct,
    login,
    get_account_requests,
    get_all_quizmasters
)
from app.utils.stats import get_all_quizmaster_stats
import json

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/request', methods=['POST'])
def request_account():
    """Request to create an account."""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    result = create_account_request(username, password)
    if result['success']:
        return jsonify({'message': 'Account request submitted'}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/login', methods=['POST'])
def login_route():
    """Login as quizmaster."""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    result = login(username, password)
    if result['success']:
        session['username'] = username
        session['is_quizmaster'] = True
        return jsonify({'message': 'Login successful'}), 200
    else:
        return jsonify({'error': result['error']}), 401

@bp.route('/logout', methods=['POST'])
def logout():
    """Logout."""
    session.clear()
    return jsonify({'message': 'Logged out'}), 200

@bp.route('/requests', methods=['GET'])
def get_requests():
    """Get all account requests (quizmaster only)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    requests = get_account_requests()
    return jsonify({'requests': requests}), 200

@bp.route('/approve', methods=['POST'])
def approve_request():
    """Approve an account request (quizmaster only)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    request_id = data.get('request_id')
    
    result = approve_account_request(request_id)
    if result['success']:
        return jsonify({'message': 'Request approved'}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/reject', methods=['POST'])
def reject_request():
    """Reject an account request (quizmaster only)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    request_id = data.get('request_id')
    
    result = reject_account_request(request_id)
    if result['success']:
        return jsonify({'message': 'Request rejected'}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/create', methods=['POST'])
def create_account():
    """Create account directly (quizmaster only)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    result = create_account_direct(username, password)
    if result['success']:
        return jsonify({'message': 'Account created'}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/quizmasters', methods=['GET'])
def get_quizmasters():
    """Get all quizmasters with statistics (quizmaster only)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    quizmasters = get_all_quizmasters()
    stats = get_all_quizmaster_stats()
    
    # Combine quizmasters with their stats
    quizmasters_with_stats = []
    for username in quizmasters:
        quizmasters_with_stats.append({
            'username': username,
            'quizzes_created': stats.get(username, {}).get('quizzes_created', 0),
            'quizzes_run': stats.get(username, {}).get('quizzes_run', 0)
        })
    
    return jsonify({'quizmasters': quizmasters_with_stats}), 200

@bp.route('/check', methods=['GET'])
def check_session():
    """Check if user is logged in."""
    if session.get('is_quizmaster'):
        return jsonify({'logged_in': True, 'username': session.get('username')}), 200
    return jsonify({'logged_in': False}), 200

