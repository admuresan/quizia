#!/bin/bash
# Deployment script for Quizia app to Oracle Cloud
# Usage: ./deploy.sh

set -e  # Exit on error

# Configuration
SERVER_IP="40.233.70.245"
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

echo -e "${GREEN}Starting deployment to ${SERVER_IP}...${NC}"

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

echo -e "${YELLOW}Step 2: Installing system dependencies...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << 'ENDSSH'
    sudo apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 python3-pip python3-venv git nginx
ENDSSH

echo -e "${YELLOW}Step 3: Creating application directory...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo mkdir -p $APP_DIR && sudo chown ${SSH_USER}:${SSH_USER} $APP_DIR"

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

echo -e "${YELLOW}Step 5: Setting up Python virtual environment...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    cd $APP_DIR
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install --upgrade pip -q
    pip install -r requirements.txt -q
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
    source venv/bin/activate
    python setup_admin.py 2>&1 || echo "Account may already exist, continuing..."
ENDSSH

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
Environment="PATH=${APP_DIR}/venv/bin"
ExecStart=${APP_DIR}/venv/bin/gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:${APP_PORT} --timeout 120 wsgi:app
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
    sudo systemctl enable ${SERVICE_NAME}
    sudo systemctl start ${SERVICE_NAME}
ENDSSH

echo -e "${YELLOW}Step 9: Configuring nginx reverse proxy...${NC}"
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
ENDSSH

echo -e "${YELLOW}Step 10: Configuring firewall...${NC}"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} << ENDSSH
    sudo ufw allow 80/tcp 2>/dev/null || sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    sudo ufw allow ${APP_PORT}/tcp 2>/dev/null || sudo iptables -I INPUT -p tcp --dport ${APP_PORT} -j ACCEPT 2>/dev/null || true
ENDSSH

echo -e "${YELLOW}Step 11: Checking service status...${NC}"
sleep 3
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo systemctl status ${SERVICE_NAME} --no-pager -l | head -20"
ssh $SSH_OPTS ${SSH_USER}@${SERVER_IP} "sudo systemctl status nginx --no-pager -l | head -10"

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}Application should be accessible at: http://${SERVER_IP}${NC}"
echo -e "${GREEN}Default quizmaster account created:${NC}"
echo -e "${GREEN}  Username: quizmaster${NC}"
echo -e "${GREEN}  Password: masterquiz${NC}"
echo -e "${YELLOW}To check logs: ssh -i $SSH_KEY ${SSH_USER}@${SERVER_IP} 'sudo journalctl -u ${SERVICE_NAME} -f'${NC}"
echo -e "${YELLOW}Nginx logs: ssh -i $SSH_KEY ${SSH_USER}@${SERVER_IP} 'sudo tail -f /var/log/nginx/error.log'${NC}"
