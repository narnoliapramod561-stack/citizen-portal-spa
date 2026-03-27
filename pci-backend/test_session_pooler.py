import pg8000.native
from urllib.parse import unquote
import sys

# CREDENTIALS
USER_POOLED = "postgres.wxuwlgokarhaonrxtwji"
PASS_RAW = "86032@Subham."
DB = "postgres"
HOST = "aws-0-ap-south-1.pooler.supabase.com"

print(f"🚀 Testing Session Pooler (IPv4 Gateway) on Port 5432...")

try:
    conn = pg8000.native.Connection(
        user=USER_POOLED, 
        password=PASS_RAW, 
        host=HOST, 
        port=5432, 
        database=DB, 
        ssl_context=True,
        timeout=10
    )
    print("✅ SUCCESS! Session Pooler works on Port 5432.")
    conn.close()
    sys.exit(0)
except Exception as e:
    print(f"❌ FAILED: {e}")
    sys.exit(1)
