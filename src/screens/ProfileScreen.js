/********************** imports *************************/
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome6 } from "@expo/vector-icons";

import ProfileScreenTopBar from "../components/ProfileScreenTopBar";
import BottomNav from "../components/BottomNav";

import { updateUserById, uploadAvatar } from "../utils/api";

/********************** component *************************/
export default function ProfileScreen({
  navigation,
  route,
  currentUser,
  setCurrentUser,
}) {
  const isLoggedIn = !!currentUser;

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  /*************************************************************
   * Load user data
   *************************************************************/
  useEffect(() => {
    const user = currentUser;

    if (user) {
      setUsername(user.username || "");
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setPassword(user.password || "");
      setAvatar(user.avatar || null);
    } else {
      setUsername("");
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setAvatar(null);
    }
  }, [currentUser]);

  /*************************************************************
   * Save changes
   *************************************************************/
  const onSave = async () => {
    try {
      const userId = currentUser?.id;
      if (!userId) {
        Alert.alert("Sign in required", "Please sign in to edit your profile.");
        navigation.navigate("Login");
        return;
      }

      setSaving(true);

      const payload = {
        username,
        name,
        email,
        password,
        phone,
      };

      await updateUserById(userId, payload);

      const next = {
        ...(currentUser || {}),
        ...payload,
        avatar,
      };

      await AsyncStorage.setItem("userData", JSON.stringify(next));
      setCurrentUser(next);

      Alert.alert("Saved", "Your profile has been updated.");
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  /*************************************************************
   * Pick + upload avatar
   *************************************************************/
  const onPickAvatar = async () => {
    try {
      const userId = currentUser?.id;
      if (!userId) {
        Alert.alert(
          "Sign in required",
          "Please sign in to change your avatar.",
        );
        navigation.navigate("Login");
        return;
      }

      setUploading(true);

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow photo access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;

      const asset =
        result.assets && result.assets.length > 0 ? result.assets[0] : null;
      if (!asset?.uri) return;

      const resp = await uploadAvatar(userId, asset);
      const newAvatar = resp?.avatarUrl || null;

      setAvatar(newAvatar);

      const next = {
        ...(currentUser || {}),
        avatar: newAvatar,
      };

      await AsyncStorage.setItem("userData", JSON.stringify(next));
      setCurrentUser(next);

      Alert.alert("Updated", "Profile picture updated.");
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Avatar upload failed.");
    } finally {
      setUploading(false);
    }
  };

  /*************************************************************
   * Logout
   *************************************************************/
  const handleLogout = async () => {
    await AsyncStorage.removeItem("userData");
    setCurrentUser(null);

    Alert.alert("Logged Out", "You have been logged out.");
    navigation.navigate("Home");
  };

  return (
    <View style={styles.safe}>
      <ScrollView>
        <ProfileScreenTopBar
          navigation={navigation}
          name={isLoggedIn ? name : "Guest"}
          email={isLoggedIn ? email : "Sign in to view your profile"}
          avatarUrl={isLoggedIn ? avatar : null}
          onPressAvatar={
            isLoggedIn ? onPickAvatar : () => navigation.navigate("Login")
          }
        />

        <View style={styles.container}>
          {isLoggedIn ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="username"
                  placeholderTextColor="#777"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full Name"
                  placeholderTextColor="#777"
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#777"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone"
                  placeholderTextColor="#777"
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#777"
                  secureTextEntry
                />

                {uploading ? (
                  <View style={styles.uploadRow}>
                    <ActivityIndicator />
                    <Text style={styles.uploadText}>Uploading avatar...</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving ? styles.btnDisabled : null]}
                onPress={onSave}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.loggedOutBox}>
              <FontAwesome6 name="lock" size={18} color="#64748B" />
              <Text style={styles.loggedOutTitle}>
                Sign in to view your profile
              </Text>
              <Text style={styles.loggedOutSub}>
                Your profile, commutes and analytics are tied to your account.
              </Text>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={styles.loginBtnText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerBtn}
                onPress={() => navigation.navigate("Register")}
              >
                <Text style={styles.registerBtnText}>Create account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNav navigation={navigation} active={route.name} />
    </View>
  );
}

/********************** Stylesheet *************************/
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  container: { paddingHorizontal: 16, paddingBottom: 28 },

  section: {
    borderWidth: 1,
    borderColor: "#e7e7e7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fafafa",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 6,
    color: "#333",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#111",
  },

  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  uploadText: { color: "#64748B", fontWeight: "700" },

  saveBtn: {
    marginTop: 6,
    backgroundColor: "#1E7F5C",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.7 },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  logoutBtn: {
    marginTop: 10,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "white", fontSize: 14, fontWeight: "800" },

  loggedOutBox: {
    marginTop: 12,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 8,
  },
  loggedOutTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
  },
  loggedOutSub: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  loginBtn: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1E7F5C",
  },
  loginBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },

  registerBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111",
  },
  registerBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
});
