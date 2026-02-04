import flwr as fl
import tensorflow as tf
import pandas as pd
import requests
import argparse
import sys
import tempfile
import importlib.util
import os
import ssl
import ast

# Try to import certifi for robust SSL on Windows
try:
    import certifi
    CERTIFI_AVAILABLE = True
except ImportError:
    CERTIFI_AVAILABLE = False

# Default API URL (can be overridden)
API_BASE = "https://api.kaif-federatedapp.me"

class UniversalClient(fl.client.NumPyClient):
    """Dynamic FL client that trains whatever model the server sends"""
    def __init__(self, model, x_train, y_train, x_test, y_test, client_id, project_id):
        self.model = model
        self.x_train = x_train
        self.y_train = y_train
        self.x_test = x_test
        self.y_test = y_test
        self.client_id = client_id
        self.project_id = project_id

    def get_parameters(self, config):
        return self.model.get_weights()

    def fit(self, parameters, config):
        self.model.set_weights(parameters)
        # Train locally
        history = self.model.fit(
            self.x_train, self.y_train,
            epochs=5, batch_size=32, validation_split=0.1, verbose=0
        )
        # Report metrics
        loss = history.history['loss'][-1]
        accuracy = history.history['accuracy'][-1]
        print(f"[{self.client_id}] Round complete - Acc: {accuracy:.4f}, Loss: {loss:.4f}", flush=True)
        
        return self.model.get_weights(), len(self.x_train), {"loss": float(loss), "accuracy": float(accuracy)}

    def evaluate(self, parameters, config):
        self.model.set_weights(parameters)
        loss, accuracy = self.model.evaluate(self.x_test, self.y_test, verbose=0)
        return float(loss), len(self.x_test), {"accuracy": float(accuracy)}

def load_model_from_api(project_id, input_shape):
    """Downloads model.py from the Admin API"""
    try:
        print(f"⬇️ Downloading model for Project {project_id}...", flush=True)
        response = requests.get(f"{API_BASE}/api/projects/{project_id}/model-code")
        response.raise_for_status()
        data = response.json()
        
        # Save code to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(data['model_code'])
            temp_path = f.name
            
        # Dynamic Import
        spec = importlib.util.spec_from_file_location("dynamic_model", temp_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        os.unlink(temp_path) # Cleanup
        
        return module.create_model(input_shape), data['csv_schema']
    except Exception as e:
        print(f"❌ Failed to load model: {e}", flush=True)
        sys.exit(1)

def validate_dataset(csv_path, expected_schema):
    """Ensures the user selected the right CSV file (Robust Version)"""
    try:
        df = pd.read_csv(csv_path)
        actual_cols = sorted([c.strip() for c in df.columns])
        
        clean_schema = []
        if isinstance(expected_schema, str):
            if expected_schema.startswith("[") and expected_schema.endswith("]"):
                try:
                    expected_schema = ast.literal_eval(expected_schema)
                except:
                    pass
        
        if isinstance(expected_schema, list):
            for col in expected_schema:
                clean = str(col).replace("'", "").replace('"', "").replace("[", "").replace("]", "").strip()
                clean_schema.append(clean)
        elif isinstance(expected_schema, str):
             clean_schema = [s.strip() for s in expected_schema.split(',')]

        expected_cols = sorted(clean_schema)

        if actual_cols != expected_cols:
            print(f"❌ Schema Mismatch!", flush=True)
            print(f"Expected: {expected_cols}", flush=True)
            print(f"Found:    {actual_cols}", flush=True)
            sys.exit(1)
            
        print(f"✅ Schema Validated: {len(df)} rows", flush=True)
        return df
    except Exception as e:
        print(f"❌ Data Error: {e}", flush=True)
        sys.exit(1)

def main():
    # 1. Force UTF-8 for Windows Terminals
    if sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            pass 

    parser = argparse.ArgumentParser()
    parser.add_argument('--project-id', type=int, required=True)
    parser.add_argument('--client-id', type=str, required=True)
    parser.add_argument('--data-path', type=str, required=True)
    parser.add_argument('--server', type=str, default='fl.kaif-federatedapp.me:443')
    parser.add_argument('--api-url', type=str, default='https://api.kaif-federatedapp.me')
    
    args = parser.parse_args()
    
    # 2. Setup Global Config
    global API_BASE
    API_BASE = args.api_url
    print(f"⏳ Connecting to Admin Server at {API_BASE}...", flush=True)
    
    # 3. Fetch Config & Load Data
    try:
        config_res = requests.get(f"{API_BASE}/api/projects/{args.project_id}/model-code").json()
        schema = config_res['csv_schema']
    except Exception as e:
        print(f"❌ API Error: {e}", flush=True)
        return

    df = validate_dataset(args.data_path, schema)
    target_col = config_res['target_column']
    
    X = df.drop(columns=[target_col]).values
    y = df[target_col].values
    
    model, _ = load_model_from_api(args.project_id, X.shape[1])
    
    split = int(0.8 * len(X))
    x_train, x_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    
    # 4. SETUP SSL & PORT LOGIC
    # If running locally, DISABLE SSL and KEEP Port 8080
    root_pem = None
    if "127.0.0.1" in args.server or "localhost" in args.server:
        print("⚠️ Local Mode: SSL Disabled", flush=True)
        # Do not modify port!
    else:
        # If running on Cloudflare, FORCE SSL and Port 443
        if ":80" in args.server and "kaif-federatedapp.me" in args.server:
            args.server = args.server.replace(":80", ":443")
        
        if CERTIFI_AVAILABLE:
            root_pem = open(certifi.where(), 'rb').read()

    # 5. START CLIENT
    numpy_client = UniversalClient(model, x_train, y_train, x_test, y_test, args.client_id, args.project_id)
    
    print(f"🚀 Connecting to FL Server: {args.server}", flush=True)
    
    fl.client.start_client(
        server_address=args.server,
        client=numpy_client.to_client(), 
        root_certificates=root_pem  # Will be None for localhost, Valid for Cloudflare
    )

if __name__ == "__main__":
    main()