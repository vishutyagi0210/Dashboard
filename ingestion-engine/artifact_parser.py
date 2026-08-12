import zipfile
import io
import json

def parse_artifact_zip(artifact_bytes, artifact_name, run_artifacts):
    """
    Parses an artifact zip in memory and updates the run_artifacts dictionary.
    Supports: SARIF (Gitleaks), Trivy JSON, SonarQube JSON, and basic XML test reports.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(artifact_bytes)) as z:
            for file_info in z.infolist():
                filename = file_info.filename.lower()
                
                # 1. SARIF Parsing (Gitleaks, Semgrep, etc.)
                if filename.endswith(".sarif"):
                    try:
                        content = json.loads(z.read(file_info.filename).decode("utf-8"))
                        secrets_count = 0
                        for run in content.get("runs", []):
                            secrets_count += len(run.get("results", []))
                            
                        run_artifacts["secrets_found"] = run_artifacts.get("secrets_found", 0) + secrets_count
                    except Exception as e:
                        print(f"      [!] Error parsing SARIF {filename}: {e}")
                
                # 2. SonarQube Quality Gate Parsing
                elif "sonar-quality-gate" in filename and filename.endswith(".json"):
                    try:
                        content = json.loads(z.read(file_info.filename).decode("utf-8"))
                        status = content.get("projectStatus", {}).get("status", "UNKNOWN")
                        run_artifacts["quality_gate"] = status
                    except Exception as e:
                        print(f"      [!] Error parsing SonarQube {filename}: {e}")
                        
                # 3. Trivy JSON Parsing
                elif "trivy" in filename and filename.endswith(".json"):
                    try:
                        content = json.loads(z.read(file_info.filename).decode("utf-8"))
                        vulns = run_artifacts.get("vulnerabilities", {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0})
                        
                        if isinstance(content, dict) and "Results" in content:
                            for result in content.get("Results", []):
                                for v in result.get("Vulnerabilities", []):
                                    sev = v.get("Severity", "").upper()
                                    if sev in vulns:
                                        vulns[sev] += 1
                                        
                        run_artifacts["vulnerabilities"] = vulns
                    except Exception as e:
                        print(f"      [!] Error parsing Trivy {filename}: {e}")
                        
                # 4. Basic Unit Test / Coverage Detection
                elif filename.endswith(".xml") and ("coverage" in filename or "test" in filename):
                    run_artifacts["has_tests"] = True
                    
    except zipfile.BadZipFile:
        print(f"      [!] Artifact {artifact_name} is not a valid zip file.")
    except Exception as e:
        print(f"      [!] Error processing artifact {artifact_name}: {e}")
