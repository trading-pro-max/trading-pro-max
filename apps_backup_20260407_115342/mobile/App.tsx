import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const cards = [
  ["Backend Core", "API, auth starter, storage, modular routes"],
  ["Market/Data", "Snapshots, replay models, ingestion contracts"],
  ["Engine", "Scoring and execution rules"],
  ["Studio", "Backtest and strategy research starter"],
  ["Ops", "Metrics, incidents, operational reporting"],
  ["Cloud", "Workspace sync and environments"],
  ["Integrations", "Broker and notification connectors"],
  ["Mobile", "Alerts and quick control surface"],
  ["Production", "Launch checklist and hardening docs"]
];

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Trading Pro Max Mobile</Text>
        <Text style={styles.subtitle}>Unified 9 operations monitoring starter</Text>
        {cards.map(([title, text]) => (
          <View key={title} style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardText}>{text}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#08111f" },
  container: { padding: 20, gap: 12 },
  title: { color: "#eef4ff", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "#91a8cf", marginBottom: 12 },
  card: {
    backgroundColor: "#101d31",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  cardTitle: { color: "#eef4ff", fontWeight: "700", marginBottom: 8 },
  cardText: { color: "#91a8cf" }
});
