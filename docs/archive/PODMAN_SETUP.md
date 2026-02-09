# Podman Setup Guide for Log Scout Analyzer

Complete guide for setting up Jenkins CI/CD with **Podman** instead of Docker for automated building, testing, and deployment.

---

## Why Podman?

**Podman is a better choice than Docker for many reasons:**

✅ **Daemonless** - No background daemon consuming resources  
✅ **Rootless** - Runs without root privileges (more secure)  
✅ **Docker compatible** - Same commands and image format  
✅ **More secure** - Better process isolation  
✅ **Native systemd** - Better Linux integration  
✅ **No licensing issues** - Fully open source  

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Manual Setup](#manual-setup)
- [Jenkins Configuration](#jenkins-configuration)
- [Troubleshooting](#troubleshooting)
- [Podman vs Docker Commands](#podman-vs-docker-commands)
- [Advanced Configuration](#advanced-configuration)

---

## Installation

### Windows

**Option 1: Using Winget (Recommended)**
```cmd
winget install RedHat.Podman
```

**Option 2: Manual Installation**
1. Download from: https://podman.io/getting-started/installation
2. Run the installer
3. Restart your computer

**Verify Installation:**
```cmd
podman --version
podman machine init
podman machine start
```

### Mac

**Using Homebrew:**
```bash
brew install podman
```

**Initialize Podman Machine:**
```bash
podman machine init
podman machine start
podman machine list
```

**Verify:**
```bash
podman --version
podman ps
```

### Linux

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install podman
```

**Fedora/RHEL/CentOS:**
```bash
sudo dnf install podman
```

**Arch Linux:**
```bash
sudo pacman -S podman
```

**Verify:**
```bash
podman --version
podman ps
```

### Installing Podman Compose

Podman Compose provides Docker Compose compatibility.

**All Platforms:**
```bash
# Using pip (recommended)
pip3 install --user podman-compose

# Or using pipx
pipx install podman-compose

# Verify
podman-compose --version
```

**Alternative (if pip not available):**
```bash
# Download directly
curl -o ~/.local/bin/podman-compose \
  https://raw.githubusercontent.com/containers/podman-compose/main/podman_compose.py
chmod +x ~/.local/bin/podman-compose
```

---

## Quick Start

### One-Command Setup

```bash
cd log_scout_analyzer
./jenkins-quick-start.sh
```

This script will:
1. ✅ Check Podman installation
2. ✅ Install podman-compose if needed
3. ✅ Initialize Podman machine (Mac/Windows)
4. ✅ Start Jenkins container
5. ✅ Display access credentials
6. ✅ Show you the next steps

### Access Jenkins

After the script completes:
1. Open browser: http://localhost:8080
2. Log in with credentials shown in terminal
3. Install suggested plugins
4. Create your first pipeline job

---

## Manual Setup

### Step 1: Verify Podman Installation

```bash
# Check Podman is installed
podman --version

# Check Podman is working
podman run hello-world

# List running containers
podman ps
```

### Step 2: Initialize Podman (Mac/Windows Only)

```bash
# Create Podman machine
podman machine init --cpus 4 --memory 4096 --disk-size 50

# Start Podman machine
podman machine start

# Verify
podman machine list
```

### Step 3: Start Jenkins with Podman Compose

```bash
cd log_scout_analyzer

# Start Jenkins
podman-compose -f podman-compose.yml up -d jenkins

# Check status
podman ps

# View logs
podman logs -f log-scout-jenkins
```

### Step 4: Get Admin Password

```bash
# Get initial password
podman exec log-scout-jenkins \
  cat /var/jenkins_home/secrets/initialAdminPassword

# Or view logs to see it
podman logs log-scout-jenkins 2>&1 | grep -A 2 "password"
```

### Step 5: Access Jenkins

Open http://localhost:8080 and complete setup wizard.

---

## Jenkins Configuration

### Creating Your First Pipeline

1. **Go to Jenkins:** http://localhost:8080
2. **New Item** → Enter name: `log-scout-analyzer`
3. **Select:** Pipeline
4. **Configure Pipeline:**
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: Your repo URL
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
5. **Save**

### Running a Build

1. Click your pipeline job
2. Click **"Build with Parameters"**
3. Select options:
   - BUILD_TYPE: `release`
   - RUN_TESTS: ✅
   - RUN_CLIPPY: ✅
   - CREATE_ARTIFACT: ✅
4. Click **"Build"**

### Viewing Build Results

- **Console Output:** See real-time logs
- **Artifacts:** Download built packages
- **Test Results:** View test reports
- **Documentation:** Browse generated docs

---

## Troubleshooting

### Common Issues

#### 1. Podman Command Not Found

**Problem:** `podman: command not found`

**Solution:**
```bash
# Check if installed
which podman

# Add to PATH (Linux)
export PATH=$PATH:~/.local/bin

# Add to PATH permanently
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
source ~/.bashrc
```

#### 2. Permission Denied (Rootless)

**Problem:** `Error: error creating container storage`

**Solution:**
```bash
# Enable user namespaces (Linux)
sudo sysctl -w user.max_user_namespaces=15000

# Make permanent
echo "user.max_user_namespaces=15000" | sudo tee -a /etc/sysctl.conf

# Or run with sudo (not recommended)
sudo podman-compose up -d
```

#### 3. Podman Machine Not Starting (Mac/Windows)

**Problem:** `Error: machine does not exist`

**Solution:**
```bash
# Remove old machine
podman machine rm podman-machine-default

# Create new machine
podman machine init --cpus 4 --memory 4096

# Start machine
podman machine start

# Set as default
podman system connection default podman-machine-default
```

#### 4. Port Already in Use

**Problem:** `bind: address already in use`

**Solution:**
```bash
# Check what's using port 8080
lsof -i :8080  # Mac/Linux
netstat -ano | findstr :8080  # Windows

# Change port in podman-compose.yml
# Change "8080:8080" to "8081:8080"

# Or stop conflicting service
sudo systemctl stop service-name
```

#### 5. Slow Performance

**Problem:** Builds are slow on Mac/Windows

**Solution:**
```bash
# Allocate more resources to Podman machine
podman machine stop
podman machine rm podman-machine-default
podman machine init --cpus 8 --memory 8192 --disk-size 100
podman machine start
```

#### 6. Volume Mount Issues

**Problem:** Files not visible in container

**Solution:**
```bash
# Linux: Add :Z flag for SELinux
# Already configured in podman-compose.yml
volumes:
  - ./config:/etc/app:Z

# Mac/Windows: Ensure directory exists
mkdir -p config
```

#### 7. Cannot Pull Images

**Problem:** `Error: unable to pull image`

**Solution:**
```bash
# Try with full registry path
podman pull docker.io/jenkins/jenkins:lts

# Or configure registries
cat > ~/.config/containers/registries.conf << 'EOF'
[registries.search]
registries = ['docker.io', 'quay.io']
EOF
```

### Debugging Commands

```bash
# Check Podman info
podman info

# Check container logs
podman logs log-scout-jenkins

# Check container inspect
podman inspect log-scout-jenkins

# Enter container shell
podman exec -it log-scout-jenkins bash

# Check network
podman network ls
podman network inspect log-scout-network

# Check volumes
podman volume ls
podman volume inspect log-scout-jenkins-home

# Check resource usage
podman stats

# System diagnostics
podman system df
podman system info
```

---

## Podman vs Docker Commands

Podman is designed to be a drop-in replacement for Docker:

| Docker Command | Podman Command | Notes |
|----------------|----------------|-------|
| `docker run` | `podman run` | Identical |
| `docker ps` | `podman ps` | Identical |
| `docker images` | `podman images` | Identical |
| `docker pull` | `podman pull` | Identical |
| `docker build` | `podman build` | Identical |
| `docker logs` | `podman logs` | Identical |
| `docker exec` | `podman exec` | Identical |
| `docker-compose` | `podman-compose` | Requires install |
| `docker network` | `podman network` | Identical |
| `docker volume` | `podman volume` | Identical |

**Alias Docker to Podman (Optional):**
```bash
# Add to ~/.bashrc or ~/.zshrc
alias docker=podman
alias docker-compose=podman-compose
```

---

## Advanced Configuration

### Rootless Podman (Linux)

Running containers without root privileges:

```bash
# Enable user namespaces
echo "user.max_user_namespaces=15000" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Enable cgroup v2
sudo grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=1"
sudo reboot

# Verify rootless mode
podman info | grep -i root
# Should show: runRoot: /run/user/1000/containers
```

### Systemd Integration

Run Jenkins as a systemd service:

```bash
# Generate systemd unit file
cd log_scout_analyzer
podman generate systemd --new --name log-scout-jenkins \
  > ~/.config/systemd/user/log-scout-jenkins.service

# Enable and start
systemctl --user enable log-scout-jenkins.service
systemctl --user start log-scout-jenkins.service

# Check status
systemctl --user status log-scout-jenkins.service

# View logs
journalctl --user -u log-scout-jenkins.service -f
```

### Auto-start on Boot

```bash
# Enable linger (keeps user services running)
loginctl enable-linger $USER

# Verify
ls /var/lib/systemd/linger/
```

### Pods (Multi-Container Groups)

Create a pod with Jenkins and agent:

```bash
# Create pod
podman pod create --name jenkins-pod \
  -p 8080:8080 -p 50000:50000

# Run Jenkins in pod
podman run -d --pod jenkins-pod \
  --name jenkins \
  -v jenkins_home:/var/jenkins_home:Z \
  docker.io/jenkins/jenkins:lts

# Run agent in same pod
podman run -d --pod jenkins-pod \
  --name jenkins-agent \
  docker.io/jenkins/inbound-agent:latest

# Manage pod
podman pod ps
podman pod stop jenkins-pod
podman pod start jenkins-pod
```

### Resource Limits

Limit container resources:

```bash
# CPU and memory limits
podman run -d \
  --name jenkins \
  --cpus 4 \
  --memory 4g \
  --memory-swap 8g \
  docker.io/jenkins/jenkins:lts

# Or in podman-compose.yml:
services:
  jenkins:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 4G
        reservations:
          cpus: '2'
          memory: 2G
```

### Custom Networks

Create isolated networks:

```bash
# Create network
podman network create jenkins-internal

# Run container in network
podman run -d --network jenkins-internal \
  --name jenkins docker.io/jenkins/jenkins:lts

# Inspect network
podman network inspect jenkins-internal
```

### Volume Backup and Restore

```bash
# Backup Jenkins data
podman run --rm \
  -v log-scout-jenkins-home:/data:Z \
  -v $(pwd):/backup:Z \
  alpine tar czf /backup/jenkins-backup.tar.gz -C /data .

# Restore Jenkins data
podman run --rm \
  -v log-scout-jenkins-home:/data:Z \
  -v $(pwd):/backup:Z \
  alpine tar xzf /backup/jenkins-backup.tar.gz -C /data
```

---

## Performance Optimization

### Speed Up Builds

```bash
# Use named volumes instead of bind mounts
# Already configured in podman-compose.yml

# Allocate more resources (Mac/Windows)
podman machine set --cpus 8 --memory 8192

# Enable caching
# Cargo cache is already configured in Jenkinsfile
```

### Reduce Image Size

```bash
# Use alpine-based images where possible
# Clean up after builds
# Multi-stage builds (already in use)
```

### Parallel Builds

Configure Jenkins to use multiple executors:
1. Manage Jenkins → Configure System
2. Set "# of executors" to CPU count
3. Save

---

## Security Best Practices

### 1. Rootless Containers
Always run containers rootless when possible (default on Linux).

### 2. SELinux Labels
Use `:Z` flag for volume mounts on SELinux systems:
```yaml
volumes:
  - ./data:/var/jenkins_home:Z
```

### 3. Network Isolation
Use custom networks to isolate containers:
```bash
podman network create --internal jenkins-net
```

### 4. Secrets Management
Use Podman secrets instead of environment variables:
```bash
# Create secret
echo "mypassword" | podman secret create jenkins_pass -

# Use in container
podman run -d --secret jenkins_pass docker.io/jenkins/jenkins:lts
```

### 5. Regular Updates
```bash
# Update images
podman pull docker.io/jenkins/jenkins:lts

# Recreate containers with new images
podman-compose -f podman-compose.yml up -d --force-recreate
```

---

## Monitoring and Maintenance

### Health Checks

Add to podman-compose.yml:
```yaml
services:
  jenkins:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Resource Monitoring

```bash
# Real-time stats
podman stats

# Container resource usage
podman stats log-scout-jenkins --no-stream

# System resource usage
podman system df
```

### Log Management

```bash
# View logs
podman logs log-scout-jenkins

# Follow logs
podman logs -f log-scout-jenkins

# Last 100 lines
podman logs --tail 100 log-scout-jenkins

# Since timestamp
podman logs --since 2024-01-01T00:00:00 log-scout-jenkins

# Configure log rotation in podman-compose.yml:
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

---

## Migration from Docker

### If You Already Have Docker

You can run both Docker and Podman simultaneously:

```bash
# Docker keeps working as before
docker ps

# Use Podman alongside
podman ps

# Or create alias to switch
alias docker=podman
```

### Migrating Existing Containers

```bash
# Export from Docker
docker save jenkins/jenkins:lts -o jenkins.tar

# Import to Podman
podman load -i jenkins.tar

# Or pull directly
podman pull docker.io/jenkins/jenkins:lts
```

### Converting docker-compose.yml

Already done! Our `podman-compose.yml` is compatible with both.

---

## Useful Scripts

### Start Everything
```bash
#!/bin/bash
cd log_scout_analyzer
podman-compose -f podman-compose.yml up -d
echo "Jenkins: http://localhost:8080"
```

### Stop Everything
```bash
#!/bin/bash
cd log_scout_analyzer
podman-compose -f podman-compose.yml down
```

### Backup Script
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
podman run --rm \
  -v log-scout-jenkins-home:/data:Z \
  -v $(pwd):/backup:Z \
  alpine tar czf /backup/jenkins-backup-$DATE.tar.gz -C /data .
echo "Backup created: jenkins-backup-$DATE.tar.gz"
```

### Cleanup Script
```bash
#!/bin/bash
# Remove stopped containers
podman container prune -f

# Remove unused images
podman image prune -f

# Remove unused volumes (careful!)
podman volume prune -f

# Remove unused networks
podman network prune -f
```

---

## Resources

### Official Documentation
- **Podman:** https://podman.io/
- **Podman Compose:** https://github.com/containers/podman-compose
- **Jenkins:** https://www.jenkins.io/doc/

### Tutorials
- Podman Desktop: https://podman-desktop.io/
- Rootless Containers: https://rootlesscontaine.rs/
- Red Hat Podman Guide: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/building_running_and_managing_containers/

### Community
- GitHub: https://github.com/containers/podman
- Reddit: r/podman
- Stack Overflow: `[podman]` tag

---

## Quick Reference Card

```bash
# Basic Commands
podman ps              # List containers
podman images          # List images
podman pull IMAGE      # Download image
podman run IMAGE       # Run container
podman stop NAME       # Stop container
podman rm NAME         # Remove container
podman logs NAME       # View logs
podman exec -it NAME bash  # Shell access

# Compose Commands
podman-compose up -d              # Start services
podman-compose down               # Stop services
podman-compose ps                 # List services
podman-compose logs -f SERVICE    # Follow logs
podman-compose restart SERVICE    # Restart service

# Machine Commands (Mac/Windows)
podman machine init    # Create machine
podman machine start   # Start machine
podman machine stop    # Stop machine
podman machine list    # List machines

# Maintenance
podman system prune -a # Clean everything
podman volume ls       # List volumes
podman network ls      # List networks
podman stats           # Resource usage
```

---

## Troubleshooting Checklist

- [ ] Podman installed and in PATH
- [ ] Podman compose installed
- [ ] Podman machine running (Mac/Windows)
- [ ] Port 8080 is available
- [ ] Sufficient disk space (>20GB)
- [ ] Sufficient memory (>4GB)
- [ ] SELinux configured (Linux)
- [ ] User namespaces enabled (Linux rootless)
- [ ] Firewall allows localhost:8080
- [ ] podman-compose.yml file exists
- [ ] Running from correct directory

---

## Getting Help

### Check Logs First
```bash
podman logs log-scout-jenkins
```

### Get System Info
```bash
podman info
podman version
podman-compose --version
```

### Common Solutions
1. Restart Podman machine (Mac/Windows)
2. Recreate containers: `podman-compose up -d --force-recreate`
3. Check firewall settings
4. Verify volume permissions
5. Review Jenkins logs

### Still Need Help?
- Check JENKINS_SETUP.md
- Check TESTING.md for build issues
- Review Podman documentation
- Ask in project discussions

---

**Happy building with Podman! 🚀**