declare namespace NodeJS {
  interface ProcessEnv {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    REDIS_HOST: string;
    REDIS_USER: string;
    REDIS_PASSWORD: string;
    REDIS_PORT: number;
    WEBHOOK_URL: string;
  }
}
