-- Add browser_id to posts for ownership tracking
-- This allows users to delete their own posts and admins to manage all posts

-- Add browser_id column to posts table
ALTER TABLE posts 
ADD COLUMN browser_id VARCHAR(64);

-- Create index for faster lookups by browser_id
CREATE INDEX idx_posts_browser_id ON posts(browser_id) WHERE is_removed = FALSE;

-- Add index for admin queries (all posts)
CREATE INDEX idx_posts_all ON posts(created_at DESC) WHERE is_removed = FALSE;

-- Add index for combined admin queries
CREATE INDEX idx_posts_admin_filter ON posts(is_removed, created_at DESC);
