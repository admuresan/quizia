"""
Quizia - Quiz creation and hosting application.
Flask application factory.
"""
from flask import Flask
from flask_socketio import SocketIO
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# When behind path proxy (APPLICATION_ROOT e.g. /quizia), Socket.IO must be served under that prefix
_app_root = os.environ.get('APPLICATION_ROOT', '') or ''
_socketio_path = (_app_root.rstrip('/') + '/socket.io') if _app_root else '/socket.io'
socketio = SocketIO(cors_allowed_origins="*", path=_socketio_path)

def create_app():
    """Create and configure Flask application."""
    app = Flask(__name__, 
                static_folder='static',
                template_folder='templates')
    
    # Configure ProxyFix middleware to handle reverse proxy headers
    # ProxyFix is safe to use even when not behind a proxy - it only processes
    # X-Forwarded-* headers if they're present. If not present, requests pass through unchanged.
    # This allows the app to work correctly in both proxied and non-proxied setups.
    # 
    # Security: x_for=1 means we only trust headers from 1 proxy layer.
    # If a client sends X-Forwarded-* headers directly (no proxy), ProxyFix will
    # process them, but this is generally safe as it only affects URL generation,
    # not authentication or authorization.
    try:
        from werkzeug.middleware.proxy_fix import ProxyFix
        # x_for=1: trust 1 proxy for X-Forwarded-For
        # x_proto=1: trust 1 proxy for X-Forwarded-Proto
        # x_host=1: trust 1 proxy for X-Forwarded-Host
        # x_port=1: trust 1 proxy for X-Forwarded-Port
        # x_prefix=1: trust 1 proxy for X-Forwarded-Prefix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)
        print("[App] ProxyFix middleware enabled (works in both proxied and non-proxied setups)")
    except ImportError:
        print("[App] WARNING: werkzeug.middleware.proxy_fix not available. Install werkzeug>=0.15.0 for proxy support.")
        print("[App] The app will still work, but may not handle reverse proxy headers correctly.")
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    # Cookie isolation: multiple apps share the same domain, so cookie names must be unique per app.
    app.config['SESSION_COOKIE_NAME'] = os.environ.get('SESSION_COOKIE_NAME', 'quizia_session')
    app.config['SESSION_COOKIE_PATH'] = os.environ.get('APPLICATION_ROOT', '') or '/'
    app.config['UPLOAD_FOLDER'] = Path(__file__).parent / 'uploads'
    app.config['QUIZES_FOLDER'] = Path(__file__).parent / 'quizes'
    app.config['AVATARS_FOLDER'] = Path(__file__).parent / 'static' / 'avatars'
    
    # Create necessary directories
    app.config['UPLOAD_FOLDER'].mkdir(exist_ok=True)
    app.config['QUIZES_FOLDER'].mkdir(exist_ok=True)
    app.config['AVATARS_FOLDER'].mkdir(exist_ok=True)
    
    # Initialize Socket.IO - try eventlet first, fallback to threading
    # eventlet has better WebSocket support, threading is fallback for Windows
    try:
        import eventlet
        socketio.init_app(app, async_mode='eventlet', cors_allowed_origins="*")
    except ImportError:
        socketio.init_app(app, async_mode='threading', cors_allowed_origins="*")
    
    # Restore rooms from disk on startup
    # In development (with reloader), only restore in the main process (not on reloads)
    # In production (Gunicorn), WERKZEUG_RUN_MAIN is not set, so we always restore
    # This ensures rooms are restored in production after server restarts
    should_restore = True
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'false':
        # Development mode reloader child process - skip restoration
        should_restore = False
    
    if should_restore:
        from app.utils.room_manager import restore_rooms
        restored = restore_rooms()
        if restored > 0:
            print(f"Restored {restored} room(s) from disk")
    
    # When deployed under a subpath (e.g. APPLICATION_ROOT=/quizmaster), ensure request.script_root
    # is set so url_for() and APP_BASE_PATH in templates generate correct URLs. ProxyFix sets
    # SCRIPT_NAME from X-Forwarded-Prefix when present; if not, use APPLICATION_ROOT.
    @app.before_request
    def _set_script_root():
        from flask import request
        if _app_root and not request.environ.get('SCRIPT_NAME'):
            request.environ['SCRIPT_NAME'] = _app_root.rstrip('/')

    # Register blueprints
    from app.routes import main, auth, quiz, websocket, media, debug
    app.register_blueprint(main.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(quiz.bp)
    app.register_blueprint(websocket.bp)
    app.register_blueprint(media.bp)
    app.register_blueprint(debug.bp)
    
    return app

