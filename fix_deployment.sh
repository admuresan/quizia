#!/bin/bash
# Fix deployment issues for Quizia on Oracle Cloud
# Usage: ./fix_deployment.sh

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

echo -e "${BLUE}=== Fixing Quizia Deployment ===${NC}\n"

# Check SSH key
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    exit 1
fi

chmod 600 "$SSH_KEY"

echo -e "${YELLOW}Step 1: Stopping service to make changes...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo systemctl stop ${SERVICE_NAME} 2>/dev/null || true"

echo -e "${YELLOW}Step 2: Installing nginx if not present...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
    if ! command -v nginx >/dev/null 2>&1; then
        sudo apt-get update -qq
        sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx
    fi
ENDSSH

echo -e "${YELLOW}Step 3: Ensuring app directory exists with correct permissions...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    sudo mkdir -p ${APP_DIR}
    sudo chown -R ${SSH_USER}:${SSH_USER} ${APP_DIR}
    cd ${APP_DIR}
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

echo -e "${YELLOW}Step 4: Reinstalling/updating Python dependencies...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    cd ${APP_DIR}
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install --upgrade pip -q
    pip install -r requirements.txt -q --force-reinstall
ENDSSH

echo -e "${YELLOW}Step 5: Creating default quizmaster account (if not exists)...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    cd ${APP_DIR}
    source venv/bin/activate
    python setup_admin.py 2>&1 || echo "Account may already exist, continuing..."
ENDSSH

echo -e "${YELLOW}Step 6: Updating systemd service file...${NC}"
TEMP_SERVICE=$(mktemp ${SERVICE_NAME}.service.XXXXXX 2>/dev/null || echo "${SERVICE_NAME}.service.tmp")
cat > "$TEMP_SERVICE" << EOF
[Unit]
Description=Quizia Flask Application
After=network.target

[Service]
Type=simple
User=${SSH_USER}
Group=${SSH_USER}
WorkingDirectory=${APP_DIR}
Environment="PATH=${APP_DIR}/venv/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=${APP_DIR}/venv/bin/gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${APP_PORT} --timeout 120 --access-logfile - --error-logfile - wsgi:app
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
scp $SSH_OPTS "$TEMP_SERVICE" ${SSH_USER}@${SERVER_IP}:/tmp/${SERVICE_NAME}.service
rm -f "$TEMP_SERVICE"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    sudo mv /tmp/${SERVICE_NAME}.service /etc/systemd/system/${SERVICE_NAME}.service
    sudo chmod 644 /etc/systemd/system/${SERVICE_NAME}.service
    sudo systemctl daemon-reload
ENDSSH

echo -e "${YELLOW}Step 7: Configuring nginx reverse proxy...${NC}"
TEMP_NGINX=$(mktemp quizia.nginx.XXXXXX 2>/dev/null || echo "quizia.nginx.tmp")
cat > "$TEMP_NGINX" << EOF
server {
    listen 80;
    server_name ${SERVER_IP};

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /static/ {
        alias ${APP_DIR}/app/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
scp $SSH_OPTS "$TEMP_NGINX" ${SSH_USER}@${SERVER_IP}:/tmp/quizia
rm -f "$TEMP_NGINX"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    sudo mv /tmp/quizia /etc/nginx/sites-available/quizia
    sudo ln -sf /etc/nginx/sites-available/quizia /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
    sudo systemctl enable nginx
ENDSSH

echo -e "${YELLOW}Step 8: Configuring firewall (iptables and UFW)...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    # Configure UFW if available
    if command -v ufw >/dev/null 2>&1; then
        echo "y" | sudo ufw --force enable 2>/dev/null || true
        sudo ufw allow 80/tcp
        sudo ufw allow ${APP_PORT}/tcp
        sudo ufw reload
    fi
    
    # Configure iptables directly
    sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
        sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
    sudo iptables -C INPUT -p tcp --dport ${APP_PORT} -j ACCEPT 2>/dev/null || \
        sudo iptables -I INPUT 1 -p tcp --dport ${APP_PORT} -j ACCEPT
    
    # Save iptables rules if possible
    if [ -d /etc/iptables ]; then
        sudo iptables-save | sudo tee /etc/iptables/rules.v4 >/dev/null 2>&1 || true
    fi
    
    echo "Firewall configured"
ENDSSH

echo -e "${YELLOW}Step 9: Starting services...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    sudo systemctl enable ${SERVICE_NAME}
    sudo systemctl start ${SERVICE_NAME}
    sleep 3
ENDSSH

echo -e "${YELLOW}Step 10: Checking service status...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo systemctl status ${SERVICE_NAME} --no-pager -l | head -25"

echo -e "\n${YELLOW}Step 11: Checking if ports are listening...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    echo "Checking port 80 (nginx)..."
    sudo netstat -tlnp 2>/dev/null | grep :80 || \
    sudo ss -tlnp 2>/dev/null | grep :80 || \
    echo "Port 80 check: netstat/ss not available or port not listening"
    echo ""
    echo "Checking port ${APP_PORT} (gunicorn)..."
    sudo netstat -tlnp 2>/dev/null | grep :${APP_PORT} || \
    sudo ss -tlnp 2>/dev/null | grep :${APP_PORT} || \
    echo "Port ${APP_PORT} check: netstat/ss not available or port not listening"
ENDSSH

echo -e "\n${YELLOW}Step 12: Recent service logs...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo journalctl -u ${SERVICE_NAME} -n 30 --no-pager"

echo -e "\n${GREEN}=== Fixes Applied ===${NC}\n"
echo -e "${GREEN}Default quizmaster account:${NC}"
echo -e "${GREEN}  Username: quizmaster${NC}"
echo -e "${GREEN}  Password: masterquiz${NC}"
echo -e "${YELLOW}CRITICAL: Oracle Cloud Security List Configuration Required${NC}"
echo -e "${RED}The following must be done in Oracle Cloud Console:${NC}\n"
echo -e "${BLUE}1. Log into Oracle Cloud Console (https://cloud.oracle.com)${NC}"
echo -e "${BLUE}2. Navigate to: Networking > Virtual Cloud Networks${NC}"
echo -e "${BLUE}3. Click on your VCN${NC}"
echo -e "${BLUE}4. Click on 'Security Lists' in the left menu${NC}"
echo -e "${BLUE}5. Click on the Default Security List (or the one attached to your instance)${NC}"
echo -e "${BLUE}6. Click 'Add Ingress Rules'${NC}"
echo -e "${BLUE}7. Configure:${NC}"
echo -e "   ${BLUE}   - Source Type: CIDR${NC}"
echo -e "   ${BLUE}   - Source CIDR: 0.0.0.0/0${NC}"
echo -e "   ${BLUE}   - IP Protocol: TCP${NC}"
echo -e "   ${BLUE}   - Destination Port Range: 80${NC}"
echo -e "${BLUE}8. Click 'Add Ingress Rules'${NC}\n"
echo -e "${GREEN}After adding the Security List rule, wait 30 seconds and try accessing:${NC}"
echo -e "${GREEN}http://${SERVER_IP}${NC}\n"
echo -e "${YELLOW}To check if the service is running correctly:${NC}"
echo -e "${YELLOW}ssh -i $SSH_KEY ${SSH_USER}@${SERVER_IP} 'sudo journalctl -u ${SERVICE_NAME} -f'${NC}"

