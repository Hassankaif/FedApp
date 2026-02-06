import requests

# Your DigitalOcean IP
API_URL = "http://139.59.87.244:8000"

def init_project():
    print(f"🚀 Initializing Project on {API_URL}...")

    # 1. Login (Skipping registration because auth.py doesn't have it)
    print("\n1. Logging in as Hardcoded Admin...")
    login_data = {
        "username": "admin",    # Must be 'admin' per auth.py
        "password": "admin123"  # Must be 'admin123' per auth.py
    }
    
    # Corrected Endpoint: /api/auth/login (Not /token)
    try:
        token_res = requests.post(f"{API_URL}/api/auth/login", json=login_data)
        
        if token_res.status_code != 200:
            print(f"   ❌ Login failed ({token_res.status_code}): {token_res.text}")
            return
        
        # auth.py returns {"access_token": ..., "token_type": ...}
        token = token_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   ✅ Logged in successfully.")
    except Exception as e:
        print(f"   ❌ Connection Error: {e}")
        return

    # 2. Create Project 1
    print("\n2. Creating Project 1...")
    
    model_code = """
import tensorflow as tf
from tensorflow import keras
def create_model(input_shape):
    model = keras.models.Sequential([
        keras.layers.Input(shape=(input_shape,)),
        keras.layers.Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model
"""

    project_data = {
            "name": "Diabetes Prediction",  # <--- Changed from 'title' to 'name'
            "description": "Federated Learning for Hospital Data",
            "owner_id": 1,                  # <--- ADD THIS (Admin ID is usually 1)
            "target_column": "Outcome",
            "csv_schema": "Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age,Outcome",
            "model_code": model_code,
            "num_rounds": 5,                # <--- Good to be explicit
            "min_clients": 1,               # <--- Good to be explicit
            "local_epochs": 5,
            "batch_size": 32
        }

    try:
        proj_res = requests.post(f"{API_URL}/api/projects/", json=project_data, headers=headers)
        
        if proj_res.status_code == 200:
            print("   ✅ Project 1 Created Successfully!")
            print(f"   Project ID: {proj_res.json().get('id')}")
        elif proj_res.status_code == 422:
            print(f"   ⚠️  Validation Error: {proj_res.text}")
        else:
            print(f"   ⚠️  Project Creation Failed: {proj_res.text}")
            
    except Exception as e:
        print(f"   ❌ Connection Error: {e}")

if __name__ == "__main__":
    init_project()