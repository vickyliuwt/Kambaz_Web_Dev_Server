// Kambaz/Exams/model.js
// mongoose model

import mongoose from "mongoose";
import schema from "./schema.js";

// create model
const model = mongoose.model("ExamModel", schema);

export default model;