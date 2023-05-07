const dotenv = require("dotenv");
// eslint-disable-next-line import/no-extraneous-dependencies
const mongoose = require("mongoose");
process.on("uncaughtException", (err) => {
  console.log(err.name, err.messsage, err);
  console.log("shutting down");
  process.exit(1);
});
dotenv.config({ path: "./config.env" });
const app = require("./app");

const DB = process.env.DATABASE.replace("<password>", process.env.DATABASE_PASSWORD);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log("we are connected to db");
  });

const port = process.env.PORT || 4000;
//as by default listend on local host
const server = app.listen(port, () => {
  console.log("started the  server");
});

process.on("unhandledRejection", (err) => {
  console.error(err.message);
  server.close(() => {
    console.log("closing the server");
    process.exit(1);
  });
});
