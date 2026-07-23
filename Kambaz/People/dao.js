// Kambaz/People/dao.js
// user database operations

import userModel from "../Users/model.js";
import enrollmentModel from "../Enrollments/model.js";
import courseModel from "../Courses/model.js";

// get course roster
export async function findUsersForCourse(courseId) {
    try {
        if (!courseId) {
            console.error("❌ need course id");
            return [];
        }

        console.log(`📋 getting roster for: ${courseId}`);

        const enrollments = await enrollmentModel
            .find({
                course: courseId,
                status: "ENROLLED"
            })
            .populate("user");

        console.log(`✅ found ${enrollments.length} enrollments`);

        let users = enrollments
            .map((enrollment) => {
                if (enrollment.user) {
                    return {
                        ...enrollment.user._doc,
                        enrollmentId: enrollment._id,
                        enrollmentDate: enrollment.enrollmentDate,
                        enrollmentStatus: enrollment.status
                    };
                }
                return null;
            })
            .filter((user) => user !== null);

        // sort by role then name
        users.sort((a, b) => {
            const roleOrder = { ADMIN: 0, FACULTY: 1, TA: 2, STUDENT: 3 };
            const roleA = roleOrder[a.role] || 4;
            const roleB = roleOrder[b.role] || 4;

            if (roleA !== roleB) {
                return roleA - roleB;
            }

            const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
            const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        console.log(`✅ roster ready: ${users.length} users`);
        console.log(`   faculty: ${users.filter(u => u.role === 'FACULTY').length}`);
        console.log(`   ta: ${users.filter(u => u.role === 'TA').length}`);
        console.log(`   student: ${users.filter(u => u.role === 'STUDENT').length}`);

        return users;

    } catch (error) {
        console.error(`❌ error:`, error);
        return [];
    }
}

// get all users
export const findAllUsers = async () => {
    try {
        const users = await userModel.find().sort({ lastName: 1, firstName: 1 });
        console.log(`✅ got ${users.length} users`);
        return users;
    } catch (error) {
        console.error("❌ error:", error);
        return [];
    }
};

// find by ID
export const findUserById = async (userId) => {
    try {
        if (!userId) {
            console.error("❌ need user id");
            return null;
        }

        const user = await userModel.findById(userId);

        if (!user) {
            console.log(`⚠️ not found: ${userId}`);
            return null;
        }

        console.log(`✅ found: ${user.username}`);
        return user;

    } catch (error) {
        console.error(`❌ error:`, error);
        return null;
    }
};

// check username exists
export const findUserByUsername = async (username) => {
    try {
        if (!username) {
            return null;
        }

        const normalizedUsername = username.trim().toLowerCase();
        const user = await userModel.findOne({ username: normalizedUsername });

        if (user) {
            console.log(`⚠️ username '${normalizedUsername}' taken`);
        }

        return user;

    } catch (error) {
        console.error(`❌ error:`, error);
        return null;
    }
};

// make user ID
async function generateUserId(role) {
    try {
        const normalizedRole = role.toUpperCase();
        const usersWithRole = await userModel.find({ role: normalizedRole });

        const numbers = usersWithRole
            .map(user => {
                const match = user._id.match(/^[A-Z]+(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);

        const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        const newId = `${normalizedRole}${nextNumber}`;

        console.log(`🆔 generated user id: ${newId}`);
        return newId;

    } catch (error) {
        console.error("❌ error:", error);
        return `${role.toUpperCase()}${Date.now()}`;
    }
}

// make enrollment ID
async function generateEnrollmentId(userId, courseId) {
    try {
        const course = await courseModel.findById(courseId);
        if (!course) {
            throw new Error("Course not found");
        }

        const courseNumber = course.number;
        const newId = `E-${courseNumber}-${userId}`;

        console.log(`🆔 generated enrollment id: ${newId}`);
        return newId;

    } catch (error) {
        console.error("❌ error:", error);
        return `E-${Date.now()}-${userId}`;
    }
}

// create user and enroll
export async function createUserForCourse(userData, courseId) {
    try {
        console.log(`👤 creating user for course ${courseId}`);

        // validate
        if (!userData.username || !userData.password) {
            throw new Error("Username and password are required");
        }

        if (!userData.firstName || !userData.lastName) {
            throw new Error("First name and last name are required");
        }

        // check duplicate
        const existingUser = await findUserByUsername(userData.username);
        if (existingUser) {
            throw new Error("Username already in use");
        }

        // generate ID
        const role = userData.role || "STUDENT";
        const userId = await generateUserId(role);

        // build user
        const newUser = {
            _id: userId,
            username: userData.username.trim().toLowerCase(),
            password: userData.password,
            firstName: userData.firstName.trim(),
            lastName: userData.lastName.trim(),
            email: userData.email || `${userData.username}@northeastern.edu`,
            dob: userData.dob || "2000-01-01",
            role: userData.role || "STUDENT",
            loginId: userData.loginId || `${Math.floor(Math.random() * 1000000)}S`,
            section: userData.section || "SEC01",
            lastActivity: new Date().toISOString(),
            totalActivity: userData.totalActivity || "0:00:00"
        };

        // save user
        const createdUser = await userModel.create(newUser);
        console.log(`✅ user created: ${createdUser.username} (${createdUser._id})`);

        // create enrollment
        if (courseId) {
            const enrollmentId = await generateEnrollmentId(createdUser._id, courseId);

            const enrollment = {
                _id: enrollmentId,
                user: createdUser._id,
                course: courseId,
                enrollmentDate: new Date().toISOString(),
                status: "ENROLLED"
            };

            await enrollmentModel.create(enrollment);
            console.log(`✅ enrollment created: ${enrollmentId}`);
        }

        // auto-enroll admins
        if (createdUser.role === "ADMIN") {
            console.log(`🔑 admin - enrolling in all courses`);

            const allCourses = await courseModel.find();
            let adminEnrollmentCount = 0;

            for (const course of allCourses) {
                const alreadyEnrolled = await enrollmentModel.findOne({
                    user: createdUser._id,
                    course: course._id
                });

                if (!alreadyEnrolled) {
                    const enrollmentId = await generateEnrollmentId(createdUser._id, course._id);
                    await enrollmentModel.create({
                        _id: enrollmentId,
                        user: createdUser._id,
                        course: course._id,
                        enrollmentDate: new Date().toISOString(),
                        status: "ENROLLED"
                    });
                    adminEnrollmentCount++;
                }
            }

            console.log(`✅ admin enrolled in ${adminEnrollmentCount} more courses`);
        }

        return createdUser;

    } catch (error) {
        console.error("❌ error:", error);
        throw error;
    }
}

// update user
export async function updateUser(userId, userUpdates) {
    try {
        console.log(`✏️ updating user: ${userId}`);

        if (!userId || !userUpdates || Object.keys(userUpdates).length === 0) {
            throw new Error("Need user ID and updates");
        }

        const existingUser = await userModel.findById(userId);
        if (!existingUser) {
            console.log(`⚠️ not found: ${userId}`);
            return null;
        }

        // check username duplicate
        if (userUpdates.username && userUpdates.username !== existingUser.username) {
            const duplicate = await findUserByUsername(userUpdates.username);
            if (duplicate) {
                throw new Error("Username already in use");
            }
        }

        // update with timestamp
        const updatesWithTimestamp = {
            ...userUpdates,
            lastActivity: new Date().toISOString()
        };

        await userModel.updateOne(
            { _id: userId },
            { $set: updatesWithTimestamp }
        );

        const updatedUser = await userModel.findById(userId);
        console.log(`✅ updated: ${updatedUser.username}`);

        return updatedUser;

    } catch (error) {
        console.error(`❌ error:`, error);
        throw error;
    }
}

// delete user
export async function deleteUser(userId) {
    try {
        console.log(`🗑️ deleting: ${userId}`);

        if (!userId) {
            throw new Error("Need user ID");
        }

        const user = await userModel.findById(userId);
        if (!user) {
            console.log(`⚠️ not found: ${userId}`);
            return {
                message: "User not found",
                deletedUser: false,
                deletedEnrollments: 0
            };
        }

        console.log(`   username: ${user.username}`);
        console.log(`   cascade delete...`);

        // delete enrollments
        const enrollmentResult = await enrollmentModel.deleteMany({ user: userId });
        console.log(`   ✅ deleted ${enrollmentResult.deletedCount} enrollments`);

        // delete user
        await userModel.deleteOne({ _id: userId });
        console.log(`   ✅ user deleted`);

        // delete grades if exists
        try {
            const gradeModel = (await import("../Grades/model.js")).default;
            const gradeResult = await gradeModel.deleteMany({ student: userId });
            console.log(`   ✅ deleted ${gradeResult.deletedCount} grades`);
        } catch {
            console.log(`   ⚠️ grades cleanup skipped`);
        }

        console.log(`✅ deletion complete`);

        return {
            message: "User deleted successfully",
            deletedUser: true,
            deletedEnrollments: enrollmentResult.deletedCount,
            username: user.username
        };

    } catch (error) {
        console.error(`❌ error:`, error);
        throw error;
    }
}

// get stats
export async function getUserStatsByCourse(courseId) {
    try {
        console.log(`📊 getting stats for: ${courseId}`);

        const users = await findUsersForCourse(courseId);

        const stats = {
            courseId,
            total: users.length,
            byRole: {
                FACULTY: users.filter(u => u.role === 'FACULTY').length,
                TA: users.filter(u => u.role === 'TA').length,
                STUDENT: users.filter(u => u.role === 'STUDENT').length,
                ADMIN: users.filter(u => u.role === 'ADMIN').length
            },
            sections: {},
            enrollmentDates: users.map(u => u.enrollmentDate).filter(Boolean)
        };

        users.forEach(user => {
            if (user.section) {
                stats.sections[user.section] = (stats.sections[user.section] || 0) + 1;
            }
        });

        console.log(`✅ stats calculated`);
        return stats;

    } catch (error) {
        console.error("❌ error:", error);
        return null;
    }
}

// search users
export async function searchUsersInCourse(courseId, searchTerm) {
    try {
        console.log(`🔍 searching in ${courseId} for: "${searchTerm}"`);

        const allUsers = await findUsersForCourse(courseId);

        if (!searchTerm || searchTerm.trim() === '') {
            return allUsers;
        }

        const regex = new RegExp(searchTerm.trim(), "i");

        const filteredUsers = allUsers.filter(user => {
            return regex.test(user.firstName) ||
                regex.test(user.lastName) ||
                regex.test(user.username) ||
                regex.test(user.email) ||
                regex.test(user.loginId);
        });

        console.log(`✅ found ${filteredUsers.length} matching`);
        return filteredUsers;

    } catch (error) {
        console.error("❌ error:", error);
        return [];
    }
}

// create with multiple enrollments
export async function createUserWithEnrollments(userData, courseIds) {
    try {
        console.log(`👤 creating user with ${courseIds.length} enrollments`);
        console.log(`   username: ${userData.username}`);

        // validate
        if (!userData.username || !userData.password) {
            throw new Error("Username and password are required");
        }

        if (!userData.firstName || !userData.lastName) {
            throw new Error("First name and last name are required");
        }

        // check duplicate
        const existingUser = await findUserByUsername(userData.username);
        if (existingUser) {
            throw new Error("Username already in use");
        }

        // generate ID
        const role = userData.role || "STUDENT";
        const userId = await generateUserId(role);

        // build user
        const newUser = {
            _id: userId,
            username: userData.username.trim().toLowerCase(),
            password: userData.password,
            firstName: userData.firstName.trim(),
            lastName: userData.lastName.trim(),
            email: userData.email || `${userData.username}@northeastern.edu`,
            dob: userData.dob || "2000-01-01",
            role: userData.role || "STUDENT",
            loginId: userData.loginId || `${Math.floor(Math.random() * 1000000)}S`,
            section: userData.section || "SEC01",
            lastActivity: new Date().toISOString(),
            totalActivity: userData.totalActivity || "0:00:00"
        };

        // save user
        const createdUser = await userModel.create(newUser);
        console.log(`✅ user created: ${createdUser._id}`);

        // create enrollments
        const enrollments = [];
        for (const courseId of courseIds) {
            try {
                const course = await courseModel.findById(courseId);
                if (course) {
                    const enrollmentId = await generateEnrollmentId(createdUser._id, courseId);
                    const enrollment = {
                        _id: enrollmentId,
                        user: createdUser._id,
                        course: courseId,
                        enrollmentDate: new Date().toISOString(),
                        status: "ENROLLED"
                    };

                    await enrollmentModel.create(enrollment);
                    enrollments.push(enrollment);
                    console.log(`   ✅ enrolled in ${course.number}`);
                }
            } catch (err) {
                console.error(`   ❌ failed to enroll in ${courseId}:`, err.message);
            }
        }

        console.log(`✅ created with ${enrollments.length} enrollments`);

        return {
            user: createdUser,
            enrollments: enrollments
        };

    } catch (error) {
        console.error("❌ error:", error);
        throw error;
    }
}

// update enrollments
export async function updateUserEnrollments(userId, courseIds) {
    try {
        console.log(`📄 updating enrollments for ${userId}`);
        console.log(`   target: ${courseIds.length} courses`);

        // get current
        const currentEnrollments = await enrollmentModel.find({ user: userId });
        const currentCourseIds = currentEnrollments.map(e => e.course);

        console.log(`   current: ${currentCourseIds.length}`);

        // find changes
        const toAdd = courseIds.filter(id => !currentCourseIds.includes(id));
        const toRemove = currentCourseIds.filter(id => !courseIds.includes(id));

        console.log(`   to add: ${toAdd.length}`);
        console.log(`   to remove: ${toRemove.length}`);

        // add new
        for (const courseId of toAdd) {
            try {
                const course = await courseModel.findById(courseId);
                if (course) {
                    const enrollmentId = await generateEnrollmentId(userId, courseId);
                    await enrollmentModel.create({
                        _id: enrollmentId,
                        user: userId,
                        course: courseId,
                        enrollmentDate: new Date().toISOString(),
                        status: "ENROLLED"
                    });
                    console.log(`   ✅ added ${course.number}`);
                }
            } catch (err) {
                console.error(`   ❌ failed to add ${courseId}:`, err.message);
            }
        }

        // remove old
        for (const courseId of toRemove) {
            try {
                await enrollmentModel.deleteOne({
                    user: userId,
                    course: courseId
                });
                console.log(`   ✅ removed ${courseId}`);
            } catch (err) {
                console.error(`   ❌ failed to remove ${courseId}:`, err.message);
            }
        }

        // get updated
        const updatedEnrollments = await enrollmentModel.find({ user: userId });

        console.log(`✅ now enrolled in ${updatedEnrollments.length} courses`);

        return updatedEnrollments;

    } catch (error) {
        console.error("❌ error:", error);
        throw error;
    }
}

// get user's courses
export async function getUserEnrolledCourses(userId) {
    try {
        console.log(`📚 getting courses for: ${userId}`);
        console.log(`   querying enrollments...`);

        const enrollments = await enrollmentModel
            .find({ user: userId })
            .populate("course");

        console.log(`   found ${enrollments.length} enrollments`);

        const courses = enrollments
            .map(e => e.course)
            .filter(c => c !== null);

        console.log(`   extracted ${courses.length} courses`);

        if (courses.length > 0) {
            console.log(`   course ids:`, courses.map(c => c._id));
            console.log(`   course numbers:`, courses.map(c => c.number));
        } else {
            console.log(`   ⚠️ no courses`);
        }

        return courses;

    } catch (error) {
        console.error("❌ error:", error);
        console.error("   check:");
        console.error("   1. user exists");
        console.error("   2. enrollments exist");
        console.error("   3. courses exist");
        return [];
    }
}