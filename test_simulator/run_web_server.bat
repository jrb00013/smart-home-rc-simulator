@echo off
REM Windows batch script to run the web-based 3D TV simulator
echo ========================================
echo   Virtual TV Simulator - Web Server
echo ========================================
echo.
echo Starting 3D/VR-like TV experience...
echo.
echo The server will start at: http://localhost:5000
echo Open this URL in your browser to see the 3D TV!
echo.
echo Press Ctrl+C to stop the server
echo.
python web_server.py
pause


