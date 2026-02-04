#!/bin/bash

# Start dynamic FL server
# Usage: ./start_server.sh <project_id>

if [ -z "$1" ]; then
    echo "Usage: ./start_server.sh <project_id>"
    exit 1
fi

PROJECT_ID=$1

echo "Starting FL Server for Project $PROJECT_ID..."
python dynamic_server.py --project-id $PROJECT_ID