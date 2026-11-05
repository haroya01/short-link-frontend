import type { LatLng } from "./place";

type Listener = { remove(): void };

export type MapClick = {
  latLng: { lat(): number; lng(): number } | null;
  placeId?: string;
  stop?(): void;
};

export type GoogleMap = {
  addListener(event: string, handler: (event: MapClick) => void): Listener;
  panTo(position: LatLng): void;
  setCenter(position: LatLng): void;
  setZoom(zoom: number): void;
  getZoom(): number | undefined;
};

export type MapPin = {
  setPosition(position: LatLng | null): void;
  setMap(map: GoogleMap | null): void;
};

type GeocodeResult = { place_id: string; formatted_address: string };

export type MapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
  Marker: new (options: Record<string, unknown>) => MapPin;
  Geocoder: new () => {
    geocode(request: { location: LatLng; language?: string }): Promise<{ results: GeocodeResult[] }>;
  };
};

type ImportLibrary = (name: string) => Promise<Record<string, unknown>>;

declare global {
  interface Window {
    google?: { maps?: { importLibrary?: ImportLibrary } };
    gm_authFailure?: () => void;
    __kurlMapsReady?: () => void;
  }
}

let loading: Promise<MapsApi> | null = null;
let failed = false;
const failureListeners = new Set<() => void>();

function markFailed() {
  failed = true;
  failureListeners.forEach((listener) => listener());
}

export function mapsJsFailed(): boolean {
  return failed;
}

export function onMapsJsFailure(listener: () => void): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

export function loadMapsJs(key: string, language: string): Promise<MapsApi> {
  if (!key || failed) return Promise.reject(new Error("maps js unavailable"));
  loading ??= new Promise<void>((resolve, reject) => {
    window.gm_authFailure = markFailed;
    if (window.google?.maps?.importLibrary) {
      resolve();
      return;
    }
    window.__kurlMapsReady = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&language=${encodeURIComponent(language)}&callback=__kurlMapsReady`;
    script.async = true;
    script.onerror = () => reject(new Error("maps js script failed"));
    document.head.append(script);
  })
    .then(async () => {
      const importLibrary = window.google?.maps?.importLibrary;
      if (!importLibrary) throw new Error("maps js missing importLibrary");
      const [maps, marker, geocoding] = await Promise.all([
        importLibrary("maps"),
        importLibrary("marker"),
        importLibrary("geocoding"),
      ]);
      return { Map: maps.Map, Marker: marker.Marker, Geocoder: geocoding.Geocoder } as MapsApi;
    })
    .catch((error: unknown) => {
      markFailed();
      throw error;
    });
  return loading;
}
