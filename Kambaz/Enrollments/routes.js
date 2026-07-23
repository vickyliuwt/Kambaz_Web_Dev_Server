// Kambaz/Enrollments/routes.js
// enrollment API endpoints with auto-grade creation for students

import * as enrollmentsDao from "./dao.js";

export default function EnrollmentRoutes(app) {

    // enroll user in course - ENHANCED: auto-creates grades for all existing assessments
    const enrollUserInCourse = async (req, res) => {
        try {
            // disable cache
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            });

            const { userId, courseId } = req.params;

            console.log(`   🎓 enroll request`);
            console.log(`      user: ${userId}`);
            console.log(`      course: ${courseId}`);

            if (!userId || !courseId) {
                console.log("      ❌ missing ids");
                res.status(400).json({
                    message: "userId and courseId are required"
                });
                return;
            }

            // create enrollment
            const result = await enrollmentsDao.enrollUserInCourse(userId, courseId);

            console.log(`   ✅ enrolled`);
            console.log(`      id: ${result._id}`);

            // ENHANCEMENT: auto-create grades for all existing assessments in the course
            try {
                const userModel = (await import("../Users/model.js")).default;
                const user = await userModel.findById(userId);

                // only create grades for students
                if (user && user.role === 'STUDENT') {
                    console.log(`   📊 auto-creating grades for student...`);

                    const assignmentModel = (await import("../Assignments/model.js")).default;
                    const quizModel = (await import("../Quizzes/model.js")).default;
                    const gradeDao = (await import("../Grades/dao.js"));

                    // get all assessments in course
                    const [assignments, quizzes] = await Promise.all([
                        assignmentModel.find({ course: courseId }),
                        quizModel.find({ course: courseId })
                    ]);

                    const totalAssessments = assignments.length + quizzes.length;
                    console.log(`      found ${totalAssessments} assessments (${assignments.length} assignments, ${quizzes.length} quizzes/exams)`);

                    let gradesCreated = 0;

                    // create grades for assignments
                    for (const assignment of assignments) {
                        try {
                            await gradeDao.upsertGrade({
                                student: userId,
                                assignment: assignment._id,
                                course: courseId,
                                assessmentType: assignment.assignmentType === 'PROJECTS' ? 'PROJECT' : 'ASSIGNMENT',
                                grade: null,
                                maxPoints: assignment.points,
                                status: "Not Submitted",
                                feedback: "",
                                submittedDate: null,
                                gradedDate: null,
                                gradedBy: null
                            });
                            gradesCreated++;
                        } catch (err) {
                            console.log(`      ⚠️ skipped grade for ${assignment._id}`);
                        }
                    }

                    // create grades for quizzes/exams
                    for (const quiz of quizzes) {
                        try {
                            const isExam = quiz.type && quiz.type.includes("Exam");
                            await gradeDao.upsertGrade({
                                student: userId,
                                assignment: quiz._id,
                                course: courseId,
                                assessmentType: isExam ? 'EXAM' : 'QUIZ',
                                grade: null,
                                maxPoints: quiz.points,
                                status: "Not Submitted",
                                feedback: "",
                                submittedDate: null,
                                gradedDate: null,
                                gradedBy: null
                            });
                            gradesCreated++;
                        } catch (err) {
                            console.log(`      ⚠️ skipped grade for ${quiz._id}`);
                        }
                    }

                    console.log(`      ✅ created ${gradesCreated}/${totalAssessments} grade records`);
                    console.log(`      💡 student can now view all grades`);
                } else {
                    console.log(`   ℹ️ not a student, skipping grade creation`);
                }

            } catch (gradeError) {
                console.log(`   ⚠️ grade auto-creation failed:`, gradeError.message);
                console.log(`   enrollment successful but grades not created`);
            }

            console.log(`   💡 reload to confirm`);

            res.json(result);
        } catch (error) {
            console.error("   ❌ error:", error);

            if (error.message.includes("not found")) {
                res.status(404).json({
                    message: error.message
                });
            } else if (error.message.includes("already enrolled")) {
                res.status(409).json({
                    message: error.message
                });
            } else {
                res.status(500).json({
                    message: "Failed to enroll user in course",
                    error: error.message
                });
            }
        }
    };

    // bulk enroll users - ENHANCED: auto-creates grades for all enrolled students
    const bulkEnrollUsers = async (req, res) => {
        try {
            const { userIds, courseId } = req.body;

            console.log(`   🎓 bulk enroll`);
            console.log(`      users: ${userIds?.length || 0}`);
            console.log(`      course: ${courseId}`);

            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    message: "userIds array is required and must not be empty"
                });
                return;
            }

            if (!courseId) {
                res.status(400).json({
                    message: "courseId is required"
                });
                return;
            }

            // ENHANCEMENT: get all assessments once for efficiency
            const assignmentModel = (await import("../Assignments/model.js")).default;
            const quizModel = (await import("../Quizzes/model.js")).default;
            const userModel = (await import("../Users/model.js")).default;
            const gradeDao = (await import("../Grades/dao.js"));

            const [assignments, quizzes] = await Promise.all([
                assignmentModel.find({ course: courseId }),
                quizModel.find({ course: courseId })
            ]);

            const totalAssessments = assignments.length + quizzes.length;
            console.log(`   found ${totalAssessments} assessments in course`);

            const results = {
                enrolled: [],
                alreadyEnrolled: [],
                failed: [],
                gradesCreated: 0
            };

            // enroll each user
            for (const userId of userIds) {
                try {
                    // check if already enrolled
                    const existing = await enrollmentsDao.findEnrollment(userId, courseId);
                    if (existing) {
                        results.alreadyEnrolled.push(userId);
                        console.log(`   ⚠️ ${userId} already enrolled`);
                        continue;
                    }

                    // get user to check if student
                    const user = await userModel.findById(userId);
                    if (!user) {
                        results.failed.push(userId);
                        console.log(`   ❌ user ${userId} not found`);
                        continue;
                    }

                    // create enrollment
                    const enrollment = await enrollmentsDao.enrollUserInCourse(userId, courseId);
                    results.enrolled.push(enrollment);
                    console.log(`   ✅ enrolled ${user.username}`);

                    // ENHANCEMENT: only create grades for students
                    if (user.role === 'STUDENT') {
                        console.log(`      📊 creating grades for ${user.username}...`);

                        // create grades for all assignments
                        for (const assignment of assignments) {
                            try {
                                await gradeDao.upsertGrade({
                                    student: userId,
                                    assignment: assignment._id,
                                    course: courseId,
                                    assessmentType: assignment.assignmentType === 'PROJECTS' ? 'PROJECT' : 'ASSIGNMENT',
                                    grade: null,
                                    maxPoints: assignment.points,
                                    status: "Not Submitted",
                                    feedback: "",
                                    submittedDate: null,
                                    gradedDate: null,
                                    gradedBy: null
                                });
                                results.gradesCreated++;
                            } catch (err) {
                                console.log(`         ⚠️ grade creation failed for ${assignment._id}`);
                            }
                        }

                        // create grades for all quizzes/exams
                        for (const quiz of quizzes) {
                            try {
                                const isExam = quiz.type && quiz.type.includes("Exam");
                                await gradeDao.upsertGrade({
                                    student: userId,
                                    assignment: quiz._id,
                                    course: courseId,
                                    assessmentType: isExam ? 'EXAM' : 'QUIZ',
                                    grade: null,
                                    maxPoints: quiz.points,
                                    status: "Not Submitted",
                                    feedback: "",
                                    submittedDate: null,
                                    gradedDate: null,
                                    gradedBy: null
                                });
                                results.gradesCreated++;
                            } catch (err) {
                                console.log(`         ⚠️ grade creation failed for ${quiz._id}`);
                            }
                        }

                        console.log(`      ✅ created ${results.gradesCreated} grades for ${user.username}`);
                    }

                } catch (err) {
                    console.error(`   ❌ failed to enroll ${userId}:`, err.message);
                    results.failed.push(userId);
                }
            }

            console.log(`   ✅ bulk enrollment complete`);
            console.log(`      enrolled: ${results.enrolled.length}`);
            console.log(`      already enrolled: ${results.alreadyEnrolled.length}`);
            console.log(`      failed: ${results.failed.length}`);
            console.log(`      total grades created: ${results.gradesCreated}`);

            res.json({
                message: `Enrolled ${results.enrolled.length} users`,
                ...results
            });

        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to bulk enroll users",
                error: error.message
            });
        }
    };

    // unenroll user - ENHANCED: deletes associated grades
    const unenrollUserFromCourse = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { userId, courseId } = req.params;

            console.log(`   🚫 unenroll request`);
            console.log(`      user: ${userId}`);
            console.log(`      course: ${courseId}`);

            if (!userId || !courseId) {
                console.log("      ❌ missing ids");
                res.status(400).json({
                    message: "userId and courseId are required"
                });
                return;
            }

            const result = await enrollmentsDao.unenrollUserFromCourse(userId, courseId);

            console.log(`   ✅ unenrolled`);
            console.log(`      removed: ${result.removed}`);
            console.log(`      grades deleted: ${result.gradesDeleted || 0}`);
            console.log(`   💡 reload to confirm`);

            res.json(result);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to unenroll user from course",
                error: error.message
            });
        }
    };

    // check enrollment status
    const checkEnrollmentStatus = async (req, res) => {
        try {
            const { userId, courseId } = req.params;

            console.log(`   🔍 check status`);
            console.log(`      user: ${userId}`);
            console.log(`      course: ${courseId}`);

            const enrollment = await enrollmentsDao.findEnrollment(userId, courseId);
            const isEnrolled = !!enrollment;

            console.log(`      result: ${isEnrolled ? 'enrolled ✓' : 'not enrolled ✗'}`);

            res.json({
                userId,
                courseId,
                isEnrolled,
                enrollment: enrollment,
                message: isEnrolled
                    ? "User is enrolled in course"
                    : "User is not enrolled in course"
            });
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to check enrollment status",
                error: error.message
            });
        }
    };

    // bulk unenroll users
    const bulkUnenrollUsers = async (req, res) => {
        try {
            const { userIds, courseId } = req.body;

            console.log(`   🚫 bulk unenroll`);
            console.log(`      users: ${userIds?.length || 0}`);
            console.log(`      course: ${courseId}`);

            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                res.status(400).json({
                    message: "userIds array is required"
                });
                return;
            }

            if (!courseId) {
                res.status(400).json({
                    message: "courseId is required"
                });
                return;
            }

            const results = {
                unenrolled: 0,
                notEnrolled: 0,
                failed: [],
                gradesDeleted: 0
            };

            for (const userId of userIds) {
                try {
                    const result = await enrollmentsDao.unenrollUserFromCourse(userId, courseId);
                    if (result.removed > 0) {
                        results.unenrolled++;
                        results.gradesDeleted += result.gradesDeleted || 0;
                    } else {
                        results.notEnrolled++;
                    }
                } catch (err) {
                    results.failed.push(userId);
                }
            }

            console.log(`   ✅ bulk complete`);
            console.log(`      unenrolled: ${results.unenrolled}`);
            console.log(`      grades deleted: ${results.gradesDeleted}`);

            res.json({
                message: "Successfully unenrolled users",
                results
            });
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to bulk unenroll users",
                error: error.message
            });
        }
    };

    // get course enrollments
    const findEnrollmentsForCourse = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            const { courseId } = req.params;

            console.log(`   🎓 get enrollments for course: ${courseId}`);

            const enrollments = await enrollmentsDao.findEnrollmentsForCourse(courseId);

            console.log(`   ✅ found ${enrollments.length} enrollments`);

            res.json(enrollments);

        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to get enrollments from MongoDB",
                error: error.message
            });
        }
    };

    // get user enrollments
    const findEnrollmentsForUser = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            const { userId } = req.params;

            console.log(`   🎓 get enrollments for user: ${userId}`);

            const enrollments = await enrollmentsDao.findEnrollmentsForUser(userId);

            console.log(`   ✅ found ${enrollments.length} enrollments for user`);

            res.json(enrollments);

        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to get user enrollments from MongoDB",
                error: error.message
            });
        }
    };

    // get enrollment stats
    const getEnrollmentStats = async (req, res) => {
        try {
            const { courseId } = req.params;

            console.log(`   📊 get stats: ${courseId}`);

            const stats = await enrollmentsDao.getEnrollmentStats(courseId);

            if (!stats) {
                res.status(404).json({ message: "Course not found" });
                return;
            }

            console.log(`   ✅ got stats`);

            res.json(stats);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve enrollment statistics",
                error: error.message
            });
        }
    };

    // get user enrollment stats
    const getUserEnrollmentStats = async (req, res) => {
        try {
            const { userId } = req.params;

            console.log(`   📊 get user stats: ${userId}`);

            const stats = await enrollmentsDao.getUserEnrollmentStats(userId);

            if (!stats) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            console.log(`   ✅ got stats`);

            res.json(stats);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve user enrollment statistics",
                error: error.message
            });
        }
    };

    // register routes
    console.log("   📌 registering routes");

    app.get("/api/enrollments/course/:courseId", findEnrollmentsForCourse);
    app.get("/api/enrollments/user/:userId", findEnrollmentsForUser);
    app.post("/api/enrollments/:userId/:courseId", enrollUserInCourse);
    app.delete("/api/enrollments/:userId/:courseId", unenrollUserFromCourse);
    app.get("/api/enrollments/check/:userId/:courseId", checkEnrollmentStatus);

    app.post("/api/enrollments/bulk/enroll", bulkEnrollUsers);
    app.post("/api/enrollments/bulk/unenroll", bulkUnenrollUsers);

    app.get("/api/enrollments/stats/:courseId", getEnrollmentStats);
    app.get("/api/enrollments/user/:userId/stats", getUserEnrollmentStats);

    console.log("   ✅ routes registered");
    console.log("");
    console.log("   📋 endpoints:");
    console.log("      POST   /api/enrollments/:userId/:courseId (auto-creates grades)");
    console.log("      DELETE /api/enrollments/:userId/:courseId (deletes grades)");
    console.log("      GET    /api/enrollments/check/:userId/:courseId");
    console.log("      POST   /api/enrollments/bulk/enroll (auto-creates grades)");
    console.log("      POST   /api/enrollments/bulk/unenroll (deletes grades)");
    console.log("      GET    /api/enrollments/course/:courseId");
    console.log("      GET    /api/enrollments/user/:userId");
    console.log("      GET    /api/enrollments/stats/:courseId");
    console.log("      GET    /api/enrollments/user/:userId/stats");
    console.log("");
}