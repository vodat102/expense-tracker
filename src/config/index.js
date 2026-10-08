const isProduction = process.env.NODE_ENV === 'production';

function requireEnv(key, defaultValue) {
  const value = process.env[key];
  if (!value && isProduction) {
    throw new Error(`[Config] Missing required env var: ${key}`);
  }
  return value || defaultValue;
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: requireEnv('JWT_SECRET', 'expense-tracker-dev-secret'),
  nodeEnv: process.env.NODE_ENV || 'development'
};
