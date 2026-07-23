// Kambaz/GradingWeights/schema.js

import mongoose from "mongoose";

// schema for how grades are weighted in a course
const gradingWeightsSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },

        // which course
        course: {
            type: String,
            ref: "CourseModel",
            required: [true, "Course ID is required"]
        },

        // weight percentages
        weights: {
            ASSIGNMENTS: {
                type: Number,
                required: true,
                min: [0, "Weight cannot be negative"],
                max: [100, "Weight cannot exceed 100%"],
                default: 40
            },
            QUIZZES: {
                type: Number,
                required: true,
                min: [0, "Weight cannot be negative"],
                max: [100, "Weight cannot exceed 100%"],
                default: 10
            },
            EXAMS: {
                type: Number,
                required: true,
                min: [0, "Weight cannot be negative"],
                max: [100, "Weight cannot exceed 100%"],
                default: 20
            },
            PROJECTS: {
                type: Number,
                required: true,
                min: [0, "Weight cannot be negative"],
                max: [100, "Weight cannot exceed 100%"],
                default: 30
            }
        },

        // who last changed these weights
        lastModifiedBy: {
            type: String,
            ref: "UserModel",
            default: null
        },

        // when it was last changed
        lastModifiedDate: {
            type: String,
            default: null
        }
    },
    {
        collection: "gradingweights",
        timestamps: true
    }
);

gradingWeightsSchema.index({ course: 1 }, { unique: true });

// check that weights add up to 100%
gradingWeightsSchema.virtual("totalWeight").get(function() {
    return (
        this.weights.ASSIGNMENTS +
        this.weights.QUIZZES +
        this.weights.EXAMS +
        this.weights.PROJECTS
    );
});

// is this a valid grading scheme
gradingWeightsSchema.virtual("isValid").get(function() {
    return this.totalWeight === 100;
});

// include calculated fields when converting to JSON
gradingWeightsSchema.set("toJSON", { virtuals: true });
gradingWeightsSchema.set("toObject", { virtuals: true });

gradingWeightsSchema.pre("save", function(next) {
    const total =
        this.weights.ASSIGNMENTS +
        this.weights.QUIZZES +
        this.weights.EXAMS +
        this.weights.PROJECTS;

    if (total !== 100) {
        const err = new Error(`Weights must total 100%, currently ${total}%`);
        console.error(`❌ VALIDATION ERROR: ${err.message}`);
        next(err);
    } else {
        console.log(`✅ weights validated: total = 100%`);
        next();
    }
});

gradingWeightsSchema.pre(["updateOne", "findOneAndUpdate"], function(next) {
    const update = this.getUpdate();

    // handle both $set and direct updates
    const weightsUpdate = update.$set?.weights || update.weights;

    if (weightsUpdate) {
        const weights = weightsUpdate;
        const total =
            (weights.ASSIGNMENTS || 0) +
            (weights.QUIZZES || 0) +
            (weights.EXAMS || 0) +
            (weights.PROJECTS || 0);

        if (total !== 100) {
            const err = new Error(`Weights must total 100%, currently ${total}%`);
            console.error(`❌ VALIDATION ERROR: ${err.message}`);
            next(err);
        } else {
            console.log(`✅ weights validated: total = 100%`);
            next();
        }
    } else {
        next();
    }
});

export default gradingWeightsSchema;