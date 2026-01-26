"""
Debug routes for diagnosing TV display issues.
"""
from flask import Blueprint, jsonify
from app.utils.room_manager import get_room

bp = Blueprint('debug', __name__)

@bp.route('/api/debug/room/<room_code>')
def debug_room(room_code):
    """Debug endpoint to check room status."""
    room = get_room(room_code)
    if not room:
        return jsonify({
            'exists': False,
            'error': 'Room not found'
        }), 404
    
    return jsonify({
        'exists': True,
        'room_code': room_code,
        'quiz_name': room.get('quiz_name', 'Unknown'),
        'current_page': room.get('current_page', 0),
        'ended': room.get('ended', False),
        'participants_count': len(room.get('participants', {})),
        'has_quiz': 'quiz' in room and room['quiz'] is not None,
        'pages_count': len(room.get('quiz', {}).get('pages', [])) if room.get('quiz') else 0
    })

@bp.route('/api/debug/test-playwright')
def test_playwright():
    """Test if Playwright can launch browser."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto('http://127.0.0.1:6005/', timeout=10000)
            title = page.title()
            browser.close()
            return jsonify({
                'success': True,
                'playwright_available': True,
                'test_page_title': title
            })
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'playwright_available': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500






