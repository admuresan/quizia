#!/bin/bash
# Fix authentication files and create default account on Oracle Cloud
# Usage: ./fix_auth.sh

set -e

# Configuration
SERVER_IP="40.233.70.245"
SSH_USER="ubuntu"
SSH_KEY="ssh/ssh-key-2025-12-26.key"
APP_DIR="/opt/quizia"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# SSH options
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo -e "${YELLOW}Fixing authentication files on ${SERVER_IP}...${NC}"

# Check SSH key
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

chmod 600 "$SSH_KEY"

echo -e "${YELLOW}Step 1: Fixing file permissions...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    cd ${APP_DIR}
    sudo chown -R ${SSH_USER}:${SSH_USER} app/data
    chmod 644 app/data/*.json 2>/dev/null || true
ENDSSH

echo -e "${YELLOW}Step 2: Ensuring auth files exist and are valid...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    cd ${APP_DIR}
    source venv/bin/activate
    
    # Create a Python script to fix auth files
    python3 << 'PYTHON_SCRIPT'
import json
from pathlib import Path

app_dir = Path("${APP_DIR}")
data_dir = app_dir / "app" / "data"
auth_file = data_dir / "auth.json"
requests_file = data_dir / "requests.json"

# Ensure data directory exists
data_dir.mkdir(parents=True, exist_ok=True)

# Fix auth.json
if not auth_file.exists() or auth_file.stat().st_size == 0:
    print("Creating auth.json...")
    with open(auth_file, 'w') as f:
        json.dump({'users': {}}, f, indent=2)
else:
    try:
        with open(auth_file, 'r') as f:
            data = json.load(f)
        if 'users' not in data:
            data = {'users': {}}
            with open(auth_file, 'w') as f:
                json.dump(data, f, indent=2)
        print("auth.json is valid")
    except json.JSONDecodeError:
        print("auth.json is corrupted, recreating...")
        with open(auth_file, 'w') as f:
            json.dump({'users': {}}, f, indent=2)

# Fix requests.json
if not requests_file.exists() or requests_file.stat().st_size == 0:
    print("Creating requests.json...")
    with open(requests_file, 'w') as f:
        json.dump({'requests': []}, f, indent=2)
else:
    try:
        with open(requests_file, 'r') as f:
            data = json.load(f)
        if 'requests' not in data:
            data = {'requests': []}
            with open(requests_file, 'w') as f:
                json.dump(data, f, indent=2)
        print("requests.json is valid")
    except json.JSONDecodeError:
        print("requests.json is corrupted, recreating...")
        with open(requests_file, 'w') as f:
            json.dump({'requests': []}, f, indent=2)

print("Auth files fixed successfully")
PYTHON_SCRIPT
ENDSSH

echo -e "${YELLOW}Step 3: Creating default quizmaster account...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    cd ${APP_DIR}
    source venv/bin/activate
    python setup_admin.py
ENDSSH

echo -e "${YELLOW}Step 4: Restarting service...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo systemctl restart quizia"

echo -e "${GREEN}Auth files fixed!${NC}"
echo -e "${GREEN}Default account:${NC}"
echo -e "${GREEN}  Username: quizmaster${NC}"
echo -e "${GREEN}  Password: masterquiz${NC}"

