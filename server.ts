import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { execute, getDb, query, queryOne, saveDb } from './src/db/db.js';
import { seedDatabase } from './src/db/seed.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'mosaic-editorial-super-secret-key-2026';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  avatar_url?: string;
  bio?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Token helper
function generateToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Authentication middleware
function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.cookies?.token;

  if (!token) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (err || !decoded) {
      res.status(401).json({ error: 'Session expired. Please sign in again.' });
      return;
    }
    const user = await queryOne<AuthUser>(
      'SELECT id, name, username, email, role, avatar_url, bio FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }
    req.user = user;
    next();
  });
}

// Optional authentication middleware (populates req.user if token present)
function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.cookies?.token;

  if (!token) {
    next();
    return;
  }

  jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
    if (!err && decoded?.id) {
      const user = await queryOne<AuthUser>(
        'SELECT id, name, username, email, role, avatar_url, bio FROM users WHERE id = ?',
        [decoded.id]
      );
      if (user) req.user = user;
    }
    next();
  });
}

// Admin authorization middleware
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Administrator access required.' });
      return;
    }
    next();
  });
}

async function startServer() {
  // Ensure DB is initialized and seeded
  await getDb();
  await seedDatabase(false);

  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // -------------------------------------------------------------
  // API ROUTER: MOUNTED STRICTLY AT /api
  // -------------------------------------------------------------
  const apiRouter = express.Router();

  // -------------------------------------------------------------
  // 1. AUTHENTICATION ROUTES (/api/auth)
  // -------------------------------------------------------------
  const authRouter = express.Router();

  // POST /api/auth/login
  authRouter.post('/login', async (req: Request, res: Response) => {
    try {
      const { identifier, username, email, password } = req.body;
      const loginId = (identifier || username || email || '').trim();

      if (!loginId || !password) {
        res.status(400).json({ error: 'Please provide email or username and password.' });
        return;
      }

      // Search user by email OR username
      const user = await queryOne<any>(
        'SELECT * FROM users WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE',
        [loginId, loginId]
      );

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }

      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        bio: user.bio,
      };

      const token = generateToken(authUser);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        message: 'Successfully signed in.',
        user: authUser,
        token,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
    }
  });

  // POST /api/auth/register
  authRouter.post('/register', async (req: Request, res: Response) => {
    try {
      const { name, username, email, password, avatar_url, bio } = req.body;

      if (!name || !username || !email || !password) {
        res.status(400).json({ error: 'Please fill in all required fields.' });
        return;
      }

      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      const cleanEmail = email.trim().toLowerCase();

      if (cleanUsername.length < 3) {
        res.status(400).json({ error: 'Username must be at least 3 characters.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }

      // Check duplicate email or username
      const existing = await queryOne(
        'SELECT id, username, email FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE',
        [cleanUsername, cleanEmail]
      );

      if (existing) {
        if (existing.username.toLowerCase() === cleanUsername) {
          res.status(409).json({ error: 'This username is already taken. Please choose another.' });
          return;
        }
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }

      const password_hash = await bcrypt.hash(password, 10);
      const defaultAvatar = avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`;

      const result = await execute(
        `INSERT INTO users (name, username, email, password_hash, avatar_url, bio, role)
         VALUES (?, ?, ?, ?, ?, ?, 'creator')`,
        [name.trim(), cleanUsername, cleanEmail, password_hash, defaultAvatar, bio || '']
      );

      const authUser: AuthUser = {
        id: result.lastInsertRowid,
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        role: 'creator',
        avatar_url: defaultAvatar,
        bio: bio || '',
      };

      const token = generateToken(authUser);

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        message: 'Account created successfully.',
        user: authUser,
        token,
      });
    } catch (err: any) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Unable to create account. Please try again.' });
    }
  });

  // GET /api/auth/me
  authRouter.get('/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.cookies?.token;

      if (!token) {
        res.status(200).json({ user: null });
        return;
      }

      jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
        if (err || !decoded?.id) {
          res.status(200).json({ user: null });
          return;
        }

        const user = await queryOne<AuthUser>(
          'SELECT id, name, username, email, role, avatar_url, bio FROM users WHERE id = ?',
          [decoded.id]
        );

        if (!user) {
          res.status(200).json({ user: null });
          return;
        }

        res.status(200).json({ user });
      });
    } catch (err: any) {
      console.error('Auth me error:', err);
      res.status(500).json({ error: 'Server error retrieving user.' });
    }
  });

  // POST /api/auth/logout
  authRouter.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Signed out successfully.' });
  });

  // POST /api/auth/forgot-password
  authRouter.post('/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Please provide an email address.' });
        return;
      }

      const user = await queryOne<{ id: number; email: string }>(
        'SELECT id, email FROM users WHERE email = ? COLLATE NOCASE',
        [email.trim()]
      );

      if (!user) {
        // Safe message without exposing existence
        res.status(200).json({
          message: 'If an account exists with this email, reset instructions have been generated.',
        });
        return;
      }

      const resetToken = 'rst_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await execute(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, resetToken, expiresAt]
      );

      res.status(200).json({
        message: 'Password reset token generated.',
        devToken: resetToken,
        isDevMode: true,
      });
    } catch (err: any) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Unable to process password reset.' });
    }
  });

  // POST /api/auth/reset-password
  authRouter.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword || newPassword.length < 6) {
        res.status(400).json({ error: 'Valid token and password (min 6 chars) required.' });
        return;
      }

      const resetRecord = await queryOne<{ id: number; user_id: number; expires_at: string; used_at: string | null }>(
        'SELECT * FROM password_reset_tokens WHERE token = ?',
        [token]
      );

      if (!resetRecord || resetRecord.used_at) {
        res.status(400).json({ error: 'This password reset link is invalid or has already been used.' });
        return;
      }

      if (new Date(resetRecord.expires_at).getTime() < Date.now()) {
        res.status(400).json({ error: 'This password reset link has expired. Please request a new one.' });
        return;
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, resetRecord.user_id]);
      await execute('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [resetRecord.id]);

      res.status(200).json({ message: 'Password has been successfully reset. You may now sign in.' });
    } catch (err: any) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  });

  // GET /api/auth/demo-users (For Fast Evaluation Accounts)
  authRouter.get('/demo-users', async (_req: Request, res: Response) => {
    try {
      const demoUsers = await query<any>(
        'SELECT id, name, username, email, role, avatar_url, bio FROM users ORDER BY id ASC LIMIT 8'
      );
      res.status(200).json({ demoUsers, defaultPassword: 'password123' });
    } catch (err: any) {
      res.status(500).json({ error: 'Could not load demo accounts.' });
    }
  });

  apiRouter.use('/auth', authRouter);

  // -------------------------------------------------------------
  // 2. CATEGORIES ROUTES (/api/categories)
  // -------------------------------------------------------------
  apiRouter.get('/categories', async (_req: Request, res: Response) => {
    try {
      const categories = await query<any>(`
        SELECT c.*, COUNT(s.id) as stories_count 
        FROM categories c
        LEFT JOIN stories s ON s.category_id = c.id AND s.status = 'published'
        GROUP BY c.id
        ORDER BY c.id ASC
      `);
      res.status(200).json({ categories });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load categories.' });
    }
  });

  // -------------------------------------------------------------
  // 3. STORIES ROUTES (/api/stories)
  // -------------------------------------------------------------
  const storiesRouter = express.Router();

  // GET /api/stories
  storiesRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
      const offset = (page - 1) * limit;

      const categoryFilter = (req.query.category as string || '').trim();
      const searchQuery = (req.query.search as string || '').trim();
      const sort = (req.query.sort as string || 'latest').toLowerCase();
      const authorId = req.query.authorId ? parseInt(req.query.authorId as string, 10) : null;
      const status = req.query.status || 'published';

      let whereConditions: string[] = ['s.status = ?'];
      let queryParams: any[] = [status];

      // Normalized category filtering (case-insensitive, ignores 'all')
      if (categoryFilter && categoryFilter.toLowerCase() !== 'all') {
        whereConditions.push('(LOWER(c.name) = LOWER(?) OR LOWER(c.slug) = LOWER(?))');
        queryParams.push(categoryFilter, categoryFilter);
      }

      if (searchQuery) {
        whereConditions.push(`(
          s.title LIKE ? OR 
          s.subtitle LIKE ? OR 
          s.content LIKE ? OR 
          u.name LIKE ? OR 
          u.username LIKE ? OR
          c.name LIKE ?
        )`);
        const searchPattern = `%${searchQuery}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (authorId) {
        whereConditions.push('s.author_id = ?');
        queryParams.push(authorId);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Sorting
      let orderBy = 's.created_at DESC';
      if (sort === 'trending') {
        // Trending score: views + reactions*3 + comments*4, with recency
        orderBy = '(s.views_count + (SELECT COUNT(*) FROM reactions r WHERE r.story_id = s.id)*3 + (SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id)*4) DESC, s.created_at DESC';
      } else if (sort === 'views') {
        orderBy = 's.views_count DESC';
      } else if (sort === 'discussed') {
        orderBy = '(SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id) DESC';
      } else if (sort === 'oldest') {
        orderBy = 's.created_at ASC';
      }

      // Count query
      const countSql = `
        SELECT COUNT(DISTINCT s.id) as total 
        FROM stories s
        JOIN categories c ON c.id = s.category_id
        JOIN users u ON u.id = s.author_id
        ${whereClause}
      `;
      const countResult = await query<{ total: number }>(countSql, queryParams);
      const total = countResult[0]?.total || 0;

      // Select stories with full relational joins
      const storiesSql = `
        SELECT 
          s.id, s.title, s.subtitle, s.slug, s.cover_image, s.reading_time_minutes,
          s.tile_size, s.status, s.views_count, s.created_at, s.updated_at,
          SUBSTR(s.content, 1, 280) as excerpt,
          c.id as category_id, c.name as category_name, c.slug as category_slug, c.color as category_color,
          u.id as author_id, u.name as author_name, u.username as author_username, u.avatar_url as author_avatar, u.bio as author_bio,
          (SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id) as comments_count,
          (SELECT COUNT(*) FROM reactions r WHERE r.story_id = s.id) as reactions_count,
          (SELECT COUNT(*) FROM bookmarks b WHERE b.story_id = s.id) as bookmarks_count
        FROM stories s
        JOIN categories c ON c.id = s.category_id
        JOIN users u ON u.id = s.author_id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      const rows = await query<any>(storiesSql, [...queryParams, limit, offset]);

      // If user is authenticated, attach user-specific reaction and bookmark flags
      const currentUserId = req.user?.id;
      let userReactionsMap: Record<number, string> = {};
      let userBookmarksMap: Record<number, boolean> = {};

      if (currentUserId && rows.length > 0) {
        const storyIds = rows.map((r: any) => r.id).join(',');
        const userReactions = await query<any>(
          `SELECT story_id, type FROM reactions WHERE user_id = ? AND story_id IN (${storyIds})`,
          [currentUserId]
        );
        for (const ur of userReactions) {
          userReactionsMap[ur.story_id] = ur.type;
        }

        const userBookmarks = await query<any>(
          `SELECT story_id FROM bookmarks WHERE user_id = ? AND story_id IN (${storyIds})`,
          [currentUserId]
        );
        for (const ub of userBookmarks) {
          userBookmarksMap[ub.story_id] = true;
        }
      }

      const formattedStories = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        slug: r.slug,
        cover_image: r.cover_image,
        reading_time_minutes: r.reading_time_minutes,
        tile_size: r.tile_size,
        status: r.status,
        views_count: r.views_count,
        created_at: r.created_at,
        updated_at: r.updated_at,
        excerpt: r.excerpt,
        category: {
          id: r.category_id,
          name: r.category_name,
          slug: r.category_slug,
          color: r.category_color,
        },
        author: {
          id: r.author_id,
          name: r.author_name,
          username: r.author_username,
          avatar_url: r.author_avatar,
          bio: r.author_bio,
        },
        stats: {
          comments: r.comments_count,
          reactions: r.reactions_count,
          bookmarks: r.bookmarks_count,
        },
        userReaction: userReactionsMap[r.id] || null,
        isBookmarked: !!userBookmarksMap[r.id],
      }));

      res.status(200).json({
        stories: formattedStories,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      console.error('Get stories error:', err);
      res.status(500).json({ error: 'Unable to load stories. Please try again.' });
    }
  });

  // GET /api/stories/trending
  storiesRouter.get('/trending', async (_req: Request, res: Response) => {
    try {
      const sql = `
        SELECT 
          s.id, s.title, s.subtitle, s.slug, s.cover_image, s.reading_time_minutes,
          s.tile_size, s.views_count, s.created_at,
          c.name as category_name, c.color as category_color,
          u.name as author_name, u.username as author_username, u.avatar_url as author_avatar,
          (SELECT COUNT(*) FROM reactions r WHERE r.story_id = s.id) as reactions_count,
          (SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id) as comments_count
        FROM stories s
        JOIN categories c ON c.id = s.category_id
        JOIN users u ON u.id = s.author_id
        WHERE s.status = 'published'
        ORDER BY (s.views_count + (SELECT COUNT(*) FROM reactions r WHERE r.story_id = s.id)*3 + (SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id)*4) DESC
        LIMIT 6
      `;
      const stories = await query<any>(sql);
      res.status(200).json({ trending: stories });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load trending stories.' });
    }
  });

  // GET /api/stories/:id
  storiesRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
    try {
      const param = req.params.id;
      const isNum = /^\d+$/.test(param);

      const sql = `
        SELECT 
          s.*,
          c.id as category_id, c.name as category_name, c.slug as category_slug, c.color as category_color,
          u.id as author_id, u.name as author_name, u.username as author_username, u.avatar_url as author_avatar, u.bio as author_bio
        FROM stories s
        JOIN categories c ON c.id = s.category_id
        JOIN users u ON u.id = s.author_id
        WHERE ${isNum ? 's.id = ?' : 's.slug = ?'}
      `;

      const story = await queryOne<any>(sql, [param]);

      if (!story) {
        res.status(404).json({ error: "The requested content could not be found." });
        return;
      }

      // Check author/draft permission
      if (story.status === 'draft' && (!req.user || (req.user.id !== story.author_id && req.user.role !== 'admin'))) {
        res.status(403).json({ error: "You don't have permission to view this draft." });
        return;
      }

      // Increment view count if published
      if (story.status === 'published') {
        await execute('UPDATE stories SET views_count = views_count + 1 WHERE id = ?', [story.id]);
        story.views_count += 1;
      }

      // Reactions count by type
      const reactionsBreakdown = await query<any>(
        'SELECT type, COUNT(*) as count FROM reactions WHERE story_id = ? GROUP BY type',
        [story.id]
      );
      const reactionsCount = reactionsBreakdown.reduce((acc: any, r: any) => {
        acc[r.type] = r.count;
        return acc;
      }, { appreciate: 0, interesting: 0, useful: 0, thought_provoking: 0 });

      // User reaction & bookmark state
      let userReaction: string | null = null;
      let isBookmarked = false;
      let isFollowingAuthor = false;

      if (req.user) {
        const uReaction = await queryOne<any>(
          'SELECT type FROM reactions WHERE story_id = ? AND user_id = ?',
          [story.id, req.user.id]
        );
        if (uReaction) userReaction = uReaction.type;

        const uBookmark = await queryOne<any>(
          'SELECT id FROM bookmarks WHERE story_id = ? AND user_id = ?',
          [story.id, req.user.id]
        );
        isBookmarked = !!uBookmark;

        const uFollow = await queryOne<any>(
          'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
          [req.user.id, story.author_id]
        );
        isFollowingAuthor = !!uFollow;
      }

      // Related stories in same category
      const related = await query<any>(
        `SELECT s.id, s.title, s.slug, s.cover_image, s.reading_time_minutes, s.tile_size,
                u.name as author_name, u.avatar_url as author_avatar
         FROM stories s
         JOIN users u ON u.id = s.author_id
         WHERE s.category_id = ? AND s.id != ? AND s.status = 'published'
         ORDER BY s.views_count DESC
         LIMIT 3`,
        [story.category_id, story.id]
      );

      res.status(200).json({
        story: {
          id: story.id,
          title: story.title,
          subtitle: story.subtitle,
          slug: story.slug,
          content: story.content,
          cover_image: story.cover_image,
          reading_time_minutes: story.reading_time_minutes,
          tile_size: story.tile_size,
          status: story.status,
          views_count: story.views_count,
          created_at: story.created_at,
          updated_at: story.updated_at,
          category: {
            id: story.category_id,
            name: story.category_name,
            slug: story.category_slug,
            color: story.category_color,
          },
          author: {
            id: story.author_id,
            name: story.author_name,
            username: story.author_username,
            avatar_url: story.author_avatar,
            bio: story.author_bio,
            isFollowing: isFollowingAuthor,
          },
          reactions: reactionsCount,
          totalReactions: Object.values(reactionsCount).reduce((a: any, b: any) => a + b, 0),
          userReaction,
          isBookmarked,
        },
        related,
      });
    } catch (err: any) {
      console.error('Get story error:', err);
      res.status(500).json({ error: 'Failed to retrieve story.' });
    }
  });

  // POST /api/stories (Create new story/draft)
  storiesRouter.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { title, subtitle, content, cover_image, category_id, category_name, tile_size, status } = req.body;

      if (!title || !title.trim()) {
        res.status(400).json({ error: 'Story title is required.' });
        return;
      }

      let catId = category_id;
      if (!catId && category_name) {
        const cat = await queryOne<any>('SELECT id FROM categories WHERE name = ? COLLATE NOCASE', [category_name]);
        catId = cat?.id;
      }
      if (!catId) catId = 1; // Default to Technology if none

      const wordCount = (content || '').trim().split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const baseSlug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      const storyStatus = status === 'draft' ? 'draft' : 'published';
      const tileSize = ['small', 'medium', 'large', 'featured'].includes(tile_size) ? tile_size : 'medium';
      const cover = cover_image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80';

      const result = await execute(
        `INSERT INTO stories 
         (title, subtitle, slug, content, cover_image, category_id, author_id, reading_time_minutes, tile_size, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title.trim(),
          subtitle?.trim() || null,
          uniqueSlug,
          content || '',
          cover,
          catId,
          req.user!.id,
          readingTime,
          tileSize,
          storyStatus,
        ]
      );

      res.status(201).json({
        message: storyStatus === 'draft' ? 'Draft saved successfully.' : 'Story published successfully.',
        storyId: result.lastInsertRowid,
        slug: uniqueSlug,
      });
    } catch (err: any) {
      console.error('Create story error:', err);
      res.status(500).json({ error: 'Failed to create story.' });
    }
  });

  // PUT /api/stories/:id (Edit story)
  storiesRouter.put('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.id, 10);
      const story = await queryOne<any>('SELECT * FROM stories WHERE id = ?', [storyId]);

      if (!story) {
        res.status(404).json({ error: 'The requested content could not be found.' });
        return;
      }

      if (story.author_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: "You don't have permission to edit this story." });
        return;
      }

      const { title, subtitle, content, cover_image, category_id, tile_size, status } = req.body;

      const wordCount = (content !== undefined ? content : story.content).trim().split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      await execute(
        `UPDATE stories SET 
          title = COALESCE(?, title),
          subtitle = COALESCE(?, subtitle),
          content = COALESCE(?, content),
          cover_image = COALESCE(?, cover_image),
          category_id = COALESCE(?, category_id),
          tile_size = COALESCE(?, tile_size),
          status = COALESCE(?, status),
          reading_time_minutes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          title?.trim() ?? null,
          subtitle?.trim() ?? null,
          content ?? null,
          cover_image ?? null,
          category_id ?? null,
          tile_size ?? null,
          status ?? null,
          readingTime,
          storyId,
        ]
      );

      res.status(200).json({ message: 'Story updated successfully.' });
    } catch (err: any) {
      console.error('Update story error:', err);
      res.status(500).json({ error: 'Failed to update story.' });
    }
  });

  // DELETE /api/stories/:id (Delete story)
  storiesRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.id, 10);
      const story = await queryOne<any>('SELECT * FROM stories WHERE id = ?', [storyId]);

      if (!story) {
        res.status(404).json({ error: 'Story not found.' });
        return;
      }

      if (story.author_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: "You don't have permission to delete this story." });
        return;
      }

      await execute('DELETE FROM stories WHERE id = ?', [storyId]);
      res.status(200).json({ message: 'Story deleted successfully.' });
    } catch (err: any) {
      console.error('Delete story error:', err);
      res.status(500).json({ error: 'Failed to delete story.' });
    }
  });

  // POST /api/stories/:id/reaction (React to story)
  storiesRouter.post('/:id/reaction', authenticateToken, async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.id, 10);
      const { type } = req.body;
      const validTypes = ['appreciate', 'interesting', 'useful', 'thought_provoking'];

      if (!type || !validTypes.includes(type)) {
        res.status(400).json({ error: 'Valid reaction type required.' });
        return;
      }

      const story = await queryOne<any>('SELECT id, author_id, title FROM stories WHERE id = ?', [storyId]);
      if (!story) {
        res.status(404).json({ error: 'Story not found.' });
        return;
      }

      // Enforce 1 reaction per user: replace if already exists
      await execute('DELETE FROM reactions WHERE story_id = ? AND user_id = ?', [storyId, req.user!.id]);
      await execute('INSERT INTO reactions (story_id, user_id, type) VALUES (?, ?, ?)', [storyId, req.user!.id, type]);

      // Notify author if not reacting to own story
      if (story.author_id !== req.user!.id) {
        const typeLabel = type.replace('_', ' ');
        await execute(
          `INSERT INTO notifications (user_id, actor_id, type, story_id, message) 
           VALUES (?, ?, 'reaction', ?, ?)`,
          [story.author_id, req.user!.id, storyId, `${req.user!.name} reacted "${typeLabel}" to your story.`]
        );
      }

      res.status(200).json({ message: 'Reaction saved.', type });
    } catch (err: any) {
      console.error('Reaction error:', err);
      res.status(500).json({ error: 'Failed to record reaction.' });
    }
  });

  // DELETE /api/stories/:id/reaction (Remove reaction)
  storiesRouter.delete('/:id/reaction', authenticateToken, async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.id, 10);
      await execute('DELETE FROM reactions WHERE story_id = ? AND user_id = ?', [storyId, req.user!.id]);
      res.status(200).json({ message: 'Reaction removed.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove reaction.' });
    }
  });

  // POST /api/stories/:id/bookmark
  storiesRouter.post('/:id/bookmark', authenticateToken, async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.id, 10);
      const status = req.body.status || 'saved';

      const story = await queryOne<any>('SELECT id, author_id, title FROM stories WHERE id = ?', [storyId]);
      if (!story) {
        res.status(404).json({ error: 'Story not found.' });
        return;
      }

      await execute('DELETE FROM bookmarks WHERE story_id = ? AND user_id = ?', [storyId, req.user!.id]);
      await execute('INSERT INTO bookmarks (story_id, user_id, status) VALUES (?, ?, ?)', [storyId, req.user!.id, status]);

      if (story.author_id !== req.user!.id) {
        await execute(
          `INSERT INTO notifications (user_id, actor_id, type, story_id, message) 
           VALUES (?, ?, 'bookmark', ?, ?)`,
          [story.author_id, req.user!.id, storyId, `${req.user!.name} saved your story to their reading shelf.`]
        );
      }

      res.status(200).json({ message: 'Story saved to bookmarks.', isBookmarked: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to bookmark story.' });
    }
  });

  // DELETE /api/stories/:id/bookmark
  storiesRouter.delete('/:id/bookmark', authenticateToken, async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.id, 10);
      await execute('DELETE FROM bookmarks WHERE story_id = ? AND user_id = ?', [storyId, req.user!.id]);
      res.status(200).json({ message: 'Story removed from bookmarks.', isBookmarked: false });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove bookmark.' });
    }
  });

  // GET /api/stories/:id/comments (Threaded comments)
  storiesRouter.get('/:id/comments', optionalAuth, async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.id, 10);

      const comments = await query<any>(`
        SELECT 
          cm.id, cm.story_id, cm.parent_id, cm.content, cm.likes_count, cm.created_at, cm.updated_at,
          u.id as user_id, u.name as user_name, u.username as user_username, u.avatar_url as user_avatar
        FROM comments cm
        JOIN users u ON u.id = cm.user_id
        WHERE cm.story_id = ?
        ORDER BY cm.created_at ASC
      `, [storyId]);

      // Check if current user liked comments
      let likedCommentIds = new Set<number>();
      if (req.user) {
        const userLikes = await query<any>('SELECT comment_id FROM comment_likes WHERE user_id = ?', [req.user.id]);
        userLikes.forEach((l: any) => likedCommentIds.add(l.comment_id));
      }

      // Build recursive thread tree
      const commentMap = new Map<number, any>();
      const rootComments: any[] = [];

      comments.forEach((c: any) => {
        const node = {
          id: c.id,
          content: c.content,
          likesCount: c.likes_count,
          createdAt: c.created_at,
          parentId: c.parent_id,
          userHasLiked: likedCommentIds.has(c.id),
          author: {
            id: c.user_id,
            name: c.user_name,
            username: c.user_username,
            avatar_url: c.user_avatar,
          },
          replies: [],
        };
        commentMap.set(c.id, node);
      });

      commentMap.forEach((node) => {
        if (node.parentId && commentMap.has(node.parentId)) {
          commentMap.get(node.parentId).replies.push(node);
        } else {
          rootComments.push(node);
        }
      });

      res.status(200).json({ comments: rootComments, totalCount: comments.length });
    } catch (err: any) {
      console.error('Get comments error:', err);
      res.status(500).json({ error: 'Failed to load comments.' });
    }
  });

  // POST /api/stories/:id/comments (Create comment / reply)
  storiesRouter.post('/:id/comments', authenticateToken, async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.id, 10);
      const { content, parent_id } = req.body;

      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Comment content cannot be empty.' });
        return;
      }

      const story = await queryOne<any>('SELECT id, author_id, title FROM stories WHERE id = ?', [storyId]);
      if (!story) {
        res.status(404).json({ error: 'Story not found.' });
        return;
      }

      const result = await execute(
        'INSERT INTO comments (story_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
        [storyId, req.user!.id, parent_id || null, content.trim()]
      );

      // Notification logic
      if (parent_id) {
        const parentComment = await queryOne<any>('SELECT user_id FROM comments WHERE id = ?', [parent_id]);
        if (parentComment && parentComment.user_id !== req.user!.id) {
          await execute(
            `INSERT INTO notifications (user_id, actor_id, type, story_id, comment_id, message)
             VALUES (?, ?, 'reply', ?, ?, ?)`,
            [parentComment.user_id, req.user!.id, storyId, result.lastInsertRowid, `${req.user!.name} replied to your comment.`]
          );
        }
      } else if (story.author_id !== req.user!.id) {
        await execute(
          `INSERT INTO notifications (user_id, actor_id, type, story_id, comment_id, message)
           VALUES (?, ?, 'comment', ?, ?, ?)`,
          [story.author_id, req.user!.id, storyId, result.lastInsertRowid, `${req.user!.name} commented on your story.`]
        );
      }

      res.status(201).json({
        message: 'Comment posted.',
        comment: {
          id: result.lastInsertRowid,
          content: content.trim(),
          likesCount: 0,
          createdAt: new Date().toISOString(),
          parentId: parent_id || null,
          userHasLiked: false,
          author: {
            id: req.user!.id,
            name: req.user!.name,
            username: req.user!.username,
            avatar_url: req.user!.avatar_url,
          },
          replies: [],
        },
      });
    } catch (err: any) {
      console.error('Post comment error:', err);
      res.status(500).json({ error: 'Failed to post comment.' });
    }
  });

  apiRouter.use('/stories', storiesRouter);

  // -------------------------------------------------------------
  // 4. COMMENTS ACTIONS (/api/comments)
  // -------------------------------------------------------------
  const commentsRouter = express.Router();

  // PUT /api/comments/:id
  commentsRouter.put('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const commentId = parseInt(req.params.id, 10);
      const comment = await queryOne<any>('SELECT * FROM comments WHERE id = ?', [commentId]);

      if (!comment) {
        res.status(404).json({ error: 'Comment not found.' });
        return;
      }

      if (comment.user_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: "You don't have permission to edit this comment." });
        return;
      }

      const { content } = req.body;
      if (!content || !content.trim()) {
        res.status(400).json({ error: 'Content cannot be empty.' });
        return;
      }

      await execute('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        content.trim(),
        commentId,
      ]);

      res.status(200).json({ message: 'Comment updated.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to edit comment.' });
    }
  });

  // DELETE /api/comments/:id
  commentsRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const commentId = parseInt(req.params.id, 10);
      const comment = await queryOne<any>('SELECT * FROM comments WHERE id = ?', [commentId]);

      if (!comment) {
        res.status(404).json({ error: 'Comment not found.' });
        return;
      }

      if (comment.user_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: "You don't have permission to delete this comment." });
        return;
      }

      await execute('DELETE FROM comments WHERE id = ?', [commentId]);
      res.status(200).json({ message: 'Comment deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete comment.' });
    }
  });

  // POST /api/comments/:id/like
  commentsRouter.post('/:id/like', authenticateToken, async (req: Request, res: Response) => {
    try {
      const commentId = parseInt(req.params.id, 10);
      await execute('INSERT OR IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)', [
        commentId,
        req.user!.id,
      ]);
      const countRes = await queryOne<any>('SELECT COUNT(*) as c FROM comment_likes WHERE comment_id = ?', [commentId]);
      const count = countRes?.c || 0;
      await execute('UPDATE comments SET likes_count = ? WHERE id = ?', [count, commentId]);

      res.status(200).json({ message: 'Comment liked.', likesCount: count, userHasLiked: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to like comment.' });
    }
  });

  // DELETE /api/comments/:id/like
  commentsRouter.delete('/:id/like', authenticateToken, async (req: Request, res: Response) => {
    try {
      const commentId = parseInt(req.params.id, 10);
      await execute('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, req.user!.id]);
      const countRes = await queryOne<any>('SELECT COUNT(*) as c FROM comment_likes WHERE comment_id = ?', [commentId]);
      const count = countRes?.c || 0;
      await execute('UPDATE comments SET likes_count = ? WHERE id = ?', [count, commentId]);

      res.status(200).json({ message: 'Comment unliked.', likesCount: count, userHasLiked: false });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to unlike comment.' });
    }
  });

  apiRouter.use('/comments', commentsRouter);

  // -------------------------------------------------------------
  // 5. USER PROFILES & FOLLOWS (/api/users)
  // -------------------------------------------------------------
  const usersRouter = express.Router();

  // GET /api/users/:username (User profile & their published stories)
  usersRouter.get('/:username', optionalAuth, async (req: Request, res: Response) => {
    try {
      const username = req.params.username;
      const user = await queryOne<any>(
        'SELECT id, name, username, email, avatar_url, bio, role, created_at FROM users WHERE username = ? COLLATE NOCASE',
        [username]
      );

      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      // Stats
      const storiesCountRes = await queryOne<any>(
        "SELECT COUNT(*) as c, COALESCE(SUM(views_count), 0) as views FROM stories WHERE author_id = ? AND status = 'published'",
        [user.id]
      );
      const followersRes = await queryOne<any>('SELECT COUNT(*) as c FROM follows WHERE following_id = ?', [user.id]);
      const followingRes = await queryOne<any>('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?', [user.id]);

      let isFollowing = false;
      if (req.user) {
        const followCheck = await queryOne<any>(
          'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
          [req.user.id, user.id]
        );
        isFollowing = !!followCheck;
      }

      // Published stories by this author
      const stories = await query<any>(`
        SELECT s.id, s.title, s.subtitle, s.slug, s.cover_image, s.reading_time_minutes, s.tile_size, s.views_count, s.created_at,
               c.name as category_name, c.color as category_color,
               (SELECT COUNT(*) FROM reactions r WHERE r.story_id = s.id) as reactions_count,
               (SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id) as comments_count
        FROM stories s
        JOIN categories c ON c.id = s.category_id
        WHERE s.author_id = ? AND s.status = 'published'
        ORDER BY s.created_at DESC
      `, [user.id]);

      res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar_url: user.avatar_url,
          bio: user.bio,
          role: user.role,
          created_at: user.created_at,
          stats: {
            storiesCount: storiesCountRes?.c || 0,
            totalReads: storiesCountRes?.views || 0,
            followersCount: followersRes?.c || 0,
            followingCount: followingRes?.c || 0,
          },
          isFollowing,
        },
        stories,
      });
    } catch (err: any) {
      console.error('Get user profile error:', err);
      res.status(500).json({ error: 'Failed to load user profile.' });
    }
  });

  // PUT /api/users/:id (Edit profile)
  usersRouter.put('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (req.user!.id !== userId && req.user!.role !== 'admin') {
        res.status(403).json({ error: "You don't have permission to modify this profile." });
        return;
      }

      const { name, bio, avatar_url } = req.body;

      await execute(
        'UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name?.trim() ?? null, bio?.trim() ?? null, avatar_url?.trim() ?? null, userId]
      );

      const updated = await queryOne<AuthUser>(
        'SELECT id, name, username, email, role, avatar_url, bio FROM users WHERE id = ?',
        [userId]
      );

      res.status(200).json({ message: 'Profile updated successfully.', user: updated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  });

  // POST /api/users/:id/follow
  usersRouter.post('/:id/follow', authenticateToken, async (req: Request, res: Response) => {
    try {
      const followingId = parseInt(req.params.id, 10);

      if (req.user!.id === followingId) {
        res.status(400).json({ error: 'You cannot follow yourself.' });
        return;
      }

      const targetUser = await queryOne<any>('SELECT id, name FROM users WHERE id = ?', [followingId]);
      if (!targetUser) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      await execute('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)', [
        req.user!.id,
        followingId,
      ]);

      await execute(
        `INSERT INTO notifications (user_id, actor_id, type, message) VALUES (?, ?, 'follow', ?)`,
        [followingId, req.user!.id, `${req.user!.name} started following your writing.`]
      );

      res.status(200).json({ message: `You are now following ${targetUser.name}.`, isFollowing: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to follow user.' });
    }
  });

  // DELETE /api/users/:id/follow
  usersRouter.delete('/:id/follow', authenticateToken, async (req: Request, res: Response) => {
    try {
      const followingId = parseInt(req.params.id, 10);
      await execute('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.user!.id, followingId]);
      res.status(200).json({ message: 'Unfollowed successfully.', isFollowing: false });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to unfollow user.' });
    }
  });

  // GET /api/users/:id/saved (Bookmarks shelf)
  usersRouter.get('/:id/saved', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id, 10);
      if (req.user!.id !== userId && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Permission denied.' });
        return;
      }

      const savedStories = await query<any>(`
        SELECT 
          s.id, s.title, s.subtitle, s.slug, s.cover_image, s.reading_time_minutes, s.tile_size, s.views_count, s.created_at,
          b.status as bookmark_status, b.created_at as saved_at,
          c.name as category_name, c.color as category_color,
          u.name as author_name, u.username as author_username, u.avatar_url as author_avatar
        FROM bookmarks b
        JOIN stories s ON s.id = b.story_id
        JOIN categories c ON c.id = s.category_id
        JOIN users u ON u.id = s.author_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
      `, [userId]);

      res.status(200).json({ savedStories });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load saved stories.' });
    }
  });

  apiRouter.use('/users', usersRouter);

  // -------------------------------------------------------------
  // 6. COLLECTIONS ROUTES (/api/collections)
  // -------------------------------------------------------------
  const collectionsRouter = express.Router();

  // GET /api/collections (All collections or user's)
  collectionsRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;
      let sql = `
        SELECT col.*, u.name as user_name, u.username as user_username, u.avatar_url as user_avatar,
               (SELECT COUNT(*) FROM collection_stories cs WHERE cs.collection_id = col.id) as stories_count
        FROM collections col
        JOIN users u ON u.id = col.user_id
      `;
      let params: any[] = [];
      if (userId) {
        sql += ' WHERE col.user_id = ?';
        params.push(userId);
      }
      sql += ' ORDER BY col.created_at DESC';

      const collections = await query<any>(sql, params);
      res.status(200).json({ collections });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load collections.' });
    }
  });

  // GET /api/collections/:id
  collectionsRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
    try {
      const collectionId = parseInt(req.params.id, 10);
      const collection = await queryOne<any>(`
        SELECT col.*, u.name as user_name, u.username as user_username, u.avatar_url as user_avatar
        FROM collections col
        JOIN users u ON u.id = col.user_id
        WHERE col.id = ?
      `, [collectionId]);

      if (!collection) {
        res.status(404).json({ error: 'Collection not found.' });
        return;
      }

      const stories = await query<any>(`
        SELECT s.id, s.title, s.subtitle, s.slug, s.cover_image, s.reading_time_minutes, s.tile_size, s.views_count,
               c.name as category_name, c.color as category_color,
               u.name as author_name, u.username as author_username, u.avatar_url as author_avatar
        FROM collection_stories cs
        JOIN stories s ON s.id = cs.story_id
        JOIN categories c ON c.id = s.category_id
        JOIN users u ON u.id = s.author_id
        WHERE cs.collection_id = ?
        ORDER BY cs.created_at DESC
      `, [collectionId]);

      res.status(200).json({ collection, stories });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load collection.' });
    }
  });

  // POST /api/collections
  collectionsRouter.post('/', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { name, description, cover_color } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Collection name is required.' });
        return;
      }

      const result = await execute(
        'INSERT INTO collections (user_id, name, description, cover_color) VALUES (?, ?, ?, ?)',
        [req.user!.id, name.trim(), description?.trim() || null, cover_color || '#22382D']
      );

      res.status(201).json({
        message: 'Collection created.',
        collectionId: result.lastInsertRowid,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create collection.' });
    }
  });

  // POST /api/collections/:id/stories (Add story to collection)
  collectionsRouter.post('/:id/stories', authenticateToken, async (req: Request, res: Response) => {
    try {
      const collectionId = parseInt(req.params.id, 10);
      const { storyId } = req.body;

      const col = await queryOne<any>('SELECT user_id FROM collections WHERE id = ?', [collectionId]);
      if (!col) {
        res.status(404).json({ error: 'Collection not found.' });
        return;
      }

      if (col.user_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Permission denied.' });
        return;
      }

      await execute('INSERT OR IGNORE INTO collection_stories (collection_id, story_id) VALUES (?, ?)', [
        collectionId,
        storyId,
      ]);

      res.status(200).json({ message: 'Story added to collection.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add story to collection.' });
    }
  });

  // DELETE /api/collections/:id/stories/:storyId (Remove from collection)
  collectionsRouter.delete('/:id/stories/:storyId', authenticateToken, async (req: Request, res: Response) => {
    try {
      const collectionId = parseInt(req.params.id, 10);
      const storyId = parseInt(req.params.storyId, 10);

      const col = await queryOne<any>('SELECT user_id FROM collections WHERE id = ?', [collectionId]);
      if (!col || (col.user_id !== req.user!.id && req.user!.role !== 'admin')) {
        res.status(403).json({ error: 'Permission denied.' });
        return;
      }

      await execute('DELETE FROM collection_stories WHERE collection_id = ? AND story_id = ?', [
        collectionId,
        storyId,
      ]);

      res.status(200).json({ message: 'Story removed from collection.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove story.' });
    }
  });

  // DELETE /api/collections/:id
  collectionsRouter.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const collectionId = parseInt(req.params.id, 10);
      const col = await queryOne<any>('SELECT user_id FROM collections WHERE id = ?', [collectionId]);
      if (!col || (col.user_id !== req.user!.id && req.user!.role !== 'admin')) {
        res.status(403).json({ error: 'Permission denied.' });
        return;
      }

      await execute('DELETE FROM collections WHERE id = ?', [collectionId]);
      res.status(200).json({ message: 'Collection deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete collection.' });
    }
  });

  apiRouter.use('/collections', collectionsRouter);

  // -------------------------------------------------------------
  // 7. NOTIFICATIONS ROUTES (/api/notifications)
  // -------------------------------------------------------------
  const notificationsRouter = express.Router();

  // GET /api/notifications
  notificationsRouter.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
      const notifications = await query<any>(`
        SELECT 
          n.id, n.type, n.message, n.is_read, n.created_at, n.story_id,
          s.title as story_title, s.slug as story_slug,
          u.name as actor_name, u.username as actor_username, u.avatar_url as actor_avatar
        FROM notifications n
        JOIN users u ON u.id = n.actor_id
        LEFT JOIN stories s ON s.id = n.story_id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC
        LIMIT 50
      `, [req.user!.id]);

      const unreadCountRes = await queryOne<any>(
        'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0',
        [req.user!.id]
      );

      res.status(200).json({
        notifications,
        unreadCount: unreadCountRes?.c || 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load notifications.' });
    }
  });

  // PUT /api/notifications/:id/read
  notificationsRouter.put('/:id/read', authenticateToken, async (req: Request, res: Response) => {
    try {
      const notifId = parseInt(req.params.id, 10);
      await execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notifId, req.user!.id]);
      res.status(200).json({ message: 'Notification marked as read.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update notification.' });
    }
  });

  // PUT /api/notifications/read-all
  notificationsRouter.put('/read-all', authenticateToken, async (req: Request, res: Response) => {
    try {
      await execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user!.id]);
      res.status(200).json({ message: 'All notifications marked as read.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to mark notifications.' });
    }
  });

  apiRouter.use('/notifications', notificationsRouter);

  // -------------------------------------------------------------
  // 8. CREATOR DASHBOARD (/api/dashboard)
  // -------------------------------------------------------------
  apiRouter.get('/dashboard', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Stats
      const stats = await queryOne<any>(`
        SELECT 
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
          COALESCE(SUM(views_count), 0) as total_views,
          (SELECT COUNT(*) FROM reactions r JOIN stories s ON s.id = r.story_id WHERE s.author_id = ?) as total_reactions,
          (SELECT COUNT(*) FROM comments cm JOIN stories s ON s.id = cm.story_id WHERE s.author_id = ?) as total_comments,
          (SELECT COUNT(*) FROM follows f WHERE f.following_id = ?) as followers_count
        FROM stories
        WHERE author_id = ?
      `, [userId, userId, userId, userId]);

      // Creator's stories (both published and drafts)
      const myStories = await query<any>(`
        SELECT 
          s.id, s.title, s.subtitle, s.slug, s.cover_image, s.status, s.tile_size, s.reading_time_minutes, s.views_count,
          s.created_at, s.updated_at,
          c.name as category_name, c.color as category_color,
          (SELECT COUNT(*) FROM reactions r WHERE r.story_id = s.id) as reactions_count,
          (SELECT COUNT(*) FROM comments cm WHERE cm.story_id = s.id) as comments_count
        FROM stories s
        JOIN categories c ON c.id = s.category_id
        WHERE s.author_id = ?
        ORDER BY s.updated_at DESC
      `, [userId]);

      res.status(200).json({ stats, stories: myStories });
    } catch (err: any) {
      console.error('Dashboard error:', err);
      res.status(500).json({ error: 'Failed to load creator dashboard.' });
    }
  });

  // -------------------------------------------------------------
  // 9. ADMIN PANEL ROUTES (/api/admin)
  // -------------------------------------------------------------
  const adminRouter = express.Router();
  adminRouter.use(requireAdmin);

  adminRouter.get('/stats', async (_req: Request, res: Response) => {
    try {
      const usersCount = (await queryOne<any>('SELECT COUNT(*) as c FROM users'))?.c || 0;
      const storiesCount = (await queryOne<any>('SELECT COUNT(*) as c FROM stories'))?.c || 0;
      const commentsCount = (await queryOne<any>('SELECT COUNT(*) as c FROM comments'))?.c || 0;
      const viewsTotal = (await queryOne<any>('SELECT COALESCE(SUM(views_count), 0) as c FROM stories'))?.c || 0;

      res.status(200).json({
        usersCount,
        storiesCount,
        commentsCount,
        viewsTotal,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load admin stats.' });
    }
  });

  adminRouter.get('/users', async (_req: Request, res: Response) => {
    try {
      const users = await query<any>(`
        SELECT u.id, u.name, u.username, u.email, u.role, u.created_at,
               (SELECT COUNT(*) FROM stories s WHERE s.author_id = u.id) as stories_count
        FROM users u
        ORDER BY u.created_at DESC
      `);
      res.status(200).json({ users });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to load users.' });
    }
  });

  adminRouter.delete('/users/:id', async (req: Request, res: Response) => {
    try {
      const targetId = parseInt(req.params.id, 10);
      if (targetId === req.user!.id) {
        res.status(400).json({ error: 'Cannot delete yourself.' });
        return;
      }
      await execute('DELETE FROM users WHERE id = ?', [targetId]);
      res.status(200).json({ message: 'User deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete user.' });
    }
  });

  apiRouter.use('/admin', adminRouter);

  // Mount API router strictly under /api
  app.use('/api', apiRouter);

  // Handle unhandled /api routes with a proper JSON 404
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // -------------------------------------------------------------
  // Vite Integration (Dev) or Static Serving (Prod)
  // -------------------------------------------------------------
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MOSAIC server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
