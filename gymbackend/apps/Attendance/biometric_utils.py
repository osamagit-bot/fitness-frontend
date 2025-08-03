import hashlib
import json
from typing import List, Tuple, Optional
from apps.Member.models import Member

class BiometricSecurity:
    """Enhanced biometric security with proper duplicate detection"""
    
    SIMILARITY_THRESHOLD = 0.85  # 85% similarity threshold
    MIN_TEMPLATE_QUALITY = 0.7   # Minimum quality score
    
    @staticmethod
    def extract_biometric_features(raw_biometric_data: str) -> dict:
        """Extract features from raw biometric data for comparison"""
        try:
            # Create multiple feature vectors from the biometric data
            features = {
                'primary_hash': hashlib.sha256(raw_biometric_data.encode()).hexdigest(),
                'secondary_hash': hashlib.md5(raw_biometric_data.encode()).hexdigest(),
                'length_signature': len(raw_biometric_data),
                'char_frequency': BiometricSecurity._get_char_frequency(raw_biometric_data),
                'pattern_signature': BiometricSecurity._get_pattern_signature(raw_biometric_data)
            }
            return features
        except Exception as e:
            print(f"Feature extraction error: {e}")
            return {}
    
    @staticmethod
    def _get_char_frequency(data: str) -> dict:
        """Get character frequency distribution"""
        freq = {}
        for char in data:
            freq[char] = freq.get(char, 0) + 1
        return freq
    
    @staticmethod
    def _get_pattern_signature(data: str) -> str:
        """Generate pattern signature from data"""
        if len(data) < 10:
            return data
        # Take samples from different positions
        signature = data[0] + data[len(data)//4] + data[len(data)//2] + data[3*len(data)//4] + data[-1]
        return hashlib.sha256(signature.encode()).hexdigest()[:16]
    
    @staticmethod
    def calculate_similarity(features1: dict, features2: dict) -> float:
        """Calculate similarity between two biometric feature sets"""
        try:
            similarity_scores = []
            
            # Primary hash exact match
            if features1.get('primary_hash') == features2.get('primary_hash'):
                return 1.0  # Exact match
            
            # Secondary hash match
            if features1.get('secondary_hash') == features2.get('secondary_hash'):
                similarity_scores.append(0.9)
            
            # Length similarity
            len1, len2 = features1.get('length_signature', 0), features2.get('length_signature', 0)
            if len1 and len2:
                len_similarity = 1 - abs(len1 - len2) / max(len1, len2)
                similarity_scores.append(len_similarity * 0.3)
            
            # Pattern similarity
            if features1.get('pattern_signature') == features2.get('pattern_signature'):
                similarity_scores.append(0.8)
            
            # Character frequency similarity
            freq1 = features1.get('char_frequency', {})
            freq2 = features2.get('char_frequency', {})
            if freq1 and freq2:
                freq_similarity = BiometricSecurity._calculate_frequency_similarity(freq1, freq2)
                similarity_scores.append(freq_similarity * 0.4)
            
            return max(similarity_scores) if similarity_scores else 0.0
            
        except Exception as e:
            print(f"Similarity calculation error: {e}")
            return 0.0
    
    @staticmethod
    def _calculate_frequency_similarity(freq1: dict, freq2: dict) -> float:
        """Calculate similarity between character frequency distributions"""
        all_chars = set(freq1.keys()) | set(freq2.keys())
        if not all_chars:
            return 0.0
        
        total_diff = 0
        total_chars = 0
        
        for char in all_chars:
            count1 = freq1.get(char, 0)
            count2 = freq2.get(char, 0)
            total_diff += abs(count1 - count2)
            total_chars += max(count1, count2)
        
        if total_chars == 0:
            return 0.0
        
        return 1 - (total_diff / total_chars)
    
    @staticmethod
    def check_duplicate_fingerprint(new_biometric_data: str, exclude_member_id: str = None) -> Tuple[bool, Optional[Member]]:
        """
        Check if the biometric data matches any existing member's fingerprint
        Returns: (is_duplicate, matching_member)
        """
        try:
            new_features = BiometricSecurity.extract_biometric_features(new_biometric_data)
            if not new_features:
                return False, None
            
            # Get all members with biometric data
            query = Member.objects.filter(biometric_registered=True).exclude(
                biometric_hash__isnull=True
            ).exclude(biometric_hash='')
            
            if exclude_member_id:
                query = query.exclude(athlete_id=exclude_member_id)
            
            for member in query:
                if not member.biometric_hash:
                    continue
                
                # Check against stored biometric data
                existing_features = BiometricSecurity.extract_biometric_features(member.biometric_hash)
                if not existing_features:
                    continue
                
                similarity = BiometricSecurity.calculate_similarity(new_features, existing_features)
                
                print(f"Similarity check: {member.athlete_id} = {similarity:.3f}")
                
                if similarity >= BiometricSecurity.SIMILARITY_THRESHOLD:
                    print(f"🚨 DUPLICATE DETECTED: {similarity:.3f} similarity with {member.first_name} {member.last_name}")
                    return True, member
            
            return False, None
            
        except Exception as e:
            print(f"Duplicate check error: {e}")
            return False, None
    
    @staticmethod
    def find_member_by_biometric(biometric_data: str) -> Optional[Member]:
        """Find member by biometric data with fuzzy matching"""
        try:
            search_features = BiometricSecurity.extract_biometric_features(biometric_data)
            if not search_features:
                return None
            
            best_match = None
            best_similarity = 0.0
            
            # Search through all registered members
            for member in Member.objects.filter(biometric_registered=True).exclude(
                biometric_hash__isnull=True
            ).exclude(biometric_hash=''):
                
                if not member.biometric_hash:
                    continue
                
                existing_features = BiometricSecurity.extract_biometric_features(member.biometric_hash)
                if not existing_features:
                    continue
                
                similarity = BiometricSecurity.calculate_similarity(search_features, existing_features)
                
                if similarity > best_similarity and similarity >= BiometricSecurity.SIMILARITY_THRESHOLD:
                    best_similarity = similarity
                    best_match = member
            
            if best_match:
                print(f"✅ Member found: {best_match.first_name} {best_match.last_name} (similarity: {best_similarity:.3f})")
            
            return best_match
            
        except Exception as e:
            print(f"Member search error: {e}")
            return None
    
    @staticmethod
    def enhanced_biometric_search(biometric_data: str, sensor_type: str = 'unknown') -> Optional[Member]:
        """
        Enhanced biometric search specifically for external sensors
        Different sensors may provide different data formats
        """
        try:
            print(f"Enhanced search for {sensor_type} sensor data...")
            
            # First try standard search
            member = BiometricSecurity.find_member_by_biometric(biometric_data)
            if member:
                return member
            
            # Try sensor-specific matching algorithms
            if sensor_type.lower() in ['digital_persona', 'dp']:
                return BiometricSecurity._search_digital_persona(biometric_data)
            elif sensor_type.lower() in ['secugen', 'sg']:
                return BiometricSecurity._search_secugen(biometric_data)
            elif sensor_type.lower() in ['futronic', 'ft']:
                return BiometricSecurity._search_futronic(biometric_data)
            elif sensor_type.lower() in ['suprema', 'sp']:
                return BiometricSecurity._search_suprema(biometric_data)
            else:
                # Generic external sensor search with lower threshold
                return BiometricSecurity._search_generic_external(biometric_data)
            
        except Exception as e:
            print(f"Enhanced search error: {e}")
            return None
    
    @staticmethod
    def _search_digital_persona(biometric_data: str) -> Optional[Member]:
        """Digital Persona specific search algorithm"""
        try:
            # Digital Persona often provides base64 encoded template data
            # We may need to normalize or decode it
            normalized_data = biometric_data
            
            # If it looks like base64, try to decode and re-encode consistently
            try:
                import base64
                decoded = base64.b64decode(biometric_data)
                normalized_data = base64.b64encode(decoded).decode()
            except:
                pass  # Use original data if decoding fails
            
            return BiometricSecurity.find_member_by_biometric(normalized_data)
            
        except Exception as e:
            print(f"Digital Persona search error: {e}")
            return None
    
    @staticmethod
    def _search_secugen(biometric_data: str) -> Optional[Member]:
        """SecuGen specific search algorithm"""
        try:
            # SecuGen may provide WSQ or other formats
            # For now, use standard search
            return BiometricSecurity.find_member_by_biometric(biometric_data)
            
        except Exception as e:
            print(f"SecuGen search error: {e}")
            return None
    
    @staticmethod
    def _search_futronic(biometric_data: str) -> Optional[Member]:
        """Futronic specific search algorithm"""
        try:
            # Futronic specific processing if needed
            return BiometricSecurity.find_member_by_biometric(biometric_data)
            
        except Exception as e:
            print(f"Futronic search error: {e}")
            return None
    
    @staticmethod
    def _search_suprema(biometric_data: str) -> Optional[Member]:
        """Suprema specific search algorithm"""
        try:
            # Suprema specific processing if needed
            return BiometricSecurity.find_member_by_biometric(biometric_data)
            
        except Exception as e:
            print(f"Suprema search error: {e}")
            return None
    
    @staticmethod
    def _search_generic_external(biometric_data: str) -> Optional[Member]:
        """Generic external sensor search with relaxed matching"""
        try:
            search_features = BiometricSecurity.extract_biometric_features(biometric_data)
            if not search_features:
                return None
            
            best_match = None
            best_similarity = 0.0
            
            # Use lower threshold for external sensors
            EXTERNAL_THRESHOLD = 0.75  # Slightly lower than standard
            
            for member in Member.objects.filter(biometric_registered=True).exclude(
                biometric_hash__isnull=True
            ).exclude(biometric_hash=''):
                
                if not member.biometric_hash:
                    continue
                
                existing_features = BiometricSecurity.extract_biometric_features(member.biometric_hash)
                if not existing_features:
                    continue
                
                similarity = BiometricSecurity.calculate_similarity(search_features, existing_features)
                
                if similarity > best_similarity and similarity >= EXTERNAL_THRESHOLD:
                    best_similarity = similarity
                    best_match = member
            
            if best_match:
                print(f"✅ External sensor match: {best_match.first_name} {best_match.last_name} (similarity: {best_similarity:.3f})")
            
            return best_match
            
        except Exception as e:
            print(f"Generic external search error: {e}")
            return None