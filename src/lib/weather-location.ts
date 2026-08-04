export interface WeatherLocation {
  lat: number;
  lon: number;
  label: string;
}

export const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  lat: 44.4268,
  lon: 26.1025,
  label: "București",
};

export function isWeatherLocation(v: unknown): v is WeatherLocation {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.lat === "number" &&
    Number.isFinite(o.lat) &&
    Math.abs(o.lat) <= 90 &&
    typeof o.lon === "number" &&
    Number.isFinite(o.lon) &&
    Math.abs(o.lon) <= 180 &&
    typeof o.label === "string" &&
    o.label.trim().length > 0 &&
    o.label.length <= 80
  );
}
