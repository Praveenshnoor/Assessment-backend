const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  // Connection pool settings - Optimized for 300+ concurrent users
  max: parseInt(process.env.DB_POOL_MAX) || 100, // Maximum number of clients in the pool
  min: 10, // Minimum number of clients to keep in the pool
  idleTimeoutMillis: 60000, // How long a client is allowed to remain idle before being closed (60s)
  connectionTimeoutMillis: 5000, // How long to wait for a connection (5s)
  maxUses: 7500, // Close connections after 7500 uses to prevent memory leaks
  allowExitOnIdle: false, // Keep pool alive even when idle
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
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
