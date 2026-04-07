"""Add usage tracking fields to jobs table

Revision ID: a1b2c3d4e5f6
Revises: d49fefb816df
Create Date: 2026-04-03 17:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "d49fefb816df"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "jobs", sa.Column("source_size_bytes", sa.BigInteger(), nullable=True)
    )
    op.add_column(
        "jobs", sa.Column("output_size_bytes", sa.BigInteger(), nullable=True)
    )
    op.add_column(
        "jobs", sa.Column("processing_duration_seconds", sa.Float(), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("jobs", "processing_duration_seconds")
    op.drop_column("jobs", "output_size_bytes")
    op.drop_column("jobs", "source_size_bytes")
