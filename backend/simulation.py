import numpy as np
from typing import Dict, Any

def run_simulation(parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Run a simple Monte Carlo simulation"""
    iterations = parameters.get("iterations", 1000)
    mean = parameters.get("mean", 0)
    std_dev = parameters.get("std_dev", 1)
    
    data = np.random.normal(mean, std_dev, iterations)
    
    results = {
        "mean": float(np.mean(data)),
        "median": float(np.median(data)),
        "std_dev": float(np.std(data)),
        "min": float(np.min(data)),
        "max": float(np.max(data)),
        "data_points": data.tolist()[:100]
    }
    
    return results
