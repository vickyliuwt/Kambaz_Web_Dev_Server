// Kambaz/GradingWeights/dao.js
// database operations for grading weights - FIXED VERSION

import model from "./model.js";
import courseModel from "../Courses/model.js";

// ✅ FIXED: generate weights ID using course _id instead of course.number
// this prevents duplicate key errors when course.number is "NEW NUMBER"
async function generateWeightsId(courseId) {
    try {
        console.log(`   🆔 generating weights id for course: ${courseId}`);

        // use course _id directly instead of course.number
        // this ensures uniqueness even for new courses
        const weightsId = `GW-${courseId}`;

        console.log(`   🆔 generated weights id: ${weightsId}`);
        return weightsId;
    } catch (error) {
        console.error("   ❌ error generating id:", error);
        return `GW-${courseId}`;
    }
}

// ✅ FIXED: improved error handling and duplicate prevention
export async function findWeightsForCourse(courseId) {
    try {
        if (!courseId) {
            console.error("   ❌ courseId required");
            return null;
        }

        console.log(`   🎯 finding weights for: ${courseId}`);

        // check if course exists
        const courseExists = await courseModel.findById(courseId);
        if (!courseExists) {
            console.log(`   ⚠️ course not found: ${courseId}`);
            return null;
        }

        // try to find existing weights by course field
        let weights = await model.findOne({ course: courseId });

        // if no weights exist, create default ones
        if (!weights) {
            console.log(`   ℹ️ no weights found, creating defaults...`);

            const weightsId = await generateWeightsId(courseId);

            // ✅ FIXED: check if this ID already exists before creating
            const existingById = await model.findById(weightsId);
            if (existingById) {
                console.log(`   ⚠️ weights with id ${weightsId} already exist, returning existing`);
                return existingById;
            }

            weights = await model.create({
                _id: weightsId,
                course: courseId,
                weights: {
                    ASSIGNMENTS: 40,
                    QUIZZES: 10,
                    EXAMS: 20,
                    PROJECTS: 30
                },
                lastModifiedBy: null,
                lastModifiedDate: new Date().toISOString()
            });

            console.log(`   ✅ created default weights`);
            console.log(`      assignments: 40%, quizzes: 10%, exams: 20%, projects: 30%`);
        } else {
            console.log(`   ✅ found existing weights`);
            console.log(`      assignments: ${weights.weights.ASSIGNMENTS}%, quizzes: ${weights.weights.QUIZZES}%, exams: ${weights.weights.EXAMS}%, projects: ${weights.weights.PROJECTS}%`);
        }

        return weights;
    } catch (error) {
        console.error("   ❌ error finding weights:", error);

        // ✅ FIXED: handle duplicate key error gracefully
        if (error.code === 11000) {
            console.log("   ℹ️ duplicate key detected, fetching existing weights...");
            return await model.findOne({ course: courseId });
        }

        return null;
    }
}

// ✅ FIXED: improved update with proper error handling
export async function updateWeights(courseId, newWeights, modifiedBy = null) {
    try {
        if (!courseId) {
            throw new Error("courseId is required");
        }

        console.log(`   ✏️ updating weights for: ${courseId}`);
        console.log(`      new weights: A:${newWeights.ASSIGNMENTS}%, Q:${newWeights.QUIZZES}%, E:${newWeights.EXAMS}%, P:${newWeights.PROJECTS}%`);

        // validate weights total 100%
        const total =
            newWeights.ASSIGNMENTS +
            newWeights.QUIZZES +
            newWeights.EXAMS +
            newWeights.PROJECTS;

        if (total !== 100) {
            throw new Error(`Weights must total 100%, currently ${total}%`);
        }

        // ✅ FIXED: use findOneAndUpdate with upsert for better reliability
        const weightsId = await generateWeightsId(courseId);

        const weights = await model.findOneAndUpdate(
            { course: courseId },
            {
                $set: {
                    _id: weightsId, // ensure ID is set
                    course: courseId,
                    weights: newWeights,
                    lastModifiedBy: modifiedBy,
                    lastModifiedDate: new Date().toISOString()
                }
            },
            {
                new: true, // return updated document
                upsert: true, // create if doesn't exist
                runValidators: true // run schema validators
            }
        );

        console.log(`   ✅ weights updated successfully`);
        console.log(`   💡 changes persisted to MongoDB`);

        return weights;
    } catch (error) {
        console.error("   ❌ error updating weights:", error.message);
        throw error;
    }
}

// reset to default weights
export async function resetWeightsToDefault(courseId, modifiedBy = null) {
    try {
        console.log(`   🔄 resetting weights to defaults for: ${courseId}`);

        const defaultWeights = {
            ASSIGNMENTS: 40,
            QUIZZES: 10,
            EXAMS: 20,
            PROJECTS: 30
        };

        const updated = await updateWeights(courseId, defaultWeights, modifiedBy);

        console.log(`   ✅ reset to defaults`);

        return updated;
    } catch (error) {
        console.error("   ❌ error resetting weights:", error);
        throw error;
    }
}

// get all weights (for admin)
export async function findAllWeights() {
    try {
        console.log(`   📊 fetching all weights...`);

        const allWeights = await model.find().sort({ course: 1 });

        console.log(`   ✅ found ${allWeights.length} weight configurations`);

        return allWeights;
    } catch (error) {
        console.error("   ❌ error fetching all weights:", error);
        return [];
    }
}

// delete weights for a course
export async function deleteWeights(courseId) {
    try {
        console.log(`   🗑️ deleting weights for: ${courseId}`);

        const result = await model.deleteOne({ course: courseId });

        if (result.deletedCount > 0) {
            console.log(`   ✅ weights deleted`);
        } else {
            console.log(`   ℹ️ no weights found to delete`);
        }

        return result.deletedCount;
    } catch (error) {
        console.error("   ❌ error deleting weights:", error);
        return 0;
    }
}

// validate weight data
export function validateWeightData(weights) {
    const errors = [];

    if (!weights.ASSIGNMENTS && weights.ASSIGNMENTS !== 0) {
        errors.push("ASSIGNMENTS weight is required");
    }
    if (!weights.QUIZZES && weights.QUIZZES !== 0) {
        errors.push("QUIZZES weight is required");
    }
    if (!weights.EXAMS && weights.EXAMS !== 0) {
        errors.push("EXAMS weight is required");
    }
    if (!weights.PROJECTS && weights.PROJECTS !== 0) {
        errors.push("PROJECTS weight is required");
    }

    // check each weight is valid
    Object.entries(weights).forEach(([key, value]) => {
        if (typeof value !== 'number') {
            errors.push(`${key} must be a number`);
        } else if (value < 0) {
            errors.push(`${key} cannot be negative`);
        } else if (value > 100) {
            errors.push(`${key} cannot exceed 100%`);
        }
    });

    // check total is 100%
    const total =
        (weights.ASSIGNMENTS || 0) +
        (weights.QUIZZES || 0) +
        (weights.EXAMS || 0) +
        (weights.PROJECTS || 0);

    if (total !== 100) {
        errors.push(`Weights must total 100%, currently ${total}%`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}