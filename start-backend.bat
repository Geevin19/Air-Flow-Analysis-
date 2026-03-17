@echo off
cd backend
py -m uvicorn main:app --reload
pause
