# Backend Documentation

This document outlines the backend architecture, services, database models, and API configurations for Vellune.

---

## 🛠️ Architecture Overview

The backend is a Node.js API built on **Express.js** and **TypeScript**, using **Drizzle ORM** for type-safe database queries.

```
backend/
├── src/
│   ├── db/                 # Schema definitions and database connection setup
│   │   ├── connection.ts   # Postgres connection handler
│   │   └── schema.ts       # Database relations, keys, indexes
│   ├── middlewares/        # Authentication and authorization guards
│   ├── routes/             # Route controllers (Express Router)
│   │   ├── auth.ts         # User signup/login
│   │   ├── books.ts        # Library book CRUD and progress
│   │   ├── circles.ts      # Reading circles, discussions, and spoiler filters
│   │   └── reviews.ts      # Public & custom reviews handler
│   ├── services/           # External API handlers (Google Books API, etc.)
│   └── index.ts            # Entrypoint
```

---

## 🔒 Security & Progressive Spoiler Filtering

### Progressive Redaction Middleware
To ensure users do not spoil their book club discussion, post results are filtered dynamically based on reading progression. The server verifies the member's current `currentPage` progress:
- Posts tagged with a page number higher than the member's progress are **redacted** at the JSON marshalling layer.
- Thread titles, author metadata, and reaction logs are hidden/zeroed.

---

## 🔌 API Route Reference

### Authentication (`/api/v1/auth`)
* `POST /register`: Registers a new user account.
* `POST /login`: Standard JWT login exchange.

### Books (`/api/v1/books`)
* `GET /`: Retrieve all books in library.
* `POST /`: Add new book to shelf.
* `PATCH /:id`: Update current page progress/status.

### Reading Circles (`/api/v1/circles`)
* `POST /`: Create circle (max 20 active).
* `GET /:id`: Fetch detailed circle membership and timeline.
* `POST /:id/posts`: Post spoiler-tagged comments (gates against progress).
