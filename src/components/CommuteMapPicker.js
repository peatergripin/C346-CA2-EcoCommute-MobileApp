import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";

/******************** Map Functions ********************/
// This is made using harversine formula
function distanceKm(a, b) {
  if (!a || !b) return null;

  const R = 6371; // km
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);

  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toCoord(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { latitude: lat, longitude: lng };
}

/******************** Component ********************/
/**
 * Props:
 * - startLat, startLng, endLat, endLng, distanceKm
 * - onChange(next): { startLat, startLng, endLat, endLng, distanceKm }
 */
export default function CommuteMapPicker({
  startLat,
  startLng,
  endLat,
  endLng,
  distanceKm: distanceKmProp,
  onChange,
}) {
  const startCoord = toCoord(startLat, startLng);
  const endCoord = toCoord(endLat, endLng);

  const [pickTarget, setPickTarget] = useState("start"); // "start" | "end"

  // Default view: Singapore (Coordinates obtained online)
  const [region, setRegion] = useState({
    latitude: startCoord?.latitude ?? 1.3521,
    longitude: startCoord?.longitude ?? 103.8198,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  });

  function emit(nextStart, nextEnd) {
    const km = distanceKm(nextStart, nextEnd);
    onChange?.({
      startLat: nextStart?.latitude ?? null,
      startLng: nextStart?.longitude ?? null,
      endLat: nextEnd?.latitude ?? null,
      endLng: nextEnd?.longitude ?? null,
      distanceKm: km == null ? null : Number(km.toFixed(2)),
    });
  }

  function onPressMap(e) {
    const c = e?.nativeEvent?.coordinate;
    if (!c) return;

    if (pickTarget === "start") {
      const nextStart = c;
      emit(nextStart, endCoord);
      setPickTarget("end");
      setRegion((r) => ({
        ...r,
        latitude: c.latitude,
        longitude: c.longitude,
      }));
      return;
    }

    const nextEnd = c;
    emit(startCoord, nextEnd);
    setRegion((r) => ({ ...r, latitude: c.latitude, longitude: c.longitude }));
  }

  function onClear() {
    onChange?.({
      startLat: null,
      startLng: null,
      endLat: null,
      endLng: null,
      distanceKm: null,
    });
    setPickTarget("start");
  }

  const kmText =
    typeof distanceKmProp === "number"
      ? `${distanceKmProp.toFixed(2)} km`
      : "--";
  useEffect(() => {
    if (!startCoord || !endCoord) return;

    const km = distanceKm(startCoord, endCoord);
    if (km === distanceKmProp) return;
    onChange?.({
      startLat: startCoord.latitude,
      startLng: startCoord.longitude,
      endLat: endCoord.latitude,
      endLng: endCoord.longitude,
      distanceKm: km == null ? null : Number(km.toFixed(2)),
    });
  }, [startLat, startLng, endLat, endLng]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Map (optional)</Text>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              pickTarget === "start" ? styles.segmentActive : null,
            ]}
            onPress={() => setPickTarget("start")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                pickTarget === "start" ? styles.segmentTextActive : null,
              ]}
            >
              Start
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              pickTarget === "end" ? styles.segmentActive : null,
            ]}
            onPress={() => setPickTarget("end")}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentText,
                pickTarget === "end" ? styles.segmentTextActive : null,
              ]}
            >
              End
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearBtn}
            onPress={onClear}
            activeOpacity={0.85}
          >
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.helperText}>
        Tap map to set {pickTarget === "start" ? "Start" : "End"} pin. Distance:{" "}
        <Text style={styles.helperStrong}>{kmText}</Text>
      </Text>

      <View style={styles.mapBox}>
        <MapView
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          onPress={onPressMap}
        >
          {startCoord ? <Marker coordinate={startCoord} title="Start" /> : null}
          {endCoord ? <Marker coordinate={endCoord} title="End" /> : null}
        </MapView>
      </View>
    </View>
  );
}

/******************** Styles ********************/
const styles = StyleSheet.create({
  wrap: { marginTop: 12 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: { fontSize: 13, fontWeight: "800", color: "#111" },

  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  segmentBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },
  segmentActive: { backgroundColor: "#1E7F5C", borderColor: "#1E7F5C" },
  segmentText: { fontSize: 12, fontWeight: "900", color: "#111" },
  segmentTextActive: { color: "#FFFFFF" },

  clearBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#111",
  },
  clearBtnText: { fontSize: 12, fontWeight: "900", color: "#FFF" },

  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  helperStrong: { color: "#111", fontWeight: "900" },

  mapBox: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#FFF",
  },
  map: {
    height: 220,
    width: "100%",
  },
});
