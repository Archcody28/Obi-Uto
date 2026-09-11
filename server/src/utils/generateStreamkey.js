const crypto =
  require("crypto");

module.exports =
  () =>
    crypto
      .randomBytes(24)
      .toString("hex");