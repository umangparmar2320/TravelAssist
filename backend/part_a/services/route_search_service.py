import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple

from backend.part_a.providers.flight_provider import FlightProvider, IATA_AIRPORTS
from backend.part_a.providers.train_provider import TrainProvider
from backend.part_a.providers.ground_provider import GroundTransportProvider
from backend.part_a.providers.location_provider import LocationProvider
from backend.part_a.schemas.route_search import (
    RouteOption,
    RouteSearchSegment,
    RouteSearchResponse,
)
from backend.part_a.schemas.provider import (
    NormalizedFlightOption,
    NormalizedTrainOption,
    NormalizedGroundOption,
    NormalizedLocation,
)
from backend.part_a.utils.geo import haversine_distance, validate_coordinates
from backend.part_a.services.multi_modal_generator import MultiModalRouteGenerator

logger = logging.getLogger("backend.part_a.services.route_search")


class InvalidLocationError(Exception):
    """Raised when source or destination cannot be resolved into geographic coordinates."""
    pass


class RealTimeRouteSearchService:
    """Orchestrates end-to-end multi-modal travel search across real provider APIs."""

    def __init__(
        self,
        flight_provider: Optional[FlightProvider] = None,
        train_provider: Optional[TrainProvider] = None,
        ground_provider: Optional[GroundTransportProvider] = None,
        location_provider: Optional[LocationProvider] = None,
    ):
        self.flight_provider = flight_provider or FlightProvider()
        self.train_provider = train_provider or TrainProvider()
        self.ground_provider = ground_provider or GroundTransportProvider()
        self.location_provider = location_provider or LocationProvider()

    def search_routes(
        self,
        source: str,
        destination: str,
        travel_date: Optional[str] = None,
        passengers: int = 1,
        cabin_class: str = "ECONOMY",
        transport_modes: Optional[List[str]] = None,
    ) -> RouteSearchResponse:
        """
        Executes the route search flow:
        Source -> Destination -> Location resolution -> Real travel API search
        -> Normalize results -> Build route options -> Validate connections
        -> Calculate route metrics -> Return routes.
        """
        # 1. Input Validation
        if not source or not source.strip():
            raise InvalidLocationError("Source location cannot be empty.")
        if not destination or not destination.strip():
            raise InvalidLocationError("Destination location cannot be empty.")

        clean_source = source.strip()
        clean_dest = destination.strip()

        # Parse travel date or default to next day
        parsed_dep_dt = self._parse_travel_date(travel_date)
        travel_date_str = parsed_dep_dt.strftime("%Y-%m-%d")

        # Parse and normalize transport modes
        allowed_modes = self._normalize_transport_modes(transport_modes)

        # 2. Location Resolution
        src_loc = self._resolve_location(clean_source)
        if not src_loc:
            raise InvalidLocationError(f"Could not resolve source location: '{clean_source}'")

        dst_loc = self._resolve_location(clean_dest)
        if not dst_loc:
            raise InvalidLocationError(f"Could not resolve destination location: '{clean_dest}'")

        dist_km = haversine_distance(
            src_loc["lat"], src_loc["lon"], dst_loc["lat"], dst_loc["lon"]
        )

        logger.info(
            f"Resolved Route Search: '{src_loc['name']}' ({src_loc['lat']:.4f}, {src_loc['lon']:.4f}) -> "
            f"'{dst_loc['name']}' ({dst_loc['lat']:.4f}, {dst_loc['lon']:.4f}) | Distance: {dist_km:.1f}km | "
            f"Modes: {allowed_modes}"
        )

        # 3. Real Travel API Search
        # Direct segments pools
        flight_segments: List[RouteSearchSegment] = []
        train_segments: List[RouteSearchSegment] = []
        ground_segments: List[RouteSearchSegment] = []

        # Ground transfers for multi-modal combinations
        first_mile_ground: List[RouteSearchSegment] = []
        last_mile_ground: List[RouteSearchSegment] = []

        # A. Flight Search
        if "FLIGHT" in allowed_modes and (dist_km >= 80.0 or src_loc.get("iata") or dst_loc.get("iata")):
            src_iata = src_loc.get("iata") or self._find_nearest_iata(src_loc["lat"], src_loc["lon"])
            dst_iata = dst_loc.get("iata") or self._find_nearest_iata(dst_loc["lat"], dst_loc["lon"])

            if src_iata and dst_iata and src_iata != dst_iata:
                try:
                    raw_flights = self.flight_provider.search_flights(
                        origin_iata=src_iata,
                        dest_iata=dst_iata,
                        departure_date=parsed_dep_dt,
                        adults=passengers,
                        cabin_class=cabin_class,
                    )
                    flight_segments = self._normalize_flights(raw_flights)
                except Exception as exc:
                    logger.warning(f"Flight provider search failed: {exc}")

        # B. Train Search
        if "TRAIN" in allowed_modes and dist_km <= 1500.0:
            try:
                raw_trains = self.train_provider.search_train_options(
                    origin_station=src_loc.get("station") or src_loc["name"],
                    dest_station=dst_loc.get("station") or dst_loc["name"],
                    origin_lat=src_loc["lat"],
                    origin_lon=src_loc["lon"],
                    dest_lat=dst_loc["lat"],
                    dest_lon=dst_loc["lon"],
                    departure_time=parsed_dep_dt,
                )
                train_segments = self._normalize_trains(raw_trains)
            except Exception as exc:
                logger.warning(f"Train provider search failed: {exc}")

        # C. Ground Search (Direct vehicle/taxi/rideshare for short & medium journeys)
        if "VEHICLE" in allowed_modes:
            try:
                raw_ground = self.ground_provider.search_ground_options(
                    origin_lat=src_loc["lat"],
                    origin_lon=src_loc["lon"],
                    dest_lat=dst_loc["lat"],
                    dest_lon=dst_loc["lon"],
                    origin_name=src_loc["name"],
                    dest_name=dst_loc["name"],
                    departure_time=parsed_dep_dt,
                    passengers=passengers,
                )
                ground_segments = self._normalize_ground(raw_ground)
            except Exception as exc:
                logger.warning(f"Ground provider search failed: {exc}")

        # D. First-mile and Last-mile ground transfers for multi-modal connections
        # If flight is available and source is not already at origin airport
        if flight_segments:
            src_airport_info = IATA_AIRPORTS.get(flight_segments[0].details.get("departure_airport_code", ""))
            dst_airport_info = IATA_AIRPORTS.get(flight_segments[0].details.get("arrival_airport_code", ""))

            if src_airport_info:
                src_air_lat, src_air_lon, src_air_name, _ = src_airport_info
                # Check distance from source to airport
                d_to_airport = haversine_distance(src_loc["lat"], src_loc["lon"], src_air_lat, src_air_lon)
                if d_to_airport > 2.0:
                    try:
                        raw_fm = self.ground_provider.search_ground_options(
                            origin_lat=src_loc["lat"],
                            origin_lon=src_loc["lon"],
                            dest_lat=src_air_lat,
                            dest_lon=src_air_lon,
                            origin_name=src_loc["name"],
                            dest_name=src_air_name,
                            departure_time=parsed_dep_dt - timedelta(hours=3),
                            passengers=passengers,
                        )
                        first_mile_ground = self._normalize_ground(raw_fm)
                    except Exception as exc:
                        logger.warning(f"First mile ground search failed: {exc}")

            if dst_airport_info:
                dst_air_lat, dst_air_lon, dst_air_name, _ = dst_airport_info
                d_from_airport = haversine_distance(dst_loc["lat"], dst_loc["lon"], dst_air_lat, dst_air_lon)
                if d_from_airport > 2.0:
                    try:
                        raw_lm = self.ground_provider.search_ground_options(
                            origin_lat=dst_air_lat,
                            origin_lon=dst_air_lon,
                            dest_lat=dst_loc["lat"],
                            dest_lon=dst_loc["lon"],
                            origin_name=dst_air_name,
                            dest_name=dst_loc["name"],
                            departure_time=parsed_dep_dt + timedelta(hours=6),
                            passengers=passengers,
                        )
                        last_mile_ground = self._normalize_ground(raw_lm)
                    except Exception as exc:
                        logger.warning(f"Last mile ground search failed: {exc}")

        # 4. Build Route Options
        candidate_routes: List[List[RouteSearchSegment]] = []

        # Direct Flights
        for flt in flight_segments:
            candidate_routes.append([flt])

        # Direct Trains
        for trn in train_segments:
            candidate_routes.append([trn])

        # Direct Ground (if distance is reasonable, e.g. < 500km)
        if dist_km <= 500.0:
            for grd in ground_segments:
                candidate_routes.append([grd])

        # Multi-Modal: Ground + Flight + Ground
        if flight_segments and (first_mile_ground or last_mile_ground):
            for flt in flight_segments[:3]:  # Top flight options
                try:
                    flt_dep = datetime.fromisoformat(flt.departure.replace("Z", "+00:00"))
                    flt_arr = datetime.fromisoformat(flt.arrival.replace("Z", "+00:00"))
                except Exception:
                    continue

                fm_seg = None
                if first_mile_ground:
                    best_fm = first_mile_ground[0]
                    # Adjust first-mile departure so arrival is 90 mins before flight departure
                    fm_arr = flt_dep - timedelta(minutes=90)
                    fm_dep = fm_arr - timedelta(minutes=best_fm.duration)
                    fm_seg = best_fm.model_copy(
                        update={
                            "id": f"SEG-FM-{uuid.uuid4().hex[:6]}",
                            "departure": fm_dep.isoformat(),
                            "arrival": fm_arr.isoformat(),
                        }
                    )

                lm_seg = None
                if last_mile_ground:
                    best_lm = last_mile_ground[0]
                    # Adjust last-mile departure 45 mins after flight arrival
                    lm_dep = flt_arr + timedelta(minutes=45)
                    lm_arr = lm_dep + timedelta(minutes=best_lm.duration)
                    lm_seg = best_lm.model_copy(
                        update={
                            "id": f"SEG-LM-{uuid.uuid4().hex[:6]}",
                            "departure": lm_dep.isoformat(),
                            "arrival": lm_arr.isoformat(),
                        }
                    )

                # Assemble multi-modal candidate
                if fm_seg and lm_seg:
                    candidate_routes.append([fm_seg, flt, lm_seg])
                elif fm_seg:
                    candidate_routes.append([fm_seg, flt])
                elif lm_seg:
                    candidate_routes.append([flt, lm_seg])

        # 5. Validate Connections
        validated_routes: List[RouteOption] = []
        for segments_candidate in candidate_routes:
            valid, reason = self._validate_connections(segments_candidate)
            if not valid:
                logger.debug(f"Rejecting candidate route: {reason}")
                continue

            # 6. Calculate Route Metrics
            route_option = self._calculate_route_metrics(segments_candidate, passengers=passengers)
            if route_option:
                validated_routes.append(route_option)

        # Sort: first by transfer count, then by total duration, then by price
        validated_routes.sort(key=lambda r: (r.transfer_count, r.total_duration, r.total_price))

        return RouteSearchResponse(
            source=src_loc["name"],
            destination=dst_loc["name"],
            travel_date=travel_date_str,
            passengers=passengers,
            cabin_class=cabin_class,
            total_routes=len(validated_routes),
            routes=validated_routes,
        )

    # ------------------------------------------------------------------------
    # Helpers for Location Resolution
    # ------------------------------------------------------------------------
    def _resolve_location(self, query: str) -> Optional[Dict[str, Any]]:
        """Resolves location from IATA code, Nominatim geocoder, or photon fallback."""
        q_upper = query.strip().upper()

        # Check IATA table
        if len(q_upper) == 3 and q_upper in IATA_AIRPORTS:
            lat, lon, name, city = IATA_AIRPORTS[q_upper]
            return {
                "name": name,
                "city": city,
                "lat": lat,
                "lon": lon,
                "iata": q_upper,
                "station": f"{city} Central",
            }

        # Query LocationProvider
        results = self.location_provider.search_locations(query, limit=1)
        if not results:
            return None

        top = results[0]
        if not validate_coordinates(top.latitude, top.longitude):
            return None

        # Determine if nearby an airport
        nearby_iata = self._find_nearest_iata(top.latitude, top.longitude, max_km=120.0)

        return {
            "name": getattr(top, "name", None) or getattr(top, "display_name", None) or getattr(top, "city", None) or query,
            "city": getattr(top, "city", None) or query,
            "lat": top.latitude,
            "lon": top.longitude,
            "iata": nearby_iata,
            "station": f"{getattr(top, 'city', None) or query} Central Station",
        }

    def _find_nearest_iata(self, lat: float, lon: float, max_km: float = 350.0) -> Optional[str]:
        """Finds closest IATA airport code within threshold distance."""
        best_iata = None
        best_dist = float("inf")

        for code, (air_lat, air_lon, _, _) in IATA_AIRPORTS.items():
            d = haversine_distance(lat, lon, air_lat, air_lon)
            if d < best_dist and d <= max_km:
                best_dist = d
                best_iata = code

        return best_iata

    # ------------------------------------------------------------------------
    # Normalizers
    # ------------------------------------------------------------------------
    def _normalize_flights(self, flights: List[NormalizedFlightOption]) -> List[RouteSearchSegment]:
        segments: List[RouteSearchSegment] = []
        for f in flights:
            # Handle unavailable price or schedule
            if not f.price or f.price <= 0.0 or not f.departure or not f.arrival or not f.availability:
                continue
            seg = RouteSearchSegment(
                id=f.id,
                mode="FLIGHT",
                provider=f.provider,
                price=f.price,
                currency=f.currency,
                departure=f.departure,
                arrival=f.arrival,
                duration=f.duration,
                origin=f.origin,
                destination=f.destination,
                identifier=f"{f.airline_code} {f.flight_number}",
                last_updated=f.last_updated,
                details={
                    "airline": f.airline_name,
                    "aircraft": f.aircraft_type,
                    "cabin_class": f.cabin_class,
                    "departure_airport_code": getattr(f, "departure_airport", None) or getattr(f, "departure_airport_code", ""),
                    "arrival_airport_code": getattr(f, "arrival_airport", None) or getattr(f, "arrival_airport_code", ""),
                    "stops": f.stops,
                },
            )
            segments.append(seg)
        return segments

    def _normalize_trains(self, trains: List[NormalizedTrainOption]) -> List[RouteSearchSegment]:
        segments: List[RouteSearchSegment] = []
        for t in trains:
            # Handle unavailable price or schedule
            if not t.price or t.price <= 0.0 or not t.departure or not t.arrival or not t.availability:
                continue
            seg = RouteSearchSegment(
                id=t.id,
                mode="TRAIN",
                provider=t.provider,
                price=t.price,
                currency=t.currency,
                departure=t.departure,
                arrival=t.arrival,
                duration=t.duration,
                origin=t.origin,
                destination=t.destination,
                identifier=f"{t.operator_name} #{t.train_number}",
                last_updated=t.last_updated,
                details={
                    "operator": t.operator_name,
                    "train_name": t.train_name,
                    "travel_class": t.travel_class,
                    "departure_station": t.departure_station,
                    "arrival_station": t.arrival_station,
                },
            )
            segments.append(seg)
        return segments

    def _normalize_ground(self, ground_options: List[NormalizedGroundOption]) -> List[RouteSearchSegment]:
        segments: List[RouteSearchSegment] = []
        for g in ground_options:
            # Handle unavailable price or schedule
            if not g.price or g.price <= 0.0 or not g.departure or not g.arrival or not g.availability:
                continue
            seg = RouteSearchSegment(
                id=g.id,
                mode="VEHICLE",
                provider=g.provider,
                price=g.price,
                currency=g.currency,
                departure=g.departure,
                arrival=g.arrival,
                duration=g.duration,
                origin=g.origin,
                destination=g.destination,
                identifier=f"{g.vehicle_type} ({g.service_class})",
                last_updated=g.last_updated,
                details={
                    "vehicle_type": g.vehicle_type,
                    "service_class": g.service_class,
                    "distance_km": g.distance_km,
                    "fare_breakdown": g.fare_breakdown,
                },
            )
            segments.append(seg)
        return segments

    # ------------------------------------------------------------------------
    # Connection Validation
    # ------------------------------------------------------------------------
    def _validate_connections(self, segments: List[RouteSearchSegment]) -> Tuple[bool, str]:
        """
        Validates chronological order, minimum connection layover,
        mode transfer buffers, and geographic continuity between consecutive segments.
        Delegates to MultiModalRouteGenerator.
        """
        if not segments:
            return False, "No segments in route candidate"

        # Direct 1-segment route is always internally connected
        if len(segments) == 1:
            return True, "Direct single-leg route valid"

        generator = MultiModalRouteGenerator()
        for i in range(len(segments) - 1):
            s_current = segments[i]
            s_next = segments[i + 1]
            val_res = generator.validate_connection(s_current, s_next, enforce_geographic_continuity=False)
            if not val_res.is_valid:
                return False, val_res.rejection_reason or "Invalid connection"

        return True, "Valid multi-modal connection"

    # ------------------------------------------------------------------------
    # Route Metrics Calculation
    # ------------------------------------------------------------------------
    def _calculate_route_metrics(
        self,
        segments: List[RouteSearchSegment],
        passengers: int = 1,
    ) -> Optional[RouteOption]:
        """Calculates total price, duration, waiting time, transfers, provider, and last_updated."""
        if not segments:
            return None

        # Price calculation: passenger-based vs ride-based
        total_price = 0.0
        for seg in segments:
            if seg.mode in ("FLIGHT", "TRAIN"):
                total_price += seg.price * passengers
            else:
                # Ground/taxi fare covers passengers up to car capacity
                total_price += seg.price

        total_price = round(total_price, 2)
        currency = segments[0].currency

        # Time metrics
        try:
            dep_first = datetime.fromisoformat(segments[0].departure.replace("Z", "+00:00"))
            arr_last = datetime.fromisoformat(segments[-1].arrival.replace("Z", "+00:00"))
            total_duration = max(round((arr_last - dep_first).total_seconds() / 60.0, 1), 0.0)
        except Exception:
            # Fallback duration sum
            total_duration = sum(s.duration for s in segments)

        # Waiting / transfer time
        waiting_time = 0.0
        for i in range(len(segments) - 1):
            try:
                arr_i = datetime.fromisoformat(segments[i].arrival.replace("Z", "+00:00"))
                dep_next = datetime.fromisoformat(segments[i + 1].departure.replace("Z", "+00:00"))
                gap = (dep_next - arr_i).total_seconds() / 60.0
                if gap > 0:
                    waiting_time += gap
            except Exception:
                pass
        waiting_time = round(waiting_time, 1)

        transfer_count = max(len(segments) - 1, 0)
        departure_str = segments[0].departure
        arrival_str = segments[-1].arrival

        # Aggregated providers
        distinct_providers = list(dict.fromkeys(s.provider for s in segments))
        provider_str = " + ".join(distinct_providers)

        # Most recent provider timestamp
        last_updated_str = max(s.last_updated for s in segments)

        # Title
        modes = " + ".join(dict.fromkeys(s.mode.capitalize() for s in segments))
        title = f"{modes}: {segments[0].origin} to {segments[-1].destination}"

        return RouteOption(
            id=f"ROUTE-{uuid.uuid4().hex[:8]}",
            title=title,
            total_price=total_price,
            currency=currency,
            total_duration=total_duration,
            waiting_time=waiting_time,
            transfer_count=transfer_count,
            departure=departure_str,
            arrival=arrival_str,
            segments=segments,
            provider=provider_str,
            last_updated=last_updated_str,
            status="AVAILABLE",
        )

    # ------------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------------
    def _parse_travel_date(self, date_str: Optional[str]) -> datetime:
        """Parses travel date string or defaults to tomorrow."""
        if not date_str or not date_str.strip():
            return datetime.utcnow() + timedelta(days=1)

        clean = date_str.strip()
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y/%m/%d"):
            try:
                return datetime.strptime(clean, fmt)
            except ValueError:
                continue

        try:
            return datetime.fromisoformat(clean.replace("Z", "+00:00"))
        except Exception:
            raise InvalidLocationError(f"Invalid travel_date format '{date_str}'. Expected YYYY-MM-DD.")

    def _normalize_transport_modes(self, modes: Optional[List[str]]) -> List[str]:
        """Normalizes transport mode filters into a set of standard modes."""
        all_modes = {"FLIGHT", "TRAIN", "VEHICLE"}
        if not modes:
            return list(all_modes)

        parsed: set = set()
        for m in modes:
            if not m:
                continue
            # Handle comma-separated strings inside items
            for sub in m.split(","):
                sub_clean = sub.strip().upper()
                if sub_clean in ("FLIGHT", "AIR", "PLANE"):
                    parsed.add("FLIGHT")
                elif sub_clean in ("TRAIN", "RAIL", "METRO"):
                    parsed.add("TRAIN")
                elif sub_clean in ("VEHICLE", "CAR", "TAXI", "GROUND", "RIDEHAIL"):
                    parsed.add("VEHICLE")

        return list(parsed) if parsed else list(all_modes)
