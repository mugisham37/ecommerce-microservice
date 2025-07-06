import { KafkaConnection, RedisConnection } from '../database/connection';
import { logger } from '../utils/logger';
import { BaseEvent, UserEvent, OrderEvent, PaymentEvent, ProductEvent } from '../types';

export class EventBus {
  private static instance: EventBus;
  private kafkaProducer: any;
  private redisClient: any;

  private constructor() {}

  static getInstance(): EventBus {
    if (!this.instance) {
      this.instance = new EventBus();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.kafkaProducer = await KafkaConnection.getProducer();
      this.redisClient = RedisConnection.getInstance();
      logger.info('EventBus initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize EventBus', { error });
      throw error;
    }
  }

  // Kafka-based events for reliable, persistent messaging
  async publishEvent(topic: string, event: BaseEvent): Promise<void> {
    try {
      await this.kafkaProducer.send({
        topic,
        messages: [
          {
            key: event.id,
            value: JSON.stringify(event),
            headers: {
              eventType: event.type,
              source: event.source,
              version: event.version,
            },
          },
        ],
      });

      logger.info('Event published to Kafka', {
        topic,
        eventId: event.id,
        eventType: event.type,
      });
    } catch (error) {
      logger.error('Failed to publish event to Kafka', {
        topic,
        eventId: event.id,
        error,
      });
      throw error;
    }
  }

  // Redis Pub/Sub for real-time notifications
  async publishRealTimeEvent(channel: string, event: BaseEvent): Promise<void> {
    try {
      await this.redisClient.publish(channel, JSON.stringify(event));

      logger.info('Real-time event published to Redis', {
        channel,
        eventId: event.id,
        eventType: event.type,
      });
    } catch (error) {
      logger.error('Failed to publish real-time event to Redis', {
        channel,
        eventId: event.id,
        error,
      });
      throw error;
    }
  }

  // Subscribe to Redis channels for real-time events
  async subscribeToRealTimeEvents(
    channels: string[],
    handler: (channel: string, event: BaseEvent) => Promise<void>
  ): Promise<void> {
    try {
      const subscriber = RedisConnection.getInstance();
      
      await subscriber.subscribe(...channels);

      subscriber.on('message', async (channel: string, message: string) => {
        try {
          const event = JSON.parse(message) as BaseEvent;
          await handler(channel, event);
        } catch (error) {
          logger.error('Error handling real-time event', {
            channel,
            message,
            error,
          });
        }
      });

      logger.info('Subscribed to real-time events', { channels });
    } catch (error) {
      logger.error('Failed to subscribe to real-time events', {
        channels,
        error,
      });
      throw error;
    }
  }

  // User Events
  async publishUserCreated(userId: string, userData: any): Promise<void> {
    const event: UserEvent = {
      id: this.generateEventId(),
      type: 'USER_CREATED',
      timestamp: new Date(),
      source: 'user-service',
      version: '1.0',
      userId,
      userData,
    };

    await Promise.all([
      this.publishEvent('user-events', event),
      this.publishRealTimeEvent('user:created', event),
    ]);
  }

  async publishUserUpdated(userId: string, userData: any): Promise<void> {
    const event: UserEvent = {
      id: this.generateEventId(),
      type: 'USER_UPDATED',
      timestamp: new Date(),
      source: 'user-service',
      version: '1.0',
      userId,
      userData,
    };

    await Promise.all([
      this.publishEvent('user-events', event),
      this.publishRealTimeEvent('user:updated', event),
    ]);
  }

  async publishUserDeleted(userId: string): Promise<void> {
    const event: UserEvent = {
      id: this.generateEventId(),
      type: 'USER_DELETED',
      timestamp: new Date(),
      source: 'user-service',
      version: '1.0',
      userId,
      userData: { id: userId },
    };

    await Promise.all([
      this.publishEvent('user-events', event),
      this.publishRealTimeEvent('user:deleted', event),
    ]);
  }

  // Order Events
  async publishOrderCreated(orderId: string, userId: string, orderData: any): Promise<void> {
    const event: OrderEvent = {
      id: this.generateEventId(),
      type: 'ORDER_CREATED',
      timestamp: new Date(),
      source: 'order-service',
      version: '1.0',
      orderId,
      userId,
      orderData,
    };

    await Promise.all([
      this.publishEvent('order-events', event),
      this.publishRealTimeEvent('order:created', event),
    ]);
  }

  async publishOrderUpdated(orderId: string, userId: string, orderData: any): Promise<void> {
    const event: OrderEvent = {
      id: this.generateEventId(),
      type: 'ORDER_UPDATED',
      timestamp: new Date(),
      source: 'order-service',
      version: '1.0',
      orderId,
      userId,
      orderData,
    };

    await Promise.all([
      this.publishEvent('order-events', event),
      this.publishRealTimeEvent('order:updated', event),
    ]);
  }

  async publishOrderCancelled(orderId: string, userId: string, orderData: any): Promise<void> {
    const event: OrderEvent = {
      id: this.generateEventId(),
      type: 'ORDER_CANCELLED',
      timestamp: new Date(),
      source: 'order-service',
      version: '1.0',
      orderId,
      userId,
      orderData,
    };

    await Promise.all([
      this.publishEvent('order-events', event),
      this.publishRealTimeEvent('order:cancelled', event),
    ]);
  }

  // Payment Events
  async publishPaymentProcessed(paymentId: string, orderId: string, userId: string, paymentData: any): Promise<void> {
    const event: PaymentEvent = {
      id: this.generateEventId(),
      type: 'PAYMENT_PROCESSED',
      timestamp: new Date(),
      source: 'payment-service',
      version: '1.0',
      paymentId,
      orderId,
      userId,
      paymentData,
    };

    await Promise.all([
      this.publishEvent('payment-events', event),
      this.publishRealTimeEvent('payment:processed', event),
    ]);
  }

  async publishPaymentFailed(paymentId: string, orderId: string, userId: string, paymentData: any): Promise<void> {
    const event: PaymentEvent = {
      id: this.generateEventId(),
      type: 'PAYMENT_FAILED',
      timestamp: new Date(),
      source: 'payment-service',
      version: '1.0',
      paymentId,
      orderId,
      userId,
      paymentData,
    };

    await Promise.all([
      this.publishEvent('payment-events', event),
      this.publishRealTimeEvent('payment:failed', event),
    ]);
  }

  // Product Events
  async publishProductCreated(productId: string, vendorId: string, productData: any): Promise<void> {
    const event: ProductEvent = {
      id: this.generateEventId(),
      type: 'PRODUCT_CREATED',
      timestamp: new Date(),
      source: 'product-service',
      version: '1.0',
      productId,
      vendorId,
      productData,
    };

    await Promise.all([
      this.publishEvent('product-events', event),
      this.publishRealTimeEvent('product:created', event),
    ]);
  }

  async publishProductUpdated(productId: string, vendorId: string, productData: any): Promise<void> {
    const event: ProductEvent = {
      id: this.generateEventId(),
      type: 'PRODUCT_UPDATED',
      timestamp: new Date(),
      source: 'product-service',
      version: '1.0',
      productId,
      vendorId,
      productData,
    };

    await Promise.all([
      this.publishEvent('product-events', event),
      this.publishRealTimeEvent('product:updated', event),
    ]);
  }

  async publishInventoryUpdated(productId: string, vendorId: string, inventoryData: any): Promise<void> {
    const event: ProductEvent = {
      id: this.generateEventId(),
      type: 'INVENTORY_UPDATED',
      timestamp: new Date(),
      source: 'product-service',
      version: '1.0',
      productId,
      vendorId,
      productData: inventoryData,
    };

    await Promise.all([
      this.publishEvent('product-events', event),
      this.publishRealTimeEvent('inventory:updated', event),
    ]);
  }

  // Event consumer setup
  async setupEventConsumer(
    topics: string[],
    groupId: string,
    handler: (topic: string, event: BaseEvent) => Promise<void>
  ): Promise<void> {
    try {
      const consumer = await KafkaConnection.getConsumer(groupId);

      await consumer.subscribe({ topics });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            if (message.value) {
              const event = JSON.parse(message.value.toString()) as BaseEvent;
              await handler(topic, event);

              logger.info('Event processed successfully', {
                topic,
                partition,
                eventId: event.id,
                eventType: event.type,
              });
            }
          } catch (error) {
            logger.error('Error processing event', {
              topic,
              partition,
              error,
            });
          }
        },
      });

      logger.info('Event consumer setup completed', { topics, groupId });
    } catch (error) {
      logger.error('Failed to setup event consumer', {
        topics,
        groupId,
        error,
      });
      throw error;
    }
  }

  // Utility methods
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event replay functionality
  async replayEvents(
    topic: string,
    fromTimestamp: Date,
    toTimestamp: Date,
    handler: (event: BaseEvent) => Promise<void>
  ): Promise<void> {
    try {
      const consumer = await KafkaConnection.getConsumer(`replay-${Date.now()}`);
      
      await consumer.subscribe({ topics: [topic] });

      await consumer.run({
        eachMessage: async ({ message }) => {
          try {
            if (message.value) {
              const event = JSON.parse(message.value.toString()) as BaseEvent;
              
              if (event.timestamp >= fromTimestamp && event.timestamp <= toTimestamp) {
                await handler(event);
              }
            }
          } catch (error) {
            logger.error('Error replaying event', { error });
          }
        },
      });

      logger.info('Event replay completed', {
        topic,
        fromTimestamp,
        toTimestamp,
      });
    } catch (error) {
      logger.error('Failed to replay events', {
        topic,
        fromTimestamp,
        toTimestamp,
        error,
      });
      throw error;
    }
  }

  // Dead letter queue handling
  async handleDeadLetterEvent(event: BaseEvent, error: Error): Promise<void> {
    const deadLetterEvent = {
      ...event,
      id: this.generateEventId(),
      type: `${event.type}_DEAD_LETTER`,
      timestamp: new Date(),
      originalEventId: event.id,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };

    await this.publishEvent('dead-letter-events', deadLetterEvent);
  }
}

// Event handler interface
export interface EventHandler {
  handle(event: BaseEvent): Promise<void>;
}

// Event registry for managing handlers
export class EventRegistry {
  private static handlers: Map<string, EventHandler[]> = new Map();

  static register(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  static async dispatch(event: BaseEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler.handle(event);
        } catch (error) {
          logger.error('Event handler failed', {
            eventType: event.type,
            eventId: event.id,
            handler: handler.constructor.name,
            error,
          });
        }
      })
    );
  }
}
