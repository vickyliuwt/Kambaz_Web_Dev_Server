// Kambaz/Courses/model.js
// mongoose model

import mongoose from "mongoose";
import schema from "./schema.js";

// create model
const model = mongoose.model("CourseModel", schema);

export default model;