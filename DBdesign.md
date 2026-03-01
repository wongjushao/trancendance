Project LMS_Supabase {
  database_type: "PostgreSQL"
  Note: "Supabase 标准做法：auth.users 由 Supabase Auth 管理；业务表放 public schema，并启用 RLS。"
}

/* -------------------------
   Supabase Auth (示意表)
   实际由 Supabase 管理，你不用自己建。
------------------------- */
Table auth.users {
  id uuid [pk]
  email text
  created_at timestamptz
}

/* -------------------------
   Users / Profiles (public)
------------------------- */
Table public.profiles {
  id uuid [pk, not null, ref: > auth.users.id] // 与 auth.users.id 同一个 uuid
  birthday date
  invite_code text [unique]
  invited_by uuid [ref: > public.profiles.id]
  username text
  avatar_url text
  bio text
  timezone text
  language text
  social_links jsonb
  created_at timestamptz [default: `now()`]
}

/* API Keys */
Table public.api_keys {
  id bigint [pk, increment]
  user_id uuid [not null, ref: > public.profiles.id]
  key_hash text [not null]
  rate_limit_per_min int [default: 60]
  expires_at timestamptz
  last_used_at timestamptz
  created_at timestamptz [default: `now()`]
}

/* -------------------------
   Organizations / RBAC
------------------------- */
Table public.organizations {
  id bigint [pk, increment]
  name text [not null]
  description text
  created_by uuid [not null, ref: > public.profiles.id]
  created_at timestamptz [default: `now()`]
}

Table public.organization_members {
  id bigint [pk, increment]
  organization_id bigint [not null, ref: > public.organizations.id]
  user_id uuid [not null, ref: > public.profiles.id]
  member_role text [default: "member"] // 可选：member/admin/owner
  created_at timestamptz [default: `now()`]

  indexes {
    (organization_id, user_id) [unique]
  }
}

Table public.roles {
  id bigint [pk, increment]
  name text [not null]
  organization_id bigint [ref: > public.organizations.id]
}

Table public.permissions {
  id bigint [pk, increment]
  code text [not null, unique] // e.g. "course.create"
}

Table public.role_permissions {
  role_id bigint [not null, ref: > public.roles.id]
  permission_id bigint [not null, ref: > public.permissions.id]

  indexes {
    (role_id, permission_id) [unique]
  }
}

Table public.user_roles {
  user_id uuid [not null, ref: > public.profiles.id]
  role_id bigint [not null, ref: > public.roles.id]
  organization_id bigint [not null, ref: > public.organizations.id]

  indexes {
    (user_id, role_id, organization_id) [unique]
  }
}

/* -------------------------
   Courses / Learning
------------------------- */
Table public.courses {
  id bigint [pk, increment]
  organization_id bigint [not null, ref: > public.organizations.id]
  title text [not null]
  description text
  visibility text [default: "private"] // private/public/org
  created_by uuid [not null, ref: > public.profiles.id]
  created_at timestamptz [default: `now()`]
}

Table public.course_members {
  id bigint [pk, increment]
  course_id bigint [not null, ref: > public.courses.id]
  user_id uuid [not null, ref: > public.profiles.id]
  role text [default: "student"] // instructor/student

  indexes {
    (course_id, user_id) [unique]
  }
}

Table public.modules {
  id bigint [pk, increment]
  course_id bigint [not null, ref: > public.courses.id]
  title text [not null]
  order_index int
}

Table public.lessons {
  id bigint [pk, increment]
  module_id bigint [not null, ref: > public.modules.id]
  title text [not null]
  content_type text
  content_url text
  content_json jsonb
  order_index int
}

Table public.assignments {
  id bigint [pk, increment]
  course_id bigint [not null, ref: > public.courses.id]
  lesson_id bigint [ref: > public.lessons.id]
  title text [not null]
  description text
  due_at timestamptz
  created_at timestamptz [default: `now()`]
}

Table public.submissions {
  id bigint [pk, increment]
  assignment_id bigint [not null, ref: > public.assignments.id]
  user_id uuid [not null, ref: > public.profiles.id]
  content_url text
  text_content text
  grade int
  feedback text
  submitted_at timestamptz [default: `now()`]

  indexes {
    (assignment_id, user_id) [unique]
  }
}

/* -------------------------
   Social / Chat
------------------------- */
Table public.friendships {
  id bigint [pk, increment]
  requester_id uuid [not null, ref: > public.profiles.id]
  addressee_id uuid [not null, ref: > public.profiles.id]
  status text [default: "pending"] // pending/accepted/blocked
  created_at timestamptz [default: `now()`]

  indexes {
    (requester_id, addressee_id) [unique]
  }
}

Table public.chat_rooms {
  id bigint [pk, increment]
  type text [not null] // direct/group/course
  related_course_id bigint // 如果 type=course，可存 courses.id
  created_at timestamptz [default: `now()`]
}

Table public.chat_room_members {
  room_id bigint [not null, ref: > public.chat_rooms.id]
  user_id uuid [not null, ref: > public.profiles.id]
  joined_at timestamptz [default: `now()`]

  indexes {
    (room_id, user_id) [unique]
  }
}

Table public.messages {
  id bigint [pk, increment]
  room_id bigint [not null, ref: > public.chat_rooms.id]
  sender_id uuid [not null, ref: > public.profiles.id]
  content text
  message_type text [default: "text"]
  created_at timestamptz [default: `now()`]
}

/* -------------------------
   Notifications / Logs / GDPR / Audit
------------------------- */
Table public.notifications {
  id bigint [pk, increment]
  user_id uuid [not null, ref: > public.profiles.id]
  type text
  title text
  body text
  link text
  read_at timestamptz
  created_at timestamptz [default: `now()`]
}

Table public.user_activity_logs {
  id bigint [pk, increment]
  user_id uuid [not null, ref: > public.profiles.id]
  action text
  entity_type text
  entity_id bigint
  metadata jsonb
  created_at timestamptz [default: `now()`]
}

Table public.user_consents {
  id bigint [pk, increment]
  user_id uuid [not null, ref: > public.profiles.id]
  type text
  accepted_at timestamptz [default: `now()`]
}

Table public.data_exports {
  id bigint [pk, increment]
  user_id uuid [ref: > public.profiles.id]
  status text
  file_url text
  created_at timestamptz [default: `now()`]
}

Table public.audit_logs {
  id bigint [pk, increment]
  actor_id uuid [not null, ref: > public.profiles.id]
  action text
  entity_type text
  entity_id bigint
  ip_address inet
  created_at timestamptz [default: `now()`]
}