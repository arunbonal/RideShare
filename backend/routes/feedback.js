// // Create feedback
// router.post("/rides/:rideId/feedback", auth, async (req, res) => {
//   try {
//     const ride = await Ride.findById(req.params.rideId);
//     if (!ride) return res.status(404).json({ message: "Ride not found" });

//     // Determine reviewer role
//     const isDriver = ride.driver.toString() === req.user.id;
//     const isPassenger = ride.passengers.some(
//       (p) => p.user.toString() === req.user.id
//     );

//     if (!isDriver && !isPassenger) {
//       return res
//         .status(403)
//         .json({ message: "Not authorized to review this ride" });
//     }

//     // Create feedback record
//     const feedback = new Feedback({
//       reviewer: req.user.id,
//       reviewee: isDriver
//         ? ride.passengers.find((p) => p.user.toString() === req.body.revieweeId)
//             .user
//         : ride.driver,
//       ride: ride._id,
//       rating: req.body.rating,
//       review: req.body.review,
//       reviewerRole: isDriver ? "driver" : "hitcher",
//     });

//     // Save feedback to the ride document
//     if (isDriver) {
//       // Driver giving feedback to passenger
//       const passengerIndex = ride.passengers.findIndex(
//         (p) => p.user.toString() === req.body.revieweeId
//       );
//       if (passengerIndex === -1) {
//         return res.status(404).json({ message: "Passenger not found in ride" });
//       }

//       ride.passengers[passengerIndex].driverFeedback = {
//         rating: req.body.rating,
//         review: req.body.review,
//         createdAt: new Date(),
//       };
//     } else {
//       // Passenger giving feedback to driver
//       const passengerIndex = ride.passengers.findIndex(
//         (p) => p.user.toString() === req.user.id
//       );
//       if (passengerIndex === -1) {
//         return res.status(404).json({ message: "Passenger not found in ride" });
//       }

//       ride.passengers[passengerIndex].passengerFeedback = {
//         rating: req.body.rating,
//         review: req.body.review,
//         createdAt: new Date(),
//       };
//     }

//     // Save both documents
//     await Promise.all([feedback.save(), ride.save()]);

//     res.status(201).json({
//       feedback,
//       message: "Feedback saved successfully",
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// });

// // // Get feedback for a ride
// // router.get("/rides/:rideId/feedback", auth, async (req, res) => {
// //   try {
// //     const ride = await Ride.findById(req.params.rideId)
// //       .populate("driver", "name")
// //       .populate("passengers.user", "name");

// //     if (!ride) {
// //       return res.status(404).json({ message: "Ride not found" });
// //     }

// //     // Format the response to include both ride-specific and overall feedback
// //     const feedback = {
// //       ride: ride._id,
// //       driver: {
// //         id: ride.driver._id,
// //         name: ride.driver.name,
// //       },
// //       passengers: ride.passengers.map((passenger) => ({
// //         id: passenger.user._id,
// //         name: passenger.user.name,
// //         driverFeedback: passenger.driverFeedback,
// //         passengerFeedback: passenger.passengerFeedback,
// //       })),
// //     };

// //     res.json(feedback);
// //   } catch (error) {
// //     res.status(500).json({ message: error.message });
// //   }
// // });
