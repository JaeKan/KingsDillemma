# UI/UX redesign research

Date: 2026-05-07

## Sources checked

- Official product page: https://horribleguild.com/us/product/the-kings-dilemma/
- Retail component summary: https://www.gamenerdz.com/the-kings-dilemma
- Rulebook mirror/search result used for component/resource terms: https://cdn.1j1ju.com/medias/7e/3e/83-the-kings-dilemma-rulebook.pdf
- Wiki search result: https://no-rolls-barred.fandom.com/wiki/NRB_Plays_The_King%27s_Dilemma
- House reference gist used for public House-screen style fields: https://gist.github.com/stolksdorf/b22dff2bcd63f01dfd4695b4d4ebed41
- Community remote-play spreadsheet used only as non-authoritative secondary evidence for shared resources, voting layout, end-game score tables, and five active House tabs: https://docs.google.com/spreadsheets/u/0/d/1N7YeywdMHb2qyXoDi32OPU9DIrBbwsk8EGpdpioir6g/htmlview#gid=405315857

## Wiki note

I did not find an authoritative standalone "The King's Dilemma" lore wiki suitable as a primary source. The available Fandom hit is for the No Rolls Barred playthrough, not the board game's canonical UI, tokens, or rule components. It was useful only to confirm the council/house framing and was not used as a visual asset source.

## Product facts used

- The official page frames the game around the Kingdom of Ankist, ruling Houses, the King's council, branching storylines, and power struggles that can lead to war, famine, riot, wealth, or well-being.
- Component summaries consistently mention a Realm board, House screens, envelopes/cards, stickers, and tokens.
- Rulebook summaries identify the main resources as Welfare, Morale, Influence, Knowledge, and Wealth, with Power tokens, Coins, Secret Agendas, and Open Agenda tokens as scoring or negotiation objects.
- The rulebook states each House screen has a House number, and that this number is used for tie-breaking. Public play logs also show Secret Agenda picking order following the selected houses' House numbers rather than arbitrary player-seat order.
- The game has 12 House screens. This app now lets players choose from all 12, then starts a 5-house draft sorted by the chosen Houses' assigned numbers.
- Public House-screen style details are now represented for each House: motto, crest description, disposition, goal, and a Korean paraphrase of the House background. Long source text is not copied verbatim.
- The public spreadsheet is a non-authoritative campaign sample, but its five House tabs for Solad, Olwyn, Allwed, Dualak, and Tiryll use the same House numbers currently stored in `shared/houses.mjs`.
- The rulebook House-screen example shows Prestige as two 5x10 checkbox blocks and Crave as two 5x5 checkbox blocks, so the ledger renders them as 100 and 50 square tracks rather than ordinary numeric counters.
- The rulebook confirms each House screen has achievements and that House Alignment marks the Secret Agenda used. Public sources verified the House narrative goal/disposition fields, but not the full exact condition text for every House achievement. Unverified achievement conditions are intentionally not added.
- Project decision after review: the five public resource markers are tracked on a shared Google spreadsheet, so this app should not ask each player to manually enter those values.

## Design translation

- Original game artwork and product photos were not copied into the app.
- The redesign uses MUI Icons for common UI, resource, and token glyphs so icon sizing/alignment remains stable across buttons, cards, and counters.
- House crests are represented with the closest available MUI icon metaphor rather than copied game artwork.
- The screen is treated as a council table/HUD rather than a generic form dashboard.
- Login became a House registry with 12 selectable Houses and canonical House numbers.
- After login, the council layout includes a "House Screen" card so each player can review their selected House details during play.
- The House Screen card exposes the selected House's narrative challenge and favorite Secret Agenda alignments. These are shown as reference data, not as invented draft recommendations.
- The fixed menu button links to the shared Google spreadsheet as the public board reference. House tabs from that sheet are treated only as non-authoritative campaign samples and are not surfaced as production UI copy.
- Authenticated play became a council docket with compact status, turn markers, a live decree stage, physical-token counters, and sealed agenda cards.
- Player-editable ledger fields include personal inventory values (Coins, Power tokens, Prestige, Crave) plus authenticated House progress (Open Agenda tokens and manual achievement marks). Public board resources remain thematic labels only, not editable shared board state.
- The entry screen is compressed to fit a normal 1366x768 desktop viewport without horizontal or vertical scrolling.

## Implementation guardrails

- Preserve privacy redaction: remaining agenda names are sent only to the active drafting House.
- Keep all interactive controls as native React UI, not raster screenshots.
- Avoid adding copyrighted King's Dilemma image files or hotlinked product photos.
- Keep responsive layout readable for the in-app browser and mobile-sized windows.
