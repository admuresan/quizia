#!/usr/bin/env python3
"""
Launch script for Quizia app.
Launches Flask app in dev mode and opens browser.
"""
import os
import sys
import time
import webbrowser
import threading
from pathlib import Path

def open_browser():
    """Open browser after a delay to allow server to start."""
    time.sleep(2.0)  # Give server time to start
    webbrowser.open('http://localhost:6005')

def main():
    """Launch the Flask app in development mode."""
    # Add app directory to path
    app_dir = Path(__file__).parent / 'app'
    sys.path.insert(0, str(app_dir.parent))
    
    # Set environment variables
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_DEBUG'] = '1'
    
    # Only open browser in the parent process (main process), not on reloads
    # WERKZEUG_RUN_MAIN is set to 'true' only in the reloader child process
    # By checking != 'true', we ensure browser only opens once on initial start
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        # Open browser in separate thread (only in parent process, once)
        browser_thread = threading.Thread(target=open_browser, daemon=True)
        browser_thread.start()
    
    # Import and run Flask app
    from app import create_app, socketio
    
    app = create_app()
    # Use allow_unsafe_werkzeug=True for development mode with threading
    socketio.run(app, host='localhost', port=6005, debug=True, use_reloader=True, allow_unsafe_werkzeug=True)

if __name__ == '__main__':
    main()

