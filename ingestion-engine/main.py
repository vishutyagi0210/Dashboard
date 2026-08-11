import json
import os
import datetime

def main():
    print("🚀 Starting demo ingestion engine...")
    
    # Path inside the container where the volume will be mounted
    output_dir = "/app/data/github"
    
    
    # Ensure directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, "demo.json")
    
    # Dummy data
    data = {
        "status": "success",
        "message": "Hello from the Python Container!",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "metrics": {
            "total_prs": 42,
            "open_issues": 12,
            "deployments_this_week": 5
        }
    }
    
    # Write to file
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=4)
        
    print(f"✅ Successfully wrote demo data to {output_file}")

if __name__ == "__main__":
    main()
