// react-native ships Flow source Vite cannot parse; react-native-web renders the same API to the DOM.

export type {
  OpaqueColorValue,
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native-web";
export {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native-web";
export { Modal } from "./modal";

type PlatformSpec<T> = { android?: T; native?: T; default?: T };

export const Platform = {
  OS: "android",
  Version: 31,
  select: <T>(spec: PlatformSpec<T>): T | undefined =>
    spec.android ?? spec.native ?? spec.default,
};

export const ToastAndroid = {
  SHORT: 0,
  LONG: 1,
  show: (_message: string, _duration: number) => {},
};

export const PermissionsAndroid = {
  PERMISSIONS: {
    BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
    BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
    ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
  },
  RESULTS: { GRANTED: "granted", DENIED: "denied" },
  request: async () => "granted",
  requestMultiple: async (permissions: string[]) =>
    Object.fromEntries(
      permissions.map((permission) => [permission, "granted"]),
    ),
};
