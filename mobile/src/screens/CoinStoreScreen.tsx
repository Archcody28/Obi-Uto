import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { router } from "expo-router";

const PACKAGES = [
  { coins: 100, amount: 1000 },
  { coins: 250, amount: 2000 },
  { coins: 700, amount: 5000 },
  { coins: 1500, amount: 10000 },
  { coins: 4000, amount: 25000 },
];

export default function CoinStoreScreen() {
  const buyPackage = (pkg) => {
    router.push({
      pathname: "/coin-checkout",
      params: {
        coins: pkg.coins,
        amount: pkg.amount,
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Buy Coins
      </Text>

      {PACKAGES.map((pkg) => (
        <TouchableOpacity
          key={pkg.coins}
          style={styles.card}
          onPress={() =>
            buyPackage(pkg)
          }
        >
          <Text style={styles.coins}>
            🪙 {pkg.coins} Coins
          </Text>

          <Text style={styles.price}>
            ₦{pkg.amount.toLocaleString()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    padding: 20,
  },

  title: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 25,
  },

  card: {
    backgroundColor: "#1A1A1A",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },

  coins: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
  },

  price: {
    color: "#6C5CE7",
    marginTop: 8,
    fontSize: 18,
  },
});