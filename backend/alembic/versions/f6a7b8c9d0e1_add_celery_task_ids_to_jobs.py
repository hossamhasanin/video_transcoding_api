"""add celery task ids to jobs

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-09 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6a7b8c9d0e1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add celery_task_id and subtitle_task_id columns to jobs."""
    op.add_column(
        "jobs", sa.Column("celery_task_id", sa.String(255), nullable=True)
    )
    op.add_column(
        "jobs", sa.Column("subtitle_task_id", sa.String(255), nullable=True)
    )


def downgrade() -> None:
    """Remove celery task ID columns from jobs."""
    op.drop_column("jobs", "subtitle_task_id")
    op.drop_column("jobs", "celery_task_id")
