import assert from "node:assert/strict";
import {
  DEFAULT_APP_BASE_PATH,
  formatViteBasePath,
  isPathInsideAppBase,
  joinAppBasePath,
  normalizeAppBasePath,
} from "../shared/app-base-path.mts";

assert.equal(DEFAULT_APP_BASE_PATH, "/kings-dilemma");
assert.equal(normalizeAppBasePath(undefined), "/kings-dilemma");
assert.equal(normalizeAppBasePath(""), "/kings-dilemma");
assert.equal(normalizeAppBasePath("/"), "");
assert.equal(normalizeAppBasePath("kings-dilemma/"), "/kings-dilemma");
assert.equal(normalizeAppBasePath("https://jaekan.asuscomm.com/kings-dilemma/"), "/kings-dilemma");

assert.equal(joinAppBasePath("/kings-dilemma", "/api/agenda"), "/kings-dilemma/api/agenda");
assert.equal(joinAppBasePath("/kings-dilemma/", "api/agenda/events"), "/kings-dilemma/api/agenda/events");
assert.equal(joinAppBasePath("/", "/api/agenda"), "/api/agenda");

assert.equal(formatViteBasePath("/kings-dilemma"), "/kings-dilemma/");
assert.equal(formatViteBasePath("/"), "/");

assert.equal(isPathInsideAppBase("/kings-dilemma", "/kings-dilemma"), true);
assert.equal(isPathInsideAppBase("/kings-dilemma", "/kings-dilemma/api/agenda"), true);
assert.equal(isPathInsideAppBase("/kings-dilemma", "/kings-dilemma-extra"), false);

console.log("app-base-path tests passed");
