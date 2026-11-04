"use client";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const center: [number, number] = [-7.1195, -34.845];
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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
    <MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        key={retryCount}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{
          tileerror: () => setTileErrors((current) => Math.min(3, current + 1)),
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
