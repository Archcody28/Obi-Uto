import React, {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getMyCreatorProfile,
} from "../api/creatorApi";
import {
  getWallet,
  requestWithdrawal,
} from "../api/walletApi";
import { AppTheme } from "../constants/theme";

export default function CreatorWalletScreen() {
  const [creator, setCreator] =
    useState<any>(null);
  const [wallet, setWallet] =
    useState<any>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const loadWallet =
    async () => {
      setError("");
      try {
        const profile =
          await getMyCreatorProfile();

        setCreator(profile);

        if (profile?._id) {
          const data =
            await getWallet(
              profile._id
            );

          setWallet(data);
        }
      } catch (err) {
        console.log(err);
        setError(
          "Unable to load creator wallet."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadWallet();
  }, []);

  const withdraw =
    async () => {
      if (!creator?._id) {
        Alert.alert(
          "Creator account required",
          "Create a creator profile before requesting withdrawals."
        );
        return;
      }

      try {
        await requestWithdrawal(
          creator._id,
          1000
        );

        Alert.alert(
          "Withdrawal requested",
          "Your request has been submitted."
        );

        loadWallet();
      } catch (err: any) {
        console.log(err);
        Alert.alert(
          "Withdrawal failed",
          err?.response?.data?.message ||
            "Please try again."
        );
      }
    };

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator
          color={AppTheme.colors.accent}
        />
        <Text style={styles.stateText}>
          Loading wallet...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>
        Creator Studio
      </Text>
      <Text style={styles.title}>
        Earnings
      </Text>

      {!!error && (
        <TouchableOpacity
          style={styles.errorCard}
          onPress={loadWallet}
        >
          <Text style={styles.errorText}>
            {error}
          </Text>
          <Text style={styles.retryText}>
            Tap to retry
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.balanceCard}>
        <Text style={styles.label}>
          Available balance
        </Text>
        <Text style={styles.amount}>
          NGN {wallet?.balance || 0}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>
          Total earned
        </Text>
        <Text style={styles.rowValue}>
          NGN {wallet?.totalEarned || 0}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={withdraw}
      >
        <Text style={styles.buttonText}>
          Withdraw NGN 1000
        </Text>
      </TouchableOpacity>
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
    marginBottom: 22,
  },

  balanceCard: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.lg,
    padding: 20,
    marginBottom: 14,
  },

  label: {
    color: AppTheme.colors.textMuted,
    fontWeight: "800",
  },

  amount: {
    color: AppTheme.colors.text,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 16,
    marginBottom: 16,
  },

  rowLabel: {
    color: AppTheme.colors.textMuted,
    fontWeight: "700",
  },

  rowValue: {
    color: AppTheme.colors.text,
    fontWeight: "900",
  },

  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.md,
  },

  buttonText: {
    color: AppTheme.colors.background,
    fontWeight: "900",
  },

  state: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.background,
    padding: 24,
  },

  stateText: {
    color: AppTheme.colors.textMuted,
    marginTop: 10,
  },

  errorCard: {
    backgroundColor: "rgba(225,91,100,0.12)",
    borderColor: AppTheme.colors.danger,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 14,
    marginBottom: 16,
  },

  errorText: {
    color: AppTheme.colors.text,
    fontWeight: "800",
  },

  retryText: {
    color: AppTheme.colors.danger,
    marginTop: 4,
    fontWeight: "700",
  },
});
