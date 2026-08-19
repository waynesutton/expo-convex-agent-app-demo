import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

// BYOK storage. Keys live in the platform keychain via expo-secure-store and
// never leave the device except inside a runAgent request. See docs/byok.md.
//
// Web preview: expo-secure-store has no web implementation, so we fall back
// to localStorage. That is fine for previewing on your own machine. Treat
// real keys on web with the same care you would any browser storage.

const DEVICE_ID = "expo-demo.deviceId";
const PROVIDER = "expo-demo.provider";
const keyName = (provider: string) => `expo-demo.key.${provider}`;

const isWeb = Platform.OS === "web";

async function storeGet(key: string): Promise<string | null> {
  if (isWeb) return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function storeSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storeDelete(key: string): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// concentrate is an LLM gateway (https://concentrate.ai): one key, every
// major model, OpenAI compatible. Same BYOK rules as the direct providers.
export type Provider =
  | "anthropic"
  | "openai"
  | "xai"
  | "openrouter"
  | "concentrate";
export const PROVIDERS: Provider[] = [
  "anthropic",
  "openai",
  "xai",
  "openrouter",
  "concentrate",
];

export async function getDeviceId(): Promise<string> {
  const existing = await storeGet(DEVICE_ID);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await storeSet(DEVICE_ID, id);
  return id;
}

export async function getProvider(): Promise<Provider> {
  return ((await storeGet(PROVIDER)) as Provider) ?? "anthropic";
}

export async function setProvider(provider: Provider): Promise<void> {
  await storeSet(PROVIDER, provider);
}

export async function getApiKey(provider: Provider): Promise<string | null> {
  return storeGet(keyName(provider));
}

export async function setApiKey(provider: Provider, key: string): Promise<void> {
  if (key.trim() === "") {
    await storeDelete(keyName(provider));
    return;
  }
  await storeSet(keyName(provider), key.trim());
}
