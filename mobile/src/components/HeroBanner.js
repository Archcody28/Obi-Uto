import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
} from "react-native";

export default function HeroBanner() {
  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
      }}
      style={styles.banner}
    >
      <View style={styles.overlay}>
        <Text style={styles.title}>
          Featured Movie
        </Text>

        <Text style={styles.subtitle}>
          Stream now in ultra HD
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 250,
    justifyContent: "flex-end",
  },

  overlay: {
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },

  subtitle: {
    color: "#ddd",
    marginTop: 5,
  },
});