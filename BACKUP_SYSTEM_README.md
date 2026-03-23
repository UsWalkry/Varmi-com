# Varmii.com Automated Backup System

## 📦 Backup Components

### 1. Database Backup
- **Database:** varmi_db
- **Method:** mysqldump with gzip compression
- **Options:** Single transaction, routines, triggers, events
- **Format:** `.sql.gz`

### 2. Uploads Backup
- **Directory:** `/home/burak/varmi-com/server/uploads`
- **Method:** tar.gz compression
- **Format:** `uploads_YYYYMMDD_HHMMSS.tar.gz`

### 3. Configuration Backup
- **Directory:** `/home/burak/varmi-com/server`
- **Includes:** Source code, configs (excluding node_modules, dist)
- **Excludes:** `.env` backed up separately with 600 permissions
- **Format:** `config_YYYYMMDD_HHMMSS.tar.gz`

## ⏰ Schedule

**Automated backups run daily at 2:00 AM UTC** via cron:
```cron
0 2 * * * export DB_PASSWORD=*** && /home/burak/backup-script.sh >> /home/burak/backup-cron.log 2>&1
```

## 📂 Backup Location

```
/home/burak/backups/
├── 20260211_060818/
│   ├── database/
│   │   └── varmi_db_20260211_060818.sql.gz
│   ├── uploads/
│   │   └── uploads_20260211_060818.tar.gz
│   ├── config/
│   │   ├── config_20260211_060818.tar.gz
│   │   └── .env
│   └── MANIFEST.txt
└── ...
```

## 🔄 Retention Policy

- **Retention:** 7 days
- **Automatic cleanup:** Backups older than 7 days are automatically deleted
- **Manual backups:** Can be preserved by moving outside `/home/burak/backups/`

## 🚀 Usage

### Manual Backup
```bash
export DB_PASSWORD=your_password
~/backup-script.sh
```

### List Backups
```bash
ls -lt ~/backups/
```

### View Backup Details
```bash
cat ~/backups/YYYYMMDD_HHMMSS/MANIFEST.txt
```

### Restore Database
```bash
export DB_PASSWORD=your_password
~/restore-script.sh YYYYMMDD_HHMMSS
```

### Restore Database + Uploads
```bash
export DB_PASSWORD=your_password
~/restore-script.sh YYYYMMDD_HHMMSS --with-uploads
```

## 📊 Backup Sizes (Typical)

- **Database:** ~20 KB (compressed)
- **Uploads:** ~11 MB (images/files)
- **Config:** ~88 KB (source code)
- **Total:** ~11 MB per backup

## ☁️ Cloud Storage (Optional)

To enable cloud backup, set environment variable:
```bash
export BACKUP_CLOUD_BUCKET="s3://your-bucket"  # AWS S3
export BACKUP_CLOUD_BUCKET="your-remote:path"   # rclone
```

Supported methods:
- AWS S3 (`aws s3 sync`)
- rclone (any cloud provider)
- Custom upload script

## 🔔 Notifications (Optional)

To receive backup notifications, set webhook URL:
```bash
export BACKUP_WEBHOOK_URL="https://hooks.slack.com/..."  # Slack
export BACKUP_WEBHOOK_URL="https://discord.com/api/..."  # Discord
```

## 🛡️ Security

- **DB Password:** Stored in `~/.bashrc` as `DB_PASSWORD` env variable
- **.env:** Backed up with 600 permissions (owner read/write only)
- **Backup directory:** Accessible only by `burak` user

## 📝 Logs

- **Cron logs:** `/home/burak/backup-cron.log`
- **Script output:** Console output includes timestamps and emojis

## ⚠️ Important Notes

1. **Test restores regularly** to ensure backups are valid
2. **Monitor disk space** - 7 days × 11MB = ~77MB required
3. **DB password** must be set in environment or script will fail
4. **PROCESS privilege warning** is normal - backups still work

## 🔧 Maintenance

### Check Cron Status
```bash
crontab -l
```

### View Recent Backup Logs
```bash
tail -50 ~/backup-cron.log
```

### Test Backup Script
```bash
export DB_PASSWORD=your_password
~/backup-script.sh
```

### Disable Scheduled Backups
```bash
crontab -r
```

### Re-enable Scheduled Backups
```bash
cat > /tmp/varmii-cron << 'EOF'
0 2 * * * export DB_PASSWORD=Varmi2026! && /home/burak/backup-script.sh >> /home/burak/backup-cron.log 2>&1
EOF
crontab /tmp/varmii-cron
```
