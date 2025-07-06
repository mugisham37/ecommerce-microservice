#!/bin/bash

# Development startup script for ecommerce microservices
set -e

echo "🚀 Starting Ecommerce Microservices Development Environment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

print_status "Checking environment files..."

# Create .env files if they don't exist
if [ ! -f .env ]; then
    print_status "Creating root .env file..."
    cp .env.example .env 2>/dev/null || cat > .env << EOF
# Root Environment Configuration
NODE_ENV=development
LOG_LEVEL=debug

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# API Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3006

# Monitoring
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
JAEGER_URL=http://localhost:16686
KIBANA_URL=http://localhost:5601
EOF
fi

if [ ! -f client/.env.local ]; then
    print_status "Creating client .env.local file..."
    cat > client/.env.local << EOF
# Next.js Environment Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_APP_NAME=Ecommerce Platform
NEXT_PUBLIC_APP_VERSION=1.0.0

# Analytics (optional)
# NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=true
EOF
fi

print_status "Installing dependencies..."

# Install root dependencies
pnpm install

# Install shared library dependencies
cd server/shared
pnpm install
cd ../..

# Install client dependencies
cd client
pnpm install
cd ..

print_status "Building shared library..."
cd server/shared
pnpm build
cd ../..

print_status "Starting infrastructure services..."

# Start only infrastructure services first
docker-compose up -d postgres redis zookeeper kafka elasticsearch kibana prometheus grafana jaeger

print_status "Waiting for services to be ready..."

# Wait for PostgreSQL
print_status "Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 2
done
print_success "PostgreSQL is ready"

# Wait for Redis
print_status "Waiting for Redis..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    sleep 2
done
print_success "Redis is ready"

# Wait for Kafka
print_status "Waiting for Kafka..."
sleep 30  # Kafka takes longer to start
print_success "Kafka should be ready"

print_status "Running database migrations..."
# This would run Prisma migrations when services are created
# cd server/services/user-service && pnpm prisma migrate dev --name init
# cd ../../..

print_status "Starting microservices..."

# Start application services
docker-compose up -d api-gateway user-service product-service order-service payment-service notification-service

print_status "Starting frontend..."
docker-compose up -d frontend

print_success "🎉 Development environment is ready!"

echo ""
echo "📋 Service URLs:"
echo "  🌐 Frontend:           http://localhost:3006"
echo "  🚪 API Gateway:        http://localhost:3000"
echo "  👤 User Service:       http://localhost:3001"
echo "  📦 Product Service:    http://localhost:3002"
echo "  🛒 Order Service:      http://localhost:3003"
echo "  💳 Payment Service:    http://localhost:3004"
echo "  📧 Notification Service: http://localhost:3005"
echo ""
echo "🔧 Monitoring & Tools:"
echo "  📊 Grafana:           http://localhost:3001 (admin/admin)"
echo "  📈 Prometheus:        http://localhost:9090"
echo "  🔍 Jaeger:            http://localhost:16686"
echo "  📋 Kibana:            http://localhost:5601"
echo "  🗄️  PostgreSQL:        localhost:5432 (postgres/postgres)"
echo "  🔴 Redis:             localhost:6379"
echo "  📨 Kafka:             localhost:9092"
echo ""
echo "🛠️  Development Commands:"
echo "  📜 View logs:         docker-compose logs -f [service-name]"
echo "  🔄 Restart service:   docker-compose restart [service-name]"
echo "  🛑 Stop all:          docker-compose down"
echo "  🧹 Clean up:          docker-compose down -v --remove-orphans"
echo ""
echo "Happy coding! 🚀"
