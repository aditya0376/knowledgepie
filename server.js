const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const multer = require('multer');
const crypto = require('crypto');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Config ───
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'knowledgepie2024';
const POSTS_FILE = path.join(__dirname, 'data', 'posts.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Multer config ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, gif, webp, svg) are allowed.'));
    }
  }
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function loadPosts() {
  try {
    return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
  } catch { return { posts: [] }; }
}

function savePosts(data) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  syncToGitHub('news post updated');
}

// Push posts.json to GitHub using API so Render redeploys with changes
function syncToGitHub(message) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return; // Only runs when GITHUB_TOKEN env var is set on Render
  try {
    const owner = 'aditya0376', repo = 'knowledgepie', branch = 'master';
    const content = fs.readFileSync(POSTS_FILE, 'utf-8');
    const base64 = Buffer.from(content).toString('base64');
    
    // First get the current file's SHA
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/posts.json?ref=${branch}`;
    const getOpts = {
      hostname: 'api.github.com', path: `/repos/${owner}/${repo}/contents/data/posts.json?ref=${branch}`,
      method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'knowledgepie', 'Accept': 'application/vnd.github.v3+json' }
    };
    
    https.get(getOpts, (getRes) => {
      let body = '';
      getRes.on('data', d => body += d);
      getRes.on('end', () => {
        try {
          const fileInfo = JSON.parse(body);
          if (fileInfo.message && !fileInfo.sha) {
            console.error('⚠️ GitHub API error:', fileInfo.message);
            return;
          }
          const sha = fileInfo.sha || '';
          
          // Now update the file
          const putData = JSON.stringify({ message: `Auto: ${message}`, content: base64, sha, branch });
          const putOpts = {
            hostname: 'api.github.com', path: `/repos/${owner}/${repo}/contents/data/posts.json`,
            method: 'PUT', headers: {
              'Authorization': `Bearer ${token}`, 'User-Agent': 'knowledgepie',
              'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(putData)
            }
          };
          const putReq = https.request(putOpts, (putRes) => {
            let resBody = '';
            putRes.on('data', d => resBody += d);
            putRes.on('end', () => {
              if (putRes.statusCode === 200 || putRes.statusCode === 201) {
                console.log('✅ Synced posts.json to GitHub');
              } else {
                console.error('⚠️ GitHub sync failed:', putRes.statusCode, resBody.slice(0, 200));
              }
            });
          });
          putReq.on('error', e => console.error('⚠️ GitHub sync error:', e.message));
          putReq.write(putData);
          putReq.end();
        } catch (e) {
          console.error('⚠️ GitHub sync parse error:', e.message.slice(0, 200), '| body:', body.slice(0, 200));
        }
      });
    }).on('error', e => console.error('⚠️ GitHub fetch error:', e.message));
  } catch (e) {
    console.error('⚠️ GitHub sync error:', e.message.slice(0, 200));
  }
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80) || 'post';
}

// Simple admin token (in-memory, resets on restart)
const adminTokens = new Map();

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// ──────────────────────────────────────────────
// View engine & body parsing
// ──────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Static files ───
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d', etag: true, lastModified: true
}));

// ─── Media proxy ───
const LIVE_ORIGIN = 'https://www.knowledgepie.in';
app.use('/media', (req, res, next) => {
  const localPath = path.join(__dirname, 'public', 'media', req.path);
  if (fs.existsSync(localPath)) return next();
  const liveUrl = `${LIVE_ORIGIN}/media${req.path}`;
  const proxyReq = https.get(liveUrl, (proxyRes) => {
    if (proxyRes.statusCode >= 400) { proxyRes.resume(); return next(); }
    if (proxyRes.headers['content-type']) res.setHeader('Content-Type', proxyRes.headers['content-type']);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => next());
  proxyReq.setTimeout(5000, () => { proxyReq.destroy(); next(); });
});

// ─── Load data ───
const siteData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'site-data.json'), 'utf-8'));

// ─── Shared locals ───
const sharedLocals = {
  siteTitle: 'Knowledgepie Private Limited',
  tagline: 'Safer MRI Contrast Agents | Biotech Innovation',
  baseUrl: 'https://www.knowledgepie.in',
  email: 'madhulekha@knowledgepie.in',
  phone: '+91 8876059434',
  addresses: {
    office: 'Bio-NEST, CSIR-NEIST, Pulibor-785006, Jorhat, Assam, India',
    registered: '21 Nehru Park, New Colony, Samannaypur Path, Byelane, Jorhat, Assam-785001, India'
  },
  social: {
    linkedin: 'http://www.linkedin.com/in/knowledgepie-madhulekha-997b7b245',
    twitter: 'https://x.com/knowledge_pie',
    instagram: 'https://www.instagram.com/knowledge_pie/'
  },
  currentYear: new Date().getFullYear(),
  siteData
};

// ─── Make req available ───
app.use((req, res, next) => {
  res.locals.req = req;
  next();
});

// ──────────────────────────────────────────────
// PUBLIC ROUTES
// ──────────────────────────────────────────────

app.get('/', (req, res) => {
  const allPosts = loadPosts();
  res.render('index', {
    ...sharedLocals, page: 'home',
    pageTitle: 'Knowledgepie | Safer MRI Contrast Agents | Xeuj® Nanoparticle Technology',
    pageDescription: 'Knowledgepie is a biotechnology company developing safer nanoparticle-based MRI contrast agents. Xeuj® — a patented, NSF-free alternative for renal impaired patients.',
    recentPosts: allPosts.posts.slice(0, 3)
  });
});

app.get('/about', (req, res) => {
  res.render('about', {
    ...sharedLocals, page: 'about',
    pageTitle: 'About Us — Knowledgepie',
    pageDescription: 'Learn about Knowledgepie Private Limited — our mission to innovate safer MRI contrast agents, our flagship product Xeuj®, and our eco-friendly nanotechnology.'
  });
});

app.get('/team', (req, res) => {
  res.render('team', {
    ...sharedLocals, page: 'team',
    pageTitle: 'Team — Knowledgepie',
    pageDescription: 'Meet the Knowledgepie team: Dr. Madhulekha Gogoi (Founder), advisors, and researchers driving safer contrast agent innovation.'
  });
});

// ════════════════════════════════════════════
// NEWS / BLOG
// ════════════════════════════════════════════
app.get('/news', (req, res) => {
  const allPosts = loadPosts();
  // Sort by date descending
  allPosts.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.render('news', {
    ...sharedLocals, page: 'news',
    pageTitle: 'News — Knowledgepie',
    pageDescription: 'Latest news, updates, and stories from Knowledgepie Private Limited.',
    posts: allPosts.posts
  });
});

app.get('/news/:slug', (req, res) => {
  const allPosts = loadPosts();
  const post = allPosts.posts.find(p => p.slug === req.params.slug);
  if (!post) return res.status(404).render('404', { ...sharedLocals, page: '404', pageTitle: 'Post Not Found', pageDescription: '' });
  // Pass token so Edit button works when coming from admin
  const token = req.query.token || '';
  res.render('news-post', {
    ...sharedLocals, page: 'news',
    pageTitle: `${post.title} — Knowledgepie News`,
    pageDescription: post.excerpt,
    ogImage: post.image || null,
    post,
    token
  });
});

// ════════════════════════════════════════════
// MEDIA / CONTACT (keep existing)
// ════════════════════════════════════════════
app.get('/media', (req, res) => {
  res.render('media', {
    ...sharedLocals, page: 'media',
    pageTitle: 'Media — Knowledgepie',
    pageDescription: 'Watch videos and view social coverage of Knowledgepie\'s journey in biotech innovation.'
  });
});

app.get('/contact', (req, res) => {
  res.render('contact', {
    ...sharedLocals, page: 'contact',
    pageTitle: 'Contact Us — Knowledgepie',
    pageDescription: 'Get in touch with Knowledgepie Private Limited. Reach us by email, phone, or visit our office in Jorhat, Assam.'
  });
});

// ════════════════════════════════════════════
// INVESTORS
// ════════════════════════════════════════════
app.get('/investors', (req, res) => {
  res.render('investors', {
    ...sharedLocals, page: 'investors',
    pageTitle: 'Investors — Knowledgepie',
    pageDescription: 'Investment opportunity in Knowledgepie Private Limited. We are raising capital for clinical trials of Xeuj®, a breakthrough nanoparticle-based MRI contrast agent. MoU signed with PGIMER Chandigarh.'
  });
});

// Redirect old gallery to news
app.get('/gallery', (req, res) => res.redirect(301, '/news'));

// ──────────────────────────────────────────────
// ADMIN ROUTES (hidden, password-protected)
// ──────────────────────────────────────────────

// Admin auth middleware
function requireAdmin(req, res, next) {
  const token = req.query.token || req.body.token || '';
  if (adminTokens.has(token)) {
    req.adminUser = adminTokens.get(token);
    return next();
  }
  // Also check cookie
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (match && adminTokens.has(match[1])) {
    req.adminUser = adminTokens.get(match[1]);
    return next();
  }
  // Show login page
  res.render('admin-login', {
    ...sharedLocals, page: 'admin', noindex: true,
    pageTitle: 'Admin Login — Knowledgepie',
    pageDescription: '',
    error: null
  });
}

// GET /admin — login page or dashboard
app.get('/admin', requireAdmin, (req, res) => {
  const allPosts = loadPosts();
  allPosts.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.render('admin', {
    ...sharedLocals, page: 'admin', noindex: true,
    pageTitle: 'Admin — Knowledgepie',
    pageDescription: '',
    posts: allPosts.posts,
    token: req.query.token || ''
  });
});

// POST /admin/login — authenticate
app.post('/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    const token = generateToken();
    adminTokens.set(token, 'admin');
    // Set cookie that expires in 24h
    res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`);
    res.redirect(`/admin?token=${token}`);
  } else {
    res.render('admin-login', {
      ...sharedLocals, page: 'admin', noindex: true,
      pageTitle: 'Admin Login — Knowledgepie',
      pageDescription: '',
      error: 'Incorrect password. Please try again.'
    });
  }
});

// POST /admin/posts — create a new post
app.post('/admin/posts', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const { title, content, tags, author } = req.body;
    if (!title || !content) {
      return res.redirect('/admin?error=Title and content are required');
    }
    const allPosts = loadPosts();
    const slug = slugify(title);
    // Ensure unique slug
    let finalSlug = slug;
    let counter = 1;
    while (allPosts.posts.some(p => p.slug === finalSlug)) {
      finalSlug = `${slug}-${counter++}`;
    }
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const post = {
      id: finalSlug,
      title,
      slug: finalSlug,
      excerpt: content.replace(/<[^>]*>/g, '').substring(0, 200).replace(/\s+\S*$/, '') + '...',
      content,
      image: req.file ? `/uploads/${req.file.filename}` : '',
      date: dateStr,
      author: author || 'Knowledgepie Team',
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };
    allPosts.posts.push(post);
    savePosts(allPosts);
    const token = req.query.token || '';
    res.redirect(`/admin?token=${token}&success=${encodeURIComponent('Post created successfully!')}`);
  } catch (err) {
    const token = req.query.token || '';
    res.redirect(`/admin?token=${token}&error=${encodeURIComponent(err.message)}`);
  }
});

// POST /admin/posts/:id/delete — delete a post
app.post('/admin/posts/:id/delete', requireAdmin, (req, res) => {
  const allPosts = loadPosts();
  const idx = allPosts.posts.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    // Optionally delete the uploaded image
    const imgPath = allPosts.posts[idx].image;
    if (imgPath && imgPath.startsWith('/uploads/')) {
      const fullPath = path.join(__dirname, 'public', imgPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    allPosts.posts.splice(idx, 1);
    savePosts(allPosts);
  }
  const token = req.query.token || '';
  res.redirect(`/admin?token=${token}&success=Post deleted.`);
});

// GET /admin/posts/:id/edit — show edit form
app.get('/admin/posts/:id/edit', requireAdmin, (req, res) => {
  const allPosts = loadPosts();
  const post = allPosts.posts.find(p => p.id === req.params.id);
  if (!post) return res.redirect('/admin');
  res.render('admin-edit', {
    ...sharedLocals, page: 'admin', noindex: true,
    pageTitle: `Edit: ${post.title} — Admin`,
    pageDescription: '',
    post,
    token: req.query.token || ''
  });
});

// POST /admin/posts/:id/edit — update a post
app.post('/admin/posts/:id/edit', requireAdmin, upload.single('image'), (req, res) => {
  try {
    const allPosts = loadPosts();
    const idx = allPosts.posts.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.redirect('/admin');
    const { title, content, tags, author } = req.body;
    if (!title || !content) {
      return res.redirect(`/admin/posts/${req.params.id}/edit?error=Title and content are required`);
    }
    allPosts.posts[idx].title = title;
    allPosts.posts[idx].content = content;
    allPosts.posts[idx].excerpt = content.replace(/<[^>]*>/g, '').substring(0, 200).replace(/\s+\S*$/, '') + '...';
    allPosts.posts[idx].author = author || 'Knowledgepie Team';
    allPosts.posts[idx].tags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (req.file) {
      // Delete old image
      const oldImg = allPosts.posts[idx].image;
      if (oldImg && oldImg.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, 'public', oldImg);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      allPosts.posts[idx].image = `/uploads/${req.file.filename}`;
    }
    savePosts(allPosts);
    const token = req.query.token || '';
    res.redirect(`/admin?token=${token}&success=Post updated successfully!`);
  } catch (err) {
    res.redirect(`/admin?token=${req.query.token}&error=${encodeURIComponent(err.message)}`);
  }
});

// ──────────────────────────────────────────────
// SEO
// ──────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: ${sharedLocals.baseUrl}/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  const allPosts = loadPosts();
  const staticPages = ['/', '/about', '/team', '/news', '/media', '/investors', '/contact'];
  const urls = staticPages.map(p => {
    const lastmod = new Date().toISOString().split('T')[0];
    return `
  <url><loc>${sharedLocals.baseUrl}${p}</loc><lastmod>${lastmod}</lastmod><changefreq>${p === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`;
  }).join('');
  const postUrls = allPosts.posts.map(p => {
    return `
  <url><loc>${sharedLocals.baseUrl}/news/${p.slug}</loc><lastmod>${p.date}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`;
  }).join('');
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}${postUrls}
</urlset>`);
});

// ─── 404 ───
app.use((req, res) => {
  res.status(404).render('404', {
    ...sharedLocals, page: '404',
    pageTitle: 'Page Not Found — Knowledgepie',
    pageDescription: 'The page you are looking for does not exist.'
  });
});

// ─── Error handler ───
app.use((err, req, res, next) => {
  // Only handle actual errors (not when next() is called without error)
  if (!err) return next();
  
  // Multer errors
  if (err instanceof multer.MulterError) {
    if (!res.headersSent) return res.status(400).send(`Upload error: ${err.message}`);
    return;
  }
  
  // Generic error
  console.error('Server error:', err.message);
  if (!res.headersSent) {
    return res.status(500).send('Something went wrong. Please try again.');
  }
});

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`⚡ Knowledgepie site running at http://localhost:${PORT}`);
  console.log(`   📰 News: http://localhost:${PORT}/news`);
  console.log(`   🔐 Admin: http://localhost:${PORT}/admin`);
  console.log(`   ⚙️  Admin password: ${ADMIN_PASSWORD}`);
});
