const AppError = require("../models/errorClass");
const catchAsync = require("../utils/catchAsync");
const gymModel = require("./../models/gymModel");
const ApiFeatures = require("./../utils/apiFeaturse");
exports.getAllGyms = catchAsync(async (req, res, next) => {
  const features = new ApiFeatures(gymModel.find({}), req.query).filter().sort().paginate().limitFields();
  const gyms = await features.querry;
  res.status(200).json({
    status: "succes",
    results: gyms.length,
    data: {
      gyms,
    },
  });
});
exports.addGym = catchAsync(async (req, res, next) => {
  const newGym = await gymModel.create({
    name: req.body.name,
    Location: {
      description: req.body.location.description,
      type: "Point",

      coordinates: [req.body.location.longitude, req.body.location.lattitude],
      address: req.body.location.address,
    },
    trainers: req.body.trainers,
  });
  res.status(201).json({
    status: "success",
    message: "gym has been created",
    data: {
      newGym,
    },
  });
});
exports.deleteAllGyms = catchAsync(async (req, res, next) => {
  await gymModel.deleteMany({});
  res.status(204).json({
    fitness: "bad",
    gyms: "uda diya",
    nationality: "pakistani",
  });
});
exports.deleteOneGym = catchAsync(async (req, res, next) => {
  const delGym = await gymModel.deleteOne({ _id: req.params.id });
  if (delGym.deletedCount === 0) {
    return res.status(404).json({
      status: "failure",
      message: `no gym with an id=${req.params.id}`,
    });
  }
  res.status(204).json({
    fitness: "bad",
    gym: "uda diya",
    nationality: "pakistani",
  });
});
exports.getGymsWithin = catchAsync(async (req, res, next) => {
  const { dist, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");
  if (!lat || !lng) {
    return next(new AppError("please provide in correct format i.e lat,lng", 400));
  }
  let rad;
  if (unit === "km") {
    rad = dist / 6378.1;
  } else if (unit === "mi") {
    rad = dist / 3963.2;
  } else {
    return next(new AppError("please use either mi or km as a unit", 400));
  }
  const gyms = await gymModel.find({ Location: { $geoWithin: { $centerSphere: [[lng, lat], rad] } } });
  res.status(200).json({
    status: "Success",
    results: gyms.length,
    data: {
      gyms,
    },
  });
});
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");
  if (!lat || !lng) {
    return next(new AppError("Please provide in correct format i.e lat,lng", 400));
  }
  let mul;
  if (unit === "km") {
    mul = 0.001;
  } else if (unit === "mi") {
    mul = 0.000621;
  } else {
    return next(new AppError("please use either km or mi as unit", 400));
  }
  const distances = await gymModel.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng * 1, lat * 1] },
        distanceField: "distance",
        distanceMultiplier: mul,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: "Success",
    data: {
      distances,
    },
  });
});
exports.getAGym = catchAsync(async (req, res, next) => {
  const gym = await gymModel.findById(req.params.id);
  if (!gym) {
    return next(new AppError(`sorry there is no gym with ${req.params.id}\n please check again`, 200));
  }
  res.status(200).json({
    status: "succes",
    data: {
      gym,
    },
  });
});
