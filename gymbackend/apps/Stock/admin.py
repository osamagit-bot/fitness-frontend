from django.contrib import admin
from .models import StockIn, StockOut

@admin.register(StockIn)
class StockInAdmin(admin.ModelAdmin):
    list_display = ['item', 'quantity', 'price', 'total_value', 'date', 'created_by']
    list_filter = ['date', 'created_by']
    search_fields = ['item']
    readonly_fields = ['total_value', 'created_at', 'updated_at']

@admin.register(StockOut)
class StockOutAdmin(admin.ModelAdmin):
    list_display = ['item', 'quantity', 'price', 'total_value', 'date', 'created_by']
    list_filter = ['date', 'created_by']
    search_fields = ['item']
    readonly_fields = ['total_value', 'created_at', 'updated_at']