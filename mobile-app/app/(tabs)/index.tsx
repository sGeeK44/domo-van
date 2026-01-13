import { StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight } from "@/design-system";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function HomeScreen() {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World!</Text>
      <Text style={styles.subtitle}>This is the home screen of the app.</Text>
    </View>
  );
}

const getStyles = (colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: FontSize.xxxl,
      fontWeight: FontWeight.bold,
    },
    subtitle: {
      fontSize: FontSize.s,
    },
  });
