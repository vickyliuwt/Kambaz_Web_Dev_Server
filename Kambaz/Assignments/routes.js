// Kambaz/Assignments/routes.js
// assignment API routes

import * as assignmentsDao from "./dao.js";

export default function AssignmentRoutes(app) {

    // update assignment
    const updateAssignment = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'Pragma': 'no-cache'
            });

            const { assignmentId } = req.params;
            const assignmentUpdates = req.body;

            console.log(`   ✏️ UPDATE ASSIGNMENT REQUEST: ${assignmentId}`);
            console.log(`      Updating fields: ${Object.keys(assignmentUpdates).join(', ')}`);

            if (assignmentUpdates.title) {
                console.log(`      New title: "${assignmentUpdates.title}"`);
            }
            if (assignmentUpdates.points) {
                console.log(`      New points: ${assignmentUpdates.points}`);
            }

            const validation = assignmentsDao.validateAssignmentData(assignmentUpdates);
            if (!validation.isValid) {
                console.log("      ❌ Validation failed:", validation.errors);
                res.status(400).json({
                    message: "Validation failed",
                    errors: validation.errors
                });
                return;
            }

            const updatedAssignment = await assignmentsDao.updateAssignment(
                assignmentId,
                assignmentUpdates
            );

            if (!updatedAssignment) {
                console.log("      ⚠️ Assignment not found");
                res.status(404).json({
                    message: "Assignment not found",
                    assignmentId: assignmentId
                });
                return;
            }

            console.log(`   ✅ Assignment updated successfully`);
            console.log(`      Title: ${updatedAssignment.title}`);
            console.log(`      Points: ${updatedAssignment.points}`);
            console.log(`   💡 Reload Assignments page to confirm persistence`);
            console.log(`   💡 Check MongoDB Compass 'assignments' collection`);

            res.json(updatedAssignment);
        } catch (error) {
            console.error("   ❌ Update assignment error:", error);
            res.status(500).json({
                message: "Failed to update assignment",
                error: error.message
            });
        }
    };

    // delete assignment
    const deleteAssignment = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { assignmentId } = req.params;

            console.log(`   🗑️ DELETE ASSIGNMENT REQUEST: ${assignmentId}`);

            const status = await assignmentsDao.deleteAssignment(assignmentId);

            console.log(`   ✅ Assignment deletion complete`);
            console.log(`      Deleted assignment: ${status.assignmentTitle || 'Unknown'}`);
            console.log(`   💡 Reload Assignments page to confirm deletion`);
            console.log(`   💡 Check MongoDB Compass 'assignments' collection`);

            res.json(status);
        } catch (error) {
            console.error("   ❌ Delete assignment error:", error);
            res.status(500).json({
                message: "Failed to delete assignment",
                error: error.message
            });
        }
    };

    // get by ID
    const findAssignmentById = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { assignmentId } = req.params;

            console.log(`   🔍 FIND ASSIGNMENT BY ID: ${assignmentId}`);

            const assignment = await assignmentsDao.findAssignmentById(assignmentId);

            if (!assignment) {
                res.status(404).json({ message: "Assignment not found" });
                return;
            }

            console.log(`   ✅ Found assignment: ${assignment.title}`);

            res.json(assignment);
        } catch (error) {
            console.error("   ❌ Find assignment error:", error);
            res.status(500).json({
                message: "Failed to retrieve assignment",
                error: error.message
            });
        }
    };

    // get stats
    const getAssignmentStats = async (req, res) => {
        try {
            const { courseId } = req.params;

            console.log(`   📊 GET ASSIGNMENT STATS: ${courseId}`);

            const stats = await assignmentsDao.getAssignmentStatistics(courseId);

            if (!stats) {
                res.status(404).json({ message: "Course not found" });
                return;
            }

            console.log(`   ✅ Returning statistics`);

            res.json(stats);
        } catch (error) {
            console.error("   ❌ Get assignment stats error:", error);
            res.status(500).json({
                message: "Failed to retrieve statistics",
                error: error.message
            });
        }
    };

    // search
    const searchAssignments = async (req, res) => {
        try {
            const { courseId } = req.params;
            const { query } = req.query;

            console.log(`   🔍 SEARCH ASSIGNMENTS in ${courseId}: "${query}"`);

            const assignments = await assignmentsDao.searchAssignments(courseId, query);

            console.log(`   ✅ Found ${assignments.length} matching assignments`);

            res.json(assignments);
        } catch (error) {
            console.error("   ❌ Search assignments error:", error);
            res.status(500).json({
                message: "Failed to search assignments",
                error: error.message
            });
        }
    };

    // register routes
    console.log("   📝 Registering assignment routes...");

    app.get("/api/assignments/:assignmentId", findAssignmentById);
    app.put("/api/assignments/:assignmentId", updateAssignment);
    app.delete("/api/assignments/:assignmentId", deleteAssignment);

    app.get("/api/assignments/stats/:courseId", getAssignmentStats);
    app.get("/api/assignments/search/:courseId", searchAssignments);

    console.log("   ✅ Assignment routes registered successfully");
    console.log("");
    console.log("   📋 Available assignment endpoints:");
    console.log("      GET    /api/assignments/:assignmentId");
    console.log("      PUT    /api/assignments/:assignmentId");
    console.log("      DELETE /api/assignments/:assignmentId");
    console.log("      GET    /api/assignments/stats/:courseId");
    console.log("      GET    /api/assignments/search/:courseId?query=...");
    console.log("");
    console.log("   💡 NOTE: Create/List handled via Courses routes:");
    console.log("      GET    /api/courses/:courseId/assignments");
    console.log("      POST   /api/courses/:courseId/assignments");
    console.log("");
}