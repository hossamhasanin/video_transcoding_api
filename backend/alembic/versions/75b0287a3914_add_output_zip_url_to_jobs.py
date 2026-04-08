"""add output_zip_url to jobs

Revision ID: 75b0287a3914
Revises: c3d4e5f6a7b8
Create Date: 2026-04-08 12:15:51.940618

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '75b0287a3914'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("jobs", sa.Column("output_zip_url", sa.String(2048), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("jobs", "output_zip_url")
