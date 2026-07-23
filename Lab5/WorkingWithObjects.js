// Lab5/WorkingWithObjects.js
// object manipulation practice

const assignment = {
    id: 1,
    title: "NodeJS Assignment",
    description: "Create a NodeJS server with ExpressJS",
    due: "2021-10-10",
    completed: false,
    score: 0,
};

const module = {
    id: "M101",
    name: "Introduction to NodeJS",
    description: "Learn the basics of NodeJS and Express",
    course: "CS5610"
};

export default function WorkingWithObjects(app) {

    // get assignment
    const getAssignment = (req, res) => {
        res.json(assignment);
    };

    // get title
    const getAssignmentTitle = (req, res) => {
        res.json(assignment.title);
    };

    // update title
    const setAssignmentTitle = (req, res) => {
        const { newTitle } = req.params;
        assignment.title = newTitle;
        res.json(assignment);
    };

    // update score
    const setAssignmentScore = (req, res) => {
        const { score } = req.params;
        assignment.score = parseInt(score);
        res.json(assignment);
    };

    // update completed status
    const setAssignmentCompleted = (req, res) => {
        const { completed } = req.params;
        assignment.completed = completed === "true";
        res.json(assignment);
    };

    // get module
    const getModule = (req, res) => {
        res.json(module);
    };

    // get module name
    const getModuleName = (req, res) => {
        res.json(module.name);
    };

    // update module name
    const setModuleName = (req, res) => {
        const { newName } = req.params;
        module.name = newName;
        res.json(module);
    };

    // update description
    const setModuleDescription = (req, res) => {
        const { newDescription } = req.params;
        module.description = newDescription;
        res.json(module);
    };

    // register routes
    app.get("/lab5/assignment", getAssignment);
    app.get("/lab5/assignment/title", getAssignmentTitle);
    app.get("/lab5/assignment/title/:newTitle", setAssignmentTitle);
    app.get("/lab5/assignment/score/:score", setAssignmentScore);
    app.get("/lab5/assignment/completed/:completed", setAssignmentCompleted);

    app.get("/lab5/module", getModule);
    app.get("/lab5/module/name", getModuleName);
    app.get("/lab5/module/name/:newName", setModuleName);
    app.get("/lab5/module/description/:newDescription", setModuleDescription);
}