"""
Media storage utilities.
"""
import json
import re
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
        
        # Sanitize filename for storage
        safe_name = "".join(c for c in filename if c.isalnum() or c in (' ', '-', '_', '.')).strip()
        safe_name = safe_name.replace(' ', '_')
        
        if not safe_name:
            return {'success': False, 'error': 'Invalid filename'}
        
        # Check if a file with the same original_name already exists for this creator
        metadata = _load_media_metadata()
        original_name = filename
        duplicate_counter = None
        
        # Find all files with the same original_name created by this user
        for existing_file, existing_meta in metadata.items():
            if (existing_meta.get('creator') == username and 
                existing_meta.get('original_name') == original_name):
                # Found a duplicate - we'll need to number this one
                duplicate_counter = 1
                break
        
        # If we found a duplicate, find the highest number used
        if duplicate_counter is not None:
            # Extract base name and extension
            name_parts = original_name.rsplit('.', 1)
            if len(name_parts) == 2:
                base_name, ext = name_parts[0], name_parts[1]
            else:
                base_name, ext = original_name, ''
            
            # Find all numbered versions
            max_num = 0
            for existing_file, existing_meta in metadata.items():
                if existing_meta.get('creator') == username:
                    existing_original = existing_meta.get('original_name', '')
                    # Check if it matches the pattern "base_name (N).ext"
                    pattern = re.escape(base_name) + r'\s*\((\d+)\)'
                    if ext:
                        pattern += r'\.' + re.escape(ext)
                    else:
                        pattern += r'$'
                    match = re.match(pattern, existing_original)
                    if match:
                        num = int(match.group(1))
                        max_num = max(max_num, num)
                    # Also check if it's the exact original name (no number)
                    elif existing_original == original_name:
                        max_num = max(max_num, 0)
            
            # Set the duplicate counter to max_num + 1
            duplicate_counter = max_num + 1
            
            # Update original_name to include the number
            if ext:
                original_name = f"{base_name} ({duplicate_counter}).{ext}"
            else:
                original_name = f"{base_name} ({duplicate_counter})"
        
        # Ensure unique stored filename (for filesystem)
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
        
        # Update metadata with the potentially renamed original_name
        metadata[safe_name] = {
            'original_name': original_name,
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

def list_media_files(username=None, include_reference_count=False):
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
                        file_info = {
                            'filename': file_path.name,
                            'original_name': file_meta.get('original_name', file_path.name),
                            'creator': file_creator,
                            'public': is_public,
                            'size': file_meta.get('size', file_path.stat().st_size)
                        }
                        if include_reference_count:
                            file_info['reference_count'] = count_media_references(file_path.name)
                        files.append(file_info)
                else:
                    # No filtering, return all
                    file_info = {
                        'filename': file_path.name,
                        'original_name': file_meta.get('original_name', file_path.name),
                        'creator': file_creator,
                        'public': is_public,
                        'size': file_meta.get('size', file_path.stat().st_size)
                    }
                    if include_reference_count:
                        file_info['reference_count'] = count_media_references(file_path.name)
                    files.append(file_info)
        
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

def rename_media_display_name(filename, new_display_name, username):
    """Rename the display name (original_name) of a media file (only creator can rename)."""
    try:
        metadata = _load_media_metadata()
        file_meta = metadata.get(filename)
        
        if not file_meta:
            return {'success': False, 'error': 'File not found in metadata'}
        
        if file_meta.get('creator') != username:
            return {'success': False, 'error': 'Only the creator can rename the file'}
        
        # Validate new display name
        if not new_display_name or not new_display_name.strip():
            return {'success': False, 'error': 'Display name cannot be empty'}
        
        new_display_name = new_display_name.strip()
        
        # Update the original_name (display name) in metadata
        file_meta['original_name'] = new_display_name
        metadata[filename] = file_meta
        _save_media_metadata(metadata)
        
        return {'success': True, 'original_name': new_display_name}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def count_media_references(filename):
    """Count how many quizzes reference a media file."""
    try:
        from app.utils.quiz_storage import get_quizes_folder, load_quiz
        from app.utils.migration import extract_media_references
        
        quizes_folder = get_quizes_folder()
        if not quizes_folder.exists():
            return 0
        
        count = 0
        for quiz_file in quizes_folder.glob('*.json'):
            try:
                quiz_data = load_quiz(quiz_file.stem)
                if not quiz_data:
                    continue
                
                # Extract all media references from this quiz
                media_refs = extract_media_references(quiz_data)
                
                # Check if this filename is referenced
                if filename in media_refs:
                    count += 1
            except:
                continue
        
        return count
    except Exception as e:
        return 0



