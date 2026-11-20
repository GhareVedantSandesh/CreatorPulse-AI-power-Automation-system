import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

class DatabaseClient:
    def __init__(self):
        settings = get_settings()
        self.conn_str = settings.DATABASE_URL
        self._conn = None

    @property
    def connection(self):
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(self.conn_str, cursor_factory=RealDictCursor)
            self._conn.autocommit = True
        return self._conn

    def execute(self, query, params=None):
        with self.connection.cursor() as cur:
            cur.execute(query, params)
            if cur.description:
                return cur.fetchall()
            return None

    def fetch_one(self, query, params=None):
        res = self.execute(query, params)
        return res[0] if res else None

    def update(self, table, data, where_clause, where_params):
        cols = ", ".join([f"{k} = %s" for k in data.keys()])
        query = f"UPDATE {table} SET {cols} WHERE {where_clause}"
        params = list(data.values()) + list(where_params)
        self.execute(query, params)

    def insert(self, table, data):
        cols = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        query = f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) RETURNING *"
        return self.fetch_one(query, list(data.values()))

db = DatabaseClient()
