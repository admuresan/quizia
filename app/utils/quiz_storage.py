"""
Quiz storage utilities.
"""
import json
from pathlib import Path
from flask import current_app

def get_quizes_folder():
    """Get the quizes folder path."""
    try:
        return current_app.config['QUIZES_FOLDER']
    except:
        # Fallback if not in app context
        return Path(__file__).parent.parent / 'quizes'

def save_quiz(quiz_name, quiz_data):
    """Save a quiz to a JSON file."""
    try:
        quizes_folder = get_quizes_folder()
        quizes_folder.mkdir(exist_ok=True)
        
        # Sanitize filename
        safe_name = "".join(c for c in quiz_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_name = safe_name.replace(' ', '_')
        
        if not safe_name:
            return {'success': False, 'error': 'Invalid quiz name'}
        
        # Ensure quiz_data has a name
        quiz_data['name'] = safe_name
        
        # Save to file
        quiz_file = quizes_folder / f'{safe_name}.json'
        with open(quiz_file, 'w', encoding='utf-8') as f:
            json.dump(quiz_data, f, indent=2, ensure_ascii=False)
        
        return {'success': True, 'filename': f'{safe_name}.json'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def load_quiz(quiz_name):
    """Load a quiz from a JSON file."""
    try:
        quizes_folder = get_quizes_folder()
        quiz_file = quizes_folder / f'{quiz_name}.json'
        
        if not quiz_file.exists():
            return None
        
        with open(quiz_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        return None

def list_quizes(username=None):
    """List available quizzes. If username provided, returns quizzes created by user or public quizzes."""
    try:
        quizes_folder = get_quizes_folder()
        quizes_folder.mkdir(exist_ok=True)
        
        quizes = []
        for quiz_file in quizes_folder.glob('*.json'):
            try:
                with open(quiz_file, 'r', encoding='utf-8') as f:
                    quiz_data = json.load(f)
                    quiz_creator = quiz_data.get('creator')
                    is_public = quiz_data.get('public', False)
                    
                    # If username provided, filter by creator or public status
                    if username:
                        if quiz_creator == username or is_public:
                            quizes.append({
                                'name': quiz_data.get('name', quiz_file.stem),
                                'filename': quiz_file.name,
                                'pages_count': len(quiz_data.get('pages', [])),
                                'creator': quiz_creator,
                                'public': is_public
                            })
                    else:
                        # No filtering, return all
                        quizes.append({
                            'name': quiz_data.get('name', quiz_file.stem),
                            'filename': quiz_file.name,
                            'pages_count': len(quiz_data.get('pages', [])),
                            'creator': quiz_creator,
                            'public': is_public
                        })
            except:
                continue
        
        return quizes
    except Exception as e:
        return []

def delete_quiz(quiz_name):
    """Delete a quiz file."""
    try:
        quizes_folder = get_quizes_folder()
        quiz_file = quizes_folder / f'{quiz_name}.json'
        
        if not quiz_file.exists():
            return {'success': False, 'error': 'Quiz not found'}
        
        quiz_file.unlink()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def validate_quiz_json(quiz_data):
    """Validate quiz JSON structure."""
    if not isinstance(quiz_data, dict):
        return {'valid': False, 'error': 'Quiz must be an object'}
    
    if 'name' not in quiz_data:
        return {'valid': False, 'error': 'Quiz must have a name'}
    
    if 'pages' not in quiz_data:
        return {'valid': False, 'error': 'Quiz must have pages'}
    
    if not isinstance(quiz_data['pages'], list):
        return {'valid': False, 'error': 'Pages must be an array'}
    
    # Basic validation of page structure
    for i, page in enumerate(quiz_data['pages']):
        if not isinstance(page, dict):
            return {'valid': False, 'error': f'Page {i} must be an object'}
        
        if 'type' not in page:
            return {'valid': False, 'error': f'Page {i} must have a type'}
    
    return {'valid': True}

