-- Initial Schema for Anonymous Rating App
-- Run this migration first to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- POSTS Table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('rate', 'poll', 'wyr', 'rank')),
    caption VARCHAR(120),
    attributes JSONB,
    vote_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    report_count INTEGER DEFAULT 0,
    is_removed BOOLEAN DEFAULT FALSE,
    creator_token VARCHAR(64)
);

-- Indexes for posts
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_expires_at ON posts(expires_at) WHERE is_removed = FALSE;
CREATE INDEX idx_posts_vote_count ON posts(vote_count DESC);
CREATE INDEX idx_posts_not_removed ON posts(is_removed) WHERE is_removed = FALSE;

-- ITEMS Table
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    name VARCHAR(50),
    image_url TEXT NOT NULL,
    image_key VARCHAR(255),
    order_index INTEGER NOT NULL,
    vote_count INTEGER DEFAULT 0,
    total_score DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_items_post_id ON items(post_id);

-- VOTES Table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    ip_hash VARCHAR(64) NOT NULL,
    browser_id VARCHAR(64),
    ratings JSONB,
    ranking JSONB,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate votes
CREATE UNIQUE INDEX idx_votes_unique ON votes(post_id, ip_hash);
CREATE INDEX idx_votes_post_id ON votes(post_id);
CREATE INDEX idx_votes_created_at ON votes(created_at DESC);

-- VOTE_LOCKS Table (Fast duplicate check)
CREATE TABLE vote_locks (
    ip_hash VARCHAR(64) NOT NULL,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (post_id, ip_hash)
);

CREATE INDEX idx_vote_locks ON vote_locks(post_id, ip_hash);

-- REPORTS Table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reason VARCHAR(20) NOT NULL CHECK (reason IN ('harassment', 'explicit', 'hate', 'spam', 'other')),
    ip_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_post_id ON reports(post_id);

-- COMMENTS Table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_removed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id, created_at DESC);

-- Function to auto-hide posts with many reports
CREATE OR REPLACE FUNCTION check_and_hide_post()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts 
    SET is_removed = TRUE 
    WHERE id = NEW.post_id AND report_count >= 10;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-hiding posts
CREATE TRIGGER trigger_check_reports
AFTER INSERT ON reports
FOR EACH ROW
EXECUTE FUNCTION check_and_hide_post();
