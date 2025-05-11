from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks, Body
from fastapi.responses import JSONResponse
import uuid
import json
import redis.asyncio as redis
from pydantic import ValidationError, BaseModel
import re  # Global import for regular expressions
import logging
import base64

# Set up logger for this module
logger = logging.getLogger(__name__)

from app.schemas.auth import User
from app.schemas.processing import ProcessingResult, ProcessedPage
from app.auth.service import get_current_active_user
from app.core.redis_client import get_redis_client
from app.services.text_refiner import refine_markdown, summarize_text, explain_like_im_five, remove_jargon
from app.services.image_storage import ImageStorageService
from app.core.config import settings

# Import Mistral specific parts
from mistralai import Mistral
from mistralai.models import OCRPageObject

router = APIRouter()

PROCESSING_DB_PREFIX = "processing_job:"

# Initialize Mistral Client (Consider injecting if app structure grows)
# Ensure API key is loaded via settings
if not settings.MISTRAL_API_KEY:
    print("WARNING: MISTRAL_API_KEY not found in environment/config.")
    # Optionally raise an error or handle appropriately
mistral_client = Mistral(api_key=settings.MISTRAL_API_KEY)

# Initialize image storage service
image_service = ImageStorageService(storage_dir="static/temp_images")

# Base URL for constructing image URLs, should be configured if not localhost
BACKEND_BASE_URL = settings.BACKEND_URL or "http://localhost:8001"
IMAGE_API_ENDPOINT_PREFIX = "/api/v1/images" # Path to your image serving endpoint

# --- Helper function from user script (adapted) ---
# This function seems redundant now given the new replace_images_in_markdown logic.
# Consider removing if it's not used elsewhere or has a different specific purpose.
# def normalize_image_references(markdown_str: str) -> str:
#     ...

def replace_images_in_markdown(markdown_content: str, ocr_images_data: list[dict], page_index: int) -> str:
    """Replaces image references in markdown with backend URLs pointing to uniquely named, saved image files."""
    if not markdown_content:
        return ""

    # This map will store {original_mistral_id: unique_backend_filename}
    image_id_to_unique_filename = {}

    # 1. Save all images from OCR data for this page and create the mapping
    for img_data in ocr_images_data:
        original_mistral_id = img_data.get("id")
        base64_str = img_data.get("image_base64")

        if not original_mistral_id or not base64_str:
            logger.warning(f"Page {page_index + 1}: Skipping image due to missing id or base64 data. ID: {original_mistral_id}")
            continue

        processed_base64 = preprocess_base64(base64_str)
        if not processed_base64:
            logger.warning(f"Page {page_index + 1}: Invalid base64 for image {original_mistral_id}. Skipping.")
            continue

        mime_type = determine_mime_type(processed_base64) 
        name_hint = original_mistral_id.split('.')[0] # e.g., "img-0"
        
        # Save image using the service, which now returns a unique filename
        unique_filename = image_service.save_image(
            processed_base64,
            mime_type=mime_type,
            name_hint=name_hint
        )

        if unique_filename:
            image_id_to_unique_filename[original_mistral_id] = unique_filename
            logger.info(f"Page {page_index + 1}: Saved image {original_mistral_id} as {unique_filename}")
        else:
            logger.error(f"Page {page_index + 1}: Failed to save image {original_mistral_id}.")

    # 2. Replace image references in markdown
    # Regex to find markdown image tags: ![alt text](image_id_from_mistral)
    # It should correctly handle cases where image_id_from_mistral might have an extension.
    pattern = re.compile(r"(!\[(.*?)\]\((.*?\.(?:jpeg|jpg|png|gif))\))") # Matches ![alt](id.ext)

    def replace_match(match):
        full_tag, alt_text, original_img_ref = match.groups()
        
        # original_img_ref is like "img-0.jpeg"
        unique_filename = image_id_to_unique_filename.get(original_img_ref)
        
        if unique_filename:
            # Construct the full URL to the backend image endpoint
            backend_image_url = f"{BACKEND_BASE_URL}{IMAGE_API_ENDPOINT_PREFIX}/{unique_filename}"
            new_tag = f"![{alt_text}]({backend_image_url})"
            logger.debug(f"Page {page_index + 1}: Replaced '{original_img_ref}' with '{backend_image_url}'")
            return new_tag
        else:
            # If the image wasn't in ocr_images_data or failed to save, keep original or use placeholder
            logger.warning(f"Page {page_index + 1}: Image ref '{original_img_ref}' not found in saved images. Original tag kept.")
            # Optionally, replace with a specific placeholder for missing backend images
            # return f"![{alt_text}](http://image-placeholder.internal/image_not_found_on_backend.jpg)"
            return full_tag # Keep original if not found

    processed_markdown = pattern.sub(replace_match, markdown_content)
    
    # After replacements, call table fixing
    processed_markdown = fix_markdown_tables(processed_markdown)
    
    logger.info(f"Page {page_index + 1}: Markdown processing complete. Images mapped: {len(image_id_to_unique_filename)}")
    return processed_markdown

def fix_markdown_tables(markdown_str: str) -> str:
    """
    Enhanced function to robustly fix and format markdown tables.
    
    This function:
    1. Properly detects table boundaries in markdown text
    2. Normalizes table structure with consistent column counts
    3. Handles header rows and separator rows correctly
    4. Ensures proper formatting and alignment of all cells
    5. Adds visual spacing around tables for better readability
    """
    if not markdown_str:
        return ""

    lines = markdown_str.split('\n')
    result_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()

        # Detect potential table start (line with multiple pipe characters that looks like a table row)
        if line.count('|') >= 2 and line.strip().startswith('|') and line.strip().endswith('|'):
            # Found potential table start, collect all table lines
            table_lines = [line]
            table_start_idx = i
            i += 1
            
            # Collect all subsequent lines that look like table rows
            while i < len(lines) and lines[i].strip().count('|') >= 2 and lines[i].strip().startswith('|') and lines[i].strip().endswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
            
            # Only process as table if we have at least 2 rows (header + data)
            if len(table_lines) >= 2:
                # Process and fix the table
                fixed_table = process_table(table_lines)
                
                # Add a blank line before the table if there isn't one already
                if result_lines and result_lines[-1].strip():
                    result_lines.append('')
                
                # Add the fixed table
                result_lines.extend(fixed_table)
                
                # Add a blank line after the table
                result_lines.append('')
            else:
                # Not a valid table, preserve original lines
                result_lines.extend(lines[table_start_idx:i])
        else:
            # Not a table line, keep as is
            result_lines.append(line)
            i += 1
    
    return '\n'.join(result_lines)

def process_table(table_lines: list) -> list:
    """Process and fix a markdown table section."""
    
    # Clean up each line
    cleaned_lines = []
    for line in table_lines:
        # Remove problematic tokens and normalize
        cleaned = line.strip()
        cleaned = cleaned.replace('[UNK]:', '').replace('[PAD]', '').replace('<unk>', '').replace('<pad>', '')
        cleaned = re.sub(r'→\s*T\s*→', '→', cleaned)  # Fix arrow symbols
        
        # Normalize spacing around pipes for consistent cell detection
        # First, ensure the line has leading and trailing pipes
        if not cleaned.startswith('|'):
            cleaned = '| ' + cleaned
        if not cleaned.endswith('|'):
            cleaned = cleaned + ' |'
            
        # Then normalize internal spacing
        cleaned = re.sub(r'\|\s*', '| ', cleaned)
        cleaned = re.sub(r'\s*\|', ' |', cleaned)
        
        # Skip completely empty rows
        if re.match(r'^\s*\|(\s*\|)+\s*$', cleaned):
            continue

        cleaned_lines.append(cleaned)
    
    if not cleaned_lines:
        return []  # No valid lines found
    
    # Analyze the first row to determine number of columns
    header_cells = extract_cells(cleaned_lines[0])
    num_cols = max(len(header_cells), 1)  # Ensure at least one column
    
    # Check if second row is a separator row
    has_separator = False
    if len(cleaned_lines) > 1:
        second_row_cells = extract_cells(cleaned_lines[1])
        has_separator = all(
            cell.strip().replace('-', '').replace(':', '') == '' 
            for cell in second_row_cells
        )

    # Rebuild the table with proper structure
    fixed_table = []
    
    # 1. Properly format header row
    header_cells = pad_or_truncate_cells(header_cells, num_cols)
    fixed_table.append(format_row(header_cells))

    # 2. Always include a proper separator row with alignment
    alignments = determine_alignments(cleaned_lines[1] if has_separator and len(cleaned_lines) > 1 else None, num_cols)
    separator_row = format_separator_row(alignments)
    fixed_table.append(separator_row)
    
    # 3. Process data rows (skip header and separator if present)
    start_idx = 1
    if has_separator:
        start_idx = 2
        
    for i in range(start_idx, len(cleaned_lines)):
        row_cells = extract_cells(cleaned_lines[i])
        row_cells = pad_or_truncate_cells(row_cells, num_cols)
        row_cells = process_cell_content(row_cells)
        fixed_table.append(format_row(row_cells))
    
    return fixed_table

def extract_cells(row: str) -> list:
    """Extract cell content from a table row."""
    # Split by pipe and remove empty first/last elements
    parts = row.split('|')
    return [part.strip() for part in parts[1:-1]]  # Skip first and last (empty due to leading/trailing pipes)

def pad_or_truncate_cells(cells: list, target_length: int) -> list:
    """Ensure the cells list has exactly the target length."""
    if len(cells) < target_length:
        return cells + [''] * (target_length - len(cells))
    return cells[:target_length]  # Truncate if too many

def process_cell_content(cells: list) -> list:
    """Process the content of each cell for better formatting."""
    processed = []
    for cell in cells:
        # Convert bullet points for better readability
        if cell.strip().startswith('-'):
            cell = '• ' + cell.strip()[1:].strip()
        processed.append(cell)
    return processed

def determine_alignments(separator_row: str, num_cols: int) -> list:
    """Determine column alignments from separator row."""
    alignments = ['left'] * num_cols  # Default all to left alignment
    
    if separator_row:
        separator_cells = extract_cells(separator_row)
        for i, cell in enumerate(separator_cells):
            if i >= num_cols:
                break

            cell = cell.strip()
            if cell.startswith(':') and cell.endswith(':'):
                alignments[i] = 'center'
            elif cell.endswith(':'):
                alignments[i] = 'right'
    
    return alignments

def format_separator_row(alignments: list) -> str:
    """Format the separator row with proper alignment indicators."""
    separators = []
    for align in alignments:
        if align == 'center':
            separators.append(':---:')
        elif align == 'right':
            separators.append('---:')
        else:  # left alignment
            separators.append('---')
    
    return '| ' + ' | '.join(separators) + ' |'

def format_row(cells: list) -> str:
    """Format a row with proper cell spacing."""
    return '| ' + ' | '.join(cells) + ' |'

async def get_combined_markdown(page: OCRPageObject, document_type: str = "cheatsheet") -> str:
    """Gets markdown with embedded images for a single page object."""
    if not page or not hasattr(page, 'markdown'): # Added check for markdown attribute
        logger.warning(f"OCR page object is empty or missing markdown. Index: {getattr(page, 'index', 'N/A')}")
        return ""

    page_index = page.index
    ocr_images_data = []
    if page.images:
        for img_obj in page.images:
            if img_obj.id and img_obj.image_base64:
                ocr_images_data.append({"id": img_obj.id, "image_base64": img_obj.image_base64})
            else:
                logger.warning(f"Page {page_index + 1}: Found image object with missing id or base64.")
    else:
        logger.info(f"Page {page_index + 1}: No images found in OCR result.")

    # Replace images in markdown using their original Mistral IDs and the new unique filenames
    # The ocr_images_data list now contains dicts like {"id": "img-0.jpeg", "image_base64": "..."}
    processed_markdown = replace_images_in_markdown(page.markdown, ocr_images_data, page_index)

    # Refinement step (ensure GOOGLE_API_KEY check is appropriate)
    if settings.GOOGLE_API_KEY:
        try:
            logger.info(f"Refining markdown for page {page_index + 1} using Google Gemini")
            refined_markdown = await refine_markdown(processed_markdown, context=document_type)
            # (image and table count logging can remain here for verification)
            return refined_markdown
        except Exception as e:
            logger.error(f"Error refining markdown for page {page_index + 1} with Google Gemini: {str(e)}. Using processed markdown.")
            return processed_markdown # Fallback to markdown processed for images and tables
    else:
        logger.info(f"Page {page_index + 1}: No GOOGLE_API_KEY provided. Skipping LLM refinement.")
        return processed_markdown

# --- Background Task for Processing ---
async def run_mistral_ocr_processing(job_id: str, file_content: bytes, file_name: str, r: redis.Redis, document_type: str = "cheatsheet"):
    job_key = f"{PROCESSING_DB_PREFIX}{job_id}"
    signed_url = None
    uploaded_file_id = None

    try:
        logger.info(f"Job {job_id}: Starting processing for {file_name}")
        # 1. Upload the entire file
        uploaded_pdf = mistral_client.files.upload(
            file={
                "file_name": file_name,
                "content": file_content
            },
            purpose="ocr"
        )
        uploaded_file_id = uploaded_pdf.id
        logger.info(f"Job {job_id}: File uploaded to Mistral")

        # 2. Get Signed URL
        signed_url_response = mistral_client.files.get_signed_url(file_id=uploaded_file_id)
        signed_url = signed_url_response.url

        # 3. Update status to processing in Redis (no page count needed upfront)
        await r.setex(job_key, settings.PROCESSING_RESULT_EXPIRATION_SECONDS,
                    json.dumps({"status": "processing", "file_name": file_name}))

        # 4. Process ENTIRE Document in one API call
        logger.info(f"Job {job_id}: Sending document to OCR service")
        ocr_response_obj = mistral_client.ocr.process(
            model="mistral-ocr-latest",
            document={
                "type": "document_url",
                "document_url": signed_url
            },
            include_image_base64=True
        )

        # 5. Process Pages from the single response
        processed_pages_data = []
        num_pages = 0
        if ocr_response_obj and ocr_response_obj.pages:
            num_pages = len(ocr_response_obj.pages)
            logger.info(f"Job {job_id}: Received {num_pages} pages from OCR service")

            for page_result in ocr_response_obj.pages:
                page_num = page_result.index + 1
                logger.info(f"Job {job_id}: Processing page {page_num}/{num_pages}")
                try:
                    # Pass the page_result (OCRPageObject) directly
                    markdown_content = await get_combined_markdown(page_result, document_type)

                    processed_pages_data.append(
                        ProcessedPage(
                            page_number=page_num,
                            markdown_content=markdown_content
                        ).model_dump()
                    )
                except Exception as page_extract_err:
                    logger.error(f"Job {job_id}: Error processing page {page_num}: {page_extract_err}")
                    processed_pages_data.append(
                        ProcessedPage(
                            page_number=page_num,
                            markdown_content=f"*Error processing page {page_num}: There was a problem extracting content from this page.*"
                        ).model_dump()
                    )

                # Update progress (now based on pages processed from the response)
                await r.setex(job_key, settings.PROCESSING_RESULT_EXPIRATION_SECONDS,
                            json.dumps({"status": "processing", "file_name": file_name, "current_page": page_num, "total_pages": num_pages}))
        else:
            logger.error(f"Job {job_id}: OCR response did not contain any pages")
            raise Exception("OCR response did not contain any pages.")

        # 6. Final Result
        result = ProcessingResult(
            file_name=file_name,
            total_pages=num_pages,
            pages=processed_pages_data
        )

        await r.setex(job_key, settings.PROCESSING_RESULT_EXPIRATION_SECONDS,
                    json.dumps({"status": "completed", "result": result.model_dump()}))
        logger.info(f"Job {job_id}: Processing completed successfully")

    except Exception as e:
        logger.error(f"Job {job_id}: Error during processing: {str(e)}")
        await r.setex(job_key, settings.PROCESSING_RESULT_EXPIRATION_SECONDS,
                    json.dumps({"status": "error", "detail": f"An unexpected error occurred during OCR: {str(e)}"}))
    finally:
        # Clean up uploaded file from Mistral storage if possible (optional)
        if uploaded_file_id:
            try:
                mistral_client.files.delete(file_id=uploaded_file_id)
                logger.info(f"Job {job_id}: Cleaned up temporary files")
            except Exception as del_err:
                logger.warning(f"Job {job_id}: Error deleting uploaded file: {str(del_err)}")

# --- API Endpoints ---
@router.post("/", status_code=status.HTTP_202_ACCEPTED)
async def process_pdf_endpoint(
    file: UploadFile = File(...),
    document_type: str = "cheatsheet",  # Default document type
    current_user: User = Depends(get_current_active_user),
    r: redis.Redis = Depends(get_redis_client),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Accepts PDF, starts Mistral OCR background processing, returns job ID."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are accepted.")

    job_id = str(uuid.uuid4())
    job_key = f"{PROCESSING_DB_PREFIX}{job_id}"
    file_name = file.filename

    logger.info(f"User {current_user.email} uploaded file: {file_name}")

    try:
        file_content = await file.read()
        # Store initial job status
        await r.setex(job_key, settings.PROCESSING_RESULT_EXPIRATION_SECONDS,
                      json.dumps({
                          "status": "queued",
                          "file_name": file_name,
                          "user_id": current_user.id
                      }))

        # Add the processing to background tasks
        background_tasks.add_task(run_mistral_ocr_processing, job_id, file_content, file_name, r, document_type)

        return {"job_id": job_id, "status": "queued"}

    except Exception as e:
        logger.error(f"Error accepting job {job_id}: {e}")
        # Don't set error status in Redis here, as the job hasn't started
        raise HTTPException(status_code=500, detail=f"Failed to queue processing job: {str(e)}")
    finally:
        await file.close() # Close file handle


@router.get("/{job_id}") # No response_model here, return raw dict based on status
async def get_processing_result(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    r: redis.Redis = Depends(get_redis_client)
):
    """Retrieves the status or result of a processing job by its ID."""
    job_key = f"{PROCESSING_DB_PREFIX}{job_id}"
    job_data_json = await r.get(job_key)

    if not job_data_json:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processing job not found or expired.")

    try:
        job_data = json.loads(job_data_json)
        job_status = job_data.get("status")

        # Check if the job belongs to the current user (if user_id is stored)
        if "user_id" in job_data and job_data["user_id"] != current_user.id:
            logger.warning(f"User {current_user.id} attempted to access job {job_id} belonging to user {job_data['user_id']}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to access this job.")

        if job_status == "completed":
            result_payload = job_data.get("result", {})
            # Validate the structure before returning
            try:
                validated_result = ProcessingResult(**result_payload)
                return {"status": "completed", "result": validated_result}
            except ValidationError as val_err:
                logger.error(f"Job {job_id}: Validation error for completed result: {val_err}")
                raise HTTPException(status_code=500, detail="Completed job data is invalid.")
        elif job_status == "processing":
             # Return processing status including progress
             return JSONResponse(
                 status_code=status.HTTP_202_ACCEPTED,
                 content={
                     "status": "processing",
                     "current_page": job_data.get("current_page", 0),
                     "total_pages": job_data.get("total_pages", 0),
                     "file_name": job_data.get("file_name")
                 }
             )
        elif job_status == "queued":
            return JSONResponse(
                 status_code=status.HTTP_202_ACCEPTED,
                 content={"status": "queued", "file_name": job_data.get("file_name")}
             )
        elif job_status == "error":
            # Return error status with detail
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"status": "error", "detail": job_data.get('detail', 'Unknown processing error')}
            )
        else:
            # Unknown status
            logger.error(f"Unknown job status for job {job_id}: {job_status}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"status": "error", "detail": "Unknown job status found in storage."}
            )

    except (json.JSONDecodeError, ValidationError) as e:
        logger.error(f"Error decoding/validating job data for {job_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not read job result data.")

# Define a model for the text rephrasing request
class RephraseRequest(BaseModel):
    text_content: str
    mode: str = "summarize"  # Options: summarize, eli5, remove_jargon
    document_type: str = "academic paper"

@router.post("/rephrase", status_code=status.HTTP_200_OK)
async def rephrase_text(
    rephrase_request: RephraseRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Rephrase selected text content using different modes.
    
    Args:
        rephrase_request: The rephrasing request with text_content, mode, and document_type
        
    Returns:
        JSON response with the rephrased text
    """
    logger.info(f"Rephrasing text in mode: {rephrase_request.mode}")
    
    try:
        if not rephrase_request.text_content or len(rephrase_request.text_content.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text content cannot be empty"
            )
            
        rephrased_text = ""
        
        # Apply the appropriate rephrasing function based on mode
        if rephrase_request.mode == "summarize":
            rephrased_text = await summarize_text(rephrase_request.text_content, context=rephrase_request.document_type)
        elif rephrase_request.mode == "eli5":
            rephrased_text = await explain_like_im_five(rephrase_request.text_content, context=rephrase_request.document_type)
        elif rephrase_request.mode == "remove_jargon":
            rephrased_text = await remove_jargon(rephrase_request.text_content, context=rephrase_request.document_type)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid rephrasing mode: {rephrase_request.mode}. Supported modes: summarize, eli5, remove_jargon"
            )
            
        return {"rephrased_text": rephrased_text}
        
    except Exception as e:
        logger.error(f"Error rephrasing text: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rephrasing text: {str(e)}"
        )

# Add a function to preprocess base64 data
def preprocess_base64(base64_str: str) -> str:
    """Clean and validate base64 data"""
    if not base64_str:
        return ""
        
    # Remove line breaks, spaces, and other whitespace
    cleaned = re.sub(r'\s+', '', base64_str)
    
    # Remove data URI prefix if present
    if "base64," in cleaned:
        cleaned = cleaned.split("base64,")[1]
        
    # Validate if the string is proper base64
    try:
        # Try decoding a small part to validate
        base64.b64decode(cleaned[:20] + '=' * (4 - len(cleaned[:20]) % 4))
        return cleaned
    except Exception as e:
        logger.warning(f"Invalid base64 data: {e}")
        return ""

# Helper function to determine mime type based on base64 data
def determine_mime_type(base64_str: str) -> str:
    """Determine the MIME type based on the base64 string pattern."""
    if not base64_str:
        return "image/jpeg"  # Default

    # Remove any whitespace that might be present
    base64_str = base64_str.strip()
    
    # First few characters of the base64 can indicate the format
    # JPEG signature starts with /9j/
    if base64_str.startswith('/9j/'):
        return "image/jpeg"
    # PNG signature starts with iVBOR
    elif base64_str.startswith('iVBOR'):
        return "image/png"
    # GIF signature starts with R0lGOD
    elif base64_str.startswith('R0lGOD'):
        return "image/gif"
    # BMP signature starts with Qk0
    elif base64_str.startswith('Qk0'):
        return "image/bmp"
    # PDF (sometimes embedded)
    elif base64_str.startswith('JVBERi0'):
        return "application/pdf"
    # SVG possibly
    elif base64_str.startswith('UEs') or base64_str.startswith('PHN2'):
        return "image/svg+xml"
    # WebP
    elif base64_str.startswith('UklGR'):
        return "image/webp"

    # Default to JPEG if unknown
    return "image/jpeg"