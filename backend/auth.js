const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");
require("dotenv").config();
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
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract email from profile
        const email = profile.emails[0].value;
        const srn = email.split("@")[0].toUpperCase();

        // Check if email is from PES University
        if (!email.endsWith("@pesu.pes.edu")) {
          return done(null, false, {
            message: "Only PES University email addresses are allowed",
          });
        }

        if (email[3] !== "2") {
          return done(null, false, {
            message:
              "Only PESU Electronic City Campus students are allowed to register at the moment",
          });
        }

        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Create new user if doesn't exist
        user = new User({
          googleId: profile.id,
          email: email,
          name: profile.displayName,
          srn: srn,
          activeRoles: {
            driver: false,
            hitcher: false,
          },
          driverProfileComplete: false,
          hitcherProfileComplete: false,
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
