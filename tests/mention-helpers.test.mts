import assert from "node:assert/strict";
import { houseMentionItems, valueMentionItems } from "../src/resources/gameResources";
import { formatValueMention, parseMentionText } from "../src/utils/mention-helpers";

const coin = valueMentionItems.find((item) => item.id === "coins")!;
const welfare = valueMentionItems.find((item) => item.id === "welfare")!;
const solad = houseMentionItems.find((item) => item.id === "solad")!;

function requireValueMentionItem(id: string) {
  const item = valueMentionItems.find((candidate) => candidate.id === id);
  assert.ok(item, `${id} should be available as an @ mention`);
  return item;
}

for (const id of [
  "coins",
  "powerTokens",
  "prestige",
  "crave",
  "influence",
  "wealth",
  "morale",
  "welfare",
  "knowledge",
  "stability",
  "momentum",
]) {
  requireValueMentionItem(id);
}

const stability = requireValueMentionItem("stability");
const momentum = requireValueMentionItem("momentum");

const mixedParts = parseMentionText(`보상 ${coin.label ? `@${coin.label} +2` : ""} 그리고 #${solad.label}`);
const mixedMentions = mixedParts.filter((part) => part.type === "mention");

assert.equal(mixedMentions.length, 2);
assert.equal(mixedMentions[0].kind, "value");
assert.equal(mixedMentions[0].item.id, coin.id);
assert.equal(mixedMentions[0].amount, 2);
assert.equal(mixedMentions[0].raw, `@${coin.label} +2`);
assert.equal(mixedMentions[1].kind, "house");
assert.equal(mixedMentions[1].item.id, solad.id);
assert.equal(mixedMentions[1].raw, `#${solad.label}`);
assert.ok(mixedMentions[0].start < mixedMentions[1].start);

const resourceParts = parseMentionText(`정리 메모 @${welfare.label} #${solad.label}`);
const resourceMentions = resourceParts.filter((part) => part.type === "mention");

assert.equal(resourceMentions.length, 2);
assert.equal(resourceMentions[0].kind, "value");
assert.equal(resourceMentions[0].item.id, welfare.id);
assert.equal(resourceMentions[0].amount, null);
assert.equal(resourceMentions[1].kind, "house");
assert.equal(resourceMentions[1].item.id, solad.id);

assert.equal(formatValueMention(coin, 3), `@${coin.label} +3`);
assert.equal(formatValueMention(coin, -2), `@${coin.label} -2`);
assert.equal(formatValueMention(welfare, 9), `@${welfare.label}`);
assert.equal(formatValueMention(stability, 9), `@${stability.label}`);
assert.equal(formatValueMention(momentum, 4), `@${momentum.label}`);

const kingdomStateParts = parseMentionText(`@${stability.label} @안정도 마커 @${momentum.label}`);
const kingdomStateMentions = kingdomStateParts.filter((part) => part.type === "mention");

assert.equal(kingdomStateMentions.length, 3);
assert.equal(kingdomStateMentions[0].item.id, "stability");
assert.equal(kingdomStateMentions[0].amount, null);
assert.equal(kingdomStateMentions[1].item.id, "stability");
assert.equal(kingdomStateMentions[2].item.id, "momentum");

const unknownParts = parseMentionText("@없는값 #없는가문");

assert.equal(unknownParts.some((part) => part.type === "mention"), false);

console.log("mention-helpers tests passed");
