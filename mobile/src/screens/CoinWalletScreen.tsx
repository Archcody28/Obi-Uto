import React,
{
  useEffect,
} from "react";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from "react-native";

import {
  useCoinWalletStore,
} from "../store/coinWalletStore";

export default function CoinWalletScreen() {
  const {
    wallet,
    history,
    loadWallet,
    loadHistory,
  } =
    useCoinWalletStore();

  useEffect(() => {
    loadWallet();
    loadHistory();
  }, []);

  return (
    <View
      style={
        styles.container
      }
    >
      <Text
        style={
          styles.balance
        }
      >
        🪙 {wallet.coins}
      </Text>

      <Text
        style={
          styles.stats
        }
      >
        Purchased:
        {" "}
        {
          wallet.totalPurchased
        }
      </Text>

      <Text
        style={
          styles.stats
        }
      >
        Spent:
        {" "}
        {
          wallet.totalSpent
        }
      </Text>

      <Text
        style={
          styles.section
        }
      >
        Purchase History
      </Text>

      <FlatList
        data={history}
        keyExtractor={
          (item) =>
            item._id
        }
        renderItem={({
          item,
        }) => (
          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.text
              }
            >
              +{
                item.coinsPurchased
              } Coins
            </Text>

            <Text
              style={
                styles.text
              }
            >
              ₦{
                item.amount
              }
            </Text>
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

    balance: {
      color: "#FFF",
      fontSize: 36,
      fontWeight: "700",
    },

    stats: {
      color: "#AAA",
      marginTop: 10,
      fontSize: 16,
    },

    section: {
      color: "#FFF",
      fontSize: 22,
      marginTop: 30,
      marginBottom: 20,
      fontWeight: "700",
    },

    card: {
      backgroundColor:
        "#1A1A1A",
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
    },

    text: {
      color: "#FFF",
    },
  });