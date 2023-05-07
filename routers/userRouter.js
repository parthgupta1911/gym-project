const express = require("express");

const userController = require("./../controllers/usercontroller");
const authController = require("./../controllers/authController");
const router = express.Router();

router.route("/signup").post(authController.signUp);
router.route("/signup/:token").post(authController.addUser);

router.route("/login").post(authController.login);
router.route("/").get(authController.protect, authController.restrictTo("admin", "trainer"), userController.getAllUsers);
router.route("/forgotPassword").post(authController.forgotPassword);
router.route("/resetPassword/:token").patch(authController.resetPassword);
router.route("/updateMyPassword").patch(authController.protect, authController.updatePassword);
router.route("/me").get(authController.protect, userController.getCurrentUser);
router.route("/updateMe").patch(authController.protect, userController.updateMe);
router.route("/deleteMe").delete(authController.protect, userController.deleteMe);
router.route("/deleteAll").delete(userController.deleteAll);
router.route("/giverole").patch(authController.protect, authController.restrictTo("admin"), authController.giveRole);
module.exports = router;
