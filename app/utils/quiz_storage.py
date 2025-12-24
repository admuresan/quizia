"""
Quiz storage utilities.
"""
import json
import uuid
from pathlib import Path
from flask import current_app

def get_quizes_folder():
    """Get the quizes folder path."""
    try:
        return current_app.config['QUIZES_FOLDER']
    except:
        # Fallback if not in app context
        return Path(__file__).parent.parent / 'quizes'

def save_quiz(quiz_id, quiz_data):
    """Save a quiz to a JSON file using its ID."""
    try:
        quizes_folder = get_quizes_folder()
        quizes_folder.mkdir(exist_ok=True)
        
        # Ensure quiz_data has an id
        quiz_data['id'] = quiz_id
        
        # Ensure quiz_data has a name (for display)
        if 'name' not in quiz_data:
            quiz_data['name'] = 'Untitled Quiz'
        
        # Save to file using ID
        quiz_file = quizes_folder / f'{quiz_id}.json'
        with open(quiz_file, 'w', encoding='utf-8') as f:
            json.dump(quiz_data, f, indent=2, ensure_ascii=False)
        
        return {'success': True, 'id': quiz_id}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def load_quiz(quiz_id):
    """Load a quiz from a JSON file by ID."""
    try:
        quizes_folder = get_quizes_folder()
        quiz_file = quizes_folder / f'{quiz_id}.json'
        
        if not quiz_file.exists():
            return None
        
        with open(quiz_file, 'r', encoding='utf-8') as f:
            quiz_data = json.load(f)
            # Ensure ID is set (for backwards compatibility)
            if 'id' not in quiz_data:
                quiz_data['id'] = quiz_id
            return quiz_data
    except Exception as e:
        return None

def generate_quiz_id():
    """Generate a new unique quiz ID."""
    return str(uuid.uuid4())

def list_quizes(username=None):
    """
    List available quizzes. If username provided, returns quizzes created by user or public quizzes.
    
    IMPORTANT: Always returns quiz objects with 'id' field. This ID must be used for all
    API calls (load, start, delete, etc.). Never look up quizzes by name at runtime,
    as multiple quizzes can have the same name.
    
    Returns:
        List of dicts, each containing:
            - id (str): REQUIRED unique quiz identifier - ALWAYS use this for API calls
            - name (str): Display name (can be duplicated across quizzes)
            - pages_count (int): Number of pages in the quiz
            - creator (str): Username of quiz creator
            - public (bool): Whether quiz is public
    """
    try:
        quizes_folder = get_quizes_folder()
        quizes_folder.mkdir(exist_ok=True)
        
        quizes = []
        for quiz_file in quizes_folder.glob('*.json'):
            try:
                with open(quiz_file, 'r', encoding='utf-8') as f:
                    quiz_data = json.load(f)
                    quiz_id = quiz_data.get('id', quiz_file.stem)
                    
                    # CRITICAL: Ensure ID is always present and valid
                    if not quiz_id or not isinstance(quiz_id, str) or len(quiz_id.strip()) == 0:
                        # Fallback to filename stem if ID is missing/invalid
                        quiz_id = quiz_file.stem
                    
                    quiz_creator = quiz_data.get('creator')
                    is_public = quiz_data.get('public', False)
                    
                    # Ensure ID is set in quiz data (for backwards compatibility with old files)
                    if 'id' not in quiz_data or quiz_data['id'] != quiz_id:
                        quiz_data['id'] = quiz_id
                        # Save with ID for future loads
                        with open(quiz_file, 'w', encoding='utf-8') as wf:
                            json.dump(quiz_data, wf, indent=2, ensure_ascii=False)
                    
                    # If username provided, filter by creator or public status
                    if username:
                        if quiz_creator == username or is_public:
                            quizes.append({
                                'id': quiz_id,  # REQUIRED: Always include ID for API calls
                                'name': quiz_data.get('name', 'Untitled Quiz'),
                                'pages_count': len(quiz_data.get('pages', [])),
                                'creator': quiz_creator,
                                'public': is_public
                            })
                    else:
                        # No filtering, return all
                        quizes.append({
                            'id': quiz_id,  # REQUIRED: Always include ID for API calls
                            'name': quiz_data.get('name', 'Untitled Quiz'),
                            'pages_count': len(quiz_data.get('pages', [])),
                            'creator': quiz_creator,
                            'public': is_public
                        })
            except:
                continue
        
        return quizes
    except Exception as e:
        return []

def delete_quiz(quiz_id):
    """Delete a quiz file by ID."""
    try:
        quizes_folder = get_quizes_folder()
        quiz_file = quizes_folder / f'{quiz_id}.json'
        
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
    
    # Name is required for display purposes
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

def copy_quiz(quiz_id, new_creator_username):
    """Create a copy of a quiz with a new ID and creator."""
    original_quiz = load_quiz(quiz_id)
    if not original_quiz:
        return {'success': False, 'error': 'Quiz not found'}
    
    # Create a deep copy
    import copy
    new_quiz = copy.deepcopy(original_quiz)
    
    # Generate new ID and set new creator
    new_quiz_id = generate_quiz_id()
    new_quiz['id'] = new_quiz_id
    new_quiz['creator'] = new_creator_username
    new_quiz['public'] = False  # Copied quizzes are private by default
    
    # Save the new quiz
    result = save_quiz(new_quiz_id, new_quiz)
    if result['success']:
        result['id'] = new_quiz_id
        result['name'] = new_quiz['name']
    
    return result

