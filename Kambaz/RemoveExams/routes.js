// Kambaz/Exams/routes.js
// exam API endpoints

import * as examsDao from "./dao.js";

export default function ExamRoutes(app) {

    // get exams
    const findExamsForCourse = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            });

            const { courseId } = req.params;

            console.log(`   📄 get exams for: ${courseId}`);

            const exams = await examsDao.findExamsForCourse(courseId);

            console.log(`   ✅ found ${exams.length} exams`);

            res.json(exams);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve exams",
                error: error.message
            });
        }
    };

    // create exam
    const createExam = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            console.log(`   📄 create exam`);
            console.log(`      title: ${req.body.title}`);

            if (!req.body.title || !req.body.title.trim()) {
                res.status(400).json({
                    message: "Exam title is required"
                });
                return;
            }

            const exam = await examsDao.createExam(req.body);

            console.log(`   ✅ created`);
            console.log(`   💡 reload to confirm`);

            res.status(201).json(exam);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to create exam",
                error: error.message
            });
        }
    };

    // update exam
    const updateExam = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { examId } = req.params;
            const examUpdates = req.body;

            console.log(`   ✏️  update: ${examId}`);

            const updatedExam = await examsDao.updateExam(examId, examUpdates);

            if (!updatedExam) {
                res.status(404).json({ message: "Exam not found" });
                return;
            }

            console.log(`   ✅ updated`);

            res.json(updatedExam);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to update exam",
                error: error.message
            });
        }
    };

    // delete exam
    const deleteExam = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { examId } = req.params;

            console.log(`   🗑️  delete: ${examId}`);

            const status = await examsDao.deleteExam(examId);

            console.log(`   ✅ deleted`);

            res.json(status);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to delete exam",
                error: error.message
            });
        }
    };

    // get stats
    const getExamStats = async (req, res) => {
        try {
            const { courseId } = req.params;

            const stats = await examsDao.getExamStatistics(courseId);

            if (!stats) {
                res.status(404).json({ message: "Course not found" });
                return;
            }

            res.json(stats);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve statistics",
                error: error.message
            });
        }
    };

    // register routes
    console.log("   📌 registering routes");

    app.get("/api/courses/:courseId/exams", findExamsForCourse);
    app.post("/api/exams", createExam);
    app.put("/api/exams/:examId", updateExam);
    app.delete("/api/exams/:examId", deleteExam);
    app.get("/api/exams/stats/:courseId", getExamStats);

    console.log("   ✅ routes registered");
    console.log("");
}