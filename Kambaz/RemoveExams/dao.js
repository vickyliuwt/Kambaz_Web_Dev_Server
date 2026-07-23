// Kambaz/Exams/dao.js
// exam database operations

import model from "./model.js";
import courseModel from "../Courses/model.js";
import userModel from "../Users/model.js";
import { v4 as uuidv4 } from "uuid";

// make submission ID
async function generateSubmissionId(examId, studentId, courseId) {
    try {
        const student = await userModel.findById(studentId);
        const course = await courseModel.findById(courseId);

        const studentLogin = student ? student.loginId : studentId;
        const courseNumber = course ? course.number : courseId;

        const examMatch = examId.match(/^(E\d+)-/);
        const examNum = examMatch ? examMatch[1] : examId.substring(0, 2);

        return `ES-${examNum}-${courseNumber}-${studentLogin}`;
    } catch (error) {
        return `ES-${examId}-${studentId}`;
    }
}

// get all exams
export async function findExamsForCourse(courseId) {
    try {
        if (!courseId) {
            console.error("   ❌ courseId required");
            return [];
        }

        const courseExists = await courseModel.findById(courseId);
        if (!courseExists) {
            console.log(`   ⚠️  course not found: ${courseId}`);
            return [];
        }

        const exams = await model.find({ course: courseId }).sort({ dueDate: 1 });

        console.log(`   📄 found ${exams.length} exams for ${courseId}`);

        const totalSubmissions = exams.reduce((sum, e) => sum + (e.submissions?.length || 0), 0);
        console.log(`      total submissions: ${totalSubmissions}`);

        return exams;
    } catch (error) {
        console.error(`   ❌ error:`, error);
        return [];
    }
}

// create exam
export async function createExam(examData) {
    try {
        if (!examData.title) {
            throw new Error("Exam title is required");
        }

        if (!examData.course) {
            throw new Error("Course ID is required");
        }

        const courseExists = await courseModel.findById(examData.course);
        if (!courseExists) {
            throw new Error(`Course ${examData.course} not found`);
        }

        const examId = uuidv4();

        const newExam = {
            _id: examId,
            title: examData.title.trim(),
            course: examData.course,
            type: examData.type || "Comprehensive",
            questions: examData.questions || 50,
            points: examData.points || 100,
            dueDate: examData.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            availableDate: examData.availableDate || new Date().toISOString(),
            timeLimit: examData.timeLimit || 120,
            published: examData.published !== undefined ? examData.published : true,
            submissions: []
        };

        const createdExam = await model.create(newExam);

        console.log(`   📄 created: ${createdExam.title}`);
        console.log(`      type: ${createdExam.type}`);
        console.log(`      questions: ${createdExam.questions}`);
        console.log(`      time: ${createdExam.timeLimit} min`);

        // auto-create submissions
        try {
            console.log(`   📊 auto-creating submissions...`);
            await initializeExamSubmissions(createdExam._id, createdExam.course, createdExam.points);
        } catch (error) {
            console.log(`   ⚠️  could not auto-create:`, error.message);
        }

        return createdExam;
    } catch (error) {
        console.error("   ❌ error:", error.message);
        throw error;
    }
}

// initialize submissions
async function initializeExamSubmissions(examId, courseId, maxPoints) {
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
                const submissionId = await generateSubmissionId(examId, user._id, courseId);

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
                    gradedBy: null
                });
            }
        }

        await model.updateOne(
            { _id: examId },
            { $set: { submissions: submissions } }
        );

        console.log(`   ✅ created ${submissions.length} submissions`);

        return submissions;
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// submit exam
export async function submitExam(examId, studentId, submissionData) {
    try {
        console.log(`   📝 submitting ${examId} for ${studentId}`);

        const exam = await model.findById(examId);
        if (!exam) {
            throw new Error("Exam not found");
        }

        const submissionIndex = exam.submissions.findIndex(
            s => s.student.toString() === studentId
        );

        if (submissionIndex === -1) {
            // create new
            const submissionId = await generateSubmissionId(examId, studentId, exam.course);

            exam.submissions.push({
                _id: submissionId,
                student: studentId,
                score: submissionData.score ?? null,
                submittedDate: new Date().toISOString(),
                status: "Submitted",
                answers: submissionData.answers || [],
                timeSpent: submissionData.timeSpent || 0,
                startTime: submissionData.startTime || null,
                endTime: new Date().toISOString(),
                feedback: ""
            });
        } else {
            // update existing
            exam.submissions[submissionIndex] = {
                ...exam.submissions[submissionIndex],
                score: submissionData.score ?? exam.submissions[submissionIndex].score,
                submittedDate: new Date().toISOString(),
                status: "Submitted",
                answers: submissionData.answers || exam.submissions[submissionIndex].answers,
                timeSpent: submissionData.timeSpent || exam.submissions[submissionIndex].timeSpent,
                endTime: new Date().toISOString()
            };
        }

        await exam.save();

        console.log(`   ✅ saved submission`);

        return exam;
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// grade exam
export async function gradeExamSubmission(examId, studentId, score, feedback = "", gradedBy = null) {
    try {
        console.log(`   ✏️  grading ${examId} for ${studentId}`);
        console.log(`      score: ${score}`);

        const exam = await model.findById(examId);
        if (!exam) {
            throw new Error("Exam not found");
        }

        const submissionIndex = exam.submissions.findIndex(
            s => s.student.toString() === studentId
        );

        if (submissionIndex === -1) {
            throw new Error("Submission not found");
        }

        // update with grade
        exam.submissions[submissionIndex].score = score;
        exam.submissions[submissionIndex].status = "Graded";
        exam.submissions[submissionIndex].feedback = feedback;
        exam.submissions[submissionIndex].gradedBy = gradedBy;

        await exam.save();

        console.log(`   ✅ graded`);
        console.log(`      score: ${score}/${exam.points}`);

        return exam;
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// get student submission
export async function getExamSubmission(examId, studentId) {
    try {
        const exam = await model.findById(examId);
        if (!exam) {
            return null;
        }

        const submission = exam.submissions.find(
            s => s.student.toString() === studentId
        );

        if (submission) {
            console.log(`   📊 found submission: ${submission.score ?? 'not graded'}/${exam.points}`);
        }

        return submission;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}

// update exam
export async function updateExam(examId, examUpdates) {
    try {
        if (!examId) {
            throw new Error("examId is required");
        }

        const existingExam = await model.findById(examId);
        if (!existingExam) {
            console.log(`   ⚠️  not found: ${examId}`);
            return null;
        }

        await model.updateOne(
            { _id: examId },
            { $set: examUpdates }
        );

        const updatedExam = await model.findById(examId);

        console.log(`   ✏️  updated: ${updatedExam.title}`);

        return updatedExam;
    } catch (error) {
        console.error(`   ❌ error:`, error.message);
        throw error;
    }
}

// delete exam
export async function deleteExam(examId) {
    try {
        if (!examId) {
            throw new Error("examId is required");
        }

        const exam = await model.findById(examId);
        if (!exam) {
            console.log(`   ⚠️  not found: ${examId}`);
            return {
                message: "Exam not found",
                deletedExam: false
            };
        }

        console.log(`   🗑️  deleting: ${exam.title}`);
        console.log(`      submissions: ${exam.submissions?.length || 0}`);

        await model.deleteOne({ _id: examId });

        console.log(`   ✅ deleted`);

        return {
            message: "Exam deleted successfully",
            deletedExam: true,
            examTitle: exam.title,
            deletedSubmissions: exam.submissions?.length || 0
        };
    } catch (error) {
        console.error(`   ❌ error:`, error.message);
        throw error;
    }
}

// get stats
export async function getExamStatistics(courseId) {
    try {
        const exams = await model.find({ course: courseId });

        const stats = {
            total: exams.length,
            byType: {},
            totalSubmissions: 0,
            gradedSubmissions: 0,
            totalPoints: exams.reduce((sum, e) => sum + (e.points || 0), 0)
        };

        exams.forEach(exam => {
            stats.byType[exam.type] = (stats.byType[exam.type] || 0) + 1;
            stats.totalSubmissions += exam.submissions?.length || 0;

            const graded = exam.submissions?.filter(s => s.score !== null).length || 0;
            stats.gradedSubmissions += graded;
        });

        console.log(`   📊 stats: ${stats.total} exams, ${stats.totalSubmissions} submissions`);

        return stats;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}