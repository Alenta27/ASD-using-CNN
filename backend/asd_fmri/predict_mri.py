"""
MRI ASD Prediction Script (CNN Model)
Used by Node.js backend to classify MRI scans
"""

import os
import sys

# Suppress TensorFlow logging before importing it
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 

import json
import numpy as np
import tensorflow as tf
import cv2
import nibabel as nib
import traceback
import random

model = None

def make_patched_layer(base_class):
    class PatchedLayer(base_class):
        @classmethod
        def from_config(cls, config):
            # Strip quantization_config which causes issues in some Keras versions
            config.pop('quantization_config', None)
            return super().from_config(config)
    return PatchedLayer

PatchedDense = make_patched_layer(tf.keras.layers.Dense)
PatchedConv2D = make_patched_layer(tf.keras.layers.Conv2D)
PatchedMaxPooling2D = make_patched_layer(tf.keras.layers.MaxPooling2D)
PatchedFlatten = make_patched_layer(tf.keras.layers.Flatten)
PatchedDropout = make_patched_layer(tf.keras.layers.Dropout)

def initialize_model():
    global model

    try:
        model_path = "asd_mri_model_best_56.h5"

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")

        custom_objects = {
            'Dense': PatchedDense,
            'Conv2D': PatchedConv2D,
            'MaxPooling2D': PatchedMaxPooling2D,
            'Flatten': PatchedFlatten,
            'Dropout': PatchedDropout
        }

        try:
            # Standard load with custom objects
            model = tf.keras.models.load_model(model_path, custom_objects=custom_objects)
        except Exception as e:
            # Fallback for version/deserialization mismatches (like quantization_config)
            print(f"DEBUG: Standard load failed, trying compile=False. Error: {str(e)}", file=sys.stderr)
            # Some versions of Keras need this reset to clear bad state
            try:
                tf.keras.backend.clear_session()
            except:
                pass
            model = tf.keras.models.load_model(model_path, custom_objects=custom_objects, compile=False)
            
        print("Loaded NEW MRI CNN model", file=sys.stderr)
        print(f"DEBUG: Using CNN MRI model: {model_path}", file=sys.stderr)

        return True

    except Exception as e:
        print(json.dumps({"error": f"Model initialization failed: {str(e)}"}))
        return False


def process_mri_scan(image_path, original_filename=None):
    try:
        # Log filename and processing start
        fname = original_filename if original_filename else os.path.basename(image_path)
        print(f"DEBUG: Freshly processing MRI scan: {fname}", file=sys.stderr)

        # Check if it's a NIfTI file
        if image_path.lower().endswith(('.nii', '.nii.gz')):
            print(f"DEBUG: Loading NIfTI file: {image_path}", file=sys.stderr)
            img_data = nib.load(image_path).get_fdata()
            
            # Extract middle slice from the 3D/4D volume
            if len(img_data.shape) == 4:
                # If 4D, take middle volume and middle slice
                mid_vol = img_data.shape[3] // 2
                mid_slice = img_data.shape[2] // 2
                slice_data = img_data[:, :, mid_slice, mid_vol]
            elif len(img_data.shape) == 3:
                mid_slice = img_data.shape[2] // 2
                slice_data = img_data[:, :, mid_slice]
            else:
                slice_data = img_data

            # Convert to uint8 for cv2 processing
            # Normalize to 0-255 range first
            slice_data = (slice_data - np.min(slice_data)) / (np.max(slice_data) - np.min(slice_data) + 1e-8) * 255
            img = slice_data.astype(np.uint8)
        else:
            # Standard image loading
            img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)

        if img is None:
            raise Exception("Failed to load MRI image")

        # Resize to training size
        img = cv2.resize(img, (128, 128))

        # Normalize (0 to 1 range as requested)
        img = img / 255.0

        # Add channel dimension (H, W, 1)
        img = np.expand_dims(img, axis=-1)

        # Add batch dimension (1, H, W, 1)
        img = np.expand_dims(img, axis=0)

        # Log input shape
        print(f"DEBUG: Input shape for model: {img.shape}", file=sys.stderr)

        return img
    except Exception as e:
        raise Exception(f"Error processing MRI image: {str(e)}")


def predict_asd(image, threshold=0.35):

    try:
        prediction = float(model.predict(image, verbose=0)[0][0])
        
        # Log raw probability
        print(f"DEBUG: Raw ASD probability: {prediction:.4f}", file=sys.stderr)

        if prediction >= threshold:
            diagnosis = "ASD"
            # Confidence relative to threshold
            confidence = prediction
        else:
            diagnosis = "No ASD"
            confidence = 1 - prediction

        # Log final decision
        print(f"DEBUG: Final decision: {diagnosis} (Threshold: {threshold})", file=sys.stderr)

        return {
            "diagnosis": diagnosis,
            "confidence": round(float(confidence), 4),
            "asd_probability": round(float(prediction), 4),
            "control_probability": round(float(1 - prediction), 4),
            "threshold_used": threshold,
            "raw_prediction": round(float(prediction), 4)
        }

    except Exception as e:
        raise Exception(f"Prediction error: {str(e)}")


def main():

    try:

        if len(sys.argv) < 2:
            print(json.dumps({"error": "Missing MRI file path"}))
            sys.exit(1)

        file_path = sys.argv[1]
        original_filename = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(file_path)
        
        # Check for threshold override in arguments
        threshold = 0.35
        for arg in sys.argv:
            if arg.startswith('--threshold='):
                try:
                    threshold = float(arg.split('=')[1])
                except:
                    pass

        if not os.path.exists(file_path):
            print(json.dumps({"error": f"File not found: {file_path}"}))
            sys.exit(1)

        # Log for debugging
        print(f"DEBUG: Processing file: {original_filename} (Path: {file_path})", file=sys.stderr)

        script_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(script_dir)

        if not initialize_model():
            sys.exit(1)

        image = process_mri_scan(file_path, original_filename)
        
        # Removed mock logic for "um_1" to ensure real predictions
        result = predict_asd(image, threshold=threshold)
        
        # Add file info to result
        result["filename"] = original_filename

        # Log final prediction details
        print(f"DEBUG: Final prediction for {original_filename}: {result['diagnosis']} (Prob: {result['asd_probability']})", file=sys.stderr)

        print(json.dumps(result))

    except Exception as e:

        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"error": error_msg}))
        sys.exit(1)


if __name__ == "__main__":
    main()