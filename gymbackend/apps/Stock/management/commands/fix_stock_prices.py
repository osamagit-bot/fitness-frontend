from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.Stock.models import StockOut, StockIn


class Command(BaseCommand):
    help = 'Fix stock out prices to ensure they contain unit prices, not total prices'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get all StockOut records
        stock_out_records = StockOut.objects.all()
        
        fixed_count = 0
        total_count = stock_out_records.count()
        
        self.stdout.write(f'Checking {total_count} stock out records...')
        
        for stock_out in stock_out_records:
            # Find corresponding StockIn record to get the unit price
            stock_in = StockIn.objects.filter(
                item=stock_out.item,
                created_by=stock_out.created_by
            ).order_by('-created_at').first()
            
            if stock_in:
                expected_unit_price = stock_in.price
                current_price = stock_out.price
                expected_total = expected_unit_price * stock_out.quantity
                current_total = current_price * stock_out.quantity
                
                # Check if the current price seems to be a total price instead of unit price
                # This happens when current_price * quantity is much larger than expected
                if current_price > expected_unit_price * 2:  # If current price is more than 2x the unit price
                    # Likely that current_price is actually the total price
                    correct_unit_price = current_price / stock_out.quantity
                    
                    self.stdout.write(
                        f'Item: {stock_out.item} (ID: {stock_out.id})\n'
                        f'  Current price: {current_price} (seems to be total price)\n'
                        f'  Quantity: {stock_out.quantity}\n'
                        f'  Calculated unit price: {correct_unit_price}\n'
                        f'  Expected unit price from StockIn: {expected_unit_price}\n'
                    )
                    
                    if not dry_run:
                        # Use the calculated unit price
                        stock_out.price = correct_unit_price
                        stock_out.save()
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ Fixed: Set price to {correct_unit_price}')
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'  → Would set price to {correct_unit_price}')
                        )
                    
                    fixed_count += 1
                else:
                    # Price seems correct (unit price)
                    if options.get('verbosity', 1) >= 2:
                        self.stdout.write(
                            f'Item: {stock_out.item} (ID: {stock_out.id}) - Price seems correct: {current_price}'
                        )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'No StockIn record found for item: {stock_out.item} (StockOut ID: {stock_out.id})'
                    )
                )
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'DRY RUN COMPLETE: Would fix {fixed_count} out of {total_count} records'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'COMPLETED: Fixed {fixed_count} out of {total_count} records'
                )
            )