const path = require("path");

const cloudinary = require("../config/cloudinary");

const DEFAULT_FOLDER = process.env.CLOUDINARY_FOLDER || "online-exam";

function toDataUri(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

async function uploadImageBufferToCloudinary(file, folder = DEFAULT_FOLDER) {
  if (!file || !file.buffer || !file.mimetype) {
    throw new Error("File anh khong hop le");
  }

  const result = await cloudinary.uploader.upload(toDataUri(file), {
    folder,
    resource_type: "image",
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

function getCloudinaryPublicIdFromUrl(url) {
  if (!url) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (
    parsed.hostname !== "res.cloudinary.com" ||
    (cloudName && !parsed.pathname.startsWith(`/${cloudName}/image/upload/`))
  ) {
    return null;
  }

  const uploadMarker = "/image/upload/";
  const markerIndex = parsed.pathname.indexOf(uploadMarker);
  if (markerIndex === -1) return null;

  const segments = parsed.pathname
    .slice(markerIndex + uploadMarker.length)
    .split("/")
    .filter(Boolean);

  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  const publicIdSegments = versionIndex >= 0
    ? segments.slice(versionIndex + 1)
    : segments;

  if (publicIdSegments.length === 0) return null;

  const publicIdWithExt = publicIdSegments.join("/");
  const ext = path.extname(publicIdWithExt);
  return ext ? publicIdWithExt.slice(0, -ext.length) : publicIdWithExt;
}

async function deleteImageFromCloudinaryUrl(url) {
  const publicId = getCloudinaryPublicIdFromUrl(url);
  if (!publicId) return false;

  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  return true;
}

module.exports = {
  uploadImageBufferToCloudinary,
  deleteImageFromCloudinaryUrl,
  getCloudinaryPublicIdFromUrl,
};
