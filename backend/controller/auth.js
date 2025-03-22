require("dotenv").config();

exports.googleCallback = (req, res) => {
  // authentication failed
  if (!req.user) {
    console.error("Authentication failed: No user found");
    return res.redirect(`${process.env.CLIENT_URL}/?error=invalid-email`);
  }

  // Check if user is an admin - bypass email validation for admins
  if (req.user.isAdmin) {
    return res.redirect(`${process.env.CLIENT_URL}/admin`);
  }

  // // Check if email is from PES domain
  // if (!req.user.email?.endsWith("@pesu.pes.edu")) {
  //   req.logout((err) => {
  //     if (err) {
  //       console.error("Error logging out:", err);
  //     }
  //     res.redirect(`${process.env.CLIENT_URL}/?error=invalid-email`);
  //   });
  //   return;
  // }

  // Check if user has any active roles
  const hasActiveRoles =
    req.user.activeRoles &&
    (req.user.activeRoles.driver || req.user.activeRoles.hitcher);

  // If no active roles, redirect to role-selection
  if (!hasActiveRoles) {
    return res.redirect(`${process.env.CLIENT_URL}/role-selection`);
  }

  // Determine redirect based on active roles and profile completion status
  let redirectPath;

  // If user is an active driver
  if (req.user.activeRoles.driver) {
    redirectPath = req.user.driverProfileComplete
      ? "/driver/dashboard"
      : "/driver/setup";
  }
  // If user is an active hitcher
  else if (req.user.activeRoles.hitcher) {
    redirectPath = req.user.hitcherProfileComplete
      ? "/hitcher/dashboard"
      : "/hitcher/setup";
  }
  // Fallback for any unexpected state
  else {
    redirectPath = "/role-selection";
  }

  return res.redirect(`${process.env.CLIENT_URL}${redirectPath}`);
};

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.json({ message: "Logged out successfully" });
  });
};

// understand from here
exports.updateActiveRoles = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const { driver, hitcher } = req.body;

  // Validate input
  if (typeof driver !== "boolean" && typeof hitcher !== "boolean") {
    return res.status(400).json({ message: "Invalid role settings" });
  }

  // Update active roles
  if (typeof driver === "boolean") {
    req.user.activeRoles.driver = driver;
  }

  if (typeof hitcher === "boolean") {
    req.user.activeRoles.hitcher = hitcher;
  }

  req.user
    .save()
    .then(() => {
      res.json({
        message: "Active roles updated successfully",
        activeRoles: req.user.activeRoles,
      });
    })
    .catch((err) => {
      res
        .status(500)
        .json({ message: "Error updating active roles", error: err.message });
    });
};

exports.updateDriverProfileComplete = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const { complete } = req.body;

  if (typeof complete !== "boolean") {
    return res.status(400).json({ message: "Invalid profile complete status" });
  }

  req.user.driverProfileComplete = complete;
  req.user
    .save()
    .then(() => {
      res.json({
        message: "Driver profile status updated successfully",
        driverProfileComplete: complete,
      });
    })
    .catch((err) => {
      res
        .status(500)
        .json({ message: "Error updating profile status", error: err.message });
    });
};

exports.updateHitcherProfileComplete = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const { complete } = req.body;

  if (typeof complete !== "boolean") {
    return res.status(400).json({ message: "Invalid profile complete status" });
  }

  req.user.hitcherProfileComplete = complete;
  req.user
    .save()
    .then(() => {
      res.json({
        message: "Hitcher profile status updated successfully",
        hitcherProfileComplete: complete,
      });
    })
    .catch((err) => {
      res
        .status(500)
        .json({ message: "Error updating profile status", error: err.message });
    });
};
