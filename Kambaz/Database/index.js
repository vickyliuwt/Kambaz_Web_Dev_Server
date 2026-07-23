// Kambaz/Database/index.js

import coursesData from "./courses.js";
import modulesData from "./modules.js";
import assignmentsData from "./assignments.js";
import usersData from "./users.js";
import gradesData from "./grades.js";
import enrollmentsData from "./enrollments.js";
import quizzesData from "./quizzes.js";
import examsData from "./exams.js";
import gradingWeightsData from "./gradingWeights.js";
import projectsData from "./projects.js";

// Create a single mutable database instance
const Database = {
    courses: [...coursesData],
    modules: [...modulesData],
    assignments: [...assignmentsData],
    users: [...usersData],
    grades: [...gradesData],
    enrollments: [...enrollmentsData],
    quizzes: [...quizzesData],
    exams: [...examsData],
    gradingWeights: [...gradingWeightsData],
    projects: [...projectsData]
};

// Log initial state
console.log("   Database initialized with mutable copies:");
console.log(`   Courses: ${Database.courses.length}`);
console.log(`   Users: ${Database.users.length}`);
console.log(`   Enrollments: ${Database.enrollments.length}`);
console.log(`   Modules: ${Database.modules.length}`);
console.log(`   Assignments: ${Database.assignments.length}`);
console.log(`   Quizzes: ${Database.quizzes.length}`);
console.log(`   Exams: ${Database.exams.length}`);
console.log("   Changes persist until server restart");

export default Database;