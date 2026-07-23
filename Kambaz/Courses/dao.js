// Kambaz/Courses/dao.js
// database operations

import model from "./model.js";
import enrollmentModel from "../Enrollments/model.js";
import moduleModel from "../Modules/model.js";
import assignmentModel from "../Assignments/model.js";

// make course ID
async function generateCourseId(courseNumber, department) {
    try {
        const deptMatch = courseNumber.match(/^([A-Z]+)/);
        const deptCode = deptMatch ? deptMatch[1] : (department.substring(0, 2).toUpperCase());

        const coursesInDept = await model.find({
            _id: new RegExp(`^${deptCode}\\d+$`)
        });

        const numbers = coursesInDept
            .map(course => {
                const match = course._id.match(/^[A-Z]+(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);

        const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        const newId = `${deptCode}${nextNumber}`;

        console.log(`   🆔 generated id: ${newId}`);
        console.log(`      dept: ${deptCode}`);
        console.log(`      number: ${nextNumber}`);

        return newId;
    } catch (error) {
        console.error("   ❌ error:", error);
        return `COURSE${Date.now()}`;
    }
}

// create
export async function createCourse(courseData) {
    try {
        if (!courseData.name) {
            throw new Error("Course name is required");
        }

        if (!courseData.number) {
            throw new Error("Course number is required");
        }

        const existingCourse = await model.findOne({
            number: courseData.number.toUpperCase()
        });

        if (existingCourse) {
            throw new Error(`Course number ${courseData.number} already exists`);
        }

        const courseId = await generateCourseId(
            courseData.number,
            courseData.department || "Computer Science"
        );

        const newCourse = {
            _id: courseId,
            name: courseData.name.trim(),
            number: courseData.number.trim().toUpperCase(),
            description: courseData.description?.trim() || "No description provided",
            credits: courseData.credits || 4,
            department: courseData.department?.trim() || "Computer Science",
            instructor: courseData.instructor?.trim() || "Staff",
            startDate: courseData.startDate || new Date().toISOString(),
            endDate: courseData.endDate || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
            image: courseData.image || "/images/default-course.png",
            color: courseData.color || "#dc3545"
        };

        if (new Date(newCourse.endDate) <= new Date(newCourse.startDate)) {
            throw new Error("End date must be after start date");
        }

        const createdCourse = await model.create(newCourse);

        console.log(`   📚 created: ${createdCourse.number}`);
        console.log(`      id: ${createdCourse._id}`);
        console.log(`      instructor: ${createdCourse.instructor}`);
        console.log(`      dept: ${createdCourse.department}`);
        console.log(`      credits: ${createdCourse.credits}`);
        console.log(`   💡 reload to confirm`);

        try {
            console.log(`   ⚖️ auto-creating grading weights...`);
            const weightsDao = await import("../GradingWeights/dao.js");
            await weightsDao.findWeightsForCourse(created._id);
            console.log(`   ✅ grading weights created for ${created.number}`);
        } catch (weightError) {
            console.log(`   ⚠️ could not create weights:`, weightError.message);
            console.log(`   💡 weights will be created on first access`);
        }
        return createdCourse;
    } catch (error) {
        console.error("   ❌ error:", error.message);
        throw error;
    }
}

// get all
export async function findAllCourses() {
    try {
        const courses = await model.find().sort({ number: 1 });

        console.log(`   📚 got ${courses.length} courses`);

        const deptCounts = {};
        courses.forEach(course => {
            deptCounts[course.department] = (deptCounts[course.department] || 0) + 1;
        });

        console.log(`      depts:`, Object.entries(deptCounts)
            .map(([dept, count]) => `${dept}(${count})`)
            .join(', '));

        return courses;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}

// get user's courses
export async function findCoursesForEnrolledUser(userId) {
    try {
        if (!userId) {
            console.error("   ❌ userId required");
            return [];
        }

        const enrollments = await enrollmentModel
            .find({ user: userId, status: "ENROLLED" })
            .populate("course");

        const courses = enrollments
            .map((enrollment) => enrollment.course)
            .filter((course) => course !== null);

        console.log(`   👤 user ${userId} in ${courses.length} courses`);

        if (courses.length > 0) {
            console.log(`      courses:`);
            courses.forEach((course, index) => {
                console.log(`         ${index + 1}. ${course.number}: ${course.name}`);
            });
        }

        return courses;
    } catch (error) {
        console.error(`   ❌ error for user ${userId}:`, error);
        return [];
    }
}

// find by number
export async function findCourseByNumber(courseNumber) {
    try {
        const normalizedNumber = courseNumber.toUpperCase();
        const course = await model.findOne({ number: normalizedNumber });

        if (course) {
            console.log(`   🔍 found: ${course.number}`);
        } else {
            console.log(`   ⚠️  not found: ${normalizedNumber}`);
        }

        return course;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}

// find by dept
export async function findCoursesByDepartment(department) {
    try {
        const courses = await model.find({ department: department }).sort({ number: 1 });

        console.log(`   🏛️ found ${courses.length} in ${department}`);

        return courses;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}

// find by instructor
export async function findCoursesByInstructor(instructor) {
    try {
        const courses = await model.find({ instructor: instructor }).sort({ number: 1 });

        console.log(`   👨‍🏫 found ${courses.length} by ${instructor}`);

        return courses;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}

// find active
export async function findActiveCourses() {
    try {
        const now = new Date().toISOString();

        const courses = await model.find({
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).sort({ number: 1 });

        console.log(`   📅 found ${courses.length} active`);

        return courses;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}

// update
export async function updateCourse(courseId, courseUpdates) {
    try {
        if (!courseId) {
            throw new Error("courseId is required");
        }

        if (!courseUpdates || Object.keys(courseUpdates).length === 0) {
            throw new Error("No updates provided");
        }

        const existingCourse = await model.findById(courseId);
        if (!existingCourse) {
            console.log(`   ⚠️  not found: ${courseId}`);
            return null;
        }

        if (courseUpdates.number && courseUpdates.number !== existingCourse.number) {
            const duplicate = await model.findOne({
                number: courseUpdates.number.toUpperCase(),
                _id: { $ne: courseId }
            });

            if (duplicate) {
                throw new Error(`Course number ${courseUpdates.number} already in use`);
            }
        }

        if (courseUpdates.startDate || courseUpdates.endDate) {
            const startDate = courseUpdates.startDate || existingCourse.startDate;
            const endDate = courseUpdates.endDate || existingCourse.endDate;

            if (new Date(endDate) <= new Date(startDate)) {
                throw new Error("End date must be after start date");
            }
        }

        await model.updateOne(
            { _id: courseId },
            { $set: courseUpdates }
        );

        const updatedCourse = await model.findById(courseId);

        console.log(`   ✏️ updated: ${updatedCourse.number}`);
        console.log(`      fields: ${Object.keys(courseUpdates).join(', ')}`);
        console.log(`   💡 reload to confirm`);

        return updatedCourse;
    } catch (error) {
        console.error(`   ❌ error:`, error.message);
        throw error;
    }
}

// delete
export async function deleteCourse(courseId) {
    try {
        if (!courseId) {
            throw new Error("courseId is required");
        }

        const course = await model.findById(courseId);
        if (!course) {
            console.log(`   ⚠️  not found: ${courseId}`);
            return {
                message: "Course not found",
                deletedCourse: false
            };
        }

        console.log(`   🗑️ deleting: ${course.number}`);
        console.log(`      id: ${course._id}`);

        console.log(`      📄 cascade delete...`);

        const enrollmentResult = await enrollmentModel.deleteMany({ course: courseId });
        console.log(`      ✔ deleted ${enrollmentResult.deletedCount} enrollments`);

        const moduleResult = await moduleModel.deleteMany({ course: courseId });
        console.log(`      ✔ deleted ${moduleResult.deletedCount} modules`);

        const assignmentResult = await assignmentModel.deleteMany({ course: courseId });
        console.log(`      ✔ deleted ${assignmentResult.deletedCount} assignments`);


        let deletedWeights = 0;
        try {
            const quizModel = (await import("../Quizzes/model.js")).default;
            const quizResult = await quizModel.deleteMany({ course: courseId });
            console.log(`      ✔ deleted ${quizResult.deletedCount} quizzes`);
        } catch (error) {
            console.log("      ⚠️ quizzes skipped");
        }

        try {
            const examModel = (await import("../Exams/model.js")).default;
            const examResult = await examModel.deleteMany({ course: courseId });
            console.log(`      ✔ deleted ${examResult.deletedCount} exams`);
        } catch (error) {
            console.log("      ⚠️ exams skipped");
        }

        try {
            const gradeModel = (await import("../Grades/model.js")).default;
            const gradeResult = await gradeModel.deleteMany({ course: courseId });
            console.log(`      ✔ deleted ${gradeResult.deletedCount} grades`);
        } catch (error) {
            console.log("      ⚠️ grades skipped");
        }
        try {
            const weightsDao = await import("../GradingWeights/dao.js");
            deletedWeights = await weightsDao.deleteWeights(courseId);
            if (deletedWeights > 0) {
                console.log(`      ✔ deleted grading weights`);
            }
        } catch (error) {
            console.log("      ⚠️ weights cleanup skipped");
        }
        let deletedQuizzes = 0;
        try {
            const quizModel = (await import("../Quizzes/model.js")).default;
            const quizResult = await quizModel.deleteMany({ course: courseId });
            deletedQuizzes = quizResult.deletedCount;
            console.log(`deleted ${deletedQuizzes} quizzes`);
        } catch (error) {
            console.log("quizzes cleanup skipped:", error.message);
        }

        // delete grades
        let deletedGrades = 0;
        try {
            const gradeModel = (await import("../Grades/model.js")).default;
            const gradeResult = await gradeModel.deleteMany({ course: courseId });
            deletedGrades = gradeResult.deletedCount;
            console.log(`deleted ${deletedGrades} grades`);
        } catch (error) {
            console.log("grades cleanup skipped");
        }

        await model.deleteOne({ _id: courseId });
        console.log(`      ✔ deleted course`);

        console.log(`   ✅ deleted successfully`);
        console.log(`   💡 reload to confirm`);

        return {
            message: "Course deleted successfully",
            deletedCourse: true,
            deletedEnrollments: enrollmentResult.deletedCount,
            deletedModules: moduleResult.deletedCount,
            deletedAssignments: assignmentResult.deletedCount,
            courseNumber: course.number,
            courseName: course.name
        };
    } catch (error) {
        console.error(`   ❌ error:`, error.message);
        throw error;
    }
}

// get stats
export async function getCourseStatistics(courseId) {
    try {
        const course = await model.findById(courseId);
        if (!course) {
            throw new Error("Course not found");
        }

        const [enrollmentCount, moduleCount, assignmentCount] = await Promise.all([
            enrollmentModel.countDocuments({ course: courseId }),
            moduleModel.countDocuments({ course: courseId }),
            assignmentModel.countDocuments({ course: courseId })
        ]);

        const stats = {
            courseId,
            courseName: course.name,
            courseNumber: course.number,
            enrolledStudents: enrollmentCount,
            modules: moduleCount,
            assignments: assignmentCount,
            credits: course.credits,
            instructor: course.instructor,
            department: course.department,
            isActive: new Date(course.startDate) <= new Date() && new Date(course.endDate) >= new Date(),
            startDate: course.startDate,
            endDate: course.endDate,
            color: course.color
        };

        console.log(`   📊 stats for ${course.number}:`);
        console.log(`      students: ${enrollmentCount}`);
        console.log(`      modules: ${moduleCount}`);
        console.log(`      assignments: ${assignmentCount}`);
        console.log(`      status: ${stats.isActive ? 'Active' : 'Inactive'}`);

        return stats;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}

// search
export async function searchCourses(searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim() === '') {
            return await findAllCourses();
        }

        const trimmedTerm = searchTerm.trim();

        const regex = new RegExp(trimmedTerm, "i");

        const courses = await model.find({
            $or: [
                { name: { $regex: regex } },
                { number: { $regex: regex } },
                { description: { $regex: regex } },
                { instructor: { $regex: regex } },
                { department: { $regex: regex } }
            ]
        }).sort({ number: 1 });

        console.log(`   🔍 found ${courses.length} matching "${trimmedTerm}"`);

        if (courses.length > 0 && courses.length <= 5) {
            courses.forEach(c => console.log(`      • ${c.number}: ${c.name}`));
        }

        return courses;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}

// get depts
export async function getAllDepartments() {
    try {
        const departments = await model.distinct("department");

        console.log(`   🏛️ found ${departments.length} depts`);

        return departments.sort();
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}

// get instructors
export async function getAllInstructors() {
    try {
        const instructors = await model.distinct("instructor");

        console.log(`   👨‍🏫 found ${instructors.length} instructors`);

        return instructors.sort();
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}

// bulk update
export async function bulkUpdateCourses(filter, updates) {
    try {
        const result = await model.updateMany(filter, { $set: updates });

        console.log(`   ✏️ bulk updated ${result.modifiedCount} courses`);
        console.log(`      matched: ${result.matchedCount}, modified: ${result.modifiedCount}`);

        return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            message: `Updated ${result.modifiedCount} courses`
        };
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// validate data
export function validateCourseData(courseData) {
    const errors = [];

    if (!courseData.name || courseData.name.trim().length < 3) {
        errors.push("Course name must be at least 3 characters");
    }

    if (courseData.name && courseData.name.length > 200) {
        errors.push("Course name cannot exceed 200 characters");
    }

    if (!courseData.number) {
        errors.push("Course number is required");
    } else if (!courseData.number.match(/^[A-Z]{2,4}\d{4}$/i)) {
        errors.push("Course number must be in format like CS5610 or RS101");
    }

    if (courseData.credits !== undefined) {
        const credits = parseInt(courseData.credits);
        if (isNaN(credits) || credits < 1 || credits > 12) {
            errors.push("Credits must be between 1 and 12");
        }
    }

    if (courseData.startDate && courseData.endDate) {
        const start = new Date(courseData.startDate);
        const end = new Date(courseData.endDate);

        if (isNaN(start.getTime())) {
            errors.push("Start date is invalid");
        }

        if (isNaN(end.getTime())) {
            errors.push("End date is invalid");
        }

        if (end <= start) {
            errors.push("End date must be after start date");
        }
    }

    if (courseData.color && !courseData.color.match(/^#[0-9A-Fa-f]{6}$/)) {
        errors.push("Color must be a valid hex code (e.g., #dc3545)");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}