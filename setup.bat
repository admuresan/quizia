@echo off
REM Setup script for Windows
echo Creating virtual environment...
python -m venv quizia

echo Activating virtual environment...
call quizia\Scripts\activate.bat

echo Installing dependencies...
pip install -r app/requirements.txt

echo.
echo Setup complete! To run the app:
echo   1. Activate the virtual environment: quizia\Scripts\activate
echo   2. Run: python run.py
echo.

pause



