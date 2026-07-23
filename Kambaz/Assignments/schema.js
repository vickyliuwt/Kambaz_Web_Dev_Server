// Kambaz/Assignments/schema.js
// assignment schema

import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },

        // assignment info
        title: {
            type: String,
            required: [true, "Assignment title is required"],
            trim: true,
            minlength: [1, "Title must be at least 1 character"],
            maxlength: [200, "Title cannot exceed 200 characters"]
        },
        description: {
            type: String,
            default: "No description provided",
            trim: true,
            maxlength: [5000, "Description cannot exceed 5000 characters"]
        },
        points: {
            type: Number,
            default: 100,
            min: [0, "Points cannot be negative"],
            max: [1000, "Points cannot exceed 1000"],
            validate: {
                validator: function(v) {
                    return Number.isInteger(v);
                },
                message: "Points must be a whole number"
            }
        },

        // dates
        dueDate: {
            type: String,
            required: [true, "Due date is required"],
            validate: {
                validator: function(v) {
                    return !isNaN(Date.parse(v));
                },
                message: "Due date must be a valid date"
            }
        },
        availableDate: {
            type: String,
            required: [true, "Available date is required"],
            validate: {
                validator: function(v) {
                    return !isNaN(Date.parse(v));
                },
                message: "Available date must be a valid date"
            }
        },

        // type
        assignmentType: {
            type: String,
            enum: {
                values: ["ASSIGNMENT", "PROJECTS"],
                message: "Type must be ASSIGNMENT or PROJECTS"
            },
            default: "ASSIGNMENT",
            required: true,
            uppercase: true
        },

        // link to course
        course: {
            type: String,
            ref: "CourseModel",
            required: [true, "Course ID is required"]
        }
    },
    {
        collection: "assignments",
        timestamps: true
    }
);

// indexes
assignmentSchema.index({ course: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ assignmentType: 1 });
assignmentSchema.index({ course: 1, dueDate: 1 });
assignmentSchema.index({ course: 1, assignmentType: 1 });
assignmentSchema.index({ title: 'text', description: 'text' });

// virtual properties
assignmentSchema.virtual("isOverdue").get(function() {
    return new Date(this.dueDate) < new Date();
});

assignmentSchema.virtual("isAvailable").get(function() {
    return new Date(this.availableDate) <= new Date();
});

assignmentSchema.virtual("daysUntilDue").get(function() {
    const now = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

assignmentSchema.virtual("isUpcoming").get(function() {
    const daysUntil = this.daysUntilDue;
    return daysUntil >= 0 && daysUntil <= 7;
});

assignmentSchema.virtual("isProject").get(function() {
    return this.assignmentType === "PROJECTS";
});

assignmentSchema.set("toJSON", { virtuals: true });
assignmentSchema.set("toObject", { virtuals: true });

// pre-save validation
assignmentSchema.pre("save", function(next) {
    if (new Date(this.dueDate) < new Date(this.availableDate)) {
        next(new Error("Due date must be after available date"));
        return;
    }

    if (this.assignmentType) {
        this.assignmentType = this.assignmentType.toUpperCase();
    }

    if (this.title) {
        this.title = this.title.trim();
    }

    if (this.description) {
        this.description = this.description.trim();
    }

    next();
});

// pre-update
assignmentSchema.pre("updateOne", function(next) {
    const update = this.getUpdate();

    if (update.$set) {
        if (update.$set.assignmentType) {
            update.$set.assignmentType = update.$set.assignmentType.toUpperCase();
        }

        if (update.$set.title) {
            update.$set.title = update.$set.title.trim();
        }
    }

    next();
});

// static methods
assignmentSchema.statics.findUpcoming = function(courseId, days = 7) {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.find({
        course: courseId,
        dueDate: {
            $gte: now.toISOString(),
            $lte: future.toISOString()
        }
    }).sort({ dueDate: 1 });
};

assignmentSchema.statics.findOverdue = function(courseId) {
    const now = new Date();

    return this.find({
        course: courseId,
        dueDate: { $lt: now.toISOString() }
    }).sort({ dueDate: -1 });
};

export default assignmentSchema;