"""
Media storage utilities.
"""
import json
from pathlib import Path
from flask import current_app
import os
import shutil

def get_uploads_folder():
    """Get the uploads folder path."""
    try:
        return current_app.config['UPLOAD_FOLDER']
    except:
        # Fallback if not in app context
        return Path(__file__).parent.parent / 'uploads'

def get_media_metadata_file():
    """Get the path to media metadata file."""
    uploads_folder = get_uploads_folder()
    return uploads_folder / '.media_metadata.json'

def _load_media_metadata():
    """Load media metadata."""
    metadata_file = get_media_metadata_file()
    if metadata_file.exists():
        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def _save_media_metadata(metadata):
    """Save media metadata."""
    metadata_file = get_media_metadata_file()
    uploads_folder = get_uploads_folder()
    uploads_folder.mkdir(exist_ok=True)
    
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

def save_media_file(filename, file_content, username, public=False):
    """Save a media file and track metadata."""
    try:
        uploads_folder = get_uploads_folder()
        uploads_folder.mkdir(exist_ok=True)
        
        # Sanitize filename
        safe_name = "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_', '.')).strip()
        safe_name = safe_name.replace(' ', '_')
        
        if not safe_name:
            return {'success': False, 'error': 'Invalid filename'}
        
        # Ensure unique filename
        file_path = uploads_folder / safe_name
        counter = 1
        while file_path.exists():
            name_parts = safe_name.rsplit('.', 1)
            if len(name_parts) == 2:
                safe_name = f"{name_parts[0]}_{counter}.{name_parts[1]}"
            else:
                safe_name = f"{safe_name}_{counter}"
            file_path = uploads_folder / safe_name
            counter += 1
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Update metadata
        metadata = _load_media_metadata()
        metadata[safe_name] = {
            'original_name': filename,
            'creator': username,
            'public': public,
            'size': os.path.getsize(file_path)
        }
        _save_media_metadata(metadata)
        
        return {'success': True, 'filename': safe_name}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def delete_media_file(filename, username):
    """Delete a media file (only creator can delete)."""
    try:
        uploads_folder = get_uploads_folder()
        file_path = uploads_folder / filename
        
        if not file_path.exists():
            return {'success': False, 'error': 'File not found'}
        
        # Check metadata
        metadata = _load_media_metadata()
        file_meta = metadata.get(filename)
        
        if file_meta and file_meta.get('creator') != username:
            return {'success': False, 'error': 'Only the creator can delete this file'}
        
        # Delete file
        file_path.unlink()
        
        # Update metadata
        if filename in metadata:
            del metadata[filename]
            _save_media_metadata(metadata)
        
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def list_media_files(username=None):
    """List media files. If username provided, returns files created by user or public files."""
    try:
        uploads_folder = get_uploads_folder()
        uploads_folder.mkdir(exist_ok=True)
        
        metadata = _load_media_metadata()
        files = []
        
        for file_path in uploads_folder.iterdir():
            if file_path.is_file() and file_path.name != '.media_metadata.json':
                file_meta = metadata.get(file_path.name, {})
                file_creator = file_meta.get('creator')
                is_public = file_meta.get('public', False)
                
                # If username provided, filter by creator or public status
                if username:
                    if file_creator == username or is_public:
                        files.append({
                            'filename': file_path.name,
                            'original_name': file_meta.get('original_name', file_path.name),
                            'creator': file_creator,
                            'public': is_public,
                            'size': file_meta.get('size', file_path.stat().st_size)
                        })
                else:
                    # No filtering, return all
                    files.append({
                        'filename': file_path.name,
                        'original_name': file_meta.get('original_name', file_path.name),
                        'creator': file_creator,
                        'public': is_public,
                        'size': file_meta.get('size', file_path.stat().st_size)
                    })
        
        return files
    except Exception as e:
        return []

def get_media_file_path(filename):
    """Get the full path to a media file."""
    uploads_folder = get_uploads_folder()
    return uploads_folder / filename

def toggle_media_public(filename, username):
    """Toggle public status of a media file (only creator can toggle)."""
    try:
        metadata = _load_media_metadata()
        file_meta = metadata.get(filename)
        
        if not file_meta:
            return {'success': False, 'error': 'File not found in metadata'}
        
        if file_meta.get('creator') != username:
            return {'success': False, 'error': 'Only the creator can change public status'}
        
        # Toggle public status
        file_meta['public'] = not file_meta.get('public', False)
        metadata[filename] = file_meta
        _save_media_metadata(metadata)
        
        return {'success': True, 'public': file_meta['public']}
    except Exception as e:
        return {'success': False, 'error': str(e)}


