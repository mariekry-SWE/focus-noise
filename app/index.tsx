import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import { NOISE_CATEGORIES, type NoiseSound } from "@/data/sounds";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { playNoise, setNoiseVolume, stopNoise } from "@/lib/noiseGenerator";

const FREE_SESSION_MINUTES = 30;
const PREMIUM_SESSION_HOURS = 8;

// Toggle this in development for faster timer QA.
const DEBUG_QUICK_SESSION_TIMERS = __DEV__ && true;
const DEBUG_FREE_SESSION_SECONDS = 20;
const DEBUG_PREMIUM_SESSION_SECONDS = 45;

const EFFECTIVE_FREE_SESSION_MS = DEBUG_QUICK_SESSION_TIMERS
  ? DEBUG_FREE_SESSION_SECONDS * 1000
  : FREE_SESSION_MINUTES * 60 * 1000;

const EFFECTIVE_PREMIUM_SESSION_MS = DEBUG_QUICK_SESSION_TIMERS
  ? DEBUG_PREMIUM_SESSION_SECONDS * 1000
  : PREMIUM_SESSION_HOURS * 60 * 60 * 1000;

const FREE_SESSION_LABEL = DEBUG_QUICK_SESSION_TIMERS
  ? `${DEBUG_FREE_SESSION_SECONDS}s`
  : `${FREE_SESSION_MINUTES} min`;

const PREMIUM_SESSION_LABEL = DEBUG_QUICK_SESSION_TIMERS
  ? `${DEBUG_PREMIUM_SESSION_SECONDS}s`
  : `${PREMIUM_SESSION_HOURS}h`;

function playbackSessionLabel(opts: {
  isPremium: boolean;
  isFirstTrackInCategory: boolean;
}): string {
  if (opts.isFirstTrackInCategory) return FREE_SESSION_LABEL;
  if (opts.isPremium) return PREMIUM_SESSION_LABEL;
  return FREE_SESSION_LABEL;
}

export default function Index() {
  const scheme = useColorScheme();
  const colors = useMemo(() => (scheme === "dark" ? DARK : LIGHT), [scheme]);
  const router = useRouter();
  const { isPro } = useRevenueCat();

  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [activeSound, setActiveSound] = useState<NoiseSound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionEndModalVisible, setSessionEndModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [activeTrackIndexInCategory, setActiveTrackIndexInCategory] = useState<number | null>(null);

  /** Wall-clock session end; checked periodically so limits hold even when JS timers are throttled in background. */
  const sessionEndsAtRef = useRef<number | null>(null);
  const sessionFirstTrackRef = useRef(false);
  const sessionCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // If a reload/fast refresh leaves an overlay "stuck", it can block all touches.
  // This mount reset keeps the screen in a deterministic, touchable state.
  function clearSessionWatch() {
    sessionEndsAtRef.current = null;
    sessionFirstTrackRef.current = false;
    if (sessionCheckIntervalRef.current != null) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
  }

  const unloadCurrentSound = useCallback(async () => {
    try {
      clearSessionWatch();
      await stopNoise();
    } catch {
      // Ignore unload errors
    }
  }, []);

  const endSessionByLimit = useCallback(async () => {
    const wasFirstTrack = sessionFirstTrackRef.current;
    clearSessionWatch();
    try {
      await stopNoise();
    } catch {
      // ignore
    }
    setPlayingSoundId(null);
    setActiveSound(null);
    setIsPlaying(false);
    if (!isPro && wasFirstTrack) setSessionEndModalVisible(true);
  }, [isPro]);

  function startPlaybackTimers(isFirstTrack: boolean) {
    clearSessionWatch();

    const limitMs = isFirstTrack
      ? EFFECTIVE_FREE_SESSION_MS
      : EFFECTIVE_PREMIUM_SESSION_MS;

    sessionEndsAtRef.current = Date.now() + limitMs;
    sessionFirstTrackRef.current = isFirstTrack;

    sessionCheckIntervalRef.current = setInterval(() => {
      const endAt = sessionEndsAtRef.current;
      if (endAt == null) return;
      if (Date.now() < endAt) return;
      void endSessionByLimit();
    }, 15_000);
  }

  async function toggleSound(sound: NoiseSound, trackIndexInCategory: number) {
    setErrorMessage(null);

    const isFirstTrack = trackIndexInCategory === 0;
    const canPlayFree = isFirstTrack && !isPro;
    const canPlayPremium = isPro;
    if (!canPlayFree && !canPlayPremium) return; // Låst spår (premium-only för gratis-användare)

    setIsLoading(true);
    clearSessionWatch();

    try {
      if (playingSoundId === sound.id) {
        if (isPlaying) {
          await stopNoise();
          clearSessionWatch();
          setIsPlaying(false);
        } else {
          await playNoise(sound.noiseType);
          startPlaybackTimers(isFirstTrack);
          setIsPlaying(true);
        }
        setIsLoading(false);
        return;
      }

      await unloadCurrentSound();

      await playNoise(sound.noiseType);
      setPlayingSoundId(sound.id);
      setIsPlaying(true);
      startPlaybackTimers(isFirstTrack);
    } catch {
      setErrorMessage("Kunde inte starta brusgeneratorn. Bygg om dev client och prova igen.");
      setPlayingSoundId(null);
      setActiveSound(null);
      setIsPlaying(false);
      void unloadCurrentSound();
    } finally {
      setIsLoading(false);
    }
  }

  const handleClosePlayer = useCallback(() => {
    setActiveSound(null);
    setActiveTrackIndexInCategory(null);
    setPlayingSoundId(null);
    setIsPlaying(false);
    void unloadCurrentSound();
  }, [unloadCurrentSound]);

  useEffect(() => {
    setOpenCategoryId(null);
    setPlayingSoundId(null);
    setActiveSound(null);
    setIsPlaying(false);
    setIsLoading(false);
    setErrorMessage(null);
    setSessionEndModalVisible(false);
    setSettingsModalVisible(false);
    setActiveTrackIndexInCategory(null);
    void unloadCurrentSound();
  }, [unloadCurrentSound]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      setSettingsModalVisible(false);
      setSessionEndModalVisible(false);
      setErrorMessage(null);
      // Re-check session wall clock when returning from background (timers may have been throttled).
      const endAt = sessionEndsAtRef.current;
      if (endAt != null && Date.now() >= endAt) {
        void endSessionByLimit();
      }
    });
    return () => sub.remove();
  }, [endSessionByLimit]);

  useEffect(() => {
    void setNoiseVolume(0.22);

    return () => {
      void unloadCurrentSound();
    };
  }, [unloadCurrentSound]);

  function toggleCategory(categoryId: string) {
    setOpenCategoryId((prev) => (prev === categoryId ? null : categoryId));
  }

  function openPaywall() {
    setSessionEndModalVisible(false);
    setSettingsModalVisible(false);
    // Let modal state settle before navigation so push isn't swallowed.
    requestAnimationFrame(() => {
      router.push("/paywall");
    });
  }

  function openPaywallFromSessionEnd() {
    setSessionEndModalVisible(false);
    // Session-end modal can otherwise swallow immediate navigation on some iOS builds.
    setTimeout(() => {
      router.replace("/paywall");
    }, 120);
  }

  async function handleManageSubscription() {
    try {
      const iosFallbackUrl = "https://apps.apple.com/account/subscriptions";
      const androidUrl = "https://play.google.com/store/account/subscriptions";

      if (Platform.OS === "ios") {
        const maybeShowManage = (Purchases as unknown as { showManageSubscriptions?: () => Promise<void> })
          .showManageSubscriptions;

        if (typeof maybeShowManage === "function") {
          await maybeShowManage();
          return;
        }

        const canOpen = await Linking.canOpenURL(iosFallbackUrl);
        if (!canOpen) {
          Alert.alert(
            "Kan inte öppna abonnemang",
            "Det här funkar ibland inte i Simulator. Testa på en fysisk iPhone.",
          );
          return;
        }
        await Linking.openURL(iosFallbackUrl);
        return;
      }

      const canOpen = await Linking.canOpenURL(androidUrl);
      if (!canOpen) {
        Alert.alert("Kan inte öppna abonnemang", "Försök igen om en stund.");
        return;
      }
      await Linking.openURL(androidUrl);
    } catch (error: unknown) {
      console.warn("[ManageSubscription] error", error);
      Alert.alert("Kunde inte öppna abonnemang", "Försök igen om en stund.");
    }
  }

  const hasActiveSound =
    activeSound != null && playingSoundId === activeSound.id && isPlaying;
  const isActiveLoading = isLoading && !!activeSound;
  const activeOverlay: "settings" | "sessionEnd" | "player" | null =
    settingsModalVisible
      ? "settings"
      : sessionEndModalVisible
        ? "sessionEnd"
        : activeSound != null
          ? "player"
          : null;

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        keyboardShouldPersistTaps="handled"
      >
      {errorMessage ? (
        <View style={[styles.notice, { backgroundColor: colors.noticeBg }]}>
          <Text style={[styles.noticeText, { color: colors.noticeText }]}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {NOISE_CATEGORIES.map((category) => {
          const isOpen = openCategoryId === category.id;
          return (
            <View
              key={category.id}
              style={[
                styles.section,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Pressable
                onPress={() => toggleCategory(category.id)}
                style={({ pressed }) => [
                  styles.sectionHeader,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.sectionHeaderText}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {category.title}
                  </Text>
                  {category.description ? (
                    <Text
                      style={[
                        styles.sectionDescription,
                        { color: colors.mutedText },
                      ]}
                    >
                      {category.description}
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name={isOpen ? "chevron-down" : "chevron-forward"}
                  size={22}
                  color={colors.mutedText}
                />
              </Pressable>

              {isOpen ? (
                <View style={styles.tracks}>
                  {category.sounds.map((sound, trackIndex) => {
                    const active = playingSoundId === sound.id;
                    const isFirstTrack = trackIndex === 0;
                    const isLocked = !isPro && !isFirstTrack; // Premium-spår för gratis: synliga men ej klickbara
                    const canPlay = !isLocked;
                    const sessionLabel = playbackSessionLabel({
                      isPremium: isPro,
                      isFirstTrackInCategory: trackIndex === 0,
                    });

                    function handlePress() {
                      if (isLocked) {
                        openPaywall();
                        return;
                      }
                      setActiveSound(sound);
                      setActiveTrackIndexInCategory(trackIndex);
                      void toggleSound(sound, trackIndex);
                    }

                    return (
                      <View key={sound.id} style={styles.trackRowWrapper}>
                        <Pressable
                          onPress={handlePress}
                          disabled={canPlay ? isLoading : false}
                          style={({ pressed }) => [
                            styles.trackRow,
                            { borderColor: colors.border },
                            (canPlay || isLocked) && pressed && { opacity: 0.9 },
                            isLocked && styles.trackRowLocked,
                          ]}
                        >
                          <View style={[isLocked && styles.trackRowLockedOverlay]} />
                          <View style={styles.trackText}>
                            <Text
                              style={[
                                styles.trackTitle,
                                {
                                  color: colors.text,
                                  opacity: canPlay ? 1 : 0.5,
                                },
                              ]}
                              numberOfLines={2}
                            >
                              {sound.title}
                            </Text>
                            {sound.description ? (
                              <Text
                                style={[styles.trackMeta, { color: colors.mutedText }]}
                                numberOfLines={2}
                              >
                                {sound.description}
                              </Text>
                            ) : null}
                            <Text
                              style={[styles.trackMeta, { color: colors.mutedText }]}
                            >
                              {isLocked
                                ? "Premium • 8h"
                                : active
                                  ? isPlaying
                                    ? `Spelar • ${sessionLabel}`
                                    : `Pausad • ${sessionLabel}`
                                  : sessionLabel}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.playButton,
                              {
                                backgroundColor: isLocked ? colors.disabled : colors.primary,
                              },
                            ]}
                          >
                            {isLocked ? (
                              <Ionicons name="lock-closed" size={20} color={colors.mutedText} />
                            ) : isLoading && active ? (
                              <ActivityIndicator color={colors.primaryText} />
                            ) : (
                              <Ionicons
                                name={active && isPlaying ? "pause" : "play"}
                                size={24}
                                color={colors.primaryText}
                              />
                            )}
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}

                  {category.sounds.length === 0 ? (
                    <Text style={[styles.empty, { color: colors.mutedText }]}>
                      Inga ljud i den här kategorin än.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      </ScrollView>

      <View style={[styles.bottomMenu, { backgroundColor: colors.noticeBg }]}>
        <Pressable
          onPress={() => setSettingsModalVisible(true)}
          hitSlop={16}
          style={({ pressed }) => [
            styles.bottomMenuButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      {activeOverlay ? (
        <Modal
          visible
          transparent
          animationType={activeOverlay === "player" ? "slide" : "fade"}
          onRequestClose={() => {
            if (activeOverlay === "player") {
              handleClosePlayer();
            } else if (activeOverlay === "sessionEnd") {
              setSessionEndModalVisible(false);
            } else {
              setSettingsModalVisible(false);
            }
          }}
        >
          {activeOverlay === "player" ? (
            <View style={styles.playerOverlay}>
              <Pressable
                onPress={() => setSettingsModalVisible(true)}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.playerSettingsButton,
                  pressed && { opacity: 0.85 },
                  { borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={colors.text}
                />
              </Pressable>
              <View style={[styles.playerContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.playerTitle, { color: colors.text }]}>
                  {activeSound?.title}
                </Text>
                {activeSound?.description ? (
                  <Text style={[styles.playerSource, { color: colors.mutedText }]}>
                    {activeSound.description}
                  </Text>
                ) : null}

                <View style={styles.playerControls}>
                  <Pressable
                    onPress={() => {
                      if (!activeSound || isLoading || activeTrackIndexInCategory == null) return;
                      void toggleSound(activeSound, activeTrackIndexInCategory);
                    }}
                    style={({ pressed }) => [
                      styles.playerPlayButton,
                      { backgroundColor: colors.primary },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    {isActiveLoading ? (
                      <ActivityIndicator color={colors.primaryText} />
                    ) : hasActiveSound ? (
                      <View style={styles.playerPauseIconRow}>
                        <View
                          style={[
                            styles.playerPauseBar,
                            { backgroundColor: colors.primaryText },
                          ]}
                        />
                        <View
                          style={[
                            styles.playerPauseBar,
                            { backgroundColor: colors.primaryText },
                          ]}
                        />
                      </View>
                    ) : (
                      <View style={styles.playerPlayIconWrapper}>
                        <View
                          style={[
                            styles.playerPlayTriangle,
                            { borderLeftColor: colors.primaryText },
                          ]}
                        />
                      </View>
                    )}
                  </Pressable>
                  <Text style={[styles.playerTimeText, { color: colors.mutedText }]}>
                    {isPlaying ? "Spelar" : "Pausad"}
                  </Text>
                </View>

                <Pressable
                  onPress={handleClosePlayer}
                  style={[styles.playerCloseButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.playerCloseText}>Stäng</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {activeOverlay === "sessionEnd" ? (
            <View style={styles.sessionEndOverlay}>
              <View style={[styles.sessionEndCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.sessionEndTitle, { color: colors.text }]}>
                  Din 30-minuterssession är slut.
                </Text>
                <Text style={[styles.sessionEndBody, { color: colors.mutedText }]}>
                  Med premium kan du spela fokus-ljuden upp till 8 timmar utan avbrott. Vill du testa Premium gratis i 2 veckor?
                </Text>
                <Pressable
                  style={[styles.sessionEndButtonPrimary, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    openPaywallFromSessionEnd();
                  }}
                >
                  <Text style={styles.sessionEndButtonPrimaryText}>
                    Ja, jag testar gärna Premium
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.sessionEndButtonSecondary, { borderColor: colors.border }]}
                  onPress={() => setSessionEndModalVisible(false)}
                >
                  <Text style={[styles.sessionEndButtonSecondaryText, { color: colors.text }]}>
                    Nej, jag avvaktar för nu
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {activeOverlay === "settings" ? (
            <View style={styles.settingsOverlay}>
              <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
                <View style={styles.settingsHeaderRow}>
                  <Text style={[styles.settingsTitle, { color: colors.text }]}>
                    Installningar
                  </Text>
                  <Pressable onPress={() => setSettingsModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.mutedText} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => {
                    setSettingsModalVisible(false);
                    void handleManageSubscription();
                  }}
                  style={({ pressed }) => [
                    styles.settingsOptionRow,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.settingsOptionTextWrap}>
                    <Text style={[styles.settingsOptionTitle, { color: colors.text }]}>
                      Hantera abonnemang
                    </Text>
                    <Text
                      style={[styles.settingsOptionSubtitle, { color: colors.mutedText }]}
                    >
                      Öppna App Store/Google Play för att säga upp eller ändra abonnemang.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
                </Pressable>

                {!isPro ? (
                  <Pressable
                    onPress={() => {
                      openPaywall();
                    }}
                    style={({ pressed }) => [
                      styles.settingsOptionRow,
                      { borderColor: colors.border },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <View style={styles.settingsOptionTextWrap}>
                      <Text style={[styles.settingsOptionTitle, { color: colors.text }]}>
                        Uppgradera till Unlimited
                      </Text>
                      <Text
                        style={[styles.settingsOptionSubtitle, { color: colors.mutedText }]}
                      >
                        Se premiumalternativ och återställ köp.
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={async () => {
                    try {
                      await Linking.openURL("https://www.revenuecat.com/terms");
                    } catch {
                      Alert.alert("Kunde inte oppna sidan", "Forsok igen om en stund.");
                    }
                  }}
                  style={({ pressed }) => [
                    styles.settingsOptionRow,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.settingsOptionTextWrap}>
                    <Text style={[styles.settingsOptionTitle, { color: colors.text }]}>
                      Terms
                    </Text>
                    <Text
                      style={[styles.settingsOptionSubtitle, { color: colors.mutedText }]}
                    >
                      Las villkor for prenumeration och anvandning.
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={20} color={colors.mutedText} />
                </Pressable>

                <Pressable
                  onPress={async () => {
                    try {
                      await Linking.openURL("https://www.revenuecat.com/privacy");
                    } catch {
                      Alert.alert("Kunde inte oppna sidan", "Forsok igen om en stund.");
                    }
                  }}
                  style={({ pressed }) => [
                    styles.settingsOptionRow,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.settingsOptionTextWrap}>
                    <Text style={[styles.settingsOptionTitle, { color: colors.text }]}>
                      Privacy
                    </Text>
                    <Text
                      style={[styles.settingsOptionSubtitle, { color: colors.mutedText }]}
                    >
                      Las hur kontodata och kop hanteras.
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={20} color={colors.mutedText} />
                </Pressable>

                <Pressable
                  onPress={() =>
                    Alert.alert(
                      "Contact support",
                      "Skicka supportmail till: support@focusnoise.app",
                    )
                  }
                  style={({ pressed }) => [
                    styles.settingsOptionRow,
                    { borderColor: colors.border },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.settingsOptionTextWrap}>
                    <Text style={[styles.settingsOptionTitle, { color: colors.text }]}>
                      Contact support
                    </Text>
                    <Text
                      style={[styles.settingsOptionSubtitle, { color: colors.mutedText }]}
                    >
                      Fa hjalp med kop, konto och appfragor.
                    </Text>
                  </View>
                  <Ionicons name="mail-outline" size={20} color={colors.mutedText} />
                </Pressable>
              </View>
            </View>
          ) : null}
        </Modal>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  scrollRoot: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 92,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  bottomMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 54,
    zIndex: 999,
    pointerEvents: "auto",
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D1D5DB",
  },
  bottomMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 50,
    pointerEvents: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  notice: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 18,
  },
  list: {
    gap: 10,
  },
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sectionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  chevron: {
    fontSize: 26,
    width: 26,
    textAlign: "right",
  },
  tracks: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  trackRowWrapper: {
    position: "relative",
  },
  trackRow: {
    position: "relative",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trackRowLocked: {
    opacity: 0.85,
  },
  trackRowLockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 8,
    pointerEvents: "none",
  },
  trackText: {
    flex: 1,
    gap: 4,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  trackMeta: {
    fontSize: 13,
  },
  playButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
  },
  empty: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
    paddingTop: 12,
    fontSize: 13,
  },
  playerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  playerSettingsButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 50,
    pointerEvents: "auto",
    alignItems: "center",
    justifyContent: "center",
  },
  playerContainer: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  playerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  playerSource: {
    fontSize: 14,
    textAlign: "center",
  },
  playerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  playerPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  playerPlayIconWrapper: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  playerPlayTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 24,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    transform: [{ translateX: 3 }],
  },
  playerPauseIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  playerPauseBar: {
    width: 5,
    height: 22,
    borderRadius: 2.5,
    marginHorizontal: 2,
  },
  playerTimeText: {
    fontSize: 14,
  },
  playerCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  playerCloseText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sessionEndOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sessionEndCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  sessionEndTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sessionEndBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  sessionEndButtonPrimary: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  sessionEndButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  sessionEndButtonSecondary: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
  },
  sessionEndButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  settingsCard: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  settingsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  settingsOptionRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  settingsOptionTextWrap: {
    flex: 1,
    gap: 3,
  },
  settingsOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  settingsOptionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});

const LIGHT = {
  background: "#F7F7F8",
  card: "#FFFFFF",
  text: "#111827",
  mutedText: "#6B7280",
  border: "#E5E7EB",
  primary: "#2563EB",
  primaryText: "#FFFFFF",
  disabled: "#D1D5DB",
  noticeBg: "#FEF3C7",
  noticeText: "#92400E",
} as const;

const DARK = {
  background: "#0B1220",
  card: "#0F172A",
  text: "#E5E7EB",
  mutedText: "#94A3B8",
  border: "#1F2937",
  primary: "#3B82F6",
  primaryText: "#FFFFFF",
  disabled: "#334155",
  noticeBg: "#3B2F12",
  noticeText: "#FDE68A",
} as const;
