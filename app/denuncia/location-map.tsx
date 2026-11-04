"use client";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const center: [number, number] = [-7.1195, -34.845];
// The default map is provided on a best-effort basis by OpenStreetMap.
// A managed tile provider can be configured for institutional operation.
// Both values are public, browser-safe settings; never put a secret API key here.
const providerUrl = process.env.NEXT_PUBLIC_VORTEX_MAP_TILE_URL?.trim() || "";
const providerAttribution = process.env.NEXT_PUBLIC_VORTEX_MAP_ATTRIBUTION?.trim() || "";
const hasCustomProvider = providerUrl.startsWith("https://")
  && ["{z}", "{x}", "{y}"].every(part => providerUrl.includes(part))
  && providerAttribution.length > 0;
const tilesUrl = hasCustomProvider ? providerUrl : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const tilesAttribution = hasCustomProvider
  ? providerAttribution
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

// Embedded marker: the location selector remains usable without third-party icon CDNs.
const markerSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42"><path d="M14 1C6.82 1 1 6.82 1 14c0 10 13 26 13 26s13-16 13-26C27 6.82 21.18 1 14 1z" fill="#0c766d" stroke="#ffffff" stroke-width="2"/><circle cx="14" cy="14" r="5.5" fill="#ffffff"/></svg>';
const icon = L.icon({
  iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
  iconSize: [28, 42],
  iconAnchor: [14, 41],
});

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click(event) { onChange(event.latlng.lat, event.latlng.lng); } });
  return null;
}

function Recenter({ point }: { point: [number, number] | null }) {
  const map = useMapEvents({});
  useEffect(() => { if (point) map.setView(point, 16); }, [map, point]);
  return null;
}

export function LocationMap({
  latitude, longitude, onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const point = useMemo<[number, number] | null>(
    () => latitude !== null && longitude !== null ? [latitude, longitude] : null,
    [latitude, longitude],
  );
  const [tileErrors, setTileErrors] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const mapUnavailable = tileErrors >= 3;

  return <div className="relative mt-3 h-[340px] overflow-hidden rounded-xl border border-slate-200">
    <MapContainer center={center} zoom={12} minZoom={10} maxZoom={19} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        key={retryCount}
        attribution={tilesAttribution}
        url={tilesUrl}
        keepBuffer={1}
        eventHandlers={{
          tileerror: () => setTileErrors((current) => Math.min(3, current + 1)),
          tileload: () => setTileErrors(0),
        }}
      />
      <ClickHandler onChange={onChange} />
      <Recenter point={point} />
      {point && <Marker position={point} draggable icon={icon} eventHandlers={{
        dragend: (event) => {
          const position = event.target.getLatLng();
          onChange(position.lat, position.lng);
        },
      }} />}
    </MapContainer>
    {mapUnavailable && <div role="alert" className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-white/95 px-6 text-center">
      <p className="text-base font-bold text-[#102b42]">Não foi possível carregar o mapa.</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        Você pode continuar a denúncia normalmente informando o endereço, o bairro e um ponto de referência.
        A marcação no mapa é opcional.
      </p>
      <button type="button" onClick={() => { setTileErrors(0); setRetryCount((value) => value + 1); }}
        className="mt-4 min-h-11 rounded-lg border border-[#0c766d] px-4 text-sm font-bold text-[#0c766d]">
        Tentar carregar o mapa novamente
      </button>
    </div>}
  </div>;
}
