# fl-server/dynamic_server.py (NEW)
import flwr as fl
from flwr.server.strategy import FedAvg
import requests
import sys
import argparse

API_BASE = "https://api.kaif-federatedapp.me"

class DynamicFedAvg(FedAvg):
    def __init__(self, project_id: int, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.project_id = project_id

    def aggregate_fit(self, server_round, results, failures):
        aggregated_parameters, aggregated_metrics = super().aggregate_fit(server_round, results, failures)
        
        if results:
            # Calculate metrics
            accuracies = [r.metrics.get("accuracy", 0) for _, r in results]
            avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0
            
            # Report to Backend API [cite: 464]
            try:
                requests.post(
                    f"{API_BASE}/api/metrics/report", # Ensure this route exists in metrics.router
                    json={
                        "project_id": self.project_id,
                        "round": server_round,
                        "accuracy": avg_accuracy,
                        "num_clients": len(results)
                    }
                )
                print(f"Reported round {server_round} metrics to backend.")
            except Exception as e:
                print(f"Failed to report metrics: {e}")
                
        return aggregated_parameters, aggregated_metrics

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project-id', type=int, required=True)
    args = parser.parse_args()

    # 1. Fetch Config from API [cite: 482]
    print(f"Fetching config for Project {args.project_id}...")
    # You might need to add a specific endpoint for full config or use the public one
    # For now, let's assume we use the public one and defaults
    
    # 2. Start Server
    strategy = DynamicFedAvg(
        project_id=args.project_id,
        min_fit_clients=1, # These should ideally come from the API config
        min_available_clients=1,
    )
    
    print(f"Starting FL Server for Project {args.project_id} on Port 9091")
    fl.server.start_server(
        server_address="0.0.0.0:9091",
        config=fl.server.ServerConfig(num_rounds=5),
        strategy=strategy,
    )

if __name__ == "__main__":
    main()