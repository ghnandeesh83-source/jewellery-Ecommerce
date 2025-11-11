import os
import json
import sys
from pathlib import Path

# Add parent directory to path so we can import from app
sys.path.insert(0, str(Path(__file__).parent.parent))

from app import app

# This is what Vercel calls
app.wsgi_app = app.wsgi_app
