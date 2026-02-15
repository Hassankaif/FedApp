# fl-server/dynamic_server.py - FIXED VERSION
import flwr as fl
from flwr.server.strategy import FedAvg, FedProx
import requests
import time
import pickle
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env at project root
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

API_BASE = os.getenv("API_BASE", "http://localhost:8000")
POLL_INTERVAL = 3

# --- 1. The Reporting Logic (Mixin) ---
class ReportingMixin:
    def report_metrics(self, server_round, results):
        if not results:
            return
        
        # Calculate Averages
        accuracies = [r.metrics.get("accuracy", 0) for _, r in results]
        losses = [r.metrics.get("loss", 0) for _, r in results]
        avg_acc = sum(accuracies) / len(accuracies) if accuracies else 0
        avg_loss = sum(losses) / len(losses) if losses else 0

        # Send to Backend
        try:
            payload = {
                "round": server_round,
                "num_clients": len(results),
                "accuracy": avg_acc,
                "loss": avg_loss,
                "client_metrics": {"accuracies": accuracies},
                "timestamp": datetime.utcnow().isoformat()
            }
            requests.post(f"{API_BASE}/api/training/metrics", json=payload)
            print(f"✅ Round {server_round} ({self.__class__.__name__}): Acc={avg_acc:.4f}")
        except Exception as e:
            print(f"❌ Reporting failed: {e}")

    def save_and_upload_model(self, parameters):
        if not parameters: 
            return
        timestamp = int(time.time())
        filename = f"global_model_{timestamp}.pkl"
        # Save locally
        with open(filename, "wb") as f:
            pickle.dump(parameters, f)
        
        # Upload
        try:
            with open(filename, "rb") as f:
                requests.post(
                    f"{API_BASE}/api/model/save", 
                    files={'file': (filename, f, 'application/octet-stream')}
                )
            print(f"💾 Model uploaded: {filename}")
        except Exception as e:
            print(f"⚠️ Upload failed: {e}")
        
        if os.path.exists(filename):
            os.remove(filename)

# --- 2. The Custom Strategies ---

class CustomFedAvg(FedAvg, ReportingMixin):
    def aggregate_fit(self, server_round, results, failures):
        aggregated_parameters, aggregated_metrics = super().aggregate_fit(server_round, results, failures)
        self.report_metrics(server_round, results)
        if aggregated_parameters:
            self.save_and_upload_model(aggregated_parameters)
        return aggregated_parameters, aggregated_metrics

class CustomFedProx(FedProx, ReportingMixin):
    def aggregate_fit(self, server_round, results, failures):
        aggregated_parameters, aggregated_metrics = super().aggregate_fit(server_round, results, failures)
        self.report_metrics(server_round, results)
        if aggregated_parameters:
            self.save_and_upload_model(aggregated_parameters)
        return aggregated_parameters, aggregated_metrics

# --- 3. The Main Loop ---

def run_fl_session(session_id, strategy_name, project_id):
    """🔥 FIX #3: Fetch config from DB and run FL training"""
    print(f"🚀 Starting Session {session_id} for Project {project_id} using {strategy_name}")
    
    # 🔥 FETCH PROJECT CONFIGURATION FROM DATABASE
    try:
        config_res = requests.get(f"{API_BASE}/api/projects/{project_id}", timeout=10)
        config_res.raise_for_status()
        project_data = config_res.json()['project']
        
        num_rounds = project_data.get('num_rounds', 5)
        local_epochs = project_data.get('local_epochs', 5)
        batch_size = project_data.get('batch_size', 32)
        min_clients = project_data.get('min_clients', 1)
        
        print(f"📋 Loaded Config from DB:")
        print(f"   - Rounds: {num_rounds}")
        print(f"   - Local Epochs: {local_epochs}")
        print(f"   - Batch Size: {batch_size}")
        print(f"   - Min Clients: {min_clients}")
        
    except Exception as e:
        print(f"⚠️ Failed to fetch project config: {e}")
        print(f"   Using fallback defaults...")
        num_rounds, local_epochs, batch_size, min_clients = 5, 5, 32, 1
    
    # 🔥 DYNAMIC STRATEGY SELECTION
    if strategy_name == "FedProx":
        strategy = CustomFedProx(
            proximal_mu=0.1,  # Regularization for non-IID data
            fraction_fit=1.0,
            fraction_evaluate=1.0,
            min_fit_clients=max(1, min_clients),
            min_available_clients=max(1, min_clients)
        )
    else:
        strategy = CustomFedAvg(
            fraction_fit=1.0,
            fraction_evaluate=1.0,
            min_fit_clients=max(1, min_clients),
            min_available_clients=max(1, min_clients)
        )

    # 🔥 PASS CONFIG TO CLIENTS VIA on_fit_config_fn
    def fit_config(server_round: int):
        """This function is called before each round to provide config to clients"""
        return {
            "local_epochs": local_epochs,
            "batch_size": batch_size,
            "server_round": server_round
        }
    
    strategy.on_fit_config_fn = fit_config

    # 🔥 START SERVER WITH DYNAMIC NUM_ROUNDS FROM DB
    print(f"🎯 Starting Flower Server on 0.0.0.0:8080")
    print(f"   Waiting for {min_clients} clients to connect...")
    
    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=num_rounds),  # ✅ FROM DATABASE
        strategy=strategy
    )
    
    print(f"✅ Training completed after {num_rounds} rounds")

def main():
    print("="*60)
    print("⏳ FL Server Manager Online (Polling Mode)")
    print(f"   API Base: {API_BASE}")
    print(f"   Poll Interval: {POLL_INTERVAL}s")
    print("="*60)
    
    while True:
        try:
            # 1. Check Training Status
            res = requests.get(f"{API_BASE}/api/training/status", timeout=5)
            data = res.json()
            
            if data.get("status") == "training":
                session_id = data.get("session_id")
                strategy_name = data.get("strategy", "FedAvg")
                project_id = data.get("project_id", 1)  # 🔥 GET PROJECT_ID
                
                print(f"\n🔔 Training Request Detected!")
                print(f"   Session ID: {session_id}")
                print(f"   Project ID: {project_id}")
                print(f"   Strategy: {strategy_name}")
                
                # 2. RUN TRAINING (Blocks until complete)
                run_fl_session(session_id, strategy_name, project_id)
                
                # 3. Mark Complete
                requests.post(f"{API_BASE}/api/training/complete")
                print("💤 Session complete. Returning to idle state.\n")
                
            time.sleep(POLL_INTERVAL)
            
        except requests.exceptions.ConnectionError:
            print(f"⚠️ Cannot reach backend at {API_BASE}. Retrying in 10s...")
            time.sleep(10)
        except Exception as e:
            print(f"⚠️ Polling Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
    
# this file is the main entry point for the FL server. It continuously polls the backend for training requests, fetches project configurations from the database, and runs FL training sessions using either FedAvg or FedProx strategies. The server also reports metrics and uploads the global model after each round.