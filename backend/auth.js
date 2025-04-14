const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");
const Admin = require("./models/Admin");
require("dotenv").config();
const { getCollege } = require("./utils/userUtils");

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Configure Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      scope: ["profile", "email"],
      proxy: true,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Extract email from profile
        const email = profile.emails[0].value;
        
        // Check if user is an admin
        const admin = await Admin.findOne({ email });
        const isAdmin = !!admin;
        
        // For non-admin users, apply the PESU email validation
        if (!isAdmin) {
          if (!email.endsWith("@pesu.pes.edu")) {
            return done(null, false, {
              message: "Only PES University email addresses are allowed",
            });
          }
        }

        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Update isAdmin status if necessary
          if (user.isAdmin !== isAdmin) {
            user.isAdmin = isAdmin;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        const srn = email.endsWith("@pesu.pes.edu") ? email.split("@")[0].toUpperCase() : null;
        const college = getCollege(email);
        user = new User({
          googleId: profile.id,
          email: email,
          name: profile.displayName,
          srn: srn,
          college: college,
          activeRoles: {
            driver: false,
            hitcher: false,
          },
          driverProfileComplete: false,
          hitcherProfileComplete: false,
          isAdmin: isAdmin // Set isAdmin field
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
