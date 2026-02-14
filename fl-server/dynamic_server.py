import flwr as fl
from flwr.server.strategy import FedAvg, FedProx
import requests
import time
import pickle
import os
from datetime import datetime
from dotenv import load_dotenv

# Config
# API_BASE = os.getenv("API_BASE", "http://localhost:8000")
POLL_INTERVAL = 3
# Load environment variables from .env at project root
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

API_BASE = os.getenv("API_BASE", "http://localhost:8000")


# --- 1. The Reporting Logic (Mixin) ---
# We use a Mixin so we can attach this logic to EITHER strategy
class ReportingMixin:
    def report_metrics(self, server_round, results):
        if not results:
            return
        
        # Calculate Averages
        accuracies = [r.metrics.get("accuracy", 0) for _, r in results]
        losses = [r.metrics.get("loss", 0) for _, r in results]
        avg_acc = sum(accuracies) / len(accuracies)
        avg_loss = sum(losses) / len(losses)

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

def run_fl_session(session_id, strategy_name):
    print(f"🚀 Starting Session {session_id} using {strategy_name}")
    
    # DYNAMIC STRATEGY SELECTION
    if strategy_name == "FedProx":
        strategy = CustomFedProx(
            proximal_mu=0.1,  # Force regularization for non-IID data
            fraction_fit=1.0,
            fraction_evaluate=1.0,
            min_fit_clients=2,
            min_available_clients=2
        )
    else:
        strategy = CustomFedAvg(
            fraction_fit=1.0,
            fraction_evaluate=1.0,
            min_fit_clients=2,
            min_available_clients=2
        )

    # Start Server (Blocking)
    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=5),
        strategy=strategy
    )

def main():
    print("⏳ FL Server Manager Online (Polling Mode)...")
    
    while True:
        try:
            # 1. Check Status
            res = requests.get(f"{API_BASE}/api/training/status", timeout=5)
            data = res.json()
            
            if data.get("status") == "training":
                session_id = data.get("session_id")
                strategy_name = data.get("strategy", "FedAvg")
                
                # 2. RUN TRAINING (This blocks until 5 rounds finish)
                run_fl_session(session_id, strategy_name)
                
                # 3. Mark Complete
                requests.post(f"{API_BASE}/api/training/complete")
                print("💤 Training finished. Returning to idle.")
                
            time.sleep(POLL_INTERVAL)
            
        except Exception as e:
            print(f"⚠️ Polling Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
    
# this file is the main entry point for the FL server. It continuously polls the backend for training sessions, dynamically selects the strategy, and reports metrics and models back to the backend.