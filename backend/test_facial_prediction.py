"""
Test script for facial screening prediction pipeline
"""
import os
import sys
import json
import cv2
import numpy as np
from PIL import Image

def create_test_image():
    """Create a simple test image with a face"""
    # Create a simple face-like image (just for testing)
    img = np.ones((300, 300, 3), dtype=np.uint8) * 255  # White background
    
    # Draw a simple face
    center = (150, 150)
    
    # Face circle (skin color)
    cv2.circle(img, center, 80, (180, 150, 120), -1)
    
    # Eyes
    cv2.circle(img, (120, 130), 10, (0, 0, 0), -1)
    cv2.circle(img, (180, 130), 10, (0, 0, 0), -1)
    
    # Mouth
    cv2.ellipse(img, (150, 170), (30, 15), 0, 0, 180, (0, 0, 0), 2)
    
    # Save test image
    test_image_path = os.path.join('uploads', 'test_face.jpg')
    os.makedirs('uploads', exist_ok=True)
    cv2.imwrite(test_image_path, img)
    
    print(f"✅ Test image created: {test_image_path}")
    return test_image_path

def test_prediction(image_path):
    """Test the prediction script"""
    print(f"\n🧪 Testing prediction on: {image_path}")
    
    # Import the prediction function
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ai_model'))
    from predict import predict
    
    # Capture stdout
    predict(image_path)

if __name__ == '__main__':
    print("=" * 60)
    print("FACIAL SCREENING PIPELINE TEST")
    print("=" * 60)
    
    # Step 1: Create test image
    print("\n📸 Step 1: Creating test image...")
    test_img_path = create_test_image()
    
    # Step 2: Test prediction
    print("\n🤖 Step 2: Testing prediction...")
    test_prediction(test_img_path)
    
    print("\n" + "=" * 60)
    print("✅ TEST COMPLETED")
    print("=" * 60)
