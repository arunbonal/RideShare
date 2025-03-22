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

const getCollege = (email) => {
  if (email[3] === "1") {
    return "PES University Ring Road Campus";
  } else if (email[3] === "2") {
    return "PES University Electronic City Campus";
  }
  return null;
};

module.exports = { getCompleteUserData, getCollege };
