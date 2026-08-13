// @expo/vector-icons ships untranspiled JSX, so tests resolve it to this stub.
import { Text } from "react-native-web";

type Props = { name: string; size?: number; color?: unknown; style?: unknown };

export default function MaterialIcons({ name }: Props) {
  return <Text>{name}</Text>;
}
