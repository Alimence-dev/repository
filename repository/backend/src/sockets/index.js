const jwt = require('jsonwebtoken');

// Client emits 'join' with its JWT right after connecting; we verify it and put the
// socket in a per-user room so notifyUserWithEmail() can target that user directly.
module.exports = function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join', (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.join(`user:${decoded.user_id}`);
      } catch (err) {
        // Invalid/expired token - socket just won't receive targeted notifications.
      }
    });
  });
};
