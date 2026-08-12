import re

def extract_error_snippet(log_text):
    """
    Scans raw log text and extracts a 10-line snippet starting around the first error found.
    Cleans up basic ANSI escape codes to ensure readable JSON.
    """
    if not log_text:
        return None
        
        
    # Remove ANSI escape sequences
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    clean_text = ansi_escape.sub('', log_text)
    
    lines = clean_text.splitlines()
    
    for i, line in enumerate(lines):
        lower_line = line.lower()
        if "error:" in lower_line or "failed" in lower_line or "exception" in lower_line or "unauthorized:" in lower_line:
            # Grab up to 10 lines of context starting from the error
            end_index = min(len(lines), i + 10)
            snippet = "\n".join(lines[i:end_index])
            return snippet.strip()
            
    # If no explicit error keyword found but the job failed, just return the last 10 lines
    if len(lines) > 0:
        start_index = max(0, len(lines) - 10)
        return "\n".join(lines[start_index:]).strip()
        
    return None
