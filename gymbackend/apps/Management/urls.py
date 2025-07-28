from django.urls import path
from . import views

urlpatterns = [
    path('backup-database/', views.admin_backup_database, name='admin_backup_database'),
    path('backup-status/', views.admin_backup_status, name='admin_backup_status'),
    path('restore-database/', views.admin_restore_database, name='admin_restore_database'),
    path('list-backups/', views.list_backup_files, name='list_backup_files'),
    path('inspect-backup/', views.inspect_backup, name='inspect_backup_file'),
    
    path('get_global_notification_settings/', views.get_global_notification_settings, name='get_global_notification_settings'),
    path('set_global_notification_settings/', views.set_global_notification_settings, name='set_global_notification_settings'),
    
    path('admin-dashboard/maintenance-mode/', views.get_maintenance_mode, name='get_maintenance_mode'),
    path('admin-dashboard/set-maintenance-mode/', views.set_maintenance_mode, name='set_maintenance_mode'),
]


