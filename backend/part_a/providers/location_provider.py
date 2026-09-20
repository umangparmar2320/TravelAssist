import json
import logging
import time
import urllib.parse
import urllib.request
import uuid
from datetime import datetime
from typing import List, Optional

from backend.core.config import settings
from backend.part_a.schemas.provider import NormalizedLocation, ProviderHealth

logger = logging.getLogger("backend.part_a.providers.location")


class LocationProvider:
    """Real-world location and geocoding provider utilizing Nominatim OpenStreetMap and Photon."""

    def __init__(self, timeout_seconds: Optional[int] = None):
        self.timeout = timeout_seconds or settings.PROVIDER_TIMEOUT_SECONDS
        self.user_agent = settings.NOMINATIM_USER_AGENT
        self.nominatim_url = settings.NOMINATIM_BASE_URL
        self.photon_url = settings.PHOTON_BASE_URL

    def search_locations(self, query: str, limit: int = 5) -> List[NormalizedLocation]:
        """Performs forward geocoding with Nominatim and automatic Photon fallback."""
        if not query or not query.strip():
            return []

        clean_query = query.strip()
        results: List[NormalizedLocation] = []

        # 1. Primary: Nominatim OpenStreetMap API
        try:
            results = self._search_nominatim(clean_query, limit=limit)
            if results:
                return results
        except Exception as err:
            logger.warning(f"Nominatim geocoding failed for '{clean_query}': {err}. Trying Photon fallback.")

        # 2. Secondary: Photon (Komoot OSM)
        try:
            results = self._search_photon(clean_query, limit=limit)
            if results:
                return results
        except Exception as err:
            logger.warning(f"Photon geocoding failed for '{clean_query}': {err}.")

        # 3. Known fallback catalog if external networks are completely partitioned
        return self._fallback_locations(clean_query)

    def _search_nominatim(self, query: str, limit: int) -> List[NormalizedLocation]:
        params = {
            "q": query,
            "format": "json",
            "addressdetails": "1",
            "limit": str(limit),
        }
        url = f"{self.nominatim_url}/search?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})

        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        locations = []
        for item in data:
            addr = item.get("address", {})
            city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality")
            state = addr.get("state")
            country = addr.get("country")
            country_code = (addr.get("country_code") or "").upper()
            postcode = addr.get("postcode")
            category = item.get("type", "LOCATION").upper()

            loc = NormalizedLocation(
                id=str(item.get("osm_id", uuid.uuid4().hex[:12])),
                name=item.get("display_name", query),
                latitude=float(item["lat"]),
                longitude=float(item["lon"]),
                address=item.get("display_name"),
                city=city,
                state=state,
                country=country,
                country_code=country_code,
                postal_code=postcode,
                category=category,
                provider="OpenStreetMap/Nominatim",
                last_updated=datetime.utcnow().isoformat(),
            )
            locations.append(loc)
        return locations

    def _search_photon(self, query: str, limit: int) -> List[NormalizedLocation]:
        params = {"q": query, "limit": str(limit)}
        url = f"{self.photon_url}/?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})

        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        locations = []
        for feat in data.get("features", []):
            props = feat.get("properties", {})
            coords = feat.get("geometry", {}).get("coordinates", [0.0, 0.0])
            lon, lat = coords[0], coords[1]
            name = props.get("name") or query
            city = props.get("city")
            state = props.get("state")
            country = props.get("country")
            postcode = props.get("postcode")

            full_name = ", ".join(filter(None, [name, city, state, country])) or name

            loc = NormalizedLocation(
                id=str(props.get("osm_id", uuid.uuid4().hex[:12])),
                name=full_name,
                latitude=float(lat),
                longitude=float(lon),
                address=full_name,
                city=city,
                state=state,
                country=country,
                country_code=(props.get("countrycode") or "").upper(),
                postal_code=postcode,
                category="LOCATION",
                provider="Komoot/Photon",
                last_updated=datetime.utcnow().isoformat(),
            )
            locations.append(loc)
        return locations

    def _fallback_locations(self, query: str) -> List[NormalizedLocation]:
        """Provides accurate coordinates for major global transit hubs when networks time out."""
        catalog = {
            "new york": (40.7128, -74.0060, "New York, NY, USA", "New York", "USA"),
            "london": (51.5074, -0.1278, "London, England, UK", "London", "United Kingdom"),
            "paris": (48.8566, 2.3522, "Paris, Île-de-France, France", "Paris", "France"),
            "tokyo": (35.6762, 139.6503, "Tokyo, Kanto, Japan", "Tokyo", "Japan"),
            "mumbai": (19.0760, 72.8777, "Mumbai, Maharashtra, India", "Mumbai", "India"),
            "delhi": (28.6139, 77.2090, "New Delhi, Delhi, India", "New Delhi", "India"),
            "san francisco": (37.7749, -122.4194, "San Francisco, CA, USA", "San Francisco", "USA"),
            "bhavnagar": (21.7645, 72.1519, "Bhavnagar, Gujarat, India", "Bhavnagar", "India"),
            "ahmedabad": (23.0225, 72.5714, "Ahmedabad, Gujarat, India", "Ahmedabad", "India"),
            "kochi": (9.9312, 76.2673, "Kochi, Kerala, India", "Kochi", "India"),
            "cochin": (9.9312, 76.2673, "Kochi, Kerala, India", "Kochi", "India"),
            "kerala": (8.5241, 76.9366, "Kerala, India", "Thiruvananthapuram", "India"),
            "bengaluru": (12.9716, 77.5946, "Bengaluru, Karnataka, India", "Bengaluru", "India"),
            "bangalore": (12.9716, 77.5946, "Bengaluru, Karnataka, India", "Bengaluru", "India"),
            "chennai": (13.0827, 80.2707, "Chennai, Tamil Nadu, India", "Chennai", "India"),
            "kolkata": (22.5726, 88.3639, "Kolkata, West Bengal, India", "Kolkata", "India"),
        }
        q_lower = query.lower().strip()
        for key, (lat, lon, addr, city, country) in catalog.items():
            if key in q_lower:
                return [
                    NormalizedLocation(
                        id=str(uuid.uuid4().hex[:12]),
                        name=addr,
                        latitude=lat,
                        longitude=lon,
                        address=addr,
                        city=city,
                        country=country,
                        category="CITY",
                        provider="DeterministicGlobalIndex",
                        last_updated=datetime.utcnow().isoformat(),
                    )
                ]
        return []

    def reverse_geocode(self, lat: float, lon: float) -> Optional[NormalizedLocation]:
        params = {
            "lat": str(lat),
            "lon": str(lon),
            "format": "json",
            "addressdetails": "1",
        }
        url = f"{self.nominatim_url}/reverse?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            addr = data.get("address", {})
            return NormalizedLocation(
                id=str(data.get("osm_id", uuid.uuid4().hex[:12])),
                name=data.get("display_name", f"{lat}, {lon}"),
                latitude=float(data.get("lat", lat)),
                longitude=float(data.get("lon", lon)),
                address=data.get("display_name"),
                city=addr.get("city") or addr.get("town"),
                state=addr.get("state"),
                country=addr.get("country"),
                category="REVERSE_GEOCODE",
                provider="OpenStreetMap/Nominatim",
                last_updated=datetime.utcnow().isoformat(),
            )
        except Exception as e:
            logger.warning(f"Reverse geocode failed for ({lat}, {lon}): {e}")
            return None

    def health_check(self) -> ProviderHealth:
        start = time.time()
        try:
            params = {"q": "Paris", "format": "json", "limit": "1"}
            url = f"{self.nominatim_url}/search?{urllib.parse.urlencode(params)}"
            req = urllib.request.Request(url, headers={"User-Agent": self.user_agent})
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                if resp.status == 200:
                    latency = round((time.time() - start) * 1000, 2)
                    return ProviderHealth(
                        provider_name="LocationProvider (Nominatim/OSM)",
                        category="LOCATION",
                        status="OPERATIONAL",
                        latency_ms=latency,
                        is_live_api=True,
                        api_endpoint=self.nominatim_url,
                    )
        except Exception as e:
            latency = round((time.time() - start) * 1000, 2)
            return ProviderHealth(
                provider_name="LocationProvider (Nominatim/OSM)",
                category="LOCATION",
                status="DEGRADED",
                latency_ms=latency,
                is_live_api=False,
                error_message=str(e),
            )
        return ProviderHealth(
            provider_name="LocationProvider (Nominatim/OSM)",
            category="LOCATION",
            status="OFFLINE",
            latency_ms=round((time.time() - start) * 1000, 2),
            is_live_api=False,
        )
