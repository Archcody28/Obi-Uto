const axios =
  require("axios");

async function sendPush(
  token,
  title,
  body,
  data = {}
) {
  try {
    await axios.post(
      "https://exp.host/--/api/v2/push/send",
      {
        to: token,
        sound: "default",
        title,
        body,
        data,
      }
    );
  } catch (err) {
    console.log(
      "Push Error:",
      err.message
    );
  }
}

module.exports = {
  sendPush,
};