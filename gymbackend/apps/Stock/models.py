from django.db import models
from django.conf import settings

class StockIn(models.Model):
    item = models.CharField(max_length=200)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_value(self):
        return self.quantity * self.price

    def __str__(self):
        return f"{self.item} - {self.quantity} units"

class StockOut(models.Model):
    item = models.CharField(max_length=200)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Selling price per unit
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Cost price per unit
    date = models.DateField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    @property
    def total_value(self):
        return self.quantity * self.price
    
    @property
    def total_profit(self):
        return self.quantity * (self.price - self.cost_price)

    def __str__(self):
        return f"{self.item} - {self.quantity} units sold"

class PermanentlyDeletedSale(models.Model):
    """Track permanently deleted sales for inventory calculation"""
    item = models.CharField(max_length=200)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    date = models.DateField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    original_created_at = models.DateTimeField()
    permanently_deleted_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_profit(self):
        return self.quantity * (self.price - self.cost_price)

    def __str__(self):
        return f"{self.item} - {self.quantity} units (permanently deleted)"

class SalesSummarySnapshot(models.Model):
    """Track cumulative sales totals that persist across deletions"""
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    cumulative_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cumulative_profit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['created_by']
    
    def __str__(self):
        return f"Sales snapshot for {self.created_by.username}"