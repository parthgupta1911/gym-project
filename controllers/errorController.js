const AppError = require("./../models/errorClass");

const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    name: err.name,
    stack: err.stack,
    message: err.message,
    error: err,
  });
};
const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      name: err.name,
      message: err.message,
    });
  } else {
    res.status(500).json({
      status: "fail",
      message: "there was an error",
    });
  }
};
const handleCastError = (err) => {
  return new AppError(`Invalid ${Object.keys(err.keyValue)[0]}:${Object.values(err.keyname)[0]}`, 500);
};
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e1) => e1.message);
  return new AppError(`Invalid entries ${errors.join("")}`, 500);
};
const handleDuplicateError = (err) => {
  console.error(err);
  const fieldArray = Object.keys(err.keyValue);
  const valueArray = Object.values(err.keyValue);
  const message = fieldArray
    .map((f1, i1) => {
      return f1 + ":" + valueArray[i1];
    })
    .join(" ");
  return new AppError(`Duplicate ${message}`, 500);
  //err.path=> name of the field for which data is wrong(i.e gives error)
  //err.field=> value which causes the error
};
const handleJWTError = (err) => new AppError("wrong token please dont edit the token", 401);
const handleExpiredError = (err) => new AppError("your token has expired please log in again", 401);
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else {
    if (err.name === "CastError") err = handleCastError(err);
    else if (err.code === 11000) err = handleDuplicateError(err);
    else if (err.name === "ValidationError") err = handleValidationError(err);
    else if (err.name === "JsonWebTokenError") err = handleJWTError(err);
    else if (err.name === "TokenExpiredError") err = handleExpiredError(err);
    sendErrorProd(err, req, res);
  }
};
