import os
import json
from datetime import datetime, timezone

import yaml

from github_client import GitHubClient
from log_analyzer import extract_error_snippet
from dora_calculator import calculate_dora_metrics



# Configuration
GH_TOKEN = os.environ.get("GH_TOKEN")
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/app/data")
CONFIG_PATH = os.environ.get("CONFIG_PATH", "/app/config.yml")

def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r") as f:
            return yaml.safe_load(f)
    return {
        "organization": os.environ.get("ORG_NAME", "ot-central-team"),
        "defaults": {
            "history_depth": 5,
            "fetch_cache": True,
            "fetch_contributors": True,
            "fetch_issues_prs": True
        },
        "repositories": []
    }

def fetch_repo_meta(client, repo_obj, config):
    repo = repo_obj["name"]
    owner = repo_obj.get("owner", {}).get("login", "")
    print(f"  Fetching meta for {repo}...")
    
    pr_count = 0
    if config.get("fetch_issues_prs", True):
        # We only need count, so limit per_page=1 to minimize load if there are many PRs
        prs = client.get_paginated(f"/repos/{owner}/{repo}/pulls?state=open&per_page=100")
        pr_count = len(prs) if prs else 0
    
    # Issues
    total_issues_and_prs = repo_obj.get("open_issues_count", 0)
    issue_count = max(0, total_issues_and_prs - pr_count)
    
    # Cache usage
    cache_size_mb = 0
    cache_count = 0
    if config.get("fetch_cache", True):
        cache_info = client.get(f"/repos/{owner}/{repo}/actions/cache/usage")
        if cache_info:
            cache_size_mb = cache_info.get("active_caches_size_in_bytes", 0) / (1024 * 1024)
            cache_count = cache_info.get("active_caches_count", 0)
        
    # Contributors
    top_contributors = []
    if config.get("fetch_contributors", True):
        contributors = client.get_paginated(f"/repos/{owner}/{repo}/contributors")
        if contributors:
            for c in contributors[:3]:
                top_contributors.append({
                    "login": c.get("login"),
                    "commits": c.get("contributions")
                })
            
    # Workflows (Removed to save API calls, not used in UI)
    workflows = []
            
    meta = {
        "name": repo,
        "full_name": f"{owner}/{repo}",
        "language": repo_obj.get("language") or "Unknown",
        "default_branch": repo_obj.get("default_branch", "main"),
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

def fetch_repo_runs(client, owner, repo, repo_dir, config):
    print(f"  Fetching runs for {repo}...")
    history_depth = config.get("history_depth", 5)
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
        runs_data = client.get(f"/repos/{owner}/{repo}/actions/runs?per_page={history_depth}&page={page}")
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
            if jobs_data is None:
                jobs_data = []
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
                
            # Fetch Timing
            timing_data = client.get(f"/repos/{owner}/{repo}/actions/runs/{run_id}/timing")
            run_duration_ms = timing_data.get("run_duration_ms", 0) if timing_data else 0
            billable_minutes = 0
            if timing_data and "billable" in timing_data:
                for os_type, stats in timing_data["billable"].items():
                    billable_minutes += (stats.get("total_ms", 0) / 60000)
            
            run_entry["timing"] = {
                "run_duration_ms": run_duration_ms,
                "billable_minutes": round(billable_minutes, 2)
            }
                
            new_runs.append(run_entry)
            
        if found_existing or len(new_runs) >= history_depth:
            break
            
        page += 1
        
    # Merge and trim
    all_runs = new_runs + existing_runs
    all_runs = all_runs[:history_depth]
    
    runs_data = {
        "repo": repo,
        "history_depth": history_depth,
        "total_runs": len(all_runs),
        "runs": all_runs
    }
    
    with open(runs_file, "w") as f:
        json.dump(runs_data, f, indent=2)
        
    return all_runs

def main():
    cfg = load_config()
    org_name = cfg.get("organization", "ot-central-team")
    print(f"Starting Data Ingestion Engine for {org_name}...")
    client = GitHubClient(GH_TOKEN)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Determine account type
    account_info = client.get(f"/users/{org_name}")
    account_type = account_info.get("type", "Organization") if account_info else "Organization"
    
    print(f"\nAccount Type detected as: {account_type}")
    
    # 0. Fetch self-hosted runners (Only available for Organizations)
    runners_summary = []
    if account_type == "Organization":
        print(f"\nFetching Self-Hosted Runners for {org_name}...")
        runners_data = client.get_paginated(f"/orgs/{org_name}/actions/runners")
        if runners_data:
            for r in runners_data:
                runners_summary.append({
                    "name": r.get("name"),
                    "os": r.get("os"),
                    "status": r.get("status", "unknown"),
                    "busy": r.get("busy", False)
                })
    
    # 1. Fetch all repos
    repos_endpoint = f"/users/{org_name}/repos" if account_type == "User" else f"/orgs/{org_name}/repos"
    repos_data = client.get_paginated(repos_endpoint)
    if repos_data is None:
        repos_data = []
        
    # Handle repo filtering
    target_repos = cfg.get("repositories", [])
    target_repo_names = [r["name"] for r in target_repos] if target_repos else []
    
    overview_repos = []
    
    for repo_obj in repos_data:
        repo_name = repo_obj.get("name")
        
        # Check if we should process this repo
        if target_repo_names and repo_name not in target_repo_names:
            continue
            
        # Get specific config for this repo
        repo_config = cfg.get("defaults", {}).copy()
        for r in target_repos:
            if r["name"] == repo_name:
                repo_config.update(r)
                break
                
        print(f"\nProcessing Repository: {repo_name}")
        
        # Create repo directory structure
        repo_dir = os.path.join(OUTPUT_DIR, "github", "repos", repo_name)
        os.makedirs(repo_dir, exist_ok=True)
        
        repo_obj["owner"] = {"login": org_name}
        
        # Fetch meta
        meta = fetch_repo_meta(client, repo_obj, repo_config)
        with open(os.path.join(repo_dir, "_meta.json"), "w") as f:
            json.dump(meta, f, indent=2)
            
        # Fetch runs (Rolling Window)
        runs = fetch_repo_runs(client, org_name, repo_name, repo_dir, repo_config)
        
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
        "org": org_name,
        "provider": "github",
        "last_synced": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_repos": len(overview_repos),
            "total_open_issues": sum(r["open_issues"] for r in overview_repos),
            "total_open_prs": sum(r["open_prs"] for r in overview_repos),
            "overall_success_rate": round(sum(r["success_rate"] for r in overview_repos) / len(overview_repos), 1) if len(overview_repos) > 0 else 0
        },
        "self_hosted_runners": runners_summary,
        "dora_metrics": {
            "deployment_frequency": dora_results.get("deployment_frequency", {}),
            "change_failure_rate": dora_results.get("change_failure_rate", {}),
            "mttr": dora_results.get("mttr", {}),
            "pr_cycle_time": dora_results.get("pr_cycle_time", {})
        },
        "repos": overview_repos
    }
    
    with open(os.path.join(OUTPUT_DIR, "github", "_overview.json"), "w") as f:
        json.dump(overview_data, f, indent=2)
        
    api_usage_path = os.path.join(OUTPUT_DIR, "github", "_api_usage.json")
    existing_history = []
    if os.path.exists(api_usage_path):
        try:
            with open(api_usage_path, "r") as f:
                old_data = json.load(f)
                existing_history = old_data.get("history", [])
                # Handle migration from old flat schema
                if "history" not in old_data and "api_calls_made" in old_data:
                    existing_history.insert(0, old_data)
        except:
            pass
            
    current_run = {
        "api_calls_made": client.api_calls_made,
        "call_log": getattr(client, 'call_log', []),
        "rate_limit": client.rate_limit,
        "rate_limit_remaining": client.rate_limit_remaining,
        "last_synced": datetime.now(timezone.utc).isoformat()
    }
    
    existing_history.insert(0, current_run)
    existing_history = existing_history[:50] # Keep last 50 runs
    
    api_usage_data = {
        "current": current_run,
        "history": existing_history
    }
    
    with open(api_usage_path, "w") as f:
        json.dump(api_usage_data, f, indent=2)
        
    print(f"\nIngestion Complete! Data written to {OUTPUT_DIR}")
    print(f"API Calls Used: {client.api_calls_made} | Remaining Quota: {client.rate_limit_remaining}")

if __name__ == "__main__":
    main()
