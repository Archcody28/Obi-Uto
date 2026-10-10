import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import socket from "../services/socketService";

import {
  getMessages,
} from "../api/liveChatApi";

import {
  sendDonation,
} from "../api/donationApi";

import GiftModal
  from "../components/GiftModal";
import { AppTheme } from "../constants/theme";

export default function LiveChatScreen({
  streamId,
  isModerator = false,
  moderatorId = null,
  stream,
}) {
  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    viewers,
    setViewers,
  ] = useState(0);

  const [
    giftVisible,
    setGiftVisible,
  ] = useState(false);

  const [
    giftAnimation,
    setGiftAnimation,
  ] = useState(null);

  const [
    chatLoading,
    setChatLoading,
  ] = useState(true);

  const [
    chatError,
    setChatError,
  ] = useState("");

  const [
    bannedNotice,
    setBannedNotice,
  ] = useState("");

  const [
    streamEndedNotice,
    setStreamEndedNotice,
  ] = useState("");

  useEffect(() => {
    setChatLoading(true);
    setChatError("");
    setStreamEndedNotice("");

    getMessages(streamId)
      .then((data) => {
        setMessages(
          Array.isArray(data) ? data : []
        );
      })
      .catch((err) => {
        console.error(err);
        setChatError(
          "We could not load chat history."
        );
      })
      .finally(() =>
        setChatLoading(false)
      );

    socket.emit(
      "join-stream",
      {
        streamId,
      }
    );

    socket.on(
      "new-message",
      (msg) => {
        setMessages(
          (prev) => [
            ...prev,
            msg,
          ]
        );
      }
    );

    socket.on(
      "viewer-count",
      (count) => {
        // Guard against malformed payloads; server never sends negatives.
        const parsed = Math.max(0, Number(count) || 0);
        setViewers(parsed);
      }
    );

    socket.on(
      "stream-ended",
      () => {
        setStreamEndedNotice(
          "The broadcast has ended."
        );
      }
    );

    socket.on(
      "chat-error",
      (error) => {
        const text =
          typeof error === "string"
            ? error
            : error?.message || "Chat unavailable.";

        if (
          text.toLowerCase().includes("banned") ||
          text.toLowerCase().includes("muted")
        ) {
          setBannedNotice(text);
        }

        Alert.alert(
          "Chat Error",
          text
        );
      }
    );

    socket.on(
      "announcement",
      (data) => {
        Alert.alert(
          "Announcement",
          `📢 ${data.message}`
        );
      }
    );

    socket.on(
      "message-deleted",
      (messageId) => {
        setMessages(
          (prev) =>
            prev.filter(
              (msg) =>
                msg._id !==
                messageId
            )
        );
      }
    );

    socket.on(
      "message-pinned",
      (message) => {
        setMessages(
          (prev) => [
            {
              ...message,
              pinned: true,
            },
            ...prev.filter(
              (m) =>
                m._id !==
                message._id
            ),
          ]
        );
      }
    );

    socket.on(
      "gift-animation",
      (gift) => {
        setGiftAnimation(
          gift
        );

        setTimeout(() => {
          setGiftAnimation(
            null
          );
        }, 3000);
      }
    );

    socket.on(
      "user-muted",
      (payload) => {
        setBannedNotice(
          "A user was muted by a moderator."
        );
        void payload;
      }
    );

    socket.on(
      "user-banned",
      (payload) => {
        setBannedNotice(
          "A user was banned by a moderator."
        );
        void payload;
      }
    );

    return () => {
      socket.emit(
        "leave-stream",
        {
          streamId,
        }
      );

      socket.off(
        "new-message"
      );

      socket.off(
        "viewer-count"
      );

      socket.off(
        "chat-error"
      );

      socket.off(
        "announcement"
      );

      socket.off(
        "message-deleted"
      );

      socket.off(
        "message-pinned"
      );

      socket.off(
        "gift-animation"
      );

      socket.off(
        "user-muted"
      );

      socket.off(
        "user-banned"
      );

      socket.off(
        "stream-ended"
      );
    };
  }, [streamId]);

  const sendMessage =
    () => {
      if (
        !message.trim()
      ) {
        return;
      }

      socket.emit(
      "send-message",
      {
        streamId,
        message,
      }
      );

      setMessage("");
    };

  /*
   Moderation Actions
  */
  const handleModeration =
    (item) => {
      if (
        !isModerator
      ) {
        return;
      }

      Alert.alert(
        "Moderation",
        "Choose an action",
        [
          {
            text:
              "Pin Message",

            onPress: () => {
              socket.emit(
                "pin-message",
                {
                  streamId,
                  messageId:
                    item._id,
                }
              );
            },
          },

          {
            text:
              "Delete Message",

            style:
              "destructive",

            onPress: () => {
              socket.emit(
                "delete-message",
                {
                  streamId,
                  messageId:
                    item._id,
                }
              );
            },
          },

          {
            text:
              "Mute User (5 min)",

            onPress: () => {
              socket.emit(
                "mute-user",
                {
                  streamId,

                  userId:
                    item.userId,

                  moderatorId,

                  durationMinutes:
                    5,
                }
              );
            },
          },

          {
            text:
              "Ban User",

            style:
              "destructive",

            onPress: () => {
              socket.emit(
                "ban-user",
                {
                  streamId,

                  userId:
                    item.userId,

                  moderatorId,

                  reason:
                    "Violation",
                }
              );
            },
          },

          {
            text:
              "Cancel",

            style:
              "cancel",
          },
        ]
      );
    };

  /*
   Donations
  */
  const handleDonate =
    async () => {
      try {
        if (
          !stream
        ) {
          Alert.alert(
            "Error",
            "Stream information not available"
          );

          return;
        }

        await sendDonation({
          streamId:
            stream._id,

          creatorId:
            stream.creatorId,

          amount: 100,

          message:
            "Amazing stream!",
        });

        Alert.alert(
          "Success",
          "Donation sent"
        );
      } catch (err) {
        console.log(err);

        Alert.alert(
          "Error",
          "Donation failed"
        );
      }
    };

  return (
    <View
      style={
        styles.container
      }
    >
      <Text
        style={
          styles.viewer
        }
      >
        👁 {viewers} watching
      </Text>

      {chatLoading && (
        <Text style={styles.notice}>
          Loading chat history...
        </Text>
      )}

      {!!chatError && (
        <Text style={styles.error}>
          {chatError} Pull to reopen the stream to retry.
        </Text>
      )}

      {!!bannedNotice && (
        <Text style={styles.notice}>
          {bannedNotice}
        </Text>
      )}

      {!!streamEndedNotice && (
        <Text style={styles.notice}>
          {streamEndedNotice}
        </Text>
      )}

      <FlatList
        data={messages}
        keyExtractor={(
          item,
          index
        ) =>
          item._id ||
          index.toString()
        }
        renderItem={({
          item,
        }) => (
          <TouchableOpacity
            onLongPress={() =>
              handleModeration(
                item
              )
            }
          >
            <Text
              style={[
                styles.msg,

                item.pinned &&
                  styles.pinned,
              ]}
            >
              <Text
                style={
                  styles.username
                }
              >
                {
                  item.username ||
                  item.user ||
                  "User"
                }

                {item.isModerator
                  ? " 🛡️"
                  : ""}

                :
              </Text>{" "}
              {
                item.message
              }
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !chatLoading ? (
            <Text style={styles.notice}>
              No messages yet. Start the conversation.
            </Text>
          ) : null
        }
      />

      <TouchableOpacity
        style={
          styles.tipBtn
        }
        onPress={
          handleDonate
        }
      >
        <Text
          style={
            styles.tipText
          }
        >
          💰 Donate
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={
          styles.giftBtn
        }
        onPress={() =>
          setGiftVisible(
            true
          )
        }
      >
        <Text
          style={
            styles.tipText
          }
        >
          🎁 Gifts
        </Text>
      </TouchableOpacity>

      <View
        style={
          styles.inputRow
        }
      >
        <TextInput
          value={message}
          onChangeText={
            setMessage
          }
          style={
            styles.input
          }
          placeholder="Message..."
          placeholderTextColor="#777"
        />

        <TouchableOpacity
          onPress={
            sendMessage
          }
        >
          <Text
            style={
              styles.send
            }
          >
            Send
          </Text>
        </TouchableOpacity>
      </View>

      <GiftModal
        visible={giftVisible}
        onClose={() =>
          setGiftVisible(
            false
          )
        }
        streamId={streamId}
        creatorId={
          stream?.creatorId
        }
      />

      {
        giftAnimation && (
          <View
            style={
              styles.giftOverlay
            }
          >
            <Text
              style={
                styles.giftOverlayText
              }
            >
              {
                giftAnimation.icon
              }{" "}
              {
                giftAnimation.name
              }
            </Text>
          </View>
        )
      }
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        AppTheme.colors.background,
      padding: 12,
    },

    viewer: {
      color: AppTheme.colors.textMuted,
      marginBottom: 10,
      fontWeight:
        "800",
    },

    notice: {
      color: AppTheme.colors.textMuted,
      marginBottom: 10,
      lineHeight: 20,
    },

    error: {
      color: AppTheme.colors.danger,
      marginBottom: 10,
      lineHeight: 20,
    },

    msg: {
      color: AppTheme.colors.text,
      marginBottom: 8,
      lineHeight: 20,
    },

    pinned: {
      color: AppTheme.colors.accent,
    },

    username: {
      fontWeight:
        "700",
    },

    tipBtn: {
      backgroundColor:
        AppTheme.colors.surface,
      padding: 12,
      borderRadius: AppTheme.radius.sm,
      alignItems:
        "center",
      marginVertical: 10,
      borderColor: AppTheme.colors.border,
      borderWidth: 1,
    },

    giftBtn: {
      backgroundColor:
        AppTheme.colors.accentSoft,
      padding: 12,
      borderRadius: AppTheme.radius.sm,
      alignItems:
        "center",
      marginBottom: 10,
    },

    tipText: {
      color: "#FFF",
      fontWeight:
        "700",
    },

    inputRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 10,
    },

    input: {
      flex: 1,
      backgroundColor:
        AppTheme.colors.input,
      color: AppTheme.colors.text,
      borderRadius: AppTheme.radius.sm,
      borderColor: AppTheme.colors.border,
      borderWidth: 1,
      padding: 10,
      marginRight: 10,
    },

    send: {
      color:
        AppTheme.colors.accent,
      fontWeight:
        "900",
    },

    giftOverlay: {
      position: "absolute",
      top: 80,
      alignSelf:
        "center",
      backgroundColor:
        "rgba(0,0,0,0.8)",
      padding: 15,
      borderRadius: 12,
    },

    giftOverlayText: {
      color: "#FFF",
      fontSize: 24,
      fontWeight: "700",
    },
  });
