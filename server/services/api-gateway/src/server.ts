import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import promClient from 'prom-client';
import promMiddleware from 'express-prometheus-middleware';
import { initTracer } from 'jaeger-client';
import dotenv from 'dotenv';

import {
  logger,
  corsMiddleware,
  errorHandler,
  notFoundHandler,
  authMiddleware,
  validateRequestSize,
  HTTP_STATUS,
  createSuccessResponse
} from '@ecommerce/shared';

import { config } from './config';
import { setupRoutes } from './routes';
import { setupWebSocket } from './websocket';
import { setupMetrics } from './metrics';
import { setupTracing } from './tracing';
import { ServiceRegistry } from './services/service-registry';
import { CircuitBreaker } from './utils/circuit-breaker';
import { HealthChecker } from './utils/health-checker';

// Load environment variables
dotenv.config();

class APIGateway {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private serviceRegistry: ServiceRegistry;
  private healthChecker: HealthChecker;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
    this.serviceRegistry = new ServiceRegistry();
    this.healthChecker = new HealthChecker();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // Compression
    this.app.use(compression());

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    }));

    // CORS
    this.app.use(corsMiddleware({
      origin: config.cors.allowedOrigins,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request size validation
    this.app.use(validateRequestSize(10 * 1024 * 1024)); // 10MB

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Metrics middleware
    this.app.use(promMiddleware({
      metricsPath: '/metrics',
      collectDefaultMetrics: true,
      requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
    }));

    // Trust proxy
    this.app.set('trust proxy', 1);
  }

  private setupSwagger(): void {
    try {
      const swaggerDocument = YAML.load('./docs/swagger.yaml');
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Ecommerce API Documentation',
      }));
      logger.info('Swagger documentation setup complete');
    } catch (error) {
      logger.warn('Failed to load Swagger documentation', { error });
    }
  }

  private setupProxyRoutes(): void {
    // User Service Proxy
    this.app.use('/api/users', createProxyMiddleware({
      target: config.services.userService,
      changeOrigin: true,
      pathRewrite: {
        '^/api/users': '/api/v1/users',
      },
      onError: (err, req, res) => {
        logger.error('User service proxy error', { error: err.message });
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          error: 'User service is currently unavailable',
        });
      },
    }));

    // Product Service Proxy
    this.app.use('/api/products', createProxyMiddleware({
      target: config.services.productService,
      changeOrigin: true,
      pathRewrite: {
        '^/api/products': '/api/v1/products',
      },
      onError: (err, req, res) => {
        logger.error('Product service proxy error', { error: err.message });
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          error: 'Product service is currently unavailable',
        });
      },
    }));

    // Order Service Proxy
    this.app.use('/api/orders', authMiddleware(), createProxyMiddleware({
      target: config.services.orderService,
      changeOrigin: true,
      pathRewrite: {
        '^/api/orders': '/api/v1/orders',
      },
      onProxyReq: (proxyReq, req) => {
        // Forward user information to the service
        if ((req as any).user) {
          proxyReq.setHeader('X-User-ID', (req as any).user.id);
          proxyReq.setHeader('X-User-Role', (req as any).user.role);
        }
      },
      onError: (err, req, res) => {
        logger.error('Order service proxy error', { error: err.message });
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          error: 'Order service is currently unavailable',
        });
      },
    }));

    // Payment Service Proxy
    this.app.use('/api/payments', authMiddleware(), createProxyMiddleware({
      target: config.services.paymentService,
      changeOrigin: true,
      pathRewrite: {
        '^/api/payments': '/api/v1/payments',
      },
      onProxyReq: (proxyReq, req) => {
        if ((req as any).user) {
          proxyReq.setHeader('X-User-ID', (req as any).user.id);
          proxyReq.setHeader('X-User-Role', (req as any).user.role);
        }
      },
      onError: (err, req, res) => {
        logger.error('Payment service proxy error', { error: err.message });
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          error: 'Payment service is currently unavailable',
        });
      },
    }));

    // Notification Service Proxy
    this.app.use('/api/notifications', authMiddleware(), createProxyMiddleware({
      target: config.services.notificationService,
      changeOrigin: true,
      pathRewrite: {
        '^/api/notifications': '/api/v1/notifications',
      },
      onProxyReq: (proxyReq, req) => {
        if ((req as any).user) {
          proxyReq.setHeader('X-User-ID', (req as any).user.id);
          proxyReq.setHeader('X-User-Role', (req as any).user.role);
        }
      },
      onError: (err, req, res) => {
        logger.error('Notification service proxy error', { error: err.message });
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          error: 'Notification service is currently unavailable',
        });
      },
    }));
  }

  private setupHealthChecks(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const healthStatus = await this.healthChecker.checkAll();
        const status = healthStatus.healthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
        
        res.status(status).json(createSuccessResponse(healthStatus, 'Health check completed'));
      } catch (error) {
        logger.error('Health check failed', { error });
        res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          error: 'Health check failed',
        });
      }
    });

    // Readiness probe
    this.app.get('/ready', (req, res) => {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Service is ready',
        timestamp: new Date().toISOString(),
      });
    });

    // Liveness probe
    this.app.get('/live', (req, res) => {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Service is alive',
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler({
      includeStack: config.env === 'development',
      logErrors: true,
    }));
  }

  private async setupServices(): Promise<void> {
    // Initialize service registry
    await this.serviceRegistry.initialize();

    // Setup health checker
    this.healthChecker.addCheck('database', async () => {
      // Database health check would go here
      return { healthy: true, message: 'Database is healthy' };
    });

    this.healthChecker.addCheck('redis', async () => {
      // Redis health check would go here
      return { healthy: true, message: 'Redis is healthy' };
    });

    this.healthChecker.addCheck('services', async () => {
      const services = await this.serviceRegistry.getHealthyServices();
      return {
        healthy: services.length > 0,
        message: `${services.length} services are healthy`,
        details: services,
      };
    });
  }

  public async start(): Promise<void> {
    try {
      // Setup middleware
      this.setupMiddleware();

      // Setup Swagger documentation
      this.setupSwagger();

      // Setup services
      await this.setupServices();

      // Setup routes
      setupRoutes(this.app);

      // Setup proxy routes
      this.setupProxyRoutes();

      // Setup health checks
      this.setupHealthChecks();

      // Setup WebSocket
      setupWebSocket(this.io);

      // Setup metrics
      setupMetrics();

      // Setup tracing
      setupTracing();

      // Setup error handling (must be last)
      this.setupErrorHandling();

      // Start server
      const port = config.port;
      this.server.listen(port, () => {
        logger.info(`🚀 API Gateway started on port ${port}`, {
          environment: config.env,
          port,
          services: config.services,
        });
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start API Gateway', { error });
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      this.server.close(async (err: any) => {
        if (err) {
          logger.error('Error during server shutdown', { error: err });
          process.exit(1);
        }
        
        try {
          // Close service registry
          await this.serviceRegistry.close();
          
          logger.info('API Gateway shut down successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during cleanup', { error });
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
  }
}

// Start the API Gateway
const gateway = new APIGateway();
gateway.start().catch((error) => {
  logger.error('Failed to start API Gateway', { error });
  process.exit(1);
});

export default gateway;
