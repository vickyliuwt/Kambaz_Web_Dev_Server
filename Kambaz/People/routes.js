// Kambaz/People/routes.js
// user API endpoints

import * as peopleDao from "./dao.js";
import courseModel from "../Courses/model.js";
import enrollmentModel from "../Enrollments/model.js";

export default function PeopleRoutes(app) {

    console.log("🔧 setting up people routes");

    // get course roster
    const findUsersForCourse = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            const { courseId } = req.params;

            console.log(`📋 get roster for: ${courseId}`);

            const users = await peopleDao.findUsersForCourse(courseId);

            console.log(`✅ got ${users.length} users`);
            res.json(users);

        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to get course roster from MongoDB",
                error: error.message
            });
        }
    };

    // create user and enroll
    const createUserForCourse = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { courseId } = req.params;
            const userData = req.body;

            console.log(`👤 create user for: ${courseId}`);
            console.log(`   username: ${userData.username}`);
            console.log(`   role: ${userData.role || 'STUDENT'}`);

            // validate
            if (!userData.username || !userData.password) {
                console.log(`⚠️ missing fields`);
                res.status(400).json({
                    message: "Username and password are required"
                });
                return;
            }

            if (!userData.firstName || !userData.lastName) {
                console.log(`⚠️ missing names`);
                res.status(400).json({
                    message: "First name and last name are required"
                });
                return;
            }

            // check duplicate
            const existingUser = await peopleDao.findUserByUsername(userData.username);
            if (existingUser) {
                console.log(`⚠️ username '${userData.username}' taken`);
                res.status(400).json({
                    message: "Username already in use, pick a different one"
                });
                return;
            }

            // create
            const newUser = await peopleDao.createUserForCourse(userData, courseId);

            console.log(`✅ created and enrolled`);
            console.log(`   id: ${newUser._id}`);

            const safeUser = { ...newUser._doc };
            delete safeUser.password;

            res.status(201).json(safeUser);

        } catch (error) {
            console.error("❌ error:", error);

            if (error.message.includes("already in use")) {
                res.status(400).json({ message: error.message });
            } else if (error.message.includes("required")) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({
                    message: "Failed to create user in MongoDB",
                    error: error.message
                });
            }
        }
    };

    // get user by id
    const findUserById = async (req, res) => {
        try {
            const { userId } = req.params;

            console.log(`🔍 get user: ${userId}`);

            const user = await peopleDao.findUserById(userId);

            if (!user) {
                console.log(`⚠️ not found: ${userId}`);
                res.status(404).json({
                    message: "User not found in MongoDB",
                    userId: userId
                });
                return;
            }

            console.log(`✅ found: ${user.username}`);
            const safeUser = { ...user._doc };
            delete safeUser.password;

            res.json(safeUser);

        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to get user from MongoDB",
                error: error.message
            });
        }
    };

    // update user
    const updateUser = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { userId } = req.params;
            const userUpdates = req.body;

            console.log(`✏️ update: ${userId}`);
            console.log(`   fields: ${Object.keys(userUpdates).join(', ')}`);

            const updatedUser = await peopleDao.updateUser(userId, userUpdates);

            if (!updatedUser) {
                console.log(`⚠️ not found: ${userId}`);
                res.status(404).json({
                    message: "User not found in MongoDB"
                });
                return;
            }

            console.log(`✅ updated`);

            const safeUser = { ...updatedUser._doc };
            delete safeUser.password;

            res.json(safeUser);

        } catch (error) {
            console.error("❌ error:", error);

            if (error.message.includes("already in use")) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({
                    message: "Failed to update user in MongoDB",
                    error: error.message
                });
            }
        }
    };

    // delete user
    const deleteUser = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { userId } = req.params;

            console.log(`🗑️ delete: ${userId}`);

            const status = await peopleDao.deleteUser(userId);

            console.log(`✅ deleted`);
            console.log(`   enrollments: ${status.deletedEnrollments || 0}`);

            res.json(status);

        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to delete user from MongoDB",
                error: error.message
            });
        }
    };

    // create with multiple enrollments
    const createUserWithCourses = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { user, courseIds } = req.body;

            console.log(`👤 create with enrollments`);
            console.log(`   username: ${user.username}`);
            console.log(`   courses: ${courseIds?.length || 0}`);

            // validate
            if (!user.username || !user.password) {
                res.status(400).json({
                    message: "Username and password required"
                });
                return;
            }

            if (!user.firstName || !user.lastName) {
                res.status(400).json({
                    message: "First name and last name required"
                });
                return;
            }

            // create
            const result = await peopleDao.createUserWithEnrollments(user, courseIds || []);

            console.log(`✅ created with ${result.enrollments.length} enrollments`);

            const safeUser = { ...result.user._doc };
            delete safeUser.password;

            res.status(201).json({
                user: safeUser,
                enrollments: result.enrollments
            });

        } catch (error) {
            console.error("❌ error:", error);

            if (error.message.includes("already in use")) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({
                    message: "Failed to create user",
                    error: error.message
                });
            }
        }
    };

    // update enrollments
    const updateUserEnrollments = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { userId } = req.params;
            const { courseIds } = req.body;

            console.log(`📄 update enrollments for ${userId}`);
            console.log(`   target: ${courseIds?.length || 0} courses`);

            if (!Array.isArray(courseIds)) {
                res.status(400).json({
                    message: "courseIds must be an array"
                });
                return;
            }

            const enrollments = await peopleDao.updateUserEnrollments(userId, courseIds);

            console.log(`✅ updated: ${enrollments.length} total`);

            res.json({ enrollments });

        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to update enrollments",
                error: error.message
            });
        }
    };

    // get user's courses
    const getUserCourses = async (req, res) => {
        try {
            const { userId } = req.params;

            console.log(`📚 get courses for ${userId}`);

            const courses = await peopleDao.getUserEnrolledCourses(userId);

            console.log(`✅ returning ${courses.length} courses`);

            if (courses.length > 0) {
                console.log(`   ids:`, courses.map(c => c._id));
                console.log(`   numbers:`, courses.map(c => c.number));
            }

            res.json(courses);

        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to get user courses",
                error: error.message
            });
        }
    };

    // get all available courses
    const getAllCourses = async (req, res) => {
        try {
            console.log("\n📚 get all courses");
            console.log("   database: kambaz");
            console.log("   collection: courses");

            const courses = await courseModel.find().sort({ number: 1 });

            console.log(`   ✅ found ${courses.length} courses`);

            if (courses.length > 0) {
                console.log(`   sample:`);
                courses.slice(0, 5).forEach(course => {
                    console.log(`      - ${course.number}: ${course.name} (${course._id})`);
                });
            } else {
                console.warn(`   ⚠️ no courses in database`);
                console.warn(`   run: node Kambaz/Database/seed.js`);
            }

            res.json(courses);
            console.log(`   📤 sent ${courses.length} courses\n`);

        } catch (error) {
            console.error("\n❌ error:");
            console.error("   message:", error.message);
            console.error("   stack:", error.stack);

            res.status(500).json({
                message: "Failed to get courses from MongoDB",
                error: error.message
            });
        }
    };

    // get stats
    const getUserStatsByCourse = async (req, res) => {
        try {
            const { courseId } = req.params;

            console.log(`📊 get stats: ${courseId}`);

            const stats = await peopleDao.getUserStatsByCourse(courseId);

            if (!stats) {
                console.log(`⚠️ not found: ${courseId}`);
                res.status(404).json({
                    message: "Course not found in MongoDB"
                });
                return;
            }

            console.log(`✅ got stats`);
            res.json(stats);

        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to get statistics from MongoDB",
                error: error.message
            });
        }
    };

    // search users
    const searchUsersInCourse = async (req, res) => {
        try {
            const { courseId } = req.params;
            const { query } = req.query;

            console.log(`🔍 search: course ${courseId}, query "${query}"`);

            const users = await peopleDao.searchUsersInCourse(courseId, query);

            console.log(`✅ found ${users.length} matching`);
            res.json(users);

        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to search users in MongoDB",
                error: error.message
            });
        }
    };

    // register routes
    console.log("📌 registering routes");

    // available courses first
    app.get("/api/people/available-courses", getAllCourses);
    console.log("   ✅ GET  /api/people/available-courses");

    // individual user
    app.get("/api/people/:userId", findUserById);
    console.log("   ✅ GET  /api/people/:userId");

    app.put("/api/people/:userId", updateUser);
    console.log("   ✅ PUT  /api/people/:userId");

    app.delete("/api/people/:userId", deleteUser);
    console.log("   ✅ DEL  /api/people/:userId");

    // enrollment management
    app.post("/api/people/create-with-courses", createUserWithCourses);
    console.log("   ✅ POST /api/people/create-with-courses");

    app.put("/api/people/:userId/enrollments", updateUserEnrollments);
    console.log("   ✅ PUT  /api/people/:userId/enrollments");

    app.get("/api/people/:userId/courses", getUserCourses);
    console.log("   ✅ GET  /api/people/:userId/courses");

    // stats and search
    app.get("/api/courses/:courseId/people/stats", getUserStatsByCourse);
    console.log("   ✅ GET  /api/courses/:courseId/people/stats");

    app.get("/api/courses/:courseId/people/search", searchUsersInCourse);
    console.log("   ✅ GET  /api/courses/:courseId/people/search");

    // course roster
    app.get("/api/courses/:courseId/people", findUsersForCourse);
    console.log("   ✅ GET  /api/courses/:courseId/people");

    app.post("/api/courses/:courseId/people", createUserForCourse);
    console.log("   ✅ POST /api/courses/:courseId/people");

    console.log("\n✅ people routes registered");
    console.log("");
    console.log("📋 endpoints:");
    console.log("   GET    /api/people/available-courses");
    console.log("   GET    /api/people/:userId");
    console.log("   PUT    /api/people/:userId");
    console.log("   DELETE /api/people/:userId");
    console.log("   POST   /api/people/create-with-courses");
    console.log("   PUT    /api/people/:userId/enrollments");
    console.log("   GET    /api/people/:userId/courses");
    console.log("   GET    /api/courses/:courseId/people");
    console.log("   POST   /api/courses/:courseId/people");
    console.log("   GET    /api/courses/:courseId/people/stats");
    console.log("   GET    /api/courses/:courseId/people/search");
    console.log("");
}