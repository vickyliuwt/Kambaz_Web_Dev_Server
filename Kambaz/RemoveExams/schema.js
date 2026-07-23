// Kambaz/Exams/schema.js
// exam data structure

import mongoose from "mongoose";

// submission structure
const examSubmissionSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },
        student: {
            type: String,
            ref: "UserModel",
            required: true,
            index: true
        },
        score: {
            type: Number,
            min: [0, "Score cannot be negative"],
            max: [1000, "Score cannot exceed max points"],
            default: null
        },
        submittedDate: {
            type: String,
            default: null
        },
        status: {
            type: String,
            enum: ["Not Submitted", "Submitted", "Completed", "Graded", "Late"],
            default: "Not Submitted"
        },
        answers: {
            type: Array,
            default: []
        },
        timeSpent: {
            type: Number,
            default: 0
        },
        startTime: {
            type: String,
            default: null
        },
        endTime: {
            type: String,
            default: null
        },
        feedback: {
            type: String,
            default: ""
        },
        gradedBy: {
            type: String,
            ref: "UserModel",
            default: null
        }
    },
    {
        _id: false
    }
);

// exam structure
const examSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },

        title: {
            type: String,
            required: [true, "Exam title is required"],
            trim: true,
            minlength: [1, "Title must be at least 1 character"],
            maxlength: [200, "Title cannot exceed 200 characters"]
        },

        type: {
            type: String,
            enum: {
                values: ["Comprehensive", "Midterm", "Final", "Multiple Choice", "Essay", "Mixed Format"],
                message: "Invalid exam type"
            },
            default: "Comprehensive"
        },

        questions: {
            type: Number,
            default: 50,
            min: [1, "Must have at least 1 question"],
            max: [500, "Cannot have more than 500 questions"]
        },

        points: {
            type: Number,
            default: 100,
            min: [0, "Points cannot be negative"],
            max: [1000, "Points cannot exceed 1000"]
        },

        dueDate: {
            type: String,
            required: [true, "Due date is required"]
        },

        availableDate: {
            type: String,
            required: [true, "Available date is required"]
        },

        timeLimit: {
            type: Number,
            default: 120,
            min: [1, "Time limit must be at least 1 minute"],
            max: [600, "Time limit cannot exceed 600 minutes"]
        },

        published: {
            type: Boolean,
            default: true
        },

        course: {
            type: String,
            ref: "CourseModel",
            required: [true, "Course ID is required"],
        },

        // embedded submissions
        submissions: {
            type: [examSubmissionSchema],
            default: []
        }
    },
    {
        collection: "exams",
        timestamps: true
    }
);

// indexes for speed
examSchema.index({ course: 1 });
examSchema.index({ dueDate: 1 });
examSchema.index({ published: 1 });
examSchema.index({ course: 1, dueDate: 1 });
examSchema.index({ course: 1, type: 1 });
examSchema.index({ 'submissions.student': 1 });

// computed fields
examSchema.virtual("isOverdue").get(function() {
    return new Date(this.dueDate) < new Date();
});

examSchema.virtual("isAvailable").get(function() {
    return new Date(this.availableDate) <= new Date();
});

examSchema.virtual("submissionCount").get(function() {
    return this.submissions ? this.submissions.length : 0;
});

examSchema.virtual("averageScore").get(function() {
    if (!this.submissions || this.submissions.length === 0) return 0;

    const gradedSubmissions = this.submissions.filter(s => s.score !== null);
    if (gradedSubmissions.length === 0) return 0;

    const total = gradedSubmissions.reduce((sum, s) => sum + s.score, 0);
    return (total / gradedSubmissions.length).toFixed(2);
});

examSchema.set("toJSON", { virtuals: true });
examSchema.set("toObject", { virtuals: true });

// validate before save
examSchema.pre("save", function(next) {
    if (new Date(this.dueDate) < new Date(this.availableDate)) {
        next(new Error("Due date must be after available date"));
    } else {
        next();
    }
});

export default examSchema;