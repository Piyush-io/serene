"""
Text refinement service using Google Gemini to improve OCR-generated markdown.
"""
from google import genai
from google.genai import types
import logging
import json
from app.core.config import settings
import os

# Set up logging
logger = logging.getLogger(__name__)

# Store the API key for reuse in functions
google_api_key = None

# Initialize Google Gemini SDK (it implicitly uses GOOGLE_API_KEY env var)
try:
    # Check if the key is explicitly set in settings, otherwise rely on env var
    google_api_key = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        # Try the TOGETHER_API_KEY as a fallback ONLY IF it's intended to be a Google key
        # This is unlikely but keeps existing settings logic possibility
        google_api_key = settings.TOGETHER_API_KEY
        if google_api_key:
             logging.warning("Using TOGETHER_API_KEY for Google SDK. Ensure this is a valid Google API Key.")
        
    if google_api_key:
        # New SDK doesn't use configure(), but instead creates clients with the API key
        logging.info("Google Generative AI SDK key available.")
    else:
        logging.warning("GOOGLE_API_KEY not found in settings or environment. Refinement will be skipped.")
except Exception as config_error:
    logging.error(f"Failed to configure Google Generative AI SDK: {config_error}")
    # Handle configuration error appropriately

async def refine_markdown(markdown_content: str, context: str = "academic paper") -> str:
    """
    Refine OCR-generated markdown using Google Gemini models.
    
    Args:
        markdown_content: The raw OCR-generated markdown
        context: Optional context about the document type (e.g., academic paper, cheatsheet)
    
    Returns:
        Improved markdown content with corrected text, formatting and structure
    """
    # Check if API key is available
    current_api_key = google_api_key or settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY") or settings.TOGETHER_API_KEY # Match configuration logic
    if not current_api_key:
        logger.warning("GOOGLE_API_KEY not configured - skipping markdown refinement")
        return markdown_content
    
    if not markdown_content:
        return ""
    
    try:
        content_length = len(markdown_content)
        # Update logging message
        logger.info(f"Refining markdown content with Google Gemini (content length: {content_length})")
        
        # Define system prompt for the model (structure might be slightly different for Gemini)
        # Note: Gemini models often work better with instructions directly in the user prompt 
        # rather than a separate system prompt, depending on the model version.
        # Let's combine the instruction and context into the main prompt.
        
        prompt = f"""
        Context: You are processing text from a {context}.
        Task: You are an expert in improving OCR-generated text. Fix common OCR errors and improve the formatting of the following markdown content.

        Instructions:
        1. Correct words with missing letters (e.g., "Che tsheet" → "Cheatsheet").
        2. Fix spacing issues in words (e.g., "Tr nsformers" → "Transformers").
        3. DO NOT modify any mathematical notation or LaTeX syntax. Leave all math content exactly as is, including expressions like $...$ or $$...$$, \\(...\\), \\[...\\], etc.
        4. IMPORTANT: Preserve all markdown image references (like ![alt text](url)), links ([text](url)), and DO NOT modify image URLs or alt text unless correcting an obvious OCR error *within* the alt text itself.
        5. Maintain the original document structure and hierarchy (headings, lists, paragraphs).
        6. Ensure final output is valid markdown.
        7. Remove any non-standard, invalid, or problematic HTML-like tags such as <think>, <unknown>, <internal>, etc. Only allow standard markdown syntax.
        8. For tables:
           - Ensure table syntax is properly structured with pipes (|) to separate columns
           - Make sure the header row clearly defines column titles
           - Insert a proper separator row below the header row with at least 3 dashes (---) in each column
           - Example of proper table format:
             | Column 1 | Column 2 | Column 3 |
             | --- | --- | --- |
             | Data | Data | Data |
           - Ensure each table row has the same number of columns
           - Keep table content as is, just fix the markdown structure
           - Make sure each table has a blank line before and after it
           - Remove problematic tokens like [UNK], [PAD] or arrow symbols from table cells
        9. Do NOT add new content, explanations, or summaries.
        10. Do NOT remove any substantive information.
        11. Do NOT change the meaning of the text.
        12. Understand the document to fix any other issues.

        IMPORTANT: Ensure the final output is ONLY the corrected markdown text. Do not include any introductory sentences, explanations, or markdown code fences like \`\`\`markdown or \`\`\` surrounding the entire response.
        Markdown Content to Refine:
        ---
        {markdown_content}
        ---
        Corrected Markdown:
        """
        
        # model_used = "google/gemini-flash-1.5" # Keep this or choose another Gemini model
        # Switch model name to just the Gemini model identifier
        model_name = "gemini-2.5-flash-preview-04-17" # Or "gemini-1.5-pro-latest", etc.
        logger.info(f"Using model: {model_name}")
        
        # Log a preview of the content being sent (using the combined prompt now)
        prompt_preview = prompt[:700] + "..." if len(prompt) > 700 else prompt # Show a bit more of the prompt
        logger.info(f"Prompt preview:\n{prompt_preview}")
        
        # Create a client for the Gemini API
        client = genai.Client(api_key=current_api_key)
        
        # Configure safety settings
        safety_settings = [
            types.SafetySetting(
                category="HARM_CATEGORY_HARASSMENT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_HATE_SPEECH", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_SEXUALLY_EXPLICIT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
        ]
        
        # Define generation config using proper types format
        generation_config = types.GenerateContentConfig(
            temperature=0.1, # Low temperature for factual correction
            # top_p=0.9, # Optional: control diversity
            # top_k=40, # Optional: control diversity
            candidate_count=1,
            max_output_tokens=8192,
            thinking_config=types.ThinkingConfig(thinking_budget=0),  # Disable thinking
            safety_settings=safety_settings
        )

        # Send request to Gemini API using the async method
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=generation_config
        )
        
        # Extract the refined markdown text
        # Add checks for response validity and potential blocks
        if not response.candidates:
             logger.error("Gemini response blocked or empty. Check safety settings or prompt.")
             # Log the finish reason if available
             try:
                 finish_reason = response.prompt_feedback.block_reason
                 logger.error(f"Block Reason: {finish_reason}")
                 # You might want to return specific error info or fallback
                 # return f"Error: Content blocked due to {finish_reason}" 
             except Exception:
                 logger.error("Could not determine block reason from prompt_feedback.")
             return markdown_content # Fallback to original

        # Check finish reason in the candidate
        candidate = response.candidates[0]
        if candidate.finish_reason != 'STOP':
             logger.warning(f"Gemini generation finished with reason: {candidate.finish_reason}. Content might be incomplete.")
             # Log safety ratings if available
             if candidate.safety_ratings:
                 logger.warning(f"Safety Ratings: {candidate.safety_ratings}")

        refined_markdown = candidate.content.parts[0].text
        
        # ADD: Strip leading/trailing markdown code fences
        if refined_markdown.startswith("```markdown\n"):
            refined_markdown = refined_markdown[len("```markdown\n"):]
        if refined_markdown.startswith("```"):
             refined_markdown = refined_markdown[len("```"):]
        if refined_markdown.endswith("\n```"):
            refined_markdown = refined_markdown[:-len("\n```")]
        if refined_markdown.endswith("```"):
             refined_markdown = refined_markdown[:-len("```")]
        refined_markdown = refined_markdown.strip() # Remove any leading/trailing whitespace
        
        # Log success and a preview of the refined content
        refined_preview = refined_markdown[:500] + "..." if len(refined_markdown) > 500 else refined_markdown
        logger.info(f"Successfully refined markdown (refined length: {len(refined_markdown)})")
        logger.info(f"Refined preview:\n{refined_preview}")
        
        # Look for image tags before and after (simple check)
        original_images = markdown_content.count("![")
        refined_images = refined_markdown.count("![")
        logger.info(f"Image tags: {original_images} before, {refined_images} after refinement")
        if refined_images < original_images:
             logger.warning("Potential loss of image tags during refinement.")

        
        return refined_markdown
        
    except Exception as e:
        # Update logging message
        logger.error(f"Error refining markdown with Google Gemini: {str(e)}")
        # More detailed error logging remains useful
        try:
            error_details = str(e)
            # Add specific checks for Google API errors if needed
            # if isinstance(e, google.api_core.exceptions.GoogleAPIError):
            #     error_details += f" Status: {e.code()}"
            logger.error(f"Error details: {error_details}")
        except:
            pass
        # Return original content if refinement fails
        return markdown_content 

async def summarize_text(text_content: str, context: str = "academic paper") -> str:
    """
    Summarize the given text content using Google Gemini models.
    
    Args:
        text_content: The text content to summarize
        context: Optional context about the document type (e.g., academic paper, cheatsheet)
    
    Returns:
        Summarized markdown content
    """
    # Check if API key is available
    current_api_key = google_api_key or settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY") or settings.TOGETHER_API_KEY
    if not current_api_key:
        logger.warning("GOOGLE_API_KEY not configured - skipping text summarization")
        return text_content
    
    if not text_content:
        return ""
    
    try:
        content_length = len(text_content)
        logger.info(f"Summarizing text content with Google Gemini (content length: {content_length})")
        
        prompt = f"""
        Context: You are processing text from a {context}.
        Task: You are an expert in summarizing complex text. Create a concise, informative summary of the following content.

        Instructions:
        1. Preserve the key points and main ideas of the original text.
        2. Reduce the text length by approximately 70%, focusing on the most important information.
        3. Maintain the original tone and terminology where appropriate, but simplify when possible.
        4. IMPORTANT: Preserve any mathematical notation and formulas, keeping LaTeX syntax like \( ... \) or $$ ... $$.
        5. If images or tables are referenced in the text, maintain those references.
        6. Use clear, well-structured markdown formatting in your summary.
        7. Do NOT add new information or interpretations not present in the original text.
        8. Keep a logical flow and connection between ideas.
        9. Remove redundant examples if multiple are present.
        10. If there are any syntactical or grammatical errors, fix them.
        
        IMPORTANT: Ensure the final output is ONLY the summarized markdown text. Do not include any introductory sentences, explanations, or markdown code fences surrounding the entire response.

        Return ONLY the summarized content.

        Content to Summarize:
        ---
        {text_content}
        ---
        Summarized Content:
        """
        
        model_name = "gemini-2.5-flash-preview-04-17"
        logger.info(f"Using model: {model_name}")
        
        # Log a preview of the content being sent
        prompt_preview = prompt[:700] + "..." if len(prompt) > 700 else prompt
        logger.info(f"Prompt preview:\n{prompt_preview}")
        
        # Create a client for the Gemini API
        client = genai.Client(api_key=current_api_key)
        
        # Configure safety settings
        safety_settings = [
            types.SafetySetting(
                category="HARM_CATEGORY_HARASSMENT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_HATE_SPEECH", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_SEXUALLY_EXPLICIT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
        ]

        # Define generation config
        generation_config = types.GenerateContentConfig(
            temperature=0.3,  # Slightly higher temperature for summarization
            candidate_count=1,
            max_output_tokens=3072,  # Limit output length for summaries
            thinking_config=types.ThinkingConfig(thinking_budget=0),  # Disable thinking
            safety_settings=safety_settings
        )
        
        # Send request to Gemini API using the async method
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=generation_config
        )
        
        if not response.candidates:
             logger.error("Gemini response blocked or empty for summarization.")
             try:
                 finish_reason = response.prompt_feedback.block_reason
                 logger.error(f"Block Reason: {finish_reason}")
             except Exception:
                 logger.error("Could not determine block reason from prompt_feedback.")
             return text_content  # Fallback to original

        candidate = response.candidates[0]
        if candidate.finish_reason != 'STOP':
             logger.warning(f"Gemini summarization finished with reason: {candidate.finish_reason}. Content might be incomplete.")
             if candidate.safety_ratings:
                 logger.warning(f"Safety Ratings: {candidate.safety_ratings}")

        summarized_text = candidate.content.parts[0].text
        
        # Strip code fences if present
        if summarized_text.startswith("```markdown\n"):
            summarized_text = summarized_text[len("```markdown\n"):]
        if summarized_text.startswith("```"):
             summarized_text = summarized_text[len("```"):]
        if summarized_text.endswith("\n```"):
            summarized_text = summarized_text[:-len("\n```")]
        if summarized_text.endswith("```"):
             summarized_text = summarized_text[:-len("```")]
        summarized_text = summarized_text.strip()
        
        summarized_preview = summarized_text[:500] + "..." if len(summarized_text) > 500 else summarized_text
        logger.info(f"Successfully summarized text (length: {len(summarized_text)})")
        logger.info(f"Summarized preview:\n{summarized_preview}")
        
        return summarized_text
        
    except Exception as e:
        logger.error(f"Error summarizing text with Google Gemini: {str(e)}")
        try:
            error_details = str(e)
            logger.error(f"Error details: {error_details}")
        except:
            pass
        return text_content

async def explain_like_im_five(text_content: str, context: str = "academic paper") -> str:
    """
    Simplify and explain the given text content in very simple terms (ELI5) using Google Gemini models.
    
    Args:
        text_content: The text content to simplify and explain
        context: Optional context about the document type (e.g., academic paper, cheatsheet)
    
    Returns:
        Simplified markdown content that a child could understand
    """
    # Check if API key is available
    current_api_key = google_api_key or settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY") or settings.TOGETHER_API_KEY
    if not current_api_key:
        logger.warning("GOOGLE_API_KEY not configured - skipping ELI5 explanation")
        return text_content
    
    if not text_content:
        return ""
    
    try:
        content_length = len(text_content)
        logger.info(f"Creating ELI5 explanation with Google Gemini (content length: {content_length})")
        
        prompt = f"""
        Context: You are processing text from a {context}.
        Task: Explain the following content as if you were explaining it to a 5-year-old child.

        Instructions:
        1. Use very simple language, short sentences, and basic vocabulary.
        2. Replace technical terms and jargon with simple concepts and everyday analogies.
        3. Break down complex ideas into small, digestible pieces.
        4. Use concrete examples and relatable metaphors when appropriate.
        5. Maintain a warm, friendly, and encouraging tone.
        6. If a concept is too abstract, find a real-world parallel that a child would understand.
        7. For mathematical concepts, use visual descriptions rather than formulas when possible.
        8. If formulas must be included, explain what each symbol means in very simple terms.
        9. Keep the explanation structured and logical, with clear connections between ideas.
        10. Use markdown formatting to make the explanation visually clear.
        11. Do NOT oversimplify to the point of inaccuracy - strive for correctness in simple terms.
        
        IMPORTANT: Return ONLY the simplified explanation in markdown format. Do not include any introductory sentences, explanations about what you're doing, or markdown code fences surrounding the entire response.

        Content to Explain:
        ---
        {text_content}
        ---
        Explanation for a 5-year-old:
        """
        
        model_name = "gemini-2.5-flash-preview-04-17"
        logger.info(f"Using model: {model_name}")
        
        # Log a preview of the content being sent
        prompt_preview = prompt[:700] + "..." if len(prompt) > 700 else prompt
        logger.info(f"Prompt preview:\n{prompt_preview}")
        
        # Create a client for the Gemini API
        client = genai.Client(api_key=current_api_key)
        
        # Configure safety settings
        safety_settings = [
            types.SafetySetting(
                category="HARM_CATEGORY_HARASSMENT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_HATE_SPEECH", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_SEXUALLY_EXPLICIT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
        ]

        # Define generation config with higher temperature for creative explanations
        generation_config = types.GenerateContentConfig(
            temperature=0.4,  # Higher temperature for more creative, simple language
            candidate_count=1,
            max_output_tokens=3072,
            thinking_config=types.ThinkingConfig(thinking_budget=0),  # Disable thinking
            safety_settings=safety_settings
        )
        
        # Send request to Gemini API using the async method
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=generation_config
        )
        
        if not response.candidates:
             logger.error("Gemini response blocked or empty for ELI5 explanation.")
             try:
                 finish_reason = response.prompt_feedback.block_reason
                 logger.error(f"Block Reason: {finish_reason}")
             except Exception:
                 logger.error("Could not determine block reason from prompt_feedback.")
             return text_content  # Fallback to original

        candidate = response.candidates[0]
        if candidate.finish_reason != 'STOP':
             logger.warning(f"Gemini ELI5 explanation finished with reason: {candidate.finish_reason}. Content might be incomplete.")
             if candidate.safety_ratings:
                 logger.warning(f"Safety Ratings: {candidate.safety_ratings}")

        simplified_text = candidate.content.parts[0].text
        
        # Strip code fences if present
        if simplified_text.startswith("```markdown\n"):
            simplified_text = simplified_text[len("```markdown\n"):]
        if simplified_text.startswith("```"):
             simplified_text = simplified_text[len("```"):]
        if simplified_text.endswith("\n```"):
            simplified_text = simplified_text[:-len("\n```")]
        if simplified_text.endswith("```"):
             simplified_text = simplified_text[:-len("```")]
        simplified_text = simplified_text.strip()
        
        simplified_preview = simplified_text[:500] + "..." if len(simplified_text) > 500 else simplified_text
        logger.info(f"Successfully created ELI5 explanation (length: {len(simplified_text)})")
        logger.info(f"Simplified preview:\n{simplified_preview}")
        
        return simplified_text
        
    except Exception as e:
        logger.error(f"Error creating ELI5 explanation with Google Gemini: {str(e)}")
        try:
            error_details = str(e)
            logger.error(f"Error details: {error_details}")
        except:
            pass
        return text_content

async def remove_jargon(text_content: str, context: str = "academic paper") -> str:
    """
    Remove technical jargon from the given text content using Google Gemini models.
    
    Args:
        text_content: The text content to simplify by removing jargon
        context: Optional context about the document type (e.g., academic paper, cheatsheet)
    
    Returns:
        Jargon-free markdown content that maintains the original meaning
    """
    # Check if API key is available
    current_api_key = google_api_key or settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY") or settings.TOGETHER_API_KEY
    if not current_api_key:
        logger.warning("GOOGLE_API_KEY not configured - skipping jargon removal")
        return text_content
    
    if not text_content:
        return ""
    
    try:
        content_length = len(text_content)
        logger.info(f"Removing jargon with Google Gemini (content length: {content_length})")
        
        prompt = f"""
        Context: You are processing text from a {context}.
        Task: Rewrite the following text to remove technical jargon and specialized terminology, making it accessible to a general audience.

        Instructions:
        1. Identify and replace field-specific jargon, technical terms, and acronyms with plain language equivalents.
        2. When a technical term must be used, briefly define it in parentheses the first time it appears.
        3. Break down complex concepts into simpler explanations without oversimplifying.
        4. Maintain the original meaning, information density, and logical structure of the content.
        5. Keep the same level of detail and accuracy as the original.
        6. Preserve mathematical notation when necessary, but explain what the variables and symbols represent.
        7. Use concrete examples to illustrate abstract concepts when helpful.
        8. Maintain markdown formatting for headings, lists, emphasis, etc.
        9. Preserve any references to images, tables, or figures in the text.
        10. Use a friendly, accessible tone that welcomes non-experts.
        
        IMPORTANT: Return ONLY the jargon-free content in markdown format. Do not include any introductory sentences, explanations about what you're doing, or markdown code fences surrounding the entire response.

        Content to Remove Jargon From:
        ---
        {text_content}
        ---
        Jargon-Free Content:
        """
        
        model_name = "gemini-2.5-flash-preview-04-17"
        logger.info(f"Using model: {model_name}")
        
        # Log a preview of the content being sent
        prompt_preview = prompt[:700] + "..." if len(prompt) > 700 else prompt
        logger.info(f"Prompt preview:\n{prompt_preview}")
        
        # Create a client for the Gemini API
        client = genai.Client(api_key=current_api_key)
        
        # Configure safety settings consistent with other methods
        safety_settings = [
            types.SafetySetting(
                category="HARM_CATEGORY_HARASSMENT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_HATE_SPEECH", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_SEXUALLY_EXPLICIT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
            types.SafetySetting(
                category="HARM_CATEGORY_DANGEROUS_CONTENT", 
                threshold="BLOCK_MEDIUM_AND_ABOVE"
            ),
        ]

        # Define generation config for jargon simplification
        generation_config = types.GenerateContentConfig(
            temperature=0.2,  # Low temperature for accurate simplification
            candidate_count=1,
            max_output_tokens=4096,
            thinking_config=types.ThinkingConfig(thinking_budget=0),  # Disable thinking
            safety_settings=safety_settings
        )
        
        # Send request to Gemini API using the async method
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=generation_config
        )
        
        if not response.candidates:
             logger.error("Gemini response blocked or empty for jargon removal.")
             try:
                 finish_reason = response.prompt_feedback.block_reason
                 logger.error(f"Block Reason: {finish_reason}")
             except Exception:
                 logger.error("Could not determine block reason from prompt_feedback.")
             return text_content  # Fallback to original

        candidate = response.candidates[0]
        if candidate.finish_reason != 'STOP':
             logger.warning(f"Gemini jargon removal finished with reason: {candidate.finish_reason}. Content might be incomplete.")
             if candidate.safety_ratings:
                 logger.warning(f"Safety Ratings: {candidate.safety_ratings}")

        jargon_free_text = candidate.content.parts[0].text
        
        # Strip code fences if present
        if jargon_free_text.startswith("```markdown\n"):
            jargon_free_text = jargon_free_text[len("```markdown\n"):]
        if jargon_free_text.startswith("```"):
             jargon_free_text = jargon_free_text[len("```"):]
        if jargon_free_text.endswith("\n```"):
            jargon_free_text = jargon_free_text[:-len("\n```")]
        if jargon_free_text.endswith("```"):
             jargon_free_text = jargon_free_text[:-len("```")]
        jargon_free_text = jargon_free_text.strip()
        
        jargon_free_preview = jargon_free_text[:500] + "..." if len(jargon_free_text) > 500 else jargon_free_text
        logger.info(f"Successfully removed jargon (length: {len(jargon_free_text)})")
        logger.info(f"Jargon-free preview:\n{jargon_free_preview}")
        
        return jargon_free_text
        
    except Exception as e:
        logger.error(f"Error removing jargon with Google Gemini: {str(e)}")
        try:
            error_details = str(e)
            logger.error(f"Error details: {error_details}")
        except:
            pass
        return text_content 