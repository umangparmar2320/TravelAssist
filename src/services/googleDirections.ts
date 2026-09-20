// Google Maps Directions & Real-World Transit Integration Service

import { loadGoogleMapsScript } from './googlePlaces';

export interface GoogleRouteResult {
  status: 'OK' | 'FALLBACK';
  distanceKm: number;
  durationMinutes: number;
  mode: 'TRANSIT' | 'DRIVING';
  summary: string;
  steps: {
    instructions: string;
    distanceKm: number;
    durationMinutes: number;
    mode: string;
    transitDetails?: {
      lineName: string;
      agencyName: string;
      departureStop: string;
      arrivalStop: string;
      headsign: string;
      numStops: number;
    };
  }[];
}

/**
 * Fetches real-world driving and transit directions from Google Maps DirectionsService
 */
export async function fetchGoogleDirections(
  origin: { lat: number; lon: number } | string,
  destination: { lat: number; lon: number } | string
): Promise<GoogleRouteResult | null> {
  const loaded = await loadGoogleMapsScript();
  const google = (typeof window !== 'undefined' ? (window as any).google : null);

  if (!loaded || !google?.maps?.DirectionsService) {
    return null;
  }

  try {
    const directionsService = new google.maps.DirectionsService();

    const originParam =
      typeof origin === 'string'
        ? origin
        : new google.maps.LatLng(origin.lat, origin.lon);

    const destParam =
      typeof destination === 'string'
        ? destination
        : new google.maps.LatLng(destination.lat, destination.lon);

    // 1. Try public transit first
    try {
      const transitResponse: any = await new Promise((resolve, reject) => {
        directionsService.route(
          {
            origin: originParam,
            destination: destParam,
            travelMode: google.maps.TravelMode.TRANSIT,
            provideRouteAlternatives: false,
          },
          (res: any, status: any) => {
            if (status === google.maps.DirectionsStatus.OK && res?.routes?.[0]?.legs?.[0]) {
              resolve(res);
            } else {
              reject(status);
            }
          }
        );
      });

      if (transitResponse?.routes?.[0]?.legs?.[0]) {
        const leg = transitResponse.routes[0].legs[0];
        const distKm = Math.round((leg.distance?.value || 0) / 1000);
        const durMins = Math.round((leg.duration?.value || 0) / 60);

        const steps = (leg.steps || []).map((s: any) => {
          const isTransit = s.travel_mode === 'TRANSIT';
          return {
            instructions: s.instructions ? s.instructions.replace(/<[^>]*>?/gm, '') : '',
            distanceKm: Math.round((s.distance?.value || 0) / 1000),
            durationMinutes: Math.round((s.duration?.value || 0) / 60),
            mode: s.travel_mode,
            transitDetails: isTransit && s.transit
              ? {
                  lineName: s.transit.line?.name || s.transit.line?.short_name || 'Transit',
                  agencyName: s.transit.line?.agencies?.[0]?.name || 'Regional Transit',
                  departureStop: s.transit.departure_stop?.name || '',
                  arrivalStop: s.transit.arrival_stop?.name || '',
                  headsign: s.transit.headsign || '',
                  numStops: s.transit.num_stops || 1,
                }
              : undefined,
          };
        });

        return {
          status: 'OK',
          distanceKm: distKm,
          durationMinutes: durMins,
          mode: 'TRANSIT',
          summary: transitResponse.routes[0].summary || 'Public Transit Route',
          steps,
        };
      }
    } catch {
      // Transit may not exist on rural or intercity regional corridors; fall through to DRIVING
    }

    // 2. Fetch real-world road / driving directions (provides actual highway distance & road time)
    const drivingResponse: any = await new Promise((resolve, reject) => {
      directionsService.route(
        {
          origin: originParam,
          destination: destParam,
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: false,
        },
        (res: any, status: any) => {
          if (status === google.maps.DirectionsStatus.OK && res?.routes?.[0]?.legs?.[0]) {
            resolve(res);
          } else {
            reject(status);
          }
        }
      );
    });

    if (drivingResponse?.routes?.[0]?.legs?.[0]) {
      const leg = drivingResponse.routes[0].legs[0];
      const distKm = Math.round((leg.distance?.value || 0) / 1000);
      const durMins = Math.round((leg.duration?.value || 0) / 60);

      const steps = (leg.steps || []).slice(0, 5).map((s: any) => ({
        instructions: s.instructions ? s.instructions.replace(/<[^>]*>?/gm, '') : '',
        distanceKm: Math.round((s.distance?.value || 0) / 1000),
        durationMinutes: Math.round((s.duration?.value || 0) / 60),
        mode: 'DRIVING',
      }));

      return {
        status: 'OK',
        distanceKm: distKm,
        durationMinutes: durMins,
        mode: 'DRIVING',
        summary: drivingResponse.routes[0].summary || 'Regional Highway Corridor',
        steps,
      };
    }
  } catch (err) {
    console.warn('Google Directions API call returned error/fallback:', err);
  }

  return null;
}
