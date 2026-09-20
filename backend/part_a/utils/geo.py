import math
from typing import Tuple

EARTH_RADIUS_KM = 6371.0

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth in kilometers."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = EARTH_RADIUS_KM * c
    return round(distance, 2)

def calculate_eta_minutes(distance_km: float, mode: str = "TRANSIT") -> float:
    """Estimate transit duration based on mode and average urban transit speeds."""
    speeds_kmh = {
        "WALK": 4.5,
        "BICYCLE": 15.0,
        "BUS": 22.0,
        "METRO": 35.0,
        "TRAIN": 55.0,
        "DRIVING": 30.0,
        "TRANSIT": 28.0,
    }
    speed = speeds_kmh.get(mode.upper(), 25.0)
    minutes = (distance_km / speed) * 60.0
    return round(max(minutes, 2.0), 1)

def estimate_carbon_kg(distance_km: float, mode: str = "TRANSIT") -> float:
    """Estimate CO2 emissions in kg based on distance and travel mode."""
    emission_factors = {
        "WALK": 0.0,
        "BICYCLE": 0.0,
        "METRO": 0.025,
        "BUS": 0.065,
        "TRAIN": 0.035,
        "TRANSIT": 0.045,
        "DRIVING": 0.170,
    }
    factor = emission_factors.get(mode.upper(), 0.080)
    return round(distance_km * factor, 3)

def validate_coordinates(lat: float, lon: float) -> bool:
    """Validate latitude and longitude ranges."""
    return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0
