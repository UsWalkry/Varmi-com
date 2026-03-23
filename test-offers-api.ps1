#!/usr/bin/env pwsh

Write-Host "🧪 Testing Offers API..." -ForegroundColor Green

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8787/api/offers/listing/ba5dad8c-fd01-4c75-b4d3-1ce210c8f583" -Method GET -ContentType "application/json"
    
    Write-Host "✅ API Response received:" -ForegroundColor Green
    Write-Host "Success: $($response.success)" -ForegroundColor Yellow
    
    if ($response.offers) {
        Write-Host "Offers count: $($response.offers.Count)" -ForegroundColor Yellow
        
        foreach ($offer in $response.offers) {
            Write-Host "📋 Offer:" -ForegroundColor Cyan
            Write-Host "  ID: $($offer.id)" -ForegroundColor White
            Write-Host "  Seller: $($offer.seller_name)" -ForegroundColor White
            Write-Host "  Price: $($offer.price)" -ForegroundColor White
            Write-Host "  Rating Count: $($offer.seller_rating_count)" -ForegroundColor White
            Write-Host "  Email Verified: $($offer.seller_email_verified)" -ForegroundColor White
            Write-Host "  Status: $($offer.status)" -ForegroundColor White
            Write-Host ""
        }
    } else {
        Write-Host "❌ No offers found in response" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ API Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}