#!/usr/bin/env python3
"""
Launch script for Quizia app.
Runs Flask-SocketIO server. In production (AppManager) no browser/reloader.
"""
import os
import sys
import time
import webbrowser
import threading
from pathlib import Path

def open_browser():
    """Open browser after a delay to allow server to start."""
    time.sleep(2.0)
    webbrowser.open('http://localhost:6005')

def main():
    app_dir = Path(__file__).parent / 'app'
    sys.path.insert(0, str(app_dir.parent))

    is_production = os.environ.get('FLASK_ENV') == 'production'

    if not is_production:
        os.environ.setdefault('FLASK_ENV', 'development')
        os.environ.setdefault('FLASK_DEBUG', '1')
        if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
            browser_thread = threading.Thread(target=open_browser, daemon=True)
            browser_thread.start()

    from app import create_app, socketio
    app = create_app()

    port = int(os.environ.get('PORT') or os.environ.get('SERVER_PORT') or 6005)
    if is_production:
        socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
    else:
        socketio.run(app, host='localhost', port=port, debug=True, use_reloader=True, allow_unsafe_werkzeug=True)

if __name__ == '__main__':
    main()
