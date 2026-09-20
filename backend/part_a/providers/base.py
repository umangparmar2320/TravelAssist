from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseRouteProvider(ABC):
    """Abstract interface defining the contract for real-time and scheduled route planning providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the route data provider."""
        pass

    @abstractmethod
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
        """Calculates route segments, distances, durations, and modal breakdowns."""
        pass

    @abstractmethod
    def get_traffic_delay_minutes(self, segment_id: str, mode: str) -> float:
        """Retrieves real-time traffic delay estimation."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Checks provider service availability and latency."""
        pass
