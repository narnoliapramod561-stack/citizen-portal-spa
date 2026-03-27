import pg8000.native
from urllib.parse import unquote
import sys

# CREDENTIALS
USER_POOLED_BASE = "postgres.wxuwlgokarhaonrxtwji"
PASS_RAW = "86032@Subham."
DB = "postgres"
PROJECT_ID = "wxuwlgokarhaonrxtwji"

# All Supabase regions
REGIONS = [
    "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
    "sa-east-1", "ca-central-1", "af-south-1", "me-south-1"
]

print(f"🚀 Brute-forcing Supabase Regions for Project: {PROJECT_ID}...")

for region in REGIONS:
    host = f"aws-0-{region}.pooler.supabase.com"
    print(f"--- Trying: {region} ({host}) ---", end=" ")
    sys.stdout.flush()
    try:
        conn = pg8000.native.Connection(
            user=USER_POOLED_BASE, 
            password=PASS_RAW, 
            host=host, 
            port=6543, 
            database=DB, 
            ssl_context=True,
            timeout=5
        )
        print("✅ SUCCESS!")
        print(f"\nWINNER REGION: {region}")
        print(f"CONNECTION STRING: postgresql://{USER_POOLED_BASE}:[PASS]@{host}:6543/{DB}")
        conn.close()
        sys.exit(0)
    except Exception as e:
        err_msg = str(e)
        if "Tenant or user not found" in err_msg:
            print("❌ Tenant not here.")
        elif "timeout" in err_msg:
            print("❌ Timeout.")
        else:
            print(f"❌ Error: {err_msg[:50]}")

print("\n⚠️ ALL REGIONS FAILED.")
sys.exit(1)
