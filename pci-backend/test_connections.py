import pg8000.native
from urllib.parse import unquote
import sys

from dotenv import load_dotenv
import os

load_dotenv()

# CREDENTIALS from .env
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not found in .env")
    sys.exit(1)

# Parse DATABASE_URL
url_clean = DATABASE_URL.replace("postgresql+pg8000://", "").replace("postgresql://", "")
parts = url_clean.split("@")
creds = parts[0].split(":")
addr = parts[1].split("/")
host_port = addr[0].split(":")

USER_POOLED = creds[0]
PASS_RAW = unquote(creds[1])
HOST = host_port[0]
PORT = int(host_port[1]) if len(host_port) > 1 else 5432
DB = addr[1].split("?")[0]
PROJECT_ID = USER_POOLED.split(".")[-1] if "." in USER_POOLED else "unknown"

# USER_DIRECT (legacy, for diagnostics)
USER_DIRECT = "postgres"

# Common Supabase connection patterns
options = [
    {
        "host": f"db.{PROJECT_ID}.supabase.co", 
        "port": 5432, 
        "user": USER_DIRECT,
        "desc": "Direct Connection (IPv6/Default)"
    },
    {
        "host": "aws-0-ap-south-1.pooler.supabase.com", 
        "port": 6543, 
        "user": USER_POOLED,
        "desc": "Transaction Pooler (Standard)"
    },
    {
        "host": f"db.{PROJECT_ID}.supabase.co", 
        "port": 6543, 
        "user": USER_POOLED,
        "desc": "Transaction Pooler (Direct Host)"
    }
]

print(f"🚀 Starting Supabase Connection Diagnostics...")
print(f"Project ID: {PROJECT_ID}")

for opt in options:
    print(f"\n--- Testing: {opt['desc']} ---")
    print(f"Target: {opt['user']}@{opt['host']}:{opt['port']}")
    try:
        # We use a short timeout for quick testing
        conn = pg8000.native.Connection(
            user=opt['user'], 
            password=PASS_RAW, 
            host=opt['host'], 
            port=opt['port'], 
            database=DB, 
            ssl_context=True,
            timeout=10
        )
        print("✅ SUCCESS! This connection works.")
        conn.close()
        # If one works, we are done
        sys.exit(0)
    except Exception as e:
        print(f"❌ FAILED: {e}")

print("\n⚠️ ALL CONNECTION ATTEMPTS FAILED.")
print("Please check if the password '86032@Subham.' is correct or if your IP is blocked by Supabase.")
sys.exit(1)
