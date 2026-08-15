// The real package drives a native keyboard host no test environment has, so the
// provider is transparent and the aware list is a plain scroller.
import type { PropsWithChildren } from "react";
import { ScrollView, type ScrollViewProps } from "react-native-web";

export function KeyboardProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  bottomOffset?: number;
};

export function KeyboardAwareScrollView({
  bottomOffset: _bottomOffset,
  ...props
}: KeyboardAwareScrollViewProps) {
  return <ScrollView {...props} />;
}
