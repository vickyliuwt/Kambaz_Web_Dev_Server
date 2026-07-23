// Kambaz/Users/dao.js
// user database operations

import model from "./model.js";
import enrollmentModel from "../Enrollments/model.js";
import { v4 as uuidv4 } from "uuid";

// make user ID
async function generateUserId(role) {
    try {
        const normalizedRole = role.toUpperCase();

        const usersWithRole = await model.find({ role: normalizedRole });

        const numbers = usersWithRole
            .map(user => {
                const match = user._id.match(/^[A-Z]+(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);

        const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        const newId = `${normalizedRole}${nextNumber}`;

        console.log(`   🆔 generated user id: ${newId}`);

        return newId;
    } catch (error) {
        console.error("   ❌ error:", error);
        return `${role.toUpperCase()}${Date.now()}`;
    }
}

// create user
export const createUser = async (userData) => {
    try {
        if (!userData.username) {
            throw new Error("Username is required");
        }
        if (!userData.password) {
            throw new Error("Password is required");
        }

        // check duplicate
        const existingUser = await findUserByUsername(userData.username);
        if (existingUser) {
            throw new Error("Username already in use. Please choose a different username.");
        }

        const role = userData.role || "STUDENT";
        const userId = await generateUserId(role);

        const newUser = {
            _id: userId,
            username: userData.username.trim().toLowerCase(),
            password: userData.password,
            firstName: userData.firstName?.trim() || userData.username,
            lastName: userData.lastName?.trim() || "User",
            email: userData.email?.trim() || `${userData.username}@northeastern.edu`,
            dob: userData.dob || "2000-01-01",
            role: userData.role || "STUDENT",
            loginId: userData.loginId || `${Math.floor(Math.random() * 1000000)}S`,
            section: userData.section || "SEC01",
            lastActivity: new Date().toISOString(),
            totalActivity: userData.totalActivity || "0:00:00"
        };

        const createdUser = await model.create(newUser);

        console.log(`   ✅ created: ${createdUser.username}`);
        console.log(`      id: ${createdUser._id}`);
        console.log(`      role: ${createdUser.role}`);
        console.log(`      email: ${createdUser.email}`);
        console.log(`      login id: ${createdUser.loginId}`);
        console.log(`      section: ${createdUser.section}`);

        // auto-enroll admins
        if (createdUser.role === "ADMIN") {
            await enrollAdminInAllCourses(createdUser._id);
        }

        console.log(`   💡 reload to confirm`);

        return createdUser;
    } catch (error) {
        console.error("   ❌ error:", error.message);
        throw error;
    }
};

// auto-enroll admins
const enrollAdminInAllCourses = async (userId) => {
    try {
        const courseModel = (await import("../Courses/model.js")).default;
        const allCourses = await courseModel.find();

        let enrollmentCount = 0;

        for (const course of allCourses) {
            const alreadyEnrolled = await enrollmentModel.findOne({
                user: userId,
                course: course._id
            });

            if (!alreadyEnrolled) {
                const enrollmentId = uuidv4();
                await enrollmentModel.create({
                    _id: enrollmentId,
                    user: userId,
                    course: course._id,
                    enrollmentDate: new Date().toISOString(),
                    status: "ENROLLED"
                });
                enrollmentCount++;
                console.log(`      ✔ enrolled in ${course.number}`);
            }
        }

        console.log(`      🎓 admin enrolled in ${enrollmentCount} courses`);
    } catch (error) {
        console.log("      ⚠️  admin enrollment skipped:", error.message);
    }
};

// get all users
export const findAllUsers = async () => {
    try {
        const users = await model.find().sort({ lastName: 1, firstName: 1 });

        console.log(`   👥 got ${users.length} users`);

        const breakdown = {
            STUDENT: users.filter(u => u.role === 'STUDENT').length,
            FACULTY: users.filter(u => u.role === 'FACULTY').length,
            TA: users.filter(u => u.role === 'TA').length,
            ADMIN: users.filter(u => u.role === 'ADMIN').length
        };
        console.log(`      students: ${breakdown.STUDENT}, faculty: ${breakdown.FACULTY}, tas: ${breakdown.TA}, admins: ${breakdown.ADMIN}`);

        return users;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
};

// find by ID
export const findUserById = async (userId) => {
    try {
        if (!userId) {
            console.error("   ❌ userId required");
            return null;
        }

        const user = await model.findById(userId);

        if (!user) {
            console.log(`   ⚠️  not found: ${userId}`);
            return null;
        }

        console.log(`   👤 found: ${user.username} (${user.role})`);
        console.log(`      name: ${user.firstName} ${user.lastName}`);
        console.log(`      email: ${user.email}`);

        return user;
    } catch (error) {
        console.error(`   ❌ error:`, error);
        return null;
    }
};

// find by username
export const findUserByUsername = async (username) => {
    try {
        if (!username) {
            return null;
        }

        const trimmedUsername = username.trim().toLowerCase();

        const user = await model.findOne({ username: trimmedUsername });

        if (user) {
            console.log(`   🔍 found username: ${trimmedUsername}`);
        }

        return user;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
};

// find by credentials
export const findUserByCredentials = async (username, password) => {
    try {
        if (!username || !password) {
            console.log("   ⚠️  missing credentials");
            return null;
        }

        const trimmedUsername = username.trim().toLowerCase();

        const user = await model.findOne({
            username: trimmedUsername,
            password: password
        });

        if (user) {
            console.log(`   ✅ login successful: ${user.username}`);
            console.log(`      role: ${user.role}`);
            console.log(`      last activity: ${user.lastActivity}`);

            await model.updateOne(
                { _id: user._id },
                { $set: { lastActivity: new Date().toISOString() } }
            );

            console.log(`      📅 updated last activity`);
        } else {
            console.log(`   ❌ login failed: ${trimmedUsername}`);
        }

        return user;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
};

// find by role
export const findUsersByRole = async (role) => {
    try {
        if (!role) {
            console.error("   ❌ role required");
            return [];
        }

        const validRoles = ["STUDENT", "FACULTY", "TA", "ADMIN"];
        const normalizedRole = role.toUpperCase();

        if (!validRoles.includes(normalizedRole)) {
            console.error(`   ❌ invalid role: ${role}`);
            return [];
        }

        const users = await model.find({ role: normalizedRole }).sort({ lastName: 1, firstName: 1 });

        console.log(`   🔍 found ${users.length} users with role: ${normalizedRole}`);

        return users;
    } catch (error) {
        console.error(`   ❌ error:`, error);
        return [];
    }
};

// search by name
export const findUsersByPartialName = async (partialName) => {
    try {
        if (!partialName || partialName.trim() === '') {
            console.error("   ❌ search term required");
            return [];
        }

        const searchTerm = partialName.trim();

        const regex = new RegExp(searchTerm, "i");

        const users = await model.find({
            $or: [
                { firstName: { $regex: regex } },
                { lastName: { $regex: regex } },
                { username: { $regex: regex } },
                { email: { $regex: regex } },
                { loginId: { $regex: regex } }
            ]
        }).sort({ lastName: 1, firstName: 1 });

        console.log(`   🔍 found ${users.length} matching "${searchTerm}"`);

        if (users.length > 0 && users.length <= 5) {
            users.forEach(u => {
                console.log(`      • ${u.firstName} ${u.lastName} (${u.username})`);
            });
        }

        return users;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
};

// find by section
export const findUsersBySection = async (section) => {
    try {
        const normalizedSection = section.toUpperCase();
        const users = await model.find({ section: normalizedSection }).sort({ lastName: 1, firstName: 1 });

        console.log(`   📚 found ${users.length} in section: ${normalizedSection}`);
        return users;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
};

// find by role and section
export const findUsersByRoleAndSection = async (role, section) => {
    try {
        const query = {};

        if (role) {
            query.role = role.toUpperCase();
        }
        if (section) {
            query.section = section.toUpperCase();
        }

        const users = await model.find(query).sort({ lastName: 1, firstName: 1 });

        console.log(`   🔍 found ${users.length} with role=${role || 'any'}, section=${section || 'any'}`);
        return users;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
};

// update user
export const updateUser = async (userId, userUpdates) => {
    try {
        if (!userId) {
            throw new Error("userId is required");
        }

        if (!userUpdates || Object.keys(userUpdates).length === 0) {
            throw new Error("No updates provided");
        }

        const existingUser = await model.findById(userId);
        if (!existingUser) {
            console.log(`   ⚠️  not found: ${userId}`);
            return null;
        }

        // check username duplicate
        if (userUpdates.username && userUpdates.username !== existingUser.username) {
            const duplicate = await findUserByUsername(userUpdates.username);
            if (duplicate) {
                throw new Error("Username already in use");
            }
        }

        // check email duplicate
        if (userUpdates.email && userUpdates.email !== existingUser.email) {
            const emailExists = await model.findOne({
                email: userUpdates.email.trim().toLowerCase(),
                _id: { $ne: userId }
            });
            if (emailExists) {
                throw new Error("Email already in use");
            }
        }

        const updatesWithTimestamp = {
            ...userUpdates,
            lastActivity: new Date().toISOString()
        };

        await model.updateOne(
            { _id: userId },
            { $set: updatesWithTimestamp }
        );

        const updatedUser = await model.findById(userId);

        console.log(`   ✏️  updated: ${updatedUser.username}`);
        console.log(`      fields: ${Object.keys(userUpdates).join(', ')}`);
        console.log(`      saved to mongodb`);
        console.log(`   💡 reload to confirm`);

        return updatedUser;
    } catch (error) {
        console.error(`   ❌ error:`, error.message);
        throw error;
    }
};

// delete user
export const deleteUser = async (userId) => {
    try {
        if (!userId) {
            throw new Error("userId is required");
        }

        const user = await model.findById(userId);
        if (!user) {
            console.log(`   ⚠️  not found: ${userId}`);
            return {
                message: "User not found",
                deletedUser: false,
                deletedEnrollments: 0
            };
        }

        console.log(`   🗑️  deleting: ${user.username} (${user.role})`);
        console.log(`      id: ${user._id}`);
        console.log(`      email: ${user.email}`);

        // cascade delete
        const enrollmentResult = await enrollmentModel.deleteMany({ user: userId });
        console.log(`      📋 deleted ${enrollmentResult.deletedCount} enrollments`);

        try {
            const gradeModel = (await import("../Grades/model.js")).default;
            const gradeResult = await gradeModel.deleteMany({ student: userId });
            console.log(`      📊 deleted ${gradeResult.deletedCount} grades`);
        } catch (error) {
            console.log("      ⚠️  grades cleanup skipped");
        }

        await model.deleteOne({ _id: userId });
        console.log(`      👤 user deleted`);

        console.log(`   ✅ deletion complete`);
        console.log(`   💡 reload to confirm`);

        return {
            message: "User deleted successfully",
            deletedUser: true,
            deletedEnrollments: enrollmentResult.deletedCount,
            username: user.username
        };
    } catch (error) {
        console.error(`   ❌ error:`, error.message);
        throw error;
    }
};

// validate data
export const validateUserData = (userData) => {
    const errors = [];

    if (!userData.username || userData.username.trim().length < 3) {
        errors.push("Username must be at least 3 characters");
    }

    if (userData.username && userData.username.trim().length > 50) {
        errors.push("Username cannot exceed 50 characters");
    }

    if (userData.username && !/^[a-zA-Z0-9_]+$/.test(userData.username)) {
        errors.push("Username can only contain letters, numbers, and underscores");
    }

    if (!userData.password || userData.password.length < 3) {
        errors.push("Password must be at least 3 characters");
    }

    const validRoles = ["STUDENT", "FACULTY", "TA", "ADMIN"];
    if (userData.role && !validRoles.includes(userData.role.toUpperCase())) {
        errors.push(`Role must be one of: ${validRoles.join(', ')}`);
    }

    if (userData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            errors.push("Invalid email format");
        }
    }

    if (userData.firstName && userData.firstName.trim().length === 0) {
        errors.push("First name cannot be empty");
    }

    if (userData.lastName && userData.lastName.trim().length === 0) {
        errors.push("Last name cannot be empty");
    }

    if (userData.section && !/^SEC\d{2}$/.test(userData.section.toUpperCase())) {
        errors.push("Section must be in format SEC01");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// get stats
export const getUserStatsByRole = async () => {
    try {
        const allUsers = await model.find();

        const stats = {
            total: allUsers.length,
            byRole: {
                STUDENT: allUsers.filter(u => u.role === 'STUDENT').length,
                FACULTY: allUsers.filter(u => u.role === 'FACULTY').length,
                TA: allUsers.filter(u => u.role === 'TA').length,
                ADMIN: allUsers.filter(u => u.role === 'ADMIN').length
            },
            bySection: {},
            activeToday: allUsers.filter(u => {
                if (!u.lastActivity) return false;
                const today = new Date().toDateString();
                const lastActive = new Date(u.lastActivity).toDateString();
                return today === lastActive;
            }).length
        };

        allUsers.forEach(user => {
            if (user.section) {
                stats.bySection[user.section] = (stats.bySection[user.section] || 0) + 1;
            }
        });

        console.log("   📊 user stats:");
        console.log(`      total: ${stats.total}`);
        console.log(`      students: ${stats.byRole.STUDENT}`);
        console.log(`      faculty: ${stats.byRole.FACULTY}`);
        console.log(`      tas: ${stats.byRole.TA}`);
        console.log(`      admins: ${stats.byRole.ADMIN}`);
        console.log(`      active today: ${stats.activeToday}`);
        console.log(`      sections: ${Object.keys(stats.bySection).join(', ')}`);

        return stats;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
};

// find recently active
export const findRecentlyActiveUsers = async (daysAgo = 7) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        const cutoffISO = cutoffDate.toISOString();

        const users = await model.find({
            lastActivity: { $gte: cutoffISO }
        }).sort({ lastActivity: -1 });

        console.log(`   📅 found ${users.length} active in last ${daysAgo} days`);

        return users;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
};

// count users
export const countUsers = async (criteria = {}) => {
    try {
        const count = await model.countDocuments(criteria);
        console.log(`   🔢 count: ${count} users`);
        return count;
    } catch (error) {
        console.error("   ❌ error:", error);
        return 0;
    }
};

// bulk create
export const createManyUsers = async (usersArray) => {
    try {
        const usersWithIds = usersArray.map(user => ({
            ...user,
            _id: user._id || uuidv4(),
            lastActivity: new Date().toISOString(),
            totalActivity: user.totalActivity || "0:00:00"
        }));

        const result = await model.insertMany(usersWithIds, { ordered: false });

        console.log(`   ✅ bulk created ${result.length} users`);
        return result;
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
};