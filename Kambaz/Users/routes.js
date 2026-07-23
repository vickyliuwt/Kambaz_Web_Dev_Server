// Kambaz/Users/routes.js
// user API endpoints

import * as dao from "./dao.js";
import * as courseDao from "../Courses/dao.js";
import * as enrollmentsDao from "../Enrollments/dao.js";

export default function UserRoutes(app) {

    // signup
    const signup = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            });

            console.log("   🔐 signup request");
            console.log(`      username: ${req.body.username}`);
            console.log(`      role: ${req.body.role || 'STUDENT'}`);

            const { username, password } = req.body;

            if (!username || !password) {
                console.log("      ❌ missing credentials");
                res.status(400).json({
                    message: "Username and password are required"
                });
                return;
            }

            const validation = dao.validateUserData(req.body);
            if (!validation.isValid) {
                console.log("      ❌ validation failed:", validation.errors);
                res.status(400).json({
                    message: "Validation failed",
                    errors: validation.errors
                });
                return;
            }

            const existingUser = await dao.findUserByUsername(username);
            if (existingUser) {
                console.log(`      ❌ username '${username}' taken`);
                res.status(400).json({
                    message: "Username already in use. Please choose a different username."
                });
                return;
            }

            const currentUser = await dao.createUser(req.body);

            req.session["currentUser"] = currentUser;

            console.log(`   ✅ signed up: ${currentUser.username}`);
            console.log(`      session id: ${req.sessionID}`);
            console.log(`      role: ${currentUser.role}`);

            const safeUser = { ...currentUser._doc };
            delete safeUser.password;

            res.json(safeUser);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to create account. Please try again.",
                error: error.message
            });
        }
    };

    // signin
    const signin = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            });

            console.log("   🔐 signin request");
            console.log(`      username: ${req.body.username}`);

            const { username, password } = req.body;

            if (!username || !password) {
                console.log("      ❌ missing credentials");
                res.status(400).json({
                    message: "Username and password are required"
                });
                return;
            }

            const currentUser = await dao.findUserByCredentials(username, password);

            if (currentUser) {
                req.session["currentUser"] = currentUser;

                console.log(`   ✅ signed in: ${currentUser.username}`);
                console.log(`      session id: ${req.sessionID}`);
                console.log(`      role: ${currentUser.role}`);
                console.log(`      user id: ${currentUser._id}`);

                const safeUser = { ...currentUser._doc };
                delete safeUser.password;

                res.json(safeUser);
            } else {
                console.log(`   ❌ login failed: ${username}`);

                res.status(401).json({
                    message: "Invalid username or password"
                });
            }
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Unable to login. Try again later.",
                error: error.message
            });
        }
    };

    // signout
    const signout = async (req, res) => {
        try {
            const currentUser = req.session["currentUser"];
            const username = currentUser?.username || "unknown";

            console.log(`   🚪 signout: ${username}`);

            req.session.destroy((err) => {
                if (err) {
                    console.error("   ❌ error destroying session:", err);
                    res.status(500).json({
                        message: "Error signing out"
                    });
                    return;
                }

                console.log(`   👋 signed out: ${username}`);
                console.log(`      session destroyed`);

                res.sendStatus(200);
            });
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Error signing out",
                error: error.message
            });
        }
    };

    // get profile
    const profile = async (req, res) => {
        try {
            const currentUser = req.session["currentUser"];

            if (!currentUser) {
                console.log("   ⚠️  no session");
                res.sendStatus(401);
                return;
            }

            console.log(`   👤 profile: ${currentUser.username}`);
            console.log(`      session id: ${req.sessionID}`);
            console.log(`      role: ${currentUser.role}`);

            const safeUser = { ...currentUser };
            delete safeUser.password;

            res.json(safeUser);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve profile",
                error: error.message
            });
        }
    };

    // create user
    const createUser = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            console.log("   ➕ create user");
            console.log(`      username: ${req.body.username}`);
            console.log(`      role: ${req.body.role || 'STUDENT'}`);

            const validation = dao.validateUserData(req.body);
            if (!validation.isValid) {
                console.log("      ❌ validation errors:", validation.errors);
                res.status(400).json({
                    message: "Validation failed",
                    errors: validation.errors
                });
                return;
            }

            const user = await dao.createUser(req.body);

            console.log(`   ✅ created: ${user.username}`);
            console.log(`      id: ${user._id}`);
            console.log(`   💡 reload to confirm`);

            const safeUser = { ...user._doc };
            delete safeUser.password;

            res.status(201).json(safeUser);
        } catch (error) {
            console.error("   ❌ error:", error);

            if (error.message.includes("already in use")) {
                res.status(400).json({ message: error.message });
            } else if (error.message.includes("required")) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({
                    message: "Failed to create user",
                    error: error.message
                });
            }
        }
    };

    // get all users
    const findAllUsers = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.removeHeader('ETag');

            const { role, name, section } = req.query;

            console.log(`   🔍 find users`);
            console.log(`      filters: role=${role || 'none'}, name=${name || 'none'}, section=${section || 'none'}`);

            // filter by role
            if (role) {
                const users = await dao.findUsersByRole(role);
                console.log(`   ✅ returning ${users.length} users with role ${role}`);
                res.json(users);
                return;
            }

            // filter by name
            if (name) {
                const users = await dao.findUsersByPartialName(name);
                console.log(`   ✅ returning ${users.length} matching '${name}'`);
                res.json(users);
                return;
            }

            // filter by section
            if (section) {
                const users = await dao.findUsersBySection(section);
                console.log(`   ✅ returning ${users.length} in section ${section}`);
                res.json(users);
                return;
            }

            // no filters
            const users = await dao.findAllUsers();

            console.log(`   ✅ returning all ${users.length} users`);

            res.json(users);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve users",
                error: error.message
            });
        }
    };

    // get user by id
    const findUserById = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { userId } = req.params;

            console.log(`   🔎 find user: ${userId}`);

            const user = await dao.findUserById(userId);

            if (!user) {
                console.log(`      ⚠️  not found`);
                res.status(404).json({
                    message: "User not found",
                    userId: userId
                });
                return;
            }

            console.log(`   ✅ found: ${user.username}`);

            // FIXED: Keep password in response so it can be edited in the UI
            // For editing users, we need to show the password field populated
            const userResponse = { ...user._doc };

            res.json(userResponse);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve user",
                error: error.message
            });
        }
    };

    // update user
    const updateUser = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'Pragma': 'no-cache'
            });

            const { userId } = req.params;
            const userUpdates = req.body;

            console.log(`   ✏️  update user: ${userId}`);
            console.log(`      fields: ${Object.keys(userUpdates).join(', ')}`);

            if (userUpdates.firstName || userUpdates.lastName) {
                console.log(`      new name: ${userUpdates.firstName || '?'} ${userUpdates.lastName || '?'}`);
            }

            const updatedUser = await dao.updateUser(userId, userUpdates);

            if (!updatedUser) {
                console.log(`      ⚠️  not found`);
                res.status(404).json({ message: "User not found" });
                return;
            }

            // update session if editing self
            const currentUser = req.session["currentUser"];
            if (currentUser && currentUser._id === userId) {
                req.session["currentUser"] = { ...currentUser, ...updatedUser._doc };
                console.log(`   🔄 session updated: ${updatedUser.username}`);
            }

            console.log(`   ✅ updated`);
            console.log(`   💡 reload to confirm`);

            // FIXED: Keep password in response so it stays populated in the edit form
            const userResponse = { ...updatedUser._doc };

            res.json(userResponse);
        } catch (error) {
            console.error("   ❌ error:", error);

            if (error.message.includes("already in use")) {
                res.status(400).json({ message: error.message });
            } else if (error.message.includes("required")) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({
                    message: "Failed to update user",
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

            console.log(`   🗑️  delete user: ${userId}`);

            // prevent self-delete
            const currentUser = req.session["currentUser"];
            if (currentUser && currentUser._id === userId) {
                console.log(`      ❌ cannot delete own account`);
                res.status(400).json({
                    message: "Cannot delete your own account while logged in. Please signout first."
                });
                return;
            }

            const result = await dao.deleteUser(userId);

            console.log(`   ✅ deleted`);
            console.log(`      user: ${result.username || 'unknown'}`);
            console.log(`      enrollments: ${result.deletedEnrollments}`);
            console.log(`   💡 reload to confirm`);

            res.json(result);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to delete user",
                error: error.message
            });
        }
    };

    // get user's courses
    const findCoursesForEnrolledUser = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.removeHeader('ETag');

            let { userId } = req.params;

            console.log(`   📚 find courses for: ${userId}`);

            // handle "current"
            if (userId === "current") {
                const currentUser = req.session["currentUser"];

                if (!currentUser) {
                    console.log("      ⚠️ no session");
                    res.sendStatus(401);
                    return;
                }

                userId = currentUser._id;
                console.log(`      using current user: ${currentUser.username} (${currentUser._id})`);
                console.log(`      role: ${currentUser.role}`);
            }

            console.log(`      getting enrolled courses for: ${userId}`);

            const courses = await enrollmentsDao.findCoursesForUser(userId);

            console.log(`   ✅ found ${courses.length} enrolled courses`);

            if (courses.length > 0) {
                const courseNumbers = courses.map(c => c.number).join(', ');
                console.log(`      courses: ${courseNumbers}`);
            } else {
                console.log(`      ℹ️ not enrolled in any courses`);
            }

            res.json(courses);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve courses",
                error: error.message
            });
        }
    };

    // get enrollments
    const findMyEnrollments = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.removeHeader('ETag');

            const currentUser = req.session["currentUser"];

            if (!currentUser) {
                console.log("   ⚠️  no session");
                res.sendStatus(401);
                return;
            }

            console.log(`   📋 find enrollments for: ${currentUser.username}`);

            const enrollments = await enrollmentsDao.findEnrollmentsForUser(currentUser._id);

            console.log(`   ✅ found ${enrollments.length} enrollments`);

            res.json(enrollments);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve enrollments",
                error: error.message
            });
        }
    };

    // create course
    const createCourse = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const currentUser = req.session["currentUser"];

            if (!currentUser) {
                console.log("   ⚠️  no session");
                res.sendStatus(401);
                return;
            }

            console.log(`   📚 create course from: ${currentUser.username}`);
            console.log(`      name: ${req.body.name}`);
            console.log(`      number: ${req.body.number}`);

            if (!req.body.name || !req.body.number) {
                console.log("      ❌ missing name or number");
                res.status(400).json({
                    message: "Course name and number are required"
                });
                return;
            }

            const newCourse = await courseDao.createCourse(req.body);

            console.log(`   ✅ course created: ${newCourse.number}`);
            console.log(`      id: ${newCourse._id}`);

            // auto-enroll creator
            await enrollmentsDao.enrollUserInCourse(currentUser._id, newCourse._id);

            console.log(`   🎓 creator enrolled`);
            console.log(`   💡 reload to see in my courses`);

            res.status(201).json(newCourse);
        } catch (error) {
            console.error("   ❌ error:", error);

            if (error.message.includes("already exists")) {
                res.status(400).json({ message: error.message });
            } else if (error.message.includes("required")) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({
                    message: "Failed to create course",
                    error: error.message
                });
            }
        }
    };

    // get stats
    const getUserStats = async (req, res) => {
        try {
            const currentUser = req.session["currentUser"];
            if (!currentUser || currentUser.role !== "ADMIN") {
                res.status(403).json({
                    message: "Admin access required"
                });
                return;
            }

            console.log(`   📊 get user stats`);

            const stats = await dao.getUserStatsByRole();

            console.log(`   ✅ got stats`);

            res.json(stats);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve statistics",
                error: error.message
            });
        }
    };

    // get active users
    const getRecentlyActiveUsers = async (req, res) => {
        try {
            const { days = 7 } = req.query;

            console.log(`   📅 get active users: last ${days} days`);

            const users = await dao.findRecentlyActiveUsers(parseInt(days));

            console.log(`   ✅ found ${users.length} active`);

            res.json(users);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve active users",
                error: error.message
            });
        }
    };

    // register routes
    console.log("   🔌 registering routes");

    app.post("/api/users/signup", signup);
    app.post("/api/users/signin", signin);
    app.post("/api/users/signout", signout);
    app.post("/api/users/profile", profile);

    app.get("/api/users/stats", getUserStats);
    app.get("/api/users/active", getRecentlyActiveUsers);

    app.get("/api/users/current/enrollments", findMyEnrollments);
    app.post("/api/users/current/courses", createCourse);

    app.post("/api/users", createUser);
    app.get("/api/users", findAllUsers);
    app.get("/api/users/:userId/courses", findCoursesForEnrolledUser);
    app.get("/api/users/:userId", findUserById);
    app.put("/api/users/:userId", updateUser);
    app.delete("/api/users/:userId", deleteUser);

    console.log("   ✅ routes registered");
    console.log("");
    console.log("   📋 endpoints:");
    console.log("      POST   /api/users/signup");
    console.log("      POST   /api/users/signin");
    console.log("      POST   /api/users/signout");
    console.log("      POST   /api/users/profile");
    console.log("      GET    /api/users");
    console.log("      GET    /api/users?role=STUDENT");
    console.log("      GET    /api/users?name=vicky");
    console.log("      POST   /api/users");
    console.log("      GET    /api/users/:userId/courses");
    console.log("      GET    /api/users/current/courses");
    console.log("      GET    /api/users/current/enrollments");
    console.log("      POST   /api/users/current/courses");
    console.log("      GET    /api/users/stats (admin only)");
    console.log("      GET    /api/users/active");
    console.log("      GET    /api/users/:userId");
    console.log("      PUT    /api/users/:userId");
    console.log("      DELETE /api/users/:userId");
    console.log("");
}