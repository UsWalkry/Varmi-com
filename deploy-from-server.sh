#!/bin/bash
# Schema.org Deploy Script - Run this on the server
# Sunucuda bu script'i çalıştırın

echo "🚀 Schema.org Deploy Starting..."
cd ~/varmi-com/server

# Backend dosyalarını kontrol et
echo "📦 Checking backend files..."
ls -lh dist/utils/schemaGenerator.js 2>/dev/null && echo "✅ schemaGenerator.js EXISTS" || echo "❌ schemaGenerator.js MISSING"
ls -lh dist/routes/listings.js 2>/dev/null && echo "✅ listings.js EXISTS" || echo "❌ listings.js MISSING"

# PM2 restart
echo ""
echo "🔄 Restarting backend..."
pm2 restart varmi-mail-server

# Logs
echo ""
echo "📋 Recent logs:"
pm2 logs varmi-mail-server --lines 20 --nostream

# Test
echo ""
echo "✅ Testing API..."
curl -s https://varmii.com/api/listings/active | jq '.schema' 2>/dev/null || curl -s https://varmii.com/api/listings/active | grep -o '"schema":{[^}]*}'

echo ""
echo "✅ Deploy complete!"
