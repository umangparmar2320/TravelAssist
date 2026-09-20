from fastapi import APIRouter, HTTPException, status
from backend.part_c.schemas.hotel import (
    HotelStayResponse,
    DestinationInfo,
    HotelModifyRequest,
    HotelModifyResponse,
)

router = APIRouter(tags=["Part C — Hotel & Destination Services"])

MOCK_HOTELS = {
    "trip-mb-goa-001": {
        "id": "htl-taj-goa-01",
        "trip_id": "trip-mb-goa-001",
        "hotel_name": "Taj Fort Aguada Resort & Spa",
        "address": "Sinquerim, Candolim, Goa 403515",
        "city": "Goa",
        "check_in_date": "2026-09-20",
        "check_out_date": "2026-09-22",
        "original_check_in_time": "03:00 PM",
        "estimated_arrival_time": "06:15 PM",
        "status": "CHECK_IN_DELAYED",
        "late_check_in_notified": False,
        "room_type": "Deluxe Sea View King",
        "confirmation_code": "TAJ-GOA-78921",
        "contact_phone": "+91 832 664 5858",
        "destination_info": {
            "weather_condition": "Partly Sunny / Coastal Breeze",
            "temperature_celsius": 29,
            "emergency_helpline": "112 (Emergency) / 1363 (Tourist Helpline)",
            "tourist_desk": "Goa Tourism Development Desk, Panaji (+91 832 243 8750)",
            "transit_tips": "Pre-paid airport cabs and GoaMiles app cabs available 24/7.",
        },
    }
}

@router.get("/hotels/{trip_id}", response_model=HotelStayResponse, summary="Get hotel stay & destination info")
def get_hotel(trip_id: str):
    hotel = MOCK_HOTELS.get(trip_id)
    if not hotel:
        # Provide default fallback for any requested trip
        return HotelStayResponse(
            id=f"htl-{trip_id}",
            trip_id=trip_id,
            hotel_name="Destination Grand Executive Hotel",
            address="100 Coastal Boulevard",
            city="Destination City",
            check_in_date="2026-09-20",
            check_out_date="2026-09-22",
            original_check_in_time="03:00 PM",
            estimated_arrival_time="05:00 PM",
            status="CONFIRMED",
            late_check_in_notified=False,
            room_type="Executive Business Suite",
            confirmation_code="HTL-CORP-9912",
            contact_phone="+91 22 2840 9900",
            destination_info=DestinationInfo(),
        )
    return HotelStayResponse(**hotel)

@router.post("/hotels/{trip_id}/modify", response_model=HotelModifyResponse, summary="Modify stay or send late check-in")
@router.post("/hotels/modify", response_model=HotelModifyResponse, summary="Modify stay or send late check-in (root)")
def modify_hotel(payload: HotelModifyRequest, trip_id: str = None):
    target_trip = trip_id or payload.trip_id or "trip-mb-goa-001"
    hotel = MOCK_HOTELS.get(target_trip)
    if not hotel:
        hotel = {
            "id": f"htl-{target_trip}",
            "trip_id": target_trip,
            "hotel_name": "Taj Fort Aguada Resort & Spa",
            "address": "Sinquerim, Candolim, Goa 403515",
            "city": "Goa",
            "check_in_date": "2026-09-20",
            "check_out_date": "2026-09-22",
            "original_check_in_time": "03:00 PM",
            "estimated_arrival_time": "06:15 PM",
            "status": "CHECK_IN_DELAYED",
            "late_check_in_notified": False,
            "room_type": "Deluxe Sea View King",
            "confirmation_code": "TAJ-GOA-78921",
            "contact_phone": "+91 832 664 5858",
            "destination_info": {
                "weather_condition": "Partly Sunny / Coastal Breeze",
                "temperature_celsius": 29,
                "emergency_helpline": "112 / 1363",
                "tourist_desk": "Goa Tourism Desk",
                "transit_tips": "Airport and prepaid cabs available 24/7.",
            },
        }
        MOCK_HOTELS[target_trip] = hotel

    if payload.late_check_in_notified is not None:
        hotel["late_check_in_notified"] = payload.late_check_in_notified
        hotel["estimated_arrival_time"] = "09:30 PM (Late arrival clearance acknowledged by front desk)"
    if payload.new_check_in_date:
        hotel["check_in_date"] = payload.new_check_in_date
        hotel["status"] = "DATE_MODIFIED"
    if payload.new_check_out_date:
        hotel["check_out_date"] = payload.new_check_out_date

    return HotelModifyResponse(
        success=True,
        hotel=HotelStayResponse(**hotel),
        message="Hotel stay synchronized successfully with revised travel schedule.",
    )
