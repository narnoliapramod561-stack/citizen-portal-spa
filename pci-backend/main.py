import os, uuid, base64, random, sqlite3
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import pg8000.native
from urllib.parse import unquote
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# ─── Database Strategy (Resilient) ──────────────────────────────────────────
# We try Supabase first (configured via .env), but fallback to local SQLite if blocked
DATABASE_URL = os.getenv("DATABASE_URL")
DB_MODE = os.getenv("DB_MODE", "supabase").lower()
USE_SQLITE = False

def get_db_raw():
    global USE_SQLITE
    
    # Force SQLite if explicitly requested or if Supabase is known to be unavailable
    if USE_SQLITE or DB_MODE == "sqlite":
        USE_SQLITE = True
        conn = sqlite3.connect("local_pci.db")
        conn.row_factory = sqlite3.Row
        return conn

    if not DATABASE_URL:
        print("⚠️ DATABASE_URL not set in .env. Falling back to local SQLite...")
        USE_SQLITE = True
        return get_db_raw()

    try:
        # Parse connection string for pg8000
        url_clean = DATABASE_URL.replace("postgresql+pg8000://", "").replace("postgresql://", "")
        parts = url_clean.split("@")
        creds = parts[0].split(":")
        addr = parts[1].split("/")
        host_port = addr[0].split(":")
        
        user = creds[0]
        password = unquote(creds[1])
        host = host_port[0]
        port = int(host_port[1]) if len(host_port) > 1 else 5432
        database = addr[1].split("?")[0]

        return pg8000.native.Connection(
            user=user, password=password, host=host, port=port, database=database,
            ssl_context=True if ("supabase.co" in host or "supabase.com" in host) else None,
            timeout=10
        )
    except Exception as e:
        print(f"⚠️ Supabase Cloud Connection Failed: {e}")
        print("🔄 Switching to Local SQLite Fallback...")
        USE_SQLITE = True
        return get_db_raw()

def run_query(query, params=None):
    conn = get_db_raw()
    try:
        if USE_SQLITE:
            cursor = conn.cursor()
            # SQLite uses ? instead of :name
            import re
            sql_query = re.sub(r":(\w+)", r"?", query)
            vals = list(params.values()) if params else []
            cursor.execute(sql_query, vals)
            if query.strip().upper().startswith("SELECT"):
                res = [list(row) for row in cursor.fetchall()]
                return res
            conn.commit()
            return []
        else:
            # pg8000 uses :name
            res = conn.run(query, **(params or {}))
            return res if res else []
    except Exception as e:
        print(f"Database Query Error: {e}")
        return []
    finally:
        conn.close()

# ─── Schema Initialization ──────────────────────────────────────────────────
def init_db():
    print("Checking database schema...")
    # Products Table (New for Phase 1)
    run_query("""
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

    # PCU Table (Extended for Phase 1)
    # Using raw SQL check for column existence if using existing DB, 
    # but since this is a POC we can just ensure it exists with correct columns.
    run_query("""
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

    # PCUs
    # ...
    # Bins Table (New for Spatial Intelligence)
    run_query("""
    CREATE TABLE IF NOT EXISTS bins (
        id           TEXT      PRIMARY KEY,
        name         TEXT      NOT NULL,
        lat          REAL      NOT NULL,
        long         REAL      NOT NULL,
        type         TEXT      NOT NULL,
        source       TEXT      NOT NULL
    );
    """)
    seed_products = [
        ("p1", "8901030865369", "Bisleri Bottle", "Bisleri", "PET", 1, "Bottle"),
        ("p2", "8901764031010", "Kinley Water Bottle", "Kinley", "PET", 1, "Bottle"),
        ("p3", "8901764031027", "Thums Up Bottle", "Thums Up", "PET", 1, "Bottle"),
        ("p4", "8906004100123", "Kurkure Packet", "PepsiCo", "MLP", 0, "Wrapper"),
        ("p5", "8901063012345", "Amul Milk Pouch", "Amul", "LDPE", 1, "Pouch"),
        ("p6", "8901234567890", "Maggi Packet", "Nestle", "MLP", 0, "Wrapper")
    ]
    for p in seed_products:
        # We use INSERT OR IGNORE to avoid duplicates on re-init
        run_query("INSERT OR IGNORE INTO products (id, barcode, product_name, brand, plastic_type, recyclable, packaging_type) VALUES (:id, :bc, :name, :brand, :type, :rec, :pkg)",
                  {"id": p[0], "bc": p[1], "name": p[2], "brand": p[3], "type": p[4], "rec": p[5], "pkg": p[6]})

    # Bins
    seed_bins = [
        ("b1", "EcoHub Central", 28.6139, 77.2090, "plastic", "public"),
        ("b2", "Green Shop - CP", 28.6320, 77.2180, "plastic", "shop"),
        ("b3", "Mixed Waste Bin A", 28.6100, 77.2300, "mixed", "public"),
        ("b4", "Pet Bottle Point", 28.6200, 77.2000, "plastic", "public"),
        ("b5", "Polymer Recyclers", 28.6000, 77.2200, "plastic", "shop")
    ]
    for b in seed_bins:
        run_query("INSERT OR IGNORE INTO bins (id, name, lat, long, type, source) VALUES (:id, :name, :lat, :long, :type, :src)",
                  {"id": b[0], "name": b[1], "lat": b[2], "long": b[3], "type": b[4], "src": b[5]})

    print("Database ready!")

# ─── Helpers ─────────────────────────────────────────────────────────────────
PLASTIC_TYPES  = ["PET", "HDPE", "PVC", "LDPE", "PP", "PS", "Other"]
CREDITS_MAP    = {"PET": 10.0, "HDPE": 8.5, "PVC": 6.0, "LDPE": 5.0,
                  "PP": 7.5, "PS": 4.0, "Other": 3.0}
MONTHLY_TARGET = 500.0

def get_compliance(total: float) -> dict:
    days_gone      = datetime.utcnow().day
    days_in_month  = 30
    days_remaining = days_in_month - days_gone
    daily_rate     = total / max(float(days_gone), 1.0)
    projected      = daily_rate * days_in_month
    compliance     = min(round(float((total / MONTHLY_TARGET) * 100.0), 2), 100.0)
    shortfall      = max(round(float(MONTHLY_TARGET - projected), 2), 0.0)
    return {
        "compliance_pct":      compliance,
        "days_remaining":      int(days_remaining),
        "projected_total":     round(float(projected), 2),
        "projected_shortfall": shortfall,
    }

# ─── Routes ──────────────────────────────────────────────────────────────────
@app.route("/submit-plastic", methods=["POST"])
def submit_plastic():
    lat          = float(request.form.get("lat", 0))
    long         = float(request.form.get("long", 0))
    plastic_type = request.form.get("plastic_type")
    image        = request.files.get("image")

    img_b64: str = ""
    if image:
        raw     = image.read()
        img_str = base64.b64encode(raw).decode()
        img_b64 = str(img_str)[:200]

    ptype = plastic_type or random.choice(PLASTIC_TYPES)
    credits = float(CREDITS_MAP.get(ptype, 3.0)) + round(float(random.uniform(-1, 2)), 2)
    uid = str(uuid.uuid4())
    now = datetime.utcnow()

    run_query("INSERT INTO pcu (id, type, lat, long, timestamp, image, credits, method, recyclable, confidence, barcode) VALUES (:id, :type, :lat, :long, :ts, :img, :cred, :met, :rec, :con, :bc)",
             {"id": uid, "type": ptype, "lat": lat, "long": long, "ts": now.isoformat(), "img": img_b64, "cred": credits, 
              "met": request.form.get("method", "PHOTO"), "rec": int(request.form.get("recyclable", 1)), 
              "con": float(request.form.get("confidence", 1.0)), "bc": request.form.get("barcode")})
    
    return jsonify({
        "pcu": {
            "id": uid, "type": ptype, "lat": lat, "long": long,
            "timestamp": now.isoformat(), "credits": credits,
            "method": request.form.get("method", "PHOTO"),
            "recyclable": int(request.form.get("recyclable", 1))
        }
    })

@app.route("/barcode/lookup", methods=["GET"])
def barcode_lookup():
    barcode = request.args.get("barcode")
    if not barcode:
        return jsonify({"error": "No barcode provided"}), 400
    
    rows = run_query("SELECT product_name, brand, plastic_type, recyclable, packaging_type FROM products WHERE barcode = :bc", {"bc": barcode})
    
    if rows:
        row = rows[0]
        return jsonify({
            "found": True,
            "product_name": row[0],
            "brand": row[1],
            "plastic_type": row[2],
            "recyclable": bool(row[3]),
            "packaging_type": row[4],
            "confidence": 1.0
        })
    else:
        # API Fallback Mock
        # In real case, fetch from OpenFoodFacts
        return jsonify({
            "found": False,
            "plastic_type": "UNKNOWN",
            "recyclable": False,
            "confidence": 0.0,
            "message": "Barcode not found in local database."
        })

@app.route("/detection/photo", methods=["POST"])
def detection_photo():
    # Mock AI detection
    image = request.files.get("image")
    if not image:
        return jsonify({"error": "No image provided"}), 400
    
    # Simulate processing delay
    import time
    time.sleep(1.2)
    
    # Pick a random successful or low-confidence result
    success = random.random() > 0.2
    if success:
        p_type = random.choice(PLASTIC_TYPES)
        return jsonify({
            "plastic_type": p_type,
            "recyclable": p_type not in ["MLP", "PVC"],
            "confidence": round(random.uniform(0.85, 0.99), 2),
            "store_method": "PHOTO"
        })
    else:
        return jsonify({
            "plastic_type": "UNKNOWN",
            "recyclable": False,
            "confidence": round(random.uniform(0.2, 0.5), 2),
            "message": "Low confidence. Please retake image."
        })

@app.route("/bins/nearby", methods=["GET"])
def bins_nearby():
    p_type = request.args.get("type", "all")
    # In a real case, we'd use Haversine here or via SQL if using PostGIS
    # For this POC, we return bins based on the material type filtering logic
    
    if p_type in ["PET", "HDPE", "LDPE"]:
        rows = run_query("SELECT id, name, lat, long, type, source FROM bins WHERE type = 'plastic'")
    elif p_type == "MLP":
        rows = run_query("SELECT id, name, lat, long, type, source FROM bins WHERE type = 'plastic' OR type = 'mixed'")
    else:
        rows = run_query("SELECT id, name, lat, long, type, source FROM bins")

    return jsonify({
        "bins": [
            {"id": row[0], "name": row[1], "lat": float(row[2]), "long": float(row[3]), "type": row[4], "source": row[5]}
            for row in rows
        ]
    })

@app.route("/dashboard", methods=["GET"])
def dashboard():
    rows = run_query("SELECT type, credits FROM pcu")
    total = len(rows)
    total_credits = 0.0
    breakdown = {}
    
    for row in rows:
        cred = float(row[1])
        ptype = str(row[0])
        total_credits += cred
        breakdown[ptype] = breakdown.get(ptype, 0) + 1

    comp = get_compliance(total_credits)
    return jsonify({
        "total_plastic":     total,
        "total_credits_pcu": round(total_credits, 2),
        "target_pcu":        MONTHLY_TARGET,
        "breakdown":         breakdown,
        **comp,
    })

@app.route("/heatmap", methods=["GET"])
def heatmap():
    rows = run_query("SELECT lat, long, type, credits FROM pcu")
    return jsonify({
        "points": [
            {"lat": float(row[0]), "long": float(row[1]), "type": str(row[2]), "credits": float(row[3])}
            for row in rows
        ]
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok", "timestamp": datetime.utcnow().isoformat(), "db_mode": "sqlite" if USE_SQLITE else "supabase"})

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=8000, debug=True)
