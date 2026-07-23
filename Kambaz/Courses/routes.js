// Kambaz/Courses/routes.js
// course API endpoints

import * as dao from "./dao.js";
import * as modulesDao from "../Modules/dao.js";
import * as assignmentsDao from "../Assignments/dao.js";
import * as peopleDao from "../People/dao.js";
import * as enrollmentsDao from "../Enrollments/dao.js";
import * as quizzesDao from "../Quizzes/dao.js";
import enrollmentModel from "../Enrollments/model.js";


export default function CourseRoutes(app) {

    // course CRUD
    const findAllCourses = async (req, res) => {
        try {
            // no cache
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            });
            res.removeHeader('ETag');

            console.log("   📚 get all courses");

            const courses = await dao.findAllCourses();

            console.log(`   ✅ found ${courses.length} courses`);

            res.json(courses);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve courses",
                error: error.message
            });
        }
    };

    // create course
    const createCourse = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            });

            console.log("   📚 create course");
            console.log(`      name: ${req.body.name}`);
            console.log(`      number: ${req.body.number}`);
            console.log(`      dept: ${req.body.department || 'Computer Science'}`);

            // check data
            const validation = dao.validateCourseData(req.body);
            if (!validation.isValid) {
                console.log("      ❌ invalid data:", validation.errors);
                res.status(400).json({
                    message: "Validation failed",
                    errors: validation.errors
                });
                return;
            }

            const course = await dao.createCourse(req.body);

            console.log(`   ✅ created successfully`);
            console.log(`      id: ${course._id}`);
            console.log(`      number: ${course.number}`);
            console.log(`   💡 reload page to see it`);

            res.status(201).json(course);
        } catch (error) {
            console.error("   ❌ error:", error);

            if (error.message.includes("already exists")) {
                res.status(400).json({
                    message: error.message,
                    field: "number"
                });
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

    // update course
    const updateCourse = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            });

            const { courseId } = req.params;
            const courseUpdates = req.body;

            console.log(`   ✏️  update course: ${courseId}`);
            console.log(`      fields: ${Object.keys(courseUpdates).join(', ')}`);

            const updatedCourse = await dao.updateCourse(courseId, courseUpdates);

            if (!updatedCourse) {
                console.log("      ⚠️  not found");
                res.status(404).json({
                    message: "Course not found",
                    courseId: courseId
                });
                return;
            }

            console.log(`   ✅ updated`);
            console.log(`      name: ${updatedCourse.name}`);
            console.log(`   💡 reload to confirm`);

            res.json(updatedCourse);
        } catch (error) {
            console.error("   ❌ error:", error);

            if (error.message.includes("already in use")) {
                res.status(400).json({ message: error.message });
            } else if (error.message.includes("date")) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({
                    message: "Failed to update course",
                    error: error.message
                });
            }
        }
    };

    // delete course
    const deleteCourse = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { courseId } = req.params;

            console.log(`   🗑️  delete course: ${courseId}`);

            const status = await dao.deleteCourse(courseId);

            console.log(`   ✅ deleted`);
            console.log(`      course: ${status.courseNumber || 'Unknown'}`);
            console.log(`      enrollments: ${status.deletedEnrollments}`);
            console.log(`      modules: ${status.deletedModules}`);
            console.log(`      assignments: ${status.deletedAssignments}`);
            console.log(`   💡 reload to confirm`);

            res.json(status);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to delete course",
                error: error.message
            });
        }
    };

    // get modules
    const findModulesForCourse = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.removeHeader('ETag');

            const { courseId } = req.params;

            console.log(`   📖 get modules for: ${courseId}`);

            const modules = await modulesDao.findModulesForCourse(courseId);

            console.log(`   ✅ found ${modules.length} modules`);

            if (modules.length > 0) {
                console.log(`      ${modules.map(m => m.name).join(', ')}`);
            }

            res.json(modules);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve modules",
                error: error.message
            });
        }
    };

    // create module
    const createModuleForCourse = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { courseId } = req.params;

            console.log(`   📖 create module for: ${courseId}`);
            console.log(`      name: ${req.body.name}`);

            if (!req.body.name || !req.body.name.trim()) {
                res.status(400).json({
                    message: "Module name is required"
                });
                return;
            }

            const module = { ...req.body, course: courseId };

            const newModule = await modulesDao.createModule(module);

            console.log(`   ✅ created`);
            console.log(`      id: ${newModule._id}`);
            console.log(`   💡 reload to confirm`);

            res.status(201).json(newModule);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to create module",
                error: error.message
            });
        }
    };

    // get assignments
    const findAssignmentsForCourse = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.removeHeader('ETag');

            const { courseId } = req.params;

            console.log(`   📋 get assignments for: ${courseId}`);

            const assignments = await assignmentsDao.findAssignmentsForCourse(courseId);

            console.log(`   ✅ found ${assignments.length} assignments`);

            res.json(assignments);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve assignments",
                error: error.message
            });
        }
    };

    // create assignment
    const createAssignmentForCourse = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { courseId } = req.params;

            console.log(`   📋 create assignment for: ${courseId}`);
            console.log(`      title: ${req.body.title}`);

            if (!req.body.title || !req.body.title.trim()) {
                res.status(400).json({
                    message: "Assignment title is required"
                });
                return;
            }

            const assignment = { ...req.body, course: courseId };

            const newAssignment = await assignmentsDao.createAssignment(assignment);

            console.log(`   ✅ created`);
            console.log(`      id: ${newAssignment._id}`);
            console.log(`   💡 reload to confirm`);

            res.status(201).json(newAssignment);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to create assignment",
                error: error.message
            });
        }
    };

    // get people
    const findPeopleForCourse = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { courseId } = req.params;

            console.log(`   👥 get people for: ${courseId}`);

            const people = await peopleDao.findUsersForCourse(courseId);

            console.log(`   ✅ found ${people.length} users`);
            console.log(`      faculty: ${people.filter(p => p.role === 'FACULTY').length}`);
            console.log(`      ta: ${people.filter(p => p.role === 'TA').length}`);
            console.log(`      students: ${people.filter(p => p.role === 'STUDENT').length}`);

            res.json(people);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve course roster",
                error: error.message
            });
        }
    };

    // create user
    const createUserForCourse = async (req, res) => {
        try {
            const { courseId } = req.params;
            const userData = req.body;

            console.log(`   create user for: ${courseId}`);
            console.log(`      username: ${userData.username}`);
            console.log(`      name: ${userData.firstName} ${userData.lastName}`);

            // check required
            if (!userData.username || !userData.password) {
                console.log(`      missing credentials`);
                res.status(400).json({
                    message: "username and password are required",
                    error: "both fields must be filled in"
                });
                return;
            }

            if (!userData.firstName || !userData.lastName) {
                console.log(`      missing names`);
                res.status(400).json({
                    message: "first name and last name are required",
                    error: "both fields must be filled in"
                });
                return;
            }

            // check duplicate
            const existingUser = await peopleDao.findUserByUsername(userData.username);
            if (existingUser) {
                console.log(`      username '${userData.username}' taken`);

                const existingEnrollment = await enrollmentModel.findOne({
                    user: existingUser._id,
                    course: courseId
                });

                if (existingEnrollment) {
                    res.status(400).json({
                        message: `username '${userData.username}' already taken`,
                        error: `user already enrolled`,
                        userId: existingUser._id
                    });
                } else {
                    res.status(400).json({
                        message: `username '${userData.username}' already taken`,
                        error: "pick a different username"
                    });
                }
                return;
            }

            // create
            let newUser;
            try {
                newUser = await peopleDao.createUserForCourse(userData, courseId);
            } catch (createError) {
                console.error(`      error:`, createError);

                const userWasCreated = await peopleDao.findUserByUsername(userData.username);

                if (userWasCreated) {
                    console.log(`      user created but enrollment failed`);
                    console.log(`      id: ${userWasCreated._id}`);
                    console.log(`      returning anyway`);

                    const safeUser = { ...userWasCreated._doc };
                    delete safeUser.password;

                    res.status(201).json({
                        ...safeUser,
                        warning: "user created but enrollment may have issues - refresh page"
                    });
                    return;
                }

                throw createError;
            }

            console.log(`   ✅ created`);
            console.log(`      id: ${newUser._id}`);

            const safeUser = { ...newUser._doc };
            delete safeUser.password;

            res.status(201).json(safeUser);

        } catch (error) {
            console.error("   ❌ error:", error);

            if (error.message.includes("already in use") || error.message.includes("already taken")) {
                res.status(400).json({
                    message: error.message,
                    error: "username must be unique"
                });
            } else if (error.message.includes("required")) {
                res.status(400).json({
                    message: error.message,
                    error: "fill in all required fields"
                });
            } else if (error.message.includes("already enrolled")) {
                res.status(400).json({
                    message: "cannot create user",
                    error: error.message
                });
            } else {
                res.status(500).json({
                    message: "failed to create user",
                    error: error.message,
                    stack: process.env.SERVER_ENV === 'development' ? error.stack : undefined
                });
            }
        }
    };

    // search courses
    const searchCourses = async (req, res) => {
        try {
            const { query } = req.query;

            console.log(`   🔍 search: "${query}"`);

            if (!query) {
                const allCourses = await dao.findAllCourses();
                res.json(allCourses);
                return;
            }

            const courses = await dao.searchCourses(query);

            console.log(`   ✅ found ${courses.length} matches`);

            res.json(courses);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to search courses",
                error: error.message
            });
        }
    };

    // get departments
    const getDepartments = async (req, res) => {
        try {
            console.log(`   🏛️  get departments`);

            const departments = await dao.getAllDepartments();

            console.log(`   ✅ found ${departments.length} departments`);

            res.json(departments);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve departments",
                error: error.message
            });
        }
    };

    // get active courses
    const getActiveCourses = async (req, res) => {
        try {
            console.log(`   📅 get active courses`);

            const courses = await dao.findActiveCourses();

            console.log(`   ✅ found ${courses.length} active`);

            res.json(courses);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve active courses",
                error: error.message
            });
        }
    };

    // get stats
    const getCourseStats = async (req, res) => {
        try {
            const { courseId } = req.params;

            console.log(`   📊 get stats: ${courseId}`);

            const stats = await dao.getCourseStatistics(courseId);

            if (!stats) {
                res.status(404).json({ message: "Course not found" });
                return;
            }

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

    // get quizzes
    const findQuizzesForCourse = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            const { courseId } = req.params;

            console.log(`   📝 get quizzes for: ${courseId}`);

            const quizzes = await quizzesDao.findQuizzesForCourse(courseId);

            console.log(`   ✅ found ${quizzes.length} quizzes`);

            res.json(quizzes);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve quizzes",
                error: error.message
            });
        }
    };

    // create quiz
    const createQuizForCourse = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { courseId } = req.params;
            const isExam = req.body.type && req.body.type.toLowerCase().includes("exam");
            const itemType = isExam ? "exam" : "quiz";

            console.log(`   📝 create ${itemType} for: ${courseId}`);
            console.log(`      title: ${req.body.title}`);
            console.log(`      type: ${req.body.type || 'Graded Quiz'}`);

            if (!req.body.title || !req.body.title.trim()) {
                res.status(400).json({
                    message: "Quiz title is required"
                });
                return;
            }

            const quiz = { ...req.body, course: courseId };

            const newQuiz = await quizzesDao.createQuiz(quiz);

            console.log(`   ✅ created`);
            console.log(`      id: ${newQuiz._id}`);
            console.log(`   💡 reload to confirm`);

            res.status(201).json(newQuiz);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to create quiz",
                error: error.message
            });
        }
    };

    // register routes
    console.log("   📌 registering routes");

    app.get("/api/courses", findAllCourses);
    app.post("/api/courses", createCourse);
    app.put("/api/courses/:courseId", updateCourse);
    app.delete("/api/courses/:courseId", deleteCourse);

    app.get("/api/courses/search", searchCourses);
    app.get("/api/courses/departments", getDepartments);
    app.get("/api/courses/active", getActiveCourses);
    app.get("/api/courses/:courseId/stats", getCourseStats);

    app.get("/api/courses/:courseId/modules", findModulesForCourse);
    app.post("/api/courses/:courseId/modules", createModuleForCourse);

    app.get("/api/courses/:courseId/quizzes", findQuizzesForCourse);
    app.post("/api/courses/:courseId/quizzes", createQuizForCourse);

    app.get("/api/courses/:courseId/assignments", findAssignmentsForCourse);
    app.post("/api/courses/:courseId/assignments", createAssignmentForCourse);

    app.get("/api/courses/:courseId/people", findPeopleForCourse);
    app.post("/api/courses/:courseId/people", createUserForCourse);

    console.log("   ✅ routes registered");
    console.log("");
    console.log("   📋 endpoints:");
    console.log("      GET    /api/courses");
    console.log("      POST   /api/courses");
    console.log("      PUT    /api/courses/:courseId");
    console.log("      DELETE /api/courses/:courseId");
    console.log("      GET    /api/courses/search?query=web");
    console.log("      GET    /api/courses/departments");
    console.log("      GET    /api/courses/active");
    console.log("      GET    /api/courses/:courseId/stats");
    console.log("      GET    /api/courses/:courseId/modules");
    console.log("      POST   /api/courses/:courseId/modules");
    console.log("      GET    /api/courses/:courseId/assignments");
    console.log("      POST   /api/courses/:courseId/assignments");
    console.log("      GET    /api/courses/:courseId/people");
    console.log("      POST   /api/courses/:courseId/people");
    console.log("      GET    /api/courses/:courseId/quizzes");
    console.log("      POST   /api/courses/:courseId/quizzes");
    console.log("");
}