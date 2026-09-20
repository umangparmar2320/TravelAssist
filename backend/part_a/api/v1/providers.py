import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status

from backend.part_a.providers.flight_provider import FlightProvider
from backend.part_a.providers.train_provider import TrainProvider
from backend.part_a.providers.ground_provider import GroundTransportProvider
from backend.part_a.providers.location_provider import LocationProvider
from backend.part_a.schemas.provider import (
    NormalizedFlightOption,
    NormalizedTrainOption,
    NormalizedGroundOption,
    NormalizedLocation,
    ProviderHealth,
)

logger = logging.getLogger("backend.part_a.api.v1.providers")

router = APIRouter(prefix="/providers", tags=["Travel Providers"])

flight_provider = FlightProvider()
train_provider = TrainProvider()
ground_provider = GroundTransportProvider()
location_provider = LocationProvider()


@router.get("/health", response_model=List[ProviderHealth])
def check_all_providers_health():
    """Runs real-time health and latency probes against all configured travel providers."""
    return [
        flight_provider.health_check(),
        train_provider.health_check(),
        ground_provider.health_check(),
        location_provider.health_check(),
    ]


@router.get("/flights/search", response_model=List[NormalizedFlightOption])
def search_flights(
    origin: str = Query(..., description="Origin 3-letter IATA code, e.g. JFK"),
    destination: str = Query(..., description="Destination 3-letter IATA code, e.g. LHR"),
    departure_date: Optional[str] = Query(None, description="Departure date in YYYY-MM-DD format"),
    adults: int = Query(1, ge=1, le=9),
    cabin_class: str = Query("ECONOMY", pattern="^(ECONOMY|PREMIUM_ECONOMY|BUSINESS|FIRST)$"),
    currency: str = Query("USD", max_length=5),
):
    """Searches flight options preserving price, currency, departure, arrival, duration, and availability."""
    dep_dt = None
    if departure_date:
        try:
            dep_dt = datetime.fromisoformat(departure_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid departure_date format. Please use YYYY-MM-DD format.",
            )

    try:
        return flight_provider.search_flights(
            origin_iata=origin,
            dest_iata=destination,
            departure_date=dep_dt,
            adults=adults,
            cabin_class=cabin_class,
            currency=currency,
        )
    except Exception as e:
        logger.error(f"Flight search error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing flight search: {str(e)}",
        )


@router.get("/trains/search", response_model=List[NormalizedTrainOption])
def search_trains(
    origin_station: str = Query(..., description="Origin station name or code"),
    dest_station: str = Query(..., description="Destination station name or code"),
    origin_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    origin_lon: Optional[float] = Query(None, ge=-180.0, le=180.0),
    dest_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    dest_lon: Optional[float] = Query(None, ge=-180.0, le=180.0),
    departure_time: Optional[str] = Query(None, description="ISO format datetime"),
    currency: str = Query("USD", max_length=5),
):
    """Searches train options preserving price, currency, departure, arrival, duration, and availability."""
    dep_dt = None
    if departure_time:
        try:
            dep_dt = datetime.fromisoformat(departure_time.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid departure_time format. Please use ISO 8601 format.",
            )

    try:
        return train_provider.search_train_options(
            origin_station=origin_station,
            dest_station=dest_station,
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            departure_time=dep_dt,
            currency=currency,
        )
    except Exception as e:
        logger.error(f"Train search error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing train search: {str(e)}",
        )


@router.get("/ground/search", response_model=List[NormalizedGroundOption])
def search_ground_transport(
    origin_lat: float = Query(..., ge=-90.0, le=90.0),
    origin_lon: float = Query(..., ge=-180.0, le=180.0),
    dest_lat: float = Query(..., ge=-90.0, le=90.0),
    dest_lon: float = Query(..., ge=-180.0, le=180.0),
    origin_name: str = Query("Origin"),
    dest_name: str = Query("Destination"),
    departure_time: Optional[str] = Query(None),
    currency: str = Query("USD", max_length=5),
):
    """Searches real ground transport options with OSRM routing and metered tariff models."""
    dep_dt = None
    if departure_time:
        try:
            dep_dt = datetime.fromisoformat(departure_time.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid departure_time format. Please use ISO 8601 format.",
            )

    try:
        return ground_provider.search_ground_options(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            origin_name=origin_name,
            dest_name=dest_name,
            departure_time=dep_dt,
            currency=currency,
        )
    except Exception as e:
        logger.error(f"Ground transport error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating ground transport: {str(e)}",
        )


@router.get("/locations/search", response_model=List[NormalizedLocation])
def search_locations(
    query: str = Query(..., min_length=2, description="Address, landmark, or city name"),
    limit: int = Query(5, ge=1, le=20),
):
    """Real-time geocoding and address resolution via OpenStreetMap Nominatim and Photon."""
    try:
        results = location_provider.search_locations(query=query, limit=limit)
        if not results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No locations found for query: '{query}'",
            )
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Location search error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing location search: {str(e)}",
        )


@router.get("/locations/reverse", response_model=NormalizedLocation)
def reverse_geocode(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
):
    """Reverse geocodes coordinates to a human-readable location."""
    try:
        loc = location_provider.reverse_geocode(lat=latitude, lon=longitude)
        if not loc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not reverse geocode coordinates ({latitude}, {longitude})",
            )
        return loc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reverse geocode error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing reverse geocode: {str(e)}",
        )
