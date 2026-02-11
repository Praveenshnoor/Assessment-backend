/**
 * Health Monitoring Endpoints
 * Provides detailed health checks for load balancers and monitoring systems
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const os = require('os');

// Track server start time
const serverStartTime = Date.now();

/**
 * Basic health check - Fast response for load balancers
 * Returns 200 if server is running
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

/**
 * Detailed health check - Includes all system checks
 * Use for monitoring dashboards
 */
router.get('/health/detailed', async (req, res) => {
    const healthChecks = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        serverStartTime: new Date(serverStartTime).toISOString(),
        checks: {},
    };

    // 1. Database health
    try {
        const start = Date.now();
        const result = await pool.query('SELECT NOW()');
        const latency = Date.now() - start;
        
        healthChecks.checks.database = {
            status: 'healthy',
            latency: `${latency}ms`,
            timestamp: result.rows[0].now,
            poolSize: pool.totalCount,
            idleConnections: pool.idleCount,
            waitingClients: pool.waitingCount,
        };
    } catch (error) {
        healthChecks.status = 'unhealthy';
        healthChecks.checks.database = {
            status: 'unhealthy',
            error: error.message,
        };
    }

    // 2. Memory health
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    healthChecks.checks.memory = {
        status: memUsage.heapUsed < memUsage.heapTotal * 0.9 ? 'healthy' : 'warning',
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsagePercent: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`,
        systemTotal: `${Math.round(totalMem / 1024 / 1024)}MB`,
        systemUsed: `${Math.round(usedMem / 1024 / 1024)}MB`,
        systemFree: `${Math.round(freeMem / 1024 / 1024)}MB`,
    };

    // 3. CPU health
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    healthChecks.checks.cpu = {
        status: loadAvg[0] < cpus.length * 0.8 ? 'healthy' : 'warning',
        cores: cpus.length,
        model: cpus[0].model,
        loadAverage: {
            '1min': loadAvg[0].toFixed(2),
            '5min': loadAvg[1].toFixed(2),
            '15min': loadAvg[2].toFixed(2),
        },
    };

    // 4. Process health
    healthChecks.checks.process = {
        status: 'healthy',
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
    };

    // Overall status
    const allHealthy = Object.values(healthChecks.checks).every(
        check => check.status === 'healthy' || check.status === 'warning'
    );
    
    if (!allHealthy) {
        healthChecks.status = 'unhealthy';
    }

    const statusCode = healthChecks.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthChecks);
});

/**
 * Database-only health check
 * Fast check for database connectivity
 */
router.get('/health/db', async (req, res) => {
    try {
        const start = Date.now();
        const result = await pool.query('SELECT NOW()');
        const latency = Date.now() - start;
        
        res.status(200).json({
            status: 'healthy',
            latency: `${latency}ms`,
            timestamp: result.rows[0].now,
            poolSize: pool.totalCount,
            idleConnections: pool.idleCount,
            waitingClients: pool.waitingCount,
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});

/**
 * Readiness check - For Kubernetes/container orchestration
 * Returns 200 when server is ready to accept traffic
 */
router.get('/health/ready', async (req, res) => {
    try {
        // Check database connectivity
        await pool.query('SELECT 1');
        
        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'not_ready',
            error: error.message,
        });
    }
});

/**
 * Liveness check - For Kubernetes/container orchestration
 * Returns 200 if server process is alive
 */
router.get('/health/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

/**
 * Metrics endpoint - Prometheus-compatible metrics
 */
router.get('/metrics', async (req, res) => {
    const metrics = [];
    
    // Uptime
    metrics.push(`# HELP process_uptime_seconds Process uptime in seconds`);
    metrics.push(`# TYPE process_uptime_seconds gauge`);
    metrics.push(`process_uptime_seconds ${process.uptime()}`);
    
    // Memory
    const memUsage = process.memoryUsage();
    metrics.push(`# HELP process_heap_bytes Process heap size in bytes`);
    metrics.push(`# TYPE process_heap_bytes gauge`);
    metrics.push(`process_heap_bytes{type="used"} ${memUsage.heapUsed}`);
    metrics.push(`process_heap_bytes{type="total"} ${memUsage.heapTotal}`);
    
    // Database pool
    metrics.push(`# HELP db_pool_connections Database pool connections`);
    metrics.push(`# TYPE db_pool_connections gauge`);
    metrics.push(`db_pool_connections{state="total"} ${pool.totalCount}`);
    metrics.push(`db_pool_connections{state="idle"} ${pool.idleCount}`);
    metrics.push(`db_pool_connections{state="waiting"} ${pool.waitingCount}`);
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics.join('\n'));
});

module.exports = router;
