FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir requests

# Copy the Python script
COPY main.py .

# Run the script
CMD ["python", "main.py"]
