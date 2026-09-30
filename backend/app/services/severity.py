"""
Severity estimation module.

Runs independently of the CNN classifier. Converts the leaf image to HSV,
isolates leaf pixels with a hue-based mask, applies Otsu's thresholding on
the saturation channel to identify disease-associated discoloration, and
returns the percentage of leaf area affected.
"""
import cv2
import numpy as np


def estimate_severity(image_path: str) -> float:
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Isolate leaf pixels using a green-ish hue range (tunable per crop).
    leaf_mask = cv2.inRange(hsv, (25, 40, 40), (95, 255, 255))
    leaf_pixels = cv2.countNonZero(leaf_mask)

    if leaf_pixels < 500:
        # Could not confidently isolate a leaf; fall back to a whole-frame estimate.
        leaf_mask = np.ones(hsv.shape[:2], dtype=np.uint8) * 255
        leaf_pixels = leaf_mask.size

    saturation = hsv[:, :, 1]
    leaf_saturation = saturation.copy()
    leaf_saturation[leaf_mask == 0] = 0  # only consider saturation within the leaf region
    _, disease_mask = cv2.threshold(
        leaf_saturation, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )
    disease_mask = cv2.bitwise_and(disease_mask, leaf_mask)
    disease_pixels = cv2.countNonZero(disease_mask)

    severity_pct = (disease_pixels / leaf_pixels) * 100 if leaf_pixels > 0 else 0.0
    return round(min(severity_pct, 100.0), 2)
