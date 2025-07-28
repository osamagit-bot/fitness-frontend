from django.db import models
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
import subprocess
import os
import json
from datetime import datetime

class SiteSettings(models.Model):
    email_notifications_enabled = models.BooleanField(default=True)
    whatsapp_notifications_enabled = models.BooleanField(default=False)
    maintenance_mode_enabled = models.BooleanField(default=False)
    maintenance_mode_enabled = models.BooleanField(default=False)
    # Add other global settings as needed

    def __str__(self):
        return f"SiteSettings (Email: {self.email_notifications_enabled}, WhatsApp: {self.whatsapp_notifications_enabled}, Maintenance: {self.maintenance_mode_enabled}, Maintenance: {self.maintenance_mode_enabled})"

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


@api_view(['POST'])
@permission_classes([IsAdminUser])
def backup_database(request):
    """Create comprehensive database backup"""
    try:
        # Run comprehensive backup command
        result = subprocess.run(
            ['python', 'manage.py', 'comprehensive_backup'],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        )
        
        if result.returncode == 0:
            # Parse output to get backup details
            output_lines = result.stdout.strip().split('\n')
            
            # Extract backup info from output
            backup_info = {
                'filename': 'comprehensive_backup_' + datetime.now().strftime('%Y%m%d_%H%M%S') + '.json',
                'records': 'Multiple models',
                'size_kb': 'Variable'
            }
            
            return Response({
                'success': True,
                'message': 'Database backup created successfully',
                'details': backup_info
            })
        else:
            return Response({
                'success': False,
                'message': f'Backup failed: {result.stderr}'
            }, status=500)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Backup error: {str(e)}'
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_backups(request):
    """List available backup files"""
    try:
        backups_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backups')
        
        if not os.path.exists(backups_dir):
            return Response({
                'success': True,
                'backups': []
            })
        
        backup_files = []
        for filename in os.listdir(backups_dir):
            if filename.endswith('.json') and ('backup' in filename):
                file_path = os.path.join(backups_dir, filename)
                file_stat = os.stat(file_path)
                
                backup_files.append({
                    'filename': filename,
                    'created': datetime.fromtimestamp(file_stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                    'size_kb': round(file_stat.st_size / 1024, 2)
                })
        
        # Sort by creation time (newest first)
        backup_files.sort(key=lambda x: x['created'], reverse=True)
        
        return Response({
            'success': True,
            'backups': backup_files
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error listing backups: {str(e)}'
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def restore_database(request):
    """Restore database from backup"""
    try:
        backup_filename = request.data.get('backup_filename')
        if not backup_filename:
            return Response({
                'success': False,
                'message': 'Backup filename is required'
            }, status=400)
        
        backups_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backups')
        backup_path = os.path.join(backups_dir, backup_filename)
        
        if not os.path.exists(backup_path):
            return Response({
                'success': False,
                'message': 'Backup file not found'
            }, status=404)
        
        # Run restore command
        result = subprocess.run(
            ['python', 'manage.py', 'restore_db', backup_path, '--confirm'],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        )
        
        if result.returncode == 0:
            return Response({
                'success': True,
                'message': 'Database restored successfully',
                'details': {
                    'restored_from': backup_filename,
                    'records_restored': 'Multiple models',
                    'emergency_backup': 'Created automatically'
                }
            })
        else:
            return Response({
                'success': False,
                'message': f'Restore failed: {result.stderr}'
            }, status=500)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Restore error: {str(e)}'
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def inspect_backup(request):
    """Inspect backup file contents"""
    try:
        filename = request.GET.get('filename')
        if not filename:
            return Response({
                'success': False,
                'message': 'Filename parameter is required'
            }, status=400)
        
        backups_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backups')
        backup_path = os.path.join(backups_dir, filename)
        
        if not os.path.exists(backup_path):
            return Response({
                'success': False,
                'message': 'Backup file not found'
            }, status=404)
        
        # Read and analyze backup file
        with open(backup_path, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)
        
        # Count models and extract member info
        model_counts = {}
        members = []
        
        for item in backup_data:
            model = item.get('model', 'unknown')
            model_counts[model] = model_counts.get(model, 0) + 1
            
            if model == 'Member.member':
                fields = item.get('fields', {})
                members.append({
                    'pk': item.get('pk'),
                    'user_id': fields.get('user'),
                    'membership_type': fields.get('membership_type', 'Unknown')
                })
        
        return Response({
            'success': True,
            'total_records': len(backup_data),
            'model_counts': model_counts,
            'members': members[:10]  # Show first 10 members
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Inspection error: {str(e)}'
        }, status=500)
