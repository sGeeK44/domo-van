import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ModuleSettingsStyles } from "@/app/_components/module-settings/styles";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import type { DeviceInfo } from "@/hooks/DeviceStorage";

type Props = {
  styles: ModuleSettingsStyles;
  device: DeviceInfo;
  isConnected: boolean;
  onConnect: (deviceId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onForget: () => Promise<void>;
};

export function SavedDeviceSection({
  styles,
  device,
  isConnected,
  onConnect,
  onDisconnect,
  onForget,
}: Props) {
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

  return (
    <>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Module enregistré</Text>
      </View>

      <View style={styles.listContent}>
        <View style={styles.deviceRow}>
          <IconSymbol
            name={isConnected ? "bluetooth-connected" : "bookmark"}
            size={20}
            color="#FFFFFF"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceId}>
              {device.id}
              {isConnected ? " • Connecté" : ""}
            </Text>
          </View>

          {isConnected ? (
            <Pressable
              onPress={handleDisconnect}
              style={styles.secondaryButton}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.secondaryButtonText}>Déconnecter</Text>
              )}
            </Pressable>
          ) : isConnecting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={handleConnect}
                style={styles.primaryButton}
                disabled={isConnecting || isForgetting}
              >
                <Text style={styles.primaryButtonText}>Connecter</Text>
              </Pressable>
              <Pressable
                onPress={handleForget}
                style={styles.secondaryButton}
                disabled={isConnecting || isForgetting}
              >
                {isForgetting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Oublier</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </>
  );
}
