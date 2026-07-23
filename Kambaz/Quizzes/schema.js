// Kambaz/Quizzes/schema.js
// quiz schema for mongodb - stores quizzes and exams together

import mongoose from "mongoose";

// multiple choice option
const multipleChoiceOptionSchema = new mongoose.Schema(
    {
        text: {
            type: String,
            required: true,
            trim: true
        },
        isCorrect: {
            type: Boolean,
            default: false
        }
    },
    { _id: false }
);

// blank answer for fill in blank questions
const blankAnswerSchema = new mongoose.Schema(
    {
        primary: {
            type: String,
            required: true,
            trim: true
        },
        alternatives: {
            type: [String],
            default: []
        },
        points: {
            type: Number,
            default: 1,
            min: [0, "Blank points cannot be negative"]
        }
    },
    { _id: false }
);


// question - can be MC, T/F, or fill in blank
const questionSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },
        title: {
            type: String,
            trim: true,
            default: ""
        },
        questionText: {
            type: String,
            required: [true, "Question text is required"],
            trim: true
        },
        points: {
            type: Number,
            required: [true, "Question points required"],
            min: [0, "Points cannot be negative"],
            max: [100, "Points cannot exceed 100 per question"]
        },
        type: {
            type: String,
            enum: ["Multiple Choice", "True/False", "Fill in the Blank"],
            required: true
        },
        // MC options
        options: [multipleChoiceOptionSchema],
        // T/F answer
        correctAnswer: Boolean,
        // fill in blank answers
        possibleAnswers: [String],
        caseSensitive: {
            type: Boolean,
            default: false
        },
        blanks: [blankAnswerSchema]
    },
    { _id: false }
);

// student answer
const questionAnswerSchema = new mongoose.Schema(
    {
        questionId: {
            type: String,
            required: true
        },
        answer: mongoose.Schema.Types.Mixed,
        isCorrect: Boolean,
        pointsEarned: Number
    },
    { _id: false }
);

// submission for each attempt
const quizSubmissionSchema = new mongoose.Schema(
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
        answers: [questionAnswerSchema],
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
        },
        attemptNumber: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    { _id: false }
);

// main quiz schema
const quizSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            required: true
        },

        title: {
            type: String,
            required: [true, "Quiz title is required"],
            trim: true,
            minlength: [1, "Title must be at least 1 character"],
            maxlength: [200, "Title cannot exceed 200 characters"]
        },

        // quiz or exam type
        type: {
            type: String,
            enum: {
                values: [
                    "Graded Quiz",
                    "Practice Quiz",
                    "Graded Survey",
                    "Ungraded Survey",
                    "Exam",
                    "Midterm Exam",
                    "Final Exam",
                    "Comprehensive Exam"
                ],
                message: "Invalid quiz/exam type"
            },
            default: "Graded Quiz"
        },

        // optional text fields
        description: {
            type: String,
            trim: true
        },

        instructions: {
            type: String,
            trim: true
        },

        // questions array
        questions: {
            type: [questionSchema],
            default: [],
            validate: {
                validator: function(questions) {
                    return questions.length >= 0 && questions.length <= 500;
                },
                message: "Quiz must have between 0 and 500 questions"
            }
        },

        // total points
        points: {
            type: Number,
            default: 100,
            min: [0, "Points cannot be negative"],
            max: [1000, "Points cannot exceed 1000"]
        },

        // dates
        dueDate: {
            type: String,
            required: [true, "Due date is required"]
        },

        availableDate: {
            type: String,
            required: [true, "Available date is required"]
        },

        availableUntilDate: {
            type: String
        },

        // time limit in minutes
        timeLimit: {
            type: Number,
            default: 20,
            min: [1, "Time limit must be at least 1 minute"],
            max: [600, "Time limit cannot exceed 600 minutes"]
        },

        // published or not
        published: {
            type: Boolean,
            default: false
        },

        // quiz settings
        shuffleAnswers: {
            type: Boolean,
            default: true
        },

        multipleAttempts: {
            type: Boolean,
            default: false
        },

        maxAttempts: {
            type: Number,
            default: 1,
            min: [1, "Must allow at least 1 attempt"]
        },

        showCorrectAnswers: {
            type: Boolean,
            default: false
        },

        accessCode: {
            type: String,
            trim: true
        },

        oneQuestionAtTime: {
            type: Boolean,
            default: true
        },

        webcamRequired: {
            type: Boolean,
            default: false
        },

        lockQuestionsAfterAnswering: {
            type: Boolean,
            default: false
        },

        // course link
        course: {
            type: String,
            ref: "CourseModel",
            required: [true, "Course ID is required"],
            index: true
        },

        // embedded submissions
        submissions: {
            type: [quizSubmissionSchema],
            default: []
        }
    },
    {
        collection: "quizzes",
        timestamps: true
    }
);

// indexes for faster queries
quizSchema.index({ course: 1 });
quizSchema.index({ dueDate: 1 });
quizSchema.index({ published: 1 });
quizSchema.index({ type: 1 });
quizSchema.index({ course: 1, dueDate: 1 });
quizSchema.index({ course: 1, published: 1 });
quizSchema.index({ course: 1, type: 1 });
quizSchema.index({ 'submissions.student': 1 });

// virtual fields
quizSchema.virtual("isOverdue").get(function() {
    return new Date(this.dueDate) < new Date();
});

quizSchema.virtual("isAvailable").get(function() {
    const now = new Date();
    const available = new Date(this.availableDate);
    const until = this.availableUntilDate ? new Date(this.availableUntilDate) : null;

    if (now < available) return false;
    if (until && now > until) return false;
    return true;
});

quizSchema.virtual("isExam").get(function() {
    return this.type.includes("Exam");
});

quizSchema.virtual("questionCount").get(function() {
    return this.questions ? this.questions.length : 0;
});

quizSchema.virtual("totalPoints").get(function() {
    if (!this.questions || this.questions.length === 0) return this.points || 0;
    return this.questions.reduce((sum, q) => sum + q.points, 0);
});

quizSchema.virtual("submissionCount").get(function() {
    return this.submissions ? this.submissions.length : 0;
});

quizSchema.virtual("averageScore").get(function() {
    if (!this.submissions || this.submissions.length === 0) return 0;

    const gradedSubmissions = this.submissions.filter(s => s.score !== null);
    if (gradedSubmissions.length === 0) return 0;

    const total = gradedSubmissions.reduce((sum, s) => sum + s.score, 0);
    return (total / gradedSubmissions.length).toFixed(2);
});

quizSchema.set("toJSON", { virtuals: true });
quizSchema.set("toObject", { virtuals: true });

// check dates before saving
quizSchema.pre("save", function(next) {
    if (new Date(this.dueDate) < new Date(this.availableDate)) {
        next(new Error("Due date must be after available date"));
    } else {
        next();
    }
});

export default quizSchema;