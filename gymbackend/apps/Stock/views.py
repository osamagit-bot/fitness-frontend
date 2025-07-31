from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.db import models
from django.utils import timezone
from .models import StockIn, StockOut, PermanentlyDeletedSale, SalesSummarySnapshot
from .serializers import StockInSerializer, StockOutSerializer

class StockInViewSet(viewsets.ModelViewSet):
    serializer_class = StockInSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return StockIn.objects.filter(created_by=self.request.user).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """Override list to include available quantities"""
        queryset = self.get_queryset()
        
        # Group by item and calculate available quantities
        items_with_available_qty = []
        processed_items = set()
        
        for stock_item in queryset:
            if stock_item.item not in processed_items:
                # Calculate available quantity for this item
                total_in = StockIn.objects.filter(
                    created_by=request.user,
                    item=stock_item.item
                ).aggregate(Sum('quantity'))['quantity__sum'] or 0
                
                # Count all sales: active + soft-deleted + permanently deleted
                active_out = StockOut.objects.filter(
                    created_by=request.user,
                    item=stock_item.item
                ).aggregate(Sum('quantity'))['quantity__sum'] or 0
                
                permanent_out = PermanentlyDeletedSale.objects.filter(
                    created_by=request.user,
                    item=stock_item.item
                ).aggregate(Sum('quantity'))['quantity__sum'] or 0
                
                total_out = active_out + permanent_out
                
                available_qty = total_in - total_out
                
                # Create a modified item data
                item_data = self.get_serializer(stock_item).data
                item_data['available_quantity'] = available_qty
                items_with_available_qty.append(item_data)
                processed_items.add(stock_item.item)
        
        return Response({'results': items_with_available_qty})
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        user = request.user
        
        # Get all unique items
        stock_items = StockIn.objects.filter(created_by=user).values('item').distinct()
        
        total_available_value = 0
        unique_items_count = 0
        
        for item_data in stock_items:
            item_name = item_data['item']
            
            # Get the latest stock entry for price reference
            latest_stock = StockIn.objects.filter(
                created_by=user,
                item=item_name
            ).order_by('-created_at').first()
            
            # Calculate available quantity
            total_in = StockIn.objects.filter(
                created_by=user,
                item=item_name
            ).aggregate(Sum('quantity'))['quantity__sum'] or 0
            
            # Count all sales: active + soft-deleted + permanently deleted
            active_out = StockOut.objects.filter(
                created_by=user,
                item=item_name
            ).aggregate(Sum('quantity'))['quantity__sum'] or 0
            
            permanent_out = PermanentlyDeletedSale.objects.filter(
                created_by=user,
                item=item_name
            ).aggregate(Sum('quantity'))['quantity__sum'] or 0
            
            total_out = active_out + permanent_out
            available_qty = total_in - total_out
            
            if available_qty > 0:
                unique_items_count += 1
                item_price = latest_stock.price if latest_stock else 0
                total_available_value += available_qty * float(item_price)
        
        return Response({
            'total_items': unique_items_count,
            'total_quantity': 0,  # This field seems unused, keeping for compatibility
            'total_value': round(total_available_value, 2)
        })
    
    @action(detail=False, methods=['get'])
    def available_stock(self, request):
        """Get available stock quantities for all items"""
        user = request.user
        
        # Get all unique items
        stock_items = StockIn.objects.filter(created_by=user).values('item').distinct()
        
        available_stock = []
        for item_data in stock_items:
            item_name = item_data['item']
            
            # Get the latest stock entry for price reference
            latest_stock = StockIn.objects.filter(
                created_by=user,
                item=item_name
            ).order_by('-created_at').first()
            
            # Calculate available quantity
            total_in = StockIn.objects.filter(
                created_by=user,
                item=item_name
            ).aggregate(Sum('quantity'))['quantity__sum'] or 0
            
            # Count all sales: active + soft-deleted + permanently deleted
            active_out = StockOut.objects.filter(
                created_by=user,
                item=item_name
            ).aggregate(Sum('quantity'))['quantity__sum'] or 0
            
            permanent_out = PermanentlyDeletedSale.objects.filter(
                created_by=user,
                item=item_name
            ).aggregate(Sum('quantity'))['quantity__sum'] or 0
            
            total_out = active_out + permanent_out
            
            available_qty = total_in - total_out
            
            if available_qty > 0:  # Only include items with available stock
                available_stock.append({
                    'id': latest_stock.id if latest_stock else None,
                    'item': item_name,
                    'quantity': available_qty,
                    'price': latest_stock.price if latest_stock else 0,
                    'total_value': available_qty * (latest_stock.price if latest_stock else 0),
                    'date': latest_stock.date.isoformat() if latest_stock and latest_stock.date else None,
                    'created_at': latest_stock.created_at.isoformat() if latest_stock and latest_stock.created_at else None,
                    'updated_at': latest_stock.updated_at.isoformat() if latest_stock and latest_stock.updated_at else None
                })
        
        return Response({'results': available_stock})

class StockOutViewSet(viewsets.ModelViewSet):
    serializer_class = StockOutSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return StockOut.objects.filter(created_by=self.request.user, is_deleted=False).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Override to ensure user is set and stock validation occurs"""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Override to ensure user is set and stock validation occurs"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        # Count only active and soft-deleted sales for transactions
        active_sales = StockOut.objects.filter(created_by=request.user, is_deleted=False)
        soft_deleted_sales = StockOut.objects.filter(created_by=request.user, is_deleted=True)
        
        # Calculate current active totals
        active_count = active_sales.count()
        active_quantity = active_sales.aggregate(Sum('quantity'))['quantity__sum'] or 0
        active_revenue = sum(float(item.quantity) * float(item.price) for item in active_sales)
        active_profit = sum(item.total_profit for item in active_sales)
        
        # Calculate soft-deleted totals
        soft_deleted_count = soft_deleted_sales.count()
        soft_deleted_quantity = soft_deleted_sales.aggregate(Sum('quantity'))['quantity__sum'] or 0
        soft_deleted_revenue = sum(float(item.quantity) * float(item.price) for item in soft_deleted_sales)
        soft_deleted_profit = sum(item.total_profit for item in soft_deleted_sales)
        
        # Get cumulative totals from snapshot
        snapshot, _ = SalesSummarySnapshot.objects.get_or_create(
            created_by=request.user,
            defaults={'cumulative_revenue': 0, 'cumulative_profit': 0}
        )
        
        # Combine current totals with cumulative snapshot
        total_sales = active_count + soft_deleted_count
        total_quantity = active_quantity + soft_deleted_quantity
        total_revenue = active_revenue + soft_deleted_revenue + float(snapshot.cumulative_revenue)
        total_profit = float(active_profit) + float(soft_deleted_profit) + float(snapshot.cumulative_profit)
        
        return Response({
            'total_sales': total_sales,
            'total_quantity': total_quantity,
            'total_revenue': round(total_revenue, 2),
            'total_profit': round(total_profit, 2)
        })
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to perform soft delete instead of hard delete"""
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def soft_delete(self, request, pk=None):
        """Soft delete endpoint for moving items to deleted items table"""
        try:
            stock_out = self.get_object()
            stock_out.is_deleted = True
            stock_out.deleted_at = timezone.now()
            stock_out.save()
            return Response({'message': 'Item deleted successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def deleted(self, request):
        """Get all soft-deleted stock out records"""
        deleted_items = StockOut.objects.filter(
            created_by=request.user,
            is_deleted=True
        ).order_by('-deleted_at')
        serializer = self.get_serializer(deleted_items, many=True)
        return Response({'results': serializer.data})
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore a soft-deleted stock out record"""
        try:
            # Get the item from all StockOut objects (including deleted ones)
            item = StockOut.objects.get(pk=pk, created_by=request.user, is_deleted=True)
            item.is_deleted = False
            item.deleted_at = None
            item.save()
            serializer = self.get_serializer(item)
            return Response(serializer.data)
        except StockOut.DoesNotExist:
            return Response({'error': 'Deleted item not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['delete'])
    def permanent(self, request, pk=None):
        """Permanently delete a soft-deleted stock out record"""
        try:
            # Get the item from all StockOut objects (including deleted ones)
            item = StockOut.objects.get(pk=pk, created_by=request.user, is_deleted=True)
            
            # Update cumulative snapshot before deleting
            snapshot, _ = SalesSummarySnapshot.objects.get_or_create(
                created_by=request.user,
                defaults={'cumulative_revenue': 0, 'cumulative_profit': 0}
            )
            
            item_revenue = float(item.quantity) * float(item.price)
            item_profit = item.total_profit
            
            snapshot.cumulative_revenue += item_revenue
            snapshot.cumulative_profit += item_profit
            snapshot.save()
            
            # Create a record in PermanentlyDeletedSale before deleting
            PermanentlyDeletedSale.objects.create(
                item=item.item,
                quantity=item.quantity,
                price=item.price,
                cost_price=item.cost_price,
                date=item.date,
                created_by=item.created_by,
                original_created_at=item.created_at
            )
            
            # Now delete the original record
            item.delete()
            
            return Response({'message': 'Item permanently deleted'}, status=status.HTTP_204_NO_CONTENT)
        except StockOut.DoesNotExist:
            return Response({'error': 'Deleted item not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def reset_summary(self, request):
        """Reset summary display only - preserve sales records for inventory"""
        try:
            # Move all current sales to permanently deleted to preserve inventory
            # but reset summary display
            active_sales = StockOut.objects.filter(created_by=request.user)
            
            for sale in active_sales:
                # Create permanent record
                PermanentlyDeletedSale.objects.create(
                    item=sale.item,
                    quantity=sale.quantity,
                    price=sale.price,
                    cost_price=sale.cost_price,
                    date=sale.date,
                    created_by=sale.created_by,
                    original_created_at=sale.created_at
                )
            
            # Delete from StockOut to reset summary display
            active_sales.delete()
            
            # Reset cumulative snapshot
            SalesSummarySnapshot.objects.filter(created_by=request.user).delete()
            
            return Response({'message': 'Sales summary reset successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)