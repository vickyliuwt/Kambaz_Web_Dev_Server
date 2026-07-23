// Kambaz/Enrollments/model.js
// mongoose model

import mongoose from "mongoose";
import schema from "./schema.js";

// create model
const model = mongoose.model("EnrollmentModel", schema);

export default model;