import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  ActivityIndicator,
  Alert,
} from "react-native";

import {
  WebView,
} from "react-native-webview";

import {
  useLocalSearchParams,
  router,
} from "expo-router";

import {
  purchaseCoins,
  verifyPayment,
} from "../api/paymentApi";
import { useAuthStore } from "@/store/authStore";

export default function CoinCheckoutScreen() {
  const {
    coins,
    amount,
  } =
    useLocalSearchParams();

  const [
    checkoutUrl,
    setCheckoutUrl,
  ] = useState("");

  const user =
    useAuthStore(
      (state) =>
        state.user
    );

  useEffect(() => {
    startCheckout();
  }, []);

  const startCheckout =
    async () => {
      try {
        if (!user) {
          throw new Error(
            "User is required"
          );
        }

        const email =
          user.email;

        const payment =
          await purchaseCoins({
            email,
            coins:
              Number(coins),
          });

        setCheckoutUrl(
          payment.authorization_url
        );
      } catch (err) {
        console.log(err);

        Alert.alert(
          "Error",
          "Failed to start checkout"
        );

        router.back();
      }
    };

  if (!checkoutUrl) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent:
            "center",
        }}
      >
        <ActivityIndicator
          size="large"
        />
      </View>
    );
  }

  return (
    <WebView
      source={{
        uri: checkoutUrl,
      }}
      onNavigationStateChange={
        async (nav) => {
          if (
            nav.url.includes(
              "reference="
            )
          ) {
            const reference =
              nav.url.split(
                "reference="
              )[1];

            try {
              await verifyPayment(
                reference
              );

              Alert.alert(
                "Success",
                `${coins} coins added`
              );

              router.replace(
                "/coin-success"
              );
            } catch (err) {
              Alert.alert(
                "Verification Failed"
              );
            }
          }
        }
      }
    />
  );
}
