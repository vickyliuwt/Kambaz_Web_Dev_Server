// Kambaz/GradingWeights/model.js
// connects schema to database

import mongoose from "mongoose";
import schema from "./schema.js";

// create model from schema
const GradingWeightsModel = mongoose.model("GradingWeightsModel", schema);

export default GradingWeightsModel;