# Telemetry Data Dictionary & API Mapping

Here is the exact breakdown of every single piece of data we will collect for the dashboard, and the specific GitHub API endpoint or method we will use to fetch it. 

---

## 1. Organization & Repository Insights
This is the high-level data that gives managers a bird's-eye view of the entire engineering operation.

| Data Point | Description | How We Fetch It (Technical Feasibility) |
| :--- | :--- | :--- |
| **Repo Name & Language** | e.g., python-birla, Python | GraphQL: organization.repositories.nodes |
| **Open Issues Count** | Total unresolved issues | GraphQL: repository.issues(states: OPEN).totalCount |
| **Open PRs Count** | Total pending pull requests | GraphQL: repository.pullRequests(states: OPEN).totalCount |
| **Top Contributors** | Who is writing the most code | GraphQL: Commit history on defaultBranchRef grouped by author |
| **Cache Usage (MB)** | How much GitHub Actions cache is used | REST: GET /repos/{owner}/{repo}/actions/caches |
| **Self-Hosted Runners** | Status (Online/Offline/Idle/Active) of your custom runners | REST: GET /orgs/{org}/actions/runners |

---

## 2. Pipeline Execution (The Rolling Window)
This data builds the historical trend graphs (the last 10 runs).

| Data Point | Description | How We Fetch It (Technical Feasibility) |
| :--- | :--- | :--- |
| **Run ID & Branch** | e.g., 987654321 on main | REST: GET /repos/{owner}/{repo}/actions/runs |
| **Pipeline Status** | Success, Failure, Cancelled | REST: Returns directly in the run payload |
| **Duration (Speed)** | Total time the pipeline took | REST: Calculated via created_at and updated_at |
| **Runner Cost (Minutes)** | Total billable compute minutes | REST: GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing |

---

## 3. Deep Debugging (Failed Runs)
When a pipeline fails, managers and AI need to know *why* without digging through GitHub.

| Data Point | Description | How We Fetch It (Technical Feasibility) |
| :--- | :--- | :--- |
| **Failed Job Name** | e.g., "Docker Build & Push" | REST: GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs |
| **Specific Error Log** | The exact 10 lines of the error | REST: GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs (The script downloads the raw text log, scans for Error: or FAILED, and extracts a 10-line snippet). |

---

## 4. Security & Quality Artifacts (The "Safe" Summary)
Instead of putting massive raw logs in the dashboard, we extract the "Executive Summary" for the UI, and push the raw file to S3.

| Data Point | Description | How We Fetch It (Technical Feasibility) |
| :--- | :--- | :--- |
| **Trivy Vulnerabilities** | Count of Critical/High CVEs | Python script downloads trivy-results.json artifact, parses the JSON array length, and saves the count. |
| **SonarQube Quality Gate** | PASSED or FAILED | Python script downloads sonar-quality-gate.json artifact and extracts projectStatus.status. |
| **SonarQube Code Coverage**| e.g., 82.4% | Python script reads the same Sonar JSON to find the coverage condition. |
| **Gitleaks Secrets** | Count of hardcoded AWS/API keys | Python script downloads gitleaks-results.sarif and counts the results array. |
| **S3 Download Link** | Secure URL for DevOps to get the raw file | Script uploads the ZIP to AWS S3 using boto3 and generates a URL. |

---

## 5. Executive & DORA Metrics (Calculated Data)
These aren't fetched directly from GitHub; our Python script *calculates* them based on the history array to provide executive-level velocity and reliability metrics.

| Data Point | Description | How We Calculate It |
| :--- | :--- | :--- |
| **Deployment Frequency** | How often code ships | Count of successful runs on main within the last 7 days. |
| **Change Failure Rate** | % of failed deployments | (Failed runs on main / Total runs on main) * 100 |
| **CI/CD Success Rate** | Pipeline reliability | (Total successful runs / Total runs) * 100 |
| **PR Cycle Time** | Developer velocity | Average time difference between PR createdAt and mergedAt. |
| **MTTR (Recovery Time)** | Responsiveness to failure | Average time difference between a failed run on main and the next successful run on main. |

---

## 6. Optimized Two-Level File Structure (The Database)

### Why Not the Hyper-Modular Approach?
The original plan was to create a **separate folder per run ID** with individual **jobs.json** and **artifacts.json** files, like a NoSQL database. While architecturally elegant, this creates a **frontend performance nightmare** on GitHub Pages:

- For 5 repos × 10 runs each = **100 folders and 200+ JSON files**.
- The React dashboard would need to fetch each file individually.
- GitHub Pages has **no server-side aggregation**, so every file = 1 HTTP request.
- Result: The dashboard landing page would fire 50+ network requests just to load.

### The Optimized Approach: Two-Level Structure
Instead, we inline all run data (jobs, errors, artifacts) into a **single _runs.json per repo**. Nothing is lost — the data is identical — we just store it smarter.

```text
dashboard/public/data/
├── _overview.json                    <-- 1 file: Org-level summary + DORA metrics
└── github/
    └── repos/
        ├── python-birla/
        │   ├── _meta.json            <-- Repo insights (issues, PRs, contributors, cache)
        │   └── _runs.json            <-- Last 10 runs with jobs, errors, artifacts ALL inlined
        ├── react-frontend/
        │   ├── _meta.json
        │   └── _runs.json
        └── java-backend/
            ├── _meta.json
            └── _runs.json
```

### Frontend Fetch Count Calculation

| Scenario | Old Hyper-Modular | New Two-Level |
| :--- | :--- | :--- |
| **Files per repo** | 1 _meta + 1 _runs_index + (2 × 10 runs) = **22 files** | 1 _meta + 1 _runs = **2 files** |
| **3 repos total fetches** | 1 _overview + (22 × 3) = **67 fetches** | 1 _overview + (2 × 3) = **7 fetches** |
| **5 repos total fetches** | 1 _overview + (22 × 5) = **111 fetches** | 1 _overview + (2 × 5) = **11 fetches** |
| **10 repos total fetches** | 1 _overview + (22 × 10) = **221 fetches** | 1 _overview + (2 × 10) = **21 fetches** |

> At 10 repos, that is a **10x reduction** in network requests — from 221 fetches down to 21.

### What Each File Contains

#### _overview.json — Org Landing Page (1 fetch, entire dashboard loads)
- Org name, total repos, total runs tracked
- **DORA Metrics**: Deployment Frequency, Change Failure Rate, MTTR, PR Cycle Time
- Overall CI/CD success rate
- Self-hosted runner statuses (online/offline/busy)
- Per-repo summary cards (name, language, last run status, success rate)

#### _meta.json — Per-Repo Deep Insights (1 fetch per repo)
- Open/closed issues & PR counts
- Cache usage (MB)
- Top contributors (last 30 days)
- List of workflows tracked

#### _runs.json — The Rolling Window (1 fetch per repo, ALL history included)
Each entry in the **runs** array contains:
- **Run metadata**: run_id, workflow, branch, SHA, trigger, status, timestamps, duration
- **Jobs array** (inlined): Every job's name, status, duration, and **error_snippet** (a clean 1-2 line error summary for failed jobs — not the raw 500-line ANSI dump)
- **Artifacts object** (inlined): Trivy vulnerability counts (Critical/High/Medium/Low), SonarQube quality gate + coverage + bugs, Gitleaks secrets found, and optional S3 download links for raw reports

### Data Completeness: Nothing Is Lost

| Data Point | Where It Lives |
| :--- | :--- |
| Run ID, branch, SHA, status, duration | _runs.json → runs[].run_id, branch, sha, etc. |
| Every job name + status + duration | _runs.json → runs[].jobs[] |
| Failed job error log (clean snippet) | _runs.json → runs[].jobs[].error_snippet |
| Trivy vulnerability counts | _runs.json → runs[].artifacts.trivy |
| SonarQube quality gate + coverage | _runs.json → runs[].artifacts.sonarqube |
| Gitleaks secrets count | _runs.json → runs[].artifacts.gitleaks |
| Raw artifact download (compliance) | _runs.json → runs[].artifacts.*.s3_raw_url |
| Repo issues, PRs, contributors | _meta.json |
| DORA metrics, org summary | _overview.json |

---

## 7. Future Integration Strategy (GitLab & Jenkins)
When you are ready to expand beyond GitHub Actions, the architecture is fully prepared to ingest data from GitLab CI and Jenkins. The two-level file structure (**_meta.json** + **_runs.json**) remains identical — only the provider folder changes.

### GitLab CI Matrix
- **Auth:** Personal Access Token (PAT)
- **API Strategy:** GitLab GraphQL API + REST API (/api/v4/projects/:id/pipelines)
- **Key Mappings:**
  - Repository → Project
  - Workflow Run → Pipeline
  - Job → Job
- **Execution:** A separate **fetch_gitlab_data.py** script will normalize the GitLab API response into the exact same **_meta.json** + **_runs.json** schema, dropping it into the **/gitlab/projects/** folder.

### Jenkins Matrix
- **Auth:** API Token + Username
- **API Strategy:** Jenkins REST API (/api/json?depth=2) and Blue Ocean REST API (for granular pipeline steps).
- **Key Mappings:**
  - Repository → Folder/Job
  - Workflow Run → Build
  - Job → Stage/Node
- **Execution:** A **fetch_jenkins_data.py** script will normalize the deeply nested Jenkins XML/JSON outputs into our clean schema, dropping it into the **/jenkins/jobs/** folder.

## User Review Required

> [!IMPORTANT]
> The Data Dictionary has been updated with:
> - **Optimized Two-Level File Structure** replacing the hyper-modular approach (Section 6).
> - **Frontend fetch count calculations** showing a 10x reduction in network requests.
> - **Data completeness table** proving nothing is lost in the new structure.
> - **Python script references** for future GitLab and Jenkins integrations (Section 7).
>
> Ready to review and lock this in?

