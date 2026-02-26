from fastapi import APIRouter, HTTPException, Request
from app.config import get_settings
import base64
import hashlib
import logging
from multipart.multipart import parse_options_header
from io import BytesIO

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["upload"])
settings = get_settings()


@router.post("/upload/image")
async def upload_image(request: Request):
    """Upload image endpoint - manually parses multipart form data"""
    logger.info("=" * 50)
    logger.info("📤 UPLOAD REQUEST RECEIVED")
    logger.info("=" * 50)
    
    try:
        # Read the request body
        body = await request.body()
        logger.info(f"Request body size: {len(body)} bytes")
        
        # Get content type header
        content_type = request.headers.get("content-type", "")
        logger.info(f"Content-Type header: {content_type}")
        
        # Parse multipart form data manually
        _, options = parse_options_header(content_type)
        boundary = options.get(b"boundary")
        
        if not boundary:
            logger.error("❌ No boundary found in content-type")
            raise HTTPException(status_code=400, detail="Invalid multipart form data: missing boundary")
        
        logger.info(f"Boundary: {boundary}")
        
        # Split by boundary
        boundary_str = b"--" + boundary
        parts = body.split(boundary_str)
        
        logger.info(f"Number of parts: {len(parts)}")
        
        # Find the file part
        file_data = None
        file_filename = None
        file_content_type = None
        
        for part in parts:
            if not part or part == b"--\r\n" or part == b"--":
                continue
            
            logger.info(f"Part size: {len(part)} bytes")
            
            # Split headers and content
            if b"\r\n\r\n" in part:
                header_section, content = part.split(b"\r\n\r\n", 1)
            elif b"\n\n" in part:
                header_section, content = part.split(b"\n\n", 1)
            else:
                continue
            
            headers = header_section.decode("utf-8", errors="ignore")
            logger.info(f"Headers: {headers[:200]}")
            
            # Check if this is the file field
            if 'name="image"' in headers or "name='image'" in headers:
                # Extract filename
                import re
                filename_match = re.search(r'filename=["\']?([^"\';\r\n]+)', headers)
                if filename_match:
                    file_filename = filename_match.group(1)
                    logger.info(f"Found file: {file_filename}")
                
                # Extract content type
                ct_match = re.search(r'Content-Type:\s*([^\r\n]+)', headers, re.IGNORECASE)
                if ct_match:
                    file_content_type = ct_match.group(1).strip()
                    logger.info(f"File content type: {file_content_type}")
                
                # Remove trailing \r\n-- from content
                content = content.rstrip()
                if content.endswith(b"--"):
                    content = content[:-2]
                content = content.rstrip(b"\r\n")
                
                file_data = content
                logger.info(f"File data size: {len(file_data)} bytes")
                break
        
        if not file_data:
            logger.error("❌ No file data found in request")
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        logger.info(f"\n📁 File info:")
        logger.info(f"  Filename: {file_filename}")
        logger.info(f"  Content-Type: {file_content_type}")
        logger.info(f"  Size: {len(file_data)} bytes")
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
        logger.info(f"\n🔍 Checking content type: {file_content_type}")
        logger.info(f"  Allowed types: {allowed_types}")

        if file_content_type and file_content_type not in allowed_types:
            logger.error(f"❌ Invalid file type: {file_content_type}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "INVALID_FILE_TYPE",
                    "message": f"Only JPEG, PNG, and WebP images are allowed. Got: {file_content_type}",
                },
            )

        # Validate file size
        logger.info(f"\n📏 Checking file size: {len(file_data)} bytes (max: {settings.max_image_size})")
        if len(file_data) > settings.max_image_size:
            logger.error(f"❌ File too large: {len(file_data)} bytes")
            raise HTTPException(
                status_code=413,
                detail={"error": "FILE_TOO_LARGE", "message": "Image must be under 5MB"},
            )

        # Process file
        logger.info("\n🔐 Generating file hash...")
        file_hash = hashlib.md5(file_data).hexdigest()[:12]
        extension = file_filename.split(".")[-1] if file_filename and "." in file_filename else "jpg"
        image_key = f"uploads/{file_hash}.{extension}"
        logger.info(f"✅ Hash: {file_hash}, Extension: {extension}, Key: {image_key}")

        logger.info("\n📦 Encoding to base64...")
        image_base64 = base64.b64encode(file_data).decode("utf-8")
        content_type = file_content_type or "image/jpeg"
        data_url = f"data:{content_type};base64,{image_base64}"
        logger.info(f"✅ Base64 length: {len(image_base64)} chars")

        logger.info("\n✅ UPLOAD SUCCESSFUL")
        logger.info("=" * 50)
        
        return {"success": True, "data": {"image_url": data_url, "image_key": image_key}}
    
    except HTTPException as e:
        logger.error(f"❌ HTTP Exception: {e.status_code} - {e.detail}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error: {type(e).__name__}: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "UPLOAD_ERROR",
                "message": str(e),
            },
        )
