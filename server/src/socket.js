const {
  Server,
} = require("socket.io");

const jwt = require("jsonwebtoken");

const User = require("./models/User");

const LiveChat =
  require("./models/LiveChat");

const LiveBan =
  require("./models/LiveBan");

const LiveMute =
  require("./models/LiveMute");

const LiveModerator =
  require("./models/LiveModerator");

const viewers = {};

// Helper: check if user is moderator for a stream
async function isModerator(streamId, userId) {
  if (!streamId || !userId) return false;

  // Admins are always moderators
  const user = await User.findById(userId);
  if (user && user.role === "admin") return true;

  const mod = await LiveModerator.findOne({
    streamId,
    userId,
  });

  return !!mod;
}

const initializeSocket =
  (server) => {
    io = new Server(server, {
      cors: {
        origin: "*",
      },
    });

    // JWT authentication middleware
    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error("Authentication required"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        socket.user = {
          id: decoded.id,
          email: decoded.email,
        };

        next();
      } catch (err) {
        return next(new Error("Invalid or expired token"));
      }
    });

    io.on(
      "connection",
      (socket) => {
        console.log(
          "Socket connected:",
          socket.id,
          "User:",
          socket.user?.id
        );

        socket.on(
          "join-stream",
          ({ streamId }) => {
            if (!streamId) return;

            socket.join(streamId);
            
            viewers[streamId] =
              (viewers[streamId] || 0) + 1;

            io.to(streamId).emit(
              "viewer-count",
              viewers[streamId]
            );
          }
        );

        socket.on(
          "send-message",
          async (data) => {
            try {
              if (!data || !data.streamId) return;

              // Use authenticated user ID from socket, not client-supplied
              const userId = socket.user.id;
              const username = socket.user.email;

              const banned =
                await LiveBan.findOne({
                  streamId: data.streamId,
                  userId: userId,
                });

              if (banned) {
                socket.emit(
                  "chat-error",
                  "You are banned from this stream."
                );
                return;
              }

              const muted =
                await LiveMute.findOne({
                  streamId: data.streamId,
                  userId: userId,
                  expiresAt: {
                    $gt: new Date(),
                  },
                });

              if (muted) {
                socket.emit(
                  "chat-error",
                  "You are muted."
                );
                return;
              }

              const chat =
                await LiveChat.create({
                  streamId: data.streamId,
                  userId: userId,
                  username: username,
                  message: data.message,
                });

              io.to(data.streamId).emit(
                "new-message",
                chat
              );
            } catch (err) {
              console.log("send-message error:", err.message);
            }
          }
        );

        socket.on(
          "pin-message",
          async ({ messageId, streamId }) => {
            try {
              // Server-side moderator authorization
              const authorized = await isModerator(streamId, socket.user.id);

              if (!authorized) {
                socket.emit(
                  "chat-error",
                  "Not authorized to pin messages"
                );
                return;
              }

              const message =
                await LiveChat.findByIdAndUpdate(
                  messageId,
                  {
                    pinned: true,
                  },
                  {
                    new: true,
                  }
                );

              if (message) {
                io.to(
                  message.streamId.toString()
                ).emit(
                  "message-pinned",
                  message
                );
              }
            } catch (err) {
              console.log("pin-message error:", err.message);
            }
          }
        );

        socket.on(
          "delete-message",
          async ({ messageId, streamId }) => {
            try {
              // Server-side moderator authorization
              const authorized = await isModerator(streamId, socket.user.id);

              if (!authorized) {
                socket.emit(
                  "chat-error",
                  "Not authorized to delete messages"
                );
                return;
              }

              const message =
                await LiveChat.findById(
                  messageId
                );

              if (!message) {
                return;
              }

              await LiveChat.findByIdAndDelete(
                messageId
              );

              io.to(
                message.streamId.toString()
              ).emit(
                "message-deleted",
                messageId
              );
            } catch (err) {
              console.log("delete-message error:", err.message);
            }
          }
        );

        socket.on(
          "mute-user",
          async ({
            streamId,
            userId,
            durationMinutes,
          }) => {
            try {
              // Server-side moderator authorization
              const authorized = await isModerator(streamId, socket.user.id);

              if (!authorized) {
                socket.emit(
                  "chat-error",
                  "Not authorized to mute users"
                );
                return;
              }

              const expiresAt =
                new Date(
                  Date.now() +
                    (durationMinutes || 60) * 60 * 1000
                );

              await LiveMute.create({
                streamId,
                userId,
                mutedBy: socket.user.id,
                expiresAt,
              });

              io.to(streamId).emit(
                "user-muted",
                {
                  userId,
                  expiresAt,
                }
              );
            } catch (err) {
              console.log("mute-user error:", err.message);
            }
          }
        );

        socket.on(
          "ban-user",
          async ({
            streamId,
            userId,
            reason,
          }) => {
            try {
              // Server-side moderator authorization
              const authorized = await isModerator(streamId, socket.user.id);

              if (!authorized) {
                socket.emit(
                  "chat-error",
                  "Not authorized to ban users"
                );
                return;
              }

              await LiveBan.create({
                streamId,
                userId,
                bannedBy: socket.user.id,
                reason,
              });

              io.to(streamId).emit(
                "user-banned",
                {
                  userId,
                  reason,
                }
              );
            } catch (err) {
              console.log("ban-user error:", err.message);
            }
          }
        );

        socket.on(
          "announcement",
          ({ streamId, message }) => {
            try {
              // Server-side moderator authorization
              isModerator(streamId, socket.user.id).then(
                (authorized) => {
                  if (!authorized) {
                    socket.emit(
                      "chat-error",
                      "Not authorized to make announcements"
                    );
                    return;
                  }

                  io.to(streamId).emit(
                    "announcement",
                    {
                      message,
                      createdAt: new Date(),
                    }
                  );
                }
              );
            } catch (err) {
              console.log("announcement error:", err.message);
            }
          }
        );

        socket.on(
          "leave-stream",
          ({ streamId }) => {
            if (!streamId) return;

            socket.leave(streamId);

            if (viewers[streamId]) {
              viewers[streamId]--;

              io.to(streamId).emit(
                "viewer-count",
                viewers[streamId]
              );
            }
          }
        );

        socket.on(
          "disconnect",
          () => {
            console.log(
              "Disconnected:",
              socket.id
            );
          }
        );
      }
    );
  };

module.exports = {
  initializeSocket,
  getIO: () => io,
};

