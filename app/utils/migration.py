"""
Quiz migration utilities for migrating quizzes from localhost to server.
"""
import json
import re
import os
from pathlib import Path
from flask import current_app
import requests
from typing import Dict, List, Set, Any, Optional
import paramiko
from io import BytesIO

def get_server_url():
    """Get the server URL from environment variable."""
    return os.environ.get('MIGRATION_SERVER_URL', 'http://40.233.70.245')

def get_ssh_config():
    """Get SSH configuration from environment variables."""
    return {
        'host': os.environ.get('MIGRATION_SSH_HOST', '40.233.70.245'),
        'user': os.environ.get('MIGRATION_SSH_USER', 'root'),
        'key_path': os.environ.get('MIGRATION_SSH_KEY_PATH', 'ssh/ssh-key-2025-12-26.key')
    }

def is_localhost():
    """Check if the app is running on localhost."""
    try:
        # Check if we're in Flask app context
        if current_app:
            # In production, this would be set differently
            # For now, check if we're running on localhost port
            import socket
            hostname = socket.gethostname()
            # Simple check: if hostname contains localhost or we're on port 6005 (dev port)
            return True  # We'll refine this based on actual deployment
    except:
        pass
    return False

def extract_media_references(quiz_data: Dict) -> Set[str]:
    """
    Extract all media file references from a quiz.
    Returns a set of filenames (without /api/media/serve/ prefix).
    """
    media_files = set()
    
    def extract_from_value(value, key=None):
        """Recursively extract media references from any value."""
        if isinstance(value, dict):
            # Check for specific media-related keys
            for k, v in value.items():
                if k in ('media_url', 'file_name', 'filename', 'image_url', 'src', 'url'):
                    if isinstance(v, str) and v:
                        # Extract filename from URL or use as-is
                        if '/api/media/serve/' in v:
                            match = re.search(r'/api/media/serve/([^\s"\'<>?]+)', v)
                            if match:
                                filename = match.group(1)
                                media_files.add(filename)
                        elif v.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', 
                                       '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.pdf')):
                            # Only add if it looks like a filename (not a full URL)
                            if not v.startswith(('http://', 'https://')):
                                # If it starts with /, it might be a path - extract just the filename
                                if v.startswith('/'):
                                    filename = os.path.basename(v)
                                    if filename:
                                        media_files.add(filename)
                                else:
                                    media_files.add(v)
                else:
                    extract_from_value(v, k)
        elif isinstance(value, list):
            for item in value:
                extract_from_value(item, key)
        elif isinstance(value, str):
            # Check for /api/media/serve/ URLs in any string
            if '/api/media/serve/' in value:
                # Extract filename
                matches = re.findall(r'/api/media/serve/([^\s"\'<>?]+)', value)
                for match in matches:
                    filename = match.split('?')[0].split('#')[0]
                    media_files.add(filename)
            # Also check for direct filename references
            elif value.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', 
                               '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.pdf')):
                # Only add if it looks like a filename (not a full URL)
                if not value.startswith(('http://', 'https://')):
                    if value.startswith('/'):
                        filename = os.path.basename(value)
                        if filename:
                            media_files.add(filename)
                    else:
                        media_files.add(value)
    
    # Extract from entire quiz data
    extract_from_value(quiz_data)
    
    return media_files

def update_media_urls(quiz_data: Dict, server_url: str) -> Dict:
    """
    Update all media URLs in quiz data to point to the server.
    Returns a copy of the quiz data with updated URLs.
    """
    import copy
    updated_quiz = copy.deepcopy(quiz_data)
    
    def update_value(value, key=None):
        """Recursively update media URLs in any value."""
        if isinstance(value, dict):
            for k, v in value.items():
                # Update media-related keys
                if k in ('media_url', 'image_url', 'src', 'url') and isinstance(v, str):
                    if '/api/media/serve/' in v:
                        # Replace localhost URLs with server URLs
                        value[k] = re.sub(
                            r'(https?://[^/]+)?/api/media/serve/([^\s"\'<>?]+)',
                            lambda m: f'{server_url}/api/media/serve/{m.group(2)}',
                            v
                        )
                    elif v and not v.startswith(('http://', 'https://')):
                        # If it's a relative path or filename, convert to full URL
                        if v.startswith('/api/media/serve/'):
                            value[k] = f'{server_url}{v}'
                        elif v.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', 
                                       '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.pdf')):
                            # Convert filename to full URL
                            filename = os.path.basename(v) if '/' in v else v
                            value[k] = f'{server_url}/api/media/serve/{filename}'
                    else:
                        value[k] = update_value(v, k)
                else:
                    value[k] = update_value(v, k)
        elif isinstance(value, list):
            return [update_value(item, key) for item in value]
        elif isinstance(value, str):
            # Update /api/media/serve/ URLs in any string
            if '/api/media/serve/' in value:
                # Replace localhost URLs with server URLs
                value = re.sub(
                    r'(https?://[^/]+)?/api/media/serve/([^\s"\'<>?]+)',
                    lambda m: f'{server_url}/api/media/serve/{m.group(2)}',
                    value
                )
        return value
    
    return update_value(updated_quiz)

def upload_file_via_ssh(file_path: Path, remote_path: str, ssh_config: Dict) -> bool:
    """
    Upload a file to the server via SSH.
    Returns True if successful, False otherwise.
    """
    try:
        # Read SSH private key
        key_path = Path(ssh_config['key_path'])
        if not key_path.exists():
            # Try relative to project root
            key_path = Path(__file__).parent.parent.parent / ssh_config['key_path']
        
        if not key_path.exists():
            raise FileNotFoundError(f"SSH key not found at {key_path}")
        
        # Try to find private key (might be .key without .pub extension)
        private_key_path = key_path
        if key_path.name.endswith('.pub'):
            private_key_path = key_path.parent / key_path.stem
        
        if not private_key_path.exists():
            raise FileNotFoundError(f"SSH private key not found at {private_key_path}")
        
        # Load private key
        try:
            private_key = paramiko.RSAKey.from_private_key_file(str(private_key_path))
        except:
            # Try other key types
            try:
                private_key = paramiko.Ed25519Key.from_private_key_file(str(private_key_path))
            except:
                # Try with passphrase (empty for now)
                private_key = paramiko.RSAKey.from_private_key_file(str(private_key_path), password='')
        
        # Connect via SSH
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        ssh.connect(
            hostname=ssh_config['host'],
            username=ssh_config['user'],
            pkey=private_key,
            timeout=30
        )
        
        # Use SFTP to upload file
        sftp = ssh.open_sftp()
        
        # Ensure remote directory exists
        remote_dir = os.path.dirname(remote_path)
        if remote_dir:
            try:
                sftp.mkdir(remote_dir)
            except IOError:
                pass  # Directory might already exist
        
        # Upload file
        sftp.put(str(file_path), remote_path)
        sftp.close()
        ssh.close()
        
        return True
    except Exception as e:
        print(f"Error uploading file via SSH: {e}")
        return False

def upload_file_via_api(file_path: Path, filename: str, server_url: str, 
                        username: str, password: str) -> Optional[str]:
    """
    Upload a media file to the server via API.
    Returns the uploaded filename if successful, None otherwise.
    """
    try:
        # First, login to get session
        login_url = f"{server_url}/api/auth/login"
        session = requests.Session()
        
        login_response = session.post(login_url, json={
            'username': username,
            'password': password
        }, timeout=10)
        
        if login_response.status_code != 200:
            return None
        
        # Upload file
        upload_url = f"{server_url}/api/media/upload"
        
        with open(file_path, 'rb') as f:
            files = {'file': (filename, f, 'application/octet-stream')}
            data = {'public': 'false'}
            
            upload_response = session.post(upload_url, files=files, data=data, timeout=30)
        
        if upload_response.status_code == 200:
            result = upload_response.json()
            return result.get('filename', filename)
        else:
            return None
    except Exception as e:
        print(f"Error uploading file via API: {e}")
        return None

def migrate_quiz(quiz_id: str, server_username: str, server_password: str, 
                 use_ssh: bool = False) -> Dict[str, Any]:
    """
    Migrate a quiz from localhost to server.
    
    Args:
        quiz_id: The ID of the quiz to migrate
        server_username: Username for server authentication
        server_password: Password for server authentication
        use_ssh: Whether to use SSH for file uploads (default: False, uses API)
    
    Returns:
        Dict with 'success' (bool) and 'message' (str) or 'error' (str)
    """
    try:
        from app.utils.quiz_storage import load_quiz, get_quizes_folder
        from app.utils.media_storage import get_media_file_path, get_uploads_folder
        
        # Load quiz
        quiz_data = load_quiz(quiz_id)
        if not quiz_data:
            return {'success': False, 'error': 'Quiz not found'}
        
        # Extract media references
        media_files = extract_media_references(quiz_data)
        
        server_url = get_server_url()
        
        # Upload media files
        uploaded_media = {}
        missing_media = []
        uploads_folder = get_uploads_folder()
        
        for media_filename in media_files:
            media_path = uploads_folder / media_filename
            if not media_path.exists():
                missing_media.append(media_filename)
                print(f"Warning: Media file {media_filename} not found locally, will skip upload")
                continue
            
            if use_ssh:
                # Upload via SSH
                ssh_config = get_ssh_config()
                remote_path = f"/path/to/app/uploads/{media_filename}"  # Adjust path as needed
                if upload_file_via_ssh(media_path, remote_path, ssh_config):
                    uploaded_media[media_filename] = media_filename
                else:
                    return {'success': False, 'error': f'Failed to upload media file: {media_filename}'}
            else:
                # Upload via API
                uploaded_filename = upload_file_via_api(
                    media_path, media_filename, server_url, 
                    server_username, server_password
                )
                if uploaded_filename:
                    uploaded_media[media_filename] = uploaded_filename
                else:
                    return {'success': False, 'error': f'Failed to upload media file: {media_filename}'}
        
        # Warn about missing media files but continue
        warning_msg = ''
        if missing_media:
            warning_msg = f' Warning: {len(missing_media)} media file(s) not found locally and were skipped.'
        
        # Update media URLs in quiz data
        updated_quiz = update_media_urls(quiz_data, server_url)
        
        # Update filenames if server renamed any files
        def update_filenames(value):
            """Recursively update filenames if they were renamed on server."""
            if isinstance(value, dict):
                for k, v in value.items():
                    if k in ('file_name', 'filename') and isinstance(v, str) and v in uploaded_media:
                        # Update to the server's filename
                        value[k] = uploaded_media[v]
                    else:
                        value[k] = update_filenames(v)
            elif isinstance(value, list):
                return [update_filenames(item) for item in value]
            elif isinstance(value, str):
                # Check if this string is a filename that was renamed
                if value in uploaded_media and uploaded_media[value] != value:
                    return uploaded_media[value]
                # Also check if it's a URL with a renamed filename
                if '/api/media/serve/' in value:
                    for old_name, new_name in uploaded_media.items():
                        if old_name != new_name and f'/api/media/serve/{old_name}' in value:
                            value = value.replace(f'/api/media/serve/{old_name}', f'/api/media/serve/{new_name}')
            return value
        
        updated_quiz = update_filenames(updated_quiz)
        
        # Update creator to server username
        updated_quiz['creator'] = server_username
        
        # Upload quiz to server
        try:
            # Login to server
            login_url = f"{server_url}/api/auth/login"
            session = requests.Session()
            
            login_response = session.post(login_url, json={
                'username': server_username,
                'password': server_password
            }, timeout=10)
            
            if login_response.status_code != 200:
                return {'success': False, 'error': 'Failed to authenticate with server'}
            
            # Save quiz on server
            save_url = f"{server_url}/api/quiz/save"
            save_response = session.post(save_url, json={
                'quiz': updated_quiz,
                'id': quiz_id,
                'force_recreate': True
            }, timeout=30)
            
            if save_response.status_code == 200:
                message = f'Quiz migrated successfully. {len(uploaded_media)} media file(s) uploaded.'
                if missing_media:
                    message += f' {len(missing_media)} media file(s) were not found locally and were skipped.'
                return {
                    'success': True,
                    'message': message
                }
            else:
                error_data = save_response.json() if save_response.content else {}
                return {
                    'success': False,
                    'error': error_data.get('error', 'Failed to save quiz on server')
                }
        except Exception as e:
            return {'success': False, 'error': f'Failed to save quiz on server: {str(e)}'}
    
    except Exception as e:
        return {'success': False, 'error': f'Migration failed: {str(e)}'}

