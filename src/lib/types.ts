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
  polygon: { lat: number; lon: number }[] | null;
}
