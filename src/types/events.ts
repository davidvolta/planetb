export interface DisplacementEvent {
  occurred: boolean;
  animalId: string | null;
  fromX: number | null;
  fromY: number | null;
  toX: number | null;
  toY: number | null;
  timestamp: number | null;
}

// A reusable blank event object
export const BLANK_DISPLACEMENT_EVENT: DisplacementEvent = {
  occurred: false,
  animalId: null,
  fromX: null,
  fromY: null,
  toX: null,
  toY: null,
  timestamp: null,
};

// ------------------------------------------------------------
// SpawnEvent – fires when a new animal is spawned (egg hatching)
// ------------------------------------------------------------

export interface SpawnEvent {
  occurred: boolean;
  animalId: string | null;
  timestamp: number | null;
}

export const BLANK_SPAWN_EVENT: SpawnEvent = {
  occurred: false,
  animalId: null,
  timestamp: null,
};

// ------------------------------------------------------------
// BiomeCaptureEvent – triggers when a biome ownership changes
// ------------------------------------------------------------

export interface BiomeCaptureEvent {
  occurred: boolean;
  biomeId: string | null;
  timestamp: number | null;
}

export const BLANK_BIOME_CAPTURE_EVENT: BiomeCaptureEvent = {
  occurred: false,
  biomeId: null,
  timestamp: null,
}; 