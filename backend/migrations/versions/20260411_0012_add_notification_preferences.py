"""add notification_preferences

Revision ID: 20260411_0012
Revises: 20260410_0011
Create Date: 2026-04-11

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260411_0012"
down_revision = "20260410_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("push_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("assignment_reminders", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("course_updates", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("message_notifications", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("marketing_emails", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["public.profiles.id"],
            name="fk_notification_preferences_user_id_profiles",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name="pk_notification_preferences"),
        schema="public",
    )


def downgrade() -> None:
    op.drop_table("notification_preferences", schema="public")
