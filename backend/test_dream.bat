@echo off
echo ========================================
echo Testing DREAM Feature Extraction
echo ========================================
echo.

REM Activate virtual environment
call .venv\Scripts\activate.bat

echo ✓ Virtual environment activated
echo.

REM Run test script
python test_dream_extraction.py

echo.
echo ========================================
pause
