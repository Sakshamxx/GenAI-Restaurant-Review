"""
ReviewFlow AI — Supabase Python Client Service
Initializes the administrative Supabase client using the service role key.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
if supabase_url:
    supabase_url = supabase_url.strip('"').strip("'").strip("”").strip("“")

supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if supabase_key:
    supabase_key = supabase_key.strip('"').strip("'").strip("”").strip("“")

if not supabase_url or not supabase_key:
    print("[supabase_service] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing!")

# Service role client bypasses RLS for administrative backend operations
supabase_client: Client = create_client(supabase_url, supabase_key)
