import { motion } from "framer-motion";
import type { WeatherSnapshot } from "../types";

type Props = {
  weather: WeatherSnapshot | null;
  photoUrl: string | null;
};

/** Maps OpenWeatherMap condition names to display emojis */
const conditionEmoji: Record<string, string> = {
  Clear:         "☀️",
  Clouds:        "☁️",
  Rain:          "🌧️",
  Snow:          "❄️",
  Thunderstorm:  "⛈️",
  Drizzle:       "🌦️",
  Mist:          "🌫️",
  Fog:           "🌫️",
  Haze:          "🌫️",
  Smoke:         "🌫️",
  Dust:          "🌫️",
  Sand:          "🌫️",
  Ash:           "🌫️",
  Squall:        "💨",
  Tornado:       "🌪️",
};

function getEmoji(condition: string | null): string {
  if (!condition) return "⛅";
  return conditionEmoji[condition] ?? "⛅";
}

/**
 * Displays weather conditions + optional outfit photo.
 * Gradient card with stat mini-chips and portrait photo.
 */
export default function WeatherCard({ weather, photoUrl }: Props) {
  if (!weather) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="p-5 bg-gradient-to-br from-primary-light to-white border border-primary/20 rounded-2xl"
      >
        <p className="text-sm text-text-muted">Weather unavailable</p>
      </motion.div>
    );
  }

  const temp       = weather.temp       !== null ? `${Math.round(weather.temp)}°C`      : "?°C";
  const feelsLike  = weather.feels_like !== null ? `${Math.round(weather.feels_like)}°C` : "?°C";
  const humidity   = weather.humidity   !== null ? `${weather.humidity}%`                : "?%";
  const wind       = weather.wind_speed !== null ? `${weather.wind_speed} m/s`           : "?";
  const condition  = weather.condition  ?? "?";
  const description = weather.description ?? "";
  const emoji      = getEmoji(weather.condition);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-6 flex-wrap p-6 bg-gradient-to-br from-primary-light to-white border border-primary/20 rounded-2xl"
    >
      {/* Weather info column */}
      <div className="flex-1 min-w-[180px] flex flex-col gap-4">
        {/* Temperature + condition */}
        <div className="flex items-end gap-3">
          <span className="text-5xl font-bold text-primary leading-none tracking-tight">
            {temp}
          </span>
          <div className="flex flex-col pb-1">
            <span className="text-4xl leading-none">{emoji}</span>
          </div>
          <div className="flex flex-col pb-1">
            <span className="text-base font-semibold text-gray-800">{condition}</span>
            {description && description !== condition && (
              <span className="text-xs text-text-muted capitalize">{description}</span>
            )}
          </div>
        </div>

        {/* Stat mini-cards */}
        <div className="flex gap-2.5 flex-wrap">
          <StatChip label="Feels like" value={feelsLike} />
          <StatChip label="Humidity"   value={humidity} />
          <StatChip label="Wind"       value={wind} />
        </div>

        {/* City tag */}
        <p className="text-xs text-text-muted">📍 {weather.city}</p>
      </div>

      {/* Outfit photo — portrait aspect */}
      {photoUrl && (
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <img
            src={photoUrl}
            alt="Outfit reference"
            className="w-[180px] h-60 object-cover rounded-xl shadow-md"
          />
          <p className="text-xs text-text-muted italic text-center">
            Outfit inspiration
          </p>
        </div>
      )}
    </motion.div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col gap-0.5 min-w-[72px]">
      <span className="text-[10px] text-text-muted uppercase tracking-wide font-medium">
        {label}
      </span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
