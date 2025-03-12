// const mongoose = require("mongoose");

// const FeedbackSchema = new mongoose.Schema({
//   reviewer: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   reviewee: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   ride: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Ride",
//     required: true,
//   },
//   rating: {
//     type: Number,
//     required: true,
//     min: 1,
//     max: 5,
//   },
//   review: {
//     type: String,
//     maxLength: 500, // Optional: limit review length
//   },
//   reviewerRole: {
//     type: String,
//     enum: ["driver", "hitcher"],
//     required: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Prevent duplicate reviews for the same ride by the same reviewer
// FeedbackSchema.index({ reviewer: 1, ride: 1 }, { unique: true });

// // Middleware to update user ratings after feedback is saved
// FeedbackSchema.post("save", async function (doc) {
//   try {
//     // Get all ratings for the reviewee
//     const allFeedback = await this.model("Feedback").find({
//       reviewee: doc.reviewee,
//       reviewerRole: doc.reviewerRole, // Only consider ratings from same role
//     });

//     // Calculate average rating
//     const totalRating = allFeedback.reduce(
//       (sum, feedback) => sum + feedback.rating,
//       0
//     );
//     const averageRating = totalRating / allFeedback.length;

//     // Update the appropriate rating field based on reviewer role
//     const updateField =
//       doc.reviewerRole === "driver" ? "hitcherRating" : "driverRating";

//     // Update user's rating
//     await mongoose.model("User").findByIdAndUpdate(doc.reviewee, {
//       [updateField]: averageRating.toFixed(1),
//     });
//   } catch (error) {
//     console.error("Error updating user rating:", error);
//   }
// });

// module.exports = mongoose.model("Feedback", FeedbackSchema);
