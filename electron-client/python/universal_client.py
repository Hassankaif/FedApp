import flwr as fl
import tensorflow as tf
import pandas as pd
import requests
import argparse
import sys
import tempfile
import importlib.util
import os
# import json
import ast


# API_BASE = "https://api.kaif-federatedapp.me"

class UniversalClient(fl.client.NumPyClient):
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
        history = self.model.fit(
            self.x_train, self.y_train,
            epochs=5, batch_size=32, validation_split=0.1, verbose=0
        )
        loss = history.history['loss'][-1]
        accuracy = history.history['accuracy'][-1]
        print(f"[{self.client_id}] Round - Acc: {accuracy:.4f}, Loss: {loss:.4f}", flush=True)
        return self.model.get_weights(), len(self.x_train), {"loss": float(loss), "accuracy": float(accuracy)}

    def evaluate(self, parameters, config):
        self.model.set_weights(parameters)
        loss, accuracy = self.model.evaluate(self.x_test, self.y_test, verbose=0)
        return float(loss), len(self.x_test), {"accuracy": float(accuracy)}

def load_model_from_api(api_url, project_id, input_shape):
    """Download model code from API"""
    try:
        print(f"⬇️ Downloading model for Project {project_id}...", flush=True)
        response = requests.get(f"{api_url}/api/projects/{project_id}/model-code", verify=False) # Disable SSL using verify=False
        response.raise_for_status()
        data = response.json()
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(data['model_code'])
            temp_path = f.name
        
        spec = importlib.util.spec_from_file_location("dynamic_model", temp_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        os.unlink(temp_path)
        
        return module.create_model(input_shape), data['csv_schema']
    except Exception as e:
        print(f"❌ Model load failed: {e}", flush=True)
        sys.exit(1)



def validate_dataset(csv_path, expected_schema):
    try:
        df = pd.read_csv(csv_path)
        actual_cols = [c.strip() for c in df.columns]

        # Normalize schema if it comes as a string representation
        if isinstance(expected_schema, str):
            try:
                expected_schema = ast.literal_eval(expected_schema)
            except Exception:
                # Fallback: split by comma if literal_eval fails
                expected_schema = expected_schema.split(",")

        # Case: API returns a list containing a single string like ["['age', 'bmi']"]
        if isinstance(expected_schema, list) and len(expected_schema) == 1 and isinstance(expected_schema[0], str):
            # Check if it looks like a list string to avoid breaking single-column schemas
            if expected_schema[0].strip().startswith('['):
                try:
                    expected_schema = ast.literal_eval(expected_schema[0])
                except Exception:
                    expected_schema = expected_schema[0].split(",")

        # --- FIX APPLIED HERE ---
        # Final cleanup: Aggressively strip brackets, quotes, and spaces from each column name.
        # This handles the case where the server sends ["['age'", " 'bmi'"]
        expected_cols = [str(c).strip(" []'\"") for c in expected_schema]

        if sorted(actual_cols) != sorted(expected_cols):
            print(f"❌ Schema Mismatch!", flush=True)
            print(f"Expected: {expected_cols}", flush=True)
            print(f"Found:    {actual_cols}", flush=True)
            sys.exit(1)

        print(f"✅ Dataset validated: {len(df)} rows", flush=True)
        return df
    except Exception as e:
        print(f"❌ Validation error: {e}", flush=True)
        sys.exit(1)


def main():
    # 1. Force UTF-8 for Windows Terminals (optional, but useful)
    if sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except AttributeError:
            pass

    parser = argparse.ArgumentParser()
    parser.add_argument('--project-id', type=int, required=True)
    parser.add_argument('--client-id', type=str, required=True)
    parser.add_argument('--data-path', type=str, required=True)
    # Default to VPS IP:PORT (no Cloudflare tunnel, no SSL)
    parser.add_argument('--server', type=str, default='127.0.0.1:8080')
    parser.add_argument('--api-url', type=str, default='http://127.0.0.1:8000')
    args = parser.parse_args()

    print(f"🚀 Universal FL Client: {args.client_id}", flush=True)
    print(f"Project ID: {args.project_id}", flush=True)
    print(f"Server: {args.server}", flush=True)

    # 2. Fetch project config
    try:
        config_res = requests.get(
            f"{args.api_url}/api/projects/{args.project_id}/model-code"
        ).json()
        schema = config_res['csv_schema']
        target_col = config_res.get('target_column', 'target')
    except Exception as e:
        print(f"❌ API Error: {e}", flush=True)
        sys.exit(1)

    # 3. Validate dataset
    df = validate_dataset(args.data_path, schema)

    if target_col not in df.columns:
        print(f"❌ Target column '{target_col}' not found in CSV", flush=True)
        sys.exit(1)

    # 4. Prepare data
    X = df.drop(columns=[target_col]).values
    y = df[target_col].values

    # Optional normalization (keep if you want)
    X = (X - X.mean(axis=0)) / (X.std(axis=0) + 1e-7)

    split = int(0.8 * len(X))
    x_train, x_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    # 5. Load model
    model, _ = load_model_from_api(args.api_url,args.project_id, X.shape[1])

    # 6. Create client
    client = UniversalClient(model, x_train, y_train, x_test, y_test,
                             args.client_id, args.project_id)

    print(f"📡 Connecting to FL Server at {args.server}...", flush=True)

    # 7. Start client (no SSL, insecure=True)
    fl.client.start_client(
        server_address=args.server,
        client=client.to_client(),
        insecure=True  # Explicitly allow raw IP connection
    )

    print(f"✅ Training complete!", flush=True)

if __name__ == "__main__":
    main()