import React, { JSX, ReactNode, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";
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

// Same palette as review-ui/index.html — warm paper, espresso ink, sage
// and clay accents. The ink at low alpha stands in for grey borders.
const C = {
  paper: "#fbf8f1",
  core: "#fffdf8",
  ink: "#2a211c",
  inkSoft: "#5c5048",
  muted: "#8f8378",
  sage: "#5f7161",
  sageWash: "#e9eee4",
  clay: "#a8472a",
  clayWash: "#f6e3da",
  hairline: "rgba(42, 33, 28, 0.08)",
  shell: "rgba(42, 33, 28, 0.035)",
  tint: "rgba(42, 33, 28, 0.06)",
};

// Each weight is its own family: a custom font plus `fontWeight` makes
// Android synthesise a fake bold instead of using the real cut.
const F = {
  serif: "InstrumentSerif_400Regular",
  serifItalic: "InstrumentSerif_400Regular_Italic",
  sans: "PlusJakartaSans_400Regular",
  sansMedium: "PlusJakartaSans_500Medium",
  sansSemi: "PlusJakartaSans_600SemiBold",
};

// One curve for every transition: fast out of the gate, long settle.
const EASE = Easing.bezier(0.32, 0.72, 0, 1);

export default function App(): JSX.Element {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
  });

  // Hold on a blank paper screen rather than flashing system fonts. If
  // loading fails outright, carry on — the app works on fallback fonts.
  if (!fontsLoaded && !fontError) return <View style={styles.boot} />;

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

  const doneCount = queue.filter((item) => item.status === "done").length;

  // Passed to FlatList as an element, not a component: a component would
  // remount on every render and drop focus from the address field.
  const header = (
    <View>
      <Rise index={0} style={styles.brandRow}>
        <Image source={require("./assets/icon.png")} style={styles.logo} />
        <Text style={styles.brand}>Loopnote</Text>
      </Rise>

      <Rise index={1}>
        <Eyebrow label="Capture" />
        <Text style={styles.headline}>
          Snap it.{"\n"}
          <Text style={styles.headlineItalic}>Forget it.</Text>
        </Text>
        <Text style={styles.lede}>We&apos;ll bring it back when it matters.</Text>
      </Rise>

      <Rise index={2} style={styles.ctaWrap}>
        <AddPhotosButton onPress={pickPhotos} />
      </Rise>

      <Rise index={3}>
        <Bezel>
          <Text style={styles.cardLabel}>Server address</Text>
          <Text style={styles.cardHint}>
            On a real phone, &quot;localhost&quot; means this phone — not your computer. Use your computer&apos;s LAN IP
            instead (e.g. http://192.168.1.23:4000).
          </Text>
          <View style={styles.apiRow}>
            <View style={styles.field}>
              <TextInput
                style={styles.fieldInput}
                value={apiBaseUrl}
                onChangeText={(text) => {
                  setApiBaseUrl(text);
                  setConnection("idle");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="http://192.168.1.23:4000"
                placeholderTextColor={C.muted}
              />
            </View>
            <QuietButton
              label={connection === "checking" ? "Checking" : "Test"}
              onPress={testConnection}
              disabled={connection === "checking"}
            />
          </View>
          <ConnectionBadge status={connection} />
        </Bezel>
      </Rise>

      <Rise index={4} style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>Queue</Text>
        {queue.length > 0 && (
          <Text style={styles.sectionCount}>
            {String(doneCount).padStart(2, "0")} / {String(queue.length).padStart(2, "0")}
          </Text>
        )}
      </Rise>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* "dark", not "auto": the UI is light-only, and "auto" would put
          light status-bar text on this light background in dark mode. */}
      <StatusBar style="dark" />
      <FlatList
        data={queue}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyQueue />}
        renderItem={({ item }) => (
          <QueueRow item={item} onRetry={() => dispatch({ type: "RETRY", id: item.id })} />
        )}
      />
    </SafeAreaView>
  );
}

/** Entry choreography: content settles up into place, staggered by index. */
function Rise({
  index,
  style,
  children,
}: {
  index: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}): JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 800,
      delay: index * 90,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [progress, index]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Double bezel: a tray (shell) holding a plate (core), on concentric radii. */
function Bezel({ children }: { children: ReactNode }): JSX.Element {
  return (
    <View style={styles.shell}>
      <View style={styles.core}>{children}</View>
    </View>
  );
}

function Eyebrow({ label }: { label: string }): JSX.Element {
  return (
    <View style={styles.eyebrow}>
      <View style={styles.eyebrowDot} />
      <Text style={styles.eyebrowText}>{label}</Text>
    </View>
  );
}

/** Press physics shared by every button: the whole control gives slightly
 * under the finger and springs back, rather than snapping between states. */
function usePressSpring(): { pressed: Animated.Value; pressIn: () => void; pressOut: () => void } {
  const pressed = useRef(new Animated.Value(0)).current;
  const to = (toValue: number) => () =>
    Animated.spring(pressed, { toValue, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return { pressed, pressIn: to(1), pressOut: to(0) };
}

function AddPhotosButton({ onPress }: { onPress: () => void }): JSX.Element {
  const { pressed, pressIn, pressOut } = usePressSpring();
  const scale = pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] });
  // The nested icon pulls up and to the right as the button compresses.
  const iconShift = pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  const iconLift = pressed.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
  const iconScale = pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={styles.cta}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityRole="button"
        accessibilityLabel="Add photos"
      >
        <Text style={styles.ctaText}>Add photos</Text>
        <Animated.View
          style={[
            styles.ctaIcon,
            { transform: [{ translateX: iconShift }, { translateY: iconLift }, { scale: iconScale }] },
          ]}
        >
          <View style={styles.plusBar} />
          <View style={[styles.plusBar, styles.plusBarUpright]} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function QuietButton({
  label,
  onPress,
  disabled,
  tone = "neutral",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
}): JSX.Element {
  const { pressed, pressIn, pressOut } = usePressSpring();
  const scale = pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.5 : 1 }}>
      <Pressable
        style={[styles.quiet, tone === "danger" && styles.quietDanger]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        accessibilityRole="button"
      >
        <Text style={[styles.quietText, tone === "danger" && styles.quietTextDanger]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function ConnectionBadge({ status }: { status: ConnectionStatus }): JSX.Element | null {
  if (status === "idle") return null;

  const tone = status === "ok" ? C.sage : status === "failed" ? C.clay : C.muted;
  const label =
    status === "checking" ? "Checking…" : status === "ok" ? "Connected" : "Couldn't reach that address";

  return (
    <View style={styles.connection}>
      <View style={[styles.connectionDot, { backgroundColor: tone }]} />
      <Text style={[styles.connectionText, { color: tone }]}>{label}</Text>
    </View>
  );
}

function EmptyQueue(): JSX.Element {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2400, easing: EASE, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2400, easing: EASE, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const outerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const outerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.35] });

  return (
    <Rise index={5}>
      <Bezel>
        <View style={styles.empty}>
          <View style={styles.rings}>
            <Animated.View
              style={[styles.ring, styles.ringOuter, { opacity: outerOpacity, transform: [{ scale: outerScale }] }]}
            />
            <View style={[styles.ring, styles.ringMiddle]} />
            <View style={styles.ringCenter} />
          </View>
          <Text style={styles.emptyTitle}>Nothing queued yet</Text>
          <Text style={styles.emptyCopy}>
            Add a photo of a whiteboard, a notebook page, or a journal entry to get started.
          </Text>
        </View>
      </Bezel>
    </Rise>
  );
}

function QueueRow({ item, onRetry }: { item: QueueItem; onRetry: () => void }): JSX.Element {
  const entrance = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(item.progress)).current;

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 700, easing: EASE, useNativeDriver: true }).start();
  }, [entrance]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: item.progress,
      duration: 500,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [item.progress, progressAnim]);

  // The fill is always full width and scaled from its left edge: a
  // transform runs on the native driver, where animating `width` would
  // relayout the row on every frame.
  const progressScale = useMemo(
    () => progressAnim.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: "clamp" }),
    [progressAnim]
  );

  return (
    <Animated.View
      style={[
        styles.row,
        {
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <View style={styles.rowInfo}>
        <Text style={styles.filename} numberOfLines={1}>
          {item.filename}
        </Text>
        {item.status === "uploading" && (
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { transform: [{ scaleX: progressScale }] }]} />
          </View>
        )}
        {item.status === "queued" && <Text style={styles.rowMeta}>Waiting its turn</Text>}
        {item.status === "done" && <Text style={styles.rowMeta}>Sent for processing</Text>}
        {item.status === "failed" && <Text style={styles.errorText}>{item.error ?? "Upload failed"}</Text>}
      </View>
      <StatusBadge item={item} onRetry={onRetry} />
    </Animated.View>
  );
}

function StatusBadge({ item, onRetry }: { item: QueueItem; onRetry: () => void }): JSX.Element {
  if (item.status === "queued") return <Text style={styles.badgeMuted}>Queued</Text>;
  if (item.status === "uploading") return <Text style={styles.badgeMuted}>{Math.round(item.progress)}%</Text>;
  if (item.status === "done") return <SuccessCheck />;
  return <QuietButton label="Retry" onPress={onRetry} tone="danger" />;
}

function SuccessCheck(): JSX.Element {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  }, [scale]);

  return (
    <Animated.View style={[styles.check, { transform: [{ scale }] }]} accessibilityLabel="Uploaded">
      <View style={styles.checkMark} />
    </Animated.View>
  );
}

const BEZEL = 6;
const SHELL_RADIUS = 30;

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: C.paper },
  container: { flex: 1, backgroundColor: C.paper },
  // Capped and centred so the layout stays a phone-width column on a
  // tablet or in a browser.
  content: { width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 56 },

  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 36 },
  logo: { width: 34, height: 34, borderRadius: 11, marginRight: 10 },
  brand: { fontFamily: F.serif, fontSize: 24, lineHeight: 30, color: C.ink },

  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: C.tint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
  },
  eyebrowDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.sage, marginRight: 7 },
  eyebrowText: { fontFamily: F.sansSemi, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.inkSoft },

  headline: { fontFamily: F.serif, fontSize: 58, lineHeight: 58, letterSpacing: -1.4, color: C.ink, marginTop: 20 },
  headlineItalic: { fontFamily: F.serifItalic, color: C.sage },
  lede: { fontFamily: F.sans, fontSize: 16, lineHeight: 24, color: C.inkSoft, marginTop: 16 },

  ctaWrap: { marginTop: 32, marginBottom: 36 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 999,
    paddingLeft: 26,
    paddingRight: 7,
    paddingVertical: 7,
    backgroundColor: C.ink,
    boxShadow: "0 22px 36px -20px rgba(42, 33, 28, 0.6)",
  },
  ctaText: { fontFamily: F.sansSemi, fontSize: 16, color: C.paper },
  ctaIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 253, 248, 0.14)",
  },
  plusBar: { position: "absolute", width: 15, height: 1.5, borderRadius: 1, backgroundColor: C.paper },
  plusBarUpright: { transform: [{ rotate: "90deg" }] },

  shell: {
    padding: BEZEL,
    borderRadius: SHELL_RADIUS,
    backgroundColor: C.shell,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
  },
  core: {
    padding: 20,
    borderRadius: SHELL_RADIUS - BEZEL,
    backgroundColor: C.core,
    boxShadow: "0 26px 44px -30px rgba(42, 33, 28, 0.3)",
  },

  cardLabel: { fontFamily: F.sansSemi, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted },
  cardHint: { fontFamily: F.sans, fontSize: 12.5, lineHeight: 19, color: C.inkSoft, marginTop: 8, marginBottom: 14 },
  apiRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  field: {
    flex: 1,
    padding: 4,
    borderRadius: 999,
    backgroundColor: C.shell,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
  },
  fieldInput: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontFamily: F.sansMedium,
    fontSize: 13,
    color: C.ink,
    backgroundColor: C.core,
  },
  quiet: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: C.tint },
  quietDanger: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.clayWash },
  quietText: { fontFamily: F.sansSemi, fontSize: 13, color: C.ink },
  quietTextDanger: { fontSize: 12, color: C.clay },
  connection: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  connectionDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  connectionText: { fontFamily: F.sansMedium, fontSize: 12 },

  sectionRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 44,
    marginBottom: 14,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
  },
  sectionLabel: { fontFamily: F.sansSemi, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: C.muted },
  sectionCount: { fontFamily: F.serif, fontSize: 20, lineHeight: 24, color: C.ink },

  empty: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 8 },
  rings: { width: 84, height: 84, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  ring: { position: "absolute", borderWidth: 1, borderColor: C.sage },
  ringOuter: { width: 84, height: 84, borderRadius: 42 },
  ringMiddle: { width: 52, height: 52, borderRadius: 26, opacity: 0.55 },
  ringCenter: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.sageWash, borderWidth: 1, borderColor: C.sage },
  emptyTitle: { fontFamily: F.serif, fontSize: 26, lineHeight: 30, color: C.ink, textAlign: "center" },
  emptyCopy: {
    fontFamily: F.sans,
    fontSize: 14,
    lineHeight: 21,
    color: C.inkSoft,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 280,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    backgroundColor: C.core,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.hairline,
    boxShadow: "0 18px 30px -26px rgba(42, 33, 28, 0.35)",
  },
  rowInfo: { flex: 1, marginRight: 14 },
  filename: { fontFamily: F.sansMedium, fontSize: 14, lineHeight: 20, color: C.ink },
  rowMeta: { fontFamily: F.sans, fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 2 },
  errorText: { fontFamily: F.sans, fontSize: 12, lineHeight: 18, color: C.clay, marginTop: 4 },
  progressTrack: { height: 3, borderRadius: 2, marginTop: 10, overflow: "hidden", backgroundColor: C.tint },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: C.sage, transformOrigin: "left" },
  badgeMuted: { fontFamily: F.sansMedium, fontSize: 12, color: C.muted },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.sageWash,
  },
  // A tick drawn from two borders of a rotated box — no icon font needed.
  checkMark: {
    width: 7,
    height: 12,
    marginTop: -3,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: C.sage,
    transform: [{ rotate: "45deg" }],
  },
});
