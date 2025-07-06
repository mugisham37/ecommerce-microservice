import { z } from 'zod';
import { UserRole, OrderStatus, PaymentStatus, PaymentProvider, NotificationType } from '../types';

// User Validation Schemas
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  ),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.CUSTOMER),
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  ),
});

// Product Validation Schemas
export const productCreateSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  categoryId: z.string().uuid('Invalid category ID'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  images: z.array(z.string().url('Invalid image URL')).min(1, 'At least one image is required'),
});

export const productUpdateSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  price: z.number().positive('Price must be positive').optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  stock: z.number().int().min(0, 'Stock cannot be negative').optional(),
  images: z.array(z.string().url('Invalid image URL')).optional(),
  isActive: z.boolean().optional(),
});

// Category Validation Schemas
export const categoryCreateSchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional(),
  parentId: z.string().uuid('Invalid parent category ID').optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').optional(),
  description: z.string().optional(),
  parentId: z.string().uuid('Invalid parent category ID').optional(),
  isActive: z.boolean().optional(),
});

// Address Validation Schema
export const addressSchema = z.object({
  street: z.string().min(5, 'Street address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State must be at least 2 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  country: z.string().min(2, 'Country must be at least 2 characters'),
});

// Order Validation Schemas
export const orderCreateSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().positive('Quantity must be positive'),
  })).min(1, 'Order must contain at least one item'),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
});

export const orderUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional(),
});

// Cart Validation Schemas
export const cartItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

export const cartUpdateSchema = z.object({
  items: z.array(cartItemSchema),
});

// Payment Validation Schemas
export const paymentCreateSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  provider: z.nativeEnum(PaymentProvider),
  paymentMethodId: z.string().optional(),
});

export const paymentUpdateSchema = z.object({
  status: z.nativeEnum(PaymentStatus),
  providerTransactionId: z.string().optional(),
});

// Notification Validation Schemas
export const notificationCreateSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  data: z.record(z.any()).optional(),
});

export const notificationUpdateSchema = z.object({
  isRead: z.boolean(),
});

// Pagination Schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Search Schema
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  category: z.string().uuid().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  inStock: z.boolean().optional(),
}).merge(paginationSchema);

// File Upload Schema
export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.string().regex(/^image\/(jpeg|jpg|png|gif|webp)$/, 'Invalid file type'),
  size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
});

// Validation Helper Functions
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!formattedErrors[path]) {
          formattedErrors[path] = [];
        }
        formattedErrors[path].push(err.message);
      });
      throw new ValidationError('Validation failed', formattedErrors);
    }
    throw error;
  }
};

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isStrongPassword = (password: string): boolean => {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};
