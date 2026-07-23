// Kambaz/Modules/dao.js
// module database operations

import model from "./model.js";
import courseModel from "../Courses/model.js";

// make module ID
async function generateModuleId(courseId) {
    try {
        const course = await courseModel.findById(courseId);
        if (!course) {
            throw new Error("Course not found");
        }

        const courseNumber = course.number;

        const modulesInCourse = await model.find({ course: courseId });

        const numbers = modulesInCourse
            .map(module => {
                const match = module._id.match(/^M(\d+)-/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(num => num > 0);

        const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        const newId = `M${nextNumber}-${courseNumber}`;

        console.log(`   🆔 generated id: ${newId}`);

        return newId;
    } catch (error) {
        console.error("   ❌ error:", error);
        return `M${Date.now()}-UNKNOWN`;
    }
}

// make lesson ID
async function generateLessonId(moduleId, courseNumber) {
    try {
        const module = await model.findById(moduleId);
        if (!module) {
            throw new Error("Module not found");
        }

        const moduleMatch = moduleId.match(/^M(\d+)-/);
        const moduleNumber = moduleMatch ? moduleMatch[1] : "1";

        const lessonCount = module.lessons?.length || 0;
        const nextNumber = lessonCount + 1;

        const newId = `L${nextNumber}-M${moduleNumber}-${courseNumber}`;

        console.log(`   🆔 generated lesson id: ${newId}`);

        return newId;
    } catch (error) {
        console.error("   ❌ error:", error);
        return `L${Date.now()}-UNKNOWN`;
    }
}

// create module
export async function createModule(moduleData) {
    try {
        if (!moduleData.name) {
            throw new Error("Module name is required");
        }

        if (!moduleData.course) {
            throw new Error("Course ID is required");
        }

        const courseExists = await courseModel.findById(moduleData.course);
        if (!courseExists) {
            throw new Error(`Course ${moduleData.course} not found. Cannot create module for non-existent course.`);
        }

        const moduleId = await generateModuleId(moduleData.course);

        const newModule = {
            _id: moduleId,
            name: moduleData.name.trim(),
            description: moduleData.description?.trim() || "",
            course: moduleData.course,
            lessons: moduleData.lessons || []
        };

        const createdModule = await model.create(newModule);

        console.log(`   📖 created: ${createdModule.name}`);
        console.log(`      id: ${createdModule._id}`);
        console.log(`      course: ${createdModule.course}`);
        console.log(`      lessons: ${createdModule.lessons.length}`);
        console.log(`   💡 reload to confirm`);

        return createdModule;
    } catch (error) {
        console.error("   ❌ error:", error.message);
        throw error;
    }
}

// get course modules
export async function findModulesForCourse(courseId) {
    try {
        if (!courseId) {
            console.error("   ❌ courseId required");
            return [];
        }

        const courseExists = await courseModel.findById(courseId);
        if (!courseExists) {
            console.log(`   ⚠️  course not found: ${courseId}`);
            return [];
        }

        const modules = await model.find({ course: courseId }).sort({ name: 1 });

        console.log(`   📖 found ${modules.length} modules for ${courseId}`);

        const totalLessons = modules.reduce((sum, module) => {
            return sum + (module.lessons?.length || 0);
        }, 0);

        console.log(`      📚 total lessons: ${totalLessons}`);

        modules.forEach((module, index) => {
            console.log(`      ${index + 1}. ${module.name} (${module.lessons?.length || 0} lessons)`);
        });

        return modules;
    } catch (error) {
        console.error(`   ❌ error:`, error);
        return [];
    }
}

// find by ID
export async function findModuleById(moduleId) {
    try {
        const module = await model.findById(moduleId);

        if (module) {
            console.log(`   📖 found: ${module.name}`);
            console.log(`      lessons: ${module.lessons?.length || 0}`);
        } else {
            console.log(`   ⚠️  not found: ${moduleId}`);
        }

        return module;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}

// update module
export async function updateModule(moduleId, moduleUpdates) {
    try {
        if (!moduleId) {
            throw new Error("moduleId is required");
        }

        if (!moduleUpdates || Object.keys(moduleUpdates).length === 0) {
            throw new Error("No updates provided");
        }

        const existingModule = await model.findById(moduleId);
        if (!existingModule) {
            console.log(`   ⚠️  not found: ${moduleId}`);
            return null;
        }

        const { editing, ...cleanUpdates } = moduleUpdates;

        await model.updateOne(
            { _id: moduleId },
            { $set: cleanUpdates }
        );

        const updatedModule = await model.findById(moduleId);

        console.log(`   ✏️  updated: ${updatedModule.name}`);
        console.log(`      fields: ${Object.keys(cleanUpdates).join(', ')}`);
        console.log(`   💡 reload to confirm`);

        return updatedModule;
    } catch (error) {
        console.error(`   ❌ error:`, error.message);
        throw error;
    }
}

// delete module
export async function deleteModule(moduleId) {
    try {
        if (!moduleId) {
            throw new Error("moduleId is required");
        }

        const module = await model.findById(moduleId);
        if (!module) {
            console.log(`   ⚠️  not found: ${moduleId}`);
            return {
                message: "Module not found",
                deletedModule: false
            };
        }

        console.log(`   🗑️  deleting: ${module.name}`);
        console.log(`      course: ${module.course}`);
        console.log(`      lessons: ${module.lessons?.length || 0}`);

        await model.deleteOne({ _id: moduleId });

        console.log(`   ✅ deleted`);
        console.log(`   💡 reload to confirm`);

        return {
            message: "Module deleted successfully",
            deletedModule: true,
            deletedLessons: module.lessons?.length || 0,
            moduleName: module.name
        };
    } catch (error) {
        console.error(`   ❌ error:`, error.message);
        throw error;
    }
}

// add lesson
export async function addLessonToModule(moduleId, lessonName) {
    try {
        if (!moduleId) {
            throw new Error("moduleId is required");
        }

        if (!lessonName || lessonName.trim() === '') {
            throw new Error("Lesson name is required and cannot be empty");
        }

        const module = await model.findById(moduleId);
        if (!module) {
            console.log(`   ⚠️  module not found: ${moduleId}`);
            return null;
        }

        let courseNumber = "UNKNOWN";
        const moduleIdMatch = moduleId.match(/^M\d+-(.+)$/);
        if (moduleIdMatch) {
            courseNumber = moduleIdMatch[1];
        } else if (module.course) {
            const course = await courseModel.findById(module.course);
            if (course) {
                courseNumber = course.number;
            }
        }

        const lessonId = await generateLessonId(moduleId, courseNumber);

        const newLesson = {
            _id: lessonId,
            name: lessonName.trim(),
            description: "",
            module: moduleId
        };

        const updatedLessons = [...(module.lessons || []), newLesson];

        await model.updateOne(
            { _id: moduleId },
            { $set: { lessons: updatedLessons } }
        );

        const updatedModule = await model.findById(moduleId);

        console.log(`   📚 added lesson to ${module.name}:`);
        console.log(`      lesson: "${lessonName}"`);
        console.log(`      id: ${lessonId}`);
        console.log(`      total: ${updatedModule.lessons.length}`);
        console.log(`   💡 reload to confirm`);

        return updatedModule;
    } catch (error) {
        console.error("   ❌ error:", error.message);
        throw error;
    }
}

// update lesson
export async function updateLesson(moduleId, lessonId, lessonUpdates) {
    try {
        console.log(`   ✏️  updating lesson ${lessonId} in ${moduleId}...`);

        const module = await model.findById(moduleId);
        if (!module) {
            throw new Error("Module not found");
        }

        const lessonIndex = module.lessons.findIndex(l => l._id === lessonId);
        if (lessonIndex === -1) {
            throw new Error("Lesson not found in module");
        }

        console.log(`      found at index ${lessonIndex}`);
        console.log(`      current: "${module.lessons[lessonIndex].name}"`);
        if (lessonUpdates.name) {
            console.log(`      new: "${lessonUpdates.name}"`);
        }

        const updateFields = {};

        if (lessonUpdates.name !== undefined) {
            updateFields[`lessons.${lessonIndex}.name`] = lessonUpdates.name;
        }

        if (lessonUpdates.description !== undefined) {
            updateFields[`lessons.${lessonIndex}.description`] = lessonUpdates.description;
        }

        if (Object.keys(updateFields).length === 0) {
            console.log(`      no fields to update`);
            return module;
        }

        console.log(`      updating:`, Object.keys(updateFields).join(', '));

        await model.updateOne(
            { _id: moduleId },
            { $set: updateFields }
        );

        const updatedModule = await model.findById(moduleId);

        console.log(`   ✅ updated lesson`);
        console.log(`      name: "${updatedModule.lessons[lessonIndex].name}"`);
        console.log(`      id preserved: ${updatedModule.lessons[lessonIndex]._id}`);
        console.log(`   💡 reload to confirm`);

        return updatedModule;
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// delete lesson
export async function deleteLessonFromModule(moduleId, lessonId) {
    try {
        const module = await model.findById(moduleId);
        if (!module) {
            throw new Error("Module not found");
        }

        const lessonToDelete = module.lessons.find(l => l._id === lessonId);
        const updatedLessons = module.lessons.filter(l => l._id !== lessonId);

        await model.updateOne(
            { _id: moduleId },
            { $set: { lessons: updatedLessons } }
        );

        console.log(`   🗑️  deleted "${lessonToDelete?.name}" from ${module.name}`);
        console.log(`      remaining: ${updatedLessons.length}`);

        return await model.findById(moduleId);
    } catch (error) {
        console.error("   ❌ error:", error);
        throw error;
    }
}

// get stats
export async function getModuleStatistics(courseId) {
    try {
        const modules = await findModulesForCourse(courseId);

        const stats = {
            courseId,
            moduleCount: modules.length,
            totalLessons: 0,
            averageLessonsPerModule: 0,
            modulesWithoutLessons: 0,
            longestModule: null,
            shortestModule: null
        };

        let maxLessons = 0;
        let minLessons = Infinity;

        modules.forEach(module => {
            const lessonCount = module.lessons?.length || 0;
            stats.totalLessons += lessonCount;

            if (lessonCount === 0) {
                stats.modulesWithoutLessons++;
            }

            if (lessonCount > maxLessons) {
                maxLessons = lessonCount;
                stats.longestModule = {
                    name: module.name,
                    lessons: lessonCount
                };
            }

            if (lessonCount < minLessons && modules.length > 0) {
                minLessons = lessonCount;
                stats.shortestModule = {
                    name: module.name,
                    lessons: lessonCount
                };
            }
        });

        stats.averageLessonsPerModule = modules.length > 0
            ? (stats.totalLessons / modules.length).toFixed(2)
            : 0;

        console.log(`   📊 stats for ${courseId}:`);
        console.log(`      modules: ${stats.moduleCount}`);
        console.log(`      lessons: ${stats.totalLessons}`);
        console.log(`      avg: ${stats.averageLessonsPerModule}`);
        console.log(`      without lessons: ${stats.modulesWithoutLessons}`);

        return stats;
    } catch (error) {
        console.error("   ❌ error:", error);
        return null;
    }
}

// search modules
export async function searchModules(courseId, searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim() === '') {
            return await findModulesForCourse(courseId);
        }

        const regex = new RegExp(searchTerm.trim(), "i");

        const modules = await model.find({
            course: courseId,
            $or: [
                { name: { $regex: regex } },
                { description: { $regex: regex } }
            ]
        }).sort({ name: 1 });

        console.log(`   🔍 found ${modules.length} matching "${searchTerm}"`);

        return modules;
    } catch (error) {
        console.error("   ❌ error:", error);
        return [];
    }
}