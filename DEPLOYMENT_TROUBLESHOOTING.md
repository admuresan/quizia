# Deployment Troubleshooting Guide

## Architecture

The app runs with:
- **Gunicorn** on port 6005 (internal, localhost only)
- **Nginx** on port 80 (public, reverse proxy to Gunicorn)
- Access the site at `http://40.233.70.245` (no port number needed)

## Quick Fix Scripts

1. **Run the troubleshooting script first** to diagnose issues:
   ```bash
   bash troubleshoot.sh
   ```

2. **Run the fix script** to automatically fix common issues:
   ```bash
   bash fix_deployment.sh
   ```

## Common Issues and Solutions

### Issue 1: Cannot Access Site (Most Common)

**Symptom:** Site is not accessible at `http://40.233.70.245:6005`

**Most Likely Cause:** Oracle Cloud Security List not configured

**Solution:**
1. Log into Oracle Cloud Console: https://cloud.oracle.com
2. Navigate to: **Networking** > **Virtual Cloud Networks**
3. Click on your VCN
4. Click **Security Lists** in the left menu
5. Click on the **Default Security List** (or the security list attached to your instance)
6. Click **Add Ingress Rules**
7. Configure the rule:
   - **Source Type:** CIDR
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** TCP
   - **Destination Port Range:** `80`
   - **Description:** "Quizia App HTTP"
8. Click **Add Ingress Rules**
9. Wait 30 seconds and try accessing the site again at `http://40.233.70.245` (no port number needed)

### Issue 2: Service Not Running

**Check service status:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo systemctl status quizia"
```

**Check logs:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo journalctl -u quizia -n 50"
```

**Restart service:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo systemctl restart quizia"
```

### Issue 3: Port Not Listening

**Check if ports are listening:**
```bash
# Check nginx on port 80
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo netstat -tlnp | grep :80"

# Check gunicorn on port 6005
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo netstat -tlnp | grep 6005"
```

If port is not listening, check service logs for errors.

### Issue 4: Firewall Blocking Port

**Check firewall rules:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo ufw status"
```

**Add firewall rules:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo ufw allow 80/tcp"
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo ufw allow 6005/tcp"
```

### Issue 5: Missing Dependencies

**Reinstall dependencies:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 << 'EOF'
cd /opt/quizia
source venv/bin/activate
pip install -r requirements.txt --force-reinstall
sudo systemctl restart quizia
EOF
```

### Issue 6: Permission Errors

**Fix permissions:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo chown -R ubuntu:ubuntu /opt/quizia"
```

## Manual Service Management

**Start service:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo systemctl start quizia"
```

**Stop service:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo systemctl stop quizia"
```

**Restart service:**
```bash
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo systemctl restart quizia"
```

**View live logs:**
```bash
# Application logs
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo journalctl -u quizia -f"

# Nginx error logs
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo tail -f /var/log/nginx/error.log"

# Nginx access logs
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "sudo tail -f /var/log/nginx/access.log"
```

## Testing Connectivity

**Test from your local machine:**
```bash
curl -v http://40.233.70.245
```

**Test from the server (should work if services are running):**
```bash
# Test nginx (port 80)
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "curl http://localhost"

# Test gunicorn directly (port 6005)
ssh -i ssh/ssh-key-2025-12-26.key ubuntu@40.233.70.245 "curl http://localhost:6005"
```

If localhost works but external doesn't, it's a Security List or firewall issue.

## Complete Redeployment

If all else fails, redeploy:
```bash
bash deploy.sh
```

Then run the fix script:
```bash
bash fix_deployment.sh
```

And configure the Oracle Cloud Security List as described in Issue 1.

