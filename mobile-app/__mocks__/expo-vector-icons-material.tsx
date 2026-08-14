// @expo/vector-icons ships untranspiled JSX, so tests resolve it to this stub.
import { Text } from "react-native-web";

type Props = { name: string; size?: number; color?: string; style?: unknown };

// `color` is forwarded so an icon's ink stays assertable; the real icon paints its glyph with it.
export default function MaterialIcons({ name, color }: Props) {
  return <Text style={{ color }}>{name}</Text>;
}
