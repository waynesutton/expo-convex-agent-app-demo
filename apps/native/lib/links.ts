// Project links used by the About screen, in one place.
//
// REPO_URL: set this to your GitHub repo URL after you publish (see
// docs/github.md). While it is empty the About screen hides the README and
// docs rows instead of showing dead links.
export const REPO_URL = "https://github.com/waynesutton/expo-convex-agent-app-demo";

export const readmeUrl = () => (REPO_URL ? `${REPO_URL}#readme` : null);
export const docsUrl = () => (REPO_URL ? `${REPO_URL}/tree/main/docs` : null);

// Deep link to the "Fork it and make it yours" section of the README.
export const forkGuideUrl = () =>
  REPO_URL ? `${REPO_URL}#fork-it-and-make-it-yours` : null;

export const CONVEX_DOCS_URL = "https://docs.convex.dev/home";
export const EXPO_DOCS_URL = "https://docs.expo.dev/";

// The landing site lives at the deployment's .convex.site root once
// `npm run site:preview` or `site:deploy` has published it (see
// docs/static-hosting.md). Derived from the Convex URL so it always points
// at the deployment this app talks to. Set LANDING_URL to override, for
// example when the site lives on a custom domain.
export const LANDING_URL = "";

export function landingUrl(): string | null {
  if (LANDING_URL) return LANDING_URL;
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (!convexUrl || !convexUrl.includes(".convex.cloud")) return null;
  return convexUrl.replace(".convex.cloud", ".convex.site");
}
