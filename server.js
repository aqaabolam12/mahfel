const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── FILE-BASED STORAGE ──────────────────────────────────────────────────────
// Railway persistent volume at /data, fallback to local
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const DB_FILE = path.join(DATA_DIR, 'db.json');
console.log('DB path:', DB_FILE);

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch(e) {}
  return { users: {}, servers: {}, messages: {}, roles: {} };
}

function saveDB() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch(e) {}
}

let db = loadDB();
if (!db.users)    db.users = {};
if (!db.servers)  db.servers = {};
if (!db.messages) db.messages = {};
if (!db.roles)    db.roles = {};

// ─── DEFAULT SERVER ──────────────────────────────────────────────────────────
if (!db.servers['default']) {
  db.servers['default'] = {
    id: 'default', name: '🏠 محفل اصلی', icon: '🏠', ownerId: null,
    channels: [
      { id: 'general', name: 'عمومی',      type: 'text',  serverId: 'default' },
      { id: 'music',   name: 'موزیک',      type: 'text',  serverId: 'default' },
      { id: 'vc-main', name: 'ویس عمومی', type: 'voice', serverId: 'default' },
    ],
    members: [],
  };
  db.messages['general'] = [];
  db.messages['music']   = [];
  saveDB();
}

// ─── IN-MEMORY ONLY ──────────────────────────────────────────────────────────
const tokens     = {};  // { token: userId }
const voiceRooms = {};  // { channelId: [ {id,username,avatar,color,muted} ] }
const onlineSockets = {}; // { userId: socketId }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function sanitize(u) {
  return { id: u.id, username: u.username, avatar: u.avatar, color: u.color,
           status: u.status, bio: u.bio || '', role: u.role || 'member' };
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const uid = tokens[token];
  if (!uid) return res.json({ ok: false, msg: 'لاگین نیست' });
  req.userId = uid;
  next();
}

function getServerRole(serverId, userId) {
  const srv = db.servers[serverId];
  if (!srv) return 'member';
  if (srv.ownerId === userId) return 'owner';
  const member = srv.members.find(m => m.id === userId);
  return member?.role || 'member';
}

function canModerate(serverId, userId) {
  const role = getServerRole(serverId, userId);
  return ['owner','admin','mod'].includes(role);
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password?.trim())
    return res.json({ ok: false, msg: 'نام‌کاربری و رمز الزامیه' });
  if (Object.values(db.users).find(u => u.username.toLowerCase() === username.toLowerCase()))
    return res.json({ ok: false, msg: 'این نام‌کاربری قبلاً ثبت شده' });
  const id = uuidv4();
  const hash = await bcrypt.hash(password, 10);
  const colors = ['#7c6af7','#a855f7','#22c55e','#06b6d4','#f59e0b','#ef4444','#ec4899','#3b82f6'];
  db.users[id] = { id, username: username.trim(), password: hash,
    avatar: username.trim()[0].toUpperCase(),
    color: colors[Object.keys(db.users).length % colors.length],
    status: 'آنلاین', bio: '', role: 'member' };
  saveDB();
  const token = uuidv4();
  tokens[token] = id;
  res.json({ ok: true, token, user: sanitize(db.users[id]) });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = Object.values(db.users).find(u => u.username.toLowerCase() === username?.toLowerCase());
  if (!user) return res.json({ ok: false, msg: 'کاربر پیدا نشد' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ ok: false, msg: 'رمز اشتباهه' });
  const token = uuidv4();
  tokens[token] = user.id;
  res.json({ ok: true, token, user: sanitize(user) });
});

// ─── SERVERS ──────────────────────────────────────────────────────────────────
app.get('/api/servers', authMiddleware, (req, res) => {
  const all = Object.values(db.servers).filter(s =>
    s.id === 'default' || s.members.find(m => m.id === req.userId)
  );
  res.json({ ok: true, servers: all });
});

app.post('/api/servers', authMiddleware, (req, res) => {
  const { name, icon, iconUrl } = req.body;
  if (!name?.trim()) return res.json({ ok: false, msg: 'اسم سرور الزامیه' });
  const id = uuidv4();
  const genId = uuidv4();
  db.servers[id] = {
    id, name: name.trim(), icon: icon || '🌟', iconUrl: iconUrl || null,
    ownerId: req.userId,
    channels: [{ id: genId, name: 'عمومی', type: 'text', serverId: id }],
    members: [{ id: req.userId, role: 'owner' }],
  };
  db.messages[genId] = [];
  saveDB();
  res.json({ ok: true, server: db.servers[id] });
});

app.post('/api/servers/:id/join', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false, msg: 'سرور پیدا نشد' });
  if (!s.members.find(m => m.id === req.userId))
    s.members.push({ id: req.userId, role: 'member' });
  saveDB();
  res.json({ ok: true, server: s });
});

app.post('/api/servers/:id/channels', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false, msg: 'سرور نیست' });
  const { name, type } = req.body;
  const ch = { id: uuidv4(), name: name.trim(), type: type || 'text', serverId: s.id };
  s.channels.push(ch);
  db.messages[ch.id] = [];
  if (type === 'voice') voiceRooms[ch.id] = [];
  saveDB();
  io.to(`server:${s.id}`).emit('channel_created', ch);
  res.json({ ok: true, channel: ch });
});

// ─── ROLES ────────────────────────────────────────────────────────────────────
app.post('/api/servers/:id/members/:uid/role', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false, msg: 'سرور نیست' });
  const myRole = getServerRole(req.params.id, req.userId);
  if (!['owner','admin'].includes(myRole)) return res.json({ ok: false, msg: 'دسترسی نداری' });
  const { role } = req.body; // admin | mod | member
  const member = s.members.find(m => m.id === req.params.uid);
  if (!member) return res.json({ ok: false, msg: 'کاربر نیست' });
  if (role === 'owner') return res.json({ ok: false, msg: 'نمیتونی owner بدی' });
  member.role = role;
  saveDB();
  io.emit('role_update', { serverId: s.id, userId: req.params.uid, role });
  res.json({ ok: true });
});

// ─── KICK / BAN ───────────────────────────────────────────────────────────────
app.post('/api/servers/:id/members/:uid/kick', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s || !canModerate(req.params.id, req.userId))
    return res.json({ ok: false, msg: 'دسترسی نداری' });
  s.members = s.members.filter(m => m.id !== req.params.uid);
  saveDB();
  const targetSocket = onlineSockets[req.params.uid];
  if (targetSocket) io.to(targetSocket).emit('kicked', { serverId: s.id });
  io.to(`server:${s.id}`).emit('member_kicked', { userId: req.params.uid, serverId: s.id });
  res.json({ ok: true });
});

app.post('/api/servers/:id/members/:uid/ban', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s || !canModerate(req.params.id, req.userId))
    return res.json({ ok: false, msg: 'دسترسی نداری' });
  s.members = s.members.filter(m => m.id !== req.params.uid);
  if (!s.banned) s.banned = [];
  s.banned.push(req.params.uid);
  saveDB();
  const targetSocket = onlineSockets[req.params.uid];
  if (targetSocket) io.to(targetSocket).emit('banned', { serverId: s.id });
  res.json({ ok: true });
});

// ─── PROFILE ──────────────────────────────────────────────────────────────────
app.patch('/api/users/me', authMiddleware, (req, res) => {
  const u = db.users[req.userId];
  if (!u) return res.json({ ok: false });
  const { bio, status, theme, avatarUrl } = req.body;
  if (bio      !== undefined) u.bio      = bio;
  if (status   !== undefined) u.status   = status;
  if (theme    !== undefined) u.theme    = theme;
  if (avatarUrl!== undefined) u.avatarUrl= avatarUrl;
  saveDB();
  res.json({ ok: true, user: sanitize(u) });
});

app.get('/api/servers/:id/members', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  
  // Auto-add requester to default server
  if (s.id === 'default' && !s.members.find(m => m.id === req.userId)) {
    s.members.push({ id: req.userId, role: 'member' });
    saveDB();
  }
  
  const members = s.members.map(m => {
    const u = db.users[m.id];
    if (!u) return null;
    const customRoles = (s.roles || []).filter(r => m.roles?.includes(r.id));
    return { 
      ...sanitize(u), 
      serverRole: m.role,
      roles: m.roles || [],
      customRoles,
      nickname: m.nickname || null,
    };
  }).filter(Boolean);
  res.json({ ok: true, members });
});


// ─── SERVER ROLES MANAGEMENT ─────────────────────────────────────────────────
app.get('/api/servers/:id/roles', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  res.json({ ok: true, roles: s.roles || [] });
});

app.post('/api/servers/:id/roles', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  // For default server, first user becomes owner
  if (s.id === 'default' && !s.ownerId) {
    s.ownerId = req.userId;
    let m = s.members.find(m => m.id === req.userId);
    if (!m) s.members.push({ id: req.userId, role: 'owner' });
    else m.role = 'owner';
    saveDB();
  }
  if (!['owner','admin'].includes(getServerRole(req.params.id, req.userId)))
    return res.json({ ok: false, msg: 'دسترسی نداری — فقط owner یا admin میتونه رول بسازه' });
  const { name, color, permissions } = req.body;
  if (!s.roles) s.roles = [];
  const role = { id: uuidv4(), name, color: color||'#7c6af7', permissions: permissions||[] };
  s.roles.push(role);
  saveDB();
  io.to(`server:${s.id}`).emit('roles_updated', { serverId: s.id, roles: s.roles });
  res.json({ ok: true, role });
});

app.delete('/api/servers/:id/roles/:roleId', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  if (!['owner','admin'].includes(getServerRole(req.params.id, req.userId)))
    return res.json({ ok: false, msg: 'دسترسی نداری' });
  s.roles = (s.roles||[]).filter(r => r.id !== req.params.roleId);
  // Remove role from all members
  s.members.forEach(m => {
    if (m.roles) m.roles = m.roles.filter(r => r !== req.params.roleId);
  });
  saveDB();
  res.json({ ok: true });
});

app.post('/api/servers/:id/members/:uid/assign-role', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  if (!canModerate(req.params.id, req.userId))
    return res.json({ ok: false, msg: 'دسترسی نداری' });
  const member = s.members.find(m => m.id === req.params.uid);
  if (!member) return res.json({ ok: false, msg: 'کاربر نیست' });
  const { roleId } = req.body;
  if (!member.roles) member.roles = [];
  if (!member.roles.includes(roleId)) member.roles.push(roleId);
  saveDB();
  io.emit('member_role_assigned', { serverId: s.id, userId: req.params.uid, roleId });
  res.json({ ok: true });
});

// ─── SERVER PROFILE (avatar per server) ──────────────────────────────────────
app.post('/api/servers/:id/profile', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  let member = s.members.find(m => m.id === req.userId);
  // Auto-add to default server if not member
  if (!member) {
    member = { id: req.userId, role: 'member' };
    s.members.push(member);
    saveDB();
  }
  const { nickname, avatarColor } = req.body;
  if (nickname !== undefined) member.nickname = nickname;
  if (avatarColor !== undefined) member.avatarColor = avatarColor;
  saveDB();
  res.json({ ok: true });
});

// ─── MOVE USER TO VOICE CHANNEL ───────────────────────────────────────────────
app.post('/api/servers/:id/members/:uid/move', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  if (!canModerate(req.params.id, req.userId))
    return res.json({ ok: false, msg: 'دسترسی نداری' });
  const { channelId } = req.body;
  const targetSocket = onlineSockets[req.params.uid];
  if (targetSocket) {
    io.to(targetSocket).emit('force_move', { channelId, serverName: s.name });
    res.json({ ok: true });
  } else {
    res.json({ ok: false, msg: 'کاربر آنلاین نیست' });
  }
});

// ─── VERSION ENDPOINT ─────────────────────────────────────────────────────────
app.get('/api/version', (req, res) => {
  res.json({ version: '1.0.0', name: 'محفل' });
});


// ─── DELETE SERVER ────────────────────────────────────────────────────────────
app.delete('/api/servers/:id', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false, msg: 'سرور نیست' });
  if (s.id === 'default') return res.json({ ok: false, msg: 'سرور اصلی رو نمیشه حذف کرد' });
  if (s.ownerId !== req.userId) return res.json({ ok: false, msg: 'فقط owner میتونه سرور رو حذف کنه' });
  // Delete server channels messages
  s.channels.forEach(ch => delete db.messages[ch.id]);
  delete db.servers[s.id];
  saveDB();
  io.to(`server:${s.id}`).emit('server_deleted', { serverId: s.id });
  res.json({ ok: true });
});

// ─── DISCONNECT USER FROM VOICE ───────────────────────────────────────────────
app.post('/api/servers/:id/members/:uid/disconnect-voice', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  if (!canModerate(req.params.id, req.userId))
    return res.json({ ok: false, msg: 'دسترسی نداری' });
  const targetSocket = onlineSockets[req.params.uid];
  if (targetSocket) {
    io.to(targetSocket).emit('force_disconnect_voice', {});
    res.json({ ok: true });
  } else {
    res.json({ ok: false, msg: 'کاربر توی ویس نیست' });
  }
});

// ─── UPDATE SERVER ICON ───────────────────────────────────────────────────────
app.patch('/api/servers/:id', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  if (!['owner','admin'].includes(getServerRole(req.params.id, req.userId)))
    return res.json({ ok: false, msg: 'دسترسی نداری' });
  const { name, icon, iconUrl } = req.body;
  if (name) s.name = name;
  if (icon) s.icon = icon;
  if (iconUrl !== undefined) s.iconUrl = iconUrl;
  saveDB();
  io.to(`server:${s.id}`).emit('server_updated', { serverId: s.id, name: s.name, icon: s.icon, iconUrl: s.iconUrl });
  res.json({ ok: true, server: s });
});


// ─── DELETE CHANNEL ───────────────────────────────────────────────────────────
app.delete('/api/servers/:id/channels/:chId', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  if (!['owner','admin'].includes(getServerRole(req.params.id, req.userId)))
    return res.json({ ok: false, msg: 'دسترسی نداری' });
  s.channels = s.channels.filter(c => c.id !== req.params.chId);
  delete db.messages[req.params.chId];
  saveDB();
  io.to(`server:${s.id}`).emit('channel_deleted', { channelId: req.params.chId, serverId: s.id });
  res.json({ ok: true });
});

// ─── CLEAR MESSAGES ───────────────────────────────────────────────────────────
app.post('/api/servers/:id/clear-messages', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  if (!['owner','admin'].includes(getServerRole(req.params.id, req.userId)))
    return res.json({ ok: false, msg: 'دسترسی نداری' });
  s.channels.forEach(ch => { db.messages[ch.id] = []; });
  saveDB();
  res.json({ ok: true });
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const uid = tokens[token];
  if (!uid) return next(new Error('auth'));
  socket.userId = uid;
  next();
});

io.on('connection', socket => {
  const user = db.users[socket.userId];
  if (!user) return;
  onlineSockets[socket.userId] = socket.id;
  console.log(`✅ ${user.username} وصل شد`);

  socket.join(`server:default`);
  socket.join(`channel:general`);

  Object.values(db.servers).forEach(s => {
    if (s.members.find(m => m.id === socket.userId)) socket.join(`server:${s.id}`);
  });

  io.emit('user_online', sanitize(user));

  // ── Text message ─────────────────────────────────────────────────────────
  socket.on('message', ({ channelId, text }) => {
    if (!text?.trim()) return;
    const msg = {
      id: uuidv4(), userId: socket.userId,
      username: user.username, avatar: user.avatar, color: user.color,
      text: text.trim(), time: new Date().toISOString(),
    };
    if (!db.messages[channelId]) db.messages[channelId] = [];
    db.messages[channelId].push(msg);
    if (db.messages[channelId].length > 200) db.messages[channelId] = db.messages[channelId].slice(-200);
    saveDB();
    io.to(`channel:${channelId}`).emit('message', { channelId, msg });
  });

  socket.on('join_channel', ({ channelId }) => {
    [...socket.rooms].forEach(r => { if (r.startsWith('channel:')) socket.leave(r); });
    socket.join(`channel:${channelId}`);
    socket.emit('history', { channelId, messages: (db.messages[channelId] || []).slice(-100) });
  });

  socket.on('join_server', ({ serverId }) => {
    socket.join(`server:${serverId}`);
  });

  // ── Voice ─────────────────────────────────────────────────────────────────
  socket.on('join_voice', ({ channelId }) => {
    // Leave old voice rooms
    Object.keys(voiceRooms).forEach(cid => {
      if (voiceRooms[cid].find(u => u.id === socket.userId)) {
        voiceRooms[cid] = voiceRooms[cid].filter(u => u.id !== socket.userId);
        socket.leave(`voice:${cid}`);
        io.emit('voice_update', { channelId: cid, users: voiceRooms[cid] });
      }
    });
    
    if (!voiceRooms[channelId]) voiceRooms[channelId] = [];
    
    // Get existing users BEFORE adding new one
    const existingUsers = [...voiceRooms[channelId]];
    
    // Add new user
    voiceRooms[channelId].push({ ...sanitize(user), muted: false, speaking: false });
    socket.currentVoice = channelId;
    socket.join(`voice:${channelId}`);
    
    // Update everyone
    io.emit('voice_update', { channelId, users: voiceRooms[channelId] });
    
    // Tell existing users about new joiner (they initiate offer)
    existingUsers.forEach(existingUser => {
      const existingSocket = onlineSockets[existingUser.id];
      if (existingSocket) {
        io.to(existingSocket).emit('voice_user_joined', { 
          user: sanitize(user), 
          socketId: socket.id 
        });
      }
    });
    
    // Tell new user who's already there (so they can receive)
    socket.emit('voice_existing_users', { 
      users: existingUsers.map(u => ({
        user: u,
        socketId: onlineSockets[u.id]
      })).filter(x => x.socketId)
    });
  });

  socket.on('leave_voice', ({ channelId }) => {
    if (voiceRooms[channelId]) {
      voiceRooms[channelId] = voiceRooms[channelId].filter(u => u.id !== socket.userId);
      io.emit('voice_update', { channelId, users: voiceRooms[channelId] });
    }
    socket.leave(`voice:${channelId}`);
    socket.currentVoice = null;
  });

  socket.on('voice_speaking', ({ channelId, speaking }) => {
    if (voiceRooms[channelId]) {
      const u = voiceRooms[channelId].find(u => u.id === socket.userId);
      if (u) u.speaking = speaking;
      io.to(`voice:${channelId}`).emit('voice_speaking', { userId: socket.userId, speaking });
    }
  });

  socket.on('voice_mute', ({ channelId, muted }) => {
    if (voiceRooms[channelId]) {
      const u = voiceRooms[channelId].find(u => u.id === socket.userId);
      if (u) u.muted = muted;
      io.to(`voice:${channelId}`).emit('voice_update', { channelId, users: voiceRooms[channelId] });
    }
  });

  // WebRTC
  socket.on('rtc_offer',     ({ to, offer })     => io.to(to).emit('rtc_offer',     { from: socket.id, offer }));
  socket.on('rtc_answer',    ({ to, answer })    => io.to(to).emit('rtc_answer',    { from: socket.id, answer }));
  socket.on('rtc_candidate', ({ to, candidate }) => io.to(to).emit('rtc_candidate', { from: socket.id, candidate }));

  // Typing
  socket.on('typing', ({ channelId }) => {
    socket.to(`channel:${channelId}`).emit('typing', { username: user.username, channelId });
  });


  // Bot Music - Jamendo API (free, full tracks, no time limit)
  socket.on('bot_search', ({ query, channelId, username }) => {
    const https = require('https');
    const encoded = encodeURIComponent(query);
    // Jamendo free API - full tracks
    const apiUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=5&namesearch=${encoded}&audioformat=mp32&include=musicinfo`;
    
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (!result.results || !result.results.length) {
            // Fallback to iTunes if Jamendo has no results
            const iTunesUrl = `https://itunes.apple.com/search?term=${encoded}&media=music&limit=5`;
            https.get(iTunesUrl, (res2) => {
              let d2 = '';
              res2.on('data', c => d2 += c);
              res2.on('end', () => {
                try {
                  const r2 = JSON.parse(d2);
                  if (!r2.results?.length) {
                    io.to(`channel:${channelId}`).emit('bot_message', { text: `❌ نتیجه‌ای برای «${query}» پیدا نشد` });
                    return;
                  }
                  const t = r2.results[0];
                  io.to(`channel:${channelId}`).emit('bot_play', {
                    title: `${t.trackName} — ${t.artistName} (30s)`,
                    url: t.previewUrl, requestedBy: username
                  });
                } catch(e) { io.to(`channel:${channelId}`).emit('bot_message', { text: '❌ خطا' }); }
              });
            }).on('error', () => io.to(`channel:${channelId}`).emit('bot_message', { text: '❌ خطا در اتصال' }));
            return;
          }
          const track = result.results[0];
          const audioUrl = track.audio || track.audiodownload;
          if (!audioUrl) {
            io.to(`channel:${channelId}`).emit('bot_message', { text: `❌ فایل صوتی پیدا نشد` });
            return;
          }
          const title = `${track.name} — ${track.artist_name}`;
          io.to(`channel:${channelId}`).emit('bot_play', { title, url: audioUrl, requestedBy: username });
        } catch(e) {
          io.to(`channel:${channelId}`).emit('bot_message', { text: '❌ خطا در جستجو' });
        }
      });
    }).on('error', () => {
      io.to(`channel:${channelId}`).emit('bot_message', { text: '❌ خطا در اتصال' });
    });
  });

  socket.on('bot_play_url', ({ url, channelId, username }) => {
    const title = decodeURIComponent(url.split('/').pop() || 'آهنگ');
    io.to(`channel:${channelId}`).emit('bot_play', { title, url, requestedBy: username });
  });

  socket.on('bot_command', ({ cmd, channelId }) => {
    if (cmd === 'stop') io.to(`channel:${channelId}`).emit('bot_stop');
    if (cmd === 'skip') io.to(`channel:${channelId}`).emit('bot_skip');
  });


// ─── AUDIO RELAY (fallback when WebRTC fails) ────────────────────────────────
const audioRooms = {}; // { channelId: { socketId: buffer } }

socket.on('audio_chunk', ({ channelId, chunk }) => {
  // Relay audio chunk to all others in voice channel
  socket.to(`voice:${channelId}`).emit('audio_chunk', {
    from: socket.id,
    userId: socket.userId,
    chunk
  });
});

socket.on('rtc_state', ({ to, state }) => {
  // Tell server about connection state for fallback
  if (state === 'failed' || state === 'disconnected') {
    io.to(to).emit('use_relay', { from: socket.id });
  }
});

  // Ping check - respond immediately
  socket.on('ping_check', (sentAt) => {
    socket.emit('pong_check', sentAt);
  });

  // Disconnect
  socket.on('disconnect', () => {
    delete onlineSockets[socket.userId];
    if (socket.currentVoice && voiceRooms[socket.currentVoice]) {
      voiceRooms[socket.currentVoice] = voiceRooms[socket.currentVoice].filter(u => u.id !== socket.userId);
      io.emit('voice_update', { channelId: socket.currentVoice, users: voiceRooms[socket.currentVoice] });
    }
    io.emit('user_offline', { id: socket.userId });
    console.log(`❌ ${user.username} قطع شد`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 محفل روی http://localhost:${PORT}`));

// این خط آخر فایله — bot search handler در socket.io اضافه میشه
