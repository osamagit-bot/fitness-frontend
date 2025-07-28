# =============================================================================
# GYM MANAGEMENT SYSTEM - DATABASE BACKUP UTILITY (PowerShell)
# =============================================================================
# Production & Development Ready - Most Reliable Version
# =============================================================================

param(
    [string]$Type = "manual"
)

Write-Host "🗄️ Gym Database Backup Utility v2.0 (PowerShell)" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Create backups directory
if (!(Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
    Write-Host "📁 Created backups directory" -ForegroundColor Yellow
}

# Generate timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "📦 Creating clean database backup..." -ForegroundColor Yellow
Write-Host "   Type: $Type" -ForegroundColor Cyan
Write-Host "   Time: $timestamp" -ForegroundColor Cyan

# Create backup with error suppression
$backupFile = "backups\gym_backup_$timestamp.json"
$process = Start-Process -FilePath "python" -ArgumentList @(
    "manage.py", "dumpdata", 
    "--natural-foreign", "--natural-primary", "--indent=2",
    "--exclude=sessions", "--exclude=admin.logentry", 
    "--exclude=contenttypes", "--exclude=auth.permission"
) -RedirectStandardOutput $backupFile -RedirectStandardError $null -Wait -PassThru

if ($process.ExitCode -eq 0) {
    # Verify JSON format
    try {
        $data = Get-Content $backupFile -Raw | ConvertFrom-Json
        $recordCount = $data.Count
        
        Write-Host "✅ Backup created successfully!" -ForegroundColor Green
        Write-Host "   File: $backupFile" -ForegroundColor Cyan
        Write-Host "   Records: $recordCount" -ForegroundColor Cyan
        
        # Show file size
        $file = Get-Item $backupFile
        $sizeKB = [math]::Round($file.Length / 1KB, 2)
        Write-Host "   Size: $sizeKB KB" -ForegroundColor Cyan
        
        # Auto-cleanup for automated backups
        if ($Type -eq "auto") {
            Write-Host "🧹 Cleaning old backups..." -ForegroundColor Yellow
            $cutoffDate = (Get-Date).AddDays(-7)
            Get-ChildItem "backups\gym_backup_*.json" | Where-Object { $_.LastWriteTime -lt $cutoffDate } | Remove-Item
        }
        
        # Show backup summary
        $backupFiles = Get-ChildItem "backups\gym_backup_*.json"
        Write-Host "📊 Total backups: $($backupFiles.Count)" -ForegroundColor Cyan
        
    } catch {
        Write-Host "❌ Backup file is corrupted - invalid JSON format" -ForegroundColor Red
        Remove-Item $backupFile -ErrorAction SilentlyContinue
        exit 1
    }
} else {
    Write-Host "❌ Backup creation failed" -ForegroundColor Red
    exit 1
}

if ($Type -ne "auto") {
    Write-Host ""
    Write-Host "🎉 Backup completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  - Test restore: .\restore.bat [backup_file] --confirm" -ForegroundColor White
    Write-Host "  - Incremental backup: python manage.py incremental_backup" -ForegroundColor White
    Write-Host "  - Schedule daily: Use Task Scheduler with 'powershell -File backup.ps1 -Type auto'" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to continue"
}
