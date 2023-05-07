const mongoose = require("mongoose");
const slugify = require("slugify");
const userModel = require("./userModel");
const gymSchema = new mongoose.Schema({
  name: {
    type: "String",
    minlength: 5,
    unique: [true, "a gym with that name already exists"],
    required: [true, "a gym must have a name "],
  },
  Location: {
    //this object is not for schema type options
    type: {
      //embedded a level deeper this object is for schema type otions
      //GeoJSON
      type: String,
      default: "Point",
      enum: ["Point"],
    },
    coordinates: [Number],
    //type and cordinates field are required to identify it as GeoJSON
    address: String,
    description: String,
  },
  trainers: Array,
});
gymSchema.pre("save", async function (next) {
  const trainersPromise = this.trainers.map(async (el) => await userModel.findById(el));
  let trainers = await Promise.all(trainersPromise);
  trainers = trainers.filter((el) => el.role == "trainer" || el.role == "head-trainer");
  this.trainers = trainers;
  next();
});
gymSchema.index({ Location: "2dsphere" });
module.exports = mongoose.model("gyms", gymSchema);
