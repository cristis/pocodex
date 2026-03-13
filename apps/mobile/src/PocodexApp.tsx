import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { asyncStorageSettingsStore, type SettingsStore } from "./storage";
import { isEmbeddedWebUrl, validateConfiguredUrl } from "./url";

interface PocodexAppProps {
  settingsStore?: SettingsStore;
  onOpenExternalUrl?: (url: string) => Promise<void>;
}

type ScreenMode = "booting" | "setup" | "browser";

export const DEFAULT_POCODEX_URL = "http://cristis-macbook-pro-16:8800";

function SettingsIcon() {
  if (Platform.OS === "android") {
    return (
      <Image
        accessible={false}
        source={{ uri: "ic_settings_24dp" }}
        style={styles.settingsIconImage}
        testID="settings-icon"
      />
    );
  }

  return (
    <View accessible={false} style={styles.settingsIcon} testID="settings-icon">
      <Text style={styles.settingsIconFallback}>⚙</Text>
    </View>
  );
}

export default function PocodexApp({
  settingsStore = asyncStorageSettingsStore,
  onOpenExternalUrl = Linking.openURL,
}: PocodexAppProps) {
  const webViewRef = useRef<WebView | null>(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>("booting");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const savedUrl = await settingsStore.getSavedUrl();
      if (!isMounted) {
        return;
      }

      if (!savedUrl) {
        setDraftUrl(DEFAULT_POCODEX_URL);
        setCurrentUrl(DEFAULT_POCODEX_URL);
        setIsPageLoading(true);
        setScreenMode("browser");
        return;
      }

      const validation = validateConfiguredUrl(savedUrl);
      if (!validation.ok) {
        setDraftUrl(savedUrl);
        setDraftError(validation.error);
        setScreenMode("setup");
        return;
      }

      setDraftUrl(validation.value);
      setCurrentUrl(validation.value);
      setIsPageLoading(true);
      setScreenMode("browser");
    })();

    return () => {
      isMounted = false;
    };
  }, [settingsStore]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screenMode === "browser" && canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }

      return false;
    });

    return () => {
      subscription.remove();
    };
  }, [canGoBack, screenMode]);

  async function persistDraftUrl() {
    const validation = validateConfiguredUrl(draftUrl);
    if (!validation.ok) {
      setDraftError(validation.error);
      return;
    }

    setIsSaving(true);
    try {
      await settingsStore.saveUrl(validation.value);
      setCurrentUrl(validation.value);
      setDraftUrl(validation.value);
      setDraftError(null);
      setPageError(null);
      setCanGoBack(false);
      setReloadKey((value) => value + 1);
      setIsPageLoading(true);
      setScreenMode("browser");
      setIsSettingsVisible(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function clearConfiguredUrl() {
    setIsSaving(true);
    try {
      await settingsStore.clearUrl();
      setCurrentUrl(DEFAULT_POCODEX_URL);
      setDraftUrl(DEFAULT_POCODEX_URL);
      setDraftError(null);
      setPageError(null);
      setCanGoBack(false);
      setIsSettingsVisible(false);
      setIsPageLoading(true);
      setReloadKey((value) => value + 1);
      setScreenMode("browser");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleOpenExternalUrl(url: string) {
    try {
      await onOpenExternalUrl(url);
    } catch {
      Alert.alert("Unable to open link", url);
    }
  }

  function openSettings() {
    setDraftError(null);
    setDraftUrl(currentUrl ?? DEFAULT_POCODEX_URL);
    setIsSettingsVisible(true);
  }

  function renderBootingState() {
    return (
      <View style={styles.centerState} testID="boot-state">
        <ActivityIndicator color="#4253ff" size="large" />
        <Text style={styles.stateTitle}>Loading your saved Codex target…</Text>
      </View>
    );
  }

  function renderSetupState() {
    return (
      <ScrollView
        contentContainerStyle={styles.setupScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Trusted-network wrapper</Text>
          <Text style={styles.heroTitle}>Point the app at your Codex server.</Text>
          <Text style={styles.heroBody}>
            Paste the full URL that Pocodex prints, including any token query parameter.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Codex URL</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={(value) => {
              setDraftUrl(value);
              if (draftError) {
                setDraftError(null);
              }
            }}
            onSubmitEditing={() => {
              void persistDraftUrl();
            }}
            placeholder="http://192.168.1.20:8787/?token=..."
            placeholderTextColor="#8190c0"
            style={[styles.input, draftError ? styles.inputError : undefined]}
            testID="url-input"
            value={draftUrl}
          />
          {draftError ? (
            <Text style={styles.validationMessage} testID="url-error">
              {draftError}
            </Text>
          ) : (
            <Text style={styles.helpText}>Supports both http:// and https:// endpoints.</Text>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void persistDraftUrl();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : undefined,
            ]}
            testID="save-url-button"
          >
            <Text style={styles.primaryButtonLabel}>{isSaving ? "Saving…" : "Save and Open"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  function renderBrowserState() {
    if (!currentUrl) {
      return null;
    }

    if (pageError) {
      return (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Couldn’t load Codex</Text>
          <Text style={styles.stateBody}>{pageError}</Text>
          <View style={styles.errorActionRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPageError(null);
                setIsPageLoading(true);
                setReloadKey((value) => value + 1);
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>Retry</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={openSettings}
              style={({ pressed }) => [
                styles.ghostButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.ghostButtonLabel}>Edit URL</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.browserShell}>
        <View style={styles.webViewFrame}>
          <WebView
            key={`${currentUrl}:${reloadKey}`}
            onError={(event) => {
              setPageError(
                event.nativeEvent.description || "The Codex server could not be reached.",
              );
              setIsPageLoading(false);
            }}
            onLoadEnd={() => {
              setIsPageLoading(false);
            }}
            onLoadStart={() => {
              setIsPageLoading(true);
            }}
            onNavigationStateChange={(state) => {
              setCanGoBack(state.canGoBack);
            }}
            onShouldStartLoadWithRequest={(request) => {
              if (isEmbeddedWebUrl(request.url)) {
                return true;
              }

              void handleOpenExternalUrl(request.url);
              return false;
            }}
            originWhitelist={["http://*", "https://*"]}
            ref={webViewRef}
            source={{ uri: currentUrl }}
          />
          {isPageLoading ? (
            <View pointerEvents="none" style={styles.loadingOverlay}>
              <ActivityIndicator color="#4253ff" size="large" />
              <Text style={styles.overlayLabel}>Opening Codex…</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar
        backgroundColor="transparent"
        barStyle="dark-content"
        translucent={screenMode === "browser"}
      />
      <SafeAreaView
        edges={screenMode === "browser" ? ["left", "right", "bottom"] : undefined}
        style={styles.safeArea}
      >
        <View style={styles.contentArea}>
          {screenMode === "booting" ? renderBootingState() : null}
          {screenMode === "setup" ? renderSetupState() : null}
          {screenMode === "browser" ? renderBrowserState() : null}
        </View>

        {screenMode === "browser" ? (
          <SafeAreaView
            edges={["top", "left", "right"]}
            pointerEvents="box-none"
            style={styles.browserOverlay}
          >
            <View pointerEvents="box-none" style={styles.browserOverlayRow}>
              <Pressable
                accessibilityLabel="Open settings"
                accessibilityRole="button"
                onPress={openSettings}
                style={({ pressed }) => [
                  styles.floatingSettingsButton,
                  pressed ? styles.buttonPressed : undefined,
                ]}
                testID="settings-button"
              >
                <SettingsIcon />
              </Pressable>
            </View>
          </SafeAreaView>
        ) : null}
      </SafeAreaView>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsSettingsVisible(false)}
        transparent
        visible={isSettingsVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Codex Settings</Text>
            <Text style={styles.modalBody}>
              Update the saved endpoint or clear it to return to first-run setup.
            </Text>

            <Text style={styles.inputLabel}>Codex URL</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onChangeText={(value) => {
                setDraftUrl(value);
                if (draftError) {
                  setDraftError(null);
                }
              }}
              placeholder="http://192.168.1.20:8787/?token=..."
              placeholderTextColor="#8190c0"
              style={[styles.input, draftError ? styles.inputError : undefined]}
              testID="settings-url-input"
              value={draftUrl}
            />

            {draftError ? <Text style={styles.validationMessage}>{draftError}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void persistDraftUrl();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
              testID="settings-save-button"
            >
              <Text style={styles.primaryButtonLabel}>{isSaving ? "Saving…" : "Save"}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void clearConfiguredUrl();
              }}
              style={({ pressed }) => [
                styles.ghostDangerButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
              testID="clear-url-button"
            >
              <Text style={styles.ghostDangerButtonLabel}>Reset to default URL</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsSettingsVisible(false)}
              style={({ pressed }) => [
                styles.ghostButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.ghostButtonLabel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#eef2ff",
    flex: 1,
  },
  safeArea: {
    backgroundColor: "#eef2ff",
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateTitle: {
    color: "#101630",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 18,
    textAlign: "center",
  },
  stateBody: {
    color: "#5b678f",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  setupScrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  heroCard: {
    backgroundColor: "#4253ff",
    borderRadius: 28,
    marginHorizontal: "auto",
    maxWidth: 720,
    padding: 24,
    shadowColor: "#4253ff",
    shadowOffset: {
      height: 18,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  eyebrow: {
    color: "#dbe1ff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 10,
  },
  heroBody: {
    color: "#eef1ff",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    marginHorizontal: "auto",
    marginTop: 18,
    maxWidth: 720,
    padding: 20,
    width: "100%",
  },
  inputLabel: {
    color: "#24305e",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f4f6ff",
    borderColor: "#d8def8",
    borderRadius: 18,
    borderWidth: 1,
    color: "#14203d",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: "#d13b54",
  },
  validationMessage: {
    color: "#c02d46",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
  helpText: {
    color: "#6d7cab",
    fontSize: 13,
    marginTop: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#4253ff",
    borderRadius: 18,
    marginTop: 18,
    paddingVertical: 15,
  },
  primaryButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#4253ff",
    borderRadius: 18,
    minWidth: 120,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  secondaryButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  ghostButton: {
    alignItems: "center",
    backgroundColor: "#edf1ff",
    borderRadius: 18,
    marginTop: 12,
    minWidth: 120,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  ghostButtonLabel: {
    color: "#3145d8",
    fontSize: 15,
    fontWeight: "700",
  },
  ghostDangerButton: {
    alignItems: "center",
    backgroundColor: "#fff2f4",
    borderRadius: 18,
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  ghostDangerButtonLabel: {
    color: "#c02d46",
    fontSize: 15,
    fontWeight: "700",
  },
  browserShell: {
    flex: 1,
  },
  webViewFrame: {
    backgroundColor: "#ffffff",
    flex: 1,
    overflow: "hidden",
  },
  browserOverlay: {
    bottom: 0,
    left: 0,
    pointerEvents: "box-none",
    position: "absolute",
    right: 0,
    top: 0,
  },
  browserOverlayRow: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  floatingSettingsButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(17, 17, 17, 0.14)",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      height: 8,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 42,
  },
  settingsIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIconImage: {
    height: 20,
    tintColor: "#111111",
    width: 20,
  },
  settingsIconFallback: {
    color: "#111111",
    fontSize: 18,
    lineHeight: 18,
  },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(248, 250, 255, 0.92)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  overlayLabel: {
    color: "#3145d8",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  errorActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 20,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  modalBackdrop: {
    backgroundColor: "rgba(16, 22, 48, 0.42)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    maxWidth: 540,
    padding: 20,
    width: "100%",
  },
  modalTitle: {
    color: "#101630",
    fontSize: 24,
    fontWeight: "800",
  },
  modalBody: {
    color: "#5b678f",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    marginTop: 8,
  },
});
