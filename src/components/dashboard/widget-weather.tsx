"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  MapPin,
  Loader2,
  Search,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { saveWeatherLocation } from "@/lib/actions/weather";
import {
  DEFAULT_WEATHER_LOCATION,
  type WeatherLocation,
} from "@/lib/weather-location";

type WeatherCode =
  | 0
  | 1
  | 2
  | 3
  | 45
  | 48
  | 51
  | 53
  | 55
  | 61
  | 63
  | 65
  | 66
  | 67
  | 71
  | 73
  | 75
  | 77
  | 80
  | 81
  | 82
  | 85
  | 86
  | 95
  | 96
  | 99;

function describe(
  code: WeatherCode
): { icon: React.ComponentType<{ className?: string }>; label: string } {
  switch (code) {
    case 0:
      return { icon: Sun, label: "Senin" };
    case 1:
    case 2:
      return { icon: CloudSun, label: "Parțial noros" };
    case 3:
      return { icon: Cloud, label: "Noros" };
    case 45:
    case 48:
      return { icon: CloudFog, label: "Ceață" };
    case 51:
    case 53:
    case 55:
      return { icon: CloudRain, label: "Burniță" };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return { icon: CloudRain, label: "Ploaie" };
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return { icon: CloudSnow, label: "Ninsoare" };
    case 95:
    case 96:
    case 99:
      return { icon: CloudLightning, label: "Furtună" };
    default:
      return { icon: Cloud, label: "Înnorat" };
  }
}

interface DayForecast {
  date: string;
  code: WeatherCode;
  tMax: number;
  tMin: number;
  isToday: boolean;
}

interface WeatherData {
  temperature: number;
  apparent: number;
  code: WeatherCode;
  windSpeed: number;
  humidity: number;
  isDay: boolean;
  days: DayForecast[];
}

interface CityResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

function dayLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return "Astăzi";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ro-RO", { weekday: "long" }).toLowerCase();
}

export function WeatherWidget({
  initialLocation,
}: {
  initialLocation: WeatherLocation | null;
}) {
  const [loc, setLoc] = useState<WeatherLocation>(
    initialLocation ?? DEFAULT_WEATHER_LOCATION
  );
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [searchingCities, setSearchingCities] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (query.trim().length < 2 || !searching) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSearchingCities(true);
      try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.searchParams.set("name", query.trim());
        url.searchParams.set("count", "5");
        url.searchParams.set("language", "ro");
        const r = await fetch(url);
        const j = r.ok ? await r.json() : { results: [] };
        setResults(Array.isArray(j.results) ? j.results : []);
      } catch {
        setResults([]);
      } finally {
        setSearchingCities(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, searching]);

  useEffect(() => {
    let cancelled = false;

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(loc.lat));
    url.searchParams.set("longitude", String(loc.lon));
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day"
    );
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min"
    );
    url.searchParams.set("forecast_days", "5");
    url.searchParams.set("timezone", "auto");

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (cancelled) return;
        const c = j.current;
        const days: DayForecast[] = (j.daily?.time ?? []).map(
          (date: string, i: number) => ({
            date,
            code: (j.daily.weather_code?.[i] ?? 0) as WeatherCode,
            tMax: j.daily.temperature_2m_max?.[i] ?? 0,
            tMin: j.daily.temperature_2m_min?.[i] ?? 0,
            isToday: i === 0,
          })
        );
        setData({
          temperature: c.temperature_2m,
          apparent: c.apparent_temperature,
          code: c.weather_code as WeatherCode,
          windSpeed: c.wind_speed_10m,
          humidity: c.relative_humidity_2m,
          isDay: c.is_day === 1,
          days,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loc.lat, loc.lon]);

  async function choose(city: CityResult) {
    const next: WeatherLocation = {
      lat: city.latitude,
      lon: city.longitude,
      label: [city.name, city.admin1, city.country]
        .filter(Boolean)
        .join(", "),
    };
    setLoading(true);
    setError(false);
    setLoc(next);
    setSearching(false);
    setQuery("");
    setResults([]);
    const res = await saveWeatherLocation(next);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  return (
    <WidgetShell
      title="Vremea"
      icon={<MapPin className="h-4 w-4 text-accent" />}
      className="h-full"
      action={
        <button
          type="button"
          onClick={() => setSearching((s) => !s)}
          aria-label="Schimbă orașul"
          className="flex h-7 w-7 items-center justify-center rounded-full text-subtle hover:bg-ink/5 hover:text-ink"
        >
          {searching ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </button>
      }
    >
      {searching && (
        <div className="relative mb-3">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < 2) setResults([]);
            }}
            autoFocus
            placeholder="Caută un oraș…"
            className="w-full rounded-xl border border-feather bg-card px-3 py-2 text-sm font-semibold text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {results.length > 0 && (
            <ul className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-feather bg-card shadow-xl">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => choose(r)}
                    className="w-full px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
                  >
                    {r.name}
                    <span className="block text-xs font-medium text-subtle">
                      {[r.admin1, r.country].filter(Boolean).join(", ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length >= 2 && !results.length && !searchingCities && (
            <p className="mt-1 text-xs text-subtle">Niciun oraș găsit.</p>
          )}
        </div>
      )}

      {loading && !data && (
        <div className="flex flex-1 items-center justify-center text-subtle">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
      {error && (
        <p className="text-sm text-subtle">
          Vremea nu este disponibilă momentan.
        </p>
      )}
      {data && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <WeatherIcon code={data.code} isDay={data.isDay} />
              <div>
                <p className="text-3xl font-extrabold text-ink">
                  {Math.round(data.temperature)}°C
                </p>
                <p className="text-xs font-bold text-subtle">
                  {describe(data.code).label}
                </p>
              </div>
            </div>
            <div className="space-y-1 text-right text-xs font-semibold text-subtle">
              <p>💧 {data.humidity}% umiditate</p>
              <p>💨 {Math.round(data.windSpeed)} km/h vânt</p>
              <p>Simțit {Math.round(data.apparent)}°C</p>
            </div>
          </div>

          <div className="mt-auto flex flex-1 flex-col justify-end gap-1.5">
            {data.days.map((d) => (
              <div
                key={d.date}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm",
                  d.isToday ? "bg-accent/10" : "inset"
                )}
              >
                <span
                  className={cn(
                    "w-20 font-bold uppercase tracking-wide",
                    d.isToday ? "text-accent" : "text-subtle"
                  )}
                >
                  {dayLabel(d.date, d.isToday)}
                </span>
                <span className="flex items-center gap-1.5 text-ink">
                  {(() => {
                    const I = describe(d.code).icon;
                    return <I className="h-4 w-4" />;
                  })()}
                </span>
                <span className="text-xs font-semibold text-subtle">
                  {Math.round(d.tMin)}°{" "}
                  <span className="font-extrabold text-ink">
                    {Math.round(d.tMax)}°
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        {saved ? (
          <span className="text-[11px] font-semibold text-success">
            <Check className="mr-1 inline h-3 w-3" /> Salvat
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-subtle">
            {loc.label}
          </span>
        )}
      </div>
    </WidgetShell>
  );
}

function WeatherIcon({ code, isDay }: { code: WeatherCode; isDay: boolean }) {
  const { icon: Icon } = describe(code);
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
      <Icon className={cn("h-8 w-8", !isDay && code === 0 && "text-ink")} />
    </span>
  );
}