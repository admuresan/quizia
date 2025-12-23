# Quizia - Quiz Creation and Hosting Application

A web-based application for creating and running interactive quizzes with real-time synchronization.

## Features

- **Quiz Creation**: Drag-and-drop interface for creating quizzes with various elements
- **Real-time Synchronization**: WebSocket-based real-time updates for all views
- **Multiple Answer Types**: Text, multiple choice, checkboxes, image click, and stopwatch
- **Speed-based Scoring**: Points awarded based on answer speed
- **Participant Management**: Join with room codes, rejoin support
- **Quizmaster Dashboard**: Create, edit, manage, and run quizzes

## Setup

1. Create and activate the virtual environment:

**Windows (PowerShell):**
```bash
python -m venv quizia
quizia\Scripts\activate
```

**Windows (CMD - if PowerShell scripts are disabled):**
```bash
python -m venv quizia
quizia\Scripts\activate.bat
```

**Or use the activation script:**
```bash
activate.bat
```

**Linux/Mac:**
```bash
python3 -m venv quizia
source quizia/bin/activate
```

2. Install Python dependencies:
```bash
pip install -r app/requirements.txt
```

3. Create the base quizmaster account (optional, if not already created):
```bash
python setup_admin.py
```

This creates a default quizmaster account:
- Username: `quizmaster`
- Password: `masterquiz`

4. Run the application:
```bash
python run.py
```

The app will launch on `http://localhost:6005` and automatically open in your browser.

**Note:** Remember to activate the virtual environment (`quizia`) before running the app each time.

## Project Structure

```
quizia/
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── routes/              # Route handlers
│   ├── utils/               # Utility functions
│   ├── templates/           # HTML templates
│   ├── static/              # CSS and JavaScript
│   ├── quizes/              # Saved quiz files
│   ├── data/                # Authentication data
│   └── uploads/             # Uploaded media files
└── run.py                   # Launch script
```

## Usage

### Quizmaster

1. Go to Quizmaster Login
2. Request an account or login if you have one
3. Create quizzes using the drag-and-drop editor
4. Start a quiz to generate a room code
5. Share the room code with participants

### Participant

1. Go to Join as Participant
2. Enter the room code
3. Select name and avatar
4. Participate in the quiz

## Development

The app runs in development mode with auto-reload enabled. Changes to Python files will automatically restart the server.
