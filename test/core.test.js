import assert from "node:assert/strict";
import test from "node:test";

import {
  compareFilesByName,
  formatBytes,
  formatPipLabel,
  formatPipName,
  getCurrentCard,
  getVisibleIndices,
  normalizeIndex,
  reorder,
  resolvePipControlsBackground,
  resolvePipControlsPosition,
  resolvePipControlsSize,
  step,
  stripFileExtension,
  toggleHidden,
} from "../core.js";

const cards = [
  { id: "a", name: "P1_1.png", hidden: false },
  { id: "b", name: "P1_2.png", hidden: true },
  { id: "c", name: "P1_10.png", hidden: false },
];

test("getVisibleIndices returns only cards available to preview and PiP", () => {
  assert.deepEqual(getVisibleIndices(cards), [0, 2]);
});

test("normalizeIndex clamps and skips hidden cards", () => {
  assert.equal(normalizeIndex(cards, -10), 0);
  assert.equal(normalizeIndex(cards, 1), 2);
  assert.equal(normalizeIndex(cards, 99), 2);
  assert.equal(normalizeIndex(cards.map((card) => ({ ...card, hidden: true })), 99), 2);
});

test("getCurrentCard returns null for all-hidden decks", () => {
  assert.equal(getCurrentCard(cards, 1)?.id, "c");
  assert.equal(getCurrentCard(cards.map((card) => ({ ...card, hidden: true })), 0), null);
});

test("step moves through visible cards and wraps around", () => {
  assert.equal(step(cards, 0, 1), 2);
  assert.equal(step(cards, 2, 1), 0);
  assert.equal(step(cards, 0, -1), 2);
  assert.equal(step(cards, 1, 1), 0);
});

test("reorder returns a new card order and keeps currentIndex aligned", () => {
  const result = reorder(cards, 0, 1, 0);
  assert.deepEqual(
    result.cards.map((card) => card.id),
    ["b", "a", "c"],
  );
  assert.equal(result.currentIndex, 1);
  assert.deepEqual(
    cards.map((card) => card.id),
    ["a", "b", "c"],
  );
});

test("toggleHidden returns a new card object without mutating the original", () => {
  const toggled = toggleHidden(cards, 1);
  assert.equal(toggled[1].hidden, false);
  assert.equal(cards[1].hidden, true);
  assert.notEqual(toggled[1], cards[1]);
});

test("formatPipName strips or keeps file extensions from settings", () => {
  assert.equal(stripFileExtension("phase.1.webp"), "phase.1");
  assert.equal(formatPipName({ name: "phase.1.webp" }, { showFileExtension: false }), "phase.1");
  assert.equal(formatPipName({ name: "phase.1.webp" }, { showFileExtension: true }), "phase.1.webp");
});

test("formatPipLabel uses visible count and current visible position", () => {
  assert.equal(formatPipLabel(cards, 0, { showFileExtension: false }), "1 / 2　P1_1");
  assert.equal(formatPipLabel(cards, 2, { showFileExtension: true }), "2 / 2　P1_10.png");
  assert.equal(formatPipLabel(cards.map((card) => ({ ...card, hidden: true })), 0), "");
});

test("formatBytes keeps compact human-readable units", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(2 * 1024 * 1024), "2.0 MB");
});

test("compareFilesByName sorts numeric file names naturally", () => {
  const files = [
    { name: "P1_10.png", lastModified: 1 },
    { name: "P1_2.png", lastModified: 1 },
    { name: "P1_1.png", lastModified: 1 },
  ];

  assert.deepEqual(files.toSorted(compareFilesByName).map((file) => file.name), ["P1_1.png", "P1_2.png", "P1_10.png"]);
});

test("PiP control resolvers fall back to defaults", () => {
  assert.equal(resolvePipControlsSize({ pipControlsSize: "large" }), "large");
  assert.equal(resolvePipControlsSize({ pipControlsSize: "giant" }), "medium");
  assert.equal(resolvePipControlsPosition({ pipControlsPosition: "top" }), "top");
  assert.equal(resolvePipControlsPosition({ pipControlsPosition: "center" }), "bottom");
  assert.equal(resolvePipControlsBackground({ pipControlsBackground: "clear" }), "background-clear");
  assert.equal(resolvePipControlsBackground({ pipControlsBackground: "background-translucent" }), "background-translucent");
  assert.equal(resolvePipControlsBackground({ pipControlsBackground: "unknown" }), "background-solid");
});
