// Kambaz/Modules/routes.js
// module API endpoints

import * as modulesDao from "./dao.js";

export default function ModuleRoutes(app) {

    // update module
    const updateModule = async (req, res) => {
        try {
            res.set({
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'Pragma': 'no-cache'
            });

            const { moduleId } = req.params;
            const moduleUpdates = req.body;

            console.log(`   ✏️  update: ${moduleId}`);
            console.log(`      fields: ${Object.keys(moduleUpdates).join(', ')}`);

            if (moduleUpdates.name) {
                console.log(`      new name: "${moduleUpdates.name}"`);
            }

            const updatedModule = await modulesDao.updateModule(moduleId, moduleUpdates);

            if (!updatedModule) {
                console.log("      ⚠️  not found");
                res.status(404).json({
                    message: "Module not found",
                    moduleId: moduleId
                });
                return;
            }

            console.log(`   ✅ updated`);
            console.log(`      name: ${updatedModule.name}`);
            console.log(`   💡 reload to confirm`);

            res.json(updatedModule);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to update module",
                error: error.message
            });
        }
    };

    // delete module
    const deleteModule = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { moduleId } = req.params;

            console.log(`   🗑️  delete: ${moduleId}`);

            const status = await modulesDao.deleteModule(moduleId);

            console.log(`   ✅ deleted`);
            console.log(`      module: ${status.moduleName || 'unknown'}`);
            console.log(`      lessons: ${status.deletedLessons || 0}`);
            console.log(`   💡 reload to confirm`);

            res.json(status);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to delete module",
                error: error.message
            });
        }
    };

    // add lesson
    const addLessonToModule = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { moduleId } = req.params;
            const { lessonName } = req.body;

            console.log(`   📚 add lesson to: ${moduleId}`);
            console.log(`      name: "${lessonName}"`);

            if (!lessonName || lessonName.trim() === '') {
                console.log("      ❌ name required");
                res.status(400).json({
                    message: "Lesson name is required"
                });
                return;
            }

            const updatedModule = await modulesDao.addLessonToModule(moduleId, lessonName);

            if (!updatedModule) {
                res.status(404).json({
                    message: "Module not found",
                    moduleId: moduleId
                });
                return;
            }

            console.log(`   ✅ added`);
            console.log(`      total lessons: ${updatedModule.lessons.length}`);
            console.log(`   💡 reload to confirm`);

            res.json(updatedModule);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to add lesson",
                error: error.message
            });
        }
    };

    // update lesson
    const updateLesson = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { moduleId, lessonId } = req.params;
            const lessonUpdates = req.body;

            console.log(`   ✏️  update lesson: ${lessonId} in ${moduleId}`);

            const updatedModule = await modulesDao.updateLesson(moduleId, lessonId, lessonUpdates);

            console.log(`   ✅ updated lesson`);

            res.json(updatedModule);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to update lesson",
                error: error.message
            });
        }
    };

    // delete lesson
    const deleteLesson = async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store');

            const { moduleId, lessonId } = req.params;

            console.log(`   🗑️  delete lesson: ${lessonId} from ${moduleId}`);

            const updatedModule = await modulesDao.deleteLessonFromModule(moduleId, lessonId);

            console.log(`   ✅ deleted`);
            console.log(`      remaining: ${updatedModule.lessons.length}`);

            res.json(updatedModule);
        } catch (error) {
            console.error("   ❌ error:", error);
            res.status(500).json({
                message: "Failed to delete lesson",
                error: error.message
            });
        }
    };

    // register routes
    console.log("   📌 registering routes");

    app.put("/api/modules/:moduleId", updateModule);
    app.delete("/api/modules/:moduleId", deleteModule);

    app.post("/api/modules/:moduleId/lessons", addLessonToModule);
    app.put("/api/modules/:moduleId/lessons/:lessonId", updateLesson);
    app.delete("/api/modules/:moduleId/lessons/:lessonId", deleteLesson);

    console.log("   ✅ routes registered");
    console.log("");
    console.log("   📋 endpoints:");
    console.log("      PUT    /api/modules/:moduleId");
    console.log("      DELETE /api/modules/:moduleId");
    console.log("      POST   /api/modules/:moduleId/lessons");
    console.log("      PUT    /api/modules/:moduleId/lessons/:lessonId");
    console.log("      DELETE /api/modules/:moduleId/lessons/:lessonId");
    console.log("");
}