import type { ReactNode } from "react";
type IconProps = { children: ReactNode; className?: string };
function Icon({ children, className = "size-5" }: IconProps) { return <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">{children}</svg>; }
export const ArrowRight = () => <Icon><path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></Icon>;
export const Shield = () => <Icon><path d="M12 3 20 6v5.5c0 4.8-3.2 8.5-8 10.2-4.8-1.7-8-5.4-8-10.2V6l8-3Z" strokeLinejoin="round" /><path d="m8.5 12 2.3 2.3 4.8-5" strokeLinecap="round" strokeLinejoin="round" /></Icon>;
export const FileText = () => <Icon><path d="M6 3h8l4 4v14H6z" strokeLinejoin="round" /><path d="M14 3v5h5M9 13h6m-6 4h6" strokeLinecap="round" /></Icon>;
export const Clock = () => <Icon><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" /></Icon>;
export const MapPin = () => <Icon><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" /></Icon>;
export const People = () => <Icon><path d="M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19" strokeLinecap="round" /><circle cx="9.5" cy="7" r="3.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 6.8m4 7.7v-1.5a4 4 0 0 0-2.5-3.7" strokeLinecap="round" /></Icon>;
export const Car = () => <Icon><path d="m5 16 1.4-6h11.2L19 16" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.5 16h17v4h-2v-2h-13v2h-2z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="7" cy="16" r="1" fill="currentColor" /><circle cx="17" cy="16" r="1" fill="currentColor" /></Icon>;
export const Lock = () => <Icon><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" /></Icon>;
