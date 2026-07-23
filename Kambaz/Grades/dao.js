// Kambaz/Grades/dao.js
// grade database operations

import model from "./model.js";
import userModel from "../Users/model.js";
import courseModel from "../Courses/model.js";

// make grade ID
async function generateGradeId(studentId, assessmentId, courseId) {
    try {
        const student = await userModel.findById(studentId);
        if (!student) {
            console.log(`   ⚠️ student not found, using fallback`);
            return `G-${assessmentId}-${courseId}-${studentId}`;
        }

        const course = await courseModel.findById(courseId);
        if (!course) {
            console.log(`   ⚠️ course not found, using fallback`);
            return `G-${assessmentId}-${student.loginId}`;
        }

        const itemMatch = assessmentId.match(/^([AQEP]\d+)-/);
        const itemType = itemMatch ? itemMatch[1] : assessmentId.substring(0, 2);

        const gradeId = `G-${itemType}-${course.number}-${student.loginId}`;

        console.log(`   🆔 generated id: ${gradeId}`);
        console.log(`      student: ${student.firstName} ${student.lastName} (${student.loginId})`);
        console.log(`      assessment: ${itemType}`);

        return gradeId;
    } catch (error) {
        console.error("   ❌ error:", error);
        return `G-${assessmentId}-${studentId}`;
    }
}

// get assessment type
function getAssessmentType(assessmentId) {
    const prefix = assessmentId.charAt(0);

    switch(prefix) {
        case 'A': return "ASSIGNMENT";
        case 'P': return "PROJECT";
        case 'Q': return "QUIZ";
        case 'E': return "EXAM";
        default: return "ASSIGNMENT";
    }
}

// get course grades
export async function findGradesForCourse(courseId) {
    try {
        if (!courseId) {
            console.error("   ❌ courseId required");
            return [];
        }

        console.log(`   📊 finding grades for: ${courseId}`);

        const grades = await model.find({ course: courseId })
            .sort({ submittedDate: -1 });

        const assignments = grades.filter(g => g.assessmentType === 'ASSIGNMENT').length;
        const projects = grades.filter(g => g.assessmentType === 'PROJECT').length;
        const quizzes = grades.filter(g => g.assessmentType === 'QUIZ').length;
        const exams = grades.filter(g => g.assessmentType === 'EXAM').length;
        const graded = grades.filter(g => g.grade !== null).length;

        console.log(`   ✅ found ${grades.length} grades`);
        console.log(`      assignments: ${assignments}, projects: ${projects}`);
        console.log(`      quizzes: ${quizzes}, exams: ${exams}`);
        console.log(`      graded: ${graded}/${grades.length}`);

        return grades;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}

// get student grades
export async function findGradesForStudent(studentId) {
    try {
        if (!studentId) {
            return [];
        }

        console.log(`   📊 finding grades for: ${studentId}`);

        const grades = await model.find({ student: studentId })
            .sort({ submittedDate: -1 });

        console.log(`   ✅ found ${grades.length} grades`);

        return grades;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}

// get specific grade
export async function findGradeForAssignment(studentId, assessmentId) {
    try {
        const grade = await model.findOne({
            student: studentId,
            assignment: assessmentId
        });

        if (grade) {
            const assessmentType = grade.assessmentType || getAssessmentType(assessmentId);
            console.log(`   📊 found grade: ${grade.grade ?? 'not graded'}/${grade.maxPoints} (${assessmentType})`);
        }

        return grade;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}

// create or update grade
export async function upsertGrade(gradeData) {
    try {
        const { student, assignment, course } = gradeData;

        if (!student || !assignment || !course) {
            throw new Error("Student, assignment, and course IDs are required");
        }

        const assessmentType = gradeData.assessmentType || getAssessmentType(assignment);

        console.log(`   💾 upserting grade:`);
        console.log(`      student: ${student}`);
        console.log(`      assessment: ${assignment} (${assessmentType})`);
        console.log(`      grade: ${gradeData.grade ?? 'not set'}/${gradeData.maxPoints}`);

        const existingGrade = await model.findOne({ student, assignment });

        if (existingGrade) {
            // update
            console.log(`   ℹ️ exists, updating...`);
            console.log(`      old: ${existingGrade.grade ?? 'not graded'}/${existingGrade.maxPoints}`);

            await model.updateOne(
                { _id: existingGrade._id },
                {
                    $set: {
                        ...gradeData,
                        assessmentType,
                        gradedDate: gradeData.grade !== null ? new Date().toISOString() : null
                    }
                }
            );

            const updated = await model.findById(existingGrade._id);

            console.log(`   ✅ updated`);
            console.log(`      new: ${updated.grade ?? 'not graded'}/${updated.maxPoints}`);
            console.log(`      status: ${updated.status}`);

            return updated;
        } else {
            // create
            console.log(`   ℹ️ creating new...`);

            const gradeId = await generateGradeId(student, assignment, course);

            const newGrade = {
                ...gradeData,
                _id: gradeId,
                assessmentType,
                submittedDate: gradeData.submittedDate || null,
                gradedDate: gradeData.grade !== null ? new Date().toISOString() : null,
                status: gradeData.status || "Not Submitted"
            };

            const created = await model.create(newGrade);

            console.log(`   ✅ created`);
            console.log(`      id: ${created._id}`);
            console.log(`      type: ${created.assessmentType}`);

            return created;
        }
    } catch (error) {
        console.error("   ❌ error:", error.message);
        throw error;
    }
}

// auto-create grades for all students
export async function createGradesForAssessment(assessmentId, courseId, maxPoints) {
    try {
        const assessmentType = getAssessmentType(assessmentId);

        console.log(`   📝 auto-creating grades for ${assessmentType}`);
        console.log(`      assessment: ${assessmentId}`);
        console.log(`      course: ${courseId}`);
        console.log(`      max points: ${maxPoints}`);

        const enrollmentModel = (await import("../Enrollments/model.js")).default;
        const enrollments = await enrollmentModel.find({
            course: courseId,
            status: "ENROLLED"
        });

        console.log(`      found ${enrollments.length} enrollments`);

        const studentEnrollments = [];
        for (const enrollment of enrollments) {
            const user = await userModel.findById(enrollment.user);
            if (user && user.role === 'STUDENT') {
                studentEnrollments.push({ ...enrollment, user });
            }
        }

        console.log(`      creating for ${studentEnrollments.length} students...`);

        const createdGrades = [];

        for (const enrollment of studentEnrollments) {
            const student = enrollment.user;

            const existing = await model.findOne({
                student: student._id,
                assignment: assessmentId
            });

            if (existing) {
                console.log(`      ℹ️ exists for ${student.username}`);
                createdGrades.push(existing);
                continue;
            }

            const gradeId = await generateGradeId(student._id, assessmentId, courseId);

            const gradeData = {
                _id: gradeId,
                student: student._id,
                assignment: assessmentId,
                course: courseId,
                assessmentType,
                grade: null,
                maxPoints: maxPoints,
                submittedDate: null,
                status: "Not Submitted",
                feedback: "",
                gradedDate: null,
                gradedBy: null
            };

            const created = await model.create(gradeData);
            createdGrades.push(created);

            console.log(`      ✔ created: ${gradeId} for ${student.username}`);
        }

        console.log(`   ✅ created ${createdGrades.length} grades`);
        console.log(`   💡 all students have grades now`);

        return createdGrades;
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// delete grade
export async function deleteGrade(gradeId) {
    try {
        if (!gradeId) {
            throw new Error("gradeId is required");
        }

        const grade = await model.findById(gradeId);
        if (!grade) {
            return { message: "Grade not found", deleted: 0 };
        }

        console.log(`   🗑️ deleting: ${gradeId}`);

        await model.deleteOne({ _id: gradeId });

        console.log(`   ✅ deleted`);

        return {
            message: "Grade deleted successfully",
            deleted: 1
        };
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// delete grades for assessment
export async function deleteGradesForAssessment(assessmentId) {
    try {
        const assessmentType = getAssessmentType(assessmentId);

        const result = await model.deleteMany({ assignment: assessmentId });

        console.log(`   🗑️ deleted ${result.deletedCount} ${assessmentType} grades`);

        return result.deletedCount;
    } catch (error) {
        console.error("   ❌ error:", error);
        return 0;
    }
}

// delete grades for student
export async function deleteGradesForStudent(studentId) {
    try {
        const result = await model.deleteMany({ student: studentId });

        console.log(`   🗑️ deleted ${result.deletedCount} grades for student`);

        return result.deletedCount;
    } catch (error) {
        console.error("   ❌ error:", error);
        return 0;
    }
}
export async function findGradesForStudentInCourse(studentId, courseId) {
    try {
        if (!studentId || !courseId) {
            console.error("   ❌ studentId and courseId required");
            return [];
        }

        console.log(`   📊 finding grades for student ${studentId} in course ${courseId}`);

        const grades = await model.find({
            student: studentId,
            course: courseId
        }).sort({ submittedDate: -1 });

        console.log(`   ✅ found ${grades.length} grades for this student in this course`);

        if (grades.length > 0) {
            const graded = grades.filter(g => g.grade !== null).length;
            const pending = grades.length - graded;
            console.log(`      graded: ${graded}, pending: ${pending}`);
        }

        return grades;
    } catch (error) {
        console.error("   ❌ error finding student grades in course:", error);
        return [];
    }
}

// delete grades for course
export async function deleteGradesForCourse(courseId) {
    try {
        const result = await model.deleteMany({ course: courseId });

        console.log(`   🗑️ deleted ${result.deletedCount} grades for course`);

        return result.deletedCount;
    } catch (error) {
        console.error("   ❌ error:", error);
        return 0;
    }
}

// get course stats
export async function getCourseGradeStatistics(courseId) {
    try {
        const grades = await model.find({
            course: courseId,
            grade: { $ne: null }
        });

        if (grades.length === 0) {
            return {
                courseId,
                count: 0,
                byType: {},
                average: 0,
                highest: 0,
                lowest: 0
            };
        }

        const percentages = grades.map(g => (g.grade / g.maxPoints) * 100);
        const sorted = percentages.sort((a, b) => a - b);

        const byType = {
            ASSIGNMENT: grades.filter(g => g.assessmentType === 'ASSIGNMENT').length,
            PROJECT: grades.filter(g => g.assessmentType === 'PROJECT').length,
            QUIZ: grades.filter(g => g.assessmentType === 'QUIZ').length,
            EXAM: grades.filter(g => g.assessmentType === 'EXAM').length
        };

        const stats = {
            courseId,
            count: grades.length,
            byType,
            average: (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(2),
            highest: Math.max(...percentages).toFixed(2),
            lowest: Math.min(...percentages).toFixed(2),
            median: sorted[Math.floor(sorted.length / 2)].toFixed(2)
        };

        console.log(`   📊 stats: ${stats.count} graded`);
        console.log(`      by type: A:${byType.ASSIGNMENT} P:${byType.PROJECT} Q:${byType.QUIZ} E:${byType.EXAM}`);
        console.log(`      average: ${stats.average}%`);

        return stats;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}

// validate data
export function validateGradeData(gradeData) {
    const errors = [];

    if (!gradeData.student) errors.push("Student ID is required");
    if (!gradeData.assignment) errors.push("Assessment ID is required");
    if (!gradeData.course) errors.push("Course ID is required");

    if (gradeData.maxPoints === undefined || gradeData.maxPoints === null) {
        errors.push("Max points is required");
    }

    if (gradeData.maxPoints < 0) {
        errors.push("Max points can't be negative");
    }

    if (gradeData.grade !== undefined && gradeData.grade !== null) {
        if (gradeData.grade < 0) {
            errors.push("Grade can't be negative");
        }
        if (gradeData.grade > gradeData.maxPoints) {
            errors.push("Grade can't be more than max points");
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}