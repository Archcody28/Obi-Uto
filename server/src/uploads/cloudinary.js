const cloudinary =
  require("cloudinary").v2;

try {
  cloudinary.config({
    // Accept both the code-facing names and the names documented in README /
    // .env.example so a copied template actually configures the provider.
    // Dummy placeholders keep `require()` safe when credentials are absent;
    // real uploads fail gracefully inside uploadRecordedVideo instead.
    cloud_name:
      process.env.CLOUDINARY_NAME ||
      process.env.CLOUDINARY_CLOUD_NAME ||
      "missing-cloud",

    api_key:
      process.env.CLOUDINARY_KEY ||
      process.env.CLOUDINARY_API_KEY ||
      "missing-key",

    api_secret:
      process.env.CLOUDINARY_SECRET ||
      process.env.CLOUDINARY_API_SECRET ||
      "missing-secret",
  });
} catch (_err) {
  /* Missing/invalid Cloudinary env must never crash module load. */
}

module.exports =
  cloudinary;