import { createContext, useContext, useState } from 'react';
import { login as loginRequest, register as registerRequest, logout as logoutRequest, getCurrentUser } from '../services/authService';
import { disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser());

  async function login(email, password) {
    const loggedInUser = await loginRequest(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(fields) {
    const registeredUser = await registerRequest(fields);
    setUser(registeredUser);
    return registeredUser;
  }

  function logout() {
    logoutRequest();
    disconnectSocket();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
