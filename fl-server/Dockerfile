FROM python:3.9-slim

WORKDIR /app

# Install dependencies
RUN pip install flwr requests

# Copy server code
COPY dynamic_server.py .

# Expose gRPC port
EXPOSE 8080

# Default command
CMD ["python", "dynamic_server.py", "--project-id", "1"]