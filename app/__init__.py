"""
Quizia - Quiz creation and hosting application.
Flask application factory.
"""
from flask import Flask
from flask_socketio import SocketIO
import os
from pathlib import Path

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
    
    # Initialize Socket.IO with threading mode (better for Windows)
    socketio.init_app(app, async_mode='threading', cors_allowed_origins="*")
    
    # Register blueprints
    from app.routes import main, auth, quiz, websocket, media
    app.register_blueprint(main.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(quiz.bp)
    app.register_blueprint(websocket.bp)
    app.register_blueprint(media.bp)
    
    return app

