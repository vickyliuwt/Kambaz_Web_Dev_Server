// Kambaz/Quizzes/routes.js
// quiz api endpoints

import * as quizzesDao from "./dao.js";

export default function QuizRoutes(app) {

    // get quizzes for course
    const findQuizzesForCourse = async (req, res) => {
        try {
            // no cache
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            });

            const { courseId } = req.params;
            const { type } = req.query;

            console.log(`📋 get quizzes/exams for course: ${courseId}`);

            let quizzes;

            // filter by type
            if (type === 'quizzes') {
                quizzes = await quizzesDao.findOnlyQuizzes(courseId);
                console.log(`✅ found ${quizzes.length} quizzes`);
            } else if (type === 'exams') {
                quizzes = await quizzesDao.findOnlyExams(courseId);
                console.log(`✅ found ${quizzes.length} exams`);
            } else {
                quizzes = await quizzesDao.findQuizzesForCourse(courseId);
                console.log(`✅ found ${quizzes.length} assessments total`);
            }

            res.json(quizzes);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve quizzes",
                error: error.message
            });
        }
    };

    // get quiz by id
    const findQuizById = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { quizId } = req.params;

            console.log(`📋 get quiz/exam: ${quizId}`);

            const quiz = await quizzesDao.findQuizById(quizId);

            if (!quiz) {
                res.status(404).json({ message: "Quiz not found" });
                return;
            }

            console.log(`✅ found: ${quiz.title}`);

            res.json(quiz);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve quiz",
                error: error.message
            });
        }
    };

    // create quiz
    const createQuiz = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const isExam = req.body.type && req.body.type.toLowerCase().includes("exam");
            const itemType = isExam ? "exam" : "quiz";

            console.log(`📝 create ${itemType}`);
            console.log(`   title: ${req.body.title}`);
            console.log(`   type: ${req.body.type || 'Graded Quiz'}`);

            if (!req.body.title || !req.body.title.trim()) {
                res.status(400).json({
                    message: `${itemType} title is required`
                });
                return;
            }

            // validate
            const validation = quizzesDao.validateQuizData(req.body);
            if (!validation.isValid) {
                console.log("❌ validation failed:", validation.errors);
                res.status(400).json({
                    message: "Validation failed",
                    errors: validation.errors
                });
                return;
            }

            const quiz = await quizzesDao.createQuiz(req.body);

            console.log(`✅ ${itemType} created successfully`);
            console.log("💡 refresh browser to see changes");

            res.status(201).json(quiz);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to create quiz",
                error: error.message
            });
        }
    };

    // update quiz
    const updateQuiz = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { quizId } = req.params;

            console.log(`✏️ update quiz: ${quizId}`);

            const updated = await quizzesDao.updateQuiz(quizId, req.body);

            if (!updated) {
                res.status(404).json({ message: "Quiz not found" });
                return;
            }

            console.log("✅ quiz updated");

            res.json(updated);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to update quiz",
                error: error.message
            });
        }
    };

    // delete quiz
    const deleteQuiz = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { quizId } = req.params;

            console.log(`🗑️ delete quiz: ${quizId}`);

            const status = await quizzesDao.deleteQuiz(quizId);

            console.log("✅ quiz deleted");

            res.json(status);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to delete quiz",
                error: error.message
            });
        }
    };

    // add question
    const addQuestion = async (req, res) => {
        try {
            const { quizId } = req.params;

            console.log(`📝 add question to quiz: ${quizId}`);

            const quiz = await quizzesDao.addQuestion(quizId, req.body);

            if (!quiz) {
                res.status(404).json({ message: "Quiz not found" });
                return;
            }

            console.log("✅ question added");

            res.json(quiz);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to add question",
                error: error.message
            });
        }
    };

    // update question
    const updateQuestion = async (req, res) => {
        try {
            const { quizId, questionId } = req.params;

            console.log(`✏️ update question ${questionId} in quiz ${quizId}`);

            const quiz = await quizzesDao.updateQuestion(quizId, questionId, req.body);

            if (!quiz) {
                res.status(404).json({ message: "Quiz or question not found" });
                return;
            }

            console.log("✅ question updated");

            res.json(quiz);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to update question",
                error: error.message
            });
        }
    };

    // delete question
    const deleteQuestion = async (req, res) => {
        try {
            const { quizId, questionId } = req.params;

            console.log(`🗑️ delete question ${questionId} from quiz ${quizId}`);

            const quiz = await quizzesDao.deleteQuestion(quizId, questionId);

            if (!quiz) {
                res.status(404).json({ message: "Quiz or question not found" });
                return;
            }

            console.log("✅ question deleted");

            res.json(quiz);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to delete question",
                error: error.message
            });
        }
    };

    // submit quiz
    const submitQuiz = async (req, res) => {
        try {
            const { quizId } = req.params;
            const currentUser = req.session["currentUser"];

            if (!currentUser) {
                res.status(401).json({ message: "Must be signed in" });
                return;
            }

            console.log(`📝 submit quiz ${quizId} for ${currentUser.username}`);

            const quiz = await quizzesDao.submitQuiz(quizId, currentUser._id, req.body);

            console.log("✅ quiz submitted");

            res.json(quiz);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to submit quiz",
                error: error.message
            });
        }
    };

    // get submission
    const getSubmission = async (req, res) => {
        try {
            const { quizId } = req.params;
            const currentUser = req.session["currentUser"];

            if (!currentUser) {
                res.status(401).json({ message: "Must be signed in" });
                return;
            }

            console.log(`📄 get submission for quiz ${quizId}`);

            const submission = await quizzesDao.getQuizSubmission(quizId, currentUser._id);

            if (!submission) {
                res.status(404).json({ message: "Submission not found" });
                return;
            }

            console.log("✅ found submission");

            res.json(submission);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to get submission",
                error: error.message
            });
        }
    };

    // grade submission
    const gradeSubmission = async (req, res) => {
        try {
            const { quizId, studentId } = req.params;
            const { score, feedback } = req.body;
            const currentUser = req.session["currentUser"];

            if (!currentUser || (currentUser.role !== "FACULTY" && currentUser.role !== "ADMIN")) {
                res.status(403).json({ message: "Only faculty can grade" });
                return;
            }

            console.log(`✏️ grade submission for quiz ${quizId}, student ${studentId}`);

            const quiz = await quizzesDao.gradeQuizSubmission(
                quizId,
                studentId,
                score,
                feedback,
                currentUser._id
            );

            console.log("✅ submission graded");

            res.json(quiz);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to grade submission",
                error: error.message
            });
        }
    };

    // get stats
    const getQuizStats = async (req, res) => {
        try {
            const { courseId } = req.params;

            console.log(`📊 get quiz stats for course: ${courseId}`);

            const stats = await quizzesDao.getQuizStatistics(courseId);

            if (!stats) {
                res.status(404).json({ message: "Course not found" });
                return;
            }

            console.log("✅ retrieved stats");

            res.json(stats);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to retrieve statistics",
                error: error.message
            });
        }
    };

    // search quizzes
    const searchQuizzes = async (req, res) => {
        try {
            const { courseId } = req.params;
            const { searchTerm } = req.query;

            console.log(`🔍 search quizzes in ${courseId} for "${searchTerm}"`);

            const quizzes = await quizzesDao.searchQuizzes(courseId, searchTerm);

            console.log(`✅ found ${quizzes.length} results`);

            res.json(quizzes);
        } catch (error) {
            console.error("❌ error:", error);
            res.status(500).json({
                message: "Failed to search quizzes",
                error: error.message
            });
        }
    };

    // register routes
    console.log("📌 registering quiz routes");

    // quiz crud
    app.get("/api/courses/:courseId/quizzes", findQuizzesForCourse);
    app.get("/api/quizzes/:quizId", findQuizById);
    app.post("/api/quizzes", createQuiz);
    app.put("/api/quizzes/:quizId", updateQuiz);
    app.delete("/api/quizzes/:quizId", deleteQuiz);

    // question crud
    app.post("/api/quizzes/:quizId/questions", addQuestion);
    app.put("/api/quizzes/:quizId/questions/:questionId", updateQuestion);
    app.delete("/api/quizzes/:quizId/questions/:questionId", deleteQuestion);

    // submissions
    app.post("/api/quizzes/:quizId/submit", submitQuiz);
    app.get("/api/quizzes/:quizId/submission", getSubmission);
    app.put("/api/quizzes/:quizId/grade/:studentId", gradeSubmission);

    // search and stats
    app.get("/api/courses/:courseId/quizzes/search", searchQuizzes);
    app.get("/api/quizzes/stats/:courseId", getQuizStats);

    console.log("✅ quiz routes registered");
    console.log("");
    console.log("📋 available endpoints:");
    console.log("   GET    /api/courses/:courseId/quizzes");
    console.log("   GET    /api/courses/:courseId/quizzes?type=quizzes");
    console.log("   GET    /api/courses/:courseId/quizzes?type=exams");
    console.log("   GET    /api/quizzes/:quizId");
    console.log("   POST   /api/quizzes");
    console.log("   PUT    /api/quizzes/:quizId");
    console.log("   DELETE /api/quizzes/:quizId");
    console.log("   POST   /api/quizzes/:quizId/questions");
    console.log("   PUT    /api/quizzes/:quizId/questions/:questionId");
    console.log("   DELETE /api/quizzes/:quizId/questions/:questionId");
    console.log("   POST   /api/quizzes/:quizId/submit");
    console.log("   GET    /api/quizzes/:quizId/submission");
    console.log("   PUT    /api/quizzes/:quizId/grade/:studentId");
    console.log("   GET    /api/courses/:courseId/quizzes/search");
    console.log("   GET    /api/quizzes/stats/:courseId");
    console.log("");
}