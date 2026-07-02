/**
 * @file bucketSystem.js - Bucket water volume.
 * @description The bucket (item 16) holds a 0..100% water volume, filled at the
 * well (choose amount) and poured into water troughs. Mirrors wateringCan.js;
 * replaces the old empty/full two-item model (16 ↔ 42) which had no fill path.
 * @module BucketSystem
 */

import { registerSystem } from './gameState.js';
import { createFluidContainer } from './fluidContainer.js';

// The bucket is a plain fluid container (level filled at the well, poured into
// water troughs) — no tool-specific behavior, so it uses the shared base as-is.
const bucketSystem = createFluidContainer(100);

registerSystem('bucket', bucketSystem);

export default bucketSystem;
