#!/bin/bash
#
# Varmii.com - Automated Backup Script
# Backs up MySQL database, uploaded files, and configuration
# Supports local storage and optional cloud upload
#

set -e

# Configuration
BACKUP_ROOT="/home/burak/backups"
DB_NAME="varmi_db"
DB_USER="varmi_user"
DB_PASS="${DB_PASSWORD:-}"  # Set via environment variable or prompt
UPLOADS_DIR="/home/burak/varmi-com/server/uploads"
CONFIG_DIR="/home/burak/varmi-com/server"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${DATE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory
mkdir -p "${BACKUP_DIR}"/{database,uploads,config}

log "🔄 Starting backup process..."
log "📁 Backup directory: ${BACKUP_DIR}"

# 1. Database Backup
log "💾 Backing up MySQL database: ${DB_NAME}"
if [ -z "$DB_PASS" ]; then
    error "DB_PASSWORD environment variable not set!"
    exit 1
fi

mysqldump -u "${DB_USER}" -p"${DB_PASS}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --add-drop-database \
    --databases "${DB_NAME}" \
    | gzip > "${BACKUP_DIR}/database/${DB_NAME}_${DATE}.sql.gz"

if [ $? -eq 0 ]; then
    DB_SIZE=$(du -h "${BACKUP_DIR}/database/${DB_NAME}_${DATE}.sql.gz" | cut -f1)
    log "✅ Database backup completed (${DB_SIZE})"
else
    error "Database backup failed!"
    exit 1
fi

# 2. Uploads Backup
if [ -d "${UPLOADS_DIR}" ]; then
    log "📸 Backing up uploaded files..."
    tar -czf "${BACKUP_DIR}/uploads/uploads_${DATE}.tar.gz" \
        -C "$(dirname ${UPLOADS_DIR})" \
        "$(basename ${UPLOADS_DIR})" 2>/dev/null || warn "Some files skipped"
    
    UPLOADS_SIZE=$(du -h "${BACKUP_DIR}/uploads/uploads_${DATE}.tar.gz" | cut -f1)
    log "✅ Uploads backup completed (${UPLOADS_SIZE})"
else
    warn "Uploads directory not found: ${UPLOADS_DIR}"
fi

# 3. Configuration Backup
log "⚙️  Backing up configuration files..."
tar -czf "${BACKUP_DIR}/config/config_${DATE}.tar.gz" \
    -C "${CONFIG_DIR}" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=uploads \
    --exclude=.env \
    . 2>/dev/null || warn "Some config files skipped"

# Backup .env separately with limited permissions
if [ -f "${CONFIG_DIR}/.env" ]; then
    cp "${CONFIG_DIR}/.env" "${BACKUP_DIR}/config/.env"
    chmod 600 "${BACKUP_DIR}/config/.env"
fi

CONFIG_SIZE=$(du -h "${BACKUP_DIR}/config/config_${DATE}.tar.gz" | cut -f1)
log "✅ Configuration backup completed (${CONFIG_SIZE})"

# 4. Create backup manifest
cat > "${BACKUP_DIR}/MANIFEST.txt" << EOF
Varmii.com Backup Manifest
========================
Date: $(date)
Hostname: $(hostname)
Backup ID: ${DATE}

Contents:
- Database: ${DB_NAME} (${DB_SIZE})
- Uploads: ${UPLOADS_SIZE}
- Config: ${CONFIG_SIZE}

Backup Location: ${BACKUP_DIR}
EOF

# 5. Calculate total size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log "📦 Total backup size: ${TOTAL_SIZE}"

# 6. Cleanup old backups
log "🗑️  Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_ROOT}" -maxdepth 1 -type d -name "202*" -mtime +${RETENTION_DAYS} -exec rm -rf {} \; 2>/dev/null || true

REMAINING=$(find "${BACKUP_ROOT}" -maxdepth 1 -type d -name "202*" | wc -l)
log "✅ Cleanup completed (${REMAINING} backups remaining)"

# 7. Optional: Upload to cloud storage (if configured)
if [ ! -z "${BACKUP_CLOUD_BUCKET}" ]; then
    log "☁️  Uploading to cloud storage..."
    # Example for AWS S3:
    # aws s3 sync "${BACKUP_DIR}" "s3://${BACKUP_CLOUD_BUCKET}/varmii-backups/${DATE}/"
    # Example for rclone:
    # rclone sync "${BACKUP_DIR}" "${BACKUP_CLOUD_BUCKET}:varmii-backups/${DATE}/"
    warn "Cloud backup not configured (set BACKUP_CLOUD_BUCKET)"
fi

# 8. Send notification (optional)
if [ ! -z "${BACKUP_WEBHOOK_URL}" ]; then
    curl -X POST "${BACKUP_WEBHOOK_URL}" \
        -H "Content-Type: application/json" \
        -d "{\"text\":\"✅ Varmii backup completed: ${DATE} (${TOTAL_SIZE})\"}" \
        >/dev/null 2>&1 || warn "Notification webhook failed"
fi

log "🎉 Backup completed successfully!"
log "📊 Summary:"
echo "   Location: ${BACKUP_DIR}"
echo "   Total Size: ${TOTAL_SIZE}"
echo "   Retention: ${RETENTION_DAYS} days"

exit 0
