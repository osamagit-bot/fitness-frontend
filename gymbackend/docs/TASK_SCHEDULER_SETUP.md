# 🕐 Windows Task Scheduler Setup Guide

## Quick Setup Steps

### 1. Open Task Scheduler
- Press `Win + R`, type `taskschd.msc`, press Enter
- Or search "Task Scheduler" in Start menu

### 2. Create Basic Task
1. Click **"Create Basic Task..."** in right panel
2. **Name**: `Gym Database Daily Backup`
3. **Description**: `Automated daily backup of gym management database`
4. Click **Next**

### 3. Set Trigger
1. Select **"Daily"**
2. Click **Next**
3. **Start date**: Today's date
4. **Start time**: `02:00:00 AM` (2 AM when system is idle)
5. **Recur every**: `1 days`
6. Click **Next**

### 4. Set Action
1. Select **"Start a program"**
2. Click **Next**
3. **Program/script**: `C:\path\to\your\gymbackend\backup.bat`
4. **Add arguments**: `auto`
5. **Start in**: `C:\path\to\your\gymbackend`
6. Click **Next**

### 5. Finish Setup
1. Check **"Open the Properties dialog..."**
2. Click **Finish**

### 6. Advanced Settings (Properties Dialog)
1. **General Tab**:
   - ✅ Check "Run whether user is logged on or not"
   - ✅ Check "Run with highest privileges"
   
2. **Conditions Tab**:
   - ✅ Uncheck "Start the task only if the computer is on AC power"
   - ✅ Check "Wake the computer to run this task"
   
3. **Settings Tab**:
   - ✅ Check "Allow task to be run on demand"
   - ✅ Check "Run task as soon as possible after a scheduled start is missed"
   - **If the task fails, restart every**: `15 minutes`
   - **Attempt to restart up to**: `3 times`

4. Click **OK**

### 7. Test the Task
1. Right-click your task in Task Scheduler
2. Click **"Run"**
3. Check `backups\` folder for new backup file
4. Verify backup is valid JSON

## PowerShell Alternative (More Reliable)

```powershell
# Create scheduled task via PowerShell (Run as Administrator)
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\path\to\gymbackend\backup.ps1 -Type auto"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName "Gym Database Daily Backup" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Automated daily backup of gym management database"
```

## Monitoring & Maintenance

### Check Task Status
1. Open Task Scheduler
2. Find your task in **Task Scheduler Library**
3. Check **"Last Run Result"** column (should be `0x0` for success)
4. View **History** tab for detailed logs

### Email Notifications (Optional)
1. Task Properties → **Actions** tab
2. Click **New** → **Send an e-mail**
3. Configure SMTP settings for backup notifications