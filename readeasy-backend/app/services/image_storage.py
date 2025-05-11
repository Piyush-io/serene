import os
import base64
import uuid
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class ImageStorageService:
    def __init__(self, storage_dir="static/temp_images"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True, parents=True)
        
    def save_image(self, base64_data, mime_type="image/jpeg", name_hint="image"):
        """
        Save base64 image data to a file with a unique name and return the filename.
        The unique filename incorporates the name_hint and a UUID.
        Example: if name_hint is "img-0", filename might be "img-0-a1b2c3d4e5f6.jpeg".
        """
        if not base64_data:
            logger.error("Attempted to save image with no base64 data.")
            return None

        # Strip the data URI prefix if present
        if "base64," in base64_data:
            try:
                base64_data = base64_data.split("base64,")[1]
            except IndexError:
                logger.error(f"Error splitting base64_data for hint {name_hint}. Data: {base64_data[:50]}...")
                return None
            
        # Generate unique ID component
        unique_suffix = uuid.uuid4().hex[:12]  # Shorter UUID for filename
        
        # Determine file extension from mime type
        ext = mime_type.split("/")[-1] if "/" in mime_type else "jpg"
        # Common case for jpeg
        if ext == "jpeg":
            ext = "jpg" # Standardize to jpg extension
        
        # Sanitize name_hint: remove extension if present, keep base name
        hint_base_name = name_hint.split('.')[0] if '.' in name_hint else name_hint
        
        # Create filename: e.g., img-0-a1b2c3d4e5f6.jpg
        filename = f"{hint_base_name}-{unique_suffix}.{ext}"
        file_path = self.storage_dir / filename
        
        # Save the image
        try:
            decoded_data = base64.b64decode(base64_data)
            with open(file_path, "wb") as f:
                f.write(decoded_data)
            logger.info(f"Successfully saved image: {file_path}")
            return filename  # Return only the filename
        except base64.binascii.Error as b64_error:
            logger.error(f"Base64 decoding error for {filename}: {b64_error}. Data (first 50 chars): {base64_data[:50]}")
            return None
        except Exception as e:
            logger.error(f"Error saving image {filename}: {e}")
            return None
            
    def get_image_path(self, filename: str) -> Path:
        """Get the full path to an image file."""
        if not filename: # Added check for empty filename
            logger.warning("get_image_path called with empty filename.")
            # Depending on desired behavior, either raise error or return a path to a default/placeholder
            # For now, let's assume an error or handle upstream
            raise ValueError("Filename cannot be empty")
        return self.storage_dir / filename 

    def image_exists(self, filename: str) -> bool:
        """Check if an image file exists."""
        if not filename:
            return False
        return (self.storage_dir / filename).exists() 