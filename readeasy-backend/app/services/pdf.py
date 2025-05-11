from PyPDF2 import PdfReader
from fastapi import UploadFile
import io

def extract_text_from_pdf(file_content: bytes) -> list[dict[str, any]]:
    """Extracts text from each page of a PDF file content."""
    pages_data = []
    try:
        reader = PdfReader(io.BytesIO(file_content))
        num_pages = len(reader.pages)
        for i in range(num_pages):
            page = reader.pages[i]
            text = page.extract_text()
            if text: # Only add pages with extracted text
                pages_data.append({
                    "page_number": i + 1,
                    "original_text": text,
                    "images": [] # Placeholder for image extraction logic
                })
    except Exception as e:
        print(f"Error reading PDF: {e}")
        # Depending on requirements, you might want to raise an exception here
        # raise HTTPException(status_code=400, detail="Could not process PDF file.")
        pass # Or return partial data / empty list
    return pages_data 