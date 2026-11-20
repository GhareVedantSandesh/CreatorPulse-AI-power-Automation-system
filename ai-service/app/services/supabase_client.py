from supabase import create_client, Client
from app.config import get_settings

def get_supabase() -> Client:
    settings = get_settings()
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    return create_client(url, key)

supabase: Client = get_supabase()
