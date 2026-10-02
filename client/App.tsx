import React, { JSX, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { QueueItem, nextQueued, queueReducer } from "./src/uploadQueue";
import { normalizeBaseUrl, uploadImage } from "./src/uploadService";

// Baked in at build time via EXPO_PUBLIC_* (see .env.example). Editable
// below at runtime too — useful on a real device, where "localhost"
// means the phone itself, not your dev machine.
const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// An unreachable address usually hangs rather than failing, so the
// connection test gives up on its own instead of sitting at "Checking…".
const CONNECTION_TEST_TIMEOUT_MS = 5000;

type ConnectionStatus = "idle" | "checking" | "ok" | "failed";

export default function App(): JSX.Element {
  return (
    <SafeAreaProvider>
      <LoopnoteApp />
    </SafeAreaProvider>
  );
}

function LoopnoteApp(): JSX.Element {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [connection, setConnection] = useState<ConnectionStatus>("idle");
  const [queue, dispatch] = useReducer(queueReducer, [] as QueueItem[]);

  // Uploads one queued item at a time. Sequential rather than parallel —
  // simpler to reason about progress-per-item, and this is a background
  // queue, not something the user is expected to wait on.
  useEffect(() => {
    if (queue.some((item) => item.status === "uploading")) return;
    const item = nextQueued(queue);
    if (!item) return;

    dispatch({ type: "START_UPLOAD", id: item.id });
    uploadImage(apiBaseUrl, item, {
      onProgress: (percent) => dispatch({ type: "PROGRESS", id: item.id, progress: percent }),
    })
      .then((result) => dispatch({ type: "SUCCESS", id: item.id, serverJobId: result.jobId }))
      .catch((err: Error) => dispatch({ type: "FAILURE", id: item.id, error: err.message }));
  }, [queue, apiBaseUrl]);

  async function testConnection(): Promise<void> {
    setConnection("checking");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONNECTION_TEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${normalizeBaseUrl(apiBaseUrl)}/health`, { signal: controller.signal });
      setConnection(res.ok ? "ok" : "failed");
    } catch {
      setConnection("failed");
    } finally {
      clearTimeout(timer);
    }
  }

  async function pickPhotos(): Promise<void> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo access needed", "Loopnote needs permission to your photos to import them.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled || result.assets.length === 0) return;

      dispatch({
        type: "ADD",
        items: result.assets.map((asset, index) => ({
          uri: asset.uri,
          filename: asset.fileName ?? `photo-${Date.now()}-${index}.jpg`,
          mimeType: asset.mimeType,
          file: asset.file,
        })),
      });
    } catch (err) {
      // The picker can reject (e.g. a photo that fails to load from
      // iCloud) — say so, rather than the button silently doing nothing.
      Alert.alert("Couldn't open your photos", err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* "dark", not "auto": the UI is light-only, and "auto" would put
          light status-bar text on this light background in dark mode. */}
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Image source={require("./assets/icon.png")} style={styles.logo} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Loopnote</Text>
          <Text style={styles.tagline}>Snap it. Forget it. We&apos;ll bring it back when it matters.</Text>
        </View>
      </View>

      <View style={styles.apiCard}>
        <Text style={styles.apiCardLabel}>Server address</Text>
        <Text style={styles.apiCardHint}>
          On a real phone, &quot;localhost&quot; means this phone — not your computer. Use your computer&apos;s LAN IP instead
          (e.g. http://192.168.1.23:4000).
        </Text>
        <View style={styles.apiRow}>
          <TextInput
            style={styles.apiInput}
            value={apiBaseUrl}
            onChangeText={(text) => {
              setApiBaseUrl(text);
              setConnection("idle");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.1.23:4000"
          />
          <Pressable style={styles.testButton} onPress={testConnection}>
            <Text style={styles.testButtonText}>Test</Text>
          </Pressable>
        </View>
        <ConnectionBadge status={connection} />
      </View>

      <PickPhotosButton onPress={pickPhotos} />

      {queue.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌀</Text>
          <Text style={styles.emptyTitle}>Nothing queued yet</Text>
          <Text style={styles.emptySubtitle}>Add a photo of a whiteboard, a notebook page, or a journal entry to get started.</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={queue}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AnimatedQueueRow item={item} onRetry={() => dispatch({ type: "RETRY", id: item.id })} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ConnectionBadge({ status }: { status: ConnectionStatus }): JSX.Element | null {
  if (status === "idle") return null;
  if (status === "checking") return <Text style={styles.connectionChecking}>Checking…</Text>;
  if (status === "ok") return <Text style={styles.connectionOk}>✓ Connected</Text>;
  return <Text style={styles.connectionFailed}>✗ Couldn&apos;t reach that address</Text>;
}

function PickPhotosButton({ onPress }: { onPress: () => void }): JSX.Element {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn(): void {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  }
  function pressOut(): void {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable style={styles.pickButton} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        <Text style={styles.pickButtonIcon}>📸</Text>
        <Text style={styles.pickButtonText}>Add photos</Text>
      </Pressable>
    </Animated.View>
  );
}

function AnimatedQueueRow({ item, onRetry }: { item: QueueItem; onRetry: () => void }): JSX.Element {
  const entrance = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(item.progress)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // Mount-only entrance animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: item.progress,
      duration: 200,
      useNativeDriver: false, // width isn't a transform, can't use the native driver
    }).start();
  }, [item.progress, progressAnim]);

  const progressWidth = useMemo(
    () => progressAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }),
    [progressAnim]
  );

  return (
    <Animated.View
      style={[
        styles.row,
        {
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      <View style={styles.rowInfo}>
        <Text style={styles.filename} numberOfLines={1}>
          {item.filename}
        </Text>
        {item.status === "uploading" && (
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>
        )}
        {item.status === "failed" && <Text style={styles.errorText}>{item.error ?? "Upload failed"}</Text>}
      </View>
      <StatusBadge item={item} onRetry={onRetry} />
    </Animated.View>
  );
}

function StatusBadge({ item, onRetry }: { item: QueueItem; onRetry: () => void }): JSX.Element {
  if (item.status === "queued") return <Text style={styles.badgeMuted}>Queued</Text>;
  if (item.status === "uploading") return <Text style={styles.badgeMuted}>Uploading…</Text>;
  if (item.status === "done") return <SuccessCheck />;
  return (
    <Pressable onPress={onRetry} style={styles.retryButton}>
      <Text style={styles.retryButtonText}>Retry</Text>
    </Pressable>
  );
}

function SuccessCheck(): JSX.Element {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  }, [scale]);

  return (
    <Animated.Text style={[styles.badgeSuccess, { transform: [{ scale }] }]}>✓ Done</Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f4", paddingHorizontal: 20, paddingTop: 12 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  logo: { width: 48, height: 48, borderRadius: 12, marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontWeight: "800", color: "#1c1917" },
  tagline: { fontSize: 12.5, color: "#78716c", marginTop: 2 },
  apiCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  apiCardLabel: { fontSize: 12, fontWeight: "700", color: "#57534e", marginBottom: 2 },
  apiCardHint: { fontSize: 11, color: "#a8a29e", marginBottom: 8, lineHeight: 15 },
  apiRow: { flexDirection: "row", gap: 8 },
  apiInput: {
    flex: 1,
    fontSize: 12,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#57534e",
  },
  testButton: {
    backgroundColor: "#eef2ff",
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  testButtonText: { color: "#4f46e5", fontWeight: "700", fontSize: 12 },
  connectionChecking: { fontSize: 11, color: "#a8a29e", marginTop: 6 },
  connectionOk: { fontSize: 11, color: "#15803d", fontWeight: "600", marginTop: 6 },
  connectionFailed: { fontSize: 11, color: "#b91c1c", fontWeight: "600", marginTop: 6 },
  pickButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#4f46e5",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pickButtonIcon: { fontSize: 18, marginRight: 8 },
  pickButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  empty: { alignItems: "center", marginTop: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#44403c", marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: "#a8a29e", textAlign: "center", lineHeight: 18 },
  list: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowInfo: { flex: 1, marginRight: 12 },
  filename: { fontSize: 14, color: "#1c1917", marginBottom: 6 },
  errorText: { fontSize: 12, color: "#b91c1c", marginTop: 4 },
  progressBarTrack: { height: 4, backgroundColor: "#e7e5e4", borderRadius: 2, overflow: "hidden" },
  progressBarFill: { height: 4, backgroundColor: "#4f46e5" },
  badgeMuted: { color: "#a8a29e", fontSize: 12 },
  badgeSuccess: { color: "#15803d", fontSize: 12, fontWeight: "600" },
  retryButton: { borderWidth: 1, borderColor: "#fecaca", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  retryButtonText: { color: "#b91c1c", fontSize: 12, fontWeight: "600" },
});
