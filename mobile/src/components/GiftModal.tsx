import React,
{
  useEffect,
  useState,
} from "react";

import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import {
  getGifts,
  sendGift,
} from "../api/giftApi";

import {
  useCoinStore,
} from "../store/coinStore";

import socket
  from "../services/socketService";

export default function GiftModal({
  visible,
  onClose,
  streamId,
  creatorId,
}) {
  const [gifts,
    setGifts] =
      useState([]);

  const deductCoins =
    useCoinStore(
      (state) =>
        state.deductCoins
    );

  useEffect(() => {
    if (visible) {
      getGifts()
        .then(setGifts)
        .catch(
          console.error
        );
    }
  }, [visible]);

  const handleGift =
    async (gift) => {
      try {
        await sendGift({
          streamId,
          creatorId,
          giftId:
            gift._id,
        });

        socket.emit(
         "gift-sent",
         {
          streamId,
          icon: gift.icon,
          name: gift.name,
        } 
    );

        deductCoins(
          gift.coinCost
        );

        Alert.alert(
          "Success",
          `Sent ${gift.icon}`
        );

        onClose();
      } catch (err) {
        Alert.alert(
          "Error",
          err?.response
            ?.data
            ?.message ||
            "Gift failed"
        );
      }
    };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View
        style={
          styles.overlay
        }
      >
        <View
          style={
            styles.container
          }
        >
          <Text
            style={
              styles.title
            }
          >
            Send Gift
          </Text>

          <FlatList
            data={gifts}
            keyExtractor={(
              item
            ) =>
              item._id
            }
            renderItem={({
              item,
            }) => (
              <TouchableOpacity
                style={
                  styles.gift
                }
                onPress={() =>
                  handleGift(
                    item
                  )
                }
              >
                <Text
                  style={
                    styles.icon
                  }
                >
                  {
                    item.icon
                  }
                </Text>

                <Text
                  style={
                    styles.name
                  }
                >
                  {
                    item.name
                  }
                </Text>

                <Text
                  style={
                    styles.cost
                  }
                >
                  {
                    item.coinCost
                  } Coins
                </Text>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            onPress={
              onClose
            }
          >
            <Text
              style={
                styles.close
              }
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles =
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent:
        "flex-end",
      backgroundColor:
        "rgba(0,0,0,0.5)",
    },

    container: {
      backgroundColor:
        "#111",
      padding: 20,
      borderTopLeftRadius:
        20,
      borderTopRightRadius:
        20,
      maxHeight: "70%",
    },

    title: {
      color: "#FFF",
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 20,
    },

    gift: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      paddingVertical: 15,
    },

    icon: {
      fontSize: 28,
    },

    name: {
      color: "#FFF",
      flex: 1,
      marginLeft: 15,
    },

    cost: {
      color: "#FFD700",
    },

    close: {
      color: "#6C5CE7",
      textAlign:
        "center",
      marginTop: 20,
    },
  });