// Use DBML to define your database structure
// Docs: https://dbml.dbdiagram.io/docs

//Users & Authentication

Table users {
  id integer [primary key]
  email varchar unique [not null]
  password_hash varchar
  username varchar
  avatar_url varchar
  bio varchar
  status varchar (active,suspended) [default: "active"]
  role varchar
  created_at timestamp
}

Table profiles {
  user_id integer [not null]
  timezone varchar
  languague varchar
  social_links_json varchar
}

Table oauth_accounts {
  id  integer [primary key]
  user_id integer [not null]
  provider varchar [not null]
  provider_user_id varchar [not null]
  access_token_ref text
  created_at timestamp
}

Table two_factor_method {
  id integer [primary key]
  user_id integer [not null]
  type varchar
  secret_enc text [not null]
  enabled bool [default: true]
}

Table api_key {
  id integer [primary key]
  user_id integer [not null]
  key_hash varchar [not null]
  rate_limit_per_min integer [default: 60]
  expires_at timestamp
  created_at timestamp
}

//Organizations, Roles, Permissions

Table organizations {
  id integer [primary key]
  name varchar
  description text
  created_by_user_id integer [not null]
  created_at timestamp
}

Table organizations_members {
  id integer [primary key]
  organization_id integer [not null]
  user_id integer [not null]
  role_label varchar
}

Table roles {
  id integer [primary key]
  name varchar [not null]
  organization_id integer
}

Table permissions {
  id integer [primary key]
  code varchar [unique, not null]
}

Table role_permissions {
  role_id integer [not null]
  permission_id integer [not null]
}

Table user_roles {
  user_id integer [not null]
  role_id integer [not null]
  organization_id integer [not null]
}

//Courses & Learning Content

Table courses {
  id integer [primary key]
  organization_id integer [not null]
  title varchar
  description text
  visibility varchar [default: "private"]
  created_by integer [not null]
  created_at timestamp
}

Table course_members {
  id integer [primary key]
  course_id integer [not null]
  user_id integer [not null]
  role varchar (instructor, student, teacher)
}

Table modules {
  id integer [primary key]
  course_id integer
  title varchar
  order_index integer
}

Table lessons {
  id integer [primary key]
  module_id int
  title varchar [not null]
  content_type varchar
  content_url text
  content_json text
  order_index integer
}

Table assigments {
  id integer [primary key]
  course_id integer [not null]
  lesson_id integer [not null]
  title varchar
  description text
  due_at  timestamp
}

Table submissions {
  id integer [primary key]
  assigment_id integer [not null]
  user_id integer [not null]
  content_url text
  text_content text
  grade integer
  feedback text
  submitted_at timestamp
}

//Social (Friends + Chat)

Table friendships {
  id integer [primary key]
  requester_id integer [not null]
  addressee_id integer [not null]
  status varchar
  created_at timestamp
}

Table chat_rooms {
  id integer [primary key]
  type varchar (direct, group, course)
  related_id integer
}

Table chat_room_members {
  room_id integer [not null]
  user_id integer [not null]
}

Table messages {
  id bigint [primary key]
  room_id integer
  sender_id integer
  content text
  message_type varchar
  created_at timestamp [not null]
}

//Notifications

Table notifications {
  id integer [primary key]
  user_id integer [not null]
  type varchar
  title varchar
  body text
  link text
  read_at timestamp
  created_at timestamp
}

//Activity & Analytics

Table user_activity_logs {
  id integer [primary key]
  user_id integer [not null]
  action varchar
  entity_type varchar
  entity_id integer
  metadata text
  created_at timestamp
}

//GDPR & Data Portability

Table user_consents {
  id integer [primary key]
  user_id integer [not null]
  type varchar
  accepted_at timestamp
}

Table data_exports {
  id integer [primary key]
  user_id integer 
  status varchar
  file_url text
  created_at timestamp
}

//Audit Logs (Security)

Table audit_logs {
  id integer [primary key]
  actor_id integer [not null]
  action varchar
  entity_type varchar
  entity_id integer
  ip_address inet6
  created_at timestamp
}

//Users & Authentication
Ref: profiles.user_id - users.id
Ref: oauth_accounts.user_id > users.id
Ref: two_factor_method.user_id - users.id
Ref: api_key.user_id - users.id

//Organizations, Roles, Permissions
Ref: organizations.created_by_user_id - users.id
Ref: organizations_members.organization_id - organizations.id
Ref: organizations_members.user_id < users.id
Ref: roles.organization_id - organizations.id
Ref: role_permissions.role_id - roles.id
Ref: role_permissions.permission_id - permissions.id
Ref: user_roles.user_id - users.id
Ref: user_roles.role_id - roles.id
Ref: user_roles.organization_id - organizations.id

//Courses & Learning Content
Ref: courses.organization_id - organizations.id
Ref: course_members.course_id - courses.id
Ref: course_members.user_id < users.id
Ref: modules.course_id > courses.id
Ref: lessons.module_id - modules.id
Ref: assigments.course_id - courses.id
Ref: assigments.lesson_id - lessons.id
Ref: submissions.assigment_id > assigments.id
Ref: submissions.user_id - users.id

//Social (Friends + Chat)
Ref: friendships.requester_id - users.id
Ref: friendships.addressee_id - users.id
Ref: messages.room_id - chat_rooms.id
Ref: messages.sender_id - users.id

//Notifications
Ref: notifications.user_id > users.id

//GDPR & Data Portability
Ref: user_consents.user_id - users.id
Ref: data_exports.user_id - users.id

//Audit Logs (Security)
Ref: audit_logs.actor_id - users.id