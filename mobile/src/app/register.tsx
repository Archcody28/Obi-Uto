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
  registerUser,
} from "../api/authApi";

import {
  useAuthStore,
} from "../store/authStore";
import { AppTheme } from "../constants/theme";

export default function RegisterScreen() {
  const setToken =
    useAuthStore(
      (state) => state.setToken
    );

  const setUser =
    useAuthStore(
      (state) => state.setUser
    );

  const [name, setName] =
    useState("");

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

    const handleRegister =
    async () => {
      try {
        setLoading(true);

        // Register returns token + user; establish the session directly with
        // a single request so the strict auth rate limiter (10/15min) is not
        // consumed twice on the physical device.
        const response = await registerUser(
          name,
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
          "Registration Failed",
          err?.response?.data
            ?.message ||
          "Unable to create account"
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
        Create your account.
      </Text>
      <Text style={styles.subtitle}>
        Join the cinematic library to continue watching, manage your wallet, and stream live experiences from one account.
      </Text>

      <TextInput
        placeholder="Name"
        placeholderTextColor={
          AppTheme.colors.textSubtle
        }
        style={
          styles.input
        }
        value={name}
        onChangeText={
          setName
        }
        autoCapitalize="words"
      />

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
          handleRegister
        }
        disabled={loading}
      >
        <Text
          style={
            styles.text
          }
        >
          {loading
            ? "Creating..."
            : "Create Account"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={
          styles.linkButton
        }
        onPress={() =>
          router.replace("/")
        }
      >
        <Text
          style={
            styles.linkText
          }
        >
          Already have an account? Login
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

    linkButton: {
      marginTop: AppTheme.spacing.lg,
      alignItems: "center",
    },

    linkText: {
      color: AppTheme.colors.textSubtle,
      fontSize: AppTheme.typography.body.fontSize,
    },
  });