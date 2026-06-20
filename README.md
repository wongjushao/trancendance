*This project has been created as part of the 42 curriculum by wjun-kea, jyap, aaissa, leotan*

## Description

**Educatorio** is a web app for schools and training teams that want one place to run courses, track learners, and stay in touch.

**Goal:** make it easier for an organization to offer courses, enroll people, run classes (including assignments and submissions), and communicate without juggling many separate tools.

**What it includes (in plain words):**

- User accounts, profiles, and onboarding  
- **Organizations** (create or join a school-like space, invites, members, basic admin)  
- **Courses** with offerings, schedules, enrollment, and a learner-facing area  
- **Assignments** and **submissions**, plus **reviews** where teachers give feedback  
- **Messages** and **chat** (including rooms and course-related chat)  
- **dashboard**, and **analytics** views where they exist in the app  
- **Settings** for preferences and account-related options  

## Instructions

**What you need on your machine**

- **Linux** (or WSL2 on Windows) is what the team used day to day  
- **Docker** (Compose v2) so all services start the same way for everyone  
- **Make** (the `Makefile` shortcuts call Docker for you)  
- **OpenSSL** (used when generating local HTTPS certificates for the proxy)  
- A **`.env`** file at the project root with the values your team uses (database URL, Supabase keys, Grafana login if you use it, and any other secrets your `docker-compose` expects)

**Before the first run**

1. Copy or create `.env` and fill in the missing values
2. run:

```bash
make start-server
```

On **WSL2**, if the host metrics service causes trouble, you can use:

```bash
make start-server-wsl2
```

**Useful commands**

- `make down` — stop the stack  
- `make logs` — follow container logs  
- `make migrate-up` / `make migrate-down` — apply or step back one database migration (needs a valid `SUPABASE_DB_URL` line in `.env`)

**After it is up**

- Open the app in the browser at the URL your team agreed on (often `https://localhost` when using the local proxy).

If anything fails, read the error in `make logs` first usually it is a missing env value or Docker not running.

## Resources

**Learning and product ideas**

- General ideas behind learning platforms and course workflows (search for “LMS overview” or “course lifecycle”)  
- [Next.js documentation](https://nextjs.org/docs) — how the website part is built  
- [Flask documentation](https://flask.palletsprojects.com/) — how the small backend services are built  
- [Supabase documentation](https://supabase.com/docs) — sign-in and hosted Postgres used by the project  
- [Docker Compose documentation](https://docs.docker.com/compose/) — how the whole stack is started together  

**How AI was used (example wording adjust to match what your team actually did)**

- **Brainstorming and wording:** help turning rough notes into clearer README sections and shorter explanations for reviewers.  
- **Code assistance:** suggestions while building UI pages, API wiring, and debugging; final choices and integration were always reviewed by humans on the team.  
- **Not a replacement for understanding:** teammates were expected to read, test, and own every part they shipped.

Each person should briefly note in the evaluation if AI helped on their parts and how.

## Team Information

**Wong Jun Keat** — Product owner and project manager  
Leads product direction and priorities, and owns a large share of the backend (including database design), service logic, security-minded choices, and deployment (Docker/Make).

**Jien Fei Yap** — Tech lead and developer  
Designs and builds the main website, connects it to the backend APIs, and shapes the overall UI/UX, including organization-related flows.

**Abdelbaki Aissa** — Developer  
Owns the chat side of the product end to end, and works with others on bugs, database issues, and connection problems around messaging.

**Tan Jek Leon** — Developer  
Helps across tasks, keeps progress visible (for example on Trello), does frontend testing and browser checks, and maintains written documentation.

## Project Management

**How we organized work**

- Split work by area (frontend, backend services, chat, DevOps, QA) and by feature (courses, orgs, assignments, etc.).  
- Short, regular syncs to unblock each other and adjust scope.  
- Pull requests and code review so changes are seen by at least one other person before merging.

**Tools**

- **GitHub** for code, branches, and issues (or pull requests) as the source of truth.  
- **Trello** for a simple board: backlog, in progress, done.  
- **Discord** for quick questions and voice when pair debugging helped.

## Technical Stack

**Website (frontend)**  
Built with **Next.js** and **React** so pages load quickly and the app can grow. Styling and components use common modern UI libraries (for example Radix-style primitives) for accessible controls.

**Backend**  
Several **Python** services using **Flask**, each with a focused job (sign-in/profile sync, chat, organizations, notifications). They talk to the same database and are run with a production-style server (**Gunicorn**) inside Docker.

**Database and sign-in**  
**Supabase** handles user sign-in; **Postgres** stores app data. The team uses migrations so the schema can evolve safely.

**Running everything**  
**Docker Compose** starts the frontend, backend services, proxy, and optional monitoring (Prometheus/Grafana) with one command.

**Why this shape**  
Small separate services keep responsibilities clear; Next.js gives a smooth user experience; Supabase reduces the work of building auth from scratch; Docker makes onboarding and demos repeatable for graders and teammates.

## Database Schema

The database is one **Postgres** database with tables grouped by theme. You do not need every column name to understand the shape:

- **People and access:** profiles, optional API keys, roles and permissions, activity and audit-style logs where used  
- **Organizations:** organizations, domains, members, invitations, verification requests  
- **Teaching:** courses, course members, modules (course units), classes, lessons, schedules, class members, prerequisites, certificates  
- **Work and feedback:** assignments, submissions, course reviews, lesson progress  
- **Social and communication:** friendships, user blocks, chat rooms and members, messages, admin messages  
- **Skills and profile extras:** skills, user skills, education entries on a profile  
- **Notifications and privacy:** notifications, notification preferences, MFA records, consent and data export records  

Relationships follow the usual pattern: organizations own courses and members; courses link to classes and assignments; submissions link to assignments and users; chat and messages link to rooms and profiles. For an exact picture, open `backend/common/models/entities.py` or the latest migration files under `backend/migrations/`.

## Features List

| Feature (user-visible) | What it does | Main owners (from team roles) |
|------------------------|--------------|-------------------------------|
| Sign up / sign in / profile | Users can authenticate and maintain a profile | Whole team; backend lead on auth data |
| Onboarding | First-time flow so users can start using the app | Frontend lead with backend support |
| Organizations | Create, join, verify orgs; members and invites | Frontend lead; backend lead for rules and data |
| Courses | List, create, edit courses; course home and learn area | Frontend + backend |
| Offerings & schedules | Run a course in a term-like offering with schedules | Frontend + backend |
| Enrollment | Join or manage who is in an offering | Frontend + backend |
| Assignments & submissions | Set work, hand in work, list submissions | Frontend + backend |
| Reviews | Teacher-style feedback on courses or work where implemented | Frontend + backend |
| Messages | Direct-style messaging between users | Chat developer + frontend |
| Chat rooms & course chat | Group chat spaces | Chat developer |
| Dashboard & analytics | High-level views where implemented | Frontend + backend |
| Settings | Preferences, security-related options, etc. | Frontend + backend |
| Monitoring (optional) | Metrics dashboards for operators | DevOps / backend lead |

This table is a guide for reviewers; adjust names if your internal split was slightly different.

## Modules

This section is for **42 curriculum modules** (the graded “modules” of the subject), not the word “module” inside a course in the app.

The rows below follow the module list we registered against (see `Modules.txt` in the repo). **Minor “frontend-only” / “backend-only” framework modules** are not listed separately because the **major “framework for both frontend and backend”** already covers **Next.js (React) + Flask microservices**.

| Module (as in project brief) | Major or minor | Points (Major = 2, Minor = 1) | Why it fits this project | How we showed it | Who was most involved |
|------------------------------|----------------|--------------------------------|---------------------------|------------------|------------------------|
| Use a framework for **both** frontend and backend (full-stack counts as both when used that way) | Major | 2 | The app is a browser product with a structured UI and server-side APIs | **Next.js** (React) for the site; **Flask** (Python) services behind it; **Docker Compose** to run the stack | Whole team |
| Backend as **microservices** | Major | 2 | Several small services instead of one monolith | **auth-service**, **chat-service**, **org-service**, **notification-service** each with a focused role; HTTP between browser/proxy and services | Wong Jun Keat; others per feature |
| **Real-time** features (WebSockets or similar) | Major | 2 | Live updates for messaging and presence-style behaviour | **Flask-SocketIO** in the chat service; client socket usage via `frontend/hooks/useSocket.ts` and the messages UI | Abdelbaki Aissa; Jien Fei Yap for UI |
| **WAF / ModSecurity (hardened)** + **secrets management** (brief: HashiCorp Vault) | Major | 2 | Edge hardening and no secrets baked into images | **`waf/`** image based on **OWASP ModSecurity CRS** (nginx); services load config via **Infisical** at runtime—**confirm with evaluators** if your campus requires the literal **HashiCorp Vault** product vs an approved equivalent | Wong Jun Keat |
| **Monitoring** with **Prometheus** and **Grafana** | Major | 2 | Operators can inspect health and metrics | **Prometheus** + **Grafana** services in **Docker Compose**; scrape config and secured Grafana entry as set up for the project | Wong Jun Keat |
| **User interaction** (chat, profiles, friends) | Major | 2 | People can find each other and communicate | Messages, chat rooms, profiles, friendships, blocks—as reflected in the schema and app areas | Abdelbaki Aissa; whole team for profiles/friends |
| **Standard user management and authentication** | Major | 2 | Accounts, profiles, avatars, friends, online-style presence | **Supabase Auth** integrated with the app; profile and settings flows; avatar handling | Whole team; Wong Jun Keat on auth data |
| **Organization** system | Major | 2 | Schools/teams as first-class spaces | Create/edit orgs, members, invites, verification-style flows in the org area | Jien Fei Yap; Wong Jun Keat |
| **Advanced permissions** (user CRUD, roles, role-based behaviour) | Major | 2 | Not everyone sees or does the same thing | Roles, permissions, and audit-style tables in **Postgres**; enforced in services and UI where implemented | Wong Jun Keat; Jien Fei Yap |
| **Custom design system** (≥10 reusable components, palette, typography, icons) | Minor | 1 | Consistent look and accessible controls | Shared UI primitives and patterns (e.g. Radix-style building blocks), tokens, and repeated components across main layouts | Jien Fei Yap |
| **Additional browsers** (≥2 beyond baseline; test and document) | Minor | 1 | Grading and real users do not all use one browser | Manual passes on **Firefox**, **Safari**, **Edge**, etc., with issues filed and fixes merged where needed | Tan Jek Leon |
| **Advanced chat** (block, invites/notifications hooks, profiles from chat, history, typing/read receipts as applicable) | Minor | 1 | Chat goes beyond send/receive only | Blocks, room history, typing/read behaviour, and links out to profiles—where the product implements each bullet | Abdelbaki Aissa |
| **Two-factor authentication (2FA)** | Minor | 1 | Stronger account security | MFA flows and storage (see auth/MFA-related UI and DB areas) | Wong Jun Keat; frontend in settings/auth |
| **Remote authentication (OAuth 2.0)** | Minor | 1 | Sign-in with external providers | **Supabase** `signInWithOAuth` (e.g. Google) and callback handling in the Next.js app | Wong Jun Keat |
| **ORM** for the database | Minor | 1 | Safer, maintainable data access | **SQLAlchemy** (and related patterns) in Python services | Wong Jun Keat; service owners |

**Total points (this table):** 9×2 + 6×1 = **24**



## Individual Contributions

**Wong Jun Keat**  
Product direction, backend services and database design, security-sensitive flows, Docker/Make workflow, migrations, and helping others debug server-side issues.

**Jien Fei Yap**  
Main Next.js application structure, pages and components, API integration, UX for organizations and courses, and keeping the frontend consistent.

**Abdelbaki Aissa**  
Chat service, sockets and related APIs, message flows, and cross-team fixes for anything touching chat or live updates.

**Tan Jek Leon**  
Cross-cutting support, QA-style passes on the website, compatibility checks, documentation (including this README’s structure), and keeping task boards up to date.

**Challenges (short)**  
Typical difficulties were aligning four services with one database, getting real-time chat stable for everyone, and keeping env secrets safe while still easy for teammates solved with clear `.env` examples, code review, and testing on Linux/WSL before demos.
