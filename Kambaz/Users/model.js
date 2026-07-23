// Kambaz/Users/model.js
// mongoose model

import mongoose from "mongoose";
import schema from "./schema.js";

// create model
// name "UserModel" used by other collections
const model = mongoose.model("UserModel", schema);

export default model;