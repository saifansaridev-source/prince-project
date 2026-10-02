const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Uploads an image buffer directly to Cloudinary via upload_stream
 * No filesystem writes needed - 100% serverless compatible
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<{ url: string, publicId: string, public_id: string }>}
 */
async function uploadToCloudinary(buffer, folder = "gharbazaar_properties") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ quality: "auto" }, { fetch_format: "auto" }]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          public_id: result.public_id
        });
      }
    );
    stream.end(buffer);
  });
}

module.exports = {
  cloudinary,
  uploadToCloudinary
};
