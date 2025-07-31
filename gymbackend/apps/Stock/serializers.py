from rest_framework import serializers
from django.db.models import Sum
from .models import StockIn, StockOut

class StockInSerializer(serializers.ModelSerializer):
    total_value = serializers.ReadOnlyField()
    
    class Meta:
        model = StockIn
        fields = ['id', 'item', 'quantity', 'price', 'date', 'total_value', 'created_at']
        
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class StockOutSerializer(serializers.ModelSerializer):
    total_value = serializers.ReadOnlyField()
    available_quantity = serializers.SerializerMethodField()
    cost_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    total_profit = serializers.SerializerMethodField()
    
    class Meta:
        model = StockOut
        fields = ['id', 'item', 'quantity', 'price', 'date', 'total_value', 'cost_price', 'total_profit', 'created_at', 'deleted_at', 'available_quantity']
        
    def get_available_quantity(self, obj):
        """Get current available quantity for this item"""
        user = self.context['request'].user
        
        # Total stock in
        total_in = StockIn.objects.filter(
            created_by=user, 
            item=obj.item
        ).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        # Total stock out
        total_out = StockOut.objects.filter(
            created_by=user, 
            item=obj.item
        ).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        return total_in - total_out
    
    def validate(self, data):
        """Validate that there's enough stock available"""
        user = self.context['request'].user
        item_name = data['item']
        quantity_to_sell = data['quantity']
        
        # Calculate current available stock
        total_in = StockIn.objects.filter(
            created_by=user, 
            item=item_name
        ).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        total_out = StockOut.objects.filter(
            created_by=user, 
            item=item_name
        ).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        # If updating, exclude current instance from total_out
        if self.instance:
            total_out -= self.instance.quantity
            
        available_quantity = total_in - total_out
        
        if quantity_to_sell > available_quantity:
            raise serializers.ValidationError(
                f"Insufficient stock. Available quantity: {available_quantity}, "
                f"Requested quantity: {quantity_to_sell}"
            )
            
        return data
    
    def get_total_profit(self, obj):
        return obj.total_profit
        
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        
        # If cost_price not provided, get it from latest StockIn entry
        if 'cost_price' not in validated_data or validated_data['cost_price'] == 0:
            latest_stock = StockIn.objects.filter(
                created_by=self.context['request'].user,
                item=validated_data['item']
            ).order_by('-created_at').first()
            
            if latest_stock:
                validated_data['cost_price'] = latest_stock.price
        
        return super().create(validated_data)