# Anyit Software - Backend API

## Tech Stack
- **Node.js + Express** — REST API
- **MongoDB + Mongoose** — Database
- **JWT** — Authentication
- **Groq AI (llama3-8b-8192)** — AI features
- **Nodemailer** — Email OTP & credentials

---

## Quick Start

```bash
cd backend
npm install
cp .env.example .env   # Fill your values
npm run dev
```

## Seeded Demo Accounts

Create the complete two-year demo dataset with individual credentials for every account:

```bash
npm run seed:reset
```

This replaces the configured local database. The generated account credentials are:

| Category | Login identifier | Password |
|----------|------------------|----------|
| Admin | `admin@horizon.demo` | `Admin@2026` |
| Teacher 1 | `teacher1@horizon.demo` | `Teacher@001` |
| Teacher 2 | `teacher2@horizon.demo` | `Teacher@002` |
| Teacher 3 | `teacher3@horizon.demo` | `Teacher@003` |
| Teacher 4 | `teacher4@horizon.demo` | `Teacher@004` |
| Student 1 | `STU-DEMO-001` | `Student@001` |
| Student 2 | `STU-DEMO-002` | `Student@002` |
| Student 3 | `STU-DEMO-003` | `Student@003` |
| Student 4 | `STU-DEMO-004` | `Student@004` |
| Student 5 | `STU-DEMO-005` | `Student@005` |
| Student 6 | `STU-DEMO-006` | `Student@006` |
| Student 7 | `STU-DEMO-007` | `Student@007` |
| Student 8 | `STU-DEMO-008` | `Student@008` |
| Student 9 | `STU-DEMO-009` | `Student@009` |
| Student 10 | `STU-DEMO-010` | `Student@010` |
| Student 11 | `STU-DEMO-011` | `Student@011` |
| Student 12 | `STU-DEMO-012` | `Student@012` |
| Parent 1 | `parent1@horizon.demo` | `Parent@001` |
| Parent 2 | `parent2@horizon.demo` | `Parent@002` |
| Parent 3 | `parent3@horizon.demo` | `Parent@003` |
| Parent 4 | `parent4@horizon.demo` | `Parent@004` |

The seed script prints the same credential table after completion. These are development-only credentials.

## Database Data Sync

Export the current MongoDB data to the tracked JSON snapshot before committing:

```bash
npm run data:export
git add data/school-data.json
git commit -m "Update local database snapshot"
```

After pulling on another computer, configure its `.env` and import the snapshot:

```bash
npm install
npm run data:import
```

Import replaces all data in the configured local database. The snapshot contains account records, including password hashes, so keep the repository private and do not use this workflow for production data.

---

## API Routes Reference

### Auth `/api/auth`
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/school/signup` | School registers (Admin = School) |
| POST | `/school/verify-otp` | Verify OTP to activate school |
| POST | `/school/resend-otp` | Resend OTP |
| POST | `/admin/login` | Admin login |
| POST | `/teacher/login` | Teacher login |
| POST | `/student/login` | Student login (studentId + password) |
| POST | `/parent/login` | Parent login |
| POST | `/forgot-password` | Send reset OTP (body: email, role) |
| POST | `/reset-password` | Reset with OTP |
| POST | `/change-password` | Change password (logged in) |
| GET  | `/profile` | Get own profile |

### Admin `/api/admin` (schooladmin only)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/profile` | School profile |
| GET | `/stats` | School stats |
| POST | `/teachers` | Create teacher + email credentials |
| GET/PUT/DELETE | `/teachers/:id` | Manage teachers |
| PUT | `/teachers/:id/permissions` | Set teacher permissions |
| POST | `/students` | Create student + parent |
| GET/PUT/DELETE | `/students/:id` | Manage students |

### Teachers `/api/teachers` (teacher only)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/me` | Own profile |
| GET | `/my-students` | Students in my classes |
| POST | `/students` | Create student (if canCreateStudent) |
| GET | `/permissions` | My permissions |

### Attendance `/api/attendance`
| Method | Route | Access |
|--------|-------|--------|
| POST | `/mark` | Admin/Teacher (canMarkAttendance) |
| GET | `/` | Admin/Teacher (query: class, section, date) |
| GET | `/monthly` | Admin/Teacher |
| GET | `/today-absentees` | Admin/Teacher |
| GET | `/student/me` | Student |
| GET | `/student/:id` | Admin/Teacher/Parent |

### Fees `/api/fees`
| Method | Route | Access |
|--------|-------|--------|
| POST | `/structure` | Admin |
| GET | `/structure` | Admin/Teacher |
| POST | `/collect` | Admin/Teacher (canManageFees) |
| GET | `/all` | Admin/Teacher |
| GET | `/pending` | Admin/Teacher |
| GET | `/analytics` | Admin |
| GET | `/student/me` | Student/Parent |

### Exams `/api/exams`
| Method | Route | Access |
|--------|-------|--------|
| POST | `/` | Admin/Teacher (canCreateExam) |
| GET | `/upcoming` | All |
| POST | `/marks` | Admin/Teacher (canEnterMarks) |
| GET | `/results/me` | Student |
| GET | `/results/class/:examId` | Admin/Teacher |
| GET | `/report-card/me` | Student |

### AI Features `/api/ai` 🤖
| Method | Route | Access | Feature |
|--------|-------|--------|---------|
| POST | `/study-assistant` | Student/Teacher | Groq chatbot for doubts |
| POST | `/generate-quiz` | All | MCQ quiz generator |
| POST | `/summarize` | All | AI summary maker |
| POST | `/study-tips` | Student | Personalized tips |
| POST | `/lesson-plan` | Teacher/Admin | 5-day lesson plan |
| POST | `/report-card-comment` | Teacher/Admin | AI report comments |
| GET | `/class-health` | Teacher/Admin | Class health score |
| POST | `/generate-notice` | Admin/Teacher | AI notice writer |
| GET | `/risk-analysis` | Admin/Teacher | At-risk students |
| GET | `/fee-prediction` | Admin | Fee default predictor |
| GET | `/parent-summary/:id` | Admin/Teacher/Parent | Weekly parent report |

### Gamification `/api/gamification` 🎮
| Method | Route | Access | Feature |
|--------|-------|--------|---------|
| POST | `/badges` | Admin | Create badge |
| POST | `/badges/award` | Admin/Teacher | Award badge |
| GET | `/leaderboard` | All | Class leaderboard |
| GET | `/my-rank` | Student | My rank & points |
| GET | `/star-student` | Admin/Teacher | Auto star student |
| POST | `/challenges` | Teacher/Admin | Daily challenge |
| POST | `/challenges/:id/answer` | Student | Answer challenge |
| POST | `/mood` | Student | Mood check-in |
| GET | `/mood` | Student | Mood history |

### Other Routes
- `/api/notices` — Notice board (CRUD)
- `/api/homework` — Assign, submit, grade
- `/api/timetable` — Class timetable
- `/api/library` — Books, issue, return
- `/api/transport` — Bus routes
- `/api/events` — School events & calendar
- `/api/documents` — TC, ID card, Bonafide
- `/api/dashboard/admin` — Admin dashboard data
- `/api/dashboard/teacher` — Teacher dashboard
- `/api/dashboard/student` — Student dashboard

---

## Permission Keys (Teacher)
```json
{
  "canCreateStudent": false,
  "canEditStudent": false,
  "canDeleteStudent": false,
  "canViewAllStudents": false,
  "canMarkAttendance": false,
  "canViewAttendance": false,
  "canManageFees": false,
  "canViewFees": false,
  "canCreateExam": false,
  "canEnterMarks": false,
  "canViewExams": true,
  "canPostNotice": false,
  "canViewNotices": true,
  "canAssignHomework": false,
  "canViewHomework": true,
  "canManageLibrary": false,
  "canDailyChallenge": false,
  "canAwardBadges": false
}
```

## Gamification Points System
| Action | Points |
|--------|--------|
| Present in attendance | +2 |
| Submit homework on time | +3 |
| Submit homework late | +1 |
| Score 90%+ in exam | +20 |
| Score 75%+ in exam | +10 |
| Pay fee on time | +5 |
| Win daily challenge | +5 |
| 30-day attendance streak | +50 (badge) |
| Mood check-in | +1 |

## Badges Auto-Awarded
- **30-Day Streak** — 30 consecutive days present
- **Top Scorer** — 90%+ marks in any exam
