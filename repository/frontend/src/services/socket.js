import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (socket) return socket;

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  const socketUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

  socket = io(socketUrl);
  socket.on('connect', () => {
    socket.emit('join', token);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
