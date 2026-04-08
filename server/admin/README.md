# Shinra Pocket Admin Dashboard

## Access

Open in a browser:

```
http://localhost:3001/admin
```

## Authentication

All API endpoints require the `x-admin-key` header.

Default key (development): `shinra-admin-secret-key`

Set a custom key via environment variable:

```
ADMIN_API_KEY=your-secret-key-here
```

The web dashboard will prompt for the API key on first visit and store it in localStorage.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | App statistics (users, games, uptime) |
| GET | `/api/admin/users?page=1&limit=20&search=` | Paginated user list |
| GET | `/api/admin/users/:id` | Single user detail + game history |
| POST | `/api/admin/maintenance` | Toggle maintenance mode |
| GET | `/api/admin/maintenance` | Get maintenance status |
| POST | `/api/admin/broadcast` | Send announcement to all connected users |
| POST | `/api/admin/serial-codes` | Create serial code |
| GET | `/api/admin/serial-codes` | List all serial codes |
| POST | `/api/admin/ban` | Ban a user |
| POST | `/api/admin/unban` | Unban a user |

## Database

The admin routes use existing tables (`users`, `rankings`, `game_results`, `serial_codes`).

The `banned_users` table is auto-created on first ban:

```sql
CREATE TABLE IF NOT EXISTS banned_users (
  user_id   UUID PRIMARY KEY REFERENCES users(id),
  reason    TEXT NOT NULL DEFAULT '',
  banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
