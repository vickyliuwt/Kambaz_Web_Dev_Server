// Kambaz/Grades/routes.js
// grade API endpoints

import * as gradesDao from "./dao.js";

export default function GradeRoutes(app) {

    // get course grades
    const findGradesForCourse = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            });

            const { courseId } = req.params;

            console.log(`   📊 get grades for: ${courseId}`);

            const grades = await gradesDao.findGradesForCourse(courseId);

            console.log(`   ✅ found ${grades.length} grades`);

            res.json(grades);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve grades",
                error: error.message
            });
        }
    };

    // get student grades
    const findGradesForStudent = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { studentId } = req.params;

            console.log(`   📊 get grades for: ${studentId}`);

            const grades = await gradesDao.findGradesForStudent(studentId);

            console.log(`   ✅ found ${grades.length} grades`);

            res.json(grades);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve grades",
                error: error.message
            });
        }
    };

    // get grades in course
    const findGradesForStudentInCourse = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { studentId, courseId } = req.params;

            console.log(`   📊 get grades: ${studentId} in ${courseId}`);

            const grades = await gradesDao.findGradesForStudentInCourse(studentId, courseId);

            console.log(`   ✅ found ${grades.length} grades`);

            res.json(grades);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve grades",
                error: error.message
            });
        }
    };

    // get specific grade
    const findGradeForAssignment = async (req, res) => {
        try {
            const { studentId, assignmentId } = req.params;

            console.log(`   📊 get grade: ${studentId}, ${assignmentId}`);

            const grade = await gradesDao.findGradeForAssignment(studentId, assignmentId);

            if (!grade) {
                res.status(404).json({ message: "Grade not found" });
                return;
            }

            console.log(`   ✅ found`);

            res.json(grade);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve grade",
                error: error.message
            });
        }
    };

    // create or update
    const upsertGrade = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            console.log(`   💾 upsert grade`);
            console.log(`      student: ${req.body.student}`);
            console.log(`      assessment: ${req.body.assignment}`);
            console.log(`      grade: ${req.body.grade ?? 'not graded'}/${req.body.maxPoints}`);

            const validation = gradesDao.validateGradeData(req.body);
            if (!validation.isValid) {
                console.log("      ❌ invalid:", validation.errors);
                res.status(400).json({
                    message: "Validation failed",
                    errors: validation.errors
                });
                return;
            }

            const grade = await gradesDao.upsertGrade(req.body);

            console.log(`   ✅ saved`);
            console.log(`   💡 reload to confirm`);

            res.json(grade);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to save grade",
                error: error.message
            });
        }
    };

    // update grade
    const updateGrade = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { gradeId } = req.params;

            console.log(`   ✏️  update: ${gradeId}`);
            console.log(`      grade: ${req.body.grade}`);
            console.log(`      by: ${req.session?.currentUser?.username || 'unknown'}`);

            const grade = await gradesDao.upsertGrade({
                ...req.body,
                _id: gradeId,
                gradedBy: req.session?.currentUser?._id,
                gradedDate: new Date().toISOString()
            });

            console.log(`   ✅ updated`);

            res.json(grade);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to update grade",
                error: error.message
            });
        }
    };

    // delete grade
    const deleteGrade = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { gradeId } = req.params;

            console.log(`   🗑️  delete: ${gradeId}`);

            const status = await gradesDao.deleteGrade(gradeId);

            console.log(`   ✅ deleted`);

            res.json(status);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to delete grade",
                error: error.message
            });
        }
    };

    // get course stats
    const getCourseGradeStats = async (req, res) => {
        try {
            const { courseId } = req.params;

            console.log(`   📊 get course stats: ${courseId}`);

            const stats = await gradesDao.getCourseGradeStatistics(courseId);

            if (!stats) {
                res.status(404).json({ message: "Course not found or no grades" });
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

    // get student stats
    const getStudentGradeStats = async (req, res) => {
        try {
            const { studentId } = req.params;

            console.log(`   📊 get student stats: ${studentId}`);

            const stats = await gradesDao.getStudentGradeStatistics(studentId);

            if (!stats) {
                res.status(404).json({ message: "Student not found or no grades" });
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

    // bulk create
    const createGradesForAssessment = async (req, res) => {
        try {
            const { assessmentId, courseId, maxPoints } = req.body;

            console.log(`   📝 bulk create for assessment`);
            console.log(`      assessment: ${assessmentId}`);

            if (!assessmentId || !courseId || !maxPoints) {
                res.status(400).json({
                    message: "assessmentId, courseId, and maxPoints are required"
                });
                return;
            }

            const grades = await gradesDao.createGradesForAssessment(
                assessmentId,
                courseId,
                maxPoints
            );

            console.log(`   ✅ bulk complete`);

            res.json({
                message: `Created ${grades.length} grade records`,
                grades
            });
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to create grades",
                error: error.message
            });
        }
    };

    // register routes
    console.log("   📌 registering routes");

    app.get("/api/courses/:courseId/grades", findGradesForCourse);
    app.get("/api/students/:studentId/grades", findGradesForStudent);
    app.get("/api/students/:studentId/courses/:courseId/grades", findGradesForStudentInCourse);
    app.get("/api/students/:studentId/assignments/:assignmentId/grade", findGradeForAssignment);

    app.post("/api/grades", upsertGrade);
    app.put("/api/grades/:gradeId", updateGrade);

    app.delete("/api/grades/:gradeId", deleteGrade);

    app.get("/api/grades/stats/course/:courseId", getCourseGradeStats);
    app.get("/api/grades/stats/student/:studentId", getStudentGradeStats);

    app.post("/api/grades/bulk/assessment", createGradesForAssessment);

    console.log("   ✅ routes registered");
    console.log("");
    console.log("   📋 endpoints:");
    console.log("      GET    /api/courses/:courseId/grades");
    console.log("      GET    /api/students/:studentId/grades");
    console.log("      GET    /api/students/:studentId/courses/:courseId/grades");
    console.log("      GET    /api/students/:studentId/assignments/:assignmentId/grade");
    console.log("      POST   /api/grades");
    console.log("      PUT    /api/grades/:gradeId");
    console.log("      DELETE /api/grades/:gradeId");
    console.log("      GET    /api/grades/stats/course/:courseId");
    console.log("      GET    /api/grades/stats/student/:studentId");
    console.log("      POST   /api/grades/bulk/assignment");
    console.log("");
}