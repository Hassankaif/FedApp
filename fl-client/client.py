"""
Enhanced Federated Learning Client
Added: Model download capability after training
"""

import flwr as fl
import tensorflow as tf
import numpy as np
import pandas as pd
from typing import Dict, Tuple
import argparse
import requests
import pickle
import os

BACKEND_URL = "http://localhost:8000"

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
        """Return current model parameters"""
        return self.model.get_weights()
    
    def fit(self, parameters, config):
        """Train model on local data"""
        # Update local model with global parameters
        self.model.set_weights(parameters)
        
        # Train locally
        history = self.model.fit(
            self.x_train, 
            self.y_train,
            epochs=5,
            batch_size=32,
            validation_split=0.1,
            verbose=0
        )
        
        # Get training metrics
        loss = history.history['loss'][-1]
        accuracy = history.history['accuracy'][-1]
        
        print(f"\n[Client {self.client_id}] Local training complete:")
        print(f"  - Loss: {loss:.4f}")
        print(f"  - Accuracy: {accuracy:.4f}")
        
        # Return updated model parameters and metrics
        return self.model.get_weights(), len(self.x_train), {
            "loss": float(loss),
            "accuracy": float(accuracy)
        }
    
    def evaluate(self, parameters, config):
        """Evaluate model on local test data"""
        self.model.set_weights(parameters)
        
        loss, accuracy = self.model.evaluate(self.x_test, self.y_test, verbose=0)
        
        print(f"[Client {self.client_id}] Evaluation - Loss: {loss:.4f}, Accuracy: {accuracy:.4f}")
        
        return float(loss), len(self.x_test), {
            "accuracy": float(accuracy)
        }

def create_model(input_shape):
    """Create TensorFlow model for diabetes prediction"""
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(input_shape,)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def load_local_data(data_path):
    """Load and preprocess local hospital data"""
    print(f"Loading data from {data_path}...")
    
    # Load CSV
    df = pd.read_csv(data_path)
    
    # Separate features and target
    X = df.iloc[:, :-1].values
    y = df.iloc[:, -1].values
    
    # Normalize features
    X = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-7)
    
    # Split into train/test
    split_idx = int(0.8 * len(X))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print(f"✓ Data loaded: {len(X_train)} train, {len(X_test)} test samples")
    
    return X_train, y_train, X_test, y_test, X.shape[1]

def download_global_model(client_id):
    """Download global model from server after training"""
    try:
        print(f"\n📥 Downloading global model for {client_id}...")
        
        response = requests.get(
            f"{BACKEND_URL}/api/model/download/global",
            timeout=10
        )
        
        if response.status_code == 200:
            # Save model locally
            os.makedirs(f"client_models/{client_id}", exist_ok=True)
            model_path = f"client_models/{client_id}/global_model.pkl"
            
            with open(model_path, 'wb') as f:
                f.write(response.content)
            
            print(f"✓ Global model saved to: {model_path}")
            return model_path
        else:
            print(f"⚠ Failed to download model: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"⚠ Error downloading model: {e}")
        return None

def register_client(client_id, total_samples):
    """Register client with backend"""
    try:
        payload = {
            "client_id": client_id,
            "total_samples": total_samples
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/clients/register",
            json=payload,
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"✓ Registered with backend")
        
    except Exception as e:
        print(f"⚠ Could not register with backend: {e}")

def main():
    """Start the Flower FL client"""
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--client-id', type=str, required=True, help='Client ID (e.g., hospital_a)')
    parser.add_argument('--data-path', type=str, required=True, help='Path to local CSV data')
    parser.add_argument('--server', type=str, default='localhost:8080', help='Server address')
    parser.add_argument('--download-model', action='store_true', help='Download global model after training')
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print(f"🏥 Federated Learning Client: {args.client_id}")
    print("="*60)
    
    # Load local data
    X_train, y_train, X_test, y_test, input_dim = load_local_data(args.data_path)
    
    # Register with backend
    register_client(args.client_id, len(X_train) + len(X_test))
    
    # Create model
    print("Creating local model...")
    model = create_model(input_dim)
    
    print(f"Connecting to FL server at {args.server}...")
    print("="*60 + "\n")
    
    # Create Flower client
    client = DiabetesClient(
        model=model,
        x_train=X_train,
        y_train=y_train,
        x_test=X_test,
        y_test=y_test,
        client_id=args.client_id
    )
    
    # Start Flower client
    fl.client.start_numpy_client(
        server_address=args.server,
        client=client
    )
    
    print(f"\n✓ Client {args.client_id} training complete")
    
    # Download global model if requested
    if args.download_model:
        download_global_model(args.client_id)
    else:
        print("\n💡 Tip: Add --download-model flag to download the global model")
    
    print(f"\n✓ Client {args.client_id} disconnected successfully")

if __name__ == "__main__":
    main()