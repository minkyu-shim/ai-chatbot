// Shared types matching the backend Pydantic schemas

export type UserPublic = {
  id: number;
  email: string;
  role: "admin" | "user";
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  user: UserPublic;
};

// ── Diary types ───────────────────────────────────────────────────────────────

export type WeatherSnapshot = {
  city: string;
  temp: number | null;
  feels_like: number | null;
  humidity: number | null;
  condition: string | null;
  description: string | null;
  wind_speed: number | null;
  raw?: Record<string, unknown>;
};

export type EntryMessage = {
  id: number;
  role: "system" | "user" | "assistant";
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type Entry = {
  id: number;
  entry_date: string;
  city: string;
  mood: string;
  weather: WeatherSnapshot | null;
  outfit_worn: string | null;
  photo_url: string | null;
  reflection: string | null;
  model: string;
  created_at: string;
  updated_at: string;
  messages: EntryMessage[];
};

export type EntrySummary = {
  id: number;
  entry_date: string;
  city: string;
  mood: string;
  weather: WeatherSnapshot | null;
  photo_url: string | null;
  created_at: string;
  ai_preview: string | null;
};

export type EntryCreate = {
  city: string;
  mood: string;
  outfit_worn?: string | null;
  entry_date?: string | null;
};

export type EntryUpdate = {
  outfit_worn?: string | null;
  reflection?: string | null;
};
