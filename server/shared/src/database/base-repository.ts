import { PrismaClient } from '@prisma/client';
import { DatabaseConnection } from './connection';
import { logger } from '../utils/logger';
import { NotFoundError, DatabaseError } from '../utils/errors';

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(modelName: string) {
    this.prisma = DatabaseConnection.getInstance();
    this.modelName = modelName;
  }

  // Abstract methods to be implemented by child classes
  abstract create(data: CreateInput): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findMany(options?: FindManyOptions): Promise<T[]>;
  abstract update(id: string, data: UpdateInput): Promise<T>;
  abstract delete(id: string): Promise<void>;

  // Common utility methods
  protected async executeQuery<R>(
    operation: () => Promise<R>,
    errorMessage: string = 'Database operation failed'
  ): Promise<R> {
    try {
      return await operation();
    } catch (error) {
      logger.error(`${this.modelName} Repository Error`, {
        error: error instanceof Error ? error.message : error,
        operation: errorMessage,
      });
      throw new DatabaseError(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected async findByIdOrThrow(id: string): Promise<T> {
    const result = await this.findById(id);
    if (!result) {
      throw new NotFoundError(`${this.modelName} with ID ${id} not found`);
    }
    return result;
  }

  protected buildWhereClause(filters: Record<string, any>): Record<string, any> {
    const where: Record<string, any> = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && key.includes('search')) {
          where[key.replace('search', '')] = {
            contains: value,
            mode: 'insensitive',
          };
        } else if (key.includes('min') || key.includes('max')) {
          const field = key.replace(/min|max/i, '');
          if (!where[field]) where[field] = {};
          
          if (key.includes('min')) {
            where[field].gte = value;
          } else {
            where[field].lte = value;
          }
        } else {
          where[key] = value;
        }
      }
    });

    return where;
  }

  protected buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): Record<string, any> | undefined {
    if (!sortBy) return undefined;

    return {
      [sortBy]: sortOrder,
    };
  }

  async count(where?: Record<string, any>): Promise<number> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.count({ where });
      },
      `Count ${this.modelName} records`
    );
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== null;
  }

  async findFirst(where: Record<string, any>): Promise<T | null> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.findFirst({ where });
      },
      `Find first ${this.modelName}`
    );
  }

  async findUnique(where: Record<string, any>): Promise<T | null> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.findUnique({ where });
      },
      `Find unique ${this.modelName}`
    );
  }

  async upsert(
    where: Record<string, any>,
    create: CreateInput,
    update: UpdateInput
  ): Promise<T> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.upsert({
          where,
          create,
          update,
        });
      },
      `Upsert ${this.modelName}`
    );
  }

  async deleteMany(where: Record<string, any>): Promise<{ count: number }> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.deleteMany({ where });
      },
      `Delete many ${this.modelName} records`
    );
  }

  async updateMany(
    where: Record<string, any>,
    data: Partial<UpdateInput>
  ): Promise<{ count: number }> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.updateMany({
          where,
          data,
        });
      },
      `Update many ${this.modelName} records`
    );
  }

  // Transaction support
  async transaction<R>(operations: (tx: PrismaClient) => Promise<R>): Promise<R> {
    return this.executeQuery(
      async () => {
        return this.prisma.$transaction(operations);
      },
      `Execute ${this.modelName} transaction`
    );
  }

  // Pagination helper
  async findManyWithPagination(options: FindManyWithPaginationOptions): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 10, where, orderBy, include } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.executeQuery(
        async () => {
          const model = (this.prisma as any)[this.modelName.toLowerCase()];
          return model.findMany({
            where,
            orderBy,
            include,
            skip,
            take: limit,
          });
        },
        `Find many ${this.modelName} with pagination`
      ),
      this.count(where),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  // Soft delete support
  async softDelete(id: string): Promise<T> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      },
      `Soft delete ${this.modelName}`
    );
  }

  async restore(id: string): Promise<T> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.update({
          where: { id },
          data: { deletedAt: null },
        });
      },
      `Restore ${this.modelName}`
    );
  }

  // Bulk operations
  async createMany(data: CreateInput[]): Promise<{ count: number }> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.createMany({
          data,
          skipDuplicates: true,
        });
      },
      `Create many ${this.modelName} records`
    );
  }

  // Search functionality
  async search(query: string, fields: string[]): Promise<T[]> {
    const orConditions = fields.map(field => ({
      [field]: {
        contains: query,
        mode: 'insensitive',
      },
    }));

    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.findMany({
          where: {
            OR: orConditions,
          },
        });
      },
      `Search ${this.modelName}`
    );
  }

  // Aggregation methods
  async aggregate(options: AggregateOptions): Promise<any> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.aggregate(options);
      },
      `Aggregate ${this.modelName}`
    );
  }

  async groupBy(options: GroupByOptions): Promise<any[]> {
    return this.executeQuery(
      async () => {
        const model = (this.prisma as any)[this.modelName.toLowerCase()];
        return model.groupBy(options);
      },
      `Group by ${this.modelName}`
    );
  }
}

// Type definitions for repository options
export interface FindManyOptions {
  where?: Record<string, any>;
  orderBy?: Record<string, any>;
  include?: Record<string, any>;
  select?: Record<string, any>;
  skip?: number;
  take?: number;
}

export interface FindManyWithPaginationOptions extends FindManyOptions {
  page?: number;
  limit?: number;
}

export interface AggregateOptions {
  where?: Record<string, any>;
  _count?: Record<string, boolean> | boolean;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
}

export interface GroupByOptions {
  by: string[];
  where?: Record<string, any>;
  having?: Record<string, any>;
  _count?: Record<string, boolean> | boolean;
  _sum?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _max?: Record<string, boolean>;
  orderBy?: Record<string, any>;
  skip?: number;
  take?: number;
}
