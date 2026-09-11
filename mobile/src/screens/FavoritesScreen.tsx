import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from "react-native";

import {
  useFavoritesStore,
} from "../store/favoritesStore";

import {
  getFavorites,
} from "../api/favoriteApi";

export default function FavoritesScreen() {
  // Zustand store favorites
  const storeFavorites = useFavoritesStore(
    (state) => state.favorites
  );

  // API favorites
  const [apiFavorites, setApiFavorites] = useState([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await getFavorites();
      setApiFavorites(data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Favorites
      </Text>

      {/* LOCAL (ZUSTAND) FAVORITES */}
      <Text style={styles.sectionTitle}>
        Local Favorites
      </Text>

      <FlatList
        data={storeFavorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              ❤️ {item.title}
            </Text>
          </View>
        )}
      />

      {/* API FAVORITES */}
      <Text style={styles.sectionTitle}>
        Server Favorites
      </Text>

      <FlatList
        data={apiFavorites}
        keyExtractor={(item) =>
  item._id?.toString()
}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              ❤️ {item.media?.title}
            </Text>
          </View>
        )}
      />
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
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },

  sectionTitle: {
    color: "#E84393",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#1A1A1A",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },

  name: {
    color: "#fff",
  },
});