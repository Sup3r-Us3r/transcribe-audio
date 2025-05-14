import { connection as redis } from '../queues';

export class JobContextStore {
  private static getKey(workflowId: string): string {
    return `job-context:${workflowId}`;
  }

  public static async get<T = any>(workflowId: string): Promise<T> {
    const raw = await redis.get(this.getKey(workflowId));

    return raw ? JSON.parse(raw) : {};
  }

  public static async getMany<T = any>(workflowIds: string[]): Promise<T[]> {
    const keys = workflowIds.map(this.getKey);
    const values = await redis.mget(...keys);

    return values.map((value) => (value ? JSON.parse(value) : {}));
  }

  public static async set(
    workflowId: string,
    data: Record<string, any>
  ): Promise<void> {
    await redis.set(this.getKey(workflowId), JSON.stringify(data));
  }

  public static async update(
    workflowId: string,
    updates: Record<string, any>
  ): Promise<void> {
    const current = await this.get(workflowId);

    await this.set(workflowId, { ...current, ...updates });
  }

  public static async clear(workflowId: string): Promise<void> {
    await redis.del(this.getKey(workflowId));
  }

  public static async clearMany(workflowIds: string[]): Promise<void> {
    const keys = workflowIds.map(this.getKey);

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
