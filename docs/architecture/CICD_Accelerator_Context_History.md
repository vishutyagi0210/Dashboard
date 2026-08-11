# CI/CD GitHub Accelerator — Master Context & History Log

> **Context Handover File**  
> *Use this document as context for future sessions to seamlessly pick up where we left off.*

---

## 1. Executive Summary & Project Goal
The **CI/CD GitHub Accelerator** is an enterprise-grade central repository containing standardized, secure, reusable GitHub Actions workflows and composite actions for multiple application stacks (Python, React, Node.js, Next.js, Java, .NET, Angular, Drupal, AWS Lambda). 

Key capabilities built:
- **Reusable Workflows**: Standardized pipeline execution with configurable feature toggles (`enable-gitleaks`, `enable-sonarqube`, `enable-trivy-fs`, `enable-docker-build`, etc.).
- **Shared Composite Actions**: Modular actions located under `.github/actions/` (Security, Testing, AWS, Caching, Dashboard Reporting).
- **Central Telemetry & Dashboard**: Data collection engine feeding execution metrics and security findings into a React/Vite Dashboard (`dashboard/`) deployed via GitHub Pages.

---

## 2. Chronological History & Session Summaries

### Session 1: Pipeline Architecture & Private Repo Sharing (Aug 6, 2026)
- **Shared Action Refactoring**: Updated reusable workflows to invoke shared composite actions relative to the central repo structure (e.g., `./.github/actions/security/gitleaks`).
- **Telemetry Action**: Created `upload-report-to-dashboard` composite action to collect execution metrics and dispatch JSON telemetry payloads.
- **Private Repository Reusability Strategy**: Addressed how external caller repositories across organization boundaries can reference private reusable workflows (`uses: vishuops0210/shared-repo/.github/workflows/ci-python.yml@v1.0.0`) using PAT / Access Delegation.
- **Manager & README Documentation**: Polished executive documentation (`README.md`, manager report), eliminating raw code blocks in favor of bold highlights, clean tables, and single reusable YAML setup examples.

### Session 2: Data Architecture & Data Dictionary (Aug 7, 2026)
- **Compliance & Data Strategy Pivot**: Identified that committing raw security scan outputs directly into GitHub repositories violates compliance policies. Designed an API-driven pull architecture instead.
- **GitHub CLI (`gh api`) Data Pipeline**: Defined data collection using GraphQL (workflow runs, commit metadata) and REST API (job details, artifact downloads) authenticated via `GH_PAT`.
- **Rolling Window State Management (`history.json`)**: Formulated a 7-day rolling window strategy to avoid re-fetching historical runs repeatedly on every execution, maintaining lightweight state JSON.
- **Self-Hosted Runner & Security Metrics**: Included telemetry metrics for self-hosted enterprise runners, Gitleaks secret scan counts, SonarQube SAST vulnerabilities, and Trivy FS vulnerabilities.
- **Data Architecture & Dictionary Modularization**: Separated architectural workflow blueprints (`data_architecture.md`) from schemas (`data_dictionary.md`), adding future extensibility points for GitLab CI and Jenkins.
- **Automation Flow**: Designed NodeJS execution script -> write to data store -> trigger GitHub Pages pipeline -> re-render dashboard.

---

## 3. Repository Architecture & Key Files

| Category | Path | Description |
| :--- | :--- | :--- |
| **Data Architecture Blueprint** | [docs/architecture/data_architecture.md](file:///home/vishaltyagi/Desktop/cicd-github-accelerator/docs/architecture/data_architecture.md) | High-level data ingestion flow using `gh api`, rolling window strategy, and pipeline execution. |
| **Data Dictionary & Schemas** | [docs/architecture/data_dictionary.md](file:///home/vishaltyagi/Desktop/cicd-github-accelerator/docs/architecture/data_dictionary.md) | Directory structure, metrics schemas for GitHub Actions, Gitleaks, SonarQube, self-hosted runners, and future GitLab/Jenkins extensibility. |
| **Reusable Workflows** | [.github/workflows/](file:///home/vishaltyagi/Desktop/cicd-github-accelerator/.github/workflows) | 12 ecosystem reusable workflows (`ci-python.yml`, `ci-react.yml`, `ci-nodejs.yml`, `ci-nextjs.yml`, `ci-java.yml`, `ci-dotnet.yml`, `ci-angular.yml`, `ci-drupal.yml`, `ci-lambda-python.yml`, `ci-lambda-nodejs.yml`, `cd-lambda.yml`, `ingest-reports.yml`). |
| **Composite Security Actions** | [.github/actions/security/](file:///home/vishaltyagi/Desktop/cicd-github-accelerator/.github/actions/security) | Modular actions for Gitleaks (`gitleaks`), SonarQube (`sonarqube`, `sonarqube-dotnet`), and Trivy (`trivy`). |
| **Dashboard Frontend** | [dashboard/src/App.jsx](file:///home/vishaltyagi/Desktop/cicd-github-accelerator/dashboard/src/App.jsx) | React + Vite UI dashboard for visual analytics. |
| **Master Readme** | [README.md](file:///home/vishaltyagi/Desktop/cicd-github-accelerator/README.md) | Central documentation guide for developers and DevOps engineers. |

---

## 4. Current State & Immediate Next Steps

### Current Status
- Reusable workflows and composite actions are fully structured and clean.
- Data Architecture & Data Dictionary specs are finalized in `docs/architecture/`.

### Pending Action Items (Take It From Here)
1. **Node.js Data Ingestion Engine**:
   - Implement the Node.js script to execute `gh api` queries (GraphQL/REST), download scanner artifacts, parse outputs, and write/update the 7-day rolling window state (`history.json`).
2. **GitHub Pages Deployment Integration**:
   - Connect the ingestion runner pipeline to push updated state to GitHub Pages for automated dashboard re-rendering upon code push / cron schedule.
3. **Dashboard UI Integration**:
   - Wire `dashboard/src/App.jsx` to consume `history.json` and display live cards/charts for CI runs, security vulnerabilities, test coverage, and runner health metrics.
