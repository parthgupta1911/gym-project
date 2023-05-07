const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const { log } = require("console");

const userSchema = new mongoose.Schema({
  name: {
    type: "String",
    minlength: 5,
    required: [true, "a person must have a name"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  email: {
    type: String,
    required: [true, "a person must have an email"],
    lowercase: true,
    unique: [true, "a person w/this email already exists"],
    validate: [validator.isEmail, "email not in format"],
  },
  password: {
    select: false,
    minlength: 8,
    type: "String",
    required: [true, "user must have a password"],
  },
  passwordConfirm: {
    type: "String",
    required: [true, "please confirm the password"],
    validate: {
      validator: function (e1) {
        return e1 === this.password;
      },
      message: "both passwords are not same!",
    },
  },
  passwordChangedAt: {
    type: Date,
    //select: false,
  },
  role: {
    type: "String",
    enum: ["user", "admin", "trainer", "owner", "head-trainer"],
    default: "user",
  },
  status: {
    type: "Boolean",
    default: true,
    select: false,
  },
  passwordResetToken: String,
  tokenExpiresAt: { type: Date },
  signUpToken: String,
  deleteOn: { type: Date },
});
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    this.passwordConfirm = undefined; //as for save passwordConfirm is a must so if we do user.save({runvalidators:true}) but not update the password it will be persisted to the database
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre("save", function (next) {
  if (this.isModified("password")) this.passwordChangedAt = Date.now() - 1000;
  next();
});
userSchema.pre(/^find/, function (next) {
  //this points to the querry
  if (this._conditions.select === "decativated also") {
    this._conditions.select = undefined;
    return next();
  }
  this.find({ status: { $ne: false } });
  next();
});
//returns false if password is not changed since the jwt was issued thus log the user in
// returns true if password is changed after token is issued i.e do not log in
userSchema.methods.changedPasswordAfter = (jwtTime) => {
  if (this.passwordChangedAt) return jwtTime < parseInt(this.passwordChangedAt.getTime() / 1000, 10);
  return false;
};
userSchema.methods.matchPassword = async (userPassword, actuallPassword) => {
  return await bcrypt.compare(userPassword, actuallPassword);
};
userSchema.methods.generateToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto.createHash("sha256").update(token).digest("hex");
  this.tokenExpiresAt = Date.now() + 2 * 60 * 1000;
  return token;
};
userSchema.methods.generateSignUpToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.signUpToken = crypto.createHash("sha256").update(token).digest("hex");
  this.deletedAt = Date.now() + 5 * 60 * 1000;
  return token;
};
const userModel = mongoose.model("users", userSchema);
module.exports = userModel;
