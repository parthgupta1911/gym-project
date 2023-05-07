const express = require("express");
const morgan = require("morgan");
const userRouter = require("./routers/userRouter");
const errorController = require("./controllers/errorController");
const AppError = require("./models/errorClass");
const gymRouter = require("./routers/gymRouter");

const app = express();

app.use((req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    morgan("dev");
  }
  next();
});
app.use(express.json({ limit: "10kb" }));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/gyms", gymRouter);
app.all("*", (req, res, next) => {
  next(new AppError(`this route is not defined ${req.originalUrl}`, 404));
});
app.use(errorController);
module.exports = app;
