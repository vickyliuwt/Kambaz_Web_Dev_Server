// Kambaz-node-server-app/index.js
// main server file - UPDATED TO INCLUDE GRADING WEIGHTS ROUTES

import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import mongoose from "mongoose";

// import routes
import Hello from "./Hello.js";
import Lab5 from "./Lab5/index.js";
import UserRoutes from "./Kambaz/Users/routes.js";
import CourseRoutes from "./Kambaz/Courses/routes.js";
import ModuleRoutes from "./Kambaz/Modules/routes.js";
import AssignmentRoutes from "./Kambaz/Assignments/routes.js";
import EnrollmentRoutes from "./Kambaz/Enrollments/routes.js";
import PeopleRoutes from "./Kambaz/People/routes.js";
import QuizRoutes from "./Kambaz/Quizzes/routes.js";
import GradeRoutes from "./Kambaz/Grades/routes.js";
import GradingWeightsRoutes from "./Kambaz/GradingWeights/routes.js";

const app = express();

// mongodb connection
const CONNECTION_STRING =
    process.env.DATABASE_CONNECTION_STRING ||
    "mongodb://127.0.0.1:27017/kambaz";

console.log("\n" + "=".repeat(80));
console.log("🔗 connecting to mongodb");
console.log("=".repeat(80));
console.log("");

try {
    await mongoose.connect(CONNECTION_STRING);
    console.log("✅ connected to mongodb");
} catch (error) {
    console.error("❌ mongodb connection failed:", error.message);
    process.exit(1);
}

// enable query logging in dev
if (process.env.SERVER_ENV === "development") {
    mongoose.set('debug', (collectionName, method, query, doc) => {
        console.log(`🔍 mongodb query: ${collectionName}.${method}`, JSON.stringify(query));
    });
}

// middleware setup
app.set('etag', false);
app.disable('x-powered-by');

// cors config
app.use(
    cors({
        credentials: true,
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "Cache-Control",
            "Pragma",
            "Expires"
        ],
        exposedHeaders: ["set-cookie"]
    })
);

console.log("✅ cors configured");
console.log("   origin: " + (process.env.CLIENT_URL || "http://localhost:3000"));
console.log("   headers: content-type, authorization, cache-control, pragma, expires");
console.log("");

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// disable cache on api routes
app.use('/api', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    });

    res.removeHeader('ETag');

    next();
});

console.log("✅ cache disabled on /api");
console.log("");

// session setup
const sessionOptions = {
    secret: process.env.SESSION_SECRET || "kambaz_super_secret_2025",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    }
};

// production settings
if (process.env.SERVER_ENV === "production") {
    console.log("🔧 production mode");
    console.log("   (for vercel → render)");

    sessionOptions.proxy = true;
    sessionOptions.cookie.sameSite = "none";
    sessionOptions.cookie.secure = true;

    if (process.env.SERVER_URL) {
        const domain = process.env.SERVER_URL.replace(/^https?:\/\//, '');
        sessionOptions.cookie.domain = domain;
        console.log(`   🍪 cookie domain: ${domain}`);
    }

    console.log("   ✅ production configured");
    console.log("");
}

app.use(session(sessionOptions));

console.log("✅ session configured");
console.log(`   duration: ${sessionOptions.cookie.maxAge / 1000 / 60} min`);
console.log(`   secure: ${sessionOptions.cookie.secure || false}`);
console.log("");

// request logging in dev
if (process.env.SERVER_ENV === "development") {
    app.use((req, res, next) => {
        const timestamp = new Date().toLocaleString();

        console.log(`\n${"=".repeat(80)}`);
        console.log(`📨 [${timestamp}] ${req.method} ${req.url}`);

        if (req.session?.currentUser) {
            console.log(`    user: ${req.session.currentUser.username} (${req.session.currentUser.role})`);
            console.log(`    user id: ${req.session.currentUser._id}`);
            console.log(`    session: ${req.sessionID.substring(0, 10)}...`);
        } else {
            console.log(`    user: not authenticated`);
        }

        if ((req.method === 'POST' || req.method === 'PUT') && Object.keys(req.body || {}).length > 0) {
            const bodyStr = JSON.stringify(req.body, null, 2);
            console.log(`    body:`, bodyStr.substring(0, 200) + (bodyStr.length > 200 ? '...' : ''));
        }

        if (Object.keys(req.query || {}).length > 0) {
            console.log(`    query:`, req.query);
        }

        console.log(`${"=".repeat(80)}`);
        next();
    });

    console.log("✅ request logging enabled");
    console.log("");
}

// register routes
console.log("");
console.log("📋 registering routes");
console.log("=".repeat(80));
console.log("");

Hello(app);
Lab5(app);

UserRoutes(app);
CourseRoutes(app);
ModuleRoutes(app);
AssignmentRoutes(app);
EnrollmentRoutes(app);
PeopleRoutes(app);
QuizRoutes(app);
GradeRoutes(app);
GradingWeightsRoutes(app);

console.log("");
console.log("✅ all routes registered");
console.log("=".repeat(80));
console.log("");

// health check
app.get("/api/health", (req, res) => {
    const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: {
            connected: mongoose.connection.readyState === 1,
            state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
            host: mongoose.connection.host || 'Unknown',
            name: mongoose.connection.name || 'Unknown',
            collections: mongoose.connection.db ?
                Object.keys(mongoose.connection.collections).join(', ') : 'Not loaded yet'
        },
        server: {
            environment: process.env.SERVER_ENV || 'development',
            port: process.env.PORT || 4000,
            uptime: process.uptime() + ' seconds',
            nodeVersion: process.version
        },
        session: {
            configured: !!req.session,
            hasUser: !!req.session?.currentUser,
            sessionId: req.session?.id?.substring(0, 10) || 'None'
        },
        cors: {
            allowedOrigin: process.env.CLIENT_URL || "http://localhost:3000",
            credentialsEnabled: true
        }
    };

    res.json(healthStatus);
});

// database stats
app.get("/api/stats", async (req, res) => {
    try {
        if (!req.session?.currentUser || req.session.currentUser.role !== "ADMIN") {
            res.status(403).json({ message: "Admin access required" });
            return;
        }

        const stats = {
            timestamp: new Date().toISOString(),
            database: mongoose.connection.name,
            collections: {
                users: await mongoose.connection.db.collection('users').countDocuments(),
                courses: await mongoose.connection.db.collection('courses').countDocuments(),
                modules: await mongoose.connection.db.collection('modules').countDocuments(),
                assignments: await mongoose.connection.db.collection('assignments').countDocuments(),
                enrollments: await mongoose.connection.db.collection('enrollments').countDocuments(),
                quizzes: await mongoose.connection.db.collection('quizzes').countDocuments(),
                grades: await mongoose.connection.db.collection('grades').countDocuments(),
                gradingweights: await mongoose.connection.db.collection('gradingweights').countDocuments()
            }
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({
            message: "Error retrieving stats",
            error: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    console.log(`⚠️ 404 not found: ${req.method} ${req.url}`);

    res.status(404).json({
        error: true,
        message: `Route ${req.method} ${req.url} not found`,
        availableEndpoints: {
            health: "/api/health - Check server status",
            users: "/api/users - User management",
            courses: "/api/courses - Course management",
            modules: "/api/modules - Module operations",
            assignments: "/api/assignments - Assignment operations",
            enrollments: "/api/enrollments - Enrollment operations",
            people: "/api/people - People operations",
            quizzes: "/api/quizzes - Quiz operations",
            grades: "/api/grades - Grade operations",
            weights: "/api/courses/:courseId/weights - Grading weights"
        },
        tip: "Visit /api/health to verify server is running correctly"
    });
});

// error handler
app.use((err, req, res, next) => {
    console.error("\n" + "!".repeat(80));
    console.error("❌ error occurred");
    console.error("!".repeat(80));
    console.error(`   🌐 url: ${req.method} ${req.url}`);
    console.error(`   ⚠️ message: ${err.message}`);
    console.error(`   📊 status: ${err.statusCode || 500}`);

    if (req.session?.currentUser) {
        console.error(`   👤 user: ${req.session.currentUser.username}`);
    }

    console.error("");
    console.error("📜 stack:");
    console.error(err.stack);
    console.error("!".repeat(80) + "\n");

    res.status(err.statusCode || 500).json({
        error: true,
        message: err.message || "Internal server error",
        ...(process.env.SERVER_ENV === 'development' && {
            stack: err.stack,
            details: err
        })
    });
});

// start server
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log("");
    console.log("=".repeat(80));
    console.log("🚀 server started");
    console.log("=".repeat(80));
    console.log("");

    console.log("📊 config:");
    console.log(`    port: ${PORT}`);
    console.log(`    environment: ${process.env.SERVER_ENV || "development"}`);
    console.log(`    client: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
    console.log(`    session: ${(process.env.SESSION_SECRET || "default").substring(0, 10)}***`);
    console.log(`    etag: disabled`);
    console.log(`    cache: disabled on /api`);
    console.log(`    session: ${sessionOptions.cookie.maxAge / 1000 / 60} min`);
    console.log(`    secure: ${sessionOptions.cookie.secure ? 'https only' : 'http/https'}`);
    console.log(`    cors: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
    console.log("");

    console.log("=".repeat(80));
    console.log("📋 endpoints:");
    console.log("=".repeat(80));
    console.log("");

    console.log("🏥 testing:");
    console.log(`   GET    http://localhost:${PORT}/hello`);
    console.log(`   GET    http://localhost:${PORT}/api/health`);
    console.log(`   GET    http://localhost:${PORT}/api/stats`);
    console.log("");

    console.log("=".repeat(80));
    console.log("✅ server ready");
    console.log("=".repeat(80));
    console.log("");

});

// graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 shutting down...');

    try {
        await mongoose.connection.close();
        console.log('✅ mongodb closed');

        console.log('✅ server stopped');
        process.exit(0);
    } catch (error) {
        console.error(' error during shutdown:', error);
        process.exit(1);
    }
});

// handle errors
process.on('uncaughtException', (error) => {
    console.error('\n\n uncaught exception:');
    console.error('='.repeat(80));
    console.error(error);
    console.error('='.repeat(80));
    console.error('\n server will exit\n');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n\n unhandled rejection:');
    console.error('='.repeat(80));
    console.error('   at:', promise);
    console.error('   reason:', reason);
    console.error('='.repeat(80));
    console.error('\n fix async/await errors\n');
});