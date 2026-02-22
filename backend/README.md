Backend developer notes

- The backend is split into isolated services under `backend/services/`:
	- `auth_service`: Supabase Auth token verification
	- `chat_service`: chat message operations with Supabase table
	- `org_service`: organization operations with Supabase table
- Run services locally:
	- `python backend/services/auth_service/app.py`
	- `python backend/services/chat_service/app.py`
	- `python backend/services/org_service/app.py`
- Build/run all services with Docker Compose from repository root.
