"""
Statistics utilities for tracking quizmaster activity.
"""
import json
from pathlib import Path
from flask import current_app

STATS_FILE = Path(__file__).parent.parent / 'data' / 'stats.json'

def _ensure_stats_file():
    """Ensure stats file exists."""
    STATS_FILE.parent.mkdir(exist_ok=True)
    if not STATS_FILE.exists():
        with open(STATS_FILE, 'w') as f:
            json.dump({'quiz_runs': []}, f)

def _load_stats():
    """Load statistics data."""
    _ensure_stats_file()
    with open(STATS_FILE, 'r') as f:
        return json.load(f)

def _save_stats(data):
    """Save statistics data."""
    _ensure_stats_file()
    with open(STATS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def record_quiz_run(quiz_id, quizmaster_username, room_code, completed=False):
    """Record a quiz run. Uses quiz_id (not quiz_name) as the authoritative identifier."""
    stats = _load_stats()
    import time
    
    # Check if this run already exists (for completion tracking)
    existing_run = None
    for run in stats.get('quiz_runs', []):
        # Support both quiz_id (new) and quiz_name (legacy) for backward compatibility
        run_quiz_id = run.get('quiz_id')
        run_room_code = run.get('room_code')
        if run_room_code == room_code and (run_quiz_id == quiz_id or run.get('quiz_name') == quiz_id):
            existing_run = run
            break
    
    if existing_run:
        # Update existing run
        if completed:
            existing_run['completed'] = True
            existing_run['completed_at'] = time.time()
        # Migrate legacy runs to use quiz_id if needed
        if 'quiz_id' not in existing_run and 'quiz_name' in existing_run:
            existing_run['quiz_id'] = quiz_id
    else:
        # Create new run
        run = {
            'quiz_id': quiz_id,
            'quizmaster': quizmaster_username,
            'room_code': room_code,
            'started_at': time.time(),
            'completed_at': None,
            'completed': completed
        }
        
        if completed:
            run['completed_at'] = time.time()
        
        stats['quiz_runs'].append(run)
    
    _save_stats(stats)

def get_quizmaster_stats(username):
    """Get statistics for a quizmaster."""
    from app.utils.quiz_storage import list_quizes, load_quiz
    
    # Count quizzes created by this quizmaster
    all_quizes = list_quizes()
    quizzes_created = 0
    for quiz in all_quizes:
        quiz_data = load_quiz(quiz.get('id', quiz.get('name')))  # Support both ID and legacy name
        if quiz_data and quiz_data.get('creator') == username:
            quizzes_created += 1
    
    # Count quizzes run (completed) by this quizmaster
    stats = _load_stats()
    quizzes_run = 0
    completed_runs = set()  # Track unique quiz runs that were completed
    
    for run in stats.get('quiz_runs', []):
        if run.get('quizmaster') == username and run.get('completed', False):
            # Count unique quiz runs (use quiz_id if available, fallback to quiz_name for legacy)
            quiz_id = run.get('quiz_id') or run.get('quiz_name', 'unknown')
            run_key = f"{quiz_id}_{run.get('room_code')}"
            if run_key not in completed_runs:
                completed_runs.add(run_key)
                quizzes_run += 1
    
    return {
        'quizzes_created': quizzes_created,
        'quizzes_run': quizzes_run
    }

def get_all_quizmaster_stats():
    """Get statistics for all quizmasters."""
    from app.utils.auth import get_all_quizmasters
    
    quizmasters = get_all_quizmasters()
    stats_dict = {}
    
    for username in quizmasters:
        stats_dict[username] = get_quizmaster_stats(username)
    
    return stats_dict

