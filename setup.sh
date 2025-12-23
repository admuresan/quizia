#!/bin/bash
# Setup script for Linux/Mac

echo "Creating virtual environment..."
python3 -m venv quizia

echo "Activating virtual environment..."
source quizia/bin/activate

echo "Installing dependencies..."
pip install -r app/requirements.txt

echo ""
echo "Setup complete! To run the app:"
echo "  1. Activate the virtual environment: source quizia/bin/activate"
echo "  2. Run: python run.py"
echo ""

