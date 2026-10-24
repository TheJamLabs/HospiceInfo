import { useEffect, useState } from 'react';

export type RouteId =
  | 'map'
  | 'feedback'
  | 'corrections'
  | 'about'
  | 'privacy'
  | 'licences'
  | 'accessibility';

const ROUTE_IDS: readonly RouteId[] = [
  'map',
  'feedback',
  'corrections',
  'about',
  'privacy',
  'licences',
  'accessibility',
];

function routeFromHash(hash: string): RouteId {
  const h = hash.replace(/^#\/?/, '');
  return (ROUTE_IDS as readonly string[]).includes(h) ? (h as RouteId) : 'map';
}

// ADR-0007: hash-based routing with no router library. window.location.hash is
// read once on mount, then on every hashchange. Known hashes map to their
// page; unknown or empty hashes fall back to the map page. The map is
// destroyed when another route is shown (it is only rendered while the route
// is 'map').
export function useRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() => routeFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => {
      setRoute(routeFromHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}
