# Why This Dashboard? — The Business Justification

---

## The Question

> "Why build a custom CI/CD dashboard when GitHub already shows pipeline results, and tools like Backstage already exist?"

This is the most important question to answer before writing a single line of code. Here is the honest, logical justification.

---

## 1. GitHub Shows Data, But Not Insight

GitHub's built-in Actions UI is designed for **individual developers debugging individual runs**. It is not designed for **managers, directors, or VPs** who need to answer questions like:

- What is our deployment frequency across 15 repositories this week?
- Which repo has the highest failure rate and is burning the most runner minutes?
- Are our Trivy vulnerability counts trending up or down over the last month?
- What is our Mean Time to Recovery when a production pipeline breaks?

To answer any of these on native GitHub, a manager would need to:
1. Open each repository one by one
2. Click into the Actions tab
3. Scroll through individual runs
4. Mentally aggregate the data in their head

**That does not scale.** With 10+ repos, this becomes a 30-minute daily ritual that no engineering leader will actually do. Our dashboard answers all of these in a single glance.

---

## 2. Backstage Is a Platform, Not a Dashboard

Backstage (by Spotify) is an **Internal Developer Portal** — it is designed to catalog services, manage documentation, and provide plugin-based extensibility. It is a powerful tool, but it comes with significant overhead:

| Factor | Backstage | Our Dashboard |
| :--- | :--- | :--- |
| **Setup Time** | Weeks to months (Node.js backend, PostgreSQL, plugin configuration, authentication) | Hours (static React site on GitHub Pages) |
| **Infrastructure** | Requires a dedicated server, database, and ongoing maintenance | Zero infrastructure — GitHub Pages is free and serverless |
| **CI/CD Depth** | Generic CI/CD plugins that show basic pass/fail. No deep artifact parsing, no DORA metrics out of the box | Purpose-built for CI/CD with Trivy, SonarQube, Gitleaks parsing, DORA metrics, error log extraction |
| **Customization** | Requires writing custom Backstage plugins in TypeScript | Direct control over every chart, card, and metric |
| **Target Audience** | Developers managing service catalogs | Engineering managers and DevOps leads tracking pipeline health |
| **Cost** | Compute, storage, and engineer time to maintain | Free (GitHub Pages + GitHub API) |

Backstage solves a **different problem**. It answers "What services do we own and where is the documentation?" Our dashboard answers "Are our pipelines healthy, secure, and fast?"

---

## 3. Third-Party Tools Have Vendor Lock-In and Cost

Tools like Datadog CI Visibility, Harness, and LinearB provide excellent CI/CD analytics. But they come with trade-offs:

- **Cost**: Datadog CI Visibility charges per pipeline execution. At enterprise scale (thousands of runs per month), this becomes a significant line item.
- **Vendor Lock-In**: Your data lives on their servers. If you switch providers, you lose your historical trends.
- **Data Residency**: For regulated industries (banking, healthcare, government), sending CI/CD telemetry — including security scan results — to a third-party SaaS may violate compliance policies.
- **Over-Engineering**: These tools are designed for organizations with hundreds of engineering teams. If you have 5-20 repos, you are paying enterprise prices for a fraction of the capability.

Our dashboard keeps **all data within your GitHub organization**. The JSON files live in your repo. The raw artifacts go to your S3 bucket. There is zero external dependency.

---

## 4. We Need a Unified View Across Providers

GitHub Actions is the starting point, but many enterprise organizations also run pipelines on GitLab CI and Jenkins. No single native UI gives you a unified view across all three.

Our architecture is explicitly designed for multi-provider ingestion. The same _meta.json + _runs.json schema works identically for GitHub, GitLab, and Jenkins — only the data source changes. A manager can see GitHub, GitLab, and Jenkins pipelines side-by-side on a single dashboard.

---

## 5. Security Artifacts Need a Compliance-Safe Home

GitHub's native UI does not display the contents of uploaded artifacts (Trivy results, SonarQube reports, Gitleaks findings). To view them, an engineer must manually download the ZIP, unzip it, and open the JSON/SARIF file.

Worse, if you try to store parsed security data directly in a public or shared repository, you risk exposing vulnerability details, secret detection results, and code quality findings to unauthorized viewers.

Our approach solves both problems:
- **Safe summaries** (vulnerability counts, quality gate status) are stored in the dashboard JSON for quick visibility
- **Raw reports** are pushed to a private S3 bucket with access controls, linked via secure URLs
- Engineers get one-click access to the full report without manually downloading and unzipping artifacts

---

## The Bottom Line

| Approach | What It Gives You | What It Lacks |
| :--- | :--- | :--- |
| **GitHub Native UI** | Individual run debugging | Aggregation, trends, DORA metrics, artifact parsing, cross-repo view |
| **Backstage** | Service catalog, documentation portal | Deep CI/CD analytics, artifact parsing, lightweight deployment |
| **Third-Party SaaS** | Full analytics at enterprise scale | Cost, vendor lock-in, compliance concerns, overkill for smaller orgs |
| **Our Dashboard** | Purpose-built CI/CD analytics with DORA metrics, security artifact parsing, multi-provider support, zero infrastructure cost, full data ownership | Requires initial development effort |

**We are not replacing GitHub, Backstage, or Datadog.** We are filling the specific gap that none of them cover: a lightweight, free, compliance-safe, multi-provider CI/CD analytics dashboard that engineering managers can open once a day and instantly understand the health of their entire pipeline ecosystem.
