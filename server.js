const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-Memory DB ───────────────────────────────────────────────────────────
const users = {};       // { userId: { id, username, password, avatar, status, bio } }
const servers = {};     // { serverId: { id, name, icon, ownerId, channels: [], members: [] } }
const messages = {};    // { channelId: [ ...msgs ] }
const voiceRooms = {};  // { channelId: [ ...userIds ] }
const tokens = {};      // { token: userId }

// Default server
const defaultServerId = 'default';
servers[defaultServerId] = {
  id: defaultServerId,
  name: '🏠 محفل اصلی',
  icon: '🏠',
  ownerId: null,
  channels: [
    { id: 'general', name: 'عمومی', type: 'text', serverId: defaultServerId },
    { id: 'music',   name: 'موزیک', type: 'text', serverId: defaultServerId },
    { id: 'vc-main', name: 'ویس عمومی', type: 'voice', serverId: defaultServerId },
  ],
  members: [],
};
messages['general'] = [];
messages['music']   = [];
voiceRooms['vc-main'] = [];

// ─── Auth API ────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ ok: false, msg: 'نام‌کاربری و رمز الزامیه' });
  if (Object.values(users).find(u => u.username === username))
    return res.json({ ok: false, msg: 'این نام‌کاربری قبلاً ثبت شده' });
  const id = uuidv4();
  const hash = await bcrypt.hash(password, 10);
  const colors = ['#7c6af7','#a855f7','#22c55e','#06b6d4','#f59e0b','#ef4444','#ec4899'];
  users[id] = { id, username, password: hash, avatar: username[0].toUpperCase(),
    color: colors[Math.floor(Math.random()*colors.length)], status: 'آنلاین', bio: '' };
  const token = uuidv4();
  tokens[token] = id;
  res.json({ ok: true, token, user: sanitize(users[id]) });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = Object.values(users).find(u => u.username === username);
  if (!user) return res.json({ ok: false, msg: 'کاربر پیدا نشد' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ ok: false, msg: 'رمز اشتباهه' });
  const token = uuidv4();
  tokens[token] = user.id;
  res.json({ ok: true, token, user: sanitize(user) });
});

function sanitize(u) {
  return { id: u.id, username: u.username, avatar: u.avatar, color: u.color, status: u.status, bio: u.bio };
}

// ─── Server API ──────────────────────────────────────────────────────────────
app.post('/api/servers', authMiddleware, (req, res) => {
  const { name, icon } = req.body;
  const id = uuidv4();
  const genId = uuidv4();
  servers[id] = {
    id, name, icon: icon || '🌟', ownerId: req.userId,
    channels: [
      { id: genId, name: 'عمومی', type: 'text', serverId: id },
    ],
    members: [req.userId],
  };
  messages[genId] = [];
  res.json({ ok: true, server: servers[id] });
});

app.get('/api/servers', authMiddleware, (req, res) => {
  const all = Object.values(servers).filter(s =>
    s.id === defaultServerId || s.members.includes(req.userId)
  );
  res.json({ ok: true, servers: all });
});

app.post('/api/servers/:id/join', authMiddleware, (req, res) => {
  const s = servers[req.params.id];
  if (!s) return res.json({ ok: false, msg: 'سرور پیدا نشد' });
  if (!s.members.includes(req.userId)) s.members.push(req.userId);
  res.json({ ok: true, server: s });
});

app.post('/api/servers/:id/channels', authMiddleware, (req, res) => {
  const s = servers[req.params.id];
  if (!s) return res.json({ ok: false, msg: 'سرور نیست' });
  const { name, type } = req.body;
  const ch = { id: uuidv4(), name, type: type || 'text', serverId: s.id };
  s.channels.push(ch);
  messages[ch.id] = [];
  if (type === 'voice') voiceRooms[ch.id] = [];
  io.to(`server:${s.id}`).emit('channel_created', ch);
  res.json({ ok: true, channel: ch });
});

app.patch('/api/users/me', authMiddleware, (req, res) => {
  const u = users[req.userId];
  if (!u) return res.json({ ok: false });
  const { bio, status } = req.body;
  if (bio !== undefined) u.bio = bio;
  if (status !== undefined) u.status = status;
  res.json({ ok: true, user: sanitize(u) });
});

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const uid = tokens[token];
  if (!uid) return res.json({ ok: false, msg: 'لاگین نیست' });
  req.userId = uid;
  next();
}

// ─── Socket.io ───────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const uid = tokens[token];
  if (!uid) return next(new Error('auth'));
  socket.userId = uid;
  next();
});

io.on('connection', socket => {
  const user = users[socket.userId];
  if (!user) return;
  console.log(`✅ ${user.username} وصل شد`);

  // join default server
  socket.join(`server:${defaultServerId}`);
  socket.join(`channel:general`);

  // join user's servers
  Object.values(servers).forEach(s => {
    if (s.members.includes(socket.userId)) socket.join(`server:${s.id}`);
  });

  // broadcast online
  io.emit('user_online', sanitize(user));

  // ── Text message ────────────────────────────────────────────────
  socket.on('message', ({ channelId, text }) => {
    if (!text?.trim()) return;
    const msg = {
      id: uuidv4(),
      userId: socket.userId,
      username: user.username,
      avatar: user.avatar,
      color: user.color,
      text: text.trim(),
      time: new Date().toISOString(),
    };
    if (!messages[channelId]) messages[channelId] = [];
    messages[channelId].push(msg);
    io.to(`channel:${channelId}`).emit('message', { channelId, msg });
  });

  // ── Join channel (text) ─────────────────────────────────────────
  socket.on('join_channel', ({ channelId }) => {
    // leave all channel rooms
    [...socket.rooms].forEach(r => { if (r.startsWith('channel:')) socket.leave(r); });
    socket.join(`channel:${channelId}`);
    // send history
    socket.emit('history', { channelId, messages: (messages[channelId] || []).slice(-100) });
  });

  // ── Voice ────────────────────────────────────────────────────────
  socket.on('join_voice', ({ channelId }) => {
    // leave old voice
    Object.keys(voiceRooms).forEach(cid => {
      voiceRooms[cid] = voiceRooms[cid].filter(u => u.id !== socket.userId);
      io.to(`server:${cid.split(':')[0]}`).emit('voice_update', { channelId: cid, users: voiceRooms[cid] });
    });
    if (!voiceRooms[channelId]) voiceRooms[channelId] = [];
    if (!voiceRooms[channelId].find(u => u.id === socket.userId)) {
      voiceRooms[channelId].push(sanitize(user));
    }
    socket.currentVoice = channelId;
    socket.join(`voice:${channelId}`);
    io.emit('voice_update', { channelId, users: voiceRooms[channelId] });

    // WebRTC signaling
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

  // WebRTC signals
  socket.on('rtc_offer',     ({ to, offer })     => io.to(to).emit('rtc_offer',     { from: socket.id, offer }));
  socket.on('rtc_answer',    ({ to, answer })    => io.to(to).emit('rtc_answer',    { from: socket.id, answer }));
  socket.on('rtc_candidate', ({ to, candidate }) => io.to(to).emit('rtc_candidate', { from: socket.id, candidate }));

  // ── Typing ───────────────────────────────────────────────────────
  socket.on('typing', ({ channelId }) => {
    socket.to(`channel:${channelId}`).emit('typing', { username: user.username, channelId });
  });

  // ── Join server room ─────────────────────────────────────────────
  socket.on('join_server', ({ serverId }) => {
    socket.join(`server:${serverId}`);
  });

  // ── Disconnect ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
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
