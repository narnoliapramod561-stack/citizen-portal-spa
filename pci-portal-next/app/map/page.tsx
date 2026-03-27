"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { useSearchParams } from 'next/navigation';
import { MapPin, Navigation, Info } from 'lucide-react';

// Dynamic import for Leaflet map for SSR compatibility
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });

// Helper: Haversine distance in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface Bin {
  id: string;
  lat: number;
  long: number;
  type: string;
  name: string;
  source: string;
  distance: number;
}

interface PCUPoint {
  id: string;
  lat: number;
  long: number;
  plastic_type: string;
  amount: number;
}

const defaultLocation: [number, number] = [28.6139, 77.2090];

function MapPageContent() {
  const searchParams = useSearchParams();
  const detectedType = searchParams.get('type') || 'all';
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [bins, setBins] = useState<Bin[]>([]);
  const [pcuPoints, setPcuPoints] = useState<PCUPoint[]>([]);
  const [filter] = useState(detectedType);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    // 1. Get User Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => {
          console.warn("Location denied:", err);
          setPermissionError(true);
          setUserLocation(defaultLocation);
        }
      );
    }

    // 2. Load Bins from existing Flask API (local fallback)
    async function loadBins() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/bins/nearby?type=${filter}`);
        const data = await response.json();
        if (data.bins) setBins(data.bins);
      } catch (err) {
        console.error("API Error fetching bins:", err);
      } finally {
        setLoading(false);
      }
    }
    
    async function loadPCUs() {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/heatmap`);
            const data = await response.json();
            if (data.points) setPcuPoints(data.points);
        } catch (err) {
            console.error("API Error fetching PCUs:", err);
        }
    }

    loadBins();
    loadPCUs();

    // Leaflet icon fix
    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    });
  }, [filter]);

  // Calculate nearest bin
  const sortedBins = useMemo(() => {
    if (!userLocation) return [];
    return bins.map(b => ({
      ...b,
      distance: getDistance(userLocation[0], userLocation[1], b.lat, b.long)
    })).sort((a, b) => a.distance - b.distance);
  }, [bins, userLocation]);

  const nearestBin = sortedBins[0];

  return (
    <main className="min-h-screen bg-black text-white p-6 pb-24">
      <header className="mb-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent leading-none">
              Spatial Grid
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Real-time PCU Distribution & Collection Gaps</p>
          </div>
          <div className="text-right">
             <div className="text-2xl font-black font-mono leading-none">{pcuPoints.length}</div>
             <div className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Verified Points</div>
          </div>
        </div>
        {permissionError && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[10px] text-yellow-500 font-bold flex items-center gap-2">
             <Info className="w-3 h-3" /> Enable GPS for real-time routing from your current spot.
          </div>
        )}
      </header>

      {/* Map Container */}
      <div className="w-full h-[400px] rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl relative">
        {!loading && userLocation ? (
          <MapContainer center={userLocation} zoom={13} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            {/* User Location Marker (Blue) */}
            <Marker position={userLocation}>
               <Popup>You are here</Popup>
            </Marker>
            <Circle center={userLocation} radius={2000} pathOptions={{ color: '#10b981', weight: 1, fillColor: '#10b981', fillOpacity: 0.05 }} />

            {/* PCU Verified Grid Points (Spatial Intelligence) */}
            {pcuPoints.map((pcu) => (
              <Circle 
                key={pcu.id} 
                center={[pcu.lat, pcu.long]} 
                radius={50} 
                pathOptions={{ color: '#06b6d4', weight: 1, fillColor: '#06b6d4', fillOpacity: 0.6 }}
              >
                <Popup>
                   <div className="text-[10px] text-slate-800">
                      <div className="font-black uppercase text-cyan-600">Verified PCU Artifact</div>
                      <div>Type: {pcu.plastic_type}</div>
                      <div>Credits: {pcu.amount}</div>
                      <div className="mt-1 font-mono text-slate-400">ID: {pcu.id.slice(0,8)}</div>
                   </div>
                </Popup>
              </Circle>
            ))}

            {/* Bin Markers */}
            {sortedBins.map((bin) => {
              const matchesType = filter === 'all' || bin.type === 'plastic' || bin.type === 'mixed';
              if (!matchesType) return null;

              return (
                <Marker key={bin.id} position={[bin.lat, bin.long]}>
                   <Popup className="custom-popup">
                      <div className="text-slate-900 min-w-[150px]">
                        <div className="font-bold flex justify-between items-center">
                           <span>{bin.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-black mb-2">{bin.source} ({bin.type})</div>
                        <div className="text-xs font-bold text-emerald-600 mb-3">{bin.distance ? bin.distance.toFixed(1) : "0.0"} km away</div>
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${bin.lat},${bin.long}`}
                          target="_blank"
                          className="w-full py-2 bg-slate-900 text-white rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold"
                        >
                          <Navigation className="w-3 h-3" /> NAVIGATE
                        </a>
                      </div>
                   </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900">
             <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-sm font-bold text-slate-500">TRIANGULATING POSITION...</p>
          </div>
        )}
      </div>

      {/* Bottom Sheet UI for Nearest Bin */}
      {nearestBin && (
        <div className="mt-8">
           <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest px-2">Nearest Collection Point</h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full font-bold">SMART MATCH</span>
           </div>
           
           <div className="p-6 bg-slate-900 border border-slate-800 rounded-[32px] flex items-center justify-between group active:scale-95 transition-transform duration-200">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                    <MapPin className="w-7 h-7" />
                 </div>
                 <div>
                    <h4 className="text-lg font-black">{nearestBin.name}</h4>
                    <p className="text-xs text-slate-500">{nearestBin.distance ? nearestBin.distance.toFixed(2) : "0.00"} km • {nearestBin.type === 'plastic' ? 'Accepts All Polymers' : 'Mixed Waste'}</p>
                 </div>
              </div>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${nearestBin.lat},${nearestBin.long}`} 
                target="_blank"
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-slate-950 transition-colors"
                >
                <Navigation className="w-5 h-5" />
              </a>
           </div>
        </div>
      )}

      {sortedBins.length === 0 && !loading && (
        <div className="mt-12 text-center p-10 border border-dashed border-slate-800 rounded-3xl">
           <p className="text-slate-500 italic">No verified collection points found within 5km for your detected material type `{filter}`.</p>
        </div>
      )}
    </main>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <MapPageContent />
    </Suspense>
  );
}
