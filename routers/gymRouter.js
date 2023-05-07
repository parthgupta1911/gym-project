const express = require("express");

const gymController = require("./../controllers/gymController");
const authController = require("./../controllers/authController");
const router = express.Router();
router.route("/").get(gymController.getAllGyms);
router.route("/gyms-within/:dist/center/:latlng/unit/:unit").get(gymController.getGymsWithin);
router.route("/get-distances/:latlng/unit/:unit").get(gymController.getDistances);
router.route("/").post(authController.protect, authController.restrictTo("admin", "owner", "head-trainer"), gymController.addGym).delete(authController.protect, authController.restrictTo("admin"), gymController.deleteAllGyms);
router.route("/:id").get(gymController.getAGym).delete(authController.protect, authController.restrictTo("admin", "owner", "head-trainer"), gymController.deleteOneGym);
module.exports = router;
