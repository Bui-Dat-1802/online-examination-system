const express = require("express");

const uploadImage = require("../middleware/uploadImage");
const { uploadImageBufferToCloudinary } = require("../services/cloudinaryUploadService");

const router = express.Router();

function handleImageUpload(req, res, next) {
  uploadImage.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return next();
  });
}

router.post("/image", handleImageUpload, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Khong tim thay file anh" });
    }

    const folder = process.env.CLOUDINARY_FOLDER || "online-exam";
    const result = await uploadImageBufferToCloudinary(req.file, folder);

    return res.status(201).json({
      message: "Upload anh thanh cong",
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
