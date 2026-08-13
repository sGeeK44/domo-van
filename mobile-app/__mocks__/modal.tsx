import { type PropsWithChildren, useEffect } from "react";
import { View } from "react-native-web";

export type ModalProps = PropsWithChildren<{
  visible?: boolean;
  transparent?: boolean;
  animationType?: "none" | "slide" | "fade";
  onRequestClose?: () => void;
}>;

/** react-native-web arms Escape only after an animation jsdom never runs, so Escape stands in for Android's back gesture. */
export function Modal({
  visible = true,
  onRequestClose,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!visible) return;
    const requestClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") onRequestClose?.();
    };
    document.addEventListener("keyup", requestClose);
    return () => document.removeEventListener("keyup", requestClose);
  }, [visible, onRequestClose]);

  if (!visible) return null;

  return <View>{children}</View>;
}
