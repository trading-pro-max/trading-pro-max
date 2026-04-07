import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <View style={{ padding: 20, backgroundColor: "#0b1220" }}>
        <Text style={{ color: "white", fontSize: 28, fontWeight: "700" }}>TPM Private Mobile</Text>
        <Text style={{ color: "#94a3b8", marginTop: 8 }}>Private operator mobile control app</Text>
      </View>
      <WebView source={{ uri: "http://localhost:3000/control" }} style={{ flex: 1 }} />
    </SafeAreaView>
  );
}
