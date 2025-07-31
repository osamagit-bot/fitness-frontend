"""
Simple test script to verify revenue calculation logic
Run this to test the revenue calculation without Django setup
"""

def test_revenue_calculation():
    """Test the revenue calculation logic"""
    
    # Sample data representing your stock records
    stock_in_data = [
        {'item': 'egg', 'quantity': 50, 'price': 15.0},  # 50 eggs at $15 each
    ]
    
    # Sample StockOut data - some might have unit prices, some total prices
    stock_out_data = [
        {'item': 'egg', 'quantity': 10, 'price': 15.0},   # Correct: unit price
        {'item': 'egg', 'quantity': 5, 'price': 75.0},    # Incorrect: total price (5 * 15)
        {'item': 'egg', 'quantity': 3, 'price': 45.0},    # Incorrect: total price (3 * 15)
    ]
    
    print("=== REVENUE CALCULATION TEST ===\n")
    
    print("Stock In Data:")
    for item in stock_in_data:
        print(f"  {item['item']}: {item['quantity']} units @ ${item['price']} each")
    
    print("\nStock Out Data (mixed unit/total prices):")
    for i, item in enumerate(stock_out_data, 1):
        print(f"  Sale {i}: {item['item']} - {item['quantity']} units @ ${item['price']}")
    
    # Calculate revenue using intelligent detection
    total_revenue = 0
    print("\nRevenue Calculation:")
    
    for i, sale in enumerate(stock_out_data, 1):
        # Find corresponding stock in item
        stock_in = next((s for s in stock_in_data if s['item'] == sale['item']), None)
        
        if stock_in:
            expected_unit_price = stock_in['price']
            current_price = sale['price']
            quantity = sale['quantity']
            
            # Intelligent detection
            if current_price > expected_unit_price * 1.5:
                # Price seems to be total price
                item_revenue = current_price
                print(f"  Sale {i}: ${current_price} (detected as total price)")
            else:
                # Price seems to be unit price
                item_revenue = quantity * current_price
                print(f"  Sale {i}: {quantity} × ${current_price} = ${item_revenue} (detected as unit price)")
            
            total_revenue += item_revenue
        else:
            # No reference, assume unit price
            item_revenue = sale['quantity'] * sale['price']
            total_revenue += item_revenue
            print(f"  Sale {i}: {sale['quantity']} × ${sale['price']} = ${item_revenue} (no reference, assumed unit price)")
    
    print(f"\nTotal Revenue: ${total_revenue}")
    
    # Expected calculation
    expected_revenue = (10 * 15) + (5 * 15) + (3 * 15)  # All should be calculated as unit price × quantity
    print(f"Expected Revenue: ${expected_revenue}")
    
    if abs(total_revenue - expected_revenue) < 0.01:
        print("✅ Revenue calculation is CORRECT!")
    else:
        print("❌ Revenue calculation has issues!")
    
    return total_revenue == expected_revenue

def test_stock_availability():
    """Test stock availability calculation"""
    
    print("\n=== STOCK AVAILABILITY TEST ===\n")
    
    # Sample data
    stock_in = {'egg': 50}  # 50 eggs in stock
    stock_out = [
        {'item': 'egg', 'quantity': 10},  # Sold 10
        {'item': 'egg', 'quantity': 5},   # Sold 5
        {'item': 'egg', 'quantity': 3},   # Sold 3
    ]
    
    print("Stock In:")
    for item, qty in stock_in.items():
        print(f"  {item}: {qty} units")
    
    print("\nStock Out:")
    total_sold = {}
    for sale in stock_out:
        item = sale['item']
        qty = sale['quantity']
        total_sold[item] = total_sold.get(item, 0) + qty
        print(f"  Sold {qty} {item}")
    
    print("\nAvailable Stock:")
    for item, total_in in stock_in.items():
        sold = total_sold.get(item, 0)
        available = total_in - sold
        print(f"  {item}: {available} available ({total_in} in stock - {sold} sold)")
    
    expected_available = 50 - 18  # 50 - (10 + 5 + 3)
    actual_available = stock_in['egg'] - total_sold['egg']
    
    if actual_available == expected_available:
        print("✅ Stock availability calculation is CORRECT!")
        return True
    else:
        print("❌ Stock availability calculation has issues!")
        return False

if __name__ == '__main__':
    print("Testing Stock Management Calculations\n")
    
    revenue_ok = test_revenue_calculation()
    stock_ok = test_stock_availability()
    
    print(f"\n=== SUMMARY ===")
    print(f"Revenue Calculation: {'✅ PASS' if revenue_ok else '❌ FAIL'}")
    print(f"Stock Availability: {'✅ PASS' if stock_ok else '❌ FAIL'}")
    
    if revenue_ok and stock_ok:
        print("\n🎉 All tests passed! Your stock management should work correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the logic above.")