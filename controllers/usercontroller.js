const nodeschedule = require("node-schedule");
const AppError = require("../models/errorClass");
const catchAsync = require("../utils/catchAsync");
const userModel = require("./../models/userModel");
const ApiFeatures = require("./../utils/apiFeaturse");
const delleteUserAfter = require("./../utils/deleteUser");
const deleteUser = require("./../utils/deleteUser");
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const features = new ApiFeatures(userModel.find({}), req.query).filter().sort().limitFields().paginate();
  const users = await features.querry;
  res.status(200).json({
    status: "succes",
    results: users.length,
    data: {
      users,
    },
  });
});
exports.getCurrentUser = catchAsync(async (req, res, next) => {
  const { passwordChangedAt, status, ...currUser } = req.user._doc;
  res.status(200).json(currUser);
});
const allowedFields = (obj, ...fields) => {
  const newobj = {};
  Object.keys(obj).forEach((o1) => {
    if (fields.find((f) => f === o1)) {
      newobj[o1] = obj[o1];
    }
  });
  return newobj;
};
exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("this route is not for updating the password please use /updateMyPassword", 400));
  }
  const user = await userModel.findOneAndUpdate({ _id: req.user.id }, allowedFields(req.body, "name", "email"), { new: true, runValidators: true });
  res.status(200).json({
    user,
  });
});
exports.deleteMe = catchAsync(async (req, res, next) => {
  if (!req.body.password) {
    return next(new AppError("please provide your password to delete your account", 400));
  }
  const user = await userModel.findOne({ _id: req.user._id }).select("+password");
  if (!(await user.matchPassword(req.body.password, user.password))) {
    return next(new AppError("Wrong password Try Again", 400));
  }
  let deleteafter;
  if (process.env.DELETE_USER_AFTER.match(/d$/)) {
    const before_ = process.env.DELETE_USER_AFTER.substring(0, process.env.DELETE_USER_AFTER.indexOf("d"));
    deleteafter = Date.now() + before_ * 24 * 60 * 60 * 1000;
  } else {
    const before_ = process.env.DELETE_USER_AFTER.substring(0, process.env.DELETE_USER_AFTER.indexOf("s"));
    deleteafter = Date.now() + before_ * 1000;
  }
  const newuser = await userModel.findOneAndUpdate({ _id: req.user._id }, { status: false, deleteOn: deleteafter }, { new: true });
  let scheduleDate;
  if (process.env.DELETE_USER_AFTER.match(/d$/)) {
    const date = new Date(newuser.deleteOn);
    scheduleDate = date.getTime() + 24 * 60 * 60 * 1000;
  } else {
    const date = new Date(newuser.deleteOn);
    scheduleDate = date.getTime() + 1000;
    +1000;
  }
  const date = new Date(scheduleDate);
  delleteUserAfter(newuser._id, date);
  res.status(204).json({
    status: "succes",
    data: null,
  });
});
exports.deleteAll = catchAsync(async (req, res, next) => {
  const gj = await userModel.deleteMany({});
  res.status(204).json({
    status: "success",
    message: "sb udh gaya",
    gj,
  });
});
