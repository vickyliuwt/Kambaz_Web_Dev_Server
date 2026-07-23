// Kambaz/Quizzes/dao.js
// quiz db operations

import model from "./model.js";
import courseModel from "../Courses/model.js";
import userModel from "../Users/model.js";

// make quiz ID like Q1-CS5610
async function generateQuizId(courseId, isExam = false) {
    try {
        const course = await courseModel.findById(courseId);
        if (!course) {
            throw new Error("Course not found");
        }

        const courseNumber = course.number;
        const prefix = isExam ? "E" : "Q";

        const itemsInCourse = await model.find({ course: courseId });
        const sameType = itemsInCourse.filter(item => item._id.startsWith(prefix));

        const numbers = sameType
            .map(item => {
                const match = item._id.match(new RegExp(`^${prefix}(\\d+)-`));
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);

        const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        const newId = `${prefix}${nextNumber}-${courseNumber}`;

        console.log(`generated ${isExam ? 'exam' : 'quiz'} id: ${newId}`);

        return newId;
    } catch (error) {
        console.error("error making quiz id:", error);
        return `Q${Date.now()}-UNKNOWN`;
    }
}

// make submission ID
async function generateSubmissionId(quizId, studentId, courseId, attemptNumber = 1) {
    try {
        const student = await userModel.findById(studentId);
        const course = await courseModel.findById(courseId);

        const studentLogin = student ? student.loginId : studentId;
        const courseNumber = course ? course.number : courseId;

        const isExam = quizId.startsWith("E");
        const prefix = isExam ? "ES" : "QS";

        const itemMatch = quizId.match(/^([QE]\d+)-/);
        const itemNum = itemMatch ? itemMatch[1] : quizId.substring(0, 2);

        return `${prefix}-${itemNum}-${courseNumber}-${studentLogin}-A${attemptNumber}`;
    } catch (error) {
        return `QS-${quizId}-${studentId}-A${attemptNumber}`;
    }
}

// create quiz
export async function createQuiz(quizData) {
    try {
        console.log("creating new quiz/exam");

        if (!quizData.title || !quizData.title.trim()) {
            throw new Error("Quiz title is required");
        }

        if (!quizData.course) {
            throw new Error("Course ID is required");
        }

        const courseExists = await courseModel.findById(quizData.course);
        if (!courseExists) {
            throw new Error(`Course ${quizData.course} not found`);
        }

        const isExam = quizData.type && quizData.type.toLowerCase().includes("exam");
        const quizId = await generateQuizId(quizData.course, isExam);

        // defaults
        const defaults = isExam ? {
            type: "Exam",
            questions: [],
            points: 100,
            timeLimit: 120,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            shuffleAnswers: false,
            oneQuestionAtTime: true,
            webcamRequired: false
        } : {
            type: "Graded Quiz",
            questions: [],
            points: 100,
            timeLimit: 20,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            shuffleAnswers: true,
            oneQuestionAtTime: true,
            webcamRequired: false
        };

        const newQuiz = {
            _id: quizId,
            title: quizData.title.trim(),
            course: quizData.course,
            type: quizData.type || defaults.type,
            description: quizData.description || "",
            instructions: quizData.instructions || "",
            questions: quizData.questions || defaults.questions,
            points: quizData.points || defaults.points,
            dueDate: quizData.dueDate || defaults.dueDate,
            availableDate: quizData.availableDate || new Date().toISOString(),
            availableUntilDate: quizData.availableUntilDate,
            timeLimit: quizData.timeLimit || defaults.timeLimit,
            published: quizData.published !== undefined ? quizData.published : false,
            shuffleAnswers: quizData.shuffleAnswers !== undefined ? quizData.shuffleAnswers : defaults.shuffleAnswers,
            multipleAttempts: quizData.multipleAttempts || false,
            maxAttempts: quizData.maxAttempts || 1,
            showCorrectAnswers: quizData.showCorrectAnswers || false,
            accessCode: quizData.accessCode || "",
            oneQuestionAtTime: quizData.oneQuestionAtTime !== undefined ? quizData.oneQuestionAtTime : defaults.oneQuestionAtTime,
            webcamRequired: quizData.webcamRequired !== undefined ? quizData.webcamRequired : defaults.webcamRequired,
            lockQuestionsAfterAnswering: quizData.lockQuestionsAfterAnswering || false,
            submissions: []
        };

        const validTypes = [
            "Graded Quiz", "Practice Quiz", "Graded Survey", "Ungraded Survey",
            "Exam", "Midterm Exam", "Final Exam", "Comprehensive Exam"
        ];
        if (!validTypes.includes(newQuiz.type)) {
            throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        const created = await model.create(newQuiz);

        console.log(`created ${isExam ? 'exam' : 'quiz'}: ${created.title}`);
        console.log(`   id: ${created._id}`);

        // auto create submissions
        try {
            console.log("auto-creating submissions for students");
            await initializeQuizSubmissions(created._id, created.course, created.points);
        } catch (error) {
            console.log("could not auto-create submissions:", error.message);
        }

        // auto create grades
        try {
            console.log("auto-creating grade records");
            const gradesDao = await import("../Grades/dao.js");
            await gradesDao.createGradesForAssessment(
                created._id,
                created.course,
                created.points
            );
        } catch (gradeError) {
            console.log("could not auto-create grades:", gradeError.message);
        }

        return created;
    } catch (error) {
        console.error("error creating quiz:", error.message);
        throw error;
    }
}

// placeholder submissions for students
async function initializeQuizSubmissions(quizId, courseId, maxPoints) {
    try {
        const enrollmentModel = (await import("../Enrollments/model.js")).default;

        const enrollments = await enrollmentModel.find({
            course: courseId,
            status: "ENROLLED"
        });

        const submissions = [];

        for (const enrollment of enrollments) {
            const user = await userModel.findById(enrollment.user);

            if (user && user.role === 'STUDENT') {
                const submissionId = await generateSubmissionId(quizId, user._id, courseId, 0);

                submissions.push({
                    _id: submissionId,
                    student: user._id,
                    score: null,
                    submittedDate: null,
                    status: "Not Submitted",
                    answers: [],
                    timeSpent: 0,
                    startTime: null,
                    endTime: null,
                    feedback: "",
                    gradedBy: null,
                    attemptNumber: 0
                });
            }
        }

        await model.updateOne(
            { _id: quizId },
            { $set: { submissions: submissions } }
        );

        console.log(`created ${submissions.length} placeholder submissions`);

        return submissions;
    } catch (error) {
        console.error("error creating submissions:", error);
        throw error;
    }
}

// get all quizzes for course
export async function findQuizzesForCourse(courseId) {
    try {
        if (!courseId) {
            console.error("courseId required");
            return [];
        }

        const courseExists = await courseModel.findById(courseId);
        if (!courseExists) {
            console.log(`course not found: ${courseId}`);
            return [];
        }

        const quizzes = await model.find({ course: courseId }).sort({ dueDate: 1 });

        const quizCount = quizzes.filter(q => !q.type.includes("Exam")).length;
        const examCount = quizzes.filter(q => q.type.includes("Exam")).length;

        console.log(`found ${quizzes.length} assessments for ${courseId}`);
        console.log(`   quizzes: ${quizCount}, exams: ${examCount}`);

        return quizzes;
    } catch (error) {
        console.error("error finding quizzes:", error);
        return [];
    }
}

// quizzes only
export async function findOnlyQuizzes(courseId) {
    try {
        const allQuizzes = await model.find({
            course: courseId,
            type: { $nin: ["Exam", "Midterm Exam", "Final Exam", "Comprehensive Exam"] }
        }).sort({ dueDate: 1 });

        console.log(`found ${allQuizzes.length} quizzes`);

        return allQuizzes;
    } catch (error) {
        console.error("error finding quizzes:", error);
        return [];
    }
}

// exams only
export async function findOnlyExams(courseId) {
    try {
        const allExams = await model.find({
            course: courseId,
            type: { $in: ["Exam", "Midterm Exam", "Final Exam", "Comprehensive Exam"] }
        }).sort({ dueDate: 1 });

        console.log(`found ${allExams.length} exams`);

        return allExams;
    } catch (error) {
        console.error("error finding exams:", error);
        return [];
    }
}

// find by id
export async function findQuizById(quizId) {
    try {
        const quiz = await model.findById(quizId);

        if (quiz) {
            const itemType = quiz.type.includes("Exam") ? "exam" : "quiz";
            console.log(`found ${itemType}: ${quiz.title}`);
        } else {
            console.log(`quiz not found: ${quizId}`);
        }

        return quiz;
    } catch (error) {
        console.error("error finding quiz:", error);
        return null;
    }
}

// update quiz
export async function updateQuiz(quizId, quizUpdates) {
    try {
        if (!quizId) {
            throw new Error("quizId is required");
        }

        const existing = await model.findById(quizId);
        if (!existing) {
            console.log(`quiz not found: ${quizId}`);
            return null;
        }

        if (quizUpdates.type) {
            const validTypes = [
                "Graded Quiz", "Practice Quiz", "Graded Survey", "Ungraded Survey",
                "Exam", "Midterm Exam", "Final Exam", "Comprehensive Exam"
            ];
            if (!validTypes.includes(quizUpdates.type)) {
                throw new Error(`Invalid type. Must be: ${validTypes.join(', ')}`);
            }
        }

        // log questions
        if (quizUpdates.questions && quizUpdates.questions.length > 0) {
            console.log(`updating ${quizUpdates.questions.length} questions`);
            quizUpdates.questions.forEach((q, i) => {
                console.log(`   Q${i + 1}: type=${q.type}, title="${q.title || ''}", pts=${q.points}`);
            });
        }

        const updated = await model.findOneAndUpdate(
            { _id: quizId },
            { $set: quizUpdates },
            { new: true, runValidators: true }
        );

        const itemType = updated.type.includes("Exam") ? "exam" : "quiz";
        console.log(`updated ${itemType}: ${updated.title}`);

        // sync grades
        if (quizUpdates.points) {
            try {
                const gradeModel = (await import("../Grades/model.js")).default;
                await gradeModel.updateMany(
                    { assignment: quizId },
                    { $set: { maxPoints: quizUpdates.points } }
                );
                console.log("updated grade max points");
            } catch (gradeError) {
                console.log("could not update grades:", gradeError.message);
            }
        }

        return updated;
    } catch (error) {
        console.error("error updating quiz:", error.message);
        throw error;
    }
}

// delete quiz
export async function deleteQuiz(quizId) {
    try {
        if (!quizId) {
            throw new Error("quizId is required");
        }

        const quiz = await model.findById(quizId);
        if (!quiz) {
            console.log(`quiz not found: ${quizId}`);
            return {
                message: "Quiz not found",
                deleted: false
            };
        }

        const itemType = quiz.type.includes("Exam") ? "exam" : "quiz";

        console.log(`deleting ${itemType}: ${quiz.title}`);

        // cleanup grades
        let deletedGradesCount = 0;
        try {
            const gradesDao = await import("../Grades/dao.js");
            deletedGradesCount = await gradesDao.deleteGradesForAssessment(quizId);
        } catch (error) {
            console.log("grades cleanup skipped:", error.message);
        }

        await model.deleteOne({ _id: quizId });

        console.log(`${itemType} deleted`);

        return {
            message: `${itemType} deleted successfully`,
            deleted: true,
            title: quiz.title,
            deletedSubmissions: quiz.submissions?.length || 0,
            deletedGrades: deletedGradesCount
        };
    } catch (error) {
        console.error("error deleting quiz:", error.message);
        throw error;
    }
}

// add question
export async function addQuestion(quizId, questionData) {
    try {
        console.log(`adding question to ${quizId}`);

        const quiz = await model.findById(quizId);
        if (!quiz) {
            throw new Error("Quiz not found");
        }

        const questionId = `${quizId}-Q${quiz.questions.length + 1}`;

        const newQuestion = {
            _id: questionData._id || questionId,
            title: questionData.title || "",
            questionText: questionData.questionText || "",
            points: questionData.points || 1,
            type: questionData.type || "Multiple Choice",
            // multiple choice
            ...(questionData.type === "Multiple Choice" && {
                options: questionData.options || [
                    { text: "Option 1", isCorrect: true },
                    { text: "Option 2", isCorrect: false }
                ]
            }),
            // true/false
            ...(questionData.type === "True/False" && {
                correctAnswer: questionData.correctAnswer !== undefined ? questionData.correctAnswer : true
            }),
            // fill in blank
            ...(questionData.type === "Fill in the Blank" && {
                possibleAnswers: questionData.possibleAnswers || [],
                caseSensitive: questionData.caseSensitive || false,
                blanks: questionData.blanks || []
            })
        };

        console.log(`   title: "${newQuestion.title}"`);
        console.log(`   type: ${newQuestion.type}`);
        console.log(`   points: ${newQuestion.points}`);

        quiz.questions.push(newQuestion);
        quiz.points = quiz.questions.reduce((sum, q) => sum + q.points, 0);

        await quiz.save();

        console.log(`added question: ${newQuestion._id}`);

        return quiz;
    } catch (error) {
        console.error("error adding question:", error);
        throw error;
    }
}

// update question
export async function updateQuestion(quizId, questionId, questionUpdates) {
    try {
        console.log(`updating question ${questionId} in ${quizId}`);

        const quiz = await model.findById(quizId);
        if (!quiz) {
            throw new Error("Quiz not found");
        }

        const questionIndex = quiz.questions.findIndex(q => q._id === questionId);
        if (questionIndex === -1) {
            throw new Error("Question not found");
        }

        // merge updates
        const existingQuestion = quiz.questions[questionIndex].toObject();

        const updatedQuestion = {
            ...existingQuestion,
            ...questionUpdates,
            title: questionUpdates.title !== undefined ? questionUpdates.title : (existingQuestion.title || "")
        };

        console.log(`   old title: "${existingQuestion.title || ''}"`);
        console.log(`   new title: "${updatedQuestion.title}"`);
        console.log(`   type: ${updatedQuestion.type}`);

        quiz.questions[questionIndex] = updatedQuestion;
        quiz.points = quiz.questions.reduce((sum, q) => sum + q.points, 0);

        quiz.markModified('questions');
        await quiz.save();

        console.log("updated question");

        return quiz;
    } catch (error) {
        console.error("error updating question:", error);
        throw error;
    }
}

// delete question
export async function deleteQuestion(quizId, questionId) {
    try {
        console.log(`deleting question ${questionId} from ${quizId}`);

        const quiz = await model.findById(quizId);
        if (!quiz) {
            throw new Error("Quiz not found");
        }

        quiz.questions = quiz.questions.filter(q => q._id !== questionId);
        quiz.points = quiz.questions.reduce((sum, q) => sum + q.points, 0);

        await quiz.save();

        console.log("deleted question");

        return quiz;
    } catch (error) {
        console.error("error deleting question:", error);
        throw error;
    }
}

// submit quiz
export async function submitQuiz(quizId, studentId, submissionData) {
    try {
        console.log(`submitting ${quizId} for student ${studentId}`);

        const quiz = await model.findById(quizId);
        if (!quiz) {
            throw new Error("Quiz not found");
        }

        // real submissions only
        const actualSubmissions = quiz.submissions.filter(s => {
            const sStudentId = typeof s.student === 'object' ? s.student.toString() : s.student;
            return sStudentId === studentId && s.status !== "Not Submitted";
        });

        // check attempts
        if (!quiz.multipleAttempts && actualSubmissions.length > 0) {
            throw new Error("Multiple attempts not allowed");
        }

        if (quiz.multipleAttempts && quiz.maxAttempts && actualSubmissions.length >= quiz.maxAttempts) {
            throw new Error(`Maximum attempts (${quiz.maxAttempts}) reached`);
        }

        const attemptNumber = actualSubmissions.length + 1;
        const submissionId = await generateSubmissionId(quizId, studentId, quiz.course, attemptNumber);

        // grade answers
        let totalScore = 0;
        const gradedAnswers = [];

        for (const answer of submissionData.answers || []) {
            const question = quiz.questions.find(q => q._id === answer.questionId);
            if (!question) continue;

            let isCorrect = false;
            let pointsEarned = 0;

            if (question.type === "Multiple Choice") {
                const correctOption = question.options?.find(opt => opt.isCorrect);
                isCorrect = correctOption && answer.answer === correctOption.text;
                pointsEarned = isCorrect ? question.points : 0;
            } else if (question.type === "True/False") {
                isCorrect = answer.answer === question.correctAnswer;
                pointsEarned = isCorrect ? question.points : 0;
            } else if (question.type === "Fill in the Blank") {
                // per-blank scoring
                if (question.blanks && question.blanks.length > 0 && typeof answer.answer === 'object' && !Array.isArray(answer.answer)) {
                    const studentAnswers = answer.answer;
                    let blankScore = 0;

                    question.blanks.forEach((blank, idx) => {
                        const studentAns = studentAnswers[`blank${idx}`] || "";
                        const normalizedStudent = question.caseSensitive ? studentAns.trim() : studentAns.trim().toLowerCase();

                        // check primary
                        const normalizedPrimary = question.caseSensitive ? blank.primary.trim() : blank.primary.trim().toLowerCase();
                        let blankCorrect = normalizedStudent === normalizedPrimary;

                        // check alternatives
                        if (!blankCorrect && blank.alternatives) {
                            blankCorrect = blank.alternatives.some(alt => {
                                const normalizedAlt = question.caseSensitive ? alt.trim() : alt.trim().toLowerCase();
                                return normalizedStudent === normalizedAlt;
                            });
                        }

                        if (blankCorrect) {
                            blankScore += blank.points || 0;
                        }
                    });

                    pointsEarned = blankScore;
                    isCorrect = pointsEarned === question.points;
                } else {
                    // legacy
                    const studentAns = Array.isArray(answer.answer) ? answer.answer[0] : answer.answer;
                    const normalizedStudent = question.caseSensitive ? String(studentAns).trim() : String(studentAns).trim().toLowerCase();

                    isCorrect = question.possibleAnswers?.some(possible => {
                        const alternatives = possible.split("|").map(a => a.trim());
                        return alternatives.some(alt => {
                            const normalizedAlt = question.caseSensitive ? alt : alt.toLowerCase();
                            return normalizedStudent === normalizedAlt;
                        });
                    });
                    pointsEarned = isCorrect ? question.points : 0;
                }
            }

            totalScore += pointsEarned;
            gradedAnswers.push({
                questionId: answer.questionId,
                answer: answer.answer,
                isCorrect,
                pointsEarned
            });
        }

        const isLate = new Date() > new Date(quiz.dueDate);

        const newSubmission = {
            _id: submissionId,
            student: studentId,
            score: totalScore,
            submittedDate: new Date().toISOString(),
            status: isLate ? "Late" : "Submitted",
            answers: gradedAnswers,
            timeSpent: submissionData.timeSpent || 0,
            startTime: submissionData.startTime || null,
            endTime: new Date().toISOString(),
            feedback: "",
            gradedBy: null,
            attemptNumber: attemptNumber
        };

        // update or add
        const placeholderIndex = quiz.submissions.findIndex(s => {
            const sStudentId = typeof s.student === 'object' ? s.student.toString() : s.student;
            return sStudentId === studentId && s.status === "Not Submitted";
        });

        if (placeholderIndex !== -1 && attemptNumber === 1) {
            quiz.submissions[placeholderIndex] = newSubmission;
        } else {
            quiz.submissions.push(newSubmission);
        }

        quiz.markModified('submissions');
        await quiz.save();

        console.log(`submitted quiz: ${totalScore}/${quiz.points} (attempt ${attemptNumber})`);

        // update grade
        try {
            const gradesDao = await import("../Grades/dao.js");
            await gradesDao.upsertGrade({
                student: studentId,
                assignment: quizId,
                course: quiz.course,
                grade: totalScore,
                maxPoints: quiz.points,
                status: isLate ? "Late" : "Submitted",
                submittedDate: new Date().toISOString()
            });

            console.log("updated grade record");
        } catch (gradeError) {
            console.log("could not update grade:", gradeError.message);
        }

        const updatedQuiz = await model.findById(quizId);
        return updatedQuiz;

    } catch (error) {
        console.error("error submitting quiz:", error.message);
        throw error;
    }
}

// grade submission
export async function gradeQuizSubmission(quizId, studentId, score, feedback = "", gradedBy = null) {
    try {
        console.log(`grading quiz ${quizId} for student ${studentId}`);
        console.log(`   score: ${score}`);

        const quiz = await model.findById(quizId);
        if (!quiz) {
            throw new Error("Quiz not found");
        }

        // find latest
        const studentSubmissions = quiz.submissions.filter(s => {
            const sStudentId = typeof s.student === 'object' ? s.student.toString() : s.student;
            return sStudentId === studentId && s.status !== "Not Submitted";
        });

        if (studentSubmissions.length === 0) {
            throw new Error("Submission not found");
        }

        const latestSubmission = studentSubmissions[studentSubmissions.length - 1];
        const submissionIndex = quiz.submissions.findIndex(s => s._id === latestSubmission._id);

        if (submissionIndex === -1) {
            throw new Error("Submission not found");
        }

        quiz.submissions[submissionIndex].score = score;
        quiz.submissions[submissionIndex].status = "Graded";
        quiz.submissions[submissionIndex].feedback = feedback;
        quiz.submissions[submissionIndex].gradedBy = gradedBy;

        quiz.markModified('submissions');
        await quiz.save();

        console.log("graded submission");

        // update grade
        try {
            const gradesDao = await import("../Grades/dao.js");
            await gradesDao.upsertGrade({
                student: studentId,
                assignment: quizId,
                course: quiz.course,
                grade: score,
                maxPoints: quiz.points,
                status: "Graded",
                feedback: feedback,
                gradedBy: gradedBy,
                gradedDate: new Date().toISOString()
            });

            console.log("updated grade record");
        } catch (gradeError) {
            console.log("could not update grade:", gradeError.message);
        }

        return quiz;
    } catch (error) {
        console.error("error grading quiz:", error);
        throw error;
    }
}

// get submission
export async function getQuizSubmission(quizId, studentId) {
    try {
        const quiz = await model.findById(quizId);
        if (!quiz) {
            return null;
        }

        // latest real submission
        const studentSubmissions = quiz.submissions.filter(s => {
            const sStudentId = typeof s.student === 'object' ? s.student.toString() : s.student;
            return sStudentId === studentId && s.status !== "Not Submitted";
        });

        if (studentSubmissions.length === 0) {
            return null;
        }

        const latestSubmission = studentSubmissions[studentSubmissions.length - 1];
        console.log(`found submission: ${latestSubmission.score ?? 'not graded'}/${quiz.points}`);

        return latestSubmission;
    } catch (error) {
        console.error("error getting submission:", error);
        return null;
    }
}

// search quizzes
export async function searchQuizzes(courseId, searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim() === '') {
            return await findQuizzesForCourse(courseId);
        }

        const regex = new RegExp(searchTerm.trim(), "i");

        const quizzes = await model.find({
            course: courseId,
            title: { $regex: regex }
        }).sort({ dueDate: 1 });

        console.log(`found ${quizzes.length} quizzes matching "${searchTerm}"`);

        return quizzes;
    } catch (error) {
        console.error("error searching quizzes:", error);
        return [];
    }
}

// quiz stats
export async function getQuizStatistics(courseId) {
    try {
        const quizzes = await model.find({ course: courseId });

        const now = new Date();

        const stats = {
            total: quizzes.length,
            quizzes: quizzes.filter(q => !q.type.includes("Exam")).length,
            exams: quizzes.filter(q => q.type.includes("Exam")).length,
            byType: {},
            byStatus: {
                upcoming: quizzes.filter(q => new Date(q.dueDate) > now).length,
                overdue: quizzes.filter(q => new Date(q.dueDate) < now).length
            },
            published: quizzes.filter(q => q.published).length,
            unpublished: quizzes.filter(q => !q.published).length,
            totalPoints: quizzes.reduce((sum, q) => sum + (q.points || 0), 0),
            totalQuestions: quizzes.reduce((sum, q) => sum + (q.questions?.length || 0), 0),
            totalSubmissions: quizzes.reduce((sum, q) => sum + (q.submissions?.length || 0), 0),
            gradedSubmissions: 0
        };

        quizzes.forEach(quiz => {
            stats.byType[quiz.type] = (stats.byType[quiz.type] || 0) + 1;

            const graded = quiz.submissions?.filter(s => s.score !== null && s.status !== "Not Submitted").length || 0;
            stats.gradedSubmissions += graded;
        });

        console.log(`stats: ${stats.total} total (${stats.quizzes} quizzes, ${stats.exams} exams)`);

        return stats;
    } catch (error) {
        console.error("error getting stats:", error);
        return null;
    }
}

// validate data
export function validateQuizData(quizData) {
    const errors = [];

    if (!quizData.title || quizData.title.trim().length === 0) {
        errors.push("Quiz title is required");
    }

    if (quizData.title && quizData.title.length > 200) {
        errors.push("Title cannot exceed 200 characters");
    }

    if (quizData.points !== undefined) {
        const points = parseInt(quizData.points);
        if (isNaN(points) || points < 0 || points > 1000) {
            errors.push("Points must be between 0 and 1000");
        }
    }

    if (quizData.questions !== undefined && Array.isArray(quizData.questions)) {
        if (quizData.questions.length > 500) {
            errors.push("Quiz cannot have more than 500 questions");
        }
    }

    if (quizData.timeLimit !== undefined) {
        const timeLimit = parseInt(quizData.timeLimit);
        if (isNaN(timeLimit) || timeLimit < 1 || timeLimit > 600) {
            errors.push("Time limit must be between 1 and 600 minutes");
        }
    }

    if (quizData.dueDate && quizData.availableDate) {
        if (new Date(quizData.dueDate) < new Date(quizData.availableDate)) {
            errors.push("Due date must be after available date");
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}