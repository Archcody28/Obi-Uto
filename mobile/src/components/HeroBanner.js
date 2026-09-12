import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { AppTheme } from "../constants/theme";

export default function HeroBanner({
  item,
}) {
  const imageUri =
    item?.banner ||
    item?.thumbnail;

  const openDetails = () => {
    if (!item?._id) {
      return;
    }

    router.push({
      pathname: "/details",
      params: {
        id: item._id,
      },
    });
  };

  return (
    <Pressable
      onPress={openDetails}
      accessibilityRole={
        item?._id
          ? "button"
          : undefined
      }
      accessibilityLabel={
        item?.title
          ? `Open ${item.title}`
          : "Featured content"
      }
      style={styles.pressable}
    >
      {imageUri ? (
        <ImageBackground
          source={{
            uri: imageUri,
          }}
          style={styles.banner}
          imageStyle={styles.image}
        >
          <View style={styles.scrim} />
          <View style={styles.overlay}>
            <Text style={styles.kicker}>
              Featured
            </Text>
            <Text
              style={styles.title}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {!!item.description && (
              <Text
                style={styles.subtitle}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
            {item?._id && (
              <View style={styles.ctaRow}>
                <View style={styles.playBtn}>
                  <Text style={styles.playGlyph}>▶</Text>
                  <Text style={styles.playLabel}>Play</Text>
                </View>
              </View>
            )}
          </View>
        </ImageBackground>
      ) : (
        <View
          style={[
            styles.banner,
            styles.fallback,
          ]}
        >
          <View style={styles.overlay}>
            <Text style={styles.kicker}>
              Obi-Uto
            </Text>
            <Text style={styles.title}>
              Your screen is ready
            </Text>
            <Text style={styles.subtitle}>
              Fresh recommendations will appear here when media is available.
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: AppTheme.spacing.lg,
    marginTop: AppTheme.spacing.sm,
    marginBottom: AppTheme.spacing.xl,
    borderRadius: AppTheme.radius.xl,
    overflow: "hidden",
    ...AppTheme.elevation.medium,
  },

  banner: {
    minHeight: 340,
    justifyContent: "flex-end",
    backgroundColor:
      AppTheme.colors.surface,
  },

  image: {
    borderRadius: AppTheme.radius.xl,
  },

  fallback: {
    borderWidth: 1,
    borderColor:
      AppTheme.colors.border,
  },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,8,10,0.55)",
  },

  overlay: {
    padding: AppTheme.spacing.xl,
    paddingBottom: AppTheme.spacing.xl,
    paddingTop: 70,
  },

  kicker: {
    color: AppTheme.colors.accent,
    fontSize: AppTheme.typography.kicker.fontSize,
    fontWeight: AppTheme.typography.kicker.fontWeight,
    letterSpacing: AppTheme.typography.kicker.letterSpacing,
    textTransform: "uppercase",
    marginBottom: AppTheme.spacing.sm,
  },

  title: {
    color: AppTheme.colors.text,
    fontSize: AppTheme.typography.display.fontSize,
    fontWeight: AppTheme.typography.display.fontWeight,
    lineHeight: AppTheme.typography.display.lineHeight,
  },

  subtitle: {
    color: AppTheme.colors.textMuted,
    marginTop: AppTheme.spacing.sm,
    fontSize: AppTheme.typography.body.fontSize,
    lineHeight: AppTheme.typography.body.lineHeight,
  },

  ctaRow: {
    marginTop: AppTheme.spacing.lg,
  },

  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: AppTheme.spacing.sm,
    backgroundColor: AppTheme.colors.accent,
    paddingHorizontal: AppTheme.spacing.xl,
    paddingVertical: AppTheme.spacing.md,
    borderRadius: AppTheme.radius.pill,
    ...AppTheme.elevation.low,
  },

  playGlyph: {
    color: AppTheme.colors.background,
    fontSize: 13,
    marginLeft: 2,
  },

  playLabel: {
    color: AppTheme.colors.background,
    fontSize: AppTheme.typography.label.fontSize,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});
