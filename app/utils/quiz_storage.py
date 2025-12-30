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

def save_quiz(quiz_id, quiz_data, force_recreate=False):
    """Save a quiz to a JSON file using its ID.
    
    Args:
        quiz_id: The ID of the quiz
        quiz_data: The quiz data to save
        force_recreate: If True, delete the old file and create a new one from scratch
    """
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
        
        # If force_recreate is True, delete the old file first
        if force_recreate and quiz_file.exists():
            quiz_file.unlink()
        
        # Write the quiz data to file
        with open(quiz_file, 'w', encoding='utf-8') as f:
            json.dump(quiz_data, f, indent=2, ensure_ascii=False)
        
        return {'success': True, 'id': quiz_id}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def normalize_quiz_to_new_format(quiz_data):
    """
    Normalize quiz data to ensure it's in the new format.
    Ensures all pages have the required structure: page_type, page_order, elements (dict), views.
    """
    if not quiz_data:
        return quiz_data
    
    # Ensure pages exist
    if 'pages' not in quiz_data:
        quiz_data['pages'] = []
    
    if not isinstance(quiz_data['pages'], list):
        return quiz_data
    
    # Default background config
    default_background = {
        'type': 'gradient',
        'config': {
            'colour1': '#667eea',
            'colour2': '#764ba2',
            'angle': 135
        }
    }
    default_size = {
        'width': 1920,
        'height': 1080
    }
    
    # Normalize each page
    for index, page in enumerate(quiz_data['pages']):
        if not isinstance(page, dict):
            continue
        
        # Ensure page_type
        if 'page_type' not in page:
            page['page_type'] = 'quiz_page'
        
        # Ensure page_order
        if 'page_order' not in page or page['page_order'] is None:
            page['page_order'] = index + 1
        
        # Ensure name
        if 'name' not in page or not page['name']:
            page_type = page.get('page_type', 'quiz_page')
            if page_type == 'status_page':
                page['name'] = 'Status Page'
            elif page_type == 'result_page':
                page['name'] = 'Results Page'
            else:
                # Count quiz pages up to this point
                quiz_page_count = sum(1 for p in quiz_data['pages'][:index + 1] 
                                    if p.get('page_type') == 'quiz_page')
                page['name'] = f'Page {quiz_page_count}'
        
        # Ensure elements is a dict (new format only - arrays not supported)
        if 'elements' not in page:
            page['elements'] = {}
        elif isinstance(page['elements'], list):
            # Old format not supported - reject arrays
            raise ValueError(f'Page {index}: elements must be a dictionary, not an array. Old format is not supported.')
        
        # Ensure views structure
        if 'views' not in page:
            page['views'] = {}
        
        # Ensure each view exists with proper structure
        for view_name in ['display', 'participant', 'control']:
            if view_name not in page['views']:
                page['views'][view_name] = {
                    'view_config': {
                        'background': json.loads(json.dumps(default_background)),
                        'size': json.loads(json.dumps(default_size))
                    },
                    'local_element_configs': {}
                }
            else:
                view = page['views'][view_name]
                # Ensure view_config
                if 'view_config' not in view:
                    view['view_config'] = {
                        'background': json.loads(json.dumps(default_background)),
                        'size': json.loads(json.dumps(default_size))
                    }
                else:
                    view_config = view['view_config']
                    # Ensure background
                    if 'background' not in view_config:
                        view_config['background'] = json.loads(json.dumps(default_background))
                    elif not isinstance(view_config['background'], dict):
                        view_config['background'] = json.loads(json.dumps(default_background))
                    else:
                        # Ensure background has type and config
                        if 'type' not in view_config['background']:
                            view_config['background']['type'] = default_background['type']
                        if 'config' not in view_config['background']:
                            view_config['background']['config'] = json.loads(json.dumps(default_background['config']))
                    # Ensure size
                    if 'size' not in view_config:
                        view_config['size'] = json.loads(json.dumps(default_size))
                    elif not isinstance(view_config['size'], dict):
                        view_config['size'] = json.loads(json.dumps(default_size))
                    else:
                        # Ensure size has width and height
                        if 'width' not in view_config['size']:
                            view_config['size']['width'] = default_size['width']
                        if 'height' not in view_config['size']:
                            view_config['size']['height'] = default_size['height']
                
                # Ensure local_element_configs
                if 'local_element_configs' not in view:
                    view['local_element_configs'] = {}
        
        # Special handling for control view - ensure appearance_control_modal exists if needed
        if 'control' in page['views'] and 'appearance_control_modal' not in page['views']['control']:
            # Only add if there are elements that might need it
            if page.get('elements'):
                page['views']['control']['appearance_control_modal'] = {
                    'x': 0,
                    'y': 0,
                    'width': 360,
                    'height': 300,
                    'rotation': 0
                }
    
    return quiz_data

def load_quiz(quiz_id):
    """Load a quiz from a JSON file by ID and normalize it to the new format."""
    try:
        quizes_folder = get_quizes_folder()
        quiz_file = quizes_folder / f'{quiz_id}.json'
        
        if not quiz_file.exists():
            return None
        
        with open(quiz_file, 'r', encoding='utf-8') as f:
            quiz_data = json.load(f)
            # Ensure ID is set
            if 'id' not in quiz_data:
                quiz_data['id'] = quiz_id
            
            # Normalize to new format
            quiz_data = normalize_quiz_to_new_format(quiz_data)
            
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
        
        if 'page_type' not in page:
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

