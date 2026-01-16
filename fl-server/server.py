"""
Federated Learning Server (Aggregator)
Coordinates federated training across hospital clients using Flower framework
"""

import flwr as fl
from flwr.server.strategy import FedAvg
from flwr.common import Parameters, FitRes, Scalar
from typing import List, Tuple, Dict, Optional
import numpy as np
import requests
import json
from datetime import datetime

# Backend API configuration
BACKEND_URL = "http://localhost:8000"

class CustomFedAvg(FedAvg):
    """Custom FedAvg strategy with backend integration"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.current_round = 0
        
    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[fl.server.client_proxy.ClientProxy, FitRes]],
        failures: List[BaseException],
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:
        """Aggregate model weights and report to backend"""
        
        self.current_round = server_round
        
        # Perform standard FedAvg aggregation
        aggregated_parameters, aggregated_metrics = super().aggregate_fit(
            server_round, results, failures
        )
        
        # Extract metrics from clients
        if results:
            accuracies = [fit_res.metrics.get("accuracy", 0) for _, fit_res in results]
            losses = [fit_res.metrics.get("loss", 0) for _, fit_res in results]
            
            avg_accuracy = np.mean(accuracies)
            avg_loss = np.mean(losses)
            
            # Report to backend
            self._report_to_backend(
                round_num=server_round,
                num_clients=len(results),
                accuracy=float(avg_accuracy),
                loss=float(avg_loss),
                client_metrics={
                    f"client_{i}": {
                        "accuracy": float(acc),
                        "loss": float(loss)
                    }
                    for i, (acc, loss) in enumerate(zip(accuracies, losses))
                }
            )
            
            print(f"\n=== Round {server_round} Complete ===")
            print(f"Clients participated: {len(results)}")
            print(f"Average Accuracy: {avg_accuracy:.4f}")
            print(f"Average Loss: {avg_loss:.4f}")
            print("=" * 40)
        
        return aggregated_parameters, aggregated_metrics
    
    def _report_to_backend(self, round_num: int, num_clients: int, 
                          accuracy: float, loss: float, client_metrics: dict):
        """Send training metrics to backend API"""
        try:
            payload = {
                "round": round_num,
                "num_clients": num_clients,
                "accuracy": accuracy,
                "loss": loss,
                "client_metrics": client_metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            response = requests.post(
                f"{BACKEND_URL}/api/training/metrics",
                json=payload,
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"✓ Metrics reported to backend (Round {round_num})")
            else:
                print(f"⚠ Backend returned status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"⚠ Could not reach backend: {e}")

def main():
    """Start the Flower FL server"""
    
    # Notify backend that server is starting
    try:
        requests.post(f"{BACKEND_URL}/api/training/start", timeout=5)
        print("✓ Notified backend: Training starting")
    except:
        print("⚠ Backend not available, continuing anyway...")
    
    # Configure strategy
    strategy = CustomFedAvg(
        fraction_fit=1.0,  # Use all available clients
        fraction_evaluate=1.0,
        min_fit_clients=3,  # Minimum 3 clients required
        min_evaluate_clients=3,
        min_available_clients=3,
    )
    
    print("\n" + "="*50)
    print("🚀 Federated Learning Server Starting")
    print("="*50)
    print("Configuration:")
    print(f"  - Min clients: 3")
    print(f"  - Strategy: FedAvg")
    print(f"  - Server address: 0.0.0.0:8080")
    print(f"  - Backend API: {BACKEND_URL}")
    print("="*50 + "\n")
    
    # Start Flower server
    fl.server.start_server(
        server_address="0.0.0.0:8080",
        config=fl.server.ServerConfig(num_rounds=20),
        strategy=strategy,
    )
    
    # Notify backend that training is complete
    try:
        requests.post(f"{BACKEND_URL}/api/training/complete", timeout=5)
        print("\n✓ Training complete - backend notified")
    except:
        print("\n⚠ Could not notify backend of completion")

if __name__ == "__main__":
    main()