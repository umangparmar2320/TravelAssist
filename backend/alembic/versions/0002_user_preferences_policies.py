"""Create User, TravelerPreference, and TravelPolicy tables

Revision ID: 0002_user_preferences_policies
Revises: 0001_initial_part_a
Create Date: 2026-09-19 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002_user_preferences_policies"
down_revision: Union[str, None] = "0001_initial_part_a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="TRAVELER"),
        sa.Column("company_id", sa.String(length=100), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("phone_number", sa.String(length=50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)
    op.create_index("ix_users_company_id", "users", ["company_id"], unique=False)

    # 2. traveler_preferences table
    op.create_table(
        "traveler_preferences",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("cabin_class", sa.String(length=50), nullable=False, server_default="ECONOMY"),
        sa.Column("preferred_airlines", sa.JSON(), nullable=False),
        sa.Column("preferred_transport_modes", sa.JSON(), nullable=False),
        sa.Column("max_waiting_time_minutes", sa.Integer(), nullable=False, server_default="120"),
        sa.Column("max_stops", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("seat_preference", sa.String(length=50), nullable=True, server_default="AISLE"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_traveler_preferences_id", "traveler_preferences", ["id"], unique=False)
    op.create_index("ix_traveler_preferences_user_id", "traveler_preferences", ["user_id"], unique=True)

    # 3. travel_policies table
    op.create_table(
        "travel_policies",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("company_id", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("max_additional_fare", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("max_stops", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("preferred_airlines", sa.JSON(), nullable=False),
        sa.Column("blocked_airlines", sa.JSON(), nullable=False),
        sa.Column("auto_rebooking_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("approval_required_conditions", sa.JSON(), nullable=False),
        sa.Column("max_cabin_class", sa.String(length=50), nullable=False, server_default="ECONOMY"),
        sa.Column(
            "created_by_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_travel_policies_id", "travel_policies", ["id"], unique=False)
    op.create_index("ix_travel_policies_name", "travel_policies", ["name"], unique=False)
    op.create_index("ix_travel_policies_company_id", "travel_policies", ["company_id"], unique=False)
    op.create_index("ix_travel_policies_is_active", "travel_policies", ["is_active"], unique=False)
    op.create_index("ix_travel_policies_created_by_id", "travel_policies", ["created_by_id"], unique=False)


def downgrade() -> None:
    op.drop_table("travel_policies")
    op.drop_table("traveler_preferences")
    op.drop_table("users")
