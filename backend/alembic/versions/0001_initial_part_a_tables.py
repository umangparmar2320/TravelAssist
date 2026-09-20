"""Initial Part A tables for Route Planning

Revision ID: 0001_initial_part_a
Revises: 
Create Date: 2026-09-19 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_part_a"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. route_plans
    op.create_table(
        "route_plans",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("origin_name", sa.String(length=255), nullable=False),
        sa.Column("origin_lat", sa.Float(), nullable=False),
        sa.Column("origin_lon", sa.Float(), nullable=False),
        sa.Column("destination_name", sa.String(length=255), nullable=False),
        sa.Column("destination_lat", sa.Float(), nullable=False),
        sa.Column("destination_lon", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="COMPUTED"),
        sa.Column("travel_mode", sa.String(length=50), nullable=False, server_default="MULTI_MODAL"),
        sa.Column("preference", sa.String(length=50), nullable=False, server_default="FASTEST"),
        sa.Column("total_distance_km", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("total_duration_minutes", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("estimated_cost", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("carbon_emissions_kg", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_route_plans_id", "route_plans", ["id"], unique=False)
    op.create_index("ix_route_plans_status", "route_plans", ["status"], unique=False)

    # 2. route_segments
    op.create_table(
        "route_segments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("route_id", sa.String(length=36), sa.ForeignKey("route_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence_order", sa.Integer(), nullable=False),
        sa.Column("start_name", sa.String(length=255), nullable=False),
        sa.Column("start_lat", sa.Float(), nullable=False),
        sa.Column("start_lon", sa.Float(), nullable=False),
        sa.Column("end_name", sa.String(length=255), nullable=False),
        sa.Column("end_lat", sa.Float(), nullable=False),
        sa.Column("end_lon", sa.Float(), nullable=False),
        sa.Column("mode", sa.String(length=50), nullable=False, server_default="TRANSIT"),
        sa.Column("provider_name", sa.String(length=100), nullable=False, server_default="MockProvider"),
        sa.Column("distance_km", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("duration_minutes", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("delay_minutes", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_route_segments_id", "route_segments", ["id"], unique=False)
    op.create_index("ix_route_segments_route_id", "route_segments", ["route_id"], unique=False)

    # 3. locations
    op.create_table(
        "locations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=False, server_default="TRANSIT_HUB"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_locations_id", "locations", ["id"], unique=False)
    op.create_index("ix_locations_name", "locations", ["name"], unique=False)
    op.create_index("ix_locations_city", "locations", ["city"], unique=False)

    # 4. provider_health_records
    op.create_table(
        "provider_health_records",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("provider_name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="OPERATIONAL"),
        sa.Column("latency_ms", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("endpoint_url", sa.String(length=255), nullable=True),
        sa.Column("checked_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_provider_health_records_id", "provider_health_records", ["id"], unique=False)
    op.create_index("ix_provider_health_records_provider_name", "provider_health_records", ["provider_name"], unique=False)


def downgrade() -> None:
    op.drop_table("provider_health_records")
    op.drop_table("locations")
    op.drop_table("route_segments")
    op.drop_table("route_plans")
