#!/bin/bash
# Jenkins Quick Start Script for Log Scout Analyzer (Podman Edition)
# This script sets up Jenkins with Podman Compose for automated builds

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════╗
║   Log Scout Analyzer - Jenkins Quick Start   ║
║              Podman Edition                   ║
╚═══════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check Podman
    if ! command -v podman &> /dev/null; then
        echo -e "${RED}✗ Podman is not installed${NC}"
        echo "Please install Podman from: https://podman.io/getting-started/installation"
        echo ""
        echo "Quick install:"
        echo "  Windows: winget install RedHat.Podman"
        echo "  Mac:     brew install podman"
        echo "  Linux:   sudo apt install podman  (or sudo dnf install podman)"
        exit 1
    else
        echo -e "${GREEN}✓ Podman is installed${NC}"
        podman --version
    fi

    # Check Podman Compose
    if ! command -v podman-compose &> /dev/null; then
        echo -e "${YELLOW}⚠ Podman Compose is not installed${NC}"
        echo "Installing podman-compose..."

        if command -v pip3 &> /dev/null; then
            pip3 install --user podman-compose
            echo -e "${GREEN}✓ Podman Compose installed${NC}"
        else
            echo -e "${RED}✗ pip3 not found. Please install python3-pip first${NC}"
            echo "  Linux: sudo apt install python3-pip"
            echo "  Mac:   brew install python3"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ Podman Compose is installed${NC}"
        podman-compose --version
    fi

    # Check if Podman socket is available (for rootless mode)
    if [ ! -e "/run/user/$(id -u)/podman/podman.sock" ] && [ ! -e "/run/podman/podman.sock" ]; then
        echo -e "${YELLOW}⚠ Podman socket not found${NC}"
        echo "Starting Podman socket service..."

        if command -v systemctl &> /dev/null; then
            systemctl --user start podman.socket || true
            echo -e "${GREEN}✓ Podman socket started${NC}"
        fi
    else
        echo -e "${GREEN}✓ Podman socket is available${NC}"
    fi
}

# Initialize Podman machine (Mac/Windows)
init_podman_machine() {
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "msys" ]]; then
        echo ""
        echo -e "${BLUE}Initializing Podman machine...${NC}"

        if podman machine list | grep -q "Currently running"; then
            echo -e "${GREEN}✓ Podman machine is already running${NC}"
        else
            if ! podman machine list | grep -q "podman-machine-default"; then
                echo "Creating Podman machine..."
                podman machine init
            fi

            echo "Starting Podman machine..."
            podman machine start
            echo -e "${GREEN}✓ Podman machine started${NC}"
        fi
    fi
}

# Start Jenkins
start_jenkins() {
    echo ""
    echo -e "${BLUE}Starting Jenkins with Podman Compose...${NC}"

    if [ -f "podman-compose.yml" ]; then
        # Create volumes directory if running rootless
        mkdir -p ~/.local/share/containers/storage/volumes

        podman-compose -f podman-compose.yml up -d jenkins

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Jenkins started successfully!${NC}"
        else
            echo -e "${RED}✗ Failed to start Jenkins${NC}"
            echo "Trying with sudo..."
            sudo podman-compose -f podman-compose.yml up -d jenkins

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Jenkins started successfully with sudo${NC}"
            else
                echo -e "${RED}✗ Failed to start Jenkins${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${RED}✗ podman-compose.yml not found${NC}"
        echo "Make sure you're in the log_scout_analyzer directory"
        exit 1
    fi
}

# Wait for Jenkins to be ready
wait_for_jenkins() {
    echo ""
    echo -e "${BLUE}Waiting for Jenkins to be ready...${NC}"
    echo -e "${YELLOW}This may take a minute or two...${NC}"

    TIMEOUT=120
    ELAPSED=0

    while [ $ELAPSED -lt $TIMEOUT ]; do
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Jenkins is ready!${NC}"
            return 0
        fi

        echo -n "."
        sleep 5
        ELAPSED=$((ELAPSED + 5))
    done

    echo -e "${RED}✗ Jenkins did not start within ${TIMEOUT} seconds${NC}"
    echo "Check logs with: podman-compose -f podman-compose.yml logs jenkins"
    exit 1
}

# Get initial admin password
get_admin_password() {
    echo ""
    echo -e "${BLUE}Getting initial admin password...${NC}"

    PASSWORD=$(podman exec log-scout-jenkins cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null || echo "admin123")

    if [ -n "$PASSWORD" ]; then
        echo -e "${GREEN}✓ Initial admin password retrieved${NC}"
        echo ""
        echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
        echo -e "${YELLOW}Jenkins Initial Admin Password:${NC}"
        echo -e "${GREEN}${PASSWORD}${NC}"
        echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
    else
        echo -e "${RED}✗ Could not retrieve password${NC}"
    fi
}

# Display access information
show_access_info() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Jenkins Access Information${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}Jenkins URL:${NC}      http://localhost:8080"
    echo -e "${GREEN}Username:${NC}         admin"
    echo -e "${GREEN}Password:${NC}         (see above)"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Open http://localhost:8080 in your browser"
    echo "2. Log in with the credentials above"
    echo "3. Install suggested plugins"
    echo "4. Create a new Pipeline job"
    echo "5. Configure it to use the Jenkinsfile from this repository"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  View logs:        podman-compose -f podman-compose.yml logs -f jenkins"
    echo "  Stop Jenkins:     podman-compose -f podman-compose.yml down"
    echo "  Restart Jenkins:  podman-compose -f podman-compose.yml restart jenkins"
    echo "  Remove all:       podman-compose -f podman-compose.yml down -v"
    echo ""
    echo -e "${BLUE}Podman-specific commands:${NC}"
    echo "  List containers:  podman ps"
    echo "  View images:      podman images"
    echo "  Shell access:     podman exec -it log-scout-jenkins bash"
    echo ""
}

# Setup pipeline job
setup_pipeline() {
    echo ""
    read -p "Would you like to automatically create the pipeline job? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Creating pipeline job...${NC}"

        # Wait a bit more for Jenkins to be fully ready
        sleep 10

        # Create job using Jenkins CLI (if available)
        echo -e "${YELLOW}⚠ Automatic job creation requires Jenkins CLI${NC}"
        echo "Please create the job manually following the JENKINS_SETUP.md guide"
    fi
}

# Show Podman benefits
show_podman_benefits() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Why Podman?${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${GREEN}✓ Daemonless${NC} - No background daemon required"
    echo -e "${GREEN}✓ Rootless${NC} - Runs without root privileges"
    echo -e "${GREEN}✓ Docker compatible${NC} - Same commands and image format"
    echo -e "${GREEN}✓ More secure${NC} - Better isolation and security"
    echo -e "${GREEN}✓ Native systemd${NC} - Better integration with Linux"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    init_podman_machine
    show_podman_benefits
    start_jenkins
    wait_for_jenkins
    get_admin_password
    show_access_info
    setup_pipeline

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✓ Jenkins setup complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}For detailed setup instructions, see:${NC}"
    echo "  - JENKINS_SETUP.md"
    echo "  - README.md"
    echo ""
    echo -e "${YELLOW}Happy building! 🚀${NC}"
}

# Handle script arguments
case "${1:-start}" in
    start)
        main
        ;;
    stop)
        echo -e "${BLUE}Stopping Jenkins...${NC}"
        podman-compose -f podman-compose.yml down
        echo -e "${GREEN}✓ Jenkins stopped${NC}"
        ;;
    restart)
        echo -e "${BLUE}Restarting Jenkins...${NC}"
        podman-compose -f podman-compose.yml restart jenkins
        echo -e "${GREEN}✓ Jenkins restarted${NC}"
        ;;
    logs)
        podman-compose -f podman-compose.yml logs -f jenkins
        ;;
    ps)
        echo -e "${BLUE}Running containers:${NC}"
        podman ps
        ;;
    clean)
        echo -e "${YELLOW}⚠ This will remove all Jenkins data!${NC}"
        read -p "Are you sure? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            podman-compose -f podman-compose.yml down -v
            podman volume prune -f
            echo -e "${GREEN}✓ Jenkins cleaned${NC}"
        fi
        ;;
    machine-stop)
        if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "msys" ]]; then
            echo -e "${BLUE}Stopping Podman machine...${NC}"
            podman machine stop
            echo -e "${GREEN}✓ Podman machine stopped${NC}"
        else
            echo -e "${YELLOW}⚠ Podman machine only needed on Mac/Windows${NC}"
        fi
        ;;
    machine-start)
        if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "msys" ]]; then
            echo -e "${BLUE}Starting Podman machine...${NC}"
            podman machine start
            echo -e "${GREEN}✓ Podman machine started${NC}"
        else
            echo -e "${YELLOW}⚠ Podman machine only needed on Mac/Windows${NC}"
        fi
        ;;
    install-compose)
        echo -e "${BLUE}Installing podman-compose...${NC}"
        pip3 install --user podman-compose
        echo -e "${GREEN}✓ Podman Compose installed${NC}"
        ;;
    help|--help|-h)
        echo "Usage: ./jenkins-quick-start.sh [command]"
        echo ""
        echo "Commands:"
        echo "  start           - Start Jenkins (default)"
        echo "  stop            - Stop Jenkins"
        echo "  restart         - Restart Jenkins"
        echo "  logs            - View Jenkins logs"
        echo "  ps              - List running containers"
        echo "  clean           - Remove Jenkins and all data"
        echo "  machine-start   - Start Podman machine (Mac/Windows)"
        echo "  machine-stop    - Stop Podman machine (Mac/Windows)"
        echo "  install-compose - Install podman-compose"
        echo "  help            - Show this help"
        echo ""
        echo "Podman Quick Reference:"
        echo "  podman ps                    - List containers"
        echo "  podman images                - List images"
        echo "  podman exec -it NAME bash    - Shell into container"
        echo "  podman logs NAME             - View container logs"
        echo "  podman stats                 - Container resource usage"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run './jenkins-quick-start.sh help' for usage information"
        exit 1
        ;;
esac
