import flwr as fl
import tensorflow as tf
import numpy as np
import pandas as pd
from typing import Dict, Tuple
import argparse
import yaml
import requests  # <--- [CHANGE 1] Added requests library to talk to HTTP API

class DiabetesClient(fl.client.NumPyClient):
    """Flower client for diabetes prediction model"""
    
    def __init__(self, model, x_train, y_train, x_test, y_test, client_id):
        self.model = model
        self.x_train = x_train
        self.y_train = y_train
        self.x_test = x_test
        self.y_test = y_test
        self.client_id = client_id
    
    def get_parameters(self, config):
        return self.model.get_weights()
    
    def fit(self, parameters, config):
        self.model.set_weights(parameters)
        history = self.model.fit(
            self.x_train, 
            self.y_train,
            epochs=5,
            batch_size=32,
            validation_split=0.1,
            verbose=0
        )
        return self.model.get_weights(), len(self.x_train), {
            "loss": float(history.history['loss'][-1]),
            "accuracy": float(history.history['accuracy'][-1])
        }
    
    def evaluate(self, parameters, config):
        self.model.set_weights(parameters)
        loss, accuracy = self.model.evaluate(self.x_test, self.y_test, verbose=0)
        return float(loss), len(self.x_test), {"accuracy": float(accuracy)}

def create_model(input_shape):
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(input_shape,)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def load_local_data(data_path):
    print(f"Loading data from {data_path}...")
    df = pd.read_csv(data_path)
    X = df.iloc[:, :-1].values
    y = df.iloc[:, -1].values
    X = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-7)
    split_idx = int(0.8 * len(X))
    return X[:split_idx], y[:split_idx], X[split_idx:], y[split_idx:], X.shape[1]

# <--- [CHANGE 2] New function to register with backend
def register_client(api_url, client_id, sample_count):
    """Register this client with the dashboard backend"""
    try:
        print(f"Registering with backend at {api_url}...")
        # This matches the /api/clients/register endpoint in backend/main.py
        response = requests.post(
            f"{api_url}/api/clients/register",
            json={"client_id": client_id, "total_samples": sample_count},
            timeout=5
        )
        if response.status_code == 200:
            print(f"✓ UI Status: Online")
        else:
            print(f"⚠ UI Registration Failed: {response.text}")
    except Exception as e:
        print(f"⚠ Could not connect to Dashboard Backend: {e}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', type=str, default='config.yaml', help='Config file path')
    parser.add_argument('--client-id', type=str, required=True, help='Client ID')
    parser.add_argument('--data-path', type=str, required=True, help='Data path')
    parser.add_argument('--server', type=str, default='localhost:8080', help='FL Server address')
    # <--- [CHANGE 3] Added argument for Backend API URL
    parser.add_argument('--api', type=str, default='http://localhost:8000', help='Backend API URL')
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print(f"🏥 Federated Learning Client: {args.client_id}")
    print("="*60)
    
    X_train, y_train, X_test, y_test, input_dim = load_local_data(args.data_path)
    model = create_model(input_dim)
    
    # CALL REGISTRATION BEFORE STARTING FLOWER CLIENT
    register_client(args.api, args.client_id, len(X_train))
    
    print(f"Connecting to FL server at {args.server}...")
    
    fl.client.start_numpy_client(
        server_address=args.server,
        client=DiabetesClient(model, X_train, y_train, X_test, y_test, args.client_id)
    )

if __name__ == "__main__":
    main()