import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { SafeAreaView } from "react-native-safe-area-context";

import { login } from "../utils/api";

export default function LoginScreen({
  navigation,
  route,
  currentUser,
  setCurrentUser,
}) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const handleLogin = async () => {
    const emailTrimmed = email.trim();

    if (!emailTrimmed || !pw) {
      Alert.alert("Missing Fields", "Please enter email and password.");
      return;
    }

    try {
      const foundUser = await login(emailTrimmed, pw);

      if (!foundUser) {
        Alert.alert("Login Failed", "Invalid email or password.");
        return;
      }

      await AsyncStorage.setItem("userData", JSON.stringify(foundUser));
      setCurrentUser(foundUser);

      Alert.alert("Welcome!", `Logged in as ${foundUser.name}`);
    } catch (err) {
      Alert.alert("Error", "Could not login. Check server is running.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome6 name="circle-arrow-left" color="white" size={20} />
          </TouchableOpacity>

          <View style={{ flexDirection: "column", alignItems: "center" }}>
            <Text style={styles.title}>Log In</Text>
            <Text style={styles.subtitle}>Access your EcoCommute account</Text>
          </View>

          <View style={{ marginHorizontal: 20 }}></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={pw}
            onChangeText={setPw}
            placeholder="••••••••"
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
            <Text style={styles.btnPrimaryText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={styles.link}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40, backgroundColor: "#f5f6fa" },
  header: {
    backgroundColor: "#1E7F5C",
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: { fontSize: 24, color: "white", fontWeight: "bold" },
  subtitle: { color: "white", opacity: 0.9 },
  card: {
    backgroundColor: "white",
    padding: 20,
    margin: 12,
    borderRadius: 10,
    elevation: 3,
  },
  backArrow: { marginLeft: 20 },
  label: { marginTop: 10, fontWeight: "bold", color: "#1E7F5C" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
  },
  btnPrimary: {
    backgroundColor: "#1E7F5C",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  btnPrimaryText: { color: "white", fontWeight: "bold" },
  link: {
    marginTop: 15,
    textAlign: "center",
    color: "#1E7F5C",
    fontWeight: "bold",
  },
});
