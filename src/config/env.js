import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

export function getConfig() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    env: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: process.env.DATABASE_URL ?? 'mysql://root:root@localhost:3306/bookverse',
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'test-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret',
    refreshTtlDays: 30,
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173'
  };
}
