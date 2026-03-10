const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const verifyAdmin = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers['authorization'];
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Invalid token format.',
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
        
        // Ensure it's an admin token
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.',
            });
        }

        // Verify admin still exists in database
        const adminResult = await query(
            'SELECT id, email, full_name FROM admins WHERE id = $1',
            [decoded.id]
        );

        if (adminResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Admin account not found.',
            });
        }

        // Add admin info to request
        req.admin = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            adminData: adminResult.rows[0]
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Token has expired.',
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Access denied. Invalid token.',
            });
        }

        console.error('[VERIFY ADMIN] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authentication.',
        });
    }
};

module.exports = verifyAdmin;
