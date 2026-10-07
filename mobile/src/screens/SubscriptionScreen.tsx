import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSubscriptionPlans } from "../api/subscriptionApi";
import {
  createCheckout,
  verifyPayment,
} from "../api/paymentApi";
import {
  useAuthStore,
} from "../store/authStore";
import { AppTheme } from "../constants/theme";

type Plan = {
  _id: string;
  name: string;
  code: string;
  price: number;
  durationDays?: number;
  description?: string;
  features?: string[];
  active?: boolean;
};

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);
  const restoreAuth =
    useAuthStore((state) => state.restoreAuth);

  const [
    plans,
    setPlans,
  ] = useState<Plan[]>([]);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    error,
    setError,
  ] = useState("");
  const [
    checkoutUrl,
    setCheckoutUrl,
  ] = useState("");
  const [
    busyPlanId,
    setBusyPlanId,
  ] = useState<string | null>(null);
  const [
    verified,
    setVerified,
  ] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const data = await getSubscriptionPlans();
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.plans)
        ? (data as any).plans
        : [];
      setPlans(list);
    } catch (err: any) {
      console.log("subscription plans load failed", err?.message);
      setError(
        "We could not load subscription plans. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCheckout = async (plan: Plan) => {
    if (busyPlanId) {
      return;
    }

    if (plan.price <= 0) {
      Alert.alert(
        "Free plan",
        "The Free plan is already included with your account. No payment is needed."
      );
      return;
    }

    if (!user?.email) {
      Alert.alert(
        "Account required",
        "Sign in with your account email before subscribing."
      );
      return;
    }

    setBusyPlanId(plan._id);

    try {
      const payment = await createCheckout({
        email: user.email,
        planId: plan._id,
      });

      if (!payment?.authorization_url) {
        throw new Error("missing authorization_url");
      }

      setCheckoutUrl(payment.authorization_url);
    } catch (err: any) {
      console.log("subscription checkout failed", err?.message);
      Alert.alert(
        "Checkout unavailable",
        "Subscription checkout is not available right now. You have NOT been charged. Please try again later."
      );
    } finally {
      setBusyPlanId(null);
    }
  };

  const [
    verifying,
    setVerifying,
  ] = useState(false);

  const handleVerify = async (reference: string) => {
    if (verifying) {
      return;
    }

    setVerifying(true);

    try {
      await verifyPayment(reference);

      // Only claim success after the server confirms the payment.
      setCheckoutUrl("");
      setVerified(true);
      await restoreAuth();

      Alert.alert(
        "Subscription active",
        "Your payment was verified and your subscription is now active."
      );
    } catch (err: any) {
      console.log("subscription verify failed", err?.message);
      setCheckoutUrl("");
      Alert.alert(
        "Payment not completed",
        "We could not verify this payment, so no subscription was activated. If you were charged, contact support."
      );
    } finally {
      setVerifying(false);
    }
  };

  if (checkoutUrl) {
    // Lazy import keeps the WebView bundle out of the plans list path.
    const WebView =
      require("react-native-webview").default;

    return (
      <WebView
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={(nav: {
          url: string;
        }) => {
          if (nav.url.includes("reference=")) {
            const reference = nav.url
              .split("reference=")[1]
              .split("&")[0];

            handleVerify(reference);
          }
        }}
      />
    );
  }

  const currentPlan = user?.subscription || "free";

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop:
            AppTheme.spacing.lg + insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Text style={styles.kicker}>Membership</Text>
      <Text style={styles.title}>
        Subscription Plans
      </Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>
          Current plan
        </Text>
        <Text style={styles.statusValue}>
          {currentPlan === "premium"
            ? "Premium"
            : "Free"}
        </Text>
        {!!verified && (
          <Text style={styles.statusNote}>
            Your latest payment was verified. Premium
            access is active.
          </Text>
        )}
      </View>

      {!!error && (
        <TouchableOpacity
          style={styles.errorCard}
          onPress={load}
        >
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.retry}>
            Tap to retry
          </Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator
            color={AppTheme.colors.accent}
          />
          <Text style={styles.stateText}>
            Loading plans...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {plans.length === 0 && !error && (
            <Text style={styles.empty}>
              No plans are available right now. Please
              check back soon.
            </Text>
          )}

          {plans.map((plan) => (
            <View
              key={plan._id}
              style={[
                styles.planCard,
                plan.price <= 0 && styles.planCardFree,
              ]}
            >
              <View style={styles.planHeadline}>
                <Text style={styles.planName}>
                  {plan.name}
                </Text>
                <Text style={styles.planPrice}>
                  {plan.price > 0
                    ? `NGN ${plan.price.toLocaleString()}`
                    : "Free"}
                </Text>
              </View>

              {!!plan.durationDays && (
                <Text style={styles.planMeta}>
                  {plan.durationDays} day billing
                  cycle
                </Text>
              )}

              {!!plan.description && (
                <Text style={styles.planMeta}>
                  {plan.description}
                </Text>
              )}

              {!!plan.features?.length && (
                <View style={styles.features}>
                  {plan.features.map((feature) => (
                    <Text
                      key={feature}
                      style={styles.feature}
                    >
                      - {feature}
                    </Text>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.selectBtn,
                  currentPlan === "premium" &&
                    plan.price > 0 &&
                    styles.selectBtnActive,
                  busyPlanId === plan._id &&
                    styles.selectBtnBusy,
                ]}
                disabled={busyPlanId === plan._id}
                activeOpacity={0.78}
                onPress={() => startCheckout(plan)}
              >
                <Text style={styles.selectText}>
                  {busyPlanId === plan._id
                    ? "Starting checkout..."
                    : plan.price <= 0
                    ? "Included with account"
                    : currentPlan === "premium"
                    ? "Switch to this plan"
                    : "Choose plan"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
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
    letterSpacing:
      AppTheme.typography.kicker.letterSpacing,
    textTransform: "uppercase",
    marginTop: AppTheme.spacing.md,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.display.fontSize,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: AppTheme.spacing.lg,
  },

  statusCard: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderColor: AppTheme.colors.accentMuted,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: AppTheme.spacing.lg,
    marginBottom: AppTheme.spacing.lg,
  },

  statusLabel: {
    color: AppTheme.colors.accent,
    fontSize: AppTheme.typography.kicker.fontSize,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  statusValue: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.heading.fontSize,
    fontWeight: "900",
    marginTop: 4,
  },

  statusNote: {
    color: AppTheme.colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
    fontSize: AppTheme.typography.caption.fontSize,
  },

  list: {
    paddingBottom: 120,
  },

  planCard: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: AppTheme.radius.lg,
    padding: AppTheme.spacing.lg,
    marginBottom: AppTheme.spacing.md,
  },

  planCardFree: {
    borderColor: AppTheme.colors.borderSoft,
  },

  planHeadline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AppTheme.spacing.md,
  },

  planName: {
    flex: 1,
    minWidth: 0,
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.subtitle.fontSize,
    fontWeight: "900",
  },

  planPrice: {
    color: AppTheme.colors.accent,
    fontSize: AppTheme.typography.subtitle.fontSize,
    fontWeight: "900",
  },

  planMeta: {
    color: AppTheme.colors.textMuted,
    marginTop: 4,
    fontSize: AppTheme.typography.caption.fontSize,
    lineHeight: 18,
  },

  features: {
    marginTop: AppTheme.spacing.sm,
    gap: 2,
  },

  feature: {
    color: AppTheme.colors.textMuted,
    fontSize: AppTheme.typography.body.fontSize,
    lineHeight: 22,
  },

  selectBtn: {
    marginTop: AppTheme.spacing.md,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: AppTheme.radius.sm,
    backgroundColor: AppTheme.colors.surfaceSoft,
    paddingHorizontal: 14,
  },

  selectBtnActive: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: AppTheme.colors.accentMuted,
  },

  selectBtnBusy: {
    opacity: 0.7,
  },

  selectText: {
    color: AppTheme.colors.text,
    fontWeight: "800",
    fontSize: AppTheme.typography.label.fontSize,
  },

  stateCard: {
    padding: 18,
    alignItems: "center",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },

  stateText: {
    color: AppTheme.colors.textMuted,
    marginTop: AppTheme.spacing.md,
  },

  empty: {
    color: AppTheme.colors.textMuted,
    textAlign: "center",
    marginTop: 44,
    lineHeight: 21,
    paddingHorizontal: AppTheme.spacing.lg,
  },

  errorCard: {
    backgroundColor: "rgba(225,91,100,0.12)",
    borderColor: AppTheme.colors.danger,
    borderWidth: 1,
    borderRadius: AppTheme.radius.md,
    padding: 14,
    marginBottom: 16,
  },

  error: {
    color: AppTheme.colors.text,
    fontWeight: "800",
  },

  retry: {
    color: AppTheme.colors.danger,
    marginTop: 4,
    fontWeight: "700",
  },
});
