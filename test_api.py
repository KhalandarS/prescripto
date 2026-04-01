import requests

url = "http://127.0.0.1:8000/generate-prescription"
data = {"text": "Patient has had a fever for 3 days and a sore throat"}
response = requests.post(url, json=data)

print(f"Status Code: {response.status_code}")
print(response.json())
