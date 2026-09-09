"use client";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const center: [number, number] = [-7.1195, -34.845];
const icon = L.icon({ iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png", shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41] });
function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) { useMapEvents({ click(event) { onChange(event.latlng.lat, event.latlng.lng); } }); return null; }
function Recenter({ point }: { point: [number, number] | null }) { const map = useMapEvents({}); useEffect(() => { if (point) map.setView(point, 16); }, [map, point]); return null; }
export function LocationMap({ latitude, longitude, onChange }: { latitude: number | null; longitude: number | null; onChange: (lat: number, lng: number) => void }) { const point = useMemo<[number, number] | null>(() => latitude !== null && longitude !== null ? [latitude, longitude] : null, [latitude, longitude]); return <div className="mt-3 h-[340px] overflow-hidden rounded-xl border border-slate-200"><MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><ClickHandler onChange={onChange} /><Recenter point={point} />{point && <Marker position={point} draggable icon={icon} eventHandlers={{ dragend: (event) => { const position = event.target.getLatLng(); onChange(position.lat, position.lng); } }} />}</MapContainer></div>; }
