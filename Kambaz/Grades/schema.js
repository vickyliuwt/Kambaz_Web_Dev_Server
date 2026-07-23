// Kambaz/Grades/schema.js
// grade data structure

import mongoose from "mongoose";

// define grade
const gradeSchema = new mongoose.Schema(
    {
        // custom ID
        _id: {
            type: String,
            required: true
        },

        // which student
        student: {
            type: String,
            ref: "UserModel",
            required: [true, "Student ID is required"]
        },

        // which assessment
        assignment: {
            type: String,
            required: [true, "Assessment ID is required"]
        },

        // which course
        course: {
            type: String,
            ref: "CourseModel",
            required: [true, "Course ID is required"]
        },

        // assessment type
        assessmentType: {
            type: String,
            enum: {
                values: ["ASSIGNMENT", "PROJECT", "QUIZ", "EXAM"],
                message: "Invalid assessment type"
            }
        },

        // score
        grade: {
            type: Number,
            min: [0, "Grade can't be negative"],
            max: [1000, "Grade can't be more than 1000"],
            default: null
        },

        // max points
        maxPoints: {
            type: Number,
            required: [true, "Max points is required"],
            min: [0, "Max points can't be negative"]
        },

        // when submitted
        submittedDate: {
            type: String,
            default: null
        },

        // submission status
        status: {
            type: String,
            enum: {
                values: ["Submitted", "Not Submitted", "Completed", "Not Available", "Graded", "Late"],
                message: "Invalid status"
            },
            default: "Not Submitted"
        },

        // grader comments
        feedback: {
            type: String,
            maxlength: [2000, "Feedback can't be more than 2000 characters"],
            default: ""
        },

        // when graded
        gradedDate: {
            type: String,
            default: null
        },

        // who graded
        gradedBy: {
            type: String,
            ref: "UserModel",
            default: null
        }
    },
    {
        collection: "grades",
        timestamps: true
    }
);

// indexes for speed
gradeSchema.index({ student: 1, course: 1 });
gradeSchema.index({ assignment: 1, course: 1 });
gradeSchema.index({ status: 1, grade: 1 });
gradeSchema.index({ course: 1, assessmentType: 1 });

// computed fields
gradeSchema.virtual("percentage").get(function() {
    if (this.grade === null || this.maxPoints === 0) {
        return null;
    }
    return ((this.grade / this.maxPoints) * 100).toFixed(2);
});

gradeSchema.virtual("isGraded").get(function() {
    return this.grade !== null && this.grade !== undefined;
});

gradeSchema.virtual("isPassing").get(function() {
    if (this.grade === null || this.maxPoints === 0) {
        return null;
    }
    return (this.grade / this.maxPoints) >= 0.6;
});

gradeSchema.virtual("letterGrade").get(function() {
    if (this.grade === null || this.maxPoints === 0) {
        return "N/A";
    }

    const percentage = (this.grade / this.maxPoints) * 100;

    if (percentage >= 93) return "A";
    if (percentage >= 90) return "A-";
    if (percentage >= 87) return "B+";
    if (percentage >= 83) return "B";
    if (percentage >= 80) return "B-";
    if (percentage >= 77) return "C+";
    if (percentage >= 73) return "C";
    if (percentage >= 70) return "C-";
    if (percentage >= 67) return "D+";
    if (percentage >= 63) return "D";
    if (percentage >= 60) return "D-";
    return "F";
});

gradeSchema.virtual("isQuizOrExam").get(function() {
    return this.assessmentType === "QUIZ" || this.assessmentType === "EXAM";
});

gradeSchema.set("toJSON", { virtuals: true });
gradeSchema.set("toObject", { virtuals: true });

// auto-set type before save
gradeSchema.pre("save", function(next) {
    if (this.assignment && !this.assessmentType) {
        const prefix = this.assignment.charAt(0);

        switch(prefix) {
            case 'A':
                this.assessmentType = "ASSIGNMENT";
                break;
            case 'P':
                this.assessmentType = "PROJECT";
                break;
            case 'Q':
                this.assessmentType = "QUIZ";
                break;
            case 'E':
                this.assessmentType = "EXAM";
                break;
            default:
                this.assessmentType = "ASSIGNMENT";
        }
    }

    next();
});

export default gradeSchema;