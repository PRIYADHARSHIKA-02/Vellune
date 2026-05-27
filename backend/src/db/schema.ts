import { pgTable, uuid, varchar, text, integer, decimal, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  password: varchar('password', { length: 255 }), // local password hash
  fullName: varchar('full_name', { length: 255 }),
  dob: varchar('dob', { length: 10 }), // YYYY-MM-DD
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  preferences: jsonb('preferences').default({}),
  readingGoalAnnual: integer('reading_goal_annual').default(12),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
});

// Custom Shelves Table
export const customShelves = pgTable('custom_shelves', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }), // Hex color
  icon: varchar('icon', { length: 50 }),
  isPublic: boolean('is_public').default(false),
  sortOrder: integer('sort_order'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Books Table
export const books = pgTable('books', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  isbn: varchar('isbn', { length: 13 }),
  coverUrl: text('cover_url'),
  pageCount: integer('page_count'),
  publishedDate: timestamp('published_date'),
  publisher: varchar('publisher', { length: 255 }),
  description: text('description'),
  genres: text('genres').array(),
  language: varchar('language', { length: 10 }).default('en'),
  status: varchar('status', { length: 20 }).notNull(), // 'to-read', 'reading', 'finished', 'dnf', 'on-hold'
  format: varchar('format', { length: 20 }).notNull(), // 'physical', 'ebook', 'audiobook', 'library'
  platform: varchar('platform', { length: 50 }),
  metadata: jsonb('metadata').default({}),
  currentPage: integer('current_page').default(0),
  progressPercentage: decimal('progress_percentage', { precision: 5, scale: 2 }).default('0.00'),
  dateAdded: timestamp('date_added', { withTimezone: true }).defaultNow(),
  dateStarted: timestamp('date_started', { withTimezone: true }),
  dateFinished: timestamp('date_finished', { withTimezone: true }),
  customShelfIds: uuid('custom_shelf_ids').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Reading Sessions Table
export const readingSessions = pgTable('reading_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  durationMinutes: integer('duration_minutes'),
  pagesStart: integer('pages_start'),
  pagesEnd: integer('pages_end'),
  pagesRead: integer('pages_read'),
  formatUsed: varchar('format_used', { length: 20 }),
  location: varchar('location', { length: 100 }),
  moodBefore: varchar('mood_before', { length: 50 }),
  moodAfter: varchar('mood_after', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Notes & Quotes Table
export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'note', 'quote', 'voice', 'bookmark', 'thought'
  content: text('content').notNull(),
  pageNumber: integer('page_number'),
  chapter: varchar('chapter', { length: 255 }),
  timestampInBook: integer('timestamp_in_book'), // in seconds (audiobook)
  tags: text('tags').array(),
  isFavorite: boolean('is_favorite').default(false),
  audioUrl: text('audio_url'),
  audioDurationSeconds: integer('audio_duration_seconds'),
  transcription: text('transcription'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Reading Circles (Groups) Table
export const readingCircles = pgTable('reading_circles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'set null' }),
  currentBookId: uuid('current_book_id').references(() => books.id, { onDelete: 'set null' }),
  isPrivate: boolean('is_private').default(true),
  inviteCode: varchar('invite_code', { length: 50 }).unique(),
  maxMembers: integer('max_members').default(10),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Circle Members Table
export const circleMembers = pgTable('circle_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').references(() => readingCircles.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).default('member').notNull(), // 'admin', 'moderator', 'member'
  currentProgress: integer('current_progress').default(0),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
});

// Discussion Threads Table
export const discussionThreads = pgTable('discussion_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  circleId: uuid('circle_id').references(() => readingCircles.id, { onDelete: 'cascade' }).notNull(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  spoilerLevel: integer('spoiler_level').default(0),
  chapter: varchar('chapter', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Discussion Posts Table
export const discussionPosts = pgTable('discussion_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').references(() => discussionThreads.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  parentPostId: uuid('parent_post_id'), // recursive references handled in relations
  reactions: jsonb('reactions').default({}), // {"like": 2, "insightful": 1}
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Book Recommendations Table
export const recommendations = pgTable('recommendations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  reason: text('reason'),
  matchScore: decimal('match_score', { precision: 3, scale: 2 }),
  moodTags: text('mood_tags').array(),
  timeTags: text('time_tags').array(),
  paceTags: text('pace_tags').array(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'accepted', 'rejected', 'expired'
  wasRead: boolean('was_read').default(false),
  userRating: integer('user_rating'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// Define ORM Relations
export const usersRelations = relations(users, ({ many }) => ({
  books: many(books),
  shelves: many(customShelves),
  sessions: many(readingSessions),
  notes: many(notes),
  memberships: many(circleMembers),
  circleCreator: many(readingCircles),
  threadCreator: many(discussionThreads),
  postCreator: many(discussionPosts),
  recommendations: many(recommendations),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  user: one(users, { fields: [books.userId], references: [users.id] }),
  sessions: many(readingSessions),
  notes: many(notes),
  circlesCurrent: many(readingCircles),
  threads: many(discussionThreads),
}));

export const readingSessionsRelations = relations(readingSessions, ({ one }) => ({
  user: one(users, { fields: [readingSessions.userId], references: [users.id] }),
  book: one(books, { fields: [readingSessions.bookId], references: [books.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, { fields: [notes.userId], references: [users.id] }),
  book: one(books, { fields: [notes.bookId], references: [books.id] }),
}));

export const readingCirclesRelations = relations(readingCircles, ({ one, many }) => ({
  creator: one(users, { fields: [readingCircles.creatorId], references: [users.id] }),
  currentBook: one(books, { fields: [readingCircles.currentBookId], references: [books.id] }),
  members: many(circleMembers),
  threads: many(discussionThreads),
}));

export const circleMembersRelations = relations(circleMembers, ({ one }) => ({
  circle: one(readingCircles, { fields: [circleMembers.circleId], references: [readingCircles.id] }),
  user: one(users, { fields: [circleMembers.userId], references: [users.id] }),
}));

export const discussionThreadsRelations = relations(discussionThreads, ({ one, many }) => ({
  circle: one(readingCircles, { fields: [discussionThreads.circleId], references: [readingCircles.id] }),
  book: one(books, { fields: [discussionThreads.bookId], references: [books.id] }),
  creator: one(users, { fields: [discussionThreads.creatorId], references: [users.id] }),
  posts: many(discussionPosts),
}));

export const discussionPostsRelations = relations(discussionPosts, ({ one, many }) => ({
  thread: one(discussionThreads, { fields: [discussionPosts.threadId], references: [discussionThreads.id] }),
  user: one(users, { fields: [discussionPosts.userId], references: [users.id] }),
  parentPost: one(discussionPosts, { fields: [discussionPosts.parentPostId], references: [discussionPosts.id], relationName: 'replies' }),
  replies: many(discussionPosts, { relationName: 'replies' }),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  user: one(users, { fields: [recommendations.userId], references: [users.id] }),
  book: one(books, { fields: [recommendations.bookId], references: [books.id] }),
}));
