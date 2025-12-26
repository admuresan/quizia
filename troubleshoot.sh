#!/bin/bash
# Troubleshooting script for Quizia deployment on Oracle Cloud
# Usage: ./troubleshoot.sh

set -e

# Configuration
SERVER_IP="40.233.70.245"
SSH_USER="ubuntu"
SSH_KEY="ssh/ssh-key-2025-12-26.key"
APP_DIR="/opt/quizia"
SERVICE_NAME="quizia"
APP_PORT="6005"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# SSH options
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo -e "${BLUE}=== Quizia Deployment Troubleshooter ===${NC}\n"

# Check SSH key
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

chmod 600 "$SSH_KEY"

echo -e "${YELLOW}Step 1: Checking service status...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo systemctl status ${SERVICE_NAME} --no-pager -l" || true

echo -e "\n${YELLOW}Step 2: Checking service logs (last 50 lines)...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo journalctl -u ${SERVICE_NAME} -n 50 --no-pager" || true

echo -e "\n${YELLOW}Step 3: Checking if ports are listening...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    echo "Port 80 (nginx):"
    sudo netstat -tlnp 2>/dev/null | grep :80 || sudo ss -tlnp 2>/dev/null | grep :80 || echo 'Port 80 not listening'
    echo ""
    echo "Port ${APP_PORT} (gunicorn):"
    sudo netstat -tlnp 2>/dev/null | grep :${APP_PORT} || sudo ss -tlnp 2>/dev/null | grep :${APP_PORT} || echo 'Port ${APP_PORT} not listening'
ENDSSH || true

echo -e "\n${YELLOW}Step 4: Checking nginx status...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo systemctl status nginx --no-pager -l | head -15" || echo "Nginx not installed or not running"

echo -e "\n${YELLOW}Step 5: Checking firewall rules...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    echo "--- UFW Status ---"
    sudo ufw status 2>/dev/null || echo "UFW not active"
    echo ""
    echo "--- iptables rules for port 80 ---"
    sudo iptables -L INPUT -n --line-numbers | grep "80" || echo "No iptables rules found for port 80"
    echo ""
    echo "--- iptables rules for port ${APP_PORT} ---"
    sudo iptables -L INPUT -n --line-numbers | grep ${APP_PORT} || echo "No iptables rules found for port ${APP_PORT}"
ENDSSH

echo -e "\n${YELLOW}Step 6: Checking if app directory exists and has correct permissions...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "ls -la ${APP_DIR} 2>/dev/null || echo 'App directory does not exist'" || true

echo -e "\n${YELLOW}Step 7: Checking Python and dependencies...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    cd ${APP_DIR} 2>/dev/null || exit 1
    if [ -d "venv" ]; then
        source venv/bin/activate
        python3 --version
        pip list | grep -E "(Flask|gunicorn|eventlet|flask-socketio)" || echo "Missing dependencies"
    else
        echo "Virtual environment not found"
    fi
ENDSSH || echo -e "${RED}App directory or venv not found${NC}"

echo -e "\n${YELLOW}Step 8: Testing if we can reach the ports locally on the server...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "curl -s -o /dev/null -w 'Port 80: %{http_code}\n' http://localhost 2>/dev/null || echo 'Port 80: Connection failed or curl not installed'" || true
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "curl -s -o /dev/null -w '%{http_code}' http://localhost:${APP_PORT} 2>/dev/null || echo 'Connection failed or curl not installed'" || true

echo -e "\n${BLUE}=== Running fixes ===${NC}\n"

# Fix 1: Ensure nginx is configured
echo -e "${YELLOW}Fix 1: Checking nginx configuration...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    if [ ! -f /etc/nginx/sites-enabled/quizia ]; then
        echo "Nginx not configured, run fix_deployment.sh to set it up"
    else
        sudo nginx -t && sudo systemctl reload nginx
        echo "Nginx configuration checked"
    fi
ENDSSH

# Fix 2: Ensure firewall is open
echo -e "${YELLOW}Fix 2: Configuring firewall...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    # Try UFW first
    if command -v ufw >/dev/null 2>&1; then
        sudo ufw --force enable 2>/dev/null || true
        sudo ufw allow 80/tcp
        sudo ufw allow ${APP_PORT}/tcp
        echo "UFW rules added"
    fi
    
    # Also add iptables rules as backup
    sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    sudo iptables -I INPUT -p tcp --dport ${APP_PORT} -j ACCEPT 2>/dev/null || true
    sudo iptables-save | sudo tee /etc/iptables/rules.v4 >/dev/null 2>&1 || true
    
    echo "Firewall configured"
ENDSSH

# Fix 3: Restart services
echo -e "${YELLOW}Fix 3: Restarting services...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    sudo systemctl daemon-reload
    sudo systemctl restart ${SERVICE_NAME}
    sleep 2
    sudo systemctl status ${SERVICE_NAME} --no-pager -l | head -15
ENDSSH

# Fix 4: Check and fix permissions
echo -e "${YELLOW}Fix 4: Checking and fixing permissions...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    if [ -d "${APP_DIR}" ]; then
        sudo chown -R ${SSH_USER}:${SSH_USER} ${APP_DIR}
        chmod +x ${APP_DIR}/venv/bin/* 2>/dev/null || true
        echo "Permissions fixed"
    fi
ENDSSH

# Fix 5: Verify service file
echo -e "${YELLOW}Fix 5: Verifying systemd service file...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    if [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; then
        echo "Service file exists:"
        cat /etc/systemd/system/${SERVICE_NAME}.service
    else
        echo "Service file missing!"
    fi
ENDSSH

echo -e "\n${GREEN}=== Troubleshooting complete ===${NC}"
echo -e "${YELLOW}Important: Oracle Cloud Security List Configuration${NC}"
echo -e "${YELLOW}You must also configure the Oracle Cloud Security List to allow port 80:${NC}"
echo -e "${BLUE}1. Log into Oracle Cloud Console${NC}"
echo -e "${BLUE}2. Go to Networking > Virtual Cloud Networks${NC}"
echo -e "${BLUE}3. Select your VCN > Security Lists${NC}"
echo -e "${BLUE}4. Edit the Ingress Rules for your subnet${NC}"
echo -e "${BLUE}5. Add rule: Source=0.0.0.0/0, IP Protocol=TCP, Destination Port=80${NC}"
echo -e "\n${GREEN}After configuring the Security List, the app should be accessible at:${NC}"
echo -e "${GREEN}http://${SERVER_IP}${NC}"

