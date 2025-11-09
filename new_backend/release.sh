# Exit on any error
set -e

# Run database migrations
.venv/bin/alembic upgrade head

# Run your data initialization script
.venv/bin/python init_db.py