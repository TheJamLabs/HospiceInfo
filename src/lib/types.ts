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
}

export interface Practice {
  id: number;
  name: string;
  address: string[];
  postcode: string;
  lat: number | null;
  lon: number | null;
  outcode: string;
  hospiceId: string | null;
}

export interface Catchment {
  hospiceId: string;
  name: string;
  kind: 'published' | 'approx';
  outcodes: string[];
  practiceCount: number;
  // One or more rings (Voronoi-derived; multi-ring = union of cells).
  polygons: { lat: number; lon: number }[][] | null;
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
