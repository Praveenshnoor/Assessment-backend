const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import configurations
const { pool } = require('./config/db');
// const { redisClient, cache } = require('./config/redis'); // DISABLED: Redis causing connection issues
require('./config/firebase'); // Initialize Firebase Admin SDK
const { logger, expressLogger } = require('./config/logger');

// Import routes
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const uploadRoutes = require('./routes/upload');
const studentRoutes = require('./routes/student');
const exportRoutes = require('./routes/export');
const testRoutes = require('./routes/test');
const healthRoutes = require('./routes/health');

// Import middleware
const { authLimiter, apiLimiter, submissionLimiter, proctoringLimiter } = require('./middleware/rateLimiter');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
    }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(expressLogger); // Structured logging with Pino

// Apply rate limiting
app.use('/api/auth', authLimiter); // Auth endpoints
app.use('/api/admin/auth', authLimiter); // Admin auth endpoints
app.use('/api/student/submit-exam', submissionLimiter); // Submission endpoints
app.use('/api/student/save-progress', submissionLimiter); // Progress save endpoints
app.use('/api', apiLimiter); // General API endpoints

// API Routes
app.use('/api', authRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/tests', testRoutes);

// Health monitoring routes
app.use('/', healthRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error({
        err,
        req: {
            method: req.method,
            url: req.url,
            headers: req.headers,
        }
    }, 'Global error handler');

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// Start server
server.listen(PORT, () => {
    logger.info({
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        pid: process.pid,
        nodeVersion: process.version,
    }, 'Server started successfully');
    
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API: http://localhost:${PORT}`);
    console.log(`🔌 Socket.io: Ready for proctoring connections`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
    console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
    
    // Signal PM2 that app is ready
    if (process.send) {
        process.send('ready');
    }
});

// Socket.io - Live Proctoring with Sample-Based Monitoring
const activeSessions = new Map(); // studentId -> { socketId, testId, studentName, startTime, isMonitored }
const adminSockets = new Set(); // Set of admin socket IDs
const monitoredStudents = new Set(); // Set of student IDs currently being monitored

// Proctoring configuration
const PROCTORING_CONFIG = {
    SAMPLE_RATE: parseFloat(process.env.PROCTORING_SAMPLE_RATE) || 0.15, // 15% of students
    FRAME_RATE: parseInt(process.env.PROCTORING_FRAME_RATE) || 2, // 2 FPS
    ROTATION_INTERVAL: parseInt(process.env.PROCTORING_ROTATION_MINUTES) || 5, // 5 minutes
    MIN_MONITORED: 5, // Minimum students to monitor
    MAX_MONITORED: 60, // Maximum students to monitor
};

/**
 * Select random students for monitoring based on sample rate
 * @param {number} totalStudents - Total number of active students
 * @returns {number} - Number of students to monitor
 */
function calculateMonitoredCount(totalStudents) {
    const calculated = Math.ceil(totalStudents * PROCTORING_CONFIG.SAMPLE_RATE);
    return Math.max(
        PROCTORING_CONFIG.MIN_MONITORED,
        Math.min(calculated, PROCTORING_CONFIG.MAX_MONITORED)
    );
}

/**
 * Randomly select students for monitoring
 */
function selectStudentsForMonitoring() {
    const allStudents = Array.from(activeSessions.keys());
    const monitorCount = calculateMonitoredCount(allStudents.length);
    
    // Clear previous selection
    monitoredStudents.clear();
    
    // Randomly select students
    const shuffled = allStudents.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, monitorCount);
    
    selected.forEach(studentId => {
        monitoredStudents.add(studentId);
        const session = activeSessions.get(studentId);
        if (session) {
            session.isMonitored = true;
        }
    });
    
    // Mark non-monitored students
    allStudents.forEach(studentId => {
        if (!monitoredStudents.has(studentId)) {
            const session = activeSessions.get(studentId);
            if (session) {
                session.isMonitored = false;
            }
        }
    });
    
    logger.info({
        totalStudents: allStudents.length,
        monitoredCount: selected.length,
        sampleRate: (selected.length/allStudents.length*100).toFixed(1) + '%'
    }, 'Proctoring monitoring pool updated');
    
    // Notify all students about their monitoring status
    allStudents.forEach(studentId => {
        const session = activeSessions.get(studentId);
        if (session && session.socketId) {
            io.to(session.socketId).emit('monitoring-status', {
                isMonitored: monitoredStudents.has(studentId),
                frameRate: PROCTORING_CONFIG.FRAME_RATE,
            });
        }
    });
    
    // Notify admins about monitoring pool update
    io.to('admin-room').emit('monitoring-pool-updated', {
        totalStudents: allStudents.length,
        monitoredCount: selected.length,
        monitoredStudents: selected,
        sampleRate: PROCTORING_CONFIG.SAMPLE_RATE,
        nextRotation: new Date(Date.now() + PROCTORING_CONFIG.ROTATION_INTERVAL * 60 * 1000),
    });
}

// Rotate monitored students every N minutes
let rotationInterval = setInterval(() => {
    if (activeSessions.size > 0) {
        logger.info('Rotating monitored students');
        selectStudentsForMonitoring();
    }
}, PROCTORING_CONFIG.ROTATION_INTERVAL * 60 * 1000);

io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Socket.io client connected');

    // Student joins proctoring session
    socket.on('student:join-proctoring', (data) => {
        const { studentId, studentName, testId, testTitle } = data;
        
        activeSessions.set(studentId, {
            socketId: socket.id,
            studentId,
            studentName,
            testId,
            testTitle,
            startTime: new Date(),
            isMonitored: false,
        });

        socket.join(`student-${studentId}`);
        socket.studentId = studentId;

        logger.info({ studentId, studentName, testId, testTitle }, 'Student joined proctoring');

        // Reselect monitored students when new student joins
        selectStudentsForMonitoring();

        // Notify all admins about new student
        io.to('admin-room').emit('student:joined', {
            studentId,
            studentName,
            testId,
            testTitle,
            startTime: new Date(),
            isMonitored: monitoredStudents.has(studentId),
        });
    });

    // Admin joins monitoring room
    socket.on('admin:join-monitoring', () => {
        socket.join('admin-room');
        adminSockets.add(socket.id);
        socket.isAdmin = true;

        logger.info({ socketId: socket.id }, 'Admin joined monitoring room');

        // Send list of active sessions to admin
        const sessions = Array.from(activeSessions.values()).map(session => ({
            studentId: session.studentId,
            studentName: session.studentName,
            testId: session.testId,
            testTitle: session.testTitle,
            startTime: session.startTime,
            isMonitored: session.isMonitored,
        }));

        socket.emit('active-sessions', sessions);
        
        // Send monitoring configuration
        socket.emit('monitoring-config', {
            sampleRate: PROCTORING_CONFIG.SAMPLE_RATE,
            frameRate: PROCTORING_CONFIG.FRAME_RATE,
            rotationInterval: PROCTORING_CONFIG.ROTATION_INTERVAL,
            totalStudents: activeSessions.size,
            monitoredCount: monitoredStudents.size,
        });
    });

    // Admin requests to refresh monitoring pool
    socket.on('admin:refresh-monitoring', () => {
        if (socket.isAdmin) {
            logger.info({ socketId: socket.id }, 'Admin requested monitoring pool refresh');
            selectStudentsForMonitoring();
        }
    });

    // Frame-based proctoring - Receive frame from student (ONLY if monitored)
    socket.on('proctoring:frame', (data) => {
        const { studentId, studentName, testId, testTitle, frame, timestamp } = data;
        
        // Only relay frames from monitored students
        if (monitoredStudents.has(studentId)) {
            // Relay frame to all admins in monitoring room
            io.to('admin-room').emit('proctoring:frame', {
                studentId,
                studentName,
                testId,
                testTitle,
                frame,
                timestamp,
            });
        }
    });

    // Student leaves proctoring
    socket.on('student:leave-proctoring', (data) => {
        if (data && data.studentId) {
            logger.info({ studentId: data.studentId, studentName: data.studentName }, 'Student leaving proctoring');
            
            // Notify admins
            io.to('admin-room').emit('student:left', {
                studentId: data.studentId,
                studentName: data.studentName,
            });

            // Clean up session
            if (activeSessions.has(data.studentId)) {
                activeSessions.delete(data.studentId);
            }
            
            monitoredStudents.delete(data.studentId);
            
            // Reselect monitored students after student leaves
            if (activeSessions.size > 0) {
                selectStudentsForMonitoring();
            }
        }
    });

    // Keepalive ping
    socket.on('ping', () => {
        socket.emit('pong');
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        logger.debug({ socketId: socket.id }, 'Socket.io client disconnected');

        if (socket.isAdmin) {
            adminSockets.delete(socket.id);
            logger.info({ socketId: socket.id }, 'Admin left monitoring room');
        } else if (socket.studentId) {
            const session = activeSessions.get(socket.studentId);
            if (session) {
                logger.info({ studentId: socket.studentId, studentName: session.studentName }, 'Student disconnected');
                
                // Notify admins
                io.to('admin-room').emit('student:left', {
                    studentId: socket.studentId,
                    studentName: session.studentName,
                });

                activeSessions.delete(socket.studentId);
            }
        }
    });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    logger.info({ signal }, 'Shutdown signal received, closing server gracefully');
    
    server.close(() => {
        logger.info('HTTP server closed');
        
        pool.end(() => {
            logger.info('Database pool closed');
            process.exit(0);
        });
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
