// Kambaz/Enrollments/dao.js
// enrollment database operations

import model from "./model.js";
import userModel from "../Users/model.js";
import courseModel from "../Courses/model.js";

// find user's courses
export async function findCoursesForUser(userId) {
    try {
        if (!userId) {
            console.error("   ❌ userId required");
            return [];
        }

        console.log(`   🔍 finding courses for: ${userId}`);

        // get enrollments with course info
        const enrollments = await model
            .find({ user: userId})
            .populate("course")
            .sort({ enrollmentDate: -1 });

        // extract courses
        const courses = enrollments
            .map((enrollment) => enrollment.course)
            .filter((course) => course !== null);

        console.log(`   ✅ user in ${courses.length} courses`);

        if (courses.length > 0) {
            console.log(`      courses:`);
            courses.forEach((course, index) => {
                console.log(`         ${index + 1}. ${course.number}: ${course.name}`);
            });
        } else {
            console.log(`      not enrolled`);
        }

        return courses;
    } catch (error) {
        console.error(`   ❌ error for user ${userId}:`, error);
        return [];
    }
}

// find course's users
export async function findUsersForCourse(courseId) {
    try {
        if (!courseId) {
            console.error("   ❌ courseId required");
            return [];
        }

        console.log(`   🔍 finding users for: ${courseId}`);

        // get enrollments with user info
        const enrollments = await model
            .find({ course: courseId, status: "ENROLLED" })
            .populate("user");

        // extract users
        let users = enrollments
            .map((enrollment) => enrollment.user)
            .filter((user) => user !== null);

        // sort by role
        users.sort((a, b) => {
            const roleOrder = { FACULTY: 0, TA: 1, STUDENT: 2, ADMIN: 3 };
            const roleA = roleOrder[a.role] || 4;
            const roleB = roleOrder[b.role] || 4;

            if (roleA !== roleB) {
                return roleA - roleB;
            }

            const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
            const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        console.log(`   ✅ course has ${users.length} users`);

        console.log(`      faculty: ${users.filter(u => u.role === 'FACULTY').length}`);
        console.log(`      ta: ${users.filter(u => u.role === 'TA').length}`);
        console.log(`      students: ${users.filter(u => u.role === 'STUDENT').length}`);
        console.log(`      admin: ${users.filter(u => u.role === 'ADMIN').length}`);

        return users;
    } catch (error) {
        console.error(`   ❌ error for course ${courseId}:`, error);
        return [];
    }
}

// get enrollment records
export async function findEnrollmentsForUser(userId) {
    try {
        if (!userId) {
            console.error("   ❌ userId required");
            return [];
        }

        console.log(`   📋 finding enrollments for: ${userId}`);

        const enrollments = await model
            .find({ user: userId })
            .sort({ enrollmentDate: -1 });

        console.log(`   ✅ user has ${enrollments.length} enrollments`);

        enrollments.forEach((enrollment, index) => {
            console.log(`      ${index + 1}. course: ${enrollment.course}, status: ${enrollment.status}`);
        });

        return enrollments;
    } catch (error) {
        console.error(`   ❌ error:`, error);
        return [];
    }
}

// get course enrollments
export async function findEnrollmentsForCourse(courseId) {
    try {
        if (!courseId) {
            console.error("   ❌ courseId required");
            return [];
        }

        const enrollments = await model.find({ course: courseId });

        console.log(`   📋 course has ${enrollments.length} enrollments`);

        return enrollments;
    } catch (error) {
        console.error(`   ❌ error:`, error);
        return [];
    }
}

// check if enrolled
export async function checkIfEnrolled(userId, courseId) {
    try {
        if (!userId || !courseId) {
            return false;
        }

        const enrollment = await model.findOne({
            user: userId,
            course: courseId,
            status: "ENROLLED"
        });

        const isEnrolled = enrollment !== null;

        console.log(`   🔍 check: user ${userId} in ${courseId} = ${isEnrolled ? 'enrolled ✔' : 'not enrolled ✗'}`);

        return isEnrolled;
    } catch (error) {
        console.error("   ❌ error:", error);
        return false;
    }
}

// find specific enrollment
export async function findEnrollment(userId, courseId) {
    try {
        const enrollment = await model.findOne({
            user: userId,
            course: courseId
        });

        return enrollment;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}
// generate enrollment ID
async function generateEnrollmentId(userId, courseId) {
    try {
        const course = await courseModel.findById(courseId);
        if (!course) {
            throw new Error("Course not found");
        }

        const courseNumber = course.number;

        const newId = `E-${courseNumber}-${userId}`;

        console.log(`   🆔 generated id: ${newId}`);

        return newId;
    } catch (error) {
        console.error("   ❌ error:", error);
        return `E-${Date.now()}-${userId}`;
    }
}

// enroll user
export async function enrollUserInCourse(userId, courseId) {
    try {
        if (!userId || !courseId) {
            console.error("   ❌ ids required");
            throw new Error("userId and courseId are required");
        }

        console.log(`   🎓 enrolling: ${userId} → ${courseId}`);

        // check user exists
        const userExists = await userModel.findById(userId);
        if (!userExists) {
            console.error(`   ❌ user not found: ${userId}`);
            throw new Error(`User ${userId} not found. Cannot enroll non-existent user.`);
        }

        // check course exists
        const courseExists = await courseModel.findById(courseId);
        if (!courseExists) {
            console.error(`   ❌ course not found: ${courseId}`);
            throw new Error(`Course ${courseId} not found. Cannot enroll in non-existent course.`);
        }

        // check already enrolled
        const alreadyEnrolled = await checkIfEnrolled(userId, courseId);
        if (alreadyEnrolled) {
            console.log(`   ⚠️  already enrolled`);

            const existingEnrollment = await model.findOne({
                user: userId,
                course: courseId
            });

            return existingEnrollment;
        }

        // create enrollment
        const enrollmentId = await generateEnrollmentId(userId, courseId);
        const newEnrollment = {
            _id: enrollmentId,
            user: userId,
            course: courseId,
            enrollmentDate: new Date().toISOString(),
            status: "ENROLLED"
        };

        const enrollment = await model.create(newEnrollment);

        console.log(`   ✅ enrolled successfully`);
        console.log(`      id: ${enrollmentId}`);
        console.log(`      user: ${userExists.username} (${userExists.role})`);
        console.log(`      course: ${courseExists.number} - ${courseExists.name}`);
        console.log(`   💡 reload to confirm`);

        return enrollment;
    } catch (error) {
        console.error(`   ❌ error:`, error);
        throw error;
    }
}

// unenroll user
export async function unenrollUserFromCourse(userId, courseId) {
    try {
        if (!userId || !courseId) {
            console.error("   ❌ ids required");
            throw new Error("userId and courseId are required");
        }

        console.log(`   🚫 unenrolling: ${userId} from ${courseId}`);

        // check enrolled
        const isEnrolled = await checkIfEnrolled(userId, courseId);
        if (!isEnrolled) {
            console.log(`   ⚠️  not enrolled`);

            return {
                status: "ok",
                message: "User was not enrolled in course",
                removed: 0
            };
        }

        // delete enrollment
        const result = await model.deleteOne({
            user: userId,
            course: courseId
        });

        console.log(`   ✅ unenrolled`);
        console.log(`      removed: ${result.deletedCount}`);
        console.log(`   💡 reload to confirm`);

        let gradesDeleted = 0;
        try {
            const gradeModel = (await import("../Grades/model.js")).default;
            const gradeResult = await gradeModel.deleteMany({
                student: userId,
                course: courseId
            });
            gradesDeleted = gradeResult.deletedCount;
            console.log(`   📊 deleted ${gradesDeleted} grade records`);
        } catch (err) {
            console.log(`   ⚠️ grade deletion skipped`);
        }

        console.log(`   ✅ unenrollment complete`);

        return {
            status: "ok",
            message: "Unenrollment successful",
            removed: result.deletedCount,
            gradesDeleted
        };
    } catch (error) {
        console.error(`   ❌ error:`, error);
        throw error;
    }
}

// bulk enroll
export async function bulkEnrollUsers(userIds, courseId) {
    try {
        console.log(`   🎓 bulk enroll: ${userIds.length} users → ${courseId}`);

        const enrollments = [];
        let alreadyEnrolledCount = 0;

        for (const userId of userIds) {
            const isEnrolled = await checkIfEnrolled(userId, courseId);

            if (!isEnrolled) {
                const enrollment = await enrollUserInCourse(userId, courseId);
                enrollments.push(enrollment);
            } else {
                alreadyEnrolledCount++;
            }
        }

        console.log(`   ✅ bulk complete`);
        console.log(`      enrolled: ${enrollments.length}`);
        console.log(`      already enrolled: ${alreadyEnrolledCount}`);

        return enrollments;
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// bulk unenroll
export async function bulkUnenrollUsers(userIds, courseId) {
    try {
        console.log(`   🚫 bulk unenroll: ${userIds.length} users from ${courseId}`);

        const results = [];

        for (const userId of userIds) {
            const result = await unenrollUserFromCourse(userId, courseId);
            results.push(result);
        }

        console.log(`   ✅ bulk complete`);

        return results;
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// get stats
export async function getEnrollmentStats(courseId) {
    try {
        console.log(`   📊 getting stats for: ${courseId}`);

        const enrollments = await model.find({ course: courseId }).populate("user");

        const stats = {
            courseId,
            total: enrollments.length,
            byStatus: {
                ENROLLED: enrollments.filter(e => e.status === "ENROLLED").length,
                DROPPED: enrollments.filter(e => e.status === "DROPPED").length,
                COMPLETED: enrollments.filter(e => e.status === "COMPLETED").length
            },
            byRole: {
                STUDENT: enrollments.filter(e => e.user?.role === "STUDENT").length,
                FACULTY: enrollments.filter(e => e.user?.role === "FACULTY").length,
                TA: enrollments.filter(e => e.user?.role === "TA").length,
                ADMIN: enrollments.filter(e => e.user?.role === "ADMIN").length
            },
            sections: {},
            recentEnrollments: enrollments
                .filter(e => {
                    const enrollDate = new Date(e.enrollmentDate);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return enrollDate >= weekAgo;
                })
                .length
        };

        enrollments.forEach(enrollment => {
            if (enrollment.user?.section) {
                const section = enrollment.user.section;
                stats.sections[section] = (stats.sections[section] || 0) + 1;
            }
        });

        console.log(`   📊 stats:`);
        console.log(`      total: ${stats.total}`);
        console.log(`      enrolled: ${stats.byStatus.ENROLLED}`);
        console.log(`      students: ${stats.byRole.STUDENT}`);
        console.log(`      recent: ${stats.recentEnrollments}`);

        return stats;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}

// get user stats
export async function getUserEnrollmentStats(userId) {
    try {
        const enrollments = await model.find({ user: userId }).populate("course");

        const stats = {
            userId,
            total: enrollments.length,
            byStatus: {
                ENROLLED: enrollments.filter(e => e.status === "ENROLLED").length,
                DROPPED: enrollments.filter(e => e.status === "DROPPED").length,
                COMPLETED: enrollments.filter(e => e.status === "COMPLETED").length
            },
            byDepartment: {},
            totalCredits: 0
        };

        enrollments.forEach(enrollment => {
            if (enrollment.course) {
                const dept = enrollment.course.department;
                stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;

                if (enrollment.status === "ENROLLED") {
                    stats.totalCredits += enrollment.course.credits || 0;
                }
            }
        });

        console.log(`   📊 user stats:`);
        console.log(`      courses: ${stats.total}`);
        console.log(`      enrolled: ${stats.byStatus.ENROLLED}`);
        console.log(`      credits: ${stats.totalCredits}`);

        return stats;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}
// delete enrollments for course (cascade delete)
export async function deleteEnrollmentsForCourse(courseId) {
    try {
        const result = await model.deleteMany({ course: courseId });

        console.log(`   🗑️ deleted ${result.deletedCount} enrollments`);

        return result.deletedCount;
    } catch (error) {
        console.error("   ❌ error:", error);
        return 0;
    }
}

// delete enrollments for user (cascade delete)
export async function deleteEnrollmentsForUser(userId) {
    try {
        const result = await model.deleteMany({ user: userId });

        console.log(`   🗑️ deleted ${result.deletedCount} enrollments`);

        return result.deletedCount;
    } catch (error) {
        console.error("   ❌ error:", error);
        return 0;
    }
}