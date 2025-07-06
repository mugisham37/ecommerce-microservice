#!/bin/bash

# Enterprise E-commerce Microservices Setup Script
set -e

echo "🚀 Setting up Enterprise E-commerce Microservices Platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Check system requirements
check_requirements() {
    print_header "Checking System Requirements"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
        
        # Check if Node.js version is 20 or higher
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -lt 20 ]; then
            print_error "Node.js version 20 or higher is required. Current version: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 20+ and try again."
        exit 1
    fi
    
    # Check Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker found: $DOCKER_VERSION"
    else
        print_error "Docker is not installed. Please install Docker and try again."
        exit 1
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_VERSION=$(docker-compose --version)
        print_success "Docker Compose found: $DOCKER_COMPOSE_VERSION"
    else
        print_error "Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        print_success "Git found: $GIT_VERSION"
    else
        print_error "Git is not installed. Please install Git and try again."
        exit 1
    fi
}

# Install pnpm if not present
install_pnpm() {
    print_header "Package Manager Setup"
    
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm found: $PNPM_VERSION"
    else
        print_status "Installing pnpm..."
        npm install -g pnpm
        print_success "pnpm installed successfully"
    fi
}

# Setup environment files
setup_environment() {
    print_header "Environment Configuration"
    
    # Root environment
    if [ ! -f .env ]; then
        print_status "Creating root .env file..."
        cp .env.example .env
        print_success "Root .env file created"
    else
        print_warning "Root .env file already exists"
    fi
    
    # Client environment
    if [ ! -f client/.env.local ]; then
        print_status "Creating client .env.local file..."
        cp client/.env.example client/.env.local
        print_success "Client .env.local file created"
    else
        print_warning "Client .env.local file already exists"
    fi
    
    print_warning "Please update the environment files with your actual configuration:"
    echo "  - .env (root configuration)"
    echo "  - client/.env.local (frontend configuration)"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    print_step "Installing root dependencies..."
    pnpm install
    
    print_step "Installing shared library dependencies..."
    cd server/shared
    pnpm install
    cd ../..
    
    print_step "Installing client dependencies..."
    cd client
    pnpm install
    cd ..
    
    print_success "All dependencies installed successfully"
}

# Build shared library
build_shared() {
    print_header "Building Shared Library"
    
    print_step "Building shared library..."
    cd server/shared
    pnpm build
    cd ../..
    
    print_success "Shared library built successfully"
}

# Setup Git hooks
setup_git_hooks() {
    print_header "Setting up Git Hooks"
    
    if [ -d .git ]; then
        print_step "Installing Husky..."
        pnpm exec husky install
        
        print_step "Setting up pre-commit hook..."
        pnpm exec husky add .husky/pre-commit "pnpm lint-staged"
        
        print_step "Setting up commit-msg hook..."
        pnpm exec husky add .husky/commit-msg "pnpm commitlint --edit \$1"
        
        print_success "Git hooks setup successfully"
    else
        print_warning "Not a Git repository. Skipping Git hooks setup."
    fi
}

# Create additional directories
create_directories() {
    print_header "Creating Project Directories"
    
    # Create logs directory
    mkdir -p logs
    
    # Create docs directory
    mkdir -p docs/{api,architecture,deployment}
    
    # Create tests directory
    mkdir -p tests/{unit,integration,e2e}
    
    # Create uploads directory
    mkdir -p uploads/{images,documents}
    
    print_success "Project directories created"
}

# Generate SSL certificates for development
generate_ssl_certs() {
    print_header "Generating SSL Certificates (Optional)"
    
    if command -v openssl &> /dev/null; then
        print_step "Generating self-signed SSL certificates for development..."
        mkdir -p certs
        
        openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" 2>/dev/null
        
        print_success "SSL certificates generated in ./certs/"
    else
        print_warning "OpenSSL not found. Skipping SSL certificate generation."
    fi
}

# Validate Docker setup
validate_docker() {
    print_header "Validating Docker Setup"
    
    print_step "Checking Docker daemon..."
    if docker info &> /dev/null; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
    
    print_step "Testing Docker Compose configuration..."
    if docker-compose config &> /dev/null; then
        print_success "Docker Compose configuration is valid"
    else
        print_error "Docker Compose configuration is invalid"
        exit 1
    fi
}

# Create initial database schema
setup_database() {
    print_header "Database Setup"
    
    print_status "Database setup will be handled by individual services"
    print_status "Each service will run its own Prisma migrations on startup"
    
    # Create database initialization scripts directory
    mkdir -p server/database/init
    
    print_success "Database setup prepared"
}

# Final setup validation
validate_setup() {
    print_header "Validating Setup"
    
    # Check if all required files exist
    local required_files=(
        ".env"
        "client/.env.local"
        "docker-compose.yml"
        "package.json"
        "pnpm-workspace.yaml"
        "turbo.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "✓ $file"
        else
            print_error "✗ $file (missing)"
        fi
    done
    
    # Check if shared library is built
    if [ -d "server/shared/dist" ]; then
        print_success "✓ Shared library built"
    else
        print_warning "✗ Shared library not built"
    fi
}

# Display next steps
show_next_steps() {
    print_header "Setup Complete! 🎉"
    
    echo ""
    echo -e "${GREEN}Your Enterprise E-commerce Microservices Platform is ready!${NC}"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "1. Update environment variables in .env and client/.env.local"
    echo "2. Configure your API keys (Stripe, PayPal, Twilio, etc.)"
    echo "3. Start the development environment:"
    echo "   ${YELLOW}chmod +x scripts/dev.sh && ./scripts/dev.sh${NC}"
    echo ""
    echo -e "${CYAN}Alternative startup methods:${NC}"
    echo "   ${YELLOW}docker-compose up -d${NC}                 # Start with Docker Compose"
    echo "   ${YELLOW}pnpm dev${NC}                            # Start with pnpm (requires services)"
    echo ""
    echo -e "${CYAN}Access URLs (after startup):${NC}"
    echo "   🌐 Frontend:           http://localhost:3006"
    echo "   🚪 API Gateway:        http://localhost:3000"
    echo "   📚 API Docs:           http://localhost:3000/api-docs"
    echo "   📊 Grafana:           http://localhost:3001 (admin/admin)"
    echo "   📈 Prometheus:        http://localhost:9090"
    echo "   🔍 Jaeger:            http://localhost:16686"
    echo "   📋 Kibana:            http://localhost:5601"
    echo ""
    echo -e "${CYAN}Useful Commands:${NC}"
    echo "   ${YELLOW}docker-compose logs -f [service]${NC}    # View service logs"
    echo "   ${YELLOW}docker-compose restart [service]${NC}    # Restart a service"
    echo "   ${YELLOW}docker-compose down${NC}                 # Stop all services"
    echo "   ${YELLOW}pnpm test${NC}                           # Run tests"
    echo "   ${YELLOW}pnpm lint${NC}                           # Lint code"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║    Enterprise E-commerce Microservices Platform Setup       ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_requirements
    install_pnpm
    setup_environment
    install_dependencies
    build_shared
    setup_git_hooks
    create_directories
    generate_ssl_certs
    validate_docker
    setup_database
    validate_setup
    show_next_steps
}

# Run main function
main "$@"
