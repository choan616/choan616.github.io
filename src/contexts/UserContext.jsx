import React, { useState, useMemo } from 'react';
import { UserContext } from './userContextObject';

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
    }), [currentUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}