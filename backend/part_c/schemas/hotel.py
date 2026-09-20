from typing import Optional, Dict, Any
from pydantic import BaseModel

class DestinationInfo(BaseModel):
    weather_condition: str = "Clear Sky"
    temperature_celsius: int = 28
    emergency_helpline: str = "112 / 100"
    tourist_desk: str = "Goa Tourism Information Desk"
    transit_tips: str = "Airport and railway prepaid cabs available 24/7."

class HotelStayResponse(BaseModel):
    id: str
    trip_id: str
    hotel_name: str
    address: str
    city: str
    check_in_date: str
    check_out_date: str
    original_check_in_time: str
    estimated_arrival_time: str
    status: str
    late_check_in_notified: bool
    room_type: str
    confirmation_code: str
    contact_phone: str
    destination_info: DestinationInfo

class HotelModifyRequest(BaseModel):
    trip_id: Optional[str] = None
    late_check_in_notified: Optional[bool] = None
    new_check_in_date: Optional[str] = None
    new_check_out_date: Optional[str] = None
    special_instructions: Optional[str] = None

class HotelModifyResponse(BaseModel):
    success: bool
    hotel: HotelStayResponse
    message: str
