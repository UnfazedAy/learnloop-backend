import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST,
  PORT: process.env.PORT || 3000,
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  FRONTEND_PROD_URL: process.env.FRONTEND_PROD_URL!,
  FRONTEND_DEV_URL: process.env.FRONTEND_DEV_URL!
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY || !ENV.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration in .env');
}
