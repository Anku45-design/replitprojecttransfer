import os
import sqlite3
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, Literal, Optional

import requests


RISK_LEVEL = Literal["LOW", "WARNING", "CRITICAL"]


@dataclass
class FloodRisk:
    location: str
    rainfall: float
    current_level: float
    rate_of_rise: float
    risk_score: float
    risk_level: RISK_LEVEL
    color: str
    created_at: datetime


DB_PATH = os.getenv(
    "ALERTS_DB_PATH",
    os.path.join(os.path.dirname(__file__), "alerts.db"),
)


def _get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """
    Ensure the alerts table exists.
    Call this once at startup from your main app.
    """
    conn = _get_db_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location TEXT NOT NULL,
                rainfall REAL NOT NULL,
                current_level REAL NOT NULL,
                rate_of_rise REAL NOT NULL,
                risk_score REAL NOT NULL,
                risk_level TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def calculate_flood_risk(
    rainfall_mm: float,
    current_level: float,
    rate_of_rise: float,
) -> Dict[str, object]:
    """
    Core risk formula:
    Risk = (Rainfall * 0.4) + (CurrentLevel * 0.3) + (RateOfRise * 0.3)
    Thresholds:
      < 40  -> LOW (Green)
      40-70 -> WARNING (Yellow)
      > 70  -> CRITICAL (Red)
    """
    score = (rainfall_mm * 0.4) + (current_level * 0.3) + (rate_of_rise * 0.3)

    if score < 40:
        level: RISK_LEVEL = "LOW"
        color = "green"
    elif score <= 70:
        level = "WARNING"
        color = "yellow"
    else:
        level = "CRITICAL"
        color = "red"

    return {
        "risk_score": round(score, 2),
        "risk_level": level,
        "color": color,
    }


def _get_weather_api_key() -> str:
    api_key = os.getenv("WEATHER_API_KEY")
    if not api_key:
        raise RuntimeError(
            "WEATHER_API_KEY environment variable is not set. "
            "Set it to your OpenWeatherMap (or compatible) API key."
        )
    return api_key


def fetch_rainfall_for_city(city: str) -> float:
    """
    Fetch real-time rainfall (mm in last 1h) for a given city using OpenWeatherMap.
    Falls back to 0 if rain data is missing, but raises on network/auth errors.
    """
    api_key = _get_weather_api_key()
    url = (
        "https://api.openweathermap.org/data/2.5/weather"
        f"?q={city}&appid={api_key}&units=metric"
    )

    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as exc:
        raise RuntimeError(f"Error fetching weather data for {city}: {exc}") from exc

    # Rainfall is in the "rain" field, e.g. {"rain": {"1h": 3.21}}
    rainfall_mm = float(data.get("rain", {}).get("1h", 0.0))
    return rainfall_mm


def fetch_rainfall_for_key_locations() -> Dict[str, float]:
    """
    Convenience helper specifically for JalDrishti:
    returns rainfall for Darbhanga (Bihar) and Lakhimpur (Assam).
    """
    locations = ["Darbhanga", "Lakhimpur"]
    results: Dict[str, float] = {}
    for loc in locations:
        results[loc] = fetch_rainfall_for_city(loc)
    return results


def save_flood_risk(risk: FloodRisk) -> None:
    """
    Persist a FloodRisk record into the alerts table.
    """
    conn = _get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO alerts (
                location,
                rainfall,
                current_level,
                rate_of_rise,
                risk_score,
                risk_level,
                color,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                risk.location,
                risk.rainfall,
                risk.current_level,
                risk.rate_of_rise,
                risk.risk_score,
                risk.risk_level,
                risk.color,
                risk.created_at.replace(tzinfo=timezone.utc).isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def compute_and_store_risk_for_location(
    location: str,
    current_level: float,
    rate_of_rise: float,
    rainfall_mm: Optional[float] = None,
) -> Dict[str, object]:
    """
    High-level helper:
      1. Fetch rainfall if not provided
      2. Compute risk using the formula
      3. Store in SQLite
      4. Return a dictionary suitable for API responses / dashboard
    """
    if rainfall_mm is None:
        rainfall_mm = fetch_rainfall_for_city(location)

    risk_values = calculate_flood_risk(
        rainfall_mm=rainfall_mm,
        current_level=current_level,
        rate_of_rise=rate_of_rise,
    )

    risk = FloodRisk(
        location=location,
        rainfall=rainfall_mm,
        current_level=current_level,
        rate_of_rise=rate_of_rise,
        risk_score=risk_values["risk_score"],
        risk_level=risk_values["risk_level"],  # type: ignore[assignment]
        color=risk_values["color"],  # type: ignore[assignment]
        created_at=datetime.now(timezone.utc),
    )

    save_flood_risk(risk)

    return asdict(risk)


def get_recent_alerts(limit_per_location: int = 5) -> Dict[str, list]:
    """
    Return recent alerts grouped by location.
    This is intended to back the "Active Alerts" section on the dashboard.
    """
    conn = _get_db_connection()
    try:
        # Fetch latest alerts ordered by time
        rows = conn.execute(
            """
            SELECT
                location,
                rainfall,
                current_level,
                rate_of_rise,
                risk_score,
                risk_level,
                color,
                created_at
            FROM alerts
            ORDER BY datetime(created_at) DESC;
            """
        ).fetchall()
    finally:
        conn.close()

    grouped: Dict[str, list] = {}
    for row in rows:
        loc = row["location"]
        grouped.setdefault(loc, [])

        if len(grouped[loc]) >= limit_per_location:
            continue

        grouped[loc].append(
            {
                "location": row["location"],
                "rainfall": row["rainfall"],
                "current_level": row["current_level"],
                "rate_of_rise": row["rate_of_rise"],
                "risk_score": row["risk_score"],
                "risk_level": row["risk_level"],
                "color": row["color"],
                "created_at": row["created_at"],
            }
        )

    return grouped

