// ═══════════════════════════════════════════════════════════════════════════
//  GapHub — SERVER PATCH  (paste این کد رو داخل io.on('connection'...) بذار
//  دقیقاً بعد از socket.on('message',...) بلاک اصلی
// ═══════════════════════════════════════════════════════════════════════════

// ── پاک کردن پیام (فقط خود کاربر یا ادمین) ─────────────────────────────────
  socket.on('delete_message', ({ channelId, msgId }) => {
    const msgs = db.messages[channelId];
    if (!msgs) return;
    const idx = msgs.findIndex(m => m.id === msgId);
    if (idx === -1) return;
    const msg = msgs[idx];
    // فقط خود کاربر یا mod/admin/owner می‌تونن پاک کنن
    const serverId = Object.keys(db.servers).find(sid =>
      db.servers[sid].channels.some(c => c.id === channelId)
    );
    const isOwner = msg.userId === socket.userId;
    const isMod = serverId ? canModerate(serverId, socket.userId) : false;
    if (!isOwner && !isMod) return;
    msgs.splice(idx, 1);
    saveDB();
    io.to(`channel:${channelId}`).emit('message_deleted', { channelId, msgId });
  });

// ── ویرایش پیام (فقط خود کاربر) ────────────────────────────────────────────
  socket.on('edit_message', ({ channelId, msgId, newText }) => {
    if (!newText?.trim()) return;
    const msgs = db.messages[channelId];
    if (!msgs) return;
    const msg = msgs.find(m => m.id === msgId);
    if (!msg || msg.userId !== socket.userId) return;
    msg.text = newText.trim();
    msg.edited = true;
    msg.editTime = new Date().toISOString();
    saveDB();
    io.to(`channel:${channelId}`).emit('message_edited', { channelId, msgId, newText: msg.text, edited: true });
  });

// ── ری‌اکشن روی پیام ────────────────────────────────────────────────────────
  socket.on('react', ({ channelId, msgId, emoji }) => {
    const msgs = db.messages[channelId];
    if (!msgs) return;
    const msg = msgs.find(m => m.id === msgId);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = {};
    if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
    const arr = msg.reactions[emoji];
    const pos = arr.indexOf(socket.userId);
    if (pos === -1) arr.push(socket.userId);
    else arr.splice(pos, 1); // toggle
    if (arr.length === 0) delete msg.reactions[emoji];
    saveDB();
    io.to(`channel:${channelId}`).emit('reaction_update', { channelId, msgId, reactions: msg.reactions });
  });

// ── آپلود فایل / تصویر در چت ───────────────────────────────────────────────
  socket.on('file_message', ({ channelId, fileData, fileName, fileType, text }) => {
    if (!fileData) return;
    // محدودیت حجم: 5MB
    if (fileData.length > 7_000_000) {
      socket.emit('upload_error', { msg: 'فایل بیشتر از 5MB نمی‌تونی بفرستی' });
      return;
    }
    const msg = {
      id: uuidv4(), userId: socket.userId,
      username: user.username, avatar: user.avatar, color: user.color,
      text: text?.trim() || '', time: new Date().toISOString(),
      file: { data: fileData, name: fileName, type: fileType },
    };
    if (!db.messages[channelId]) db.messages[channelId] = [];
    db.messages[channelId].push(msg);
    if (db.messages[channelId].length > 200) db.messages[channelId] = db.messages[channelId].slice(-200);
    saveDB();
    io.to(`channel:${channelId}`).emit('message', { channelId, msg });
  });

// ── جستجوی پیام‌ها ──────────────────────────────────────────────────────────
  socket.on('search_messages', ({ channelId, query }) => {
    if (!query?.trim()) return;
    const msgs = db.messages[channelId] || [];
    const q = query.toLowerCase();
    const results = msgs.filter(m => m.text?.toLowerCase().includes(q)).slice(-50);
    socket.emit('search_results', { channelId, query, results });
  });

// ── Voice effect (relay به بقیه) ─────────────────────────────────────────────
  socket.on('voice_effect', ({ channelId, effect }) => {
    // فقط اطلاع می‌ده که این کاربر چه افکتی داره
    // پردازش صدا کاملاً روی کلاینت‌ها انجام می‌شه
    socket.to(`voice:${channelId}`).emit('user_voice_effect', {
      userId: socket.userId,
      effect
    });
  });

// ═══════════════════════════════════════════════════════════════════════════
//  همچنین این endpoint رو به بخش REST API اضافه کن (خارج از io.on):
// ═══════════════════════════════════════════════════════════════════════════
/*
app.get('/api/servers/:id/search', authMiddleware, (req, res) => {
  const q = req.query.q?.toLowerCase();
  if (!q) return res.json({ ok: false });
  const srv = db.servers[req.params.id];
  if (!srv) return res.json({ ok: false });
  const results = [];
  srv.channels.forEach(ch => {
    const msgs = (db.messages[ch.id] || [])
      .filter(m => m.text?.toLowerCase().includes(q))
      .map(m => ({ ...m, channelId: ch.id, channelName: ch.name }));
    results.push(...msgs);
  });
  results.sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json({ ok: true, results: results.slice(0, 50) });
});
*/
