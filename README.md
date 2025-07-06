# 🚀 Enterprise E-commerce Microservices Platform

A production-ready, scalable e-commerce platform built with modern microservices architecture, featuring Node.js/TypeScript backend services and Next.js frontend.

## 📋 Table of Contents

- [🏗️ Architecture Overview](#️-architecture-overview)
- [🛠️ Technology Stack](#️-technology-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
- [🔧 Development](#-development)
- [📊 Monitoring & Observability](#-monitoring--observability)
- [🚢 Deployment](#-deployment)
- [📚 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🤝 Contributing](#-contributing)

## 🏗️ Architecture Overview

This platform implements a **microservices architecture** with the following key components:

### Core Services
- **API Gateway** (Port 3000) - Central entry point, routing, authentication, rate limiting
- **User Service** (Port 3001) - User management, authentication, profiles
- **Product Service** (Port 3002) - Product catalog, categories, search
- **Order Service** (Port 3003) - Order processing, cart management
- **Payment Service** (Port 3004) - Payment processing, Stripe/PayPal integration
- **Notification Service** (Port 3005) - Email, SMS, push notifications

### Frontend
- **Next.js Application** (Port 3006) - Modern React-based frontend

### Infrastructure
- **PostgreSQL** (Port 5432) - Primary database with Prisma ORM
- **Redis** (Port 6379) - Caching and session storage
- **Apache Kafka** (Port 9092) - Event streaming and inter-service communication
- **Elasticsearch** (Port 9200) - Log aggregation and search

### Monitoring Stack
- **Prometheus** (Port 9090) - Metrics collection
- **Grafana** (Port 3001) - Monitoring dashboards
- **Jaeger** (Port 16686) - Distributed tracing
- **Kibana** (Port 5601) - Log visualization

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js with Fastify for high-performance services
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Message Queue**: Apache Kafka
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod for runtime type validation
- **Testing**: Jest + Supertest

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + Testing Library + Playwright

### DevOps & Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana + Jaeger
- **Logging**: ELK Stack (Elasticsearch + Logstash + Kibana)
- **Package Manager**: pnpm with workspaces
- **Build Tool**: Turborepo for monorepo management

## 📁 Project Structure

```
ecommerce-microservice/
├── 📁 client/                          # Next.js Frontend
│   ├── 📁 src/app/                     # App Router pages
│   ├── 📁 components/                  # Reusable components
│   ├── 📁 lib/                         # Utilities and configurations
│   └── 📄 package.json
├── 📁 server/                          # Backend Services
│   ├── 📁 shared/                      # Shared libraries
│   │   ├── 📁 src/
│   │   │   ├── 📁 database/            # Database utilities
│   │   │   ├── 📁 events/              # Event handling
│   │   │   ├── 📁 middleware/          # Express middleware
│   │   │   ├── 📁 types/               # TypeScript types
│   │   │   └── 📁 utils/               # Utility functions
│   │   └── 📄 package.json
│   └── 📁 services/                    # Microservices
│       ├── 📁 api-gateway/             # API Gateway Service
│       ├── 📁 user-service/            # User Management Service
│       ├── 📁 product-service/         # Product Catalog Service
│       ├── 📁 order-service/           # Order Processing Service
│       ├── 📁 payment-service/         # Payment Processing Service
│       └── 📁 notification-service/    # Notification Service
├── 📁 monitoring/                      # Monitoring Configuration
│   ├── 📄 prometheus.yml               # Prometheus config
│   └── 📁 grafana/                     # Grafana dashboards
├── 📁 scripts/                         # Development scripts
│   └── 📄 dev.sh                       # Development startup script
├── 📄 docker-compose.yml               # Local development environment
├── 📄 package.json                     # Root package.json
├── 📄 pnpm-workspace.yaml              # pnpm workspace configuration
└── 📄 turbo.json                       # Turborepo configuration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ 
- **pnpm** (recommended) or npm
- **Docker** and **Docker Compose**
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ecommerce-microservice.git
cd ecommerce-microservice
```

### 2. Install Dependencies

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 3. Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp client/.env.example client/.env.local

# Edit environment variables as needed
# Update database URLs, API keys, etc.
```

### 4. Start Development Environment

```bash
# Option 1: Use the development script (recommended)
chmod +x scripts/dev.sh
./scripts/dev.sh

# Option 2: Manual Docker Compose
docker-compose up -d
```

### 5. Access the Application

- **Frontend**: http://localhost:3006
- **API Gateway**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs

## 🔧 Development

### Development Commands

```bash
# Start all services
pnpm dev

# Start specific service
pnpm dev --filter @ecommerce/api-gateway

# Build all projects
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### Service-Specific Commands

```bash
# API Gateway
cd server/services/api-gateway
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm test         # Run tests

# Frontend
cd client
pnpm dev          # Start Next.js dev server
pnpm build        # Build for production
pnpm start        # Start production server
```

### Database Management

```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Reset database
pnpm db:reset

# Seed database
pnpm db:seed
```

## 📊 Monitoring & Observability

### Monitoring URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Jaeger | http://localhost:16686 | - |
| Kibana | http://localhost:5601 | - |

### Key Metrics

- **Request Rate**: Requests per second across all services
- **Response Time**: P95, P99 response times
- **Error Rate**: 4xx and 5xx error percentages
- **Database Performance**: Query execution times
- **Cache Hit Rate**: Redis cache effectiveness
- **Resource Usage**: CPU, Memory, Disk usage

### Distributed Tracing

All services are instrumented with OpenTelemetry for distributed tracing:

- View request flows across microservices
- Identify performance bottlenecks
- Debug complex inter-service interactions

## 🚢 Deployment

### Local Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down
```

### Production Deployment

The platform is designed for cloud-native deployment with:

- **Kubernetes** manifests for container orchestration
- **Helm** charts for templated deployments
- **GitHub Actions** for CI/CD pipelines
- **Multi-environment** support (dev/staging/prod)

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to Kubernetes
kubectl apply -f k8s/
```

## 📚 API Documentation

### Interactive Documentation

- **Swagger UI**: http://localhost:3000/api-docs
- **Postman Collection**: Available in `/docs/postman/`

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

#### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id` - Get user by ID

#### Products
- `GET /api/products` - List products with pagination
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)

#### Orders
- `GET /api/orders` - List user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status

#### Payments
- `POST /api/payments/process` - Process payment
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/webhook` - Payment webhook

## 🧪 Testing

### Test Types

- **Unit Tests**: Individual function/component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user journey testing
- **Load Tests**: Performance and scalability testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run load tests
pnpm test:load
```

### Test Structure

```
__tests__/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data and mocks
```

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Conventional Commits** for commit messages
- **Jest** for testing

### Pull Request Guidelines

- Ensure all tests pass
- Update documentation as needed
- Follow the existing code style
- Include relevant test cases
- Update CHANGELOG.md

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by microservices best practices
- Community-driven development approach

---

## 🔗 Quick Links

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

---

**Happy Coding! 🚀**

For questions or support, please open an issue or contact the development team.
