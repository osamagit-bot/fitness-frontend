from .models import Purchase,Product

from rest_framework import serializers


class PurchaseSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = Purchase
        fields = ['id', 'member', 'product', 'product_name', 'quantity', 'total_price', 'date']
        extra_kwargs = {
            'member':{'required':False, 'allow_null':True}
        }
        read_only_fields = ['id', 'date', 'product_name']
        
        
# Product serializer
class ProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['product_id', 'name', 'price', 'image', 'image_url', 'description', 'created_at', 'updated_at']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

