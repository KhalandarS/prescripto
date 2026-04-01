import sqlite3
import json
from datetime import datetime

DB_PATH = "clinical_assistant.db"

def init_db():
    """Initialize the SQLite database with required tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT DEFAULT 'Unknown',
            transcript TEXT,
            prescription TEXT,
            ai_suggestions TEXT,
            status TEXT DEFAULT 'pending',
            doctor_notes TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_consultation(patient_name, transcript, prescription, ai_suggestions="", status="pending", doctor_notes=""):
    """Save a new consultation record."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO consultations (patient_name, transcript, prescription, ai_suggestions, status, doctor_notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        patient_name,
        transcript,
        json.dumps(prescription) if isinstance(prescription, dict) else prescription,
        json.dumps(ai_suggestions) if isinstance(ai_suggestions, list) else ai_suggestions,
        status,
        doctor_notes,
        datetime.now().isoformat()
    ))
    conn.commit()
    consultation_id = cursor.lastrowid
    conn.close()
    return consultation_id

def get_all_consultations():
    """Get all consultations ordered by most recent."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consultations ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    results = []
    for row in rows:
        record = dict(row)
        try:
            record["prescription"] = json.loads(record["prescription"])
        except (json.JSONDecodeError, TypeError):
            pass
        try:
            record["ai_suggestions"] = json.loads(record["ai_suggestions"])
        except (json.JSONDecodeError, TypeError):
            pass
        results.append(record)
    return results

def get_consultation(consultation_id):
    """Get a single consultation by ID."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consultations WHERE id = ?", (consultation_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        record = dict(row)
        try:
            record["prescription"] = json.loads(record["prescription"])
        except (json.JSONDecodeError, TypeError):
            pass
        try:
            record["ai_suggestions"] = json.loads(record["ai_suggestions"])
        except (json.JSONDecodeError, TypeError):
            pass
        return record
    return None

def update_consultation_status(consultation_id, status, doctor_notes=""):
    """Update a consultation's approval status."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE consultations SET status = ?, doctor_notes = ? WHERE id = ?
    """, (status, doctor_notes, consultation_id))
    conn.commit()
    conn.close()

# Initialize DB on import
init_db()
