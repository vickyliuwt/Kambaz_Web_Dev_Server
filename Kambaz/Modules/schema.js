// Kambaz/Modules/schema.js
// module data structure

import mongoose from "mongoose";

// lesson structure
const lessonSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: [true, "Lesson name is required"],
            trim: true,
            minlength: [1, "Lesson name must be at least 1 character"],
            maxlength: [200, "Lesson name cannot exceed 200 characters"]
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: [2000, "Description cannot exceed 2000 characters"]
        },
        module: {
            type: String
        }
    },
    {
        _id: false
    }
);

// module structure
const moduleSchema = new mongoose.Schema(
    {
        // unique ID
        _id: {
            type: String,
            required: true
        },

        // basic info
        name: {
            type: String,
            required: [true, "Module name is required"],
            trim: true,
            minlength: [1, "Module name must be at least 1 character"],
            maxlength: [200, "Module name cannot exceed 200 characters"]
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: [2000, "Description cannot exceed 2000 characters"]
        },

        // parent course
        course: {
            type: String,
            ref: "CourseModel",
            required: [true, "Course ID is required"]
        },

        // embedded lessons
        lessons: {
            type: [lessonSchema],
            default: [],
            validate: {
                validator: function(lessons) {
                    return lessons.length <= 100;
                },
                message: "Module cannot have more than 100 lessons"
            }
        }
    },
    {
        collection: "modules",
        timestamps: true
    }
);

// indexes for speed
moduleSchema.index({ course: 1 });
moduleSchema.index({ name: 1 });
moduleSchema.index({ course: 1, name: 1 });
moduleSchema.index({ name: 'text', description: 'text' });

// computed fields
moduleSchema.virtual("lessonCount").get(function() {
    return this.lessons ? this.lessons.length : 0;
});

moduleSchema.virtual("hasLessons").get(function() {
    return this.lessons && this.lessons.length > 0;
});

moduleSchema.set("toJSON", { virtuals: true });
moduleSchema.set("toObject", { virtuals: true });

// lesson methods
moduleSchema.methods.addLesson = function(lessonName, lessonDescription = "") {
    const newLesson = {
        _id: uuidv4(),
        name: lessonName,
        description: lessonDescription,
        module: this._id
    };

    this.lessons.push(newLesson);
    return this.save();
};

moduleSchema.methods.removeLesson = function(lessonId) {
    this.lessons = this.lessons.filter(lesson => lesson._id !== lessonId);
    return this.save();
};

moduleSchema.methods.updateLesson = function(lessonId, updates) {
    const lessonIndex = this.lessons.findIndex(l => l._id === lessonId);

    if (lessonIndex === -1) {
        throw new Error("Lesson not found");
    }

    this.lessons[lessonIndex] = { ...this.lessons[lessonIndex], ...updates };
    return this.save();
};

// before save
moduleSchema.pre("save", function(next) {
    if (this.name) {
        this.name = this.name.trim();
    }

    if (this.lessons) {
        this.lessons.forEach(lesson => {
            if (!lesson._id) {
                lesson._id = uuidv4();
            }
            if (lesson.name) {
                lesson.name = lesson.name.trim();
            }
        });
    }

    next();
});

import { v4 as uuidv4 } from "uuid";

export default moduleSchema;