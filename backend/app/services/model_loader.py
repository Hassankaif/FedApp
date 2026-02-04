# backend/app/services/model_loader.py (NEW)
import tempfile
import os
import sys
import importlib.util

class DynamicModelLoader:
    """Load TensorFlow models from string code"""
    
    @staticmethod
    def validate_model_code(model_code: str) -> dict:
        """Validate model code without executing"""
        errors = []
        
        # 1. Check for required function
        if 'def create_model(' not in model_code:
            errors.append("Missing 'create_model' function definition")
            
        # 2. Security Check: Block dangerous imports
        dangerous = ['os.system', 'subprocess', 'eval', 'exec', '__import__', 'shutil']
        for danger in dangerous:
            if danger in model_code:
                errors.append(f"Dangerous code detected: {danger}")
                
        # 3. Check for ML libraries
        if 'tensorflow' not in model_code and 'keras' not in model_code:
            errors.append("Model must import tensorflow or keras")
            
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }