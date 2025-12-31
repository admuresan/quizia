"""
Media management routes.
"""
from flask import Blueprint, request, jsonify, session, send_file
from app.utils.media_storage import (
    save_media_file,
    delete_media_file,
    list_media_files,
    get_media_file_path,
    toggle_media_public,
    rename_media_display_name
)

bp = Blueprint('media', __name__, url_prefix='/api/media')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mp3', 'wav', 'ogg', 'pdf', 'svg'}

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route('/list', methods=['GET'])
def list_media_route():
    """List media files for current quizmaster (their own + public ones)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    files = list_media_files(username=username, include_reference_count=True)
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

@bp.route('/bulk-delete', methods=['POST'])
def bulk_delete_media():
    """Delete multiple media files (quizmaster only, must be creator of all)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    data = request.get_json()
    filenames = data.get('filenames', [])
    
    if not filenames:
        return jsonify({'error': 'No files specified'}), 400
    
    results = []
    for filename in filenames:
        result = delete_media_file(filename, username)
        results.append({'filename': filename, 'success': result['success'], 'error': result.get('error')})
    
    return jsonify({'results': results}), 200

@bp.route('/bulk-toggle-public', methods=['POST'])
def bulk_toggle_media_public():
    """Toggle public status of multiple media files (quizmaster only, must be creator of all)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    data = request.get_json()
    filenames = data.get('filenames', [])
    make_public = data.get('make_public', True)
    
    if not filenames:
        return jsonify({'error': 'No files specified'}), 400
    
    results = []
    for filename in filenames:
        # Get current status
        from app.utils.media_storage import _load_media_metadata, _save_media_metadata
        metadata = _load_media_metadata()
        file_meta = metadata.get(filename)
        
        if not file_meta:
            results.append({'filename': filename, 'success': False, 'error': 'File not found'})
            continue
        
        if file_meta.get('creator') != username:
            results.append({'filename': filename, 'success': False, 'error': 'Only creator can change status'})
            continue
        
        # Set public status
        file_meta['public'] = make_public
        metadata[filename] = file_meta
        _save_media_metadata(metadata)
        
        results.append({'filename': filename, 'success': True, 'public': make_public})
    
    return jsonify({'results': results}), 200

@bp.route('/rename/<filename>', methods=['POST'])
def rename_media_route(filename):
    """Rename the display name of a media file (quizmaster only, must be creator)."""
    if not session.get('is_quizmaster'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    username = session.get('username')
    data = request.get_json()
    new_display_name = data.get('new_display_name', '').strip()
    
    if not new_display_name:
        return jsonify({'error': 'Display name cannot be empty'}), 400
    
    result = rename_media_display_name(filename, new_display_name, username)
    
    if result['success']:
        return jsonify({'message': 'Display name updated', 'original_name': result['original_name']}), 200
    else:
        return jsonify({'error': result['error']}), 400

