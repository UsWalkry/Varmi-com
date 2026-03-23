#!/bin/bash
#
# Varmii.com - Database Restore Script
# Restores MySQL database from backup
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Configuration
BACKUP_ROOT="/home/burak/backups"
DB_NAME="varmi_db"
DB_USER="varmi_user"
DB_PASS="${DB_PASSWORD:-}"

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_date>"
    echo ""
    echo "Available backups:"
    ls -1 "${BACKUP_ROOT}" | grep "^202" | tail -10
    exit 1
fi

BACKUP_DATE="$1"
BACKUP_DIR="${BACKUP_ROOT}/${BACKUP_DATE}"

if [ ! -d "${BACKUP_DIR}" ]; then
    error "Backup not found: ${BACKUP_DIR}"
    exit 1
fi

# Find database backup file
DB_BACKUP=$(find "${BACKUP_DIR}/database" -name "*.sql.gz" | head -1)

if [ -z "${DB_BACKUP}" ]; then
    error "No database backup found in ${BACKUP_DIR}/database"
    exit 1
fi

log "🔄 Restoring database from: ${DB_BACKUP}"
warn "⚠️  This will REPLACE the current database!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log "Restore cancelled"
    exit 0
fi

if [ -z "$DB_PASS" ]; then
    error "DB_PASSWORD environment variable not set!"
    exit 1
fi

log "💾 Decompressing and restoring..."
gunzip < "${DB_BACKUP}" | mysql -u "${DB_USER}" -p"${DB_PASS}"

if [ $? -eq 0 ]; then
    log "✅ Database restored successfully"
else
    error "Database restore failed!"
    exit 1
fi

# Restore uploads if requested
if [ "$2" == "--with-uploads" ]; then
    UPLOADS_BACKUP=$(find "${BACKUP_DIR}/uploads" -name "*.tar.gz" | head -1)
    if [ ! -z "${UPLOADS_BACKUP}" ]; then
        log "📸 Restoring uploads..."
        tar -xzf "${UPLOADS_BACKUP}" -C /home/burak/varmi-com/server/
        log "✅ Uploads restored"
    fi
fi

log "🎉 Restore completed!"
