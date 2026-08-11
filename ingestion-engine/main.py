import os
import json
import requests
from datetime import datetime, timezone

# Configuration
ORG_NAME = "OT-CONTAINER-KIT"
GH_TOKEN = os.environ.get("GH_TOKEN")
OUTPUT_DIR = "/app/data"

def fetch_repositories():
    """Fetch all repositories (public and private) for the organization."""
    print(f"Fetching repositories for organization: {ORG_NAME}...")
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"Bearer {GH_TOKEN}" if GH_TOKEN else "",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    repos = []
    page = 1
    
    while True:
        url = f"https://api.github.com/orgs/{ORG_NAME}/repos?per_page=100&page={page}"
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            print(f"Error fetching repos: {response.status_code} - {response.text}")
            break
            
        data = response.json()
        if not data:
            break
            
        for repo in data:
            repos.append({
                "name": repo.get("name"),
                "full_name": repo.get("full_name"),
                "private": repo.get("private"),
                "language": repo.get("language"),
                "open_issues": repo.get("open_issues_count"), # GitHub returns PRs + Issues in this count
                "url": repo.get("html_url")
                
            })
            
        page += 1
        
    return repos

def main():
    if not GH_TOKEN:
        print("WARNING: GH_TOKEN environment variable not set. Will only fetch public data (rate limits apply).")
    else:
        print("GH_TOKEN detected. Authenticating...")
        
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Fetch repos
    repos = fetch_repositories()
    
    # Create the _overview.json file matching the data structure
    overview_data = {
        "org": ORG_NAME,
        "provider": "github",
        "last_synced": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_repos": len(repos)
        },
        "repos": repos
    }
    
    overview_path = os.path.join(OUTPUT_DIR, "_overview.json")
    with open(overview_path, "w") as f:
        json.dump(overview_data, f, indent=2)
        
    print(f"Successfully fetched {len(repos)} repositories.")
    print(f"Data written to {overview_path}")

if __name__ == "__main__":
    main()
