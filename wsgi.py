#!/usr/bin/env python3
"""
Production WSGI entry point for Quizia application.
Used by Gunicorn in production deployment.
"""
import os
import sys
from pathlib import Path

# Add app directory to path
app_dir = Path(__file__).parent
sys.path.insert(0, str(app_dir))

# Load environment variables from .env file
env_file = app_dir / '.env'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

from app import create_app, socketio

app = create_app()

if __name__ == "__main__":
    # For development/testing only
    socketio.run(app, host='0.0.0.0', port=6005, debug=False)

