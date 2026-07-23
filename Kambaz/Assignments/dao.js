// Kambaz/Assignments/dao.js
// assignment database functions

import model from "./model.js";
import courseModel from "../Courses/model.js";

// get assignments for course
export async function findAssignmentsForCourse(courseId) {
    try {
        if (!courseId) {
            console.error("   ❌ findAssignmentsForCourse: courseId is required");
            return [];
        }

        const courseExists = await courseModel.findById(courseId);
        if (!courseExists) {
            console.log(`   ⚠️ Course ${courseId} not found`);
            return [];
        }

        const assignments = await model.find({ course: courseId }).sort({ dueDate: 1 });

        const regularAssignments = assignments.filter(a => a.assignmentType === 'ASSIGNMENT').length;
        const projects = assignments.filter(a => a.assignmentType === 'PROJECTS').length;

        console.log(`   📋 Found ${assignments.length} assignments for course ${courseId}`);
        console.log(`      Regular assignments: ${regularAssignments}`);
        console.log(`      Projects: ${projects}`);

        const now = new Date();
        const upcoming = assignments.filter(a => new Date(a.dueDate) >= now).length;
        const overdue = assignments.filter(a => new Date(a.dueDate) < now).length;
        console.log(`      Upcoming: ${upcoming}, Overdue: ${overdue}`);

        return assignments;
    } catch (error) {
        console.error(`   ❌ Error finding assignments for course ${courseId}:`, error);
        return [];
    }
}

// get one assignment
export async function findAssignmentById(assignmentId) {
    try {
        const assignment = await model.findById(assignmentId);

        if (assignment) {
            console.log(`   📋 Found assignment: ${assignment.title}`);
            console.log(`      Points: ${assignment.points}`);
            console.log(`      Due: ${new Date(assignment.dueDate).toLocaleDateString()}`);
        } else {
            console.log(`   ⚠️ Assignment ${assignmentId} not found`);
        }

        return assignment;
    } catch (error) {
        console.error("   ❌ Error finding assignment by ID:", error);
        return null;
    }
}

// generate ID
async function generateAssignmentId(courseId, assignmentType) {
    try {
        const course = await courseModel.findById(courseId);
        if (!course) {
            throw new Error("Course not found");
        }

        const courseNumber = course.number;

        let prefix = "A";
        if (assignmentType === "PROJECTS") {
            prefix = "P";
        }

        const assignmentsInCourse = await model.find({
            course: courseId,
            assignmentType: assignmentType || "ASSIGNMENT"
        });

        const numbers = assignmentsInCourse
            .map(assignment => {
                const match = assignment._id.match(/^[AP](\d+)-/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);

        const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        const newId = `${prefix}${nextNumber}-${courseNumber}`;

        console.log(`   🆔 Generated assignment ID: ${newId}`);

        return newId;
    } catch (error) {
        console.error("   ❌ Error generating assignment ID:", error);
        return `A${Date.now()}-UNKNOWN`;
    }
}

// create assignment
export async function createAssignment(assignmentData) {
    try {
        if (!assignmentData.title) {
            throw new Error("Assignment title is required");
        }

        if (!assignmentData.course) {
            throw new Error("Course ID is required");
        }

        const courseExists = await courseModel.findById(assignmentData.course);
        if (!courseExists) {
            throw new Error(`Course ${assignmentData.course} not found`);
        }

        const assignmentType = assignmentData.assignmentType || "ASSIGNMENT";
        const assignmentId = await generateAssignmentId(assignmentData.course, assignmentType);

        const newAssignment = {
            _id: assignmentId,
            title: assignmentData.title.trim(),
            description: assignmentData.description?.trim() || "No description provided",
            points: assignmentData.points || 100,
            dueDate: assignmentData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            availableDate: assignmentData.availableDate || new Date().toISOString(),
            assignmentType: assignmentData.assignmentType || "ASSIGNMENT",
            course: assignmentData.course
        };

        const validTypes = ["ASSIGNMENT", "PROJECTS"];
        if (!validTypes.includes(newAssignment.assignmentType.toUpperCase())) {
            throw new Error(`Invalid assignment type. Must be: ${validTypes.join(' or ')}`);
        }

        if (new Date(newAssignment.dueDate) < new Date(newAssignment.availableDate)) {
            throw new Error("Due date must be after available date");
        }

        const createdAssignment = await model.create(newAssignment);

        console.log(`   📋 Created assignment: ${createdAssignment.title}`);
        console.log(`      ID: ${createdAssignment._id}`);
        console.log(`      Type: ${createdAssignment.assignmentType}`);
        console.log(`      Course: ${createdAssignment.course}`);
        console.log(`      Points: ${createdAssignment.points}`);
        console.log(`      Due: ${new Date(createdAssignment.dueDate).toLocaleDateString()}`);
        console.log(`   💡 Reload Assignments page to confirm persistence`);
        console.log(`   💡 Check MongoDB Compass 'assignments' collection`);

        // auto-create grades
        try {
            console.log(`   📊 Auto-creating grade records...`);
            const gradesDao = await import("../Grades/dao.js");
            await gradesDao.createGradesForAssessment(
                createdAssignment._id,
                createdAssignment.course,
                createdAssignment.points
            );
        } catch (gradeError) {
            console.log(`   ⚠️ Could not auto-create grades:`, gradeError.message);
        }
        return createdAssignment;
    } catch (error) {
        console.error("   ❌ Error creating assignment:", error.message);
        throw error;
    }
}

// update assignment
export async function updateAssignment(assignmentId, assignmentUpdates) {
    try {
        if (!assignmentId) {
            throw new Error("assignmentId is required");
        }

        if (!assignmentUpdates || Object.keys(assignmentUpdates).length === 0) {
            throw new Error("No updates provided");
        }

        const existingAssignment = await model.findById(assignmentId);
        if (!existingAssignment) {
            console.log(`   ⚠️ Assignment ${assignmentId} not found for update`);
            return null;
        }

        if (assignmentUpdates.assignmentType) {
            const validTypes = ["ASSIGNMENT", "PROJECTS"];
            if (!validTypes.includes(assignmentUpdates.assignmentType.toUpperCase())) {
                throw new Error(`Invalid assignment type. Must be: ${validTypes.join(' or ')}`);
            }
        }

        if (assignmentUpdates.dueDate && assignmentUpdates.availableDate) {
            if (new Date(assignmentUpdates.dueDate) < new Date(assignmentUpdates.availableDate)) {
                throw new Error("Due date must be after available date");
            }
        } else if (assignmentUpdates.dueDate) {
            if (new Date(assignmentUpdates.dueDate) < new Date(existingAssignment.availableDate)) {
                throw new Error("Due date must be after available date");
            }
        } else if (assignmentUpdates.availableDate) {
            if (new Date(existingAssignment.dueDate) < new Date(assignmentUpdates.availableDate)) {
                throw new Error("Available date must be before due date");
            }
        }

        await model.updateOne(
            { _id: assignmentId },
            { $set: assignmentUpdates }
        );

        const updatedAssignment = await model.findById(assignmentId);

        console.log(`   ✏️ Updated assignment: ${updatedAssignment.title}`);
        console.log(`      Updated fields: ${Object.keys(assignmentUpdates).join(', ')}`);
        console.log(`   💡 Reload Assignments page to confirm persistence`);

        // update grades if points changed
        if (assignmentUpdates.points) {
            try {
                const gradesDao = await import("../Grades/dao.js");
                const gradeModel = (await import("../Grades/model.js")).default;

                await gradeModel.updateMany(
                    { assignment: assignmentId },
                    { $set: { maxPoints: assignmentUpdates.points } }
                );

                console.log(`   ✅ Updated max points in grade records`);
            } catch (gradeError) {
                console.log(`   ⚠️ Could not update grade records:`, gradeError.message);
            }
        }
        return updatedAssignment;
    } catch (error) {
        console.error(`   ❌ Error updating assignment ${assignmentId}:`, error.message);
        throw error;
    }
}

// delete assignment
export async function deleteAssignment(assignmentId) {
    try {
        if (!assignmentId) {
            throw new Error("assignmentId is required");
        }

        const assignment = await model.findById(assignmentId);
        if (!assignment) {
            console.log(`   ⚠️ Assignment ${assignmentId} not found for deletion`);
            return {
                message: "Assignment not found",
                deletedAssignment: false
            };
        }

        console.log(`   🗑️ Deleting assignment: ${assignment.title}`);
        console.log(`      Course: ${assignment.course}`);
        console.log(`      Points: ${assignment.points}`);
        console.log(`      Type: ${assignment.assignmentType}`);

        // delete related grades
        let deletedGradesCount = 0;

        try {
            const gradeModel = (await import("../Grades/model.js")).default;
            const gradeResult = await gradeModel.deleteMany({ assignment: assignmentId });
            console.log(`      ✔ Deleted ${gradeResult.deletedCount} grades`);
        } catch (error) {
            console.log("      ⚠️ Grades cleanup skipped (collection may not exist)");
        }

        const result = await model.deleteOne({ _id: assignmentId });

        console.log(`   ✅ Assignment deleted successfully`);
        console.log(`   💡 Reload Assignments page to confirm deletion`);
        console.log(`   💡 Check MongoDB Compass to verify removal`);
        console.log(`      Deleted ${deletedGradesCount} grade records`);


        return {
            message: "Assignment deleted successfully",
            deletedAssignment: true,
            assignmentTitle: assignment.title,
            deletedGrades: 0
        };
    } catch (error) {
        console.error(`   ❌ Error deleting assignment ${assignmentId}:`, error.message);
        throw error;
    }
}

// filter by type
export async function findAssignmentsByType(courseId, type) {
    try {
        const validTypes = ["ASSIGNMENT", "PROJECTS"];
        const normalizedType = type.toUpperCase();

        if (!validTypes.includes(normalizedType)) {
            throw new Error(`Invalid type. Must be: ${validTypes.join(' or ')}`);
        }

        const assignments = await model.find({
            course: courseId,
            assignmentType: normalizedType
        }).sort({ dueDate: 1 });

        console.log(`   🔍 Found ${assignments.length} ${normalizedType} for course ${courseId}`);

        return assignments;
    } catch (error) {
        console.error("   ❌ Error finding assignments by type:", error);
        return [];
    }
}

// find upcoming
export async function findUpcomingAssignments(courseId, daysAhead = 30) {
    try {
        const now = new Date();
        const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        const assignments = await model.find({
            course: courseId,
            dueDate: {
                $gte: now.toISOString(),
                $lte: futureDate.toISOString()
            }
        }).sort({ dueDate: 1 });

        console.log(`   📅 Found ${assignments.length} upcoming assignments (next ${daysAhead} days)`);

        return assignments;
    } catch (error) {
        console.error("   ❌ Error finding upcoming assignments:", error);
        return [];
    }
}

// find overdue
export async function findOverdueAssignments(courseId) {
    try {
        const now = new Date();

        const assignments = await model.find({
            course: courseId,
            dueDate: { $lt: now.toISOString() }
        }).sort({ dueDate: -1 });

        console.log(`   ⏰ Found ${assignments.length} overdue assignments`);

        return assignments;
    } catch (error) {
        console.error("   ❌ Error finding overdue assignments:", error);
        return [];
    }
}

// search
export async function searchAssignments(courseId, searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim() === '') {
            return await findAssignmentsForCourse(courseId);
        }

        const regex = new RegExp(searchTerm.trim(), "i");

        const assignments = await model.find({
            course: courseId,
            $or: [
                { title: { $regex: regex } },
                { description: { $regex: regex } }
            ]
        }).sort({ dueDate: 1 });

        console.log(`   🔍 Found ${assignments.length} assignments matching "${searchTerm}"`);

        return assignments;
    } catch (error) {
        console.error("   ❌ Error searching assignments:", error);
        return [];
    }
}

// get stats
export async function getAssignmentStatistics(courseId) {
    try {
        const assignments = await model.find({ course: courseId });

        const now = new Date();

        const stats = {
            courseId,
            total: assignments.length,
            byType: {
                ASSIGNMENT: assignments.filter(a => a.assignmentType === 'ASSIGNMENT').length,
                PROJECTS: assignments.filter(a => a.assignmentType === 'PROJECTS').length
            },
            byStatus: {
                upcoming: assignments.filter(a => new Date(a.dueDate) > now).length,
                overdue: assignments.filter(a => new Date(a.dueDate) < now).length,
                dueToday: assignments.filter(a => {
                    const due = new Date(a.dueDate);
                    const today = new Date();
                    return due.toDateString() === today.toDateString();
                }).length
            },
            points: {
                total: assignments.reduce((sum, a) => sum + (a.points || 0), 0),
                average: 0,
                max: Math.max(...assignments.map(a => a.points || 0), 0),
                min: Math.min(...assignments.map(a => a.points || 0), 0)
            }
        };

        stats.points.average = stats.total > 0
            ? (stats.points.total / stats.total).toFixed(2)
            : 0;

        console.log(`   📊 Assignment statistics for course ${courseId}:`);
        console.log(`      Total: ${stats.total}`);
        console.log(`      Regular: ${stats.byType.ASSIGNMENT}, Projects: ${stats.byType.PROJECTS}`);
        console.log(`      Upcoming: ${stats.byStatus.upcoming}, Overdue: ${stats.byStatus.overdue}`);
        console.log(`      Total points: ${stats.points.total}`);

        return stats;
    } catch (error) {
        console.error("   ❌ Error getting assignment statistics:", error);
        return null;
    }
}

// bulk update dates
export async function bulkUpdateDueDates(courseId, daysToAdd) {
    try {
        const assignments = await model.find({ course: courseId });

        console.log(`   📅 Bulk updating ${assignments.length} due dates by ${daysToAdd} days`);

        const updatePromises = assignments.map(assignment => {
            const newDueDate = new Date(assignment.dueDate);
            newDueDate.setDate(newDueDate.getDate() + daysToAdd);

            return model.updateOne(
                { _id: assignment._id },
                { $set: { dueDate: newDueDate.toISOString() } }
            );
        });

        await Promise.all(updatePromises);

        console.log(`   ✅ Bulk update complete: ${assignments.length} assignments updated`);

        return {
            message: `Updated ${assignments.length} assignment due dates`,
            updatedCount: assignments.length
        };
    } catch (error) {
        console.error("   ❌ Error bulk updating due dates:", error);
        throw error;
    }
}

// validate
export function validateAssignmentData(assignmentData) {
    const errors = [];

    if (!assignmentData.title || assignmentData.title.trim().length === 0) {
        errors.push("Assignment title is required");
    }

    if (assignmentData.title && assignmentData.title.length > 200) {
        errors.push("Title cannot exceed 200 characters");
    }

    if (assignmentData.points !== undefined) {
        const points = parseInt(assignmentData.points);
        if (isNaN(points) || points < 0 || points > 1000) {
            errors.push("Points must be between 0 and 1000");
        }
    }

    if (assignmentData.assignmentType) {
        const validTypes = ["ASSIGNMENT", "PROJECTS"];
        if (!validTypes.includes(assignmentData.assignmentType.toUpperCase())) {
            errors.push(`Type must be: ${validTypes.join(' or ')}`);
        }
    }

    if (assignmentData.dueDate && assignmentData.availableDate) {
        if (new Date(assignmentData.dueDate) < new Date(assignmentData.availableDate)) {
            errors.push("Due date must be after available date");
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}