import requests
import json

url = "http://localhost:8000/register"
data = {
    "username": "testuser4",
    "email": "test4@test.com",
    "password": "test123",
    "purpose": "testing"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
