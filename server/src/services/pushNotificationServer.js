const {
  Expo,
} = require(
  "expo-server-sdk"
);

const PushToken =
  require(
    "../models/PushToken"
  );

const Notification =
  require(
    "../models/Notification"
  );

const expo =
  new Expo();

/*
 Send notification to one user
*/

exports.sendNotification =
  async (
    userId,
    title,
    body,
    data = {}
  ) => {
    try {
      const pushToken =
        await PushToken.findOne({
          userId,
        });

      if (
        !pushToken
      ) {
        console.log(
          "No push token for user:",
          userId
        );

        return;
      }

      if (
        !Expo.isExpoPushToken(
          pushToken.token
        )
      ) {
        console.log(
          "Invalid Expo Push Token"
        );

        return;
      }

      const message = {
  to: pushToken.token,

  sound: "default",

  title,

  body,

  data,

  priority: "high",

  channelId: "default",
};

      await expo.sendPushNotificationsAsync(
        [message]
      );

      await Notification.create({
  userId,
  title,

  message: body,

  type:
    data.type ||
    "system",

  data,

  sent: true,
});

      console.log(
        "Notification sent."
      );
    } catch (err) {
      console.log(err);
    }
  };