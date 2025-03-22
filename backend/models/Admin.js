const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true }
});

module.exports = mongoose.model("Admin", adminSchema);