import type { WeatherSnapshot } from "../types";

type Props = {
  weather: WeatherSnapshot | null;
  photoUrl: string | null;
};

/**
 * Displays weather conditions + optional outfit photo side by side.
 * All weather fields are nullable — renders "?" when data is absent.
 */
export default function WeatherCard({ weather, photoUrl }: Props) {
  if (!weather) {
    return (
      <div style={styles.card}>
        <p style={styles.unavailable}>Weather unavailable</p>
      </div>
    );
  }

  const temp = weather.temp !== null ? `${Math.round(weather.temp)}°C` : "?°C";
  const feelsLike = weather.feels_like !== null ? `${Math.round(weather.feels_like)}°C` : "?°C";
  const humidity = weather.humidity !== null ? `${weather.humidity}%` : "?%";
  const wind = weather.wind_speed !== null ? `${weather.wind_speed} m/s` : "?";
  const condition = weather.condition ?? "?";
  const description = weather.description ?? "";

  return (
    <div style={styles.card}>
      {/* Weather info */}
      <div style={styles.weatherInfo}>
        {/* Temperature — large display */}
        <div style={styles.tempRow}>
          <span style={styles.temp}>{temp}</span>
          <div style={styles.conditionWrap}>
            <span style={styles.condition}>{condition}</span>
            {description && description !== condition && (
              <span style={styles.description}>{description}</span>
            )}
          </div>
        </div>

        {/* Detail chips */}
        <div style={styles.chips}>
          <Chip label="Feels like" value={feelsLike} />
          <Chip label="Humidity" value={humidity} />
          <Chip label="Wind" value={wind} />
        </div>

        {/* City tag */}
        <p style={styles.cityTag}>{weather.city}</p>
      </div>

      {/* Outfit photo */}
      {photoUrl && (
        <img
          src={photoUrl}
          alt="Outfit reference"
          style={styles.photo}
        />
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={chipStyles.chip}>
      <span style={chipStyles.label}>{label}</span>
      <span style={chipStyles.value}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: "flex",
    alignItems: "flex-start",
    gap: "24px",
    padding: "20px 24px",
    background: "var(--accent-bg)",
    border: "1px solid var(--accent-border)",
    borderRadius: "12px",
    flexWrap: "wrap",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  unavailable: {
    margin: 0,
    fontSize: "14px",
    color: "var(--text)",
  },
  weatherInfo: {
    flex: 1,
    minWidth: "180px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  tempRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "12px",
  },
  temp: {
    fontSize: "48px",
    fontWeight: 300,
    color: "var(--text-h)",
    lineHeight: 1,
    letterSpacing: "-2px",
  },
  conditionWrap: {
    display: "flex",
    flexDirection: "column",
    paddingBottom: "6px",
  },
  condition: {
    fontSize: "16px",
    fontWeight: 500,
    color: "var(--text-h)",
  },
  description: {
    fontSize: "13px",
    color: "var(--text)",
    textTransform: "capitalize",
  },
  chips: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  cityTag: {
    margin: 0,
    fontSize: "13px",
    color: "var(--text)",
  },
  photo: {
    width: "200px",
    height: "260px",
    objectFit: "cover",
    borderRadius: "12px",
    flexShrink: 0,
  },
};

const chipStyles: Record<string, React.CSSProperties> = {
  chip: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  label: {
    fontSize: "11px",
    color: "var(--text)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  value: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--text-h)",
  },
};
