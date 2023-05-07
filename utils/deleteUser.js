const nodeschedule = require("node-schedule");
const userModel = require("./../models/userModel");
module.exports = (_id, date) => {
  return nodeschedule.scheduleJob(
    date,
    async function (_id) {
      const user = await userModel.findOne({ _id, select: "decativated also" });
      if (user.deleteOn) {
        const timeinms = new Date(user.deleteOn).getTime();
        if (Date.now() > timeinms) {
          await user.deleteOne({ _id });
        }
      }
    }.bind(null, _id)
  );
};
