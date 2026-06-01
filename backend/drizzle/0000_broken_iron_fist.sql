CREATE TABLE IF NOT EXISTS "book_rating_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid,
	"isbn" varchar(13),
	"weighted_avg_score" numeric(3, 2) NOT NULL,
	"total_rating_count" integer NOT NULL,
	"positive_pct" integer DEFAULT 0 NOT NULL,
	"neutral_pct" integer DEFAULT 0 NOT NULL,
	"critical_pct" integer DEFAULT 0 NOT NULL,
	"rating_distribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_rating_aggregates_book_id_unique" UNIQUE("book_id"),
	CONSTRAINT "book_rating_aggregates_isbn_unique" UNIQUE("isbn")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"author" varchar(255) NOT NULL,
	"isbn" varchar(13),
	"cover_url" text,
	"page_count" integer,
	"published_date" timestamp,
	"publisher" varchar(255),
	"description" text,
	"genres" text[],
	"language" varchar(10) DEFAULT 'en',
	"status" varchar(20) NOT NULL,
	"format" varchar(20) NOT NULL,
	"platform" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"current_page" integer DEFAULT 0,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00',
	"date_added" timestamp with time zone DEFAULT now(),
	"date_started" timestamp with time zone,
	"date_finished" timestamp with time zone,
	"custom_shelf_ids" uuid[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "circle_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"invited_by_user_id" uuid NOT NULL,
	"invited_user_id" uuid,
	"invite_link_code" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "circle_invitations_invite_link_code_unique" UNIQUE("invite_link_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "circle_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"current_progress" integer DEFAULT 0,
	"joined_at" timestamp with time zone DEFAULT now(),
	"notification_preference" varchar(50) DEFAULT 'daily' NOT NULL,
	"mute_until_chapter" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_shelves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7),
	"icon" varchar(50),
	"is_public" boolean DEFAULT false,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discussion_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"parent_post_id" uuid,
	"reactions" jsonb DEFAULT '{}'::jsonb,
	"chapter_tag" varchar(100),
	"page_reference" integer,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edit_window_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discussion_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"book_id" uuid,
	"creator_id" uuid,
	"title" varchar(255) NOT NULL,
	"spoiler_level" integer DEFAULT 0,
	"chapter" varchar(100),
	"chapter_tag" varchar(100),
	"spoiler_level_page" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "external_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid,
	"isbn" varchar(13),
	"source" varchar(50) NOT NULL,
	"excerpt" text NOT NULL,
	"full_text" text,
	"star_rating" numeric(3, 2),
	"reviewer_type" varchar(20) NOT NULL,
	"helpful_votes" integer,
	"source_url" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"page_number" integer,
	"chapter" varchar(255),
	"timestamp_in_book" integer,
	"tags" text[],
	"is_favorite" boolean DEFAULT false,
	"audio_url" text,
	"audio_duration_seconds" integer,
	"transcription" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reading_circles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"creator_id" uuid,
	"current_book_id" uuid,
	"type" varchar(50) DEFAULT 'same_book' NOT NULL,
	"is_private" boolean DEFAULT true,
	"invite_code" varchar(50),
	"max_members" integer DEFAULT 10,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "reading_circles_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reading_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"duration_minutes" integer,
	"pages_start" integer,
	"pages_end" integer,
	"pages_read" integer,
	"format_used" varchar(20),
	"location" varchar(100),
	"mood_before" varchar(50),
	"mood_after" varchar(50),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"reason" text,
	"match_score" numeric(3, 2),
	"mood_tags" text[],
	"time_tags" text[],
	"pace_tags" text[],
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"was_read" boolean DEFAULT false,
	"user_rating" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_book_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"star_rating" numeric(2, 1) NOT NULL,
	"mood_tags" text[] DEFAULT  NOT NULL,
	"recommend" varchar(10),
	"review_text" text,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_book_reviews_user_id_book_id_unique" UNIQUE("user_id","book_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"password" varchar(255),
	"full_name" varchar(255),
	"dob" varchar(10),
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"reading_goal_annual" integer DEFAULT 12,
	"timezone" varchar(50) DEFAULT 'UTC',
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "book_rating_aggregates" ADD CONSTRAINT "book_rating_aggregates_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "books" ADD CONSTRAINT "books_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "circle_invitations" ADD CONSTRAINT "circle_invitations_circle_id_reading_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "reading_circles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "circle_invitations" ADD CONSTRAINT "circle_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "circle_invitations" ADD CONSTRAINT "circle_invitations_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_circle_id_reading_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "reading_circles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_shelves" ADD CONSTRAINT "custom_shelves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "discussion_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_circle_id_reading_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "reading_circles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "external_reviews" ADD CONSTRAINT "external_reviews_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reading_circles" ADD CONSTRAINT "reading_circles_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reading_circles" ADD CONSTRAINT "reading_circles_current_book_id_books_id_fk" FOREIGN KEY ("current_book_id") REFERENCES "books"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_book_reviews" ADD CONSTRAINT "user_book_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_book_reviews" ADD CONSTRAINT "user_book_reviews_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
