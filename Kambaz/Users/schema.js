// Kambaz/Users/schema.js


import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        // unique ID for each user
        _id: {
            type: String,
            required: true
        },

        // login credentials
        username: {
            type: String,
            required: [true, "Username is required"],
            trim: true,
            lowercase: true,
            minlength: [3, "Username must be at least 3 characters"],
            maxlength: [50, "Username cannot exceed 50 characters"],
            match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"]
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [3, "Password must be at least 3 characters"]
        },

        // personal info
        firstName: {
            type: String,
            required: [true, "First name is required"],
            trim: true,
            minlength: [1, "First name must be at least 1 character"],
            maxlength: [50, "First name cannot exceed 50 characters"]
        },
        lastName: {
            type: String,
            required: [true, "Last name is required"],
            trim: true,
            minlength: [1, "Last name must be at least 1 character"],
            maxlength: [50, "Last name cannot exceed 50 characters"]
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"]
        },
        dob: {
            type: String,
            default: "2000-01-01"
        },

        // user role
        role: {
            type: String,
            enum: {
                values: ["STUDENT", "FACULTY", "TA", "ADMIN"],
                message: "Role must be STUDENT, FACULTY, TA, or ADMIN"
            },
            default: "STUDENT",
            required: true,
            uppercase: true
        },

        // extra details
        loginId: {
            type: String,
            trim: true
        },
        section: {
            type: String,
            default: "SEC01",
            uppercase: true,
            match: [/^SEC\d{2}$/, "Section must be in format SEC01"]
        },

        // activity
        lastActivity: {
            type: String,
            default: () => new Date().toISOString()
        },
        totalActivity: {
            type: String,
            default: "0:00:00",
            match: [/^\d+:\d{2}:\d{2}$/, "Total activity must be in format HH:MM:SS"]
        }
    },
    {
        collection: "users",
        timestamps: true
    }
);

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ loginId: 1 }, { unique: true, sparse: true });
userSchema.index({ section: 1 });
userSchema.index({ lastActivity: -1 });
userSchema.index({ role: 1, section: 1 });
userSchema.index({ role: 1, lastActivity: -1 });
userSchema.index({ section: 1, lastName: 1 });

userSchema.virtual("fullName").get(function() {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual("displayName").get(function() {
    return `${this.firstName} ${this.lastName} (${this.role})`;
});

userSchema.virtual("activeToday").get(function() {
    if (!this.lastActivity) return false;

    const today = new Date().toDateString();
    const lastActive = new Date(this.lastActivity).toDateString();
    return today === lastActive;
});

userSchema.virtual("isStaff").get(function() {
    return this.role === "FACULTY" || this.role === "TA" || this.role === "ADMIN";
});

userSchema.virtual("isStudent").get(function() {
    return this.role === "STUDENT";
});

userSchema.set("toJSON", {
    virtuals: true,
    transform: (doc, ret) => {
        delete ret.password;
        return ret;
    }
});
userSchema.set("toObject", { virtuals: true });

userSchema.methods.canEdit = function() {
    return this.role === "FACULTY" || this.role === "ADMIN" || this.role === "TA";
};

userSchema.methods.toSafeObject = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

userSchema.pre("save", function(next) {
    if (this.username) {
        this.username = this.username.trim().toLowerCase();
    }

    if (this.firstName) {
        this.firstName = this.firstName.trim();
        this.firstName = this.firstName.charAt(0).toUpperCase() +
            this.firstName.slice(1).toLowerCase();
    }

    if (this.lastName) {
        this.lastName = this.lastName.trim();
        this.lastName = this.lastName.charAt(0).toUpperCase() +
            this.lastName.slice(1).toLowerCase();
    }

    if (this.email) {
        this.email = this.email.trim().toLowerCase();
    }

    if (this.role) {
        this.role = this.role.toUpperCase();
    }

    if (this.section) {
        this.section = this.section.toUpperCase();
    }

    next();
});

userSchema.pre("updateOne", function(next) {
    const update = this.getUpdate();

    if (update.$set) {
        if (update.$set.username) {
            update.$set.username = update.$set.username.trim().toLowerCase();
        }
        if (update.$set.email) {
            update.$set.email = update.$set.email.trim().toLowerCase();
        }
        if (update.$set.role) {
            update.$set.role = update.$set.role.toUpperCase();
        }
    }

    next();
});

userSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        next(new Error(`${field} already exists. Please use a different ${field}.`));
    } else {
        next(error);
    }
});

export default userSchema;