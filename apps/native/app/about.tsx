import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ArrowSquareOut,
  BookOpen,
  FileText,
  GitFork,
  Globe,
  Lightning,
  Stack as StackIcon,
} from "phosphor-react-native";
import {
  CONVEX_DOCS_URL,
  EXPO_DOCS_URL,
  docsUrl,
  forkGuideUrl,
  landingUrl,
  readmeUrl,
} from "@/lib/links";
import { theme } from "@/lib/theme";

// About: what this template is and where the docs live. Repo links appear
// once REPO_URL is set in lib/links.ts (after publishing to GitHub).
export default function About() {
  const readme = readmeUrl();
  const docs = docsUrl();
  const forkGuide = forkGuideUrl();
  const landing = landingUrl();

  const rows: Array<{
    icon: React.ReactNode;
    label: string;
    detail: string;
    url: string;
  }> = [
    ...(landing
      ? [
          {
            icon: <Globe size={20} color={theme.colors.ink} />,
            label: "Landing page",
            detail: "The website for this template, hosted on Convex",
            url: landing,
          },
        ]
      : []),
    ...(readme
      ? [
          {
            icon: <FileText size={20} color={theme.colors.ink} />,
            label: "README",
            detail: "Setup, keys, and the rules of this repo",
            url: readme,
          },
        ]
      : []),
    ...(forkGuide
      ? [
          {
            icon: <GitFork size={20} color={theme.colors.ink} />,
            label: "Fork this template",
            detail: "Copy it, rename it, and make it yours",
            url: forkGuide,
          },
        ]
      : []),
    ...(docs
      ? [
          {
            icon: <BookOpen size={20} color={theme.colors.ink} />,
            label: "Project docs",
            detail: "BYOK, agent loop, integrations, deploy",
            url: docs,
          },
        ]
      : []),
    {
      icon: <Lightning size={20} color={theme.colors.ink} />,
      label: "Convex docs",
      detail: "The reactive backend this app runs on",
      url: CONVEX_DOCS_URL,
    },
    {
      icon: <StackIcon size={20} color={theme.colors.ink} />,
      label: "Expo docs",
      detail: "One codebase for iOS, Android, and web",
      url: EXPO_DOCS_URL,
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: theme.space(4) }}
    >
      <Text style={styles.brand}>expo-demo</Text>
      <Text style={styles.tagline}>
        A team of AI bots in a chat app. Expo on the front, Convex on the back,
        your API keys in your pocket.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How it works</Text>
        <Text style={styles.cardBody}>
          Create bots with a name and a job, message them like coworkers, or
          put several in one thread and let them coordinate. Model keys stay in
          your device keychain and ride each request; they never touch the
          database. Workspace tools like web search, email, business data, and
          image generation light up when their keys are set on the backend.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Learn more</Text>
      {rows.map((row) => (
        <Pressable
          key={row.label}
          style={styles.linkRow}
          accessibilityLabel={`Open ${row.label}`}
          onPress={() => Linking.openURL(row.url)}
        >
          <View style={styles.linkIcon}>{row.icon}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkLabel}>{row.label}</Text>
            <Text style={styles.linkDetail}>{row.detail}</Text>
          </View>
          <ArrowSquareOut size={16} color={theme.colors.faint} />
        </Pressable>
      ))}

      {!readme && (
        <Text style={styles.hint}>
          Publish this repo to GitHub, then set REPO_URL in lib/links.ts to
          link your README, fork guide, and docs here.
        </Text>
      )}

      <Text style={styles.footer}>MIT licensed. Fork it and build.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.paper },
  brand: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: "600",
    ...theme.mono,
  },
  tagline: {
    color: theme.colors.slate,
    fontSize: 14,
    lineHeight: 21,
    marginTop: theme.space(1.5),
  },
  card: {
    backgroundColor: theme.colors.mist,
    borderRadius: theme.radius.card,
    padding: theme.space(4),
    marginTop: theme.space(5),
  },
  cardTitle: { color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  cardBody: {
    color: theme.colors.slate,
    fontSize: 13,
    lineHeight: 20,
    marginTop: theme.space(2),
  },
  sectionLabel: {
    color: theme.colors.slate,
    fontSize: 13,
    fontWeight: "500",
    marginTop: theme.space(6),
    marginBottom: theme.space(2),
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space(3),
    paddingVertical: theme.space(3),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.lineSoft,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  linkLabel: { color: theme.colors.ink, fontSize: 14, fontWeight: "600" },
  linkDetail: { color: theme.colors.slate, fontSize: 12, marginTop: 1 },
  hint: {
    color: theme.colors.faint,
    fontSize: 12,
    lineHeight: 18,
    marginTop: theme.space(4),
    ...theme.mono,
  },
  footer: {
    color: theme.colors.faint,
    fontSize: 12,
    marginTop: theme.space(6),
    marginBottom: theme.space(8),
  },
});
