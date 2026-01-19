import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Spacing } from "@/design-system";
import { Button } from "@/design-system/atoms/button";
import { DeviceRow } from "@/design-system/molecules/device-row";
import { Section } from "@/design-system/molecules/section";
import type { DeviceInfo } from "@/hooks/DeviceStorage";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  device: DeviceInfo;
  isConnected: boolean;
  onConnect: (deviceId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onForget: () => Promise<void>;
};

export function SavedDeviceSection({
  device,
  isConnected,
  onConnect,
  onDisconnect,
  onForget,
}: Props) {
  const colors = useThemeColor();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isForgetting, setIsForgetting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect(device.id);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleForget = async () => {
    setIsForgetting(true);
    try {
      await onForget();
    } finally {
      setIsForgetting(false);
    }
  };

  const subtitle = `${device.id}${isConnected ? " • Connecté" : ""}`;

  return (
    <Section title="Module enregistré">
      <DeviceRow
        icon={isConnected ? "bluetooth-connected" : "bookmark"}
        name={device.name}
        subtitle={subtitle}
      >
        {isConnected ? (
          <Button
            variant="secondary"
            onPress={handleDisconnect}
            loading={isDisconnecting}
          >
            Déconnecter
          </Button>
        ) : isConnecting ? (
          <ActivityIndicator size="small" color={colors.text.primary} />
        ) : (
          <View style={{ flexDirection: "row", gap: Spacing.s }}>
            <Button
              onPress={handleConnect}
              disabled={isConnecting || isForgetting}
            >
              Connecter
            </Button>
            <Button
              variant="secondary"
              onPress={handleForget}
              loading={isForgetting}
              disabled={isConnecting || isForgetting}
            >
              Oublier
            </Button>
          </View>
        )}
      </DeviceRow>
    </Section>
  );
}
