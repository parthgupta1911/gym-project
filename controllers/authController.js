const { promisify } = require("util");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const deleteUserAfter = require("./../utils/deleteUser");
const catchAsync = require("../utils/catchAsync");
const userModel = require("./../models/userModel");
const AppError = require("../models/errorClass");
const sendMail = require(`./../utils/sendMail`);

const assignToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};
const createSendToken = (user, res, statusCode) => {
  const token = assignToken(user._id);

  res.status(statusCode).json({
    status: "succes",
    token,
    data: {
      user,
    },
  });
};
exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await userModel.create({ name: req.body.name, email: req.body.email, password: req.body.password, passwordConfirm: req.body.passwordConfirm, status: false });
  const token = newUser.generateSignUpToken();
  newUser.deleteOn = Date.now() + 5 * 60 * 1000;
  await newUser.save({ validateBeforeSave: false });
  const url = `${req.protocol}://${req.get("host")}/api/v1/users/signup/${token}`;
  const options = { to: req.body.email, subject: "Your code to verify email valid for 5 MINS", text: `${token} is your code to verify your email please send it as a POST request to ${url} within 5 MIN to verify your email` };
  try {
    await sendMail(options);
  } catch (err) {
    await userModel.deleteOne({ email: req.body.email });
    return res.status(400).json({
      stauts: "failure",
      message: "there was an error please try again in few minitues ",
    });
  }
  const date = new Date(Date.now() + 6 * 60 * 1000);
  deleteUserAfter(newUser._id, date);
  res.status(200).json({
    status: "success",
    message: `a code has been sent to ${req.body.email} please send another request(within next 5 mins) with the token to verify your mail`,
  });
});
exports.addUser = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const newUser = await userModel.findOne({ signUpToken: hashedToken, deleteOn: { $gt: Date.now() }, select: "decativated also" });
  if (!newUser) {
    return next(new AppError("Wrong token or it has expired!", 400));
  }
  newUser.signUpToken = undefined;
  newUser.deleteOn = undefined;
  newUser.status = true;
  await newUser.save({ validateBeforeSave: false });
  createSendToken(newUser, res, 201);
});
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new AppError("No token given please login and sendyour jwt", 401));
  }
  const payload = await promisify(jwt.verify)(token, process.env.SECRET);

  const currUser = await userModel.findOne({ _id: payload.id }).select("+status"); /*.select("passwordChangedAt")*/
  if (!currUser || !currUser.status) {
    return next(new AppError("the user does not exist or has perished", 401));
  }
  if (currUser.changedPasswordAfter(payload.iat)) {
    return next(new AppError("user recently changed password please log in again", 401));
  }

  req.user = currUser;
  next();
});
exports.login = catchAsync(async (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    return next(new AppError("please provide both email and password", 400));
  }
  const user = await userModel.findOne({ email: req.body.email, select: "decativated also" }).select("+password +status");
  if (!user) {
    return next(new AppError(`${req.body.email} has not been registered please sign up`, 400));
  }
  if (!(await user.matchPassword(req.body.password, user.password))) {
    return next(new AppError("wrong passsword log in again", 400));
  }
  if (user.signUpToken) {
    return next(new AppError("Your account has not been verified yet please verify it", 400));
  }
  if (user.status === false) {
    const date = new Date(user.deleteOn); // stored in db in iso format
    const deleteOn = date.getTime();
    if (Date.now() > deleteOn) {
      return res.status(404).json({
        status: "failure",
        message: "your id has been deleted",
      });
    }
    user.status = true;
    user.deleteOn = undefined;
    await user.save({ validateBeforeSave: false });
    const token = assignToken(user._id);
    return res.status(200).json({
      status: "succes",
      message: `welcome back ${user.name} your id is reactivated again`,
      token,
      data: {
        user,
      },
    });
  }
  createSendToken(user, res, 200);
});
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    const role = roles.find((r) => {
      return r === req.user.role;
    });
    if (!role) {
      return next(new AppError("You dont have permission to use this route", 403)); //403 -> forbidden
    }
    next();
  };
};
exports.forgotPassword = catchAsync(async (req, res, next) => {
  if (!req.body.email) {
    return next(new AppError(`please provide email address`, 400));
  }
  const user = await userModel.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError(`no user with this emaill address please log in`, 400));
  }
  const token = user.generateToken();
  await user.save({ validateBeforeSave: false });
  const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${token}`;
  const options = {
    to: user.email,
    subject: "RESET PASSWORD TOKEN VALID FOR 2 MINS only",
    text: `${token} is your reset password token please dont share it 
    and send a PATCH request at ${resetURL}`,
  };
  try {
    await sendMail(options);
  } catch (err) {
    user.passwordResetToken = undefined;
    user.TokenExpiresIN = undefined;
    user.save({ validateBeforeSave: false });
    return next(new AppError("Error while sending the mail please try again"));
  }
  res.status(200).json({
    status: "success",
    data: {
      message: `the token has been sent succesfylly to ${req.body.email}`,
    },
  });
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  const tokenHashed = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await userModel.findOne({ passwordResetToken: tokenHashed, tokenExpiresAt: { $gt: Date.now() } });
  if (!user) {
    return next(new AppError("wrong tokken or it has expired", 400));
  }
  if (!req.body.password || !req.body.passwordConfirm) {
    return next(new AppError("please provide both password and password confirm field", 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.tokenExpiresAt = undefined;
  await user.save({ validateBeforeSave: true });
  createSendToken(user, res, 200);
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await userModel.findById(req.user._id).select("+password");
  if (!req.body.currentPassword || !req.body.newPassword || !req.body.newPasswordConfirm) {
    return next(new AppError("Please provide all required fields", 401));
  }
  if (!(await user.matchPassword(req.body.currentPassword, user.password))) {
    return next(new AppError("wrong password", 401));
  }
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;
  await user.save({ validateBeforeSave: true });
  createSendToken(user, res, 200);
});
exports.giveRole = catchAsync(async (req, res, next) => {
  if (!req.body.userid || !req.body.role) {
    return next(new AppError("admin sahab jara user id aur role btayido", 500));
  }
  const newuser = await userModel.findByIdAndUpdate(req.body.userid, { role: req.body.role }, { new: true, runValidators: true });
  if (!newuser) {
    return next(new AppError("admin sahab user id glt dal diyo", 500));
  }
  res.status(200).json({
    status: "succes",
    data: {
      newuser,
    },
  });
});
