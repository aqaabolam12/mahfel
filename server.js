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
const DB_FILE = path.join(__dirname, 'db.json');

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
  const { name, icon } = req.body;
  if (!name?.trim()) return res.json({ ok: false, msg: 'اسم سرور الزامیه' });
  const id = uuidv4();
  const genId = uuidv4();
  db.servers[id] = {
    id, name: name.trim(), icon: icon || '🌟', ownerId: req.userId,
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
  const { bio, status, theme } = req.body;
  if (bio    !== undefined) u.bio    = bio;
  if (status !== undefined) u.status = status;
  if (theme  !== undefined) u.theme  = theme;
  saveDB();
  res.json({ ok: true, user: sanitize(u) });
});

app.get('/api/servers/:id/members', authMiddleware, (req, res) => {
  const s = db.servers[req.params.id];
  if (!s) return res.json({ ok: false });
  const members = s.members.map(m => {
    const u = db.users[m.id];
    if (!u) return null;
    return { ...sanitize(u), serverRole: m.role };
  }).filter(Boolean);
  res.json({ ok: true, members });
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
    Object.keys(voiceRooms).forEach(cid => {
      if (voiceRooms[cid].find(u => u.id === socket.userId)) {
        voiceRooms[cid] = voiceRooms[cid].filter(u => u.id !== socket.userId);
        socket.leave(`voice:${cid}`);
        io.emit('voice_update', { channelId: cid, users: voiceRooms[cid] });
      }
    });
    if (!voiceRooms[channelId]) voiceRooms[channelId] = [];
    voiceRooms[channelId].push({ ...sanitize(user), muted: false, speaking: false });
    socket.currentVoice = channelId;
    socket.join(`voice:${channelId}`);
    io.emit('voice_update', { channelId, users: voiceRooms[channelId] });
    socket.to(`voice:${channelId}`).emit('voice_user_joined', { user: sanitize(user), socketId: socket.id });
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


  // Bot Music - iTunes API (no external deps needed)
  socket.on('bot_search', ({ query, channelId, username }) => {
    const https = require('https');
    const encoded = encodeURIComponent(query);
    const apiUrl = `https://itunes.apple.com/search?term=${encoded}&media=music&limit=5`;
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (!result.results || !result.results.length) {
            io.to(`channel:${channelId}`).emit('bot_message', { text: `❌ نتیجه‌ای برای «${query}» پیدا نشد` });
            return;
          }
          const track = result.results[0];
          const title = `${track.trackName} — ${track.artistName}`;
          if (!track.previewUrl) {
            io.to(`channel:${channelId}`).emit('bot_message', { text: `❌ پیش‌نمایش موجود نیست` });
            return;
          }
          io.to(`channel:${channelId}`).emit('bot_play', { title, url: track.previewUrl, requestedBy: username });
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
