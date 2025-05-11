from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from pathlib import Path
import logging
import os
from app.services.image_storage import ImageStorageService
from mimetypes import guess_type
import imghdr
import re
from urllib.parse import urlparse, unquote
import io
from PIL import Image, ImageDraw, ImageFont

# Configure logger
logger = logging.getLogger(__name__)

router = APIRouter()
# Initialize the image service with the path in the static directory
image_service = ImageStorageService(storage_dir="static/temp_images")

# Common function for serving an image file or placeholder
async def serve_image_file_or_placeholder(requested_filename: str):
    logger.debug(f"Attempting to serve image: {requested_filename}")

    if not requested_filename:
        logger.warning("Image request with empty filename. Serving placeholder.")
        placeholder = create_placeholder_image("Invalid Image Request")
        return StreamingResponse(content=placeholder, media_type="image/jpeg", status_code=200)

    file_path = image_service.get_image_path(requested_filename)

    if image_service.image_exists(requested_filename):
        logger.info(f"Serving image from: {file_path}")
        media_type = guess_type(str(file_path))[0]
        if not media_type:
            try:
                img_type = imghdr.what(file_path)
                media_type = f"image/{img_type}" if img_type else "image/jpeg"
            except Exception as e_imghdr:
                logger.warning(f"imghdr failed for {file_path}: {e_imghdr}. Defaulting to image/jpeg.")
                media_type = "image/jpeg"
        
        response = FileResponse(path=str(file_path), media_type=media_type)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Cache-Control"] = "public, max-age=604800, immutable" # Cache for 1 week
        response.headers["Content-Disposition"] = f"inline; filename=\"{Path(requested_filename).name}\""
        return response
    else:
        logger.warning(f"Image not found: {requested_filename}. Serving placeholder.")
        placeholder_text = f"Image Not Found: {Path(requested_filename).name}"
        placeholder = create_placeholder_image(placeholder_text)
        return StreamingResponse(content=placeholder, media_type="image/jpeg", status_code=200) # Return 200 for placeholder

@router.get("/{filename}")
async def get_image(filename: str):
    """
    Serve an image by its unique filename.
    If the image is not found, it returns a placeholder.
    """
    return await serve_image_file_or_placeholder(filename)

# Placeholder image generation function (can be kept as is or enhanced)
def create_placeholder_image(text="Missing Image", width=400, height=300, font_size=20):
    try:
        img = Image.new('RGB', (width, height), color=(220, 220, 220)) # Light gray background
        draw = ImageDraw.Draw(img)
        try:
            # Try a common sans-serif font, adjust path if necessary or use a bundled font
            font = ImageFont.truetype("DejaVuSans.ttf", font_size) 
        except IOError:
            try:
                font = ImageFont.truetype("arial.ttf", font_size) # Windows fallback
            except IOError:
                logger.warning("Specific fonts not found, using PIL default font for placeholder.")
                font = ImageFont.load_default() # PIL default font

        # Text properties
        text_color = (100, 100, 100) # Dark gray text
        # Simple word wrap for longer text
        lines = []
        if len(text) > 30: # Arbitrary length for wrapping
            words = text.split()
            current_line = ""
            for word in words:
                if draw.textbbox((0,0), current_line + word, font=font)[2] <= width - 20: # Check width with padding
                    current_line += word + " "
                else:
                    lines.append(current_line.strip())
                    current_line = word + " "
            lines.append(current_line.strip())
        else:
            lines = [text]

        # Calculate total text height and draw lines
        total_text_height = sum([draw.textbbox((0,0), line, font=font)[3] for line in lines])
        y_text = (height - total_text_height) / 2

        for line in lines:
            text_width = draw.textbbox((0,0), line, font=font)[2]
            draw.text(((width - text_width) / 2, y_text), line, font=font, fill=text_color)
            y_text += draw.textbbox((0,0), line, font=font)[3] + 2 # Add some line spacing

        # Add a border
        draw.rectangle([0, 0, width - 1, height - 1], outline=(180, 180, 180), width=1)
        
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG', quality=85)
        img_byte_arr.seek(0)
        return img_byte_arr
    except Exception as e:
        logger.error(f"Error creating placeholder image: {e}. Serving minimal fallback.")
        # Minimal fallback if PIL processing fails badly
        minimal_img = Image.new('RGB', (100,100), color=(230,230,230))
        draw = ImageDraw.Draw(minimal_img)
        draw.text((10,40), "Error", fill=(50,50,50))
        fallback_arr = io.BytesIO()
        minimal_img.save(fallback_arr, format='JPEG')
        fallback_arr.seek(0)
        return fallback_arr

# The /img_{image_id} route might be deprecated or refactored if all frontend requests use unique filenames.
# For now, let's keep it but ensure it also uses the serve_image_file_or_placeholder logic 
# if it needs to map an old ID format to a new unique filename (which might be complex).
# A simpler approach is to ensure the frontend *only* requests new unique filenames via the main /{filename} route.
# If this dedicated route is still needed for some legacy reason, its lookup logic would need to be very specific.
@router.get("/img_{image_id_suffix}") # e.g., img_0, img_123 etc.
async def get_image_by_id_suffix(image_id_suffix: str):
    """
    Potentially a legacy endpoint. Tries to find an image based on a suffix like '0' or '123' from an 'img_X' pattern.
    This is less reliable than using full unique filenames.
    """
    logger.warning(f"Legacy image request for /img_{image_id_suffix}. This might be unreliable.")
    # This lookup is problematic because 'image_id_suffix' (e.g., '0') is not unique.
    # We cannot reliably map this back to a unique file like 'img-0-uuid.jpeg' without more context (e.g., document ID).
    # For now, this will likely fail to find a specific image and return a placeholder.
    # A robust solution would require removing this endpoint or passing more context.
    
    # Attempt a very basic guess (HIGHLY UNRELIABLE - for demonstration of the problem)
    # In a real system, this type of loose matching should be avoided.
    placeholder_text = f"Ambiguous ID: img_{image_id_suffix}"
    # Try to find any file that starts with img-{image_id_suffix}
    # This is a weak match and could return the wrong image if multiple exist.
    # This illustrates why unique filenames passed directly to /images/{unique_filename} is better.
    try:
        guessed_prefix = f"img-{image_id_suffix}"
        static_dir = Path(image_service.storage_dir)
        for item in static_dir.iterdir():
            if item.is_file() and item.name.startswith(guessed_prefix):
                logger.warning(f"Guessed file {item.name} for ambiguous ID img_{image_id_suffix}. Serving it.")
                return await serve_image_file_or_placeholder(item.name)
    except Exception as e_glob:
        logger.error(f"Error during globbing for ambiguous ID {image_id_suffix}: {e_glob}")
        
    logger.warning(f"Could not resolve ambiguous legacy ID img_{image_id_suffix}. Serving placeholder.")
    placeholder = create_placeholder_image(placeholder_text)
    return StreamingResponse(content=placeholder, media_type="image/jpeg", status_code=200)

# Proxy endpoint can remain largely the same, but if it internally calls get_image,
# it needs to ensure it passes a unique filename if that's what get_image expects.
# The current proxy seems to extract a filename and call get_image. This is okay if 
# the URL passed to the proxy already contains the unique filename.
@router.get("/proxy/image")
async def proxy_image(url: str):
    """Proxy for external images or to abstract backend image URLs."""
    if not url:
        logger.warning("Proxy image request with empty URL. Serving placeholder.")
        return await serve_image_file_or_placeholder(None) # Will serve generic placeholder
    
    logger.debug(f"Image proxy request for URL: {url}")
    
    parsed_url = urlparse(url)
    # Check if the URL is an internal image service URL using the unique filename pattern
    # e.g., http://localhost:8001/api/v1/images/img-0-a1b2c3d4.jpeg
    path_parts = Path(parsed_url.path).parts
    if len(path_parts) >= 4 and path_parts[-3] == "api" and path_parts[-2] == "v1" and path_parts[-1].startswith("img-"):
        unique_filename = path_parts[-1]
        logger.info(f"Proxy identified internal unique image filename: {unique_filename}")
        return await serve_image_file_or_placeholder(unique_filename)
    
    # If it's not an internal URL pattern that we recognize as unique, or some other case:
    # This part of the proxy might need to fetch external images or handle other logic.
    # For now, if it's not our specific internal pattern, assume it might be an error or an old format.
    logger.warning(f"Proxy received URL not matching known internal patterns: {url}. Attempting to serve placeholder.")
    # Extract a potential filename from the end of the path for the placeholder text
    potential_filename_for_placeholder = Path(unquote(parsed_url.path)).name
    return await serve_image_file_or_placeholder(potential_filename_for_placeholder) # Will likely show "Not Found" placeholder