"""
ReviewFlow AI — Supabase Python Client Service
Initializes the administrative Supabase client using the service role key.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()


def _has_placeholder_value(value: str | None) -> bool:
    if not value:
        return True
    normalized = value.lower()
    return (
        "replace-with-your" in normalized
        or "your-project" in normalized
        or "your-" in normalized
        or "example" in normalized
        or "changeme" in normalized
    )

supabase_url = os.getenv("SUPABASE_URL")
if supabase_url:
    supabase_url = supabase_url.strip('"').strip("'").strip("”").strip("“")

supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if supabase_key:
    supabase_key = supabase_key.strip('"').strip("'").strip("”").strip("“")

if not supabase_url or not supabase_key or _has_placeholder_value(supabase_url) or _has_placeholder_value(supabase_key):
    print("[supabase_service] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing or still placeholder. Supabase client will not be created.")
    supabase_client = None
else:
    # Service role client bypasses RLS for administrative backend operations
    supabase_client: Client = create_client(supabase_url, supabase_key)


    def safe_insert(table: str, record: dict, client=None):
        """Insert a record into Supabase with graceful degradation for schema mismatches.

        Returns the inserted row dict or None on failure.
        On column-not-found errors, retries with only core fields.
        """
        cli = client or supabase_client
        if cli is None:
            print(f"[supabase_service] safe_insert: supabase client not configured; cannot insert into {table}")
            return None
        
        try:
            res = cli.table(table).insert(record).execute()
            return res.data[0] if getattr(res, "data", None) else None
        except Exception as e:
            error_str = str(e).lower()
            # If the error is about a missing column, retry with only essential fields
            if "could not find" in error_str and "column" in error_str:
                print(f"[supabase_service] Schema mismatch for table {table}. Retrying with core fields only.")
                # Core fields that should always exist
                core_fields = {
                    "id", "restaurant_id", "review_text", "user_rating", 
                    "food_rating", "service_rating", "ambience_rating",
                    "customer_name", "customer_email", "feedback_text", "feedback_message",
                    "activity_type", "rating", "metadata",
                    "created_at", "updated_at"
                }
                filtered_record = {k: v for k, v in record.items() if k in core_fields}
                if filtered_record and filtered_record != record:
                    try:
                        res = cli.table(table).insert(filtered_record).execute()
                        print(f"[supabase_service] Retry succeeded with {len(filtered_record)} fields")
                        return res.data[0] if getattr(res, "data", None) else None
                    except Exception as retry_err:
                        print(f"[supabase_service] Retry also failed: {retry_err}")
                        return None
            print(f"[supabase_service] safe_insert error for table {table}: {e}")
            return None


    def safe_select(table: str, query_builder=None, client=None):
        """Run a select query builder function against a table. The `query_builder` is
        a callable that receives the table handle and can chain filters before calling `.execute()`.
        """
        cli = client or supabase_client
        if cli is None:
            print(f"[supabase_service] safe_select: supabase client not configured; cannot query {table}")
            return None
        try:
            if query_builder is None:
                res = cli.table(table).select("*").execute()
            else:
                handle = cli.table(table)
                handle = query_builder(handle)
                res = handle.execute()
            return res.data if getattr(res, "data", None) else []
        except Exception as e:
            print(f"[supabase_service] safe_select error for table {table}: {e}")
            return None
