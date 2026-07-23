// Lab5/index.js
// lab 5 routes

import PathParameters from "./PathParameters.js";
import QueryParameters from "./QueryParameters.js";
import WorkingWithObjects from "./WorkingWithObjects.js";
import WorkingWithArrays from "./WorkingWithArrays.js";

export default function Lab5(app) {
    // welcome route
    app.get("/lab5/welcome", (req, res) => {
        res.send("Welcome to Lab 5");
    });

    // setup all exercises
    PathParameters(app);
    QueryParameters(app);
    WorkingWithObjects(app);
    WorkingWithArrays(app);
}