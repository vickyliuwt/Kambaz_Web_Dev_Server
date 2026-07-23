// Kambaz/Quizzes/model.js
// mongoose model

import mongoose from "mongoose";
import schema from "./schema.js";

// create model
const model = mongoose.model("QuizModel", schema);

export default model;