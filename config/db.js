const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
// Support both individual credentials and DATABASE_URL
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : {
        rejectUnauthorized: false,
      },
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      ssl: process.env.DB_SSL === 'false' ? false : {
        rejectUnauthorized: false,
      },
    };

// Add pool settings
poolConfig.max = parseInt(process.env.DB_POOL_MAX) || 20;
poolConfig.min = 2;
poolConfig.idleTimeoutMillis = 60000;
poolConfig.connectionTimeoutMillis = 10000;

const pool = new Pool(poolConfig);

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

// Helper function to execute queries
const query = (text, params) => {
  return pool.query(text, params);
};

// Helper function to get a client from the pool (for transactions)
const getClient = () => {
  return pool.connect();
};

module.exports = {
  pool,
  query,
  getClient,
};

