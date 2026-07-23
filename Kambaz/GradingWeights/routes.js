// Kambaz/GradingWeights/routes.js
// API endpoints for grading weights - FIXED VERSION

import * as weightsDao from "./dao.js";

export default function GradingWeightsRoutes(app) {

    // ✅ FIXED: improved cache-busting and error responses
    const findWeightsForCourse = async (req, res) => {
        try {
            // set aggressive cache-busting headers
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            });

            const { courseId } = req.params;

            console.log(`\n🎯 GET WEIGHTS REQUEST`);
            console.log(`   course: ${courseId}`);

            const weights = await weightsDao.findWeightsForCourse(courseId);

            if (!weights) {
                console.log(`   ⚠️ weights not found for course ${courseId}`);
                res.status(404).json({
                    message: "Course not found or weights could not be created",
                    courseId: courseId
                });
                return;
            }

            console.log(`   ✅ returning weights to client`);
            console.log(`      A:${weights.weights.ASSIGNMENTS}%, Q:${weights.weights.QUIZZES}%, E:${weights.weights.EXAMS}%, P:${weights.weights.PROJECTS}%\n`);

            res.json(weights);
        } catch (error) {
            console.error("   ❌ error in findWeightsForCourse:", error);
            res.status(500).json({
                message: "Failed to retrieve weights",
                error: error.message
            });
        }
    };

    // ✅ FIXED: improved update with immediate response
    const updateWeights = async (req, res) => {
        try {
            // set cache-busting headers
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });

            const { courseId } = req.params;
            const { weights } = req.body;

            console.log(`\n✏️ UPDATE WEIGHTS REQUEST`);
            console.log(`   course: ${courseId}`);
            console.log(`   new values: A:${weights.ASSIGNMENTS}%, Q:${weights.QUIZZES}%, E:${weights.EXAMS}%, P:${weights.PROJECTS}%`);

            // check permission
            if (!req.session?.currentUser) {
                console.log(`   ❌ no authenticated user`);
                res.status(401).json({ message: "Authentication required" });
                return;
            }

            const userRole = req.session.currentUser.role;
            if (userRole !== "ADMIN" && userRole !== "FACULTY" && userRole !== "TA") {
                console.log(`   ❌ unauthorized: ${userRole}`);
                res.status(403).json({
                    message: "Only admins, faculty, and TAs can edit grading weights"
                });
                return;
            }

            // validate
            const validation = weightsDao.validateWeightData(weights);
            if (!validation.isValid) {
                console.log("   ❌ validation failed:", validation.errors);
                res.status(400).json({
                    message: "Validation failed",
                    errors: validation.errors
                });
                return;
            }

            const updated = await weightsDao.updateWeights(
                courseId,
                weights,
                req.session.currentUser._id
            );

            console.log(`   ✅ weights updated successfully in MongoDB`);
            console.log(`   📝 last modified by: ${req.session.currentUser.loginId}`);
            console.log(`   💾 persisted to database\n`);

            res.json(updated);
        } catch (error) {
            console.error("   ❌ error in updateWeights:", error);
            res.status(500).json({
                message: "Failed to update weights",
                error: error.message
            });
        }
    };

    // reset to defaults
    const resetWeights = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache'
            });

            const { courseId } = req.params;

            console.log(`\n🔄 RESET WEIGHTS REQUEST`);
            console.log(`   course: ${courseId}`);

            // check permission
            if (!req.session?.currentUser) {
                res.status(401).json({ message: "Authentication required" });
                return;
            }

            const userRole = req.session.currentUser.role;
            if (userRole !== "ADMIN" && userRole !== "FACULTY") {
                res.status(403).json({
                    message: "Only admins and faculty can reset weights"
                });
                return;
            }

            const reset = await weightsDao.resetWeightsToDefault(
                courseId,
                req.session.currentUser._id
            );

            console.log(`   ✅ reset to defaults (40/10/20/30)\n`);

            res.json(reset);
        } catch (error) {
            console.error("   ❌ error in resetWeights:", error);
            res.status(500).json({
                message: "Failed to reset weights",
                error: error.message
            });
        }
    };

    // get all weights (admin only)
    const findAllWeights = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            console.log(`\n📊 GET ALL WEIGHTS REQUEST`);

            // check admin permission
            if (!req.session?.currentUser || req.session.currentUser.role !== "ADMIN") {
                res.status(403).json({
                    message: "Admin access required"
                });
                return;
            }

            const allWeights = await weightsDao.findAllWeights();

            console.log(`   ✅ returning ${allWeights.length} weight configurations\n`);

            res.json(allWeights);
        } catch (error) {
            console.error("   ❌ error in findAllWeights:", error);
            res.status(500).json({
                message: "Failed to retrieve all weights",
                error: error.message
            });
        }
    };

    // delete weights
    const deleteWeights = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { courseId } = req.params;

            console.log(`\n🗑️ DELETE WEIGHTS REQUEST`);
            console.log(`   course: ${courseId}`);

            // check admin permission
            if (!req.session?.currentUser || req.session.currentUser.role !== "ADMIN") {
                res.status(403).json({
                    message: "Admin access required"
                });
                return;
            }

            const deleted = await weightsDao.deleteWeights(courseId);

            console.log(`   ✅ deletion complete\n`);

            res.json({
                message: "Weights deleted successfully",
                deleted: deleted
            });
        } catch (error) {
            console.error("   ❌ error in deleteWeights:", error);
            res.status(500).json({
                message: "Failed to delete weights",
                error: error.message
            });
        }
    };

    // ✅ CRITICAL: register specific routes BEFORE parameterized routes
    console.log("\n📌 REGISTERING GRADING WEIGHTS ROUTES");
    console.log("   ⚠️ Order matters: specific routes must come before parameterized routes\n");

    app.get("/api/courses/:courseId/weights", findWeightsForCourse);
    app.put("/api/courses/:courseId/weights", updateWeights);
    app.post("/api/courses/:courseId/weights/reset", resetWeights);
    app.get("/api/weights", findAllWeights);
    app.delete("/api/courses/:courseId/weights", deleteWeights);

    console.log("   ✅ grading weights routes registered");
    console.log("");
    console.log("   📋 endpoints:");
    console.log("      GET    /api/courses/:courseId/weights");
    console.log("      PUT    /api/courses/:courseId/weights");
    console.log("      POST   /api/courses/:courseId/weights/reset");
    console.log("      GET    /api/weights (admin only)");
    console.log("      DELETE /api/courses/:courseId/weights (admin only)");
    console.log("");
}