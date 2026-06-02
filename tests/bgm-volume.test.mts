import assert from "node:assert/strict";
import { getBgmDisplayVolumePercent, getBgmUnmutedVolume } from "../src/utils/bgm-volume";

assert.equal(getBgmDisplayVolumePercent(0.34, false), 34);
assert.equal(getBgmDisplayVolumePercent(0.34, true), 0);
assert.equal(getBgmDisplayVolumePercent(0, true), 0);
assert.equal(getBgmDisplayVolumePercent(1.2, false), 100);

assert.equal(getBgmUnmutedVolume(0.34, 0.5), 0.34);
assert.equal(getBgmUnmutedVolume(0, 0.5), 0.5);

console.log("bgm-volume tests passed");
