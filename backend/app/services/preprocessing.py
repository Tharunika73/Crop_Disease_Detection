"""
Image acquisition & preprocessing service.

Step 3 in the Crop Health System workflow:
- Image acquisition / validation
- Denoising: Bilateral filtering to preserve lesion borders while smoothing sensor grain
- Normalization: CLAHE on luminance (L-channel in LAB space) to standardize field illumination
"""
import os
import cv2
import numpy as np


def preprocess_image(image_path: str, output_dir: str) -> dict:
    """
    Applies denoising and illumination normalization to a leaf image.
    Saves the preprocessed image in output_dir with a 'prep_' prefix.
    Returns metadata about the preprocessing steps and the output path.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image for preprocessing at {image_path}")

    # 1. Bilateral filter: removes high-frequency camera noise while keeping disease lesion edges sharp
    denoised = cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)

    # 2. Color / Illumination normalization:
    # Convert BGR to LAB color space and apply CLAHE to the L (Luminance) channel
    lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l_channel)
    merged_lab = cv2.merge((cl, a_channel, b_channel))
    normalized = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)

    # 3. Save preprocessed artifact
    filename = os.path.basename(image_path)
    prep_filename = f"prep_{filename}"
    os.makedirs(output_dir, exist_ok=True)
    prep_path = os.path.join(output_dir, prep_filename)
    cv2.imwrite(prep_path, normalized)

    # 4. Metrics
    orig_std = float(np.std(img))
    norm_std = float(np.std(normalized))
    contrast_enhancement = round((norm_std / (orig_std + 1e-5)), 2)

    return {
        "preprocessed_path": prep_path,
        "preprocessed_filename": prep_filename,
        "denoise_method": "Bilateral Filter (9x9, σ=75)",
        "normalization_method": "LAB Space CLAHE (Clip=2.0)",
        "contrast_ratio": contrast_enhancement,
        "dimensions": f"{img.shape[1]}x{img.shape[0]}",
    }
