import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { FontAwesome6 } from "@expo/vector-icons";
import HeaderBar from "../components/HeaderBar";
import BottomNav from "../components/BottomNav";
import { getAllCommutes } from "../utils/api";
import { compareCommutesDesc } from "../utils/date";

/******************** Small helpers ********************/
const MODE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Walk", value: "walk" },
  { label: "Cycle", value: "cycle" },
  { label: "Bus", value: "bus" },
  { label: "MRT", value: "mrt" },
  { label: "Car", value: "car" },
  { label: "Mixed", value: "mixed" },
];

const MONTH_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Jan", value: "1" },
  { label: "Feb", value: "2" },
  { label: "Mar", value: "3" },
  { label: "Apr", value: "4" },
  { label: "May", value: "5" },
  { label: "Jun", value: "6" },
  { label: "Jul", value: "7" },
  { label: "Aug", value: "8" },
  { label: "Sep", value: "9" },
  { label: "Oct", value: "10" },
  { label: "Nov", value: "11" },
  { label: "Dec", value: "12" },
];

const MODE_META = {
  walk: { color: "#16A34A", bg: "#16A34A1A" },
  cycle: { color: "#059669", bg: "#0596691A" },
  bus: { color: "#2563EB", bg: "#2563EB1A" },
  mrt: { color: "#1E7F5C", bg: "#1E7F5C1A" },
  car: { color: "#B42318", bg: "#B423181A" },
  mixed: { color: "#7C3AED", bg: "#7C3AED1A" },
  all: { color: "#111111", bg: "#11111110" },
};

function safeDateParts(startTime) {
  const s = String(startTime || "");
  const d = new Date(s.includes(" ") ? s.replace(" ", "T") : s);
  if (Number.isNaN(d.getTime())) {
    return { day: null, month: null, year: null };
  }

  return {
    day: d.getDate(),
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

function prettyTimeRange(startTime, endTime) {
  const s1 = String(startTime || "");
  const s2 = String(endTime || "");
  const d1 = new Date(s1.includes(" ") ? s1.replace(" ", "T") : s1);
  const d2 = new Date(s2.includes(" ") ? s2.replace(" ", "T") : s2);

  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return "--";

  const t1 = d1.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const t2 = d2.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${t1} - ${t2}`;
}
function formatPeriodFromStart(startTime) {
  const { day, month, year } = safeDateParts(startTime);
  if (!day || !month || !year) return "--";

  const m = new Date(year, month - 1).toLocaleString("en-SG", {
    month: "short",
  });
  return `${m} ${String(day).padStart(2, "0")} | ${year}`;
}

export default function CommutesListScreen({
  navigation,
  route,
  currentUser,
  setCurrentUser,
}) {
  const isLoggedIn = !!currentUser;
  const userId = currentUser?.id;

  const [commutes, setCommutes] = useState([]);
  const [filteredCommutes, setFilteredCommutes] = useState([]);

  const [filterMode, setFilterMode] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");

  const [searchText, setSearchText] = useState("");
  const [yearOptions, setYearOptions] = useState(["all"]);

  const highlightId = route?.params?.highlightId || null;

  async function loadCommutes() {
    if (!userId) {
      setCommutes([]);
      setYearOptions(["all"]);
      return;
    }

    const all = await getAllCommutes(userId);
    all.sort(compareCommutesDesc);
    setCommutes(all);

    const years = Array.from(
      new Set(
        all
          .map((c) => safeDateParts(c.startTime).year)
          .filter(Boolean)
          .map(String),
      ),
    ).sort((a, b) => Number(b) - Number(a));

    setYearOptions(["all", ...years]);
  }

  useEffect(() => {
    let out = commutes;

    if (filterMode !== "all") out = out.filter((c) => c.mode === filterMode);

    if (filterMonth !== "all") {
      out = out.filter(
        (c) => String(safeDateParts(c.startTime).month) === filterMonth,
      );
    }

    if (filterYear !== "all") {
      out = out.filter(
        (c) => String(safeDateParts(c.startTime).year) === filterYear,
      );
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      out = out.filter((c) => {
        const hay =
          `${c.mode} ${c.fromLabel} ${c.toLabel} ${c.purpose || ""} ${c.notes || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    setFilteredCommutes(out);
  }, [commutes, filterMode, filterMonth, filterYear, searchText]);

  useEffect(() => {
    if (!isLoggedIn) return;

    loadCommutes();
    const unsub = navigation.addListener("focus", loadCommutes);
    return unsub;
  }, [navigation, isLoggedIn, userId]);

  function renderItem({ item }) {
    const isHighlighted =
      highlightId && String(item.id) === String(highlightId);
    const meta = MODE_META[item.mode] || MODE_META.all;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={[styles.card, isHighlighted ? styles.cardHighlighted : null]}
        onPress={() => navigation.navigate("CommuteDetail", { id: item.id })}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.typePill, { backgroundColor: meta.bg }]}>
            <View style={[styles.typeDot, { backgroundColor: meta.color }]} />
            <Text style={[styles.typePillText, { color: meta.color }]}>
              {String(item.mode || "").toUpperCase()}
            </Text>
          </View>

          <Text style={styles.periodText}>
            {formatPeriodFromStart(item.startTime)}{" "}
          </Text>

          <Text style={styles.routeText} numberOfLines={1}>
            {`${item.fromLabel} → ${item.toLabel}`}
          </Text>

          <Text style={styles.usageText} numberOfLines={1}>
            {prettyTimeRange(item.startTime, item.endTime)}
          </Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.costBig}>{Number(item.durationMin)} min</Text>
          <Text style={styles.viewHint}>
            {item.distanceKm != null
              ? `${Number(item.distanceKm).toFixed(1)} km`
              : "--"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        navigation={navigation}
        title="History"
        rightIcon="circle-plus"
        onRightPress={() => navigation.navigate("AddCommute")}
      />
      {isLoggedIn ? (
        <>
          <View style={styles.controlsWrap}>
            <View style={styles.searchWrap}>
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search (e.g. mrt, school, Jan)…"
                placeholderTextColor="#9AA0A6"
                style={styles.searchInput}
                returnKeyType="search"
              />
              {searchText ? (
                <TouchableOpacity
                  onPress={() => setSearchText("")}
                  style={styles.clearBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.clearBtnText}>×</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Single line dropdown row */}
            <View style={styles.filtersRow}>
              <View style={[styles.filterGroup, styles.filterMode]}>
                <Text style={styles.filterLabel}>Mode</Text>
                <View style={styles.filterBox}>
                  <Picker
                    selectedValue={filterMode}
                    onValueChange={setFilterMode}
                    mode="dropdown"
                    style={styles.pickerCompact}
                    dropdownIconColor="#6B7280"
                  >
                    {MODE_OPTIONS.map((m) => (
                      <Picker.Item
                        key={m.value}
                        label={m.label}
                        value={m.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Month</Text>
                <View style={styles.filterBox}>
                  <Picker
                    selectedValue={filterMonth}
                    onValueChange={setFilterMonth}
                    mode="dropdown"
                    style={styles.pickerCompact}
                    dropdownIconColor="#6B7280"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <Picker.Item
                        key={m.value}
                        label={m.label}
                        value={m.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={[styles.filterGroup, styles.filterYear]}>
                <Text style={styles.filterLabel}>Year</Text>
                <View style={styles.filterBox}>
                  <Picker
                    selectedValue={filterYear}
                    onValueChange={setFilterYear}
                    mode="dropdown"
                    style={styles.pickerCompact}
                    dropdownIconColor="#6B7280"
                  >
                    <Picker.Item label="All" value="all" />
                    {yearOptions
                      .filter((y) => y !== "all")
                      .map((y) => (
                        <Picker.Item key={y} label={y} value={y} />
                      ))}
                  </Picker>
                </View>
              </View>
            </View>

            <Text style={styles.resultsText}>
              Showing{" "}
              <Text style={styles.resultsTextStrong}>
                {filteredCommutes.length}
              </Text>{" "}
              {filteredCommutes.length === 1 ? "commute" : "commutes"}
            </Text>
          </View>

          <FlatList
            data={filteredCommutes}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            initialNumToRender={10}
            windowSize={7}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            contentContainerStyle={styles.listContent}
          />
        </>
      ) : (
        <View style={styles.screen}>
          <View style={styles.loggedOutBox}>
            <FontAwesome6 name="lock" size={18} color="#64748B" />
            <Text style={styles.loggedOutTitle}>
              Sign in to view your commute history
            </Text>
            <Text style={styles.loggedOutSub}>
              Your trips are saved per account so you can search, filter, and
              review them later.
            </Text>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <BottomNav navigation={navigation} active={route.name} />
    </View>
  );
}

/******************** Stylesheet ********************/
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },

  controlsWrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },

  searchWrap: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111",
    paddingVertical: 0,
  },
  clearBtn: { paddingLeft: 10 },
  clearBtnText: {
    fontSize: 22,
    lineHeight: 22,
    color: "#9AA0A6",
    fontWeight: "800",
  },

  /* Filters: one row */
  filtersRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    alignItems: "flex-end",
  },

  filterGroup: {
    flex: 1,
  },

  filterMode: { flex: 1.2 },
  filterYear: { flex: 1.1 },

  filterLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 6,
  },

  filterBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    overflow: "hidden",
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 2,
  },

  pickerCompact: {
    height: 50,
    width: "100%",
    color: "#111",
  },

  resultsText: { marginTop: 10, fontSize: 12, color: "#666" },
  resultsTextStrong: { color: "#111", fontWeight: "900" },

  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 18 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDEDED",
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHighlighted: { borderColor: "#1E7F5C", backgroundColor: "#F2F7FF" },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { alignItems: "flex-end", minWidth: 90 },

  typePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },
  typeDot: { width: 8, height: 8, borderRadius: 99 },
  typePillText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.2 },

  periodText: { fontSize: 14, fontWeight: "900", color: "#111" },
  routeText: { fontSize: 12, color: "#111", marginTop: 4, fontWeight: "800" },
  usageText: { fontSize: 12, color: "#666", marginTop: 4 },

  costBig: { fontSize: 16, fontWeight: "900", color: "#1E7F5C" },
  viewHint: { marginTop: 4, fontSize: 12, color: "#9AA0A6", fontWeight: "800" },

  loggedOutBox: {
    marginHorizontal: 14,
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
});
