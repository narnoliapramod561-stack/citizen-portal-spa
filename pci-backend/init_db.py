import os
from dotenv import load_dotenv
import pg8000.native
from urllib.parse import unquote

load_dotenv()

# Use the Supabase Transaction Pooler (Port 6543) for better IPv4/Network compatibility
DB_URL = os.getenv("DATABASE_URL")

def get_db_params(url):
    if not url: return None
    # Quick parse
    parts = url.replace("postgresql+pg8000://", "").replace("postgresql://", "").split("@")
    if len(parts) < 2: return None
    creds = parts[0].split(":")
    addr = parts[1].split("/")
    host_port = addr[0].split(":")
    return {
        "user": creds[0],
        "password": unquote(creds[1]),
        "host": host_port[0],
        "port": int(host_port[1]) if len(host_port) > 1 else 5432,
        "database": addr[1].split("?")[0]
    }

print("Connecting to Supabase via pure pg8000...")
params = get_db_params(DB_URL)

try:
    conn = pg8000.native.Connection(**params, ssl_context=True)
    
    # 1. Products Table (New for Phase 1)
    conn.run("""
    CREATE TABLE IF NOT EXISTS products (
        id             TEXT      PRIMARY KEY,
        barcode        TEXT      UNIQUE NOT NULL,
        product_name   TEXT      NOT NULL,
        brand          TEXT      NOT NULL,
        plastic_type   TEXT      NOT NULL,
        recyclable     INTEGER   NOT NULL,
        packaging_type TEXT,
        last_updated   TEXT      DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. PCU Table (Extended for Phase 1)
    conn.run("""
    CREATE TABLE IF NOT EXISTS pcu (
        id           TEXT      PRIMARY KEY,
        type         TEXT      NOT NULL,
        lat          REAL      NOT NULL,
        long         REAL      NOT NULL,
        timestamp    TEXT      DEFAULT CURRENT_TIMESTAMP,
        image        TEXT,
        credits      REAL      DEFAULT 0.0,
        method       TEXT      DEFAULT 'MANUAL',
        recyclable   INTEGER   DEFAULT 1,
        confidence   REAL      DEFAULT 1.0,
        barcode      TEXT      
    );
    """)

    # 3. Bins Table (Spatial Intelligence)
    conn.run("""
    CREATE TABLE IF NOT EXISTS bins (
        id           TEXT      PRIMARY KEY,
        name         TEXT      NOT NULL,
        lat          REAL      NOT NULL,
        long         REAL      NOT NULL,
        type         TEXT      NOT NULL, -- plastic / mixed
        source       TEXT      NOT NULL  -- public / shop
    );
    """)

    # --- SEEDING ---
    # 1. Seed Mandatory Products
    # ... (rest of products seed)
    seed_products = [
        ("p1", "8901030865369", "Bisleri Bottle", "Bisleri", "PET", 1, "Bottle"),
        ("p2", "8901764031010", "Kinley Water Bottle", "Kinley", "PET", 1, "Bottle"),
        ("p3", "8901764031027", "Thums Up Bottle", "Thums Up", "PET", 1, "Bottle"),
        ("p4", "8906004100123", "Kurkure Packet", "PepsiCo", "MLP", 0, "Wrapper"),
        ("p5", "8901063012345", "Amul Milk Pouch", "Amul", "LDPE", 1, "Pouch"),
        ("p6", "8901234567890", "Maggi Packet", "Nestle", "MLP", 0, "Wrapper")
    ]
    for p in seed_products:
        # We handle conflicts on barcodes
        conn.run("INSERT INTO products (id, barcode, product_name, brand, plastic_type, recyclable, packaging_type) VALUES (:id, :bc, :name, :brand, :type, :rec, :pkg) ON CONFLICT (barcode) DO NOTHING",
                  id=p[0], bc=p[1], name=p[2], brand=p[3], type=p[4], rec=p[5], pkg=p[6])

    # 2. Seed Bins
    seed_bins = [
        ("b1", "EcoHub Central", 28.6139, 77.2090, "plastic", "public"),
        ("b2", "Green Shop - CP", 28.6320, 77.2180, "plastic", "shop"),
        ("b3", "Mixed Waste Bin A", 28.6100, 77.2300, "mixed", "public"),
        ("b4", "Pet Bottle Point", 28.6200, 77.2000, "plastic", "public"),
        ("b5", "Polymer Recyclers", 28.6000, 77.2200, "plastic", "shop")
    ]
    for b in seed_bins:
        conn.run("INSERT INTO bins (id, name, lat, long, type, source) VALUES (:id, :name, :lat, :long, :type, :src) ON CONFLICT (id) DO NOTHING",
                  id=b[0], name=b[1], lat=b[2], long=b[3], type=b[4], src=b[5])

    print("Successfully created tables and seeded data on Supabase!")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
