import face_recognition
import numpy as np
from PIL import Image
import base64
import io
import cv2

class FaceComparison:
    @staticmethod
    def compare_faces(reference_photo_path, current_photo_base64, tolerance=0.6):
        """
        Compare reference photo with current photo
        Returns: (is_match: bool, confidence: float, error: str)
        """
        try:
            # Load reference image
            reference_image = face_recognition.load_image_file(reference_photo_path)
            reference_encodings = face_recognition.face_encodings(reference_image)
            
            if not reference_encodings:
                return False, 0.0, "No face found in reference photo"
            
            # Process current photo from base64
            if current_photo_base64.startswith('data:image/'):
                _, imgstr = current_photo_base64.split(';base64,')
            else:
                imgstr = current_photo_base64
            
            # Decode base64 image
            image_data = base64.b64decode(imgstr)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert PIL image to numpy array
            current_image = np.array(image)
            
            # Convert RGB to BGR if needed (face_recognition expects RGB)
            if len(current_image.shape) == 3 and current_image.shape[2] == 3:
                current_image = cv2.cvtColor(current_image, cv2.COLOR_BGR2RGB)
            
            # Get face encodings from current image
            current_encodings = face_recognition.face_encodings(current_image)
            
            if not current_encodings:
                return False, 0.0, "No face found in current photo"
            
            # Compare faces
            reference_encoding = reference_encodings[0]
            current_encoding = current_encodings[0]
            
            # Calculate face distance (lower = more similar)
            face_distance = face_recognition.face_distance([reference_encoding], current_encoding)[0]
            
            # Convert distance to confidence (higher = more confident)
            confidence = 1 - face_distance
            
            # Check if faces match within tolerance
            is_match = face_distance <= tolerance
            
            return is_match, confidence, None
            
        except Exception as e:
            return False, 0.0, f"Face comparison error: {str(e)}"
    
    @staticmethod
    def validate_face_photo(photo_base64):
        """
        Validate that photo contains a clear face
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
            current_image = np.array(image)
            
            # Convert RGB to BGR if needed
            if len(current_image.shape) == 3 and current_image.shape[2] == 3:
                current_image = cv2.cvtColor(current_image, cv2.COLOR_BGR2RGB)
            
            # Detect faces
            face_locations = face_recognition.face_locations(current_image)
            
            if not face_locations:
                return False, "No face detected in photo"
            
            if len(face_locations) > 1:
                return False, "Multiple faces detected. Please ensure only one person is in the photo"
            
            # Check face size (should be reasonable size)
            top, right, bottom, left = face_locations[0]
            face_height = bottom - top
            face_width = right - left
            
            if face_height < 50 or face_width < 50:
                return False, "Face too small. Please move closer to camera"
            
            return True, None
            
        except Exception as e:
            return False, f"Photo validation error: {str(e)}"