import { useEffect, useState } from 'react';

export type Route =
  | 'dashboard'
  | 'tasks'
  | 'bills'
  | 'appointments'
  | 'documents'
  | 'calendar'
  | 'ai-chat'
  | 'notifications'
  | 'opportunities'
  | 'analytics'
  | 'profile';

const validRoutes: Route[] = [
  'dashboard', 'tasks', 'bills', 'appointments', 'documents',
  'calendar', 'ai-chat', 'notifications', 'opportunities', 'analytics', 'profile',
];

export function getRouteFromHash(): Route {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  if (validRoutes.includes(hash as Route)) return hash as Route;
  return 'dashboard';
}

export function navigate(route: Route) {
  window.location.hash = `/${route}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(getRouteFromHash());
  useEffect(() => {
    const handler = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}
