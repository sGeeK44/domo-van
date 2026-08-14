import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { useStyles } from "@/design-system/theme/use-styles";
import {
  BorderRadius,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

const VISIBLE_MS = 2200;

/** Clears the tab bar; a screen-height offset has no token. */
const BOTTOM_INSET = 100;

export type Toast = {
  /** Takes the translated message: the design system never calls `t()`. */
  show: (message: string) => void;
};

const ToastContext = createContext<Toast | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), VISIBLE_MS);
  }, []);

  const toast = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {message !== null && <ToastSlot message={message} />}
    </ToastContext.Provider>
  );
}

export function useToast(): Toast {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return toast;
}

function ToastSlot({ message }: { message: string }) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.slot} pointerEvents="none" testID="toast">
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    slot: {
      position: "absolute",
      left: Spacing.gutter,
      right: Spacing.gutter,
      bottom: BOTTOM_INSET,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.gutter,
      borderRadius: BorderRadius.m,
      backgroundColor: colors.inverse,
    },
    message: {
      ...TextStyles.toast,
      color: colors.onInverse,
      textAlign: "center",
    },
  });
