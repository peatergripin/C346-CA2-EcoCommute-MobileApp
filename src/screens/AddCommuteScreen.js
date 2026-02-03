/******************** Imports ********************/
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { FontAwesome6 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import BottomNav from "../components/BottomNav";
import HeaderBar from "../components/HeaderBar";
import CommuteMapPicker from "../components/CommuteMapPicker";
import { addCommute, uploadCommuteImage } from "../utils/api";

/******************** Helpers ********************/
function toMySQLDateTimeLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function fmtDate(d) {
  return d.toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtTime(d) {
  return d.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setDatePart(base, picked) {
  const d = new Date(base);
  d.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return d;
}

function setTimePart(base, picked) {
  const d = new Date(base);
  d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return d;
}

function clampIntText(text) {
  return String(text).replace(/[^0-9]/g, "");
}

function minutesDiff(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/******************** Component ********************/
export default function AddCommuteScreen({
  navigation,
  route,
  currentUser,
  setCurrentUser,
}) {
  const isLoggedIn = !!currentUser;
  const userId = currentUser?.id;

  const now = new Date();
  const later = new Date(now.getTime() + 30 * 60000);

  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");

  // Google map
  // Google Places autocomplete
  const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

  const fromReqId = useRef(0);
  const toReqId = useRef(0);

  //***************************** */
  const [mode, setMode] = useState("mrt");

  // Date objects 
  const [startDt, setStartDt] = useState(now);
  const [endDt, setEndDt] = useState(later);

  const [durationText, setDurationText] = useState("30");
  const durationManualRef = useRef(false);

  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  // Commute image
  const [commuteImage, setCommuteImage] = useState(null);

  // Map fields
  const [startLat, setStartLat] = useState(null);
  const [startLng, setStartLng] = useState(null);
  const [endLat, setEndLat] = useState(null);
  const [endLng, setEndLng] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  // Picker UI state
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

  // Auto duration whenever start/end changes (unless user overrides)
  useEffect(() => {
    const mins = minutesDiff(startDt, endDt);

    // if user sets start after end, auto push end forward by 30 mins
    if (mins < 0) {
      const fixed = new Date(startDt.getTime() + 30 * 60000);
      setEndDt(fixed);
      if (!durationManualRef.current) setDurationText("30");
      return;
    }

    if (!durationManualRef.current) setDurationText(String(mins));
  }, [startDt, endDt]);

  function onAutoDuration() {
    durationManualRef.current = false;
    const mins = minutesDiff(startDt, endDt);
    if (mins < 0) {
      Alert.alert("Invalid time range", "End time must be after start time.");
      return;
    }
    setDurationText(String(mins));
  }

  async function onPickCommuteImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo access to pick an image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (result.canceled) return;

      const asset =
        result.assets && result.assets.length > 0 ? result.assets[0] : null;
      if (!asset || !asset.uri) return;

      setCommuteImage(asset);
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to pick image.");
    }
  }

  // Google Helper
  async function fetchPlaceAutocomplete({ input, apiKey }) {
    //prevent spam api
    if (!input || input.length < 2) return [];

    const res = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify({
          input,
          regionCode: "SG",
          includedPrimaryTypes: ["geocode"],
        }),
      },
    );

    if (!res.ok) return [];
    const json = await res.json();
    return json.suggestions || [];
  }
  async function fetchPlaceLatLng({ placeId, apiKey }) {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=location`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
        },
      },
    );

    if (!res.ok) return null;
    const json = await res.json();

    return {
      latitude: json.location.latitude,
      longitude: json.location.longitude,
    };
  }

  function pickStartDate(event, picked) {
    setShowStartDate(false);
    if (!picked) return;
    setStartDt(setDatePart(startDt, picked));
  }

  function pickStartTime(event, picked) {
    setShowStartTime(false);
    if (!picked) return;
    setStartDt(setTimePart(startDt, picked));
  }

  function pickEndDate(event, picked) {
    setShowEndDate(false);
    if (!picked) return;
    setEndDt(setDatePart(endDt, picked));
  }

  function pickEndTime(event, picked) {
    setShowEndTime(false);
    if (!picked) return;
    setEndDt(setTimePart(endDt, picked));
  }

  function onMapChange(next) {
    setStartLat(next.startLat);
    setStartLng(next.startLng);
    setEndLat(next.endLat);
    setEndLng(next.endLng);
    setDistanceKm(next.distanceKm);
  }

  async function onSave() {
    const dur = Number(durationText);

    if (!userId) {
      Alert.alert("Please sign in", "You must be signed in to save a commute.");
      return;
    }

    if (!fromLabel.trim()) {
      Alert.alert("Missing info", "Please enter a start location.");
      return;
    }
    if (!toLabel.trim()) {
      Alert.alert("Missing info", "Please enter a destination.");
      return;
    }

    const mins = minutesDiff(startDt, endDt);
    if (mins < 0) {
      Alert.alert("Invalid time range", "End time must be after start time.");
      return;
    }

    if (!Number.isFinite(dur) || dur < 0) {
      Alert.alert(
        "Invalid duration",
        "Duration must be a non-negative number.",
      );
      return;
    }

    // Convert Dates -> MySQL datetime strings
    const startTime = toMySQLDateTimeLocal(startDt);
    const endTime = toMySQLDateTimeLocal(endDt);

    const draft = {
      userId: String(userId),

      fromLabel: fromLabel.trim(),
      toLabel: toLabel.trim(),
      mode,
      startTime,
      endTime,
      durationMin: dur,
      purpose: purpose.trim(),
      notes: notes.trim(),
      startLat,
      startLng,
      endLat,
      endLng,
      distanceKm,
    };

    addCommute(draft)
      .then(async (res) => {
        const createdId = res?.id ?? res?.commuteId ?? res?.insertId ?? null;

        if (commuteImage && createdId) {
          try {
            await uploadCommuteImage(createdId, commuteImage, userId);
          } catch (e) {}
        }

        navigation.replace("CommuteList");
      })
      .catch((err) =>
        Alert.alert("Error", err?.message || "Failed to save commute."),
      );
  }

  return (
    <View style={styles.screen}>
      <HeaderBar navigation={navigation} title="Add Commute" />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoggedIn ? (
          <>
            <Text style={styles.hint}>From</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={fromLabel}
                onChangeText={async (text) => {
                  setFromLabel(text);
                  setStartLat(null);
                  setStartLng(null);

                  const req = ++fromReqId.current;
                  const results = await fetchPlaceAutocomplete({
                    input: text,
                    apiKey: GOOGLE_API_KEY,
                  });

                  if (req === fromReqId.current) {
                    setFromSuggestions(results);
                  }
                }}
                placeholder="e.g. Home, Bedok MRT"
              />
            </View>
            {fromSuggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                {fromSuggestions.map((s, idx) => {
                  const p = s.placePrediction;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionItem}
                      onPress={async () => {
                        const coords = await fetchPlaceLatLng({
                          placeId: p.placeId,
                          apiKey: GOOGLE_API_KEY,
                        });

                        setFromLabel(p.text.text);
                        setFromSuggestions([]);

                        if (coords) {
                          setStartLat(coords.latitude);
                          setStartLng(coords.longitude);
                        }
                      }}
                    >
                      <Text style={styles.suggestionText}>{p.text.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.hint}>To</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={toLabel}
                onChangeText={async (text) => {
                  setToLabel(text);
                  setEndLat(null);
                  setEndLng(null);

                  const req = ++toReqId.current;
                  const results = await fetchPlaceAutocomplete({
                    input: text,
                    apiKey: GOOGLE_API_KEY,
                  });

                  if (req === toReqId.current) {
                    setToSuggestions(results);
                  }
                }}
                placeholder="e.g. RP, Orchard"
                onFocus={() => setFromSuggestions([])}
              />
            </View>

            {toSuggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                {toSuggestions.map((s, idx) => {
                  const p = s.placePrediction;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionItem}
                      onPress={async () => {
                        const coords = await fetchPlaceLatLng({
                          placeId: p.placeId,
                          apiKey: GOOGLE_API_KEY,
                        });

                        setToLabel(p.text.text);
                        setToSuggestions([]);

                        if (coords) {
                          setEndLat(coords.latitude);
                          setEndLng(coords.longitude);
                        }
                      }}
                    >
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {p.text.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Map Picker */}
            <CommuteMapPicker
              startLat={startLat}
              startLng={startLng}
              endLat={endLat}
              endLng={endLng}
              distanceKm={distanceKm}
              onChange={onMapChange}
            />
            <Text style={styles.hint}>Mode</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={mode} onValueChange={setMode}>
                <Picker.Item label="MRT" value="mrt" />
                <Picker.Item label="Bus" value="bus" />
                <Picker.Item label="Walk" value="walk" />
                <Picker.Item label="Cycle" value="cycle" />
                <Picker.Item label="Car" value="car" />
                <Picker.Item label="Mixed" value="mixed" />
              </Picker>
            </View>

            {/* Date/Time Pickers */}
            <Text style={styles.hint}>Start</Text>
            <View style={styles.dtRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.dtBox, styles.flex]}
                onPress={() => setShowStartDate(true)}
              >
                <Text style={styles.dtLabel}>Date</Text>
                <Text style={styles.dtValue}>{fmtDate(startDt)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.dtBox, styles.flex]}
                onPress={() => setShowStartTime(true)}
              >
                <Text style={styles.dtLabel}>Time</Text>
                <Text style={styles.dtValue}>{fmtTime(startDt)}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>End</Text>
            <View style={styles.dtRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.dtBox, styles.flex]}
                onPress={() => setShowEndDate(true)}
              >
                <Text style={styles.dtLabel}>Date</Text>
                <Text style={styles.dtValue}>{fmtDate(endDt)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.dtBox, styles.flex]}
                onPress={() => setShowEndTime(true)}
              >
                <Text style={styles.dtLabel}>Time</Text>
                <Text style={styles.dtValue}>{fmtTime(endDt)}</Text>
              </TouchableOpacity>
            </View>

            {/* Duration */}
            <Text style={styles.hint}>Duration (minutes)</Text>
            <View style={styles.row}>
              <View style={[styles.inputWrap, styles.flex]}>
                <TextInput
                  style={styles.input}
                  value={durationText}
                  onChangeText={(t) => {
                    durationManualRef.current = true;
                    setDurationText(clampIntText(t));
                  }}
                  keyboardType="number-pad"
                  placeholder="e.g. 30"
                />
              </View>

              <TouchableOpacity
                style={styles.smallBtn}
                onPress={onAutoDuration}
              >
                <Text style={styles.smallBtnText}>Auto</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>Purpose (optional)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={purpose}
                onChangeText={setPurpose}
                placeholder="e.g. school, work, errand"
              />
            </View>

            <Text style={styles.hint}>Notes (optional)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.notes]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. crowded train, raining earlier"
                multiline
              />
            </View>

            <Text style={styles.hint}>Commute image (optional)</Text>
            <View style={styles.imageBox}>
              {commuteImage?.uri ? (
                <Image
                  source={{ uri: commuteImage.uri }}
                  style={styles.imagePreview}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <FontAwesome6 name="image" size={16} color="#64748B" />
                  <Text style={styles.imagePlaceholderText}>
                    No image selected
                  </Text>
                </View>
              )}

              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.imageBtn}
                  onPress={onPickCommuteImage}
                  activeOpacity={0.9}
                >
                  <FontAwesome6 name="images" size={14} color="#FFFFFF" />
                  <Text style={styles.imageBtnText}>Pick Image</Text>
                </TouchableOpacity>

                {commuteImage?.uri ? (
                  <TouchableOpacity
                    style={styles.imageRemoveBtn}
                    onPress={() => setCommuteImage(null)}
                    activeOpacity={0.9}
                  >
                    <FontAwesome6 name="xmark" size={14} color="#111" />
                    <Text style={styles.imageRemoveText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onSave}>
              <Text style={styles.primaryBtnText}>Save Commute</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              Start/End are selected with pickers - no manual date string
              needed.
            </Text>
          </>
        ) : (
          <View style={styles.loggedOutBox}>
            <FontAwesome6 name="lock" size={18} color="#64748B" />
            <Text style={styles.loggedOutTitle}>Sign in to add a commute</Text>
            <Text style={styles.loggedOutSub}>
              Commutes are saved to your account so you can track history and
              view analytics later.
            </Text>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* DateTimePicker renders */}
      {showStartDate && (
        <DateTimePicker value={startDt} mode="date" onChange={pickStartDate} />
      )}
      {showStartTime && (
        <DateTimePicker value={startDt} mode="time" onChange={pickStartTime} />
      )}
      {showEndDate && (
        <DateTimePicker value={endDt} mode="date" onChange={pickEndDate} />
      )}
      {showEndTime && (
        <DateTimePicker value={endDt} mode="time" onChange={pickEndTime} />
      )}

      <BottomNav navigation={navigation} active={route.name} />
    </View>
  );
}

/******************** Stylesheet ********************/
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 14, paddingBottom: 30 },

  hint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginTop: 12,
    marginBottom: 6,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  dtRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1 },

  pickerWrap: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    overflow: "hidden",
  },

  inputWrap: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  input: { fontSize: 16, color: "#111" },
  notes: { minHeight: 80, textAlignVertical: "top" },

  dtBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dtLabel: { fontSize: 11, fontWeight: "900", color: "#64748B" },
  dtValue: { marginTop: 4, fontSize: 15, fontWeight: "900", color: "#111" },

  smallBtn: {
    width: 86,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnText: { color: "#FFF", fontWeight: "900" },

  imageBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    padding: 12,
  },
  imagePreview: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  imagePlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },
  imageActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  imageBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  imageBtnText: { color: "#FFFFFF", fontWeight: "900" },
  imageRemoveBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  imageRemoveText: { color: "#111", fontWeight: "900" },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: "#1E7F5C",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  footerText: {
    marginTop: 12,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  loggedOutBox: {
    marginTop: 20,
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
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  suggestionBox: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    overflow: "hidden",
  },

  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  suggestionText: {
    fontSize: 14,
    color: "#111",
    fontWeight: "700",
  },
});
