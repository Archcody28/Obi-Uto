import React, {
  useEffect,
} from "react";

import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useCoinWalletStore,
} from "../store/coinWalletStore";
import { AppTheme } from "../constants/theme";

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
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Wallet
      </Text>
      <Text style={styles.title}>
        Coin Wallet
      </Text>

      <View style={styles.balanceCard}>
        <Text style={styles.label}>
          Available coins
        </Text>
        <Text style={styles.balance}>
          {wallet.coins}
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <Summary
          label="Purchased"
          value={wallet.totalPurchased}
        />
        <Summary
          label="Spent"
          value={wallet.totalSpent}
        />
      </View>

      <Text style={styles.section}>
        Purchase History
      </Text>

      <FlatList
        data={history}
        keyExtractor={(item) =>
          item._id
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No coin purchases yet.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.text}>
                {item.coinsPurchased} Coins
              </Text>
              <Text style={styles.meta}>
                Wallet top-up
              </Text>
            </View>

            <Text style={styles.amount}>
              NGN {item.amount}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

function Summary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
    padding: 20,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 10,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 18,
  },

  balanceCard: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.lg,
    padding: 20,
    marginBottom: 12,
  },

  label: {
    color: AppTheme.colors.textMuted,
    fontWeight: "800",
  },

  balance: {
    color: AppTheme.colors.text,
    fontSize: 42,
    fontWeight: "900",
    marginTop: 8,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 14,
  },

  summaryValue: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "900",
  },

  summaryLabel: {
    color: AppTheme.colors.textSubtle,
    marginTop: 4,
    fontWeight: "700",
  },

  section: {
    color: AppTheme.colors.text,
    fontSize: 20,
    marginTop: 28,
    marginBottom: 12,
    fontWeight: "900",
  },

  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    padding: 16,
    borderRadius: AppTheme.radius.md,
    marginBottom: 10,
  },

  text: {
    color: AppTheme.colors.text,
    fontWeight: "900",
  },

  meta: {
    color: AppTheme.colors.textSubtle,
    marginTop: 4,
  },

  amount: {
    color: AppTheme.colors.accent,
    fontWeight: "900",
  },

  empty: {
    color: AppTheme.colors.textMuted,
    textAlign: "center",
    marginTop: 34,
  },
});
