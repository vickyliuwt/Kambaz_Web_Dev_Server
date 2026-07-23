// Kambaz/Enrollments/schema.js
// enrollment data structure

import mongoose from "mongoose";

// links users and courses
const enrollmentSchema = new mongoose.Schema(
    {
        // unique ID
        _id: {
            type: String,
            required: true
        },

        // user reference
        user: {
            type: String,
            ref: "UserModel",
            required: [true, "User ID is required"]
        },

        // course reference
        course: {
            type: String,
            ref: "CourseModel",
            required: [true, "Course ID is required"]
        },

        // when enrolled
        enrollmentDate: {
            type: String,
            default: () => new Date().toISOString()
        },

        // enrollment status
        status: {
            type: String,
            enum: {
                values: ["ENROLLED", "DROPPED", "COMPLETED"],
                message: "Status must be ENROLLED, DROPPED, or COMPLETED"
            },
            default: "ENROLLED"
        },

        // grade info
        grade: {
            type: Number,
            min: [0, "Grade cannot be negative"],
            max: [100, "Grade cannot exceed 100"]
        },

        letterGrade: {
            type: String,
            enum: {
                values: ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", ""],
                message: "Invalid letter grade"
            },
            default: ""
        }
    },
    {
        collection: "enrollments",
        timestamps: true
    }
);

// indexes for speed
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ user: 1 });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ enrollmentDate: 1 });
enrollmentSchema.index({ user: 1, status: 1 });
enrollmentSchema.index({ course: 1, status: 1 });
enrollmentSchema.index({ status: 1, enrollmentDate: -1 });

// computed fields
enrollmentSchema.virtual("isActive").get(function() {
    return this.status === "ENROLLED";
});

enrollmentSchema.virtual("isDropped").get(function() {
    return this.status === "DROPPED";
});

enrollmentSchema.virtual("isCompleted").get(function() {
    return this.status === "COMPLETED";
});

enrollmentSchema.virtual("enrollmentAge").get(function() {
    if (!this.enrollmentDate) return 0;

    const enrollDate = new Date(this.enrollmentDate);
    const now = new Date();
    const diffTime = Math.abs(now - enrollDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

enrollmentSchema.set("toJSON", { virtuals: true });
enrollmentSchema.set("toObject", { virtuals: true });

// validate before save
enrollmentSchema.pre("save", async function(next) {
    try {
        // check user exists
        const UserModel = mongoose.model("UserModel");
        const userExists = await UserModel.findById(this.user);

        if (!userExists) {
            next(new Error(`User ${this.user} not found. Cannot create enrollment for non-existent user.`));
            return;
        }

        // check course exists
        const CourseModel = mongoose.model("CourseModel");
        const courseExists = await CourseModel.findById(this.course);

        if (!courseExists) {
            next(new Error(`Course ${this.course} not found. Cannot create enrollment for non-existent course.`));
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
});

// handle duplicate error
enrollmentSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        next(new Error('User is already enrolled in this course'));
    } else {
        next(error);
    }
});

export default enrollmentSchema;