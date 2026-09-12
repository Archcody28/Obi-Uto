import React, {
  useState,
} from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  loginUser,
} from "../api/authApi";

import {
  useAuthStore,
} from "../store/authStore";
import { AppTheme } from "../constants/theme";

export default function LoginScreen() {
  const setToken =
    useAuthStore(
      (state) =>
        state.setToken
    );

  const setUser =
    useAuthStore(
      (state) =>
        state.setUser
    );

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const handleLogin =
    async () => {
      try {
        setLoading(true);

        const response =
          await loginUser(
            email,
            password
          );

        setToken(
          response.token
        );

        setUser(
          response.user
        );

        router.replace(
          "/(tabs)/home"
        );
      } catch (err) {
        console.log(err);

        Alert.alert(
          "Login Failed",
          err?.response?.data
            ?.message ||
            "Unable to login"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <View
      style={
        styles.container
      }
    >
      <Text style={styles.kicker}>
        Obi-Uto
      </Text>
      <Text
        style={
          styles.title
        }
      >
        Sign in to your cinematic library.
      </Text>
      <Text style={styles.subtitle}>
        Continue watching, manage your wallet, and stream live experiences from one account.
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={
          AppTheme.colors.textSubtle
        }
        style={
          styles.input
        }
        value={email}
        onChangeText={
          setEmail
        }
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={
          AppTheme.colors.textSubtle
        }
        secureTextEntry
        style={
          styles.input
        }
        value={password}
        onChangeText={
          setPassword
        }
      />

      <TouchableOpacity
        style={[
          styles.button,
          loading &&
            styles.buttonDisabled,
        ]}
        onPress={
          handleLogin
        }
        disabled={loading}
      >
        <Text
          style={
            styles.text
          }
        >
          {loading
            ? "Signing In..."
            : "Login"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: AppTheme.colors.background,
      padding: AppTheme.spacing.xl,
    },

    kicker: {
      color: AppTheme.colors.accent,
      fontSize: AppTheme.typography.kicker.fontSize,
      fontWeight: AppTheme.typography.kicker.fontWeight,
      letterSpacing: AppTheme.typography.kicker.letterSpacing,
      textTransform: "uppercase",
      marginBottom: AppTheme.spacing.md,
    },

    title: {
      color: AppTheme.colors.text,
      fontSize: AppTheme.typography.display.fontSize,
      fontWeight: AppTheme.typography.display.fontWeight,
      lineHeight: AppTheme.typography.display.lineHeight,
      marginBottom: AppTheme.spacing.md,
    },

    subtitle: {
      color: AppTheme.colors.textMuted,
      fontSize: AppTheme.typography.body.fontSize,
      lineHeight: AppTheme.typography.body.lineHeight,
      marginBottom: AppTheme.spacing.xxl,
    },

    input: {
      minHeight: 54,
      backgroundColor: AppTheme.colors.input,
      color: AppTheme.colors.text,
      borderWidth: 1,
      borderColor: AppTheme.colors.border,
      marginBottom: AppTheme.spacing.lg,
      paddingHorizontal: AppTheme.spacing.lg,
      borderRadius: AppTheme.radius.md,
    },

    button: {
      backgroundColor: AppTheme.colors.accent,
      minHeight: 54,
      justifyContent: "center",
      borderRadius: AppTheme.radius.md,
    },

    buttonDisabled: {
      opacity: 0.65,
    },

    text: {
      color: AppTheme.colors.background,
      textAlign:
        "center",
      fontWeight: "900",
    },
  });
