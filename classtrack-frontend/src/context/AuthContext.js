/**
 * Authentication Context
 * Manages global auth state
 */

import React from 'react';

const AuthContext = React.createContext({
  user: null,
  token: null,
  setUser: () => {},
  setToken: () => {},
});

export default AuthContext;
