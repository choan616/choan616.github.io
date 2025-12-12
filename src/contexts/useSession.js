import { useContext } from 'react';
import { SessionContext } from './sessionContextObject';

/**
 * Custom hook to access the session context.
 */
export function useSession() {
  return useContext(SessionContext);
}