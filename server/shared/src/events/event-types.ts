// Event type constants
export const EVENT_TYPES = {
  // User Events
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ACTIVATED: 'USER_ACTIVATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_PASSWORD_CHANGED: 'USER_PASSWORD_CHANGED',
  USER_EMAIL_VERIFIED: 'USER_EMAIL_VERIFIED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',

  // Product Events
  PRODUCT_CREATED: 'PRODUCT_CREATED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  PRODUCT_ACTIVATED: 'PRODUCT_ACTIVATED',
  PRODUCT_DEACTIVATED: 'PRODUCT_DEACTIVATED',
  PRODUCT_PRICE_CHANGED: 'PRODUCT_PRICE_CHANGED',
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  INVENTORY_LOW_STOCK: 'INVENTORY_LOW_STOCK',
  INVENTORY_OUT_OF_STOCK: 'INVENTORY_OUT_OF_STOCK',

  // Category Events
  CATEGORY_CREATED: 'CATEGORY_CREATED',
  CATEGORY_UPDATED: 'CATEGORY_UPDATED',
  CATEGORY_DELETED: 'CATEGORY_DELETED',

  // Order Events
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_PROCESSING: 'ORDER_PROCESSING',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_REFUNDED: 'ORDER_REFUNDED',

  // Cart Events
  CART_ITEM_ADDED: 'CART_ITEM_ADDED',
  CART_ITEM_UPDATED: 'CART_ITEM_UPDATED',
  CART_ITEM_REMOVED: 'CART_ITEM_REMOVED',
  CART_CLEARED: 'CART_CLEARED',

  // Payment Events
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  PAYMENT_PROCESSED: 'PAYMENT_PROCESSED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_METHOD_ADDED: 'PAYMENT_METHOD_ADDED',
  PAYMENT_METHOD_UPDATED: 'PAYMENT_METHOD_UPDATED',
  PAYMENT_METHOD_DELETED: 'PAYMENT_METHOD_DELETED',

  // Notification Events
  NOTIFICATION_CREATED: 'NOTIFICATION_CREATED',
  NOTIFICATION_SENT: 'NOTIFICATION_SENT',
  NOTIFICATION_DELIVERED: 'NOTIFICATION_DELIVERED',
  NOTIFICATION_READ: 'NOTIFICATION_READ',
  NOTIFICATION_FAILED: 'NOTIFICATION_FAILED',

  // Email Events
  EMAIL_SENT: 'EMAIL_SENT',
  EMAIL_DELIVERED: 'EMAIL_DELIVERED',
  EMAIL_BOUNCED: 'EMAIL_BOUNCED',
  EMAIL_FAILED: 'EMAIL_FAILED',

  // SMS Events
  SMS_SENT: 'SMS_SENT',
  SMS_DELIVERED: 'SMS_DELIVERED',
  SMS_FAILED: 'SMS_FAILED',

  // Push Notification Events
  PUSH_NOTIFICATION_SENT: 'PUSH_NOTIFICATION_SENT',
  PUSH_NOTIFICATION_DELIVERED: 'PUSH_NOTIFICATION_DELIVERED',
  PUSH_NOTIFICATION_FAILED: 'PUSH_NOTIFICATION_FAILED',

  // System Events
  SYSTEM_HEALTH_CHECK: 'SYSTEM_HEALTH_CHECK',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  SERVICE_STARTED: 'SERVICE_STARTED',
  SERVICE_STOPPED: 'SERVICE_STOPPED',
  SERVICE_HEALTH_CHECK: 'SERVICE_HEALTH_CHECK',

  // Analytics Events
  PAGE_VIEW: 'PAGE_VIEW',
  PRODUCT_VIEW: 'PRODUCT_VIEW',
  SEARCH_PERFORMED: 'SEARCH_PERFORMED',
  CONVERSION_TRACKED: 'CONVERSION_TRACKED',
  USER_BEHAVIOR_TRACKED: 'USER_BEHAVIOR_TRACKED',

  // Dead Letter Events
  DEAD_LETTER: 'DEAD_LETTER',
} as const;

// Event topic constants
export const EVENT_TOPICS = {
  USER_EVENTS: 'user-events',
  PRODUCT_EVENTS: 'product-events',
  ORDER_EVENTS: 'order-events',
  PAYMENT_EVENTS: 'payment-events',
  NOTIFICATION_EVENTS: 'notification-events',
  SYSTEM_EVENTS: 'system-events',
  ANALYTICS_EVENTS: 'analytics-events',
  DEAD_LETTER_EVENTS: 'dead-letter-events',
} as const;

// Real-time event channels
export const REALTIME_CHANNELS = {
  // User channels
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  // Order channels
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_CHANGED: 'order:status-changed',

  // Payment channels
  PAYMENT_PROCESSED: 'payment:processed',
  PAYMENT_FAILED: 'payment:failed',

  // Product channels
  PRODUCT_CREATED: 'product:created',
  PRODUCT_UPDATED: 'product:updated',
  INVENTORY_UPDATED: 'inventory:updated',

  // Notification channels
  NOTIFICATION_CREATED: 'notification:created',
  NOTIFICATION_SENT: 'notification:sent',

  // System channels
  SYSTEM_ALERT: 'system:alert',
  SYSTEM_MAINTENANCE: 'system:maintenance',
} as const;

// Event priority levels
export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Event status
export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  DEAD_LETTER = 'dead_letter',
}

// Event metadata interface
export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  priority?: EventPriority;
  retryCount?: number;
  maxRetries?: number;
  delayUntil?: Date;
  tags?: string[];
}

// Enhanced event interface with metadata
export interface EnhancedEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: string;
  version: string;
  data: Record<string, any>;
  metadata?: EventMetadata;
  status?: EventStatus;
}

// Event filter interface
export interface EventFilter {
  eventTypes?: string[];
  sources?: string[];
  fromTimestamp?: Date;
  toTimestamp?: Date;
  userId?: string;
  correlationId?: string;
  priority?: EventPriority;
  status?: EventStatus;
  tags?: string[];
}

// Event aggregation interface
export interface EventAggregation {
  eventType: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  sources: string[];
  avgProcessingTime?: number;
  successRate?: number;
  failureRate?: number;
}

// Event stream interface
export interface EventStream {
  id: string;
  name: string;
  description?: string;
  eventTypes: string[];
  filters?: EventFilter;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Event subscription interface
export interface EventSubscription {
  id: string;
  streamId: string;
  subscriberId: string;
  endpoint?: string;
  webhookUrl?: string;
  isActive: boolean;
  retryPolicy?: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    initialDelay: number;
    maxDelay: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Event processing result
export interface EventProcessingResult {
  eventId: string;
  status: EventStatus;
  processedAt: Date;
  processingTime: number;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
  retryCount: number;
  nextRetryAt?: Date;
}

// Event batch interface
export interface EventBatch {
  id: string;
  events: EnhancedEvent[];
  batchSize: number;
  createdAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: EventProcessingResult[];
}

// Event store query interface
export interface EventStoreQuery {
  streamId?: string;
  eventTypes?: string[];
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'version';
  orderDirection?: 'asc' | 'desc';
}

// Event projection interface
export interface EventProjection {
  id: string;
  name: string;
  description?: string;
  eventTypes: string[];
  projectionFunction: string; // Serialized function
  state: Record<string, any>;
  lastProcessedEventId?: string;
  lastProcessedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Event saga interface
export interface EventSaga {
  id: string;
  name: string;
  description?: string;
  triggerEventTypes: string[];
  state: 'pending' | 'running' | 'completed' | 'failed' | 'compensating';
  currentStep: number;
  totalSteps: number;
  sagaData: Record<string, any>;
  compensationData?: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: {
    message: string;
    step: number;
    timestamp: Date;
  };
}

// Event replay configuration
export interface EventReplayConfig {
  id: string;
  name: string;
  description?: string;
  sourceStreamId: string;
  targetStreamId?: string;
  eventFilter: EventFilter;
  replaySpeed: number; // Events per second
  startTimestamp: Date;
  endTimestamp: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: {
    totalEvents: number;
    processedEvents: number;
    failedEvents: number;
    startedAt: Date;
    estimatedCompletion?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Event schema registry
export interface EventSchema {
  eventType: string;
  version: string;
  schema: Record<string, any>; // JSON Schema
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Event transformation rule
export interface EventTransformationRule {
  id: string;
  name: string;
  description?: string;
  sourceEventType: string;
  targetEventType: string;
  transformationFunction: string; // Serialized function
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
