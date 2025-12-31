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

socketio = SocketIO(cors_allowed_origins="*")

def create_app():
    """Create and configure Flask application."""
    app = Flask(__name__, 
                static_folder='static',
                template_folder='templates')
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
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
    
    # Register blueprints
    from app.routes import main, auth, quiz, websocket, media, debug
    app.register_blueprint(main.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(quiz.bp)
    app.register_blueprint(websocket.bp)
    app.register_blueprint(media.bp)
    app.register_blueprint(debug.bp)
    
    return app

