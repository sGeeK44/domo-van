// The real package needs a native host view, so tests resolve it to this stub.
import type { PropsWithChildren } from "react";
import { View } from "react-native-web";

export function SafeAreaView({ children }: PropsWithChildren) {
  return <View>{children}</View>;
}

export const useSafeAreaInsets = () => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});
