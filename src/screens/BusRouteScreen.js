/******************** Imports ********************/
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { FontAwesome6 } from "@expo/vector-icons";

import HeaderBar from "../components/HeaderBar";
import BottomNav from "../components/BottomNav";

/******************** Config ********************/
const LTA_BASE = "https://datamall2.mytransport.sg/ltaodataservice";

/******************** Helpers ********************/
async function ltaGet(path) {
  const key = process.env.EXPO_PUBLIC_LTA_ACCOUNT_KEY;

  const res = await fetch(`${LTA_BASE}${path}`, {
    method: "GET",
    headers: {
      AccountKey: key,
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

function hhmm(s) {
  const t = String(s || "").trim();
  if (t.length !== 4) return "--";
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
}

function fmtKm(n) {
  const x = Number(n);
  return Number.isFinite(x) ? `${x.toFixed(1)} km` : "--";
}

function normSvc(s) {
  return String(s || "")
    .trim()
    .toUpperCase();
}

/******************** Screen ********************/
export default function BusRoutesScreen({ navigation, route }) {
  const [serviceNo, setServiceNo] = useState("");
  const [direction, setDirection] = useState("1");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ---- Bus stop lookup (BusStopCode -> { name, road }) ----
  const stopsIndexRef = useRef(null);
  const [stopsIndex, setStopsIndex] = useState({});

  async function fetchAllBusStopsByPaging() {
    let skip = 0;
    let out = [];
    const MAX_PAGES = 80;

    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await ltaGet(`/BusStops?$skip=${skip}`);
      const items = Array.isArray(data?.value) ? data.value : [];
      out = out.concat(items);

      if (items.length < 500) break;
      skip += 500;
    }
    return out;
  }

  async function ensureBusStopsIndex() {
    if (stopsIndexRef.current) return stopsIndexRef.current;

    const allStops = await fetchAllBusStopsByPaging();
    const idx = {};

    for (const s of allStops) {
      const code = String(s.BusStopCode || "").trim();
      if (!code) continue;
      idx[code] = {
        name: s.Description || "",
        road: s.RoadName || "",
      };
    }

    stopsIndexRef.current = idx;
    setStopsIndex(idx);
    return idx;
  }

  async function fetchRouteByPaging(svc, dirNum) {
    const targetSvc = normSvc(svc);

    let skip = 0;
    let found = [];
    let foundOnce = false;
    let pagesAfterFoundNoMatch = 0;

    const MAX_PAGES = 80;

    for (let page = 0; page < MAX_PAGES; page++) {
      const data = await ltaGet(`/BusRoutes?$skip=${skip}`);
      const items = Array.isArray(data?.value) ? data.value : [];

      const matches = items.filter((r) => {
        return (
          normSvc(r.ServiceNo) === targetSvc && Number(r.Direction) === dirNum
        );
      });

      if (matches.length > 0) {
        foundOnce = true;
        pagesAfterFoundNoMatch = 0;
        found = found.concat(matches);
      } else if (foundOnce) {
        pagesAfterFoundNoMatch += 1;
        if (pagesAfterFoundNoMatch >= 2) break;
      }

      if (items.length < 500) break;
      skip += 500;
    }

    found.sort((a, b) => (a.StopSequence || 0) - (b.StopSequence || 0));
    const seen = new Set();
    const out = [];

    for (const r of found) {
      const key = `${r.ServiceNo}-${r.Direction}-${r.StopSequence}-${r.BusStopCode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }

    return out;
  }

  async function onSearch() {
    try {
      const svc = serviceNo.trim();
      if (!svc) {
        setErr("Please enter a bus service number.");
        return;
      }

      setErr("");
      setLoading(true);
      setRows([]);

      const dirNum = Number(direction);

      // Fetch route + (cached)
      const [list] = await Promise.all([
        fetchRouteByPaging(svc, dirNum),
        ensureBusStopsIndex(),
      ]);

      if (!list.length) {
        setErr(
          `No route found for service ${normSvc(svc)} (Direction ${dirNum}).`,
        );
      }

      setRows(list);
    } catch (e) {
      setErr(e.message || "Failed to fetch bus routes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar navigation={navigation} title="Bus Routes" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <FontAwesome6 name="route" size={16} color="#1E7F5C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Search a Bus Route</Text>
            <Text style={styles.heroSub}>
              Enter a service number and pick direction. This will list the
              stops in order.
            </Text>
          </View>
        </View>

        {/* Search Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Service No.</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={serviceNo}
              onChangeText={setServiceNo}
              placeholder="e.g. 16, 67, 970"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
            />
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Direction</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={direction}
              onValueChange={(v) => setDirection(String(v))}
            >
              <Picker.Item label="Direction 1" value="1" />
              <Picker.Item label="Direction 2" value="2" />
            </Picker>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (loading || !serviceNo.trim()) && styles.btnDisabled,
            ]}
            onPress={onSearch}
            disabled={loading || !serviceNo.trim()}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <FontAwesome6 name="magnifying-glass" size={14} color="#FFFFFF" />
            )}
            <Text style={styles.primaryBtnText}>
              {loading ? "Searching..." : "Search"}
            </Text>
          </TouchableOpacity>

          {!!err && (
            <View style={styles.errBox}>
              <FontAwesome6
                name="triangle-exclamation"
                size={14}
                color="#B42318"
              />
              <Text style={styles.errText}>{err}</Text>
            </View>
          )}
        </View>

        {/* Results */}
        <View style={styles.sectionTop}>
          <Text style={styles.sectionTitle}>
            Results {rows.length ? `(${rows.length} stops)` : ""}
          </Text>

          {rows.length ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {serviceNo.trim().toUpperCase()} • Dir {direction}
              </Text>
            </View>
          ) : null}
        </View>

        {!loading && !err && rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <FontAwesome6 name="bus" size={18} color="#64748B" />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySub}>
              Enter a service number and tap Search.
            </Text>
          </View>
        ) : null}

        {rows.map((r, idx) => {
          const code = String(r.BusStopCode || "").trim();
          const meta = stopsIndex[code];
          const stopName = meta?.name || "";
          const roadName = meta?.road || "";

          return (
            <View
              key={`${r.BusStopCode}-${r.StopSequence}-${idx}`}
              style={styles.routeCard}
            >
              <View style={styles.routeTop}>
                <View style={styles.seqBadge}>
                  <Text style={styles.seqText}>{r.StopSequence ?? "-"}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.stopTitle} numberOfLines={1}>
                    {stopName ? stopName : `Bus Stop ${code}`}
                  </Text>
                  <Text style={styles.stopSub} numberOfLines={1}>
                    {code}
                    {roadName ? ` • ${roadName}` : ""} • Distance:{" "}
                    {fmtKm(r.Distance)}
                  </Text>
                </View>

                <View style={styles.dirChip}>
                  <Text style={styles.dirChipText}>
                    Dir {r.Direction || "--"}
                  </Text>
                </View>
              </View>

              <View style={styles.timesRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Weekday</Text>
                  <Text style={styles.timeValue}>
                    {hhmm(r.WD_FirstBus)} - {hhmm(r.WD_LastBus)}
                  </Text>
                </View>

                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Sat</Text>
                  <Text style={styles.timeValue}>
                    {hhmm(r.SAT_FirstBus)} - {hhmm(r.SAT_LastBus)}
                  </Text>
                </View>

                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Sun</Text>
                  <Text style={styles.timeValue}>
                    {hhmm(r.SUN_FirstBus)} - {hhmm(r.SUN_LastBus)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 10 }} />
      </ScrollView>

      <BottomNav navigation={navigation} active={route.name} />
    </View>
  );
}

/******************** Styles ********************/
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  content: { padding: 14, paddingBottom: 30 },

  hero: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F2F7FF",
    borderWidth: 1,
    borderColor: "#D6E6FF",
    marginBottom: 12,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D6E6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 15, fontWeight: "900", color: "#111" },
  heroSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    lineHeight: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 18,
    padding: 14,
  },

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "#334155",
    marginBottom: 6,
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

  pickerWrap: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    overflow: "hidden",
  },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#1E7F5C",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },

  errBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  errText: { flex: 1, color: "#7F1D1D", fontWeight: "800", fontSize: 12 },

  sectionTop: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pillText: { fontSize: 12, fontWeight: "900", color: "#334155" },

  emptyCard: {
    marginTop: 10,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
  },
  emptySub: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },

  routeCard: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 18,
    padding: 14,
  },
  routeTop: { flexDirection: "row", alignItems: "center", gap: 10 },

  seqBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#D6E6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  seqText: { fontWeight: "900", color: "#1E3A8A" },

  stopTitle: { fontSize: 14, fontWeight: "900", color: "#111" },
  stopSub: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#64748B" },

  dirChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dirChipText: { fontSize: 12, fontWeight: "900", color: "#334155" },

  timesRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  timeBox: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  timeLabel: { fontSize: 11, fontWeight: "900", color: "#64748B" },
  timeValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "900",
    color: "#111",
  },
});
