"""Create Trip, JourneySegment, TransportBooking, Flight, Train, and Vehicle tables

Revision ID: 0003_trips_segments_bookings
Revises: 0002_user_preferences_policies
Create Date: 2026-09-19 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003_trips_segments_bookings"
down_revision: Union[str, None] = "0002_user_preferences_policies"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. trips table
    op.create_table(
        "trips",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="PLANNED"),
        sa.Column("origin", sa.String(length=255), nullable=False),
        sa.Column("destination", sa.String(length=255), nullable=False),
        sa.Column("start_date", sa.DateTime(), nullable=False),
        sa.Column("end_date", sa.DateTime(), nullable=False),
        sa.Column("total_cost", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column(
            "policy_id",
            sa.String(length=36),
            sa.ForeignKey("travel_policies.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_trips_id", "trips", ["id"], unique=False)
    op.create_index("ix_trips_user_id", "trips", ["user_id"], unique=False)
    op.create_index("ix_trips_status", "trips", ["status"], unique=False)
    op.create_index("ix_trips_policy_id", "trips", ["policy_id"], unique=False)

    # 2. journey_segments table
    op.create_table(
        "journey_segments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "trip_id",
            sa.String(length=36),
            sa.ForeignKey("trips.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sequence_order", sa.Integer(), nullable=False),
        sa.Column("mode", sa.String(length=50), nullable=False),
        sa.Column("origin_location", sa.String(length=255), nullable=False),
        sa.Column("destination_location", sa.String(length=255), nullable=False),
        sa.Column("origin_lat", sa.Float(), nullable=True),
        sa.Column("origin_lon", sa.Float(), nullable=True),
        sa.Column("destination_lat", sa.Float(), nullable=True),
        sa.Column("destination_lon", sa.Float(), nullable=True),
        sa.Column("departure_time", sa.DateTime(), nullable=False),
        sa.Column("arrival_time", sa.DateTime(), nullable=False),
        sa.Column("duration_minutes", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("distance_km", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="PLANNED"),
        sa.Column("estimated_cost", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_journey_segments_id", "journey_segments", ["id"], unique=False)
    op.create_index("ix_journey_segments_trip_id", "journey_segments", ["trip_id"], unique=False)
    op.create_index("ix_journey_segments_sequence_order", "journey_segments", ["sequence_order"], unique=False)
    op.create_index("ix_journey_segments_mode", "journey_segments", ["mode"], unique=False)

    # 3. transport_bookings table
    op.create_table(
        "transport_bookings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "segment_id",
            sa.String(length=36),
            sa.ForeignKey("journey_segments.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("booking_reference", sa.String(length=100), nullable=False),
        sa.Column("provider_name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="CONFIRMED"),
        sa.Column("fare_amount", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("booking_class", sa.String(length=50), nullable=True),
        sa.Column("seat_number", sa.String(length=50), nullable=True),
        sa.Column("ticket_number", sa.String(length=100), nullable=True),
        sa.Column("booked_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_transport_bookings_id", "transport_bookings", ["id"], unique=False)
    op.create_index("ix_transport_bookings_segment_id", "transport_bookings", ["segment_id"], unique=True)
    op.create_index("ix_transport_bookings_booking_reference", "transport_bookings", ["booking_reference"], unique=False)

    # 4. flights table
    op.create_table(
        "flights",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "segment_id",
            sa.String(length=36),
            sa.ForeignKey("journey_segments.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("flight_number", sa.String(length=50), nullable=False),
        sa.Column("airline_code", sa.String(length=10), nullable=False),
        sa.Column("airline_name", sa.String(length=100), nullable=False),
        sa.Column("departure_airport", sa.String(length=10), nullable=False),
        sa.Column("arrival_airport", sa.String(length=10), nullable=False),
        sa.Column("departure_terminal", sa.String(length=50), nullable=True),
        sa.Column("arrival_terminal", sa.String(length=50), nullable=True),
        sa.Column("departure_gate", sa.String(length=50), nullable=True),
        sa.Column("arrival_gate", sa.String(length=50), nullable=True),
        sa.Column("aircraft_type", sa.String(length=100), nullable=True),
        sa.Column("cabin_class", sa.String(length=50), nullable=False, server_default="ECONOMY"),
        sa.Column("seat", sa.String(length=50), nullable=True),
        sa.Column("baggage_allowance", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_flights_id", "flights", ["id"], unique=False)
    op.create_index("ix_flights_segment_id", "flights", ["segment_id"], unique=True)
    op.create_index("ix_flights_flight_number", "flights", ["flight_number"], unique=False)
    op.create_index("ix_flights_airline_code", "flights", ["airline_code"], unique=False)

    # 5. trains table
    op.create_table(
        "trains",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "segment_id",
            sa.String(length=36),
            sa.ForeignKey("journey_segments.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("train_number", sa.String(length=50), nullable=False),
        sa.Column("train_name", sa.String(length=100), nullable=False),
        sa.Column("operator_name", sa.String(length=100), nullable=False),
        sa.Column("departure_station", sa.String(length=100), nullable=False),
        sa.Column("arrival_station", sa.String(length=100), nullable=False),
        sa.Column("departure_platform", sa.String(length=50), nullable=True),
        sa.Column("arrival_platform", sa.String(length=50), nullable=True),
        sa.Column("coach_number", sa.String(length=50), nullable=True),
        sa.Column("seat_berth_number", sa.String(length=50), nullable=True),
        sa.Column("travel_class", sa.String(length=50), nullable=False, server_default="STANDARD"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_trains_id", "trains", ["id"], unique=False)
    op.create_index("ix_trains_segment_id", "trains", ["segment_id"], unique=True)
    op.create_index("ix_trains_train_number", "trains", ["train_number"], unique=False)

    # 6. vehicles table
    op.create_table(
        "vehicles",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "segment_id",
            sa.String(length=36),
            sa.ForeignKey("journey_segments.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("vehicle_type", sa.String(length=50), nullable=False, server_default="TAXI"),
        sa.Column("provider_name", sa.String(length=100), nullable=False),
        sa.Column("vehicle_model", sa.String(length=100), nullable=True),
        sa.Column("license_plate", sa.String(length=50), nullable=True),
        sa.Column("driver_name", sa.String(length=100), nullable=True),
        sa.Column("driver_phone", sa.String(length=50), nullable=True),
        sa.Column("pickup_address", sa.String(length=255), nullable=True),
        sa.Column("dropoff_address", sa.String(length=255), nullable=True),
        sa.Column("confirmation_code", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_vehicles_id", "vehicles", ["id"], unique=False)
    op.create_index("ix_vehicles_segment_id", "vehicles", ["segment_id"], unique=True)
    op.create_index("ix_vehicles_vehicle_type", "vehicles", ["vehicle_type"], unique=False)


def downgrade() -> None:
    op.drop_table("vehicles")
    op.drop_table("trains")
    op.drop_table("flights")
    op.drop_table("transport_bookings")
    op.drop_table("journey_segments")
    op.drop_table("trips")
