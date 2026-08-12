FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir requests pyyaml

# Copy all Python scripts
COPY *.py .

# Run the script
CMD ["python", "main.py"]
