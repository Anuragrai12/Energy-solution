import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

const DEFAULT_API_ROOT = 'https://brocode.fun/api';
const WEB_KEY = 'es_admin_api_url';
const CONFIG_FILE = 'energy-solution-api.json';

function normalize(value: string) {
  const clean = value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(clean)) throw new Error('API address must start with https:// or http://.');
  return clean;
}

export async function getApiBaseUrl(): Promise<string> {
  try {
    if (Platform.OS === 'web') return normalize(globalThis.localStorage?.getItem(WEB_KEY) || DEFAULT_API_ROOT);
    const file = new File(Paths.document, CONFIG_FILE);
    if (!file.exists) return DEFAULT_API_ROOT;
    const parsed = JSON.parse(await file.text()) as { apiRoot?: string };
    return parsed.apiRoot ? normalize(parsed.apiRoot) : DEFAULT_API_ROOT;
  } catch {
    return DEFAULT_API_ROOT;
  }
}

export async function setApiBaseUrl(value: string): Promise<string> {
  const apiRoot = normalize(value);
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(WEB_KEY, apiRoot);
  else {
    const file = new File(Paths.document, CONFIG_FILE);
    if (!file.exists) file.create();
    file.write(JSON.stringify({ apiRoot }));
  }
  return apiRoot;
}

export async function checkApiConnection(apiRoot: string) {
  const response = await fetch(`${normalize(apiRoot)}/login.php`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  return response.status < 500;
}
