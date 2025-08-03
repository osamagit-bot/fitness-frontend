import cv2
import numpy as np
from PIL import Image
import base64
import io

class FaceComparison:
    @staticmethod
    def compare_faces(reference_photo_path, current_photo_base64, tolerance=0.2):
        """
        Simple face comparison using OpenCV template matching
        Returns: (is_match: bool, confidence: float, error: str)
        """
        try:
            # Load reference image
            reference_image = cv2.imread(reference_photo_path)
            if reference_image is None:
                return False, 0.0, "Could not load reference photo"
            
            # Process current photo from base64
            if current_photo_base64.startswith('data:image/'):
                _, imgstr = current_photo_base64.split(';base64,')
            else:
                imgstr = current_photo_base64
            
            # Decode base64 image
            image_data = base64.b64decode(imgstr)
            image = Image.open(io.BytesIO(image_data))
            current_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale for comparison
            ref_gray = cv2.cvtColor(reference_image, cv2.COLOR_BGR2GRAY)
            curr_gray = cv2.cvtColor(current_image, cv2.COLOR_BGR2GRAY)
            
            # Resize images to same size for comparison
            height, width = 200, 200
            ref_resized = cv2.resize(ref_gray, (width, height))
            curr_resized = cv2.resize(curr_gray, (width, height))
            
            # Calculate structural similarity
            # Simple correlation coefficient
            correlation = cv2.matchTemplate(ref_resized, curr_resized, cv2.TM_CCOEFF_NORMED)[0][0]
            
            # Convert to confidence (0-1) and ensure it's a Python float
            confidence = float(max(0, correlation))
            
            # Check if similarity meets tolerance
            is_match = confidence >= tolerance
            
            return is_match, confidence, None
            
        except Exception as e:
            return False, 0.0, f"Face comparison error: {str(e)}"
    
    @staticmethod
    def validate_face_photo(photo_base64):
        """
        Basic photo validation - simplified to just check if image is valid
        Returns: (is_valid: bool, error: str)
        """
        try:
            if photo_base64.startswith('data:image/'):
                _, imgstr = photo_base64.split(';base64,')
            else:
                imgstr = photo_base64
            
            # Decode base64 image
            image_data = base64.b64decode(imgstr)
            image = Image.open(io.BytesIO(image_data))
            
            # Basic checks
            if image.size[0] < 50 or image.size[1] < 50:
                return False, "Image too small"
            
            # Skip face detection for now - just validate image is readable
            return True, None
            
        except Exception as e:
            return False, f"Photo validation error: {str(e)}"