// Kambaz/Grades/model.js
// mongoose model

import mongoose from "mongoose";
import schema from "./schema.js";

// create model
const model = mongoose.model("GradeModel", schema);

export default model;