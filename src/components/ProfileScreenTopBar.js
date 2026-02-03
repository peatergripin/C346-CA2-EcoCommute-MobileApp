import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { BASE_URL } from "../utils/api";

function buildAvatarUri(avatarUrl) {
  if (!avatarUrl) return null;
  const s = String(avatarUrl);

  if (s.startsWith("http")) return s;
  if (s.startsWith("/")) return BASE_URL + s;

  return `${BASE_URL}/uploads/${s}`;
}

export default function ProfileScreenTopBar({
  navigation,
  name,
  email,
  avatarUrl,
  onPressAvatar,
}) {
  const avatarUri = buildAvatarUri(avatarUrl);
  const hasAvatar = !!avatarUri;

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={navigation.goBack}>
          <FontAwesome6 name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account</Text>
        </View>

        <View style={styles.iconButton} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <TouchableOpacity activeOpacity={0.85} onPress={onPressAvatar}>
          {hasAvatar ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <FontAwesome6 name="user" size={34} color="#64748B" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.name}>{name || "-"}</Text>
        <Text style={styles.email}>{email || "-"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#FAFAFA", paddingBottom: 8 },

  header: {
    backgroundColor: "#1E7F5C",
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 56,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerText: { alignItems: "center" },

  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  subtitle: { color: "#E0E7FF", fontSize: 13, marginTop: 2 },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarWrapper: { marginTop: -48, alignItems: "center", paddingBottom: 8 },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#D9D9D9",
  },

  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0A367A",
    marginTop: 10,
  },

  email: { fontSize: 13, color: "#64748B", marginTop: 2 },
});
