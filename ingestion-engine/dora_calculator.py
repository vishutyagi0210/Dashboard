from datetime import datetime, timezone, timedelta

def calculate_dora_metrics(all_runs, prs_data=None):
    """
    Calculates DORA metrics based on the compiled list of all workflow runs across all repositories.
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    
    total_runs = len(all_runs)
    successful_runs = 0
    failed_runs = 0
    recent_successful_deploys = 0
    
    
    # MTTR tracking
    recovery_times_minutes = []
    
    for i, run in enumerate(all_runs):
        # We need datetime objects for time math
        try:
            completed_at = datetime.fromisoformat(run["completed_at"].replace("Z", "+00:00"))
        except:
            completed_at = now
            
        is_recent = completed_at > seven_days_ago
        
        if run["conclusion"] == "success":
            successful_runs += 1
            if is_recent:
                recent_successful_deploys += 1
                
        elif run["conclusion"] == "failure":
            failed_runs += 1
            # To calculate MTTR, we look for the next successful run in the list (which is temporally newer)
            # Since the runs array is usually sorted newest to oldest, the "next" successful run is at a lower index
            for newer_run in all_runs[i::-1]:
                if newer_run["conclusion"] == "success" and newer_run["repo"] == run["repo"]:
                    try:
                        newer_completed_at = datetime.fromisoformat(newer_run["completed_at"].replace("Z", "+00:00"))
                        recovery_time = (newer_completed_at - completed_at).total_seconds() / 60
                        if recovery_time > 0:
                            recovery_times_minutes.append(recovery_time)
                        break
                    except:
                        pass
                        
    # Calculations
    change_failure_rate = (failed_runs / total_runs * 100) if total_runs > 0 else 0
    success_rate = (successful_runs / total_runs * 100) if total_runs > 0 else 0
    avg_mttr = (sum(recovery_times_minutes) / len(recovery_times_minutes)) if recovery_times_minutes else 0
    
    # PR Cycle Time (Mocked for now until we fetch closed PRs)
    pr_cycle_time_hours = 0
    if prs_data:
        cycle_times = []
        for pr in prs_data:
            if pr.get("merged_at") and pr.get("created_at"):
                try:
                    created = datetime.fromisoformat(pr["created_at"].replace("Z", "+00:00"))
                    merged = datetime.fromisoformat(pr["merged_at"].replace("Z", "+00:00"))
                    cycle_times.append((merged - created).total_seconds() / 3600)
                except:
                    pass
        if cycle_times:
            pr_cycle_time_hours = sum(cycle_times) / len(cycle_times)

    return {
        "deployment_frequency": {
            "value": recent_successful_deploys,
            "unit": "deploys/week",
            "trend": "stable"
        },
        "change_failure_rate": {
            "value": round(change_failure_rate, 1),
            "unit": "percent",
            "trend": "stable"
        },
        "mttr": {
            "value": round(avg_mttr),
            "unit": "minutes",
            "trend": "stable"
        },
        "pr_cycle_time": {
            "value": round(pr_cycle_time_hours, 1),
            "unit": "hours",
            "trend": "stable"
        },
        "overall_success_rate": round(success_rate, 1)
    }
