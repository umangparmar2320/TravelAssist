import time
from typing import Dict, Any, List
from backend.part_a.providers.base import BaseRouteProvider
from backend.part_a.utils.geo import (
    haversine_distance,
    calculate_eta_minutes,
    estimate_carbon_kg,
)


class MockRouteProvider(BaseRouteProvider):
    """Clean mock route provider simulating multi-modal journeys, transit hops, and traffic."""

    @property
    def provider_name(self) -> str:
        return "PartA_MockTransitProvider"

    def health_check(self) -> Dict[str, Any]:
        start = time.time()
        # Simulated fast local check
        time.sleep(0.005)
        latency = round((time.time() - start) * 1000, 2)
        return {
            "provider_name": self.provider_name,
            "status": "OPERATIONAL",
            "latency_ms": latency,
            "is_mock": True,
            "features": ["multimodal_routing", "transit_schedule_simulation", "carbon_footprint"],
        }

    def get_traffic_delay_minutes(self, segment_id: str, mode: str) -> float:
        # In mock mode, slight variation based on mode
        if mode in ("DRIVING", "BUS"):
            return 3.5
        return 0.0

    def calculate_route(
        self,
        origin_lat: float,
        origin_lon: float,
        origin_name: str,
        dest_lat: float,
        dest_lon: float,
        dest_name: str,
        travel_mode: str = "MULTI_MODAL",
        preference: str = "FASTEST",
    ) -> Dict[str, Any]:
        total_direct_km = haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
        # Add road curvature factor (usually ~1.25x direct distance)
        actual_distance_km = round(max(total_direct_km * 1.25, 0.8), 2)

        segments: List[Dict[str, Any]] = []

        if travel_mode == "WALKING":
            duration = calculate_eta_minutes(actual_distance_km, "WALK")
            segments.append({
                "sequence_order": 1,
                "start_name": origin_name,
                "start_lat": origin_lat,
                "start_lon": origin_lon,
                "end_name": dest_name,
                "end_lat": dest_lat,
                "end_lon": dest_lon,
                "mode": "WALK",
                "provider_name": self.provider_name,
                "distance_km": actual_distance_km,
                "duration_minutes": duration,
                "delay_minutes": 0.0,
                "instructions": f"Walk directly from {origin_name} to {dest_name}",
            })
            total_duration = duration
            total_cost = 0.0
            carbon = 0.0

        elif travel_mode == "DRIVING":
            duration = calculate_eta_minutes(actual_distance_km, "DRIVING")
            delay = self.get_traffic_delay_minutes("drv-1", "DRIVING")
            segments.append({
                "sequence_order": 1,
                "start_name": origin_name,
                "start_lat": origin_lat,
                "start_lon": origin_lon,
                "end_name": dest_name,
                "end_lat": dest_lat,
                "end_lon": dest_lon,
                "mode": "DRIVING",
                "provider_name": self.provider_name,
                "distance_km": actual_distance_km,
                "duration_minutes": duration,
                "delay_minutes": delay,
                "instructions": f"Drive via primary arterial expressway from {origin_name} to {dest_name}",
            })
            total_duration = round(duration + delay, 1)
            total_cost = round(actual_distance_km * 12.5, 2)  # Fuel/rideshare estimate
            carbon = estimate_carbon_kg(actual_distance_km, "DRIVING")

        else:
            # MULTI_MODAL or TRANSIT: Split into 3 segments (First mile walk, Rapid transit/metro, Last mile bus/walk)
            seg1_dist = round(min(actual_distance_km * 0.1, 1.2), 2)
            seg2_dist = round(actual_distance_km * 0.75, 2)
            seg3_dist = round(max(actual_distance_km - seg1_dist - seg2_dist, 0.5), 2)

            # Midpoints interpolation
            mid1_lat = round(origin_lat + (dest_lat - origin_lat) * 0.15, 6)
            mid1_lon = round(origin_lon + (dest_lon - origin_lon) * 0.15, 6)
            mid2_lat = round(origin_lat + (dest_lat - origin_lat) * 0.85, 6)
            mid2_lon = round(origin_lon + (dest_lon - origin_lon) * 0.85, 6)

            dur1 = calculate_eta_minutes(seg1_dist, "WALK")
            dur2 = calculate_eta_minutes(seg2_dist, "METRO")
            dur3 = calculate_eta_minutes(seg3_dist, "BUS")
            delay3 = self.get_traffic_delay_minutes("bus-seg", "BUS")

            station_start = f"{origin_name} Transit Access"
            station_end = f"{dest_name} Metro Interchange"

            segments.extend([
                {
                    "sequence_order": 1,
                    "start_name": origin_name,
                    "start_lat": origin_lat,
                    "start_lon": origin_lon,
                    "end_name": station_start,
                    "end_lat": mid1_lat,
                    "end_lon": mid1_lon,
                    "mode": "WALK",
                    "provider_name": self.provider_name,
                    "distance_km": seg1_dist,
                    "duration_minutes": dur1,
                    "delay_minutes": 0.0,
                    "instructions": f"Walk from {origin_name} to {station_start} (Platform 1)",
                },
                {
                    "sequence_order": 2,
                    "start_name": station_start,
                    "start_lat": mid1_lat,
                    "start_lon": mid1_lon,
                    "end_name": station_end,
                    "end_lat": mid2_lat,
                    "end_lon": mid2_lon,
                    "mode": "METRO",
                    "provider_name": self.provider_name,
                    "distance_km": seg2_dist,
                    "duration_minutes": dur2,
                    "delay_minutes": 0.0,
                    "instructions": f"Board Metro Line towards {station_end} (6 stops)",
                },
                {
                    "sequence_order": 3,
                    "start_name": station_end,
                    "start_lat": mid2_lat,
                    "start_lon": mid2_lon,
                    "end_name": dest_name,
                    "end_lat": dest_lat,
                    "end_lon": dest_lon,
                    "mode": "BUS",
                    "provider_name": self.provider_name,
                    "distance_km": seg3_dist,
                    "duration_minutes": dur3,
                    "delay_minutes": delay3,
                    "instructions": f"Transfer to Feeder Bus towards {dest_name}",
                },
            ])

            total_duration = round(dur1 + dur2 + dur3 + delay3 + 4.0, 1)  # +4 min transfer buffer
            total_cost = 45.0  # Combined standard fare
            carbon = round(
                estimate_carbon_kg(seg1_dist, "WALK")
                + estimate_carbon_kg(seg2_dist, "METRO")
                + estimate_carbon_kg(seg3_dist, "BUS"),
                3,
            )

        return {
            "title": f"Journey from {origin_name} to {dest_name}",
            "origin_name": origin_name,
            "origin_lat": origin_lat,
            "origin_lon": origin_lon,
            "destination_name": dest_name,
            "destination_lat": dest_lat,
            "destination_lon": dest_lon,
            "travel_mode": travel_mode,
            "preference": preference,
            "status": "COMPUTED",
            "total_distance_km": actual_distance_km,
            "total_duration_minutes": total_duration,
            "estimated_cost": total_cost,
            "carbon_emissions_kg": carbon,
            "segments": segments,
        }
