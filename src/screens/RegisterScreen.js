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

export default function RegisterScreen({
  navigation,
  route,
  currentUser,
  setCurrentUser,
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const handleRegister = async () => {
    if (!name || !username || !email || !pw || !pw2) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    if (pw !== pw2) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    const emailExists = users.find((u) => u.email === email);
    if (emailExists) {
      Alert.alert("Email Taken", "This email is already registered.");
      return;
    }

    const usernameExists = users.find((u) => u.username === username);
    if (usernameExists) {
      Alert.alert("Username Taken", "Please choose another username.");
      return;
    }

    const newUser = {
      id: Date.now(),
      name: name.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: pw,
    };

    users.push(newUser);

    await AsyncStorage.setItem("userData", JSON.stringify(newUser));
    setCurrentUser(newUser);

    Alert.alert("Registered!", `Welcome ${name}`);
    navigation.goBack();
  };

  return (
    <SafeAreaView contentContainerStyle={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backArrow}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome6 name="circle-arrow-left" color="white" size={20} />
          </TouchableOpacity>

          <View style={{ flexDirection: "column", alignItems: "center" }}>
            <Text style={styles.title}>Register</Text>
            <Text style={styles.subtitle}>Create your MediCart account</Text>
          </View>

          <View style={{ marginHorizontal: 20 }}></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Irfan"
          />

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. irfanimr"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="example@gmail.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 91234567"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={pw}
            onChangeText={setPw}
            placeholder="••••••••"
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={pw2}
            onChangeText={setPw2}
            placeholder="••••••••"
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister}>
            <Text style={styles.btnPrimaryText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.link}>Already have an account? Log In</Text>
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
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  optionText: {
    fontSize: 15,
    color: "#333",
  },
});
