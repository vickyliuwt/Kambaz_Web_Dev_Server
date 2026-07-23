// Kambaz/middleware.js
// Custom middleware for logging and error handling
// Helps debug A6 requirements

// Request logging middleware
// Logs every API request for debugging
export const requestLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;

    console.log(`\n${"=".repeat(70)}`);
    console.log(`📨 [${timestamp}] ${method} ${url}`);

    // Log session info if available
    if (req.session && req.session.currentUser) {
        console.log(`   👤 User: ${req.session.currentUser.username} (${req.session.currentUser.role})`);
    } else {
        console.log(`   👤 User: Not authenticated`);
    }

    // Log request body for POST/PUT
    if ((method === 'POST' || method === 'PUT') && Object.keys(req.body).length > 0) {
        console.log(`   📦 Body:`, JSON.stringify(req.body, null, 2));
    }

    // Log query parameters
    if (Object.keys(req.query).length > 0) {
        console.log(`   🔍 Query:`, req.query);
    }

    console.log(`${"=".repeat(70)}`);

    next();
};

// Error handling middleware
// Catches errors and sends proper responses
export const errorHandler = (err, req, res, next) => {
    console.error(`\n${"!".repeat(70)}`);
    console.error(`❌ ERROR OCCURRED`);
    console.error(`${"!".repeat(70)}`);
    console.error(`   URL: ${req.method} ${req.url}`);
    console.error(`   Error: ${err.message}`);
    console.error(`   Stack:`, err.stack);
    console.error(`${"!".repeat(70)}\n`);

    // Determine status code
    const statusCode = err.statusCode || 500;

    // Send error response
    res.status(statusCode).json({
        error: true,
        message: err.message || "Internal server error",
        ...(process.env.SERVER_ENV === 'development' && { stack: err.stack })
    });
};

// Session check middleware
// Protects routes that require authentication
export const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.currentUser) {
        console.log(`   🚫 Access denied - No active session`);
        return res.status(401).json({
            error: true,
            message: "Authentication required"
        });
    }

    console.log(`   ✓ Authenticated as: ${req.session.currentUser.username}`);
    next();
};

// Role check middleware
// Protects routes that require specific roles
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.currentUser) {
            console.log(`   🚫 Access denied - No active session`);
            return res.status(401).json({
                error: true,
                message: "Authentication required"
            });
        }

        const userRole = req.session.currentUser.role;

        if (!allowedRoles.includes(userRole)) {
            console.log(`   🚫 Access denied - Role ${userRole} not authorized`);
            console.log(`      Allowed roles: ${allowedRoles.join(', ')}`);
            return res.status(403).json({
                error: true,
                message: "Insufficient permissions"
            });
        }

        console.log(`   ✓ Role authorized: ${userRole}`);
        next();
    };
};

// Database connection check middleware
// Ensures MongoDB is connected before processing requests
export const checkDatabaseConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        console.error(`   ❌ Database not connected`);
        return res.status(503).json({
            error: true,
            message: "Database unavailable"
        });
    }
    next();
};

import mongoose from "mongoose";

// Export all middleware
export default {
    requestLogger,
    errorHandler,
    requireAuth,
    requireRole,
    checkDatabaseConnection
};