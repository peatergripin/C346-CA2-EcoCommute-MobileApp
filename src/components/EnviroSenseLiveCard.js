import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

export default function EnviroSenseLiveCard({ preferredRegion = "central" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tempC, setTempC] = useState(null);
  const [rainMaxMm, setRainMaxMm] = useState(null);
  const [psiValue, setPsiValue] = useState(null);
  const [uvValue, setUvValue] = useState(null);

  const [lastUpdated, setLastUpdated] = useState("");

  const averageFromStationData = (stationDataArray) => {
    // stationDataArray = [{stationId, value}, ...]
    let sum = 0;
    let count = 0;

    for (let x of stationDataArray) {
      if (typeof x?.value === "number") {
        sum += x.value;
        count += 1;
      }
    }

    return count > 0 ? sum / count : null;
  };

  const maxFromStationData = (stationDataArray) => {
    let max = null;

    for (let x of stationDataArray) {
      if (typeof x?.value === "number") {
        if (max === null || x.value > max) max = x.value;
      }
    }

    return max; // can be 0, which is valid (means no rain)
  };

  const pickLatestTimestampMs = (isoList) => {
    let best = null;
    for (let iso of isoList) {
      if (typeof iso === "string") {
        const ms = new Date(iso).getTime();
        if (!Number.isNaN(ms)) {
          if (best === null || ms > best) best = ms;
        }
      }
    }
    return best;
  };

  const loadLive = async () => {
    setLoading(true);
    setError("");

    try {
      let tempTs = null;
      let rainTs = null;
      let psiTs = null;
      let uvTs = null;

      // ---------------- 1) AIR TEMPERATURE (data.readings[0].data) ----------------
      const tempRes = await fetch(
        "https://api-open.data.gov.sg/v2/real-time/api/air-temperature",
      );
      const tempJson = await tempRes.json();

      const tempReading0 = tempJson?.data?.readings?.[0];
      const tempStationData = tempReading0?.data || []; // [{stationId, value}, ...]
      tempTs = tempReading0?.timestamp || null;

      setTempC(averageFromStationData(tempStationData));

      // ---------------- 2) RAINFALL ( data.readings[0].data) ----------------
      const rainRes = await fetch(
        "https://api-open.data.gov.sg/v2/real-time/api/rainfall",
      );
      const rainJson = await rainRes.json();

      const rainReading0 = rainJson?.data?.readings?.[0];
      const rainStationData = rainReading0?.data || []; // [{stationId, value}, ...]
      rainTs = rainReading0?.timestamp || null;

      setRainMaxMm(maxFromStationData(rainStationData));

      // ---------------- 3) PSI (data.items[0].readings.psi_twenty_four_hourly) ----------------
      const psiRes = await fetch(
        "https://api-open.data.gov.sg/v2/real-time/api/psi",
      );
      const psiJson = await psiRes.json();

      const psiItem0 = psiJson?.data?.items?.[0] || null;
      psiTs = psiItem0?.updatedTimestamp || psiItem0?.timestamp || null;

      const psiObj = psiItem0?.readings?.psi_twenty_four_hourly || null;

      if (psiObj && typeof psiObj === "object") {
        const preferred = psiObj[preferredRegion.toLowerCase()];
        if (typeof preferred === "number") {
          setPsiValue(preferred);
        } else {
          // fallback: take first numeric value
          let found = null;
          for (let key in psiObj) {
            if (typeof psiObj[key] === "number") {
              found = psiObj[key];
              break;
            }
          }
          setPsiValue(found);
        }
      } else {
        setPsiValue(null);
      }

      // ---------------- 4) UV ----------------
      const uvRes = await fetch(
        "https://api-open.data.gov.sg/v2/real-time/api/uv",
      );
      const uvJson = await uvRes.json();

      const uvRecord0 = uvJson?.data?.records?.[0] || null;
      uvTs = uvRecord0?.updatedTimestamp || uvRecord0?.timestamp || null;

      const uvIndexArr = uvRecord0?.index || []; // [{hour, value}, ...]
      const uvFirst = uvIndexArr?.[0]?.value;
      setUvValue(typeof uvFirst === "number" ? uvFirst : null);

      // ----------------5) Updated time  ----------------
      const latestMs = pickLatestTimestampMs([tempTs, rainTs, psiTs, uvTs]);
      const dateObj = latestMs !== null ? new Date(latestMs) : new Date();

      setLastUpdated(
        dateObj.toLocaleString("en-SG", { timeZone: "Asia/Singapore" }),
      );
    } catch (e) {
      setError("Failed to load live data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLive();
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Live Environment</Text>
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.muted}> Loading…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, styles.cardError]}>
        <Text style={styles.title}>Live Environment</Text>
        <Text style={styles.errorText}>{error}</Text>

        <TouchableOpacity style={styles.btn} onPress={loadLive}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tempDisplay = tempC !== null ? `${tempC.toFixed(1)} °C` : "No readings";

  let rainDisplay = "No readings";
  if (rainMaxMm !== null) {
    rainDisplay =
      rainMaxMm === 0 ? "Not raining" : `${rainMaxMm.toFixed(1)} mm`;
  }

  const psiDisplay = psiValue !== null ? psiValue : "No readings";
  const uvDisplay = uvValue !== null ? uvValue : "No readings";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Live Environment</Text>

      <View style={styles.block}>
        <Text style={styles.label}>Temperature (avg)</Text>
        <Text style={styles.value}>{tempDisplay}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Rainfall (max)</Text>
        <Text style={styles.value}>{rainDisplay}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>PSI (24h) - {preferredRegion}</Text>
        <Text style={styles.value}>{psiDisplay}</Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>UV Index</Text>
        <Text style={styles.value}>{uvDisplay}</Text>
      </View>

      <Text style={styles.footer}>Updated (SG): {lastUpdated}</Text>

      <TouchableOpacity style={styles.btnSmall} onPress={loadLive}>
        <Text style={styles.btnSmallText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8EF",
    marginVertical: 10,
  },
  cardError: {
    borderColor: "#F1C0C0",
    backgroundColor: "#FFF7F7",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  row: { flexDirection: "row", alignItems: "center" },
  muted: { color: "#6B7280" },

  block: { marginTop: 8 },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  value: { fontSize: 15, fontWeight: "600", color: "#111827" },
  footer: { marginTop: 12, fontSize: 11, color: "#6B7280" },

  errorText: { color: "#B42318", marginBottom: 10 },

  btn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },

  btnSmall: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  btnSmallText: { fontSize: 12, fontWeight: "700", color: "#111827" },
});
