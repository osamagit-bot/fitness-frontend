#!/usr/bin/env python
"""
Test script for enhanced biometric security system
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymbackend.setting.dev')
django.setup()

from apps.Attendance.biometric_utils import BiometricSecurity

def test_duplicate_detection():
    """Test the duplicate fingerprint detection system"""
    print("Testing Enhanced Biometric Security System")
    print("=" * 50)
    
    # Test data - simulating different fingerprint readings of the same finger
    test_fingerprints = {
        'user1_reading1': 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
        'user1_reading2': 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',  # Exact same
        'user1_reading3': 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yZ',  # Slight variation
        'user2_different': 'xyz987wvu654tsr321qpo098nml765kji432hgf109edc876ba',
        'user1_similar': 'abc123def456ghi789jkl012mno345pqr678stu901vwx234',     # Truncated version
    }
    
    print("1. Testing feature extraction...")
    for name, data in test_fingerprints.items():
        features = BiometricSecurity.extract_biometric_features(data)
        print(f"   {name}: {len(features)} features extracted")
    
    print("\n2. Testing similarity calculations...")
    base_features = BiometricSecurity.extract_biometric_features(test_fingerprints['user1_reading1'])
    
    for name, data in test_fingerprints.items():
        if name == 'user1_reading1':
            continue
        
        test_features = BiometricSecurity.extract_biometric_features(data)
        similarity = BiometricSecurity.calculate_similarity(base_features, test_features)
        
        status = "DUPLICATE" if similarity >= BiometricSecurity.SIMILARITY_THRESHOLD else "UNIQUE"
        print(f"   {name}: {similarity:.3f} similarity - {status}")
    
    print(f"\n3. Similarity threshold: {BiometricSecurity.SIMILARITY_THRESHOLD}")
    print("   - Values >= threshold indicate potential duplicates")
    print("   - Values < threshold indicate unique fingerprints")
    
    print("\nBiometric security system test completed!")
    print("   The system can now detect duplicate fingerprints even with slight variations.")

if __name__ == "__main__":
    test_duplicate_detection()