-- Auto-generated from SQLAlchemy models
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)

-- Add FK from profiles.id -> auth.users.id after table creation

CREATE TABLE public.chat_rooms (
	id BIGSERIAL NOT NULL, 
	type TEXT NOT NULL, 
	related_course_id BIGINT, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE public.permissions (
	id BIGSERIAL NOT NULL, 
	code TEXT NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_permissions_code UNIQUE (code)
);

CREATE TABLE public.profiles (
	id UUID NOT NULL, 
	birthday DATE, 
	invite_code TEXT, 
	invited_by UUID, 
	username TEXT, 
	avatar_url TEXT, 
	bio TEXT, 
	timezone TEXT, 
	language TEXT, 
	social_links JSONB, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (invite_code), 
	FOREIGN KEY(invited_by) REFERENCES public.profiles (id)
);

CREATE TABLE public.api_keys (
	id BIGSERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	key_hash TEXT NOT NULL, 
	rate_limit_per_min INTEGER DEFAULT 60 NOT NULL, 
	expires_at TIMESTAMP WITHOUT TIME ZONE, 
	last_used_at TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.audit_logs (
	id BIGSERIAL NOT NULL, 
	actor_id UUID NOT NULL, 
	action TEXT, 
	entity_type TEXT, 
	entity_id BIGINT, 
	ip_address INET, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.chat_room_members (
	room_id BIGINT NOT NULL, 
	user_id UUID NOT NULL, 
	joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	CONSTRAINT pk_chat_room_members PRIMARY KEY (room_id, user_id), 
	FOREIGN KEY(room_id) REFERENCES public.chat_rooms (id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.data_exports (
	id BIGSERIAL NOT NULL, 
	user_id UUID, 
	status TEXT, 
	file_url TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.friendships (
	id BIGSERIAL NOT NULL, 
	requester_id UUID NOT NULL, 
	addressee_id UUID NOT NULL, 
	status TEXT DEFAULT 'pending' NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_friendships_requester_addressee UNIQUE (requester_id, addressee_id), 
	FOREIGN KEY(requester_id) REFERENCES public.profiles (id), 
	FOREIGN KEY(addressee_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.messages (
	id BIGSERIAL NOT NULL, 
	room_id BIGINT NOT NULL, 
	sender_id UUID NOT NULL, 
	content TEXT, 
	message_type TEXT DEFAULT 'text' NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(room_id) REFERENCES public.chat_rooms (id), 
	FOREIGN KEY(sender_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.notifications (
	id BIGSERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	type TEXT, 
	title TEXT, 
	body TEXT, 
	link TEXT, 
	read_at TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.organizations (
	id BIGSERIAL NOT NULL, 
	name TEXT NOT NULL, 
	description TEXT, 
	created_by UUID NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by) REFERENCES public.profiles (id)
);

CREATE TABLE public.user_activity_logs (
	id BIGSERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	action TEXT, 
	entity_type TEXT, 
	entity_id BIGINT, 
	metadata JSONB, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.user_consents (
	id BIGSERIAL NOT NULL, 
	user_id UUID NOT NULL, 
	type TEXT, 
	accepted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.courses (
	id BIGSERIAL NOT NULL, 
	organization_id BIGINT NOT NULL, 
	title TEXT NOT NULL, 
	description TEXT, 
	visibility TEXT DEFAULT 'private' NOT NULL, 
	created_by UUID NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organization_id) REFERENCES public.organizations (id), 
	FOREIGN KEY(created_by) REFERENCES public.profiles (id)
);

CREATE TABLE public.organization_members (
	id BIGSERIAL NOT NULL, 
	organization_id BIGINT NOT NULL, 
	user_id UUID NOT NULL, 
	member_role TEXT DEFAULT 'member' NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_organization_members_org_user UNIQUE (organization_id, user_id), 
	FOREIGN KEY(organization_id) REFERENCES public.organizations (id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.roles (
	id BIGSERIAL NOT NULL, 
	name TEXT NOT NULL, 
	organization_id BIGINT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(organization_id) REFERENCES public.organizations (id)
);

CREATE TABLE public.course_members (
	id BIGSERIAL NOT NULL, 
	course_id BIGINT NOT NULL, 
	user_id UUID NOT NULL, 
	role TEXT DEFAULT 'student' NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_course_members_course_user UNIQUE (course_id, user_id), 
	FOREIGN KEY(course_id) REFERENCES public.courses (id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id)
);

CREATE TABLE public.modules (
	id BIGSERIAL NOT NULL, 
	course_id BIGINT NOT NULL, 
	title TEXT NOT NULL, 
	order_index INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(course_id) REFERENCES public.courses (id)
);

CREATE TABLE public.role_permissions (
	role_id BIGINT NOT NULL, 
	permission_id BIGINT NOT NULL, 
	CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id), 
	FOREIGN KEY(role_id) REFERENCES public.roles (id), 
	FOREIGN KEY(permission_id) REFERENCES public.permissions (id)
);

CREATE TABLE public.user_roles (
	user_id UUID NOT NULL, 
	role_id BIGINT NOT NULL, 
	organization_id BIGINT NOT NULL, 
	CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id, organization_id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id), 
	FOREIGN KEY(role_id) REFERENCES public.roles (id), 
	FOREIGN KEY(organization_id) REFERENCES public.organizations (id)
);

CREATE TABLE public.lessons (
	id BIGSERIAL NOT NULL, 
	module_id BIGINT NOT NULL, 
	title TEXT NOT NULL, 
	content_type TEXT, 
	content_url TEXT, 
	content_json JSONB, 
	order_index INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(module_id) REFERENCES public.modules (id)
);

CREATE TABLE public.assignments (
	id BIGSERIAL NOT NULL, 
	course_id BIGINT NOT NULL, 
	lesson_id BIGINT, 
	title TEXT NOT NULL, 
	description TEXT, 
	due_at TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(course_id) REFERENCES public.courses (id), 
	FOREIGN KEY(lesson_id) REFERENCES public.lessons (id)
);

CREATE TABLE public.submissions (
	id BIGSERIAL NOT NULL, 
	assignment_id BIGINT NOT NULL, 
	user_id UUID NOT NULL, 
	content_url TEXT, 
	text_content TEXT, 
	grade INTEGER, 
	feedback TEXT, 
	submitted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_submissions_assignment_user UNIQUE (assignment_id, user_id), 
	FOREIGN KEY(assignment_id) REFERENCES public.assignments (id), 
	FOREIGN KEY(user_id) REFERENCES public.profiles (id)
);

-- Link profiles to Supabase Auth (auth.users is managed by Supabase)
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_auth_users
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- Alembic version tracking
CREATE TABLE IF NOT EXISTS public.alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO public.alembic_version (version_num) VALUES ('20260225_0001');

CREATE TABLE public.user_blocks (
	id BIGSERIAL NOT NULL,
	blocker_id UUID NOT NULL,
	blocked_id UUID NOT NULL,
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT uq_user_blocks_blocker_blocked UNIQUE (blocker_id, blocked_id),
	FOREIGN KEY(blocker_id) REFERENCES public.profiles (id),
	FOREIGN KEY(blocked_id) REFERENCES public.profiles (id)
);
def downgrade():