import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { CaretRight, Info } from "phosphor-react-native";
import { api } from "@expo-demo/backend/convex/_generated/api";
import {
  getApiKey,
  getDeviceId,
  getProvider,
  PROVIDERS,
  Provider,
  setApiKey,
  setProvider,
} from "@/lib/keys";
import { noFocusRing, theme } from "@/lib/theme";

// BYOK settings. Keys are written to expo-secure-store and nowhere else.
// In demo mode (DEMO_MODE=true on the deployment) key entry disappears
// entirely: visitors see which provider the host activated, never any part
// of a key. Forks get the normal key inputs. See docs/demo-mode.md.
export default function Settings() {
  const demo = useQuery(api.demo.config);
  const [provider, setProviderState] = useState<Provider>("anthropic");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [deviceId, setDeviceId] = useState("");
  const [saved, setSaved] = useState(false);
  const user = useQuery(
    api.users.getByDevice,
    deviceId ? { deviceId } : "skip"
  );
  const setRemindersEnabled = useMutation(api.users.setRemindersEnabled);
  const setAppName = useMutation(api.users.setAppName);
  const agentmail = useQuery(api.email.status);
  const firecrawl = useQuery(api.firecrawl.status);
  const [appName, setAppNameState] = useState("");
  const [appNameLoaded, setAppNameLoaded] = useState(false);
  const [appNameSaved, setAppNameSaved] = useState(false);

  // Seed the rename field once from the server value, then let the user type.
  useEffect(() => {
    if (user !== undefined && !appNameLoaded) {
      setAppNameState(user?.appName ?? "");
      setAppNameLoaded(true);
    }
  }, [user, appNameLoaded]);

  const onSaveAppName = async () => {
    if (!user) return;
    await setAppName({ userId: user._id, appName });
    setAppNameSaved(true);
    setTimeout(() => setAppNameSaved(false), 1500);
  };

  useEffect(() => {
    (async () => {
      setProviderState(await getProvider());
      const loaded: Record<string, string> = {};
      for (const p of PROVIDERS) loaded[p] = (await getApiKey(p)) ?? "";
      setKeys(loaded);
      setDeviceId(await getDeviceId());
    })();
  }, []);

  const onSave = async () => {
    await setProvider(provider);
    for (const p of PROVIDERS) await setApiKey(p, keys[p] ?? "");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: theme.space(4) }}>
      {demo?.demoMode ? (
        <View style={styles.toolCard}>
          <Text style={styles.toggleTitle}>API keys</Text>
          <Text style={styles.toggleNote}>
            Keys are managed by the demo host and never shown or stored in
            your browser. Fork the template to bring your own keys; the fork
            gets this screen back with key inputs. See docs/demo-mode.md.
          </Text>
          {PROVIDERS.map((p) => (
            <View key={p} style={styles.statusRow}>
              <Text style={styles.statusName}>{p}</Text>
              <Text style={demo.provider === p ? styles.toolOn : styles.toolOff}>
                {demo.provider === p ? "Active" : "Not configured"}
              </Text>
            </View>
          ))}
          {!demo.chatEnabled && (
            <Text style={styles.toggleNote}>
              No demo key is set, so live replies are off. The seeded demo
              chats still show what the app does.
            </Text>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.label}>Active provider</Text>
          <View style={styles.providerRow}>
            {PROVIDERS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setProviderState(p)}
                style={[styles.chip, provider === p && styles.chipActive]}
              >
                <Text style={provider === p ? styles.chipTextActive : styles.chipText}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>

          {PROVIDERS.map((p) => (
            <View key={p} style={{ marginTop: theme.space(4) }}>
              <Text style={styles.label}>{p} API key</Text>
              <TextInput
                style={[styles.input, noFocusRing]}
                value={keys[p] ?? ""}
                onChangeText={(t) => setKeys((k) => ({ ...k, [p]: t }))}
                placeholder="Paste key, or clear to remove"
                placeholderTextColor={theme.colors.faint}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>
          ))}

          <Pressable style={styles.primary} onPress={onSave}>
            <Text style={styles.primaryText}>{saved ? "Saved" : "Save keys"}</Text>
          </Pressable>

          <Text style={styles.note}>
            Keys are stored in your device keychain and sent only to the provider
            you picked, per request. They never touch the database. Concentrate is
            a gateway: one key reaches every major model.
          </Text>
        </>
      )}

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>Bot reminders</Text>
          <Text style={styles.toggleNote}>
            A Convex cron delivers each bot's reminder as a push notification.
            Off silences all of them; per-bot schedules keep ticking.
          </Text>
        </View>
        <Switch
          value={user?.remindersEnabled ?? true}
          onValueChange={(enabled) => {
            if (user) void setRemindersEnabled({ userId: user._id, enabled });
          }}
          trackColor={{ true: theme.colors.ink, false: theme.colors.field }}
          thumbColor={theme.colors.paper}
        />
      </View>

      <View style={styles.toolCard}>
        <Text style={styles.toggleTitle}>App name</Text>
        {demo?.demoMode ? (
          // Read-only in the public demo: show the current wordmark and where
          // the rename lives after a fork. The backend rejects renames too.
          <>
            <Text style={styles.toggleNote}>
              The header wordmark. Renaming is off in this public demo; fork
              the template and this becomes an input.
            </Text>
            <Text style={styles.renameReadOnly}>
              {user?.appName?.trim() ? user.appName : "expo-demo"}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.toggleNote}>
              Forked this template? Rename the header wordmark here. Leave
              empty to keep expo-demo. Demo chats and bots are not affected.
            </Text>
            <View style={styles.renameRow}>
              <TextInput
                style={[styles.input, styles.renameInput, noFocusRing]}
                value={appName}
                onChangeText={setAppNameState}
                placeholder="expo-demo"
                placeholderTextColor={theme.colors.faint}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
              <Pressable
                style={styles.renameButton}
                onPress={() => void onSaveAppName()}
              >
                <Text style={styles.primaryText}>
                  {appNameSaved ? "Saved" : "Save"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      <View style={styles.toolCard}>
        <View style={styles.toolHeader}>
          <Text style={styles.toggleTitle}>AgentMail email</Text>
          <Text
            style={
              agentmail?.configured ? styles.toolOn : styles.toolOff
            }
          >
            {agentmail?.configured ? "Configured" : "Not configured"}
          </Text>
        </View>
        {agentmail?.configured && agentmail.inbox ? (
          <Text style={styles.toolInbox}>{agentmail.inbox}</Text>
        ) : null}
        <Text style={styles.toggleNote}>
          {agentmail?.configured
            ? "Every bot can send from this inbox and read its threads. Powered by the @agentmail/convex component with durable delivery."
            : "A workspace inbox for your bots. In packages/backend run: npx convex env set AGENTMAIL_API_KEY <key> and npx convex env set AGENTMAIL_INBOX_ID <inbox email>. Keys live in Convex env vars, not on this device."}
        </Text>
      </View>

      <View style={styles.toolCard}>
        <View style={styles.toolHeader}>
          <Text style={styles.toggleTitle}>Firecrawl web tools</Text>
          <Text style={firecrawl?.configured ? styles.toolOn : styles.toolOff}>
            {firecrawl?.configured ? "Configured" : "Not configured"}
          </Text>
        </View>
        <Text style={styles.toggleNote}>
          {firecrawl?.configured
            ? "Every bot can fetch pages as markdown and search the web. Powered by the @firecrawl/firecrawl-convex component with typed calls and retries. Skill import also reads URLs through it."
            : "Web scraping and search for your bots. In packages/backend run: npx convex env set FIRECRAWL_API_KEY <fc-... key from firecrawl.dev>. Keys live in Convex env vars, not on this device."}
        </Text>
      </View>

      <Pressable
        style={styles.aboutRow}
        accessibilityLabel="About this app"
        onPress={() => router.push("/about")}
      >
        <Info size={20} color={theme.colors.ink} />
        <Text style={styles.aboutText}>About this template</Text>
        <CaretRight size={16} color={theme.colors.faint} />
      </Pressable>

      <Text style={styles.device}>device {deviceId}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.paper },
  label: {
    color: theme.colors.slate,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: theme.space(2),
  },
  providerRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.space(2) },
  chip: {
    backgroundColor: theme.colors.mist,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space(2),
    paddingHorizontal: theme.space(3.5),
  },
  chipActive: { backgroundColor: theme.colors.ink },
  chipText: { color: theme.colors.ink, fontSize: 13 },
  chipTextActive: { color: theme.colors.onInk, fontWeight: "600", fontSize: 13 },
  input: {
    backgroundColor: theme.colors.field,
    borderRadius: theme.radius.card,
    color: theme.colors.ink,
    padding: theme.space(3),
  },
  primary: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.pill,
    padding: theme.space(3.5),
    alignItems: "center",
    marginTop: theme.space(6),
  },
  primaryText: { color: theme.colors.onInk, fontWeight: "600" },
  note: { color: theme.colors.slate, marginTop: theme.space(4), lineHeight: 20 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    backgroundColor: theme.colors.mist,
    borderRadius: theme.radius.card,
    padding: theme.space(3.5),
    marginTop: theme.space(5),
  },
  toggleTitle: { color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  toggleNote: {
    color: theme.colors.slate,
    fontSize: 12,
    lineHeight: 17,
    marginTop: theme.space(1),
  },
  toolCard: {
    backgroundColor: theme.colors.mist,
    borderRadius: theme.radius.card,
    padding: theme.space(3.5),
    marginTop: theme.space(5),
  },
  toolHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toolOn: { color: theme.colors.ink, fontSize: 12, fontWeight: "500" },
  toolOff: { color: theme.colors.faint, fontSize: 12 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.space(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lineSoft,
  },
  statusName: { color: theme.colors.ink, fontSize: 13 },
  renameRow: {
    flexDirection: "row",
    gap: theme.space(2),
    marginTop: theme.space(2.5),
  },
  renameInput: { flex: 1, backgroundColor: theme.colors.field },
  renameReadOnly: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "500",
    marginTop: theme.space(2.5),
  },
  renameButton: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.space(4),
    justifyContent: "center",
  },
  toolInbox: {
    color: theme.colors.ink,
    ...theme.mono,
    fontSize: 12,
    marginTop: theme.space(1.5),
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(2.5),
    backgroundColor: theme.colors.mist,
    borderRadius: theme.radius.card,
    padding: theme.space(3.5),
    marginTop: theme.space(5),
  },
  aboutText: { flex: 1, color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  device: { color: theme.colors.faint, marginTop: theme.space(4), ...theme.mono, fontSize: 11 },
});
