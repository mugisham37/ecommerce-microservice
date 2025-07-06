import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ecommerce',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Kafka
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'api-gateway',
    groupId: 'api-gateway-group',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // CORS
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3006'],
  },

  // Services
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    productService: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    orderService: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10), // 1000 requests per window
  },

  // Monitoring
  monitoring: {
    prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
    grafanaUrl: process.env.GRAFANA_URL || 'http://localhost:3001',
    jaegerUrl: process.env.JAEGER_URL || 'http://localhost:16686',
  },

  // Tracing
  tracing: {
    serviceName: 'api-gateway',
    jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    samplerType: 'const',
    samplerParam: 1,
  },

  // Circuit Breaker
  circuitBreaker: {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000', 10),
    errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50', 10),
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
  },

  // Health Check
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10), // 30 seconds
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10), // 5 seconds
  },

  // WebSocket
  websocket: {
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
    cookieSecret: process.env.COOKIE_SECRET || 'your-cookie-secret',
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES 
      ? process.env.ALLOWED_MIME_TYPES.split(',')
      : ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    elasticsearch: {
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      index: process.env.LOG_INDEX || 'ecommerce-logs',
    },
  },

  // Cache
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000', 10),
  },

  // API Versioning
  api: {
    version: process.env.API_VERSION || 'v1',
    prefix: process.env.API_PREFIX || '/api',
  },

  // Feature Flags
  features: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableTracing: process.env.ENABLE_TRACING === 'true',
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
    enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
    enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && config.env === 'production') {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

export default config;
