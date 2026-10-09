const cloudinary =
  require("cloudinary").v2;

cloudinary.config({
  // Accept both the code-facing names and the names documented in README /
  // .env.example so a copied template actually configures the provider.
  cloud_name:
    process.env.CLOUDINARY_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_KEY ||
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_SECRET ||
    process.env.CLOUDINARY_API_SECRET,
});

module.exports =
  cloudinary;