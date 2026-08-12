import os
import json
from datetime import datetime, timezone

from github_client import GitHubClient
from log_analyzer import extract_error_snippet
from dora_calculator import calculate_dora_metrics


# Configuration
ORG_NAME = os.environ.get("ORG_NAME", "ot-central-team")
GH_TOKEN = os.environ.get("GH_TOKEN")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/app/data")
HISTORY_DEPTH = int(os.environ.get("HISTORY_DEPTH", "10"))

def fetch_repo_meta(client, owner, repo):
    print(f"  Fetching meta for {repo}...")
    
    # Open PRs
    prs = client.get_paginated(f"/repos/{owner}/{repo}/pulls?state=open")
    pr_count = len(prs) if prs else 0
    
    # Issues
    repo_info = client.get(f"/repos/{owner}/{repo}")
    total_issues_and_prs = repo_info.get("open_issues_count", 0) if repo_info else 0
    issue_count = max(0, total_issues_and_prs - pr_count)
    
    # Cache usage
    cache_info = client.get(f"/repos/{owner}/{repo}/actions/caches")
    cache_size_mb = 0
    cache_count = 0
    if cache_info:
        cache_size_mb = cache_info.get("total_active_caches_size_in_bytes", 0) / (1024 * 1024)
        cache_count = cache_info.get("total_active_caches_count", 0)
        
    # Contributors
    contributors = client.get_paginated(f"/repos/{owner}/{repo}/contributors")
    top_contributors = []
    if contributors:
        for c in contributors[:3]:
            top_contributors.append({
                "login": c.get("login"),
                "commits": c.get("contributions")
            })
            
    # Workflows
    workflows_data = client.get_paginated(f"/repos/{owner}/{repo}/actions/workflows")
    workflows = []
    if workflows_data:
        for w in workflows_data:
            workflows.append({
                "name": w.get("name"),
                "file": w.get("path")
            })
            
    meta = {
        "name": repo,
        "full_name": f"{owner}/{repo}",
        "language": repo_info.get("language") if repo_info else "Unknown",
        "default_branch": repo_info.get("default_branch", "main") if repo_info else "main",
        "last_synced": datetime.now(timezone.utc).isoformat(),
        "insights": {
            "open_issues": issue_count,
            "open_prs": pr_count
        },
        "cache_usage": {
            "total_size_mb": round(cache_size_mb, 2),
            "total_count": cache_count
        },
        "top_contributors": top_contributors,
        "workflows": workflows
    }
    return meta

def fetch_repo_runs(client, owner, repo, repo_dir):
    print(f"  Fetching runs for {repo}...")
    runs_file = os.path.join(repo_dir, "_runs.json")
    existing_runs = []
    
    if os.path.exists(runs_file):
        try:
            with open(runs_file, "r") as f:
                data = json.load(f)
                existing_runs = data.get("runs", [])
        except:
            pass
            
    latest_run_id = existing_runs[0]["run_id"] if existing_runs else None
    
    new_runs = []
    page = 1
    
    while True:
        runs_data = client.get(f"/repos/{owner}/{repo}/actions/runs?per_page={HISTORY_DEPTH}&page={page}")
        if not runs_data or "workflow_runs" not in runs_data:
            break
            
        workflow_runs = runs_data["workflow_runs"]
        if not workflow_runs:
            break
            
        found_existing = False
        for run in workflow_runs:
            if run.get("status") != "completed":
                continue
                
            run_id = str(run.get("id"))
            if run_id == latest_run_id:
                found_existing = True
                break
                
            # Process this run
            print(f"    Processing run {run_id} ({run.get('name')})...")
            run_entry = {
                "run_id": run_id,
                "workflow": run.get("name"),
                "branch": run.get("head_branch"),
                "sha": run.get("head_sha")[:7] if run.get("head_sha") else "",
                "trigger": run.get("event"),
                "status": run.get("status"),
                "conclusion": run.get("conclusion"),
                "created_at": run.get("created_at"),
                "completed_at": run.get("updated_at"),
                "jobs": [],
                "artifacts": {} # Placeholder for Phase 3
            }
            
            # Fetch jobs
            jobs_data = client.get_paginated(f"/repos/{owner}/{repo}/actions/runs/{run_id}/jobs")
            for job in jobs_data:
                error_snippet = None
                if job.get("conclusion") == "failure":
                    log_text = client.get_raw(f"/repos/{owner}/{repo}/actions/jobs/{job.get('id')}/logs")
                    error_snippet = extract_error_snippet(log_text)
                    
                run_entry["jobs"].append({
                    "name": job.get("name"),
                    "status": job.get("conclusion"),
                    "error_snippet": error_snippet
                })
                
            new_runs.append(run_entry)
            
        if found_existing or len(new_runs) >= HISTORY_DEPTH:
            break
            
        page += 1
        
    # Merge and trim
    all_runs = new_runs + existing_runs
    all_runs = all_runs[:HISTORY_DEPTH]
    
    runs_data = {
        "repo": repo,
        "history_depth": HISTORY_DEPTH,
        "total_runs": len(all_runs),
        "runs": all_runs
    }
    
    with open(runs_file, "w") as f:
        json.dump(runs_data, f, indent=2)
        
    return all_runs

def main():
    print(f"Starting Data Ingestion Engine for {ORG_NAME}...")
    client = GitHubClient(GH_TOKEN)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 1. Fetch all repos
    repos_data = client.get_paginated(f"/orgs/{ORG_NAME}/repos")
    
    overview_repos = []
    
    for repo_obj in repos_data:
        repo_name = repo_obj.get("name")
        print(f"\nProcessing Repository: {repo_name}")
        
        # Create repo directory structure
        repo_dir = os.path.join(OUTPUT_DIR, "github", "repos", repo_name)
        os.makedirs(repo_dir, exist_ok=True)
        
        # Fetch meta
        meta = fetch_repo_meta(client, ORG_NAME, repo_name)
        with open(os.path.join(repo_dir, "_meta.json"), "w") as f:
            json.dump(meta, f, indent=2)
            
        # Fetch runs (Rolling Window)
        runs = fetch_repo_runs(client, ORG_NAME, repo_name, repo_dir)
        
        # Determine last run status for overview
        last_run_status = runs[0]["conclusion"] if runs else "unknown"
        last_run_at = runs[0]["completed_at"] if runs else None
        
        # Calculate success rate for overview
        success_count = sum(1 for r in runs if r["conclusion"] == "success")
        success_rate = (success_count / len(runs) * 100) if len(runs) > 0 else 0
        
        overview_repos.append({
            "name": repo_name,
            "language": meta["language"],
            "last_run_status": last_run_status,
            "last_run_at": last_run_at,
            "success_rate": round(success_rate, 1),
            "open_issues": meta["insights"]["open_issues"],
            "open_prs": meta["insights"]["open_prs"]
        })
        
    print(f"\nCalculating DORA Metrics across all repos...")
    
    # We need to compile a flat list of all runs to feed into the DORA calculator
    all_runs_flat = []
    for r in overview_repos:
        repo_dir = os.path.join(OUTPUT_DIR, "github", "repos", r["name"])
        runs_file = os.path.join(repo_dir, "_runs.json")
        if os.path.exists(runs_file):
            try:
                with open(runs_file, "r") as f:
                    data = json.load(f)
                    # We inject the repo name into the run so MTTR calculator knows boundaries
                    for run in data.get("runs", []):
                        run["repo"] = r["name"]
                        all_runs_flat.append(run)
            except:
                pass
                
    dora_results = calculate_dora_metrics(all_runs_flat)
    
    overview_data = {
        "org": ORG_NAME,
        "provider": "github",
        "last_synced": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_repos": len(repos_data),
            "total_open_issues": sum(r["open_issues"] for r in overview_repos),
            "total_open_prs": sum(r["open_prs"] for r in overview_repos),
            "overall_success_rate": dora_results["overall_success_rate"]
        },
        "dora_metrics": {
            "deployment_frequency": dora_results["deployment_frequency"],
            "change_failure_rate": dora_results["change_failure_rate"],
            "mttr": dora_results["mttr"],
            "pr_cycle_time": dora_results["pr_cycle_time"]
        },
        "repos": overview_repos
    }
    
    overview_path = os.path.join(OUTPUT_DIR, "github", "_overview.json")
    with open(overview_path, "w") as f:
        json.dump(overview_data, f, indent=2)
        
    print(f"\nIngestion Complete! Data written to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
