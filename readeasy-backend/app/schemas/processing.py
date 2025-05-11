from pydantic import BaseModel

class ProcessedPage(BaseModel):
    page_number: int
    # original_text: str # Removed
    # simplified_text: str # Removed
    markdown_content: str # Added
    # images: list[str] = [] # Removed, images are embedded in markdown

class ProcessingResult(BaseModel):
    file_name: str
    total_pages: int
    pages: list[ProcessedPage] # Will contain pages with markdown_content 