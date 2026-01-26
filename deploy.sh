#!/bin/bash
# Deployment script for Quizia app to Oracle Cloud
# Usage: 
#   ./deploy.sh           - Full deployment (default)
#   ./deploy.sh --full    - Full cleanup and redeployment
#   ./deploy.sh --code-only - Only update code files (no service restart)

set -e  # Exit on error

# Parse command line arguments
FULL_CLEANUP=false
CODE_ONLY=false

for arg in "$@"; do
    case $arg in
        --full)
            FULL_CLEANUP=true
            shift
            ;;
        --code-only)
            CODE_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Usage: ./deploy.sh [--full|--code-only]"
            exit 1
            ;;
    esac
done

# Validate that both flags are not used together
if [ "$FULL_CLEANUP" = true ] && [ "$CODE_ONLY" = true ]; then
    echo -e "${RED}Error: Cannot use --full and --code-only flags together${NC}"
    echo "Usage: ./deploy.sh [--full|--code-only]"
    exit 1
fi

# Configuration
SERVER_IP="40.233.70.245"
DOMAIN_NAME="quizia.freedynamicdns.net"
SSH_USER="ubuntu"  # Default for Oracle Cloud, adjust if needed
SSH_KEY="ssh/ssh-key-2025-12-26.key"
APP_DIR="/opt/quizia"
SERVICE_NAME="quizia"
APP_PORT="6005"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ "$FULL_CLEANUP" = true ]; then
    echo -e "${YELLOW}Starting FULL CLEANUP and deployment to ${SERVER_IP}...${NC}"
elif [ "$CODE_ONLY" = true ]; then
    echo -e "${YELLOW}Starting CODE-ONLY update to ${SERVER_IP}...${NC}"
else
    echo -e "${GREEN}Starting deployment to ${SERVER_IP}...${NC}"
fi

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

# Set proper permissions for SSH key
chmod 600 "$SSH_KEY"

# SSH options
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo -e "${YELLOW}Step 1: Testing SSH connection...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "echo 'SSH connection successful'"

# Full cleanup step (only for --full flag)
if [ "$FULL_CLEANUP" = true ]; then
    echo -e "${RED}Step 2: FULL CLEANUP - Stopping service and removing all files...${NC}"
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
        # Stop and disable service
        sudo systemctl stop ${SERVICE_NAME} 2>/dev/null || true
        sudo systemctl disable ${SERVICE_NAME} 2>/dev/null || true
        # Remove service file
        sudo rm -f /etc/systemd/system/${SERVICE_NAME}.service
        sudo systemctl daemon-reload
        # Remove application directory completely
        sudo rm -rf ${APP_DIR}
        echo "Cleanup complete"
ENDSSH
    echo -e "${GREEN}Cleanup complete. Proceeding with fresh deployment...${NC}"
fi

# Skip system dependencies and directory creation for code-only
if [ "$CODE_ONLY" = false ]; then
    echo -e "${YELLOW}Step 2: Installing system dependencies...${NC}"
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
        sudo apt-get update -qq
        # Install Python, pip, venv, git, Node.js (required for Playwright), and dependencies for Playwright
        sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
            python3 python3-pip python3-venv git nodejs npm coreutils \
            libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
            libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
            libxfixes3 libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
            libcairo2 libatspi2.0-0 libxshmfence1
        # Ensure node symlink exists (some systems have nodejs but not node)
        sudo ln -sf /usr/bin/nodejs /usr/bin/node 2>/dev/null || true
ENDSSH

    echo -e "${YELLOW}Step 3: Creating application directory...${NC}"
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo mkdir -p $APP_DIR && sudo chown ${SSH_USER}:${SSH_USER} $APP_DIR"
else
    echo -e "${YELLOW}Step 2: Code-only mode - Skipping system dependencies...${NC}"
    echo -e "${YELLOW}Step 3: Code-only mode - Ensuring application directory exists...${NC}"
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo mkdir -p $APP_DIR && sudo chown ${SSH_USER}:${SSH_USER} $APP_DIR"
fi

echo -e "${YELLOW}Step 4: Copying application files...${NC}"
# Create a temporary tar archive and copy it
tar --exclude='quizia' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.git' \
    --exclude='.vscode' \
    --exclude='.idea' \
    --exclude='app/data' \
    --exclude='app/quizes/*.json' \
    --exclude='app/uploads/*' \
    --exclude='app/rooms' \
    --exclude='ssh' \
    -czf - . | ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "mkdir -p ${APP_DIR} && cd ${APP_DIR} && tar -xzf -"

# Skip Python environment setup for code-only
if [ "$CODE_ONLY" = false ]; then
    echo -e "${YELLOW}Step 5: Installing Python dependencies (system-wide)...${NC}"
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
        cd $APP_DIR
        # Install system-wide (no venv since this is the only app on server)
        # Use python3 -m pip to ensure system-wide installation
        sudo python3 -m pip install --upgrade pip -q
        sudo python3 -m pip install -r requirements.txt -q
        # Install Playwright browser binaries (required for server-side rendering)
        # This installs to ~/.cache/ms-playwright/ which should be accessible to the service user
        echo "Installing Playwright browser binaries..."
        export HOME=/home/${SSH_USER}
        # Use python3 -m playwright to ensure we use the system-installed playwright
        sudo -u ${SSH_USER} python3 -m playwright install chromium 2>&1 || echo "Playwright browser installation may have failed, but continuing..."
        # Verify installation - test that browsers can be launched
        echo "Verifying Playwright installation..."
        sudo -u ${SSH_USER} python3 -c "from playwright.sync_api import sync_playwright; p = sync_playwright().start(); browser = p.chromium.launch(headless=True); browser.close(); p.stop(); print('Playwright browsers OK')" 2>&1 || echo "WARNING: Playwright verification failed - browsers may not be accessible"
        # Ensure cache directory is accessible
        chmod -R 755 /home/${SSH_USER}/.cache/ms-playwright 2>/dev/null || echo "Cache directory permissions check skipped"
        # Verify gunicorn is accessible
        which gunicorn || echo "WARNING: gunicorn not found in PATH, checking /usr/local/bin..."
        ls -la /usr/local/bin/gunicorn 2>/dev/null || ls -la /usr/bin/gunicorn 2>/dev/null || echo "WARNING: gunicorn binary not found"
ENDSSH

    echo -e "${YELLOW}Step 6: Creating necessary directories and initializing auth files...${NC}"
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
        cd $APP_DIR
        mkdir -p app/data app/quizes app/uploads app/rooms app/static/avatars
        # Initialize auth files with proper JSON structure
        if [ ! -f app/data/auth.json ] || [ ! -s app/data/auth.json ]; then
            echo '{"users": {}}' > app/data/auth.json
        fi
        if [ ! -f app/data/requests.json ] || [ ! -s app/data/requests.json ]; then
            echo '{"requests": []}' > app/data/requests.json
        fi
        if [ ! -f app/data/stats.json ] || [ ! -s app/data/stats.json ]; then
            echo '{"quiz_runs": []}' > app/data/stats.json
        fi
        chmod 644 app/data/*.json
ENDSSH

    echo -e "${YELLOW}Step 7: Creating default quizmaster account...${NC}"
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
        cd $APP_DIR
        python3 setup_admin.py 2>&1 || echo "Account may already exist, continuing..."
ENDSSH
else
    echo -e "${YELLOW}Step 5-7: Code-only mode - Skipping Python environment and data initialization...${NC}"
fi

# Skip service and firewall configuration for code-only
if [ "$CODE_ONLY" = false ]; then
    echo -e "${YELLOW}Step 8: Creating systemd service...${NC}"
    TEMP_SERVICE=$(mktemp ${SERVICE_NAME}.service.XXXXXX 2>/dev/null || echo "${SERVICE_NAME}.service.tmp")
    cat > "$TEMP_SERVICE" << EOF
[Unit]
Description=Quizia Flask Application
After=network.target

[Service]
Type=simple
User=${SSH_USER}
WorkingDirectory=${APP_DIR}
Environment="HOME=/home/${SSH_USER}"
Environment="PLAYWRIGHT_BROWSERS_PATH=/home/${SSH_USER}/.cache/ms-playwright"
ExecStart=/usr/bin/python3 -m gunicorn --worker-class eventlet -w 1 --bind 127.0.0.1:${APP_PORT} --timeout 120 wsgi:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    scp $SSH_OPTS "$TEMP_SERVICE" ${SSH_USER}@${SERVER_IP}:/tmp/${SERVICE_NAME}.service
    rm -f "$TEMP_SERVICE"
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
        sudo mv /tmp/${SERVICE_NAME}.service /etc/systemd/system/${SERVICE_NAME}.service
        sudo systemctl daemon-reload
        sudo systemctl stop ${SERVICE_NAME} 2>/dev/null || true
        # Small delay to ensure service fully stops
        sleep 1
        sudo systemctl enable ${SERVICE_NAME}
        sudo systemctl start ${SERVICE_NAME}
        # Wait a moment for service to start
        sleep 2
ENDSSH

    echo -e "${YELLOW}Step 9: Configuring firewall for app port only...${NC}"
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
        # Configure UFW if available (only allow app port, not port 80)
        # Port 80 will be handled by the third-party proxy app
        if command -v ufw >/dev/null 2>&1; then
            echo "y" | sudo ufw --force enable 2>/dev/null || true
            sudo ufw allow ${APP_PORT}/tcp
            sudo ufw reload
        fi
        
        # Configure iptables directly (for systems without UFW)
        # Only allow app port, port 80 is handled by third-party proxy
        sudo iptables -C INPUT -p tcp --dport ${APP_PORT} -j ACCEPT 2>/dev/null || \
            sudo iptables -I INPUT 1 -p tcp --dport ${APP_PORT} -j ACCEPT
        
        # Save iptables rules if possible
        if [ -d /etc/iptables ]; then
            sudo iptables-save | sudo tee /etc/iptables/rules.v4 >/dev/null 2>&1 || true
        fi
ENDSSH

    echo -e "${YELLOW}Step 10: Checking service status...${NC}"
    sleep 3
    ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo systemctl status ${SERVICE_NAME} --no-pager -l | head -20"
else
    echo -e "${YELLOW}Step 8-10: Code-only mode - Skipping service and firewall configuration...${NC}"
fi

if [ "$CODE_ONLY" = true ]; then
    echo -e "${GREEN}Code update complete!${NC}"
    echo -e "${YELLOW}Note: Service was not restarted. Changes will take effect on next service restart or page reload.${NC}"
    echo -e "${YELLOW}To restart service manually: ssh -i $SSH_KEY ${SSH_USER}@${SERVER_IP} 'sudo systemctl restart ${SERVICE_NAME}'${NC}"
else
    echo -e "${GREEN}Deployment complete!${NC}"
    echo -e "${GREEN}Application is running on port ${APP_PORT} (localhost:${APP_PORT})${NC}"
    echo -e "${GREEN}App is ready to be proxied by a third-party application on port 80${NC}"
    echo -e "${YELLOW}Note: The app is configured with ProxyFix middleware and is ready for reverse proxy.${NC}"
    echo -e "${YELLOW}Configure your third-party proxy to forward requests to: http://127.0.0.1:${APP_PORT}${NC}"
    echo -e "${YELLOW}Make sure your proxy passes these headers:${NC}"
    echo -e "${YELLOW}  - X-Forwarded-For${NC}"
    echo -e "${YELLOW}  - X-Forwarded-Proto${NC}"
    echo -e "${YELLOW}  - X-Forwarded-Host${NC}"
    echo -e "${YELLOW}  - X-Forwarded-Port${NC}"
    echo -e "${YELLOW}  - Upgrade and Connection (for WebSocket support)${NC}"
    if [ "$FULL_CLEANUP" = false ]; then
        echo -e "${GREEN}Default quizmaster account created:${NC}"
        echo -e "${GREEN}  Username: quizmaster${NC}"
        echo -e "${GREEN}  Password: masterquiz${NC}"
    fi
fi
echo -e "${YELLOW}To check logs: ssh -i $SSH_KEY ${SSH_USER}@${SERVER_IP} 'sudo journalctl -u ${SERVICE_NAME} -f'${NC}"
