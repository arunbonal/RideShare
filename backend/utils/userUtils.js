const User = require("../models/User");

const getCompleteUserData = async (userId) => {
  try {
    const user = await User.findById(userId).select("-googleId").lean();

    if (!user) {
      throw new Error("User not found");
    }

    return {
      ...user,
      id: user._id,
    };
  } catch (error) {
    throw error;
  }
};

module.exports = { getCompleteUserData };
