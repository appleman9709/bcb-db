# Generate VAPID keys for Push Notifications
# This script uses web-push package to generate VAPID keys

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VAPID Keys Generator for BabyCare Dashboard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npx is available
try {
    $npxVersion = npx --version
    Write-Host "npx version: $npxVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npx is not available!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Generating VAPID keys..." -ForegroundColor Yellow
Write-Host ""

# Generate VAPID keys
try {
    $output = npx --yes web-push generate-vapid-keys 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: VAPID keys generated!" -ForegroundColor Green
        Write-Host ""
        
        # Parse and display keys
        $publicKey = ($output | Select-String "Public Key:").ToString().Replace("Public Key:", "").Trim()
        $privateKey = ($output | Select-String "Private Key:").ToString().Replace("Private Key:", "").Trim()
        
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "VAPID Keys (copy these to your config):" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Public Key (use in src/services/pushNotificationService.ts):" -ForegroundColor Yellow
        Write-Host $publicKey -ForegroundColor White
        Write-Host ""
        Write-Host "Private Key (use on your server ONLY):" -ForegroundColor Yellow
        Write-Host $privateKey -ForegroundColor Red
        Write-Host ""
        
        # Save to file
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $fileName = "vapid-keys_$timestamp.txt"
        
        $content = @"
VAPID Keys Generated: $(Get-Date)

Public Key (Client - use in pushNotificationService.ts):
$publicKey

Private Key (Server ONLY - keep secret!):
$privateKey

IMPORTANT:
- NEVER share your private key
- Store private key securely on your server
- Public key is safe to use in client-side code
- Replace VAPID_PUBLIC_KEY in src/services/pushNotificationService.ts with the public key above
- Use private key on your server for sending push notifications
"@
        
        $content | Out-File -FilePath $fileName -Encoding UTF8
        Write-Host "Keys saved to: $fileName" -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Copy the Public Key to src/services/pushNotificationService.ts" -ForegroundColor Yellow
        Write-Host "2. Store the Private Key securely on your server" -ForegroundColor Yellow
        Write-Host "3. Never commit the Private Key to git!" -ForegroundColor Yellow
        Write-Host "4. Run the SQL migration: database_push_notifications.sql" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Cyan
        
    } else {
        Write-Host "ERROR: Failed to generate keys" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

