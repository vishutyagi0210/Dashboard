import os
import time
import requests
from requests.exceptions import RequestException

class GitHubClient:
    def __init__(self, token):
        self.token = token
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {token}" if token else "",
            "X-GitHub-Api-Version": "2022-11-28"
        }

    def _make_request(self, method, endpoint, params=None, max_retries=3):
        url = f"{self.base_url}{endpoint}" if not endpoint.startswith("http") else endpoint
        retries = 0
        backoff = 2

        while retries <= max_retries:
            response = None
            try:
                response = requests.request(method, url, headers=self.headers, params=params, timeout=30)
                
                # Handle rate limits
                if response.status_code == 403 and "X-RateLimit-Reset" in response.headers:
                    reset_time = int(response.headers["X-RateLimit-Reset"])
                    wait_time = max(0, reset_time - int(time.time())) + 1
                    print(f"Rate limit hit! Waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue

                response.raise_for_status()
                return response

            except RequestException as e:
                print(f"API Error on {url}: {str(e)}")
                if response is not None and response.status_code < 500 and response.status_code != 403:
                    # Don't retry 404s, 400s, etc. (Client Errors)
                    return None
                    
                if retries == max_retries:
                    print(f"Max retries reached for {url}")
                    return None
                
                print(f"Retrying in {backoff} seconds...")
                time.sleep(backoff)
                retries += 1
                backoff *= 2
        
        return None
    def get(self, endpoint, params=None):
        response = self._make_request("GET", endpoint, params)
        if not response or response.status_code == 204:
            return None
        try:
            return response.json()
        except ValueError:
            return None

    def get_paginated(self, endpoint, params=None):
        """Fetch all pages for a given endpoint."""
        results = []
        page = 1
        
        if params is None:
            params = {}
            
        params["per_page"] = 100
        
        while True:
            params["page"] = page
            response = self._make_request("GET", endpoint, params)
            
            if not response or response.status_code == 204:
                break
                
            try:
                data = response.json()
            except ValueError:
                break
                
            if not data:
                break
                
            items = data
            # GitHub often returns {"total_count": X, "items": [...]}
            if isinstance(data, dict):
                # Find the first value that is a list
                for key, value in data.items():
                    if isinstance(value, list):
                        items = value
                        break
                        
            if not isinstance(items, list):
                break
                
            results.extend(items)
            
            if len(items) < params["per_page"]:
                break
                
            page += 1
            
        return results

    def get_raw(self, endpoint):
        """Used for downloading raw logs."""
        response = self._make_request("GET", endpoint)
        return response.text if response else None

    def get_binary(self, endpoint):
        """Used for downloading raw binary data like zip artifacts."""
        response = self._make_request("GET", endpoint)
        return response.content if response else None
