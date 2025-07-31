#!/usr/bin/env python
"""
Script to fix stock data issues after the recent changes.
This script should be run from the gymbackend directory.
"""

import os
import sys
import django

# Add the gymbackend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'gymbackend'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymbackend.setting.dev')
django.setup()

from apps.Stock.models import StockOut, StockIn
from django.contrib.auth import get_user_model

User = get_user_model()

def fix_stock_prices():
    """Fix stock out prices to ensure they contain unit prices, not total prices"""
    
    print("Checking for stock price issues...")
    
    # Get all StockOut records
    stock_out_records = StockOut.objects.all()
    
    fixed_count = 0
    total_count = stock_out_records.count()
    
    print(f'Checking {total_count} stock out records...')
    
    for stock_out in stock_out_records:
        # Find corresponding StockIn record to get the unit price
        stock_in = StockIn.objects.filter(
            item=stock_out.item,
            created_by=stock_out.created_by
        ).order_by('-created_at').first()
        
        if stock_in:
            expected_unit_price = float(stock_in.price)
            current_price = float(stock_out.price)
            
            # Check if the current price seems to be a total price instead of unit price
            # This happens when current_price is much larger than expected unit price
            if current_price > expected_unit_price * 2:  # If current price is more than 2x the unit price
                # Likely that current_price is actually the total price
                correct_unit_price = current_price / stock_out.quantity
                
                print(f'\nItem: {stock_out.item} (ID: {stock_out.id})')
                print(f'  Current price: {current_price} (seems to be total price)')
                print(f'  Quantity: {stock_out.quantity}')
                print(f'  Calculated unit price: {correct_unit_price}')
                print(f'  Expected unit price from StockIn: {expected_unit_price}')
                
                # Ask for confirmation
                response = input(f'  Fix this record? (y/n): ').lower().strip()
                if response == 'y':
                    stock_out.price = correct_unit_price
                    stock_out.save()
                    print(f'  ✓ Fixed: Set price to {correct_unit_price}')
                    fixed_count += 1
                else:
                    print(f'  - Skipped')
            else:
                # Price seems correct (unit price)
                print(f'Item: {stock_out.item} - Price seems correct: {current_price}')
        else:
            print(f'Warning: No StockIn record found for item: {stock_out.item} (StockOut ID: {stock_out.id})')
    
    print(f'\nCompleted: Fixed {fixed_count} out of {total_count} records')

def show_current_data():
    """Show current stock data for debugging"""
    print("\n=== CURRENT STOCK DATA ===")
    
    print("\nStock In Records:")
    for stock_in in StockIn.objects.all().order_by('item', '-created_at'):
        print(f"  {stock_in.item}: {stock_in.quantity} units @ ${stock_in.price} each = ${stock_in.total_value}")
    
    print("\nStock Out Records:")
    for stock_out in StockOut.objects.all().order_by('item', '-created_at'):
        print(f"  {stock_out.item}: {stock_out.quantity} units @ ${stock_out.price} each = ${stock_out.total_value}")
    
    print("\nAvailable Stock:")
    items = {}
    
    # Calculate available stock
    for stock_in in StockIn.objects.all():
        if stock_in.item not in items:
            items[stock_in.item] = {'in': 0, 'out': 0, 'price': stock_in.price}
        items[stock_in.item]['in'] += stock_in.quantity
    
    for stock_out in StockOut.objects.all():
        if stock_out.item not in items:
            items[stock_out.item] = {'in': 0, 'out': 0, 'price': 0}
        items[stock_out.item]['out'] += stock_out.quantity
    
    for item_name, data in items.items():
        available = data['in'] - data['out']
        print(f"  {item_name}: {available} available (In: {data['in']}, Out: {data['out']})")

if __name__ == '__main__':
    print("Stock Data Fix Script")
    print("====================")
    
    while True:
        print("\nOptions:")
        print("1. Show current data")
        print("2. Fix stock prices")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == '1':
            show_current_data()
        elif choice == '2':
            fix_stock_prices()
        elif choice == '3':
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please enter 1, 2, or 3.")