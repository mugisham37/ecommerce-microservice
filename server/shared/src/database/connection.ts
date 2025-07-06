import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { DatabaseConfig, RedisConfig, KafkaConfig } from '../types';
import { logger } from '../utils/logger';

// Prisma Database Connection
export class DatabaseConnection {
  private static instance: PrismaClient;
  private static isConnected = false;

  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance = new PrismaClient({
        log: [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'event' },
          { level: 'info', emit: 'event' },
          { level: 'warn', emit: 'event' },
        ],
        errorFormat: 'pretty',
      });

      // Log database queries in development
      if (process.env.NODE_ENV === 'development') {
        this.instance.$on('query', (e) => {
          logger.debug('Database Query', {
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
          });
        });
      }

      // Log database errors
      this.instance.$on('error', (e) => {
        logger.error('Database Error', { error: e });
      });
    }

    return this.instance;
  }

  static async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const prisma = this.getInstance();
      await prisma.$connect();
      this.isConnected = true;
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed', { error });
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.instance.$disconnect();
      this.isConnected = false;
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Database disconnection failed', { error });
      throw error;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      await this.getInstance().$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  static isHealthy(): boolean {
    return this.isConnected;
  }
}

// Redis Connection
export class RedisConnection {
  private static instance: Redis;
  private static isConnected = false;

  static getInstance(config?: RedisConfig): Redis {
    if (!this.instance) {
      const redisConfig = config || {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
      };

      this.instance = new Redis({
        ...redisConfig,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.instance.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.instance.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis connection error', { error });
      });

      this.instance.on('close', () => {
        this.isConnected = false;
        logger.info('Redis connection closed');
      });
    }

    return this.instance;
  }

  static async connect(config?: RedisConfig): Promise<void> {
    if (this.isConnected) return;

    try {
      const redis = this.getInstance(config);
      await redis.connect();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.error('Redis connection failed', { error });
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.instance.quit();
      this.isConnected = false;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Redis disconnection failed', { error });
      throw error;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const result = await this.getInstance().ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  static isHealthy(): boolean {
    return this.isConnected;
  }
}

// Kafka Connection
export class KafkaConnection {
  private static kafka: Kafka;
  private static producer: Producer;
  private static consumers: Map<string, Consumer> = new Map();
  private static isConnected = false;

  static getInstance(config?: KafkaConfig): Kafka {
    if (!this.kafka) {
      const kafkaConfig = config || {
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        clientId: process.env.KAFKA_CLIENT_ID || 'ecommerce-microservice',
        groupId: process.env.KAFKA_GROUP_ID || 'ecommerce-group',
      };

      this.kafka = new Kafka({
        clientId: kafkaConfig.clientId,
        brokers: kafkaConfig.brokers,
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      });
    }

    return this.kafka;
  }

  static async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.getInstance().producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000,
      });

      await this.producer.connect();
      logger.info('Kafka producer connected successfully');
    }

    return this.producer;
  }

  static async getConsumer(groupId: string): Promise<Consumer> {
    if (!this.consumers.has(groupId)) {
      const consumer = this.getInstance().consumer({
        groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      });

      await consumer.connect();
      this.consumers.set(groupId, consumer);
      logger.info(`Kafka consumer connected successfully for group: ${groupId}`);
    }

    return this.consumers.get(groupId)!;
  }

  static async connect(config?: KafkaConfig): Promise<void> {
    if (this.isConnected) return;

    try {
      this.getInstance(config);
      await this.getProducer();
      this.isConnected = true;
      logger.info('Kafka connected successfully');
    } catch (error) {
      logger.error('Kafka connection failed', { error });
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      if (this.producer) {
        await this.producer.disconnect();
      }

      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect();
        logger.info(`Kafka consumer disconnected for group: ${groupId}`);
      }

      this.consumers.clear();
      this.isConnected = false;
      logger.info('Kafka disconnected successfully');
    } catch (error) {
      logger.error('Kafka disconnection failed', { error });
      throw error;
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const admin = this.getInstance().admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return true;
    } catch (error) {
      logger.error('Kafka health check failed', { error });
      return false;
    }
  }

  static isHealthy(): boolean {
    return this.isConnected;
  }
}

// Connection Manager
export class ConnectionManager {
  private static connections: {
    database?: DatabaseConnection;
    redis?: RedisConnection;
    kafka?: KafkaConnection;
  } = {};

  static async initializeAll(config?: {
    database?: DatabaseConfig;
    redis?: RedisConfig;
    kafka?: KafkaConfig;
  }): Promise<void> {
    try {
      logger.info('Initializing all connections...');

      // Initialize Database
      await DatabaseConnection.connect();

      // Initialize Redis
      await RedisConnection.connect(config?.redis);

      // Initialize Kafka
      await KafkaConnection.connect(config?.kafka);

      logger.info('All connections initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize connections', { error });
      throw error;
    }
  }

  static async closeAll(): Promise<void> {
    try {
      logger.info('Closing all connections...');

      await Promise.all([
        DatabaseConnection.disconnect(),
        RedisConnection.disconnect(),
        KafkaConnection.disconnect(),
      ]);

      logger.info('All connections closed successfully');
    } catch (error) {
      logger.error('Failed to close connections', { error });
      throw error;
    }
  }

  static async healthCheckAll(): Promise<{
    database: boolean;
    redis: boolean;
    kafka: boolean;
    overall: boolean;
  }> {
    const [database, redis, kafka] = await Promise.all([
      DatabaseConnection.healthCheck(),
      RedisConnection.healthCheck(),
      KafkaConnection.healthCheck(),
    ]);

    const overall = database && redis && kafka;

    return { database, redis, kafka, overall };
  }

  static getConnectionStatus(): {
    database: boolean;
    redis: boolean;
    kafka: boolean;
  } {
    return {
      database: DatabaseConnection.isHealthy(),
      redis: RedisConnection.isHealthy(),
      kafka: KafkaConnection.isHealthy(),
    };
  }
}

// Graceful shutdown handler
export const setupGracefulShutdown = () => {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      await ConnectionManager.closeAll();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
};
