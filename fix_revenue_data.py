"""
Script to fix revenue data by correcting StockOut prices
This script identifies and fixes records where the price field contains total prices instead of unit prices
"""

import sqlite3
import os

def fix_stock_data():
    """Fix stock out data by converting total prices to unit prices"""
    
    # Path to your SQLite database
    db_path = os.path.join(os.path.dirname(__file__), 'gymbackend', 'db.sqlite3')
    
    if not os.path.exists(db_path):
        print(f"Database not found at: {db_path}")
        print("Please make sure you're running this from the correct directory.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("=== FIXING STOCK OUT DATA ===\n")
        
        # Get all StockOut records
        cursor.execute("""
            SELECT id, item, quantity, price, created_by_id, date 
            FROM Stock_stockout 
            ORDER BY created_at
        """)
        
        stock_out_records = cursor.fetchall()
        print(f"Found {len(stock_out_records)} StockOut records")
        
        fixed_count = 0
        
        for record in stock_out_records:
            stock_out_id, item, quantity, price, user_id, date = record
            
            # Get corresponding StockIn record for the same item and user
            cursor.execute("""
                SELECT price FROM Stock_stockin 
                WHERE item = ? AND created_by_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            """, (item, user_id))
            
            stock_in_result = cursor.fetchone()
            
            if stock_in_result:
                expected_unit_price = float(stock_in_result[0])
                current_price = float(price)
                
                # Check if current price seems to be a total price
                if current_price > expected_unit_price * 1.5:
                    # Calculate correct unit price
                    correct_unit_price = current_price / quantity
                    
                    print(f"Item: {item} (ID: {stock_out_id})")
                    print(f"  Current price: ${current_price} (seems to be total)")
                    print(f"  Quantity: {quantity}")
                    print(f"  Expected unit price: ${expected_unit_price}")
                    print(f"  Calculated unit price: ${correct_unit_price}")
                    
                    # Ask for confirmation
                    response = input("  Fix this record? (y/n): ").lower().strip()
                    
                    if response == 'y':
                        # Update the record
                        cursor.execute("""
                            UPDATE Stock_stockout 
                            SET price = ? 
                            WHERE id = ?
                        """, (correct_unit_price, stock_out_id))
                        
                        print(f"  ✅ Fixed: Updated price to ${correct_unit_price}")
                        fixed_count += 1
                    else:
                        print("  ⏭️  Skipped")
                else:
                    print(f"Item: {item} - Price ${current_price} seems correct (unit price)")
            else:
                print(f"⚠️  No StockIn record found for {item} (StockOut ID: {stock_out_id})")
            
            print()  # Empty line for readability
        
        # Commit changes
        conn.commit()
        print(f"✅ Fixed {fixed_count} records")
        
        # Show summary after fixes
        print("\n=== REVENUE SUMMARY AFTER FIXES ===")
        cursor.execute("""
            SELECT 
                item,
                SUM(quantity) as total_quantity,
                SUM(quantity * price) as total_revenue
            FROM Stock_stockout 
            GROUP BY item
        """)
        
        results = cursor.fetchall()
        total_revenue = 0
        
        for item, qty, revenue in results:
            print(f"{item}: {qty} units sold, ${revenue:.2f} revenue")
            total_revenue += revenue
        
        print(f"\nTotal Revenue: ${total_revenue:.2f}")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

def show_current_data():
    """Show current stock data"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'gymbackend', 'db.sqlite3')
    
    if not os.path.exists(db_path):
        print(f"Database not found at: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("=== CURRENT STOCK DATA ===\n")
        
        print("StockIn Records:")
        cursor.execute("SELECT item, quantity, price, date FROM Stock_stockin ORDER BY item, date")
        for item, qty, price, date in cursor.fetchall():
            print(f"  {item}: {qty} units @ ${price} each (Total: ${qty * price}) - {date}")
        
        print("\nStockOut Records:")
        cursor.execute("SELECT item, quantity, price, date FROM Stock_stockout ORDER BY item, date")
        for item, qty, price, date in cursor.fetchall():
            print(f"  {item}: {qty} units @ ${price} each (Total: ${qty * price}) - {date}")
        
        print("\nRevenue Summary:")
        cursor.execute("""
            SELECT 
                item,
                SUM(quantity) as total_quantity,
                SUM(quantity * price) as total_revenue
            FROM Stock_stockout 
            GROUP BY item
        """)
        
        total_revenue = 0
        for item, qty, revenue in cursor.fetchall():
            print(f"  {item}: {qty} units sold, ${revenue:.2f} revenue")
            total_revenue += revenue
        
        print(f"\nTotal Revenue: ${total_revenue:.2f}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    print("Stock Data Fix Tool")
    print("==================\n")
    
    while True:
        print("Options:")
        print("1. Show current data")
        print("2. Fix stock prices")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == '1':
            show_current_data()
        elif choice == '2':
            fix_stock_data()
        elif choice == '3':
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please enter 1, 2, or 3.")
        
        print("\n" + "="*50 + "\n")