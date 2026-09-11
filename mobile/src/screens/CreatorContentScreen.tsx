import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  getCreatorContent,
  deleteContent,
} from "../api/creatorApi";
import {
  notifyMe,
} from "../api/notificationApi";
import {
  useAuthStore,
} from "../store/authStore";

interface CreatorContent {
  _id: string;
  title: string;
  views?: number;
  likes?: number;
  isLive?: boolean;
  isScheduled?: boolean;
  maturityRating?: string;
}

interface User {
  _id: string;
}

export default function CreatorContentScreen() {
  const [content, setContent] =
  useState<any[]>([]);

  // Replace with actual creator ID
  const creatorId =
    "creator-1";

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent =
    async () => {
      try {
        const data =
          await getCreatorContent(
            creatorId
          );

        setContent(data);
      } catch (err) {
        console.log(err);
      }
    };

   const user =
  useAuthStore(
    (state) => state.user
  ) as User | null;

const handleNotify =
  async (
    streamId: string
  ) => {
    try {

      if (!user) {
  Alert.alert(
    "Error",
    "Please log in first."
  );
  return;
}

if (!user) {
  Alert.alert(
    "Error",
    "Please log in first."
  );
  return;
}

await notifyMe(
  streamId,
  user._id
);

      Alert.alert(
        "Subscribed",
        "We'll notify you when the stream starts."
      );

    } catch (err) {

      console.log(err);

      Alert.alert(
        "Error",
        "Unable to subscribe."
      );

    }
  };

  const handleDelete =
    async (id: string) => {
      try {
        await deleteContent(id);

        setContent(
          content.filter(
            (item) =>
              item._id !== id
          )
        );

        alert(
          "Content Deleted"
        );
      } catch (err) {
        console.log(err);
      }
    };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        My Content
      </Text>

      <FlatList
        data={content}
        keyExtractor={(item) =>
          item._id
        }
        renderItem={({
  item,
}: {
  item: CreatorContent;
}) => (
          <View
            style={styles.card}
          >
            <Text
              style={styles.name}
            >
              {item.title}
            </Text>
{item.isScheduled &&
!item.isLive && (

<TouchableOpacity
  style={styles.notifyBtn}
  onPress={() =>
    handleNotify(item._id)
  }
>

<Text
  style={styles.notifyText}
>

🔔 Notify Me

</Text>

</TouchableOpacity>

)}
            {item.isLive && (
              <Text
                style={{
                  color: "red",
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                🔴 LIVE
              </Text>
            )}


            <Text
              style={styles.stats}
            >
              👁 {item.views || 0}
              {"  "}
              ❤️ {item.likes || 0}
            </Text>

            <View
              style={
                styles.actions
              }
            >
              <TouchableOpacity
                style={
                  styles.editBtn
                }
                onPress={() =>
                  router.push(
                    `/edit-content/${item._id}` as any
                  )
                }
              >
                <Text
                  style={
                    styles.btnText
                  }
                >
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.deleteBtn
                }
                onPress={() =>
                  handleDelete(
                    item._id
                  )
                }
              >
                <Text
                  style={
                    styles.btnText
                  }
                >
                  Delete
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.statsBtn
                }
                onPress={() =>
                  router.push(
                    `/content-stats/${item._id}` as any
                  )
                }
              >
                <Text
                  style={
                    styles.btnText
                  }
                >
                  Statistics
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#0D0D0D",
      padding: 20,
    },

    title: {
      color: "#fff",
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 20,
    },

    card: {
      backgroundColor:
        "#1A1A1A",
      padding: 16,
      borderRadius: 12,
      marginBottom: 15,
    },

    name: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "700",
    },

    stats: {
      color: "#999",
      marginTop: 8,
      marginBottom: 15,
    },

    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },

    editBtn: {
      backgroundColor:
        "#6C5CE7",
      padding: 10,
      borderRadius: 8,
    },

    deleteBtn: {
      backgroundColor:
        "#E74C3C",
      padding: 10,
      borderRadius: 8,
    },

    statsBtn: {
      backgroundColor:
        "#00B894",
      padding: 10,
      borderRadius: 8,
    },

    btnText: {
      color: "#fff",
      fontWeight: "700",
    },
    notifyBtn: {
  backgroundColor: "#FF4444",
  padding: 10,
  borderRadius: 8,
  marginTop: 10,
},

notifyText: {
  color: "#FFF",
  textAlign: "center",
  fontWeight: "700",
},
  });
