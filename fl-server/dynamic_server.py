# /fedapp/fl-server/dynamic_server.py
import flwr as fl
from flwr.server.strategy import FedAvg
import requests
import time
import argparse
import sys

# Internal Docker URL
API_BASE = "http://backend:8000"

class DynamicFedAvg(FedAvg):
    def __init__(self, project_id: int, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.project_id = project_id

    def aggregate_fit(self, server_round, results, failures):
        aggregated_parameters, aggregated_metrics = super().aggregate_fit(server_round, results, failures)
        
        if results:
            accuracies = [r.metrics.get("accuracy", 0) for _, r in results]
            avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0
            
            try:
                requests.post(
                    f"{API_BASE}/api/metrics/report",
                    json={
                        "project_id": self.project_id,
                        "round": server_round,
                        "accuracy": avg_accuracy,
                        "num_clients": len(results)
                    }
                )
                print(f"✅ Reported round {server_round} (Acc: {avg_accuracy:.4f})")
            except Exception as e:
                print(f"❌ Failed to report metrics: {e}")
                
        return aggregated_parameters, aggregated_metrics

def run_server(project_id):
    print(f"🚀 Starting Training for Project {project_id}...")
    
    strategy = DynamicFedAvg(
        project_id=project_id,
        min_fit_clients=1, 
        min_available_clients=1,
    )
    
    # Start the Server (Blocking)
    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=5),
        strategy=strategy,
    )
    print("🏁 Training Session Complete.")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project-id', type=int, default=1)
    args = parser.parse_args()

    print("⏳ FL Server is ready. Waiting for 'training' status...")

    while True:
        try:
            # Poll the API to check project status
            # We assume Project 1 for now, but you can make this dynamic
            res = requests.get(f"{API_BASE}/api/projects/{args.project_id}/model-code")
            if res.status_code == 200:
                # We need a status field. For now, let's implement a simple trigger endpoint
                # OR: You can add a '/api/training/status' endpoint that returns "active" or "idle"
                
                # Check the status check endpoint (We will create this next)
                status_res = requests.get(f"{API_BASE}/api/training/status")
                data = status_res.json()
                
                if data.get("status") == "training":
                    run_server(args.project_id)
                    
                    # After training, reset status to idle so we don't loop forever
                    requests.post(f"{API_BASE}/api/training/mode", json={"mode": "idle"})
                    
        except Exception as e:
            print(f"⚠️ Polling error: {e}")
        
        time.sleep(5) # Check every 5 seconds

if __name__ == "__main__":
    main()
