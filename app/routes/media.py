"""
Media management routes.
"""
from flask import Blueprint, request, jsonify, session, send_file
from app.utils.media_storage import (
    save_media_file,
    delete_media_file,
    list_media_files,
    get_media_file_path,
    toggle_media_public
)

bp = Blueprint('media', __name__, url_prefix='/api/media')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'mp3', 'wav', 'ogg', 'pdf', 'svg'}

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route('/list', methods=['GET'])
def list_media_route():
    """List media files for current quizmaster (their own + public ones)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    files = list_media_files(username=username)
    return jsonify({'files': files}), 200

@bp.route('/upload', methods=['POST'])
def upload_media():
    """Upload a media file (quizmaster only)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    try:
        username = session.get('username')
        public = request.form.get('public', 'false').lower() == 'true'
        
        file_content = file.read()
        result = save_media_file(file.filename, file_content, username, public=public)
        
        if result['success']:
            return jsonify({'message': 'File uploaded', 'filename': result['filename']}), 200
        else:
            return jsonify({'error': result['error']}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/download/<filename>', methods=['GET'])
def download_media(filename):
    """Download a media file (quizmaster only, must have access)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    files = list_media_files(username=username)
    
    # Check if user has access to this file
    file_info = next((f for f in files if f['filename'] == filename), None)
    if not file_info:
        return jsonify({'error': 'File not found or access denied'}), 404
    
    file_path = get_media_file_path(filename)
    if not file_path.exists():
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(file_path, as_attachment=True, download_name=file_info['original_name'])

@bp.route('/delete/<filename>', methods=['DELETE'])
def delete_media(filename):
    """Delete a media file (quizmaster only, must be creator)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    result = delete_media_file(filename, username)
    
    if result['success']:
        return jsonify({'message': 'File deleted'}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/toggle-public/<filename>', methods=['POST'])
def toggle_media_public_route(filename):
    """Toggle public status of a media file (quizmaster only, must be creator)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    result = toggle_media_public(filename, username)
    
    if result['success']:
        return jsonify({'message': 'Public status updated', 'public': result['public']}), 200
    else:
        return jsonify({'error': result['error']}), 400

@bp.route('/serve/<filename>', methods=['GET'])
def serve_media(filename):
    """Serve a media file (for use in quizzes)."""
    file_path = get_media_file_path(filename)
    if not file_path.exists():
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(file_path)

