@echo off
echo ========================================
echo Starting DREAM Dataset Analysis API
echo ========================================
echo.

REM Activate virtual environment
call .venv\Scripts\activate.bat

echo ✓ Virtual environment activated
echo.

REM Install/update required packages
echo Installing Flask dependencies...
pip install flask flask-cors --quiet
echo.

REM Set environment variables
set DREAM_API_PORT=5001
set PYTHON_PATH=python

REM Start the Flask API
echo Starting DREAM API server on port 5001...
echo Access API at: http://localhost:5001/api/health
echo.

python dream_api.py

pause
