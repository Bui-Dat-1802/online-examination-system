const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

router.get("/", userController.getUsers);
router.get("/me", userController.me);
router.post("/", userController.createUser);
router.put("/update", userController.updateUser);
router.put("/update-password", userController.updatePass);
router.delete("/:id", userController.deleteUser);
router.get("/:id", userController.getUserById);

module.exports = router;
