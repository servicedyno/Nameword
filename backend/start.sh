#!/bin/bash
set -a
source /app/backend/.env
set +a
exec node /app/backend/bin/www
