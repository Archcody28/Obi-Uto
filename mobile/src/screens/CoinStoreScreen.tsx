import React from "react";

import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { router } from "expo-router";

import { AppTheme } from "../constants/theme";

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
      <Text style={styles.kicker}>
        Wallet
      </Text>
      <Text style={styles.title}>
        Buy Coins
      </Text>
      <Text style={styles.copy}>
        Choose a coin package and complete checkout securely.
      </Text>

      <FlatList
        data={PACKAGES}
        keyExtractor={(item) =>
          item.coins.toString()
        }
        contentContainerStyle={
          styles.list
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.78}
            onPress={() =>
              buyPackage(item)
            }
          >
            <View>
              <Text style={styles.coins}>
                {item.coins} Coins
              </Text>
              <Text style={styles.meta}>
                Obi-Uto wallet top-up
              </Text>
            </View>

            <Text style={styles.price}>
              NGN {item.amount.toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    padding: AppTheme.spacing.lg,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: AppTheme.typography.kicker.fontSize,
    fontWeight: AppTheme.typography.kicker.fontWeight,
    letterSpacing: AppTheme.typography.kicker.letterSpacing,
    textTransform: "uppercase",
    marginTop: AppTheme.spacing.md,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
  },

  copy: {
    color: AppTheme.colors.textMuted,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: AppTheme.spacing.xl,
  },

  list: {
    paddingBottom: 96,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    padding: 18,
    borderRadius: AppTheme.radius.md,
    marginBottom: 12,
  },

  coins: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.subtitle.fontSize,
    fontWeight: "900",
  },

  meta: {
    color: AppTheme.colors.textSubtle,
    marginTop: 4,
  },

  price: {
    color: AppTheme.colors.accent,
    fontSize: AppTheme.typography.subtitle.fontSize,
    fontWeight: "900",
  },
});
