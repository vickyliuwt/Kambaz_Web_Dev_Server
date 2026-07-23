// Kambaz/Courses/schema.js

import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },

        // basic info
        name: {
            type: String,
            required: [true, "Course name is required"],
            trim: true,
            minlength: [3, "Course name must be at least 3 characters"],
            maxlength: [200, "Course name cannot exceed 200 characters"]
        },
        number: {
            type: String,
            required: [true, "Course number is required"],
            trim: true,
            uppercase: true
        },

        description: {
            type: String,
            default: "No description provided",
            trim: true,
            maxlength: [5000, "Description cannot exceed 5000 characters"]
        },
        credits: {
            type: Number,
            default: 4,
            min: [1, "Credits must be at least 1"],
            max: [12, "Credits cannot exceed 12"],
            validate: {
                validator: Number.isInteger,
                message: "Credits must be a whole number"
            }
        },

        department: {
            type: String,
            default: "Computer Science",
            trim: true,
            maxlength: [100, "Department name cannot exceed 100 characters"]
        },
        instructor: {
            type: String,
            default: "Staff",
            trim: true,
            maxlength: [100, "Instructor name cannot exceed 100 characters"]
        },

        // dates
        startDate: {
            type: String,
            required: [true, "Start date is required"],
            default: () => new Date().toISOString(),
            validate: {
                validator: function(v) {
                    return !isNaN(Date.parse(v));
                },
                message: "Start date must be a valid date"
            }
        },
        endDate: {
            type: String,
            required: [true, "End date is required"],
            default: () => {
                const date = new Date();
                date.setMonth(date.getMonth() + 4);
                return date.toISOString();
            },
            validate: {
                validator: function(v) {
                    return !isNaN(Date.parse(v));
                },
                message: "End date must be a valid date"
            }
        },

        // styling
        image: {
            type: String,
            default: "/images/default-course.png",
            trim: true
        },
        color: {
            type: String,
            default: "#dc3545",
            match: [/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code (e.g., #dc3545)"]
        }
    },
    {
        collection: "courses",
        timestamps: true
    }
);

courseSchema.index({ number: 1 }, { unique: true });
courseSchema.index({ department: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ startDate: 1, endDate: 1 });
courseSchema.index({ department: 1, number: 1 });
courseSchema.index({ name: 'text', description: 'text' });

// computed properties
courseSchema.virtual("displayName").get(function() {
    return `${this.number} - ${this.name}`;
});

courseSchema.virtual("isActive").get(function() {
    const now = new Date();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return start <= now && now <= end;
});

courseSchema.virtual("durationDays").get(function() {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

courseSchema.virtual("termName").get(function() {
    const start = new Date(this.startDate);
    const year = start.getFullYear();
    const month = start.getMonth();

    let term = "Fall";
    if (month >= 0 && month <= 4) {
        term = "Spring";
    } else if (month >= 5 && month <= 7) {
        term = "Summer";
    }

    return `${term} ${year}`;
});

courseSchema.set("toJSON", { virtuals: true });
courseSchema.set("toObject", { virtuals: true });

// helper methods
courseSchema.methods.hasStarted = function() {
    return new Date(this.startDate) <= new Date();
};

courseSchema.methods.hasEnded = function() {
    return new Date(this.endDate) < new Date();
};

courseSchema.methods.isUpcoming = function() {
    return new Date(this.startDate) > new Date();
};

courseSchema.pre("save", function(next) {
    if (new Date(this.endDate) <= new Date(this.startDate)) {
        next(new Error("End date must be after start date"));
        return;
    }

    if (this.number) {
        this.number = this.number.trim().toUpperCase();
    }

    if (this.name) {
        this.name = this.name.trim();
    }

    if (this.description) {
        this.description = this.description.trim();
    }

    if (this.department) {
        this.department = this.department.trim();
    }

    if (this.instructor) {
        this.instructor = this.instructor.trim();
    }

    next();
});

// before update
courseSchema.pre("updateOne", function(next) {
    const update = this.getUpdate();

    if (update.$set && update.$set.number) {
        update.$set.number = update.$set.number.trim().toUpperCase();
    }

    next();
});

// handle errors
courseSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        if (error.keyPattern.number) {
            next(new Error(`Course number ${doc.number} already exists. Please use a different course number.`));
        } else {
            next(new Error('Duplicate value detected. Please use unique values.'));
        }
    } else {
        next(error);
    }
});

courseSchema.statics.findActiveCourses = function() {
    const now = new Date().toISOString();
    return this.find({
        startDate: { $lte: now },
        endDate: { $gte: now }
    }).sort({ number: 1 });
};

export default courseSchema;