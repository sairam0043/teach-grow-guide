import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Tutor } from "@/data/mockTutors";
import { getTutorCoordinates, getCityCoordinates } from "@/utils/geocoding";
import { resolveAssetUrl } from "@/lib/assetUrl";
import { useNavigate } from "react-router-dom";

// Standard icon assets in Leaflet can be broken due to Vite bundling,
// so we use a custom SVG/HTML divIcon for a modern, beautifully styled avatar marker.
const createTutorMarkerIcon = (tutor: Tutor) => {
  const photoUrl = resolveAssetUrl(tutor.photo) || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random`;
  
  return L.divIcon({
    html: `
      <div class="relative flex flex-col items-center select-none group">
        <!-- Pin Container -->
        <div class="w-11 h-11 rounded-full border-2 border-primary bg-background shadow-md overflow-hidden transition-all duration-300 transform group-hover:scale-115 group-hover:shadow-lg group-hover:border-primary-foreground flex items-center justify-center shrink-0">
          <img src="${photoUrl}" alt="${tutor.name}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random';" />
        </div>
        <!-- Pointer Arrow -->
        <div class="w-2.5 h-2.5 bg-primary rotate-45 -mt-1 shadow-sm border-r border-b border-primary/20"></div>
        <!-- Hover tooltip -->
        <div class="absolute bottom-full mb-2 bg-popover text-popover-foreground text-[10px] font-bold py-1 px-2 rounded shadow-md border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          ${tutor.name} (${tutor.rating}★)
        </div>
      </div>
    `,
    className: "custom-tutor-marker-icon",
    iconSize: [44, 52],
    iconAnchor: [22, 52],
    popupAnchor: [0, -52],
  });
};

interface TutorMapViewProps {
  tutors: Tutor[];
  selectedCity: string;
}

export default function TutorMapView({ tutors, selectedCity }: TutorMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const navigate = useNavigate();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Clean up any residual leaflet state on the container to prevent StrictMode double-init crash
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    // Use selected city coordinates as default center, or Bangalore
    const initialCenter = selectedCity && selectedCity !== "all" 
      ? getCityCoordinates(selectedCity) 
      : getCityCoordinates("bangalore");

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: selectedCity && selectedCity !== "all" ? 12 : 11,
      zoomControl: false, // Position zoom control bottom-right
      attributionControl: true,
    });

    // Add clean map tiles (CartoDB Positron is beautiful, light-themed, and fits modern glassmorphism UI)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Add zoom control at bottom-right
    L.control.zoom({
      position: "bottomright"
    }).addTo(map);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // Update center when selected city changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (selectedCity && selectedCity !== "all") {
      const cityCoords = getCityCoordinates(selectedCity);
      mapRef.current.setView(cityCoords, 12, { animate: true });
    } else if (tutors.length > 0) {
      // Auto-fit to bounds of present tutors if no city selected
      const bounds = L.latLngBounds(tutors.map(t => getTutorCoordinates(t)));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
    }
  }, [selectedCity]);

  // Update Markers when tutors list changes
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear old markers
    markersLayer.clearLayers();

    if (tutors.length === 0) return;

    tutors.forEach((tutor) => {
      const coords = getTutorCoordinates(tutor);
      const icon = createTutorMarkerIcon(tutor);
      const photoUrl = resolveAssetUrl(tutor.photo) || 
        `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random`;
      
      const rates = (tutor as any).subjectRates?.map((sr: any) => sr.rate) || [];
      const rateDisplay = rates.length === 0 
        ? `₹${tutor.hourlyRate || 500}` 
        : rates.length === 1 
          ? `₹${rates[0]}` 
          : `₹${Math.min(...rates)} - ₹${Math.max(...rates)}`;

      // Setup custom popup HTML
      const popupContent = `
        <div class="p-3 w-56 text-foreground font-sans bg-background rounded-lg">
          <div class="flex items-center gap-3 mb-2 pb-2 border-b border-border/40">
            <img src="${photoUrl}" class="w-10 h-10 rounded-full object-cover border border-primary/20 shadow-sm" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.name)}&background=random';" />
            <div class="leading-normal">
              <h4 class="font-bold text-sm text-foreground m-0 leading-tight truncate max-w-[130px] capitalize">${tutor.name}</h4>
              <p class="text-[10px] text-muted-foreground m-0 font-medium capitalize mt-0.5">${tutor.category}</p>
            </div>
          </div>
          <div class="space-y-1.5 mb-3 text-xs text-muted-foreground leading-normal">
            <div class="flex items-center gap-1 text-[11px]">
              <span class="text-amber-500 font-bold">${tutor.rating}★</span>
              <span>(${tutor.reviewCount || 0} reviews)</span>
              <span class="text-muted-foreground/30 font-light">|</span>
              <span>${tutor.experience} yrs exp</span>
            </div>
            <p class="m-0 flex items-center gap-1.5 truncate">
              <span>📍</span> 
              <span class="font-medium text-foreground">${tutor.city}</span>
            </p>
            <p class="m-0 flex items-center gap-1.5">
              <span>💰</span> 
              <span class="font-semibold text-primary">${rateDisplay}/hr</span>
            </p>
            <p class="m-0 flex items-center gap-1.5 truncate" title="${tutor.subjects?.join(', ')}">
              <span>📚</span> 
              <span class="truncate">${tutor.subjects?.slice(0, 2).join(', ')}${(tutor.subjects?.length || 0) > 2 ? '...' : ''}</span>
            </p>
          </div>
          <button id="marker-popup-btn-${tutor.id}" class="w-full text-center bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs py-2 px-3 rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer block border-0 outline-none">
            Book Free Demo
          </button>
        </div>
      `;

      const marker = L.marker(coords, { icon })
        .bindPopup(popupContent, {
          closeButton: false,
          minWidth: 240,
          maxWidth: 240,
          className: "custom-leaflet-popup shadow-md border rounded-xl overflow-hidden"
        })
        .addTo(markersLayer);

      // Listen to popup open to bind button click handler
      marker.on("popupopen", () => {
        const btn = document.getElementById(`marker-popup-btn-${tutor.id}`);
        if (btn) {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            navigate(`/tutors/${tutor.id}`);
          });
        }
      });
    });

    // Auto-fit bounds if a city filter is NOT active
    if ((!selectedCity || selectedCity === "all") && tutors.length > 0) {
      const bounds = L.latLngBounds(tutors.map(t => getTutorCoordinates(t)));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
    }

  }, [tutors]);

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full min-h-[300px] z-10" 
      />
      {/* Dynamic dark overlay or styling if needed */}
      <style>{`
        .leaflet-container {
          background-color: #f8fafc;
          font-family: inherit;
        }
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 0.75rem;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 0;
          line-height: inherit;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: hsl(var(--background));
          border-left: 1px solid hsl(var(--border)/30);
          border-bottom: 1px solid hsl(var(--border)/30);
        }
      `}</style>
    </div>
  );
}
