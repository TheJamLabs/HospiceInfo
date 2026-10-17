export type Nation = 'en' | 'sc' | 'wales' | 'ni';

export interface Hospice {
  id: string;
  name: string;
  town: string;
  postcode: string;
  lat: number | null;
  lon: number | null;
  color: string;
  kind: 'published' | 'approx';
  source: string;
  website: string;
  cqcUrl: string;
  curated: boolean;
  nation: Nation;
}

export interface Practice {
  id: string;
  name: string;
  address: string[];
  postcode: string;
  lat: number | null;
  lon: number | null;
  nation: Nation;
  hospiceId: string | null;
}

export interface Catchment {
  hospiceId: string;
  name: string;
  nation: Nation;
  kind: 'published' | 'approx';
  curated: boolean;
  practiceCount: number;
  // One or more rings (Voronoi-derived; multi-ring = union of cells).
  polygons: { lat: number; lon: number }[][];
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  postcode: string | null;
  lat: number;
  lon: number;
  hospiceId: string;
  // True when the shop sits outside its own hospice's catchment polygon.
  outsideCatchment: boolean;
  source: string;
}
