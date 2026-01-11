import { StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HomeScreen() {
  return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Hello World!</ThemedText>
        <ThemedText>This is the home screen of the app.</ThemedText>
      </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
