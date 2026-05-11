/**
 * 규칙서 PDF에서 미스터리 스티커 도형(p.42–43)을 잘라
 * `public/mystery-stickers/1.png` … `6.png` 로 저장합니다.
 *
 * 사용법:
 *   node scripts/extract-mystery-stickers.mjs "<절대·상대 경로>/rulebook.pdf"
 *
 * 옵션:
 *   --keep-temp   전체 페이지 PNG를 `scripts/.mystery-extract-tmp/` 에 유지 (성공 시에도 삭제 안 함)
 *
 * 크롭은 일반적인 2단 규칙서 레이아웃 가정(안쪽 영역을 3행×2열, 각 페이지 앞쪽 3칸).
 * 픽셀 단위 조정이 필요하면 아래 상수를 바꿉니다.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

// ─── 출력 경로 (shared/mystery-stickers.mts 의 publicPath 와 동일 패턴) ───
const OUT_DIR = path.join(REPO_ROOT, "public", "mystery-stickers");
const TMP_DIR = path.join(REPO_ROOT, "scripts", ".mystery-extract-tmp");

// ─── PDF 페이지 번호(사람이 보는 쪽수, 1부터) ───
const RULEBOOK_PAGE_STICKERS_1_TO_3 = 42;
const RULEBOOK_PAGE_STICKERS_4_TO_6 = 43;

// ─── 렌더 배율 (선명도 ↑ → 메모리·파일 크기 ↑; 너무 크면 pdf.js 이슈 가능) ───
const VIEWPORT_SCALE = 3;

// ─── 페이지에서 아이콘 그리드가 들어가는 ‘안쪽’ 직사각형 (전체 너비·높이 대비 비율) ───
const INNER_INSET_LEFT_PCT = 0.1;
const INNER_INSET_RIGHT_PCT = 0.1;
const INNER_INSET_TOP_PCT = 0.14;
const INNER_INSET_BOTTOM_PCT = 0.18;

// ─── 안쪽 영역을 몇 행·몇 열로 나눌지 (규칙서 도형이 세로로 쌓인 2단이라 가정) ───
const GRID_ROWS = 3;
const GRID_COLS = 2;

/**
 * 각 페이지에서 파일 번호 순으로 쓸 칸 인덱스 (0-based, 행 우선: 좌→우, 위→아래).
 * 예: [0,1,2] → 첫 행 좌·우 + 둘째 행 좌.
 */
const SLOT_INDICES_THIS_PAGE = [0, 1, 2];

/** 각 칸 경계 안쪽으로 추가로 자르는 비율 (칸 너비·높이 기준) */
const CELL_EDGE_TRIM_X_FRAC = 0.04;
const CELL_EDGE_TRIM_Y_FRAC = 0.04;

// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const keepTemp = argv.includes("--keep-temp");
  const positional = argv.filter((a) => !a.startsWith("--"));
  const pdfPath = positional[0];
  return { pdfPath, keepTemp };
}

function innerRect(pageWidth, pageHeight) {
  const x = pageWidth * INNER_INSET_LEFT_PCT;
  const y = pageHeight * INNER_INSET_TOP_PCT;
  const w = pageWidth * (1 - INNER_INSET_LEFT_PCT - INNER_INSET_RIGHT_PCT);
  const h = pageHeight * (1 - INNER_INSET_TOP_PCT - INNER_INSET_BOTTOM_PCT);
  return { x, y, w, h };
}

function gridCellRects(inner) {
  const cw = inner.w / GRID_COLS;
  const ch = inner.h / GRID_ROWS;
  const rects = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      rects.push({
        x: inner.x + col * cw,
        y: inner.y + row * ch,
        w: cw,
        h: ch,
      });
    }
  }
  return rects;
}

function trimCell(rect) {
  const dx = rect.w * CELL_EDGE_TRIM_X_FRAC;
  const dy = rect.h * CELL_EDGE_TRIM_Y_FRAC;
  return {
    x: Math.floor(rect.x + dx),
    y: Math.floor(rect.y + dy),
    w: Math.floor(rect.w - 2 * dx),
    h: Math.floor(rect.h - 2 * dy),
  };
}

function cmapAndFontUrls(pdfjsRoot) {
  const cmapDir = path.join(pdfjsRoot, "cmaps");
  const stdFontDir = path.join(pdfjsRoot, "standard_fonts");
  const trail = (dir) => (dir.endsWith(path.sep) ? dir : dir + path.sep);
  return {
    cMapUrl: pathToFileURL(trail(cmapDir)).href,
    standardFontDataUrl: pathToFileURL(trail(stdFontDir)).href,
  };
}

async function loadPdfLib() {
  const pdfjsRoot = path.join(REPO_ROOT, "node_modules", "pdfjs-dist");
  const { getDocument, GlobalWorkerOptions } = await import(
    pathToFileURL(path.join(pdfjsRoot, "legacy", "build", "pdf.mjs")).href
  );

  const workerPath = path.join(pdfjsRoot, "legacy", "build", "pdf.worker.mjs");
  GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  return {
    getDocument,
    pdfjsRoot,
  };
}

async function openPdfDocument(getDocument, pdfjsRoot, data) {
  const { cMapUrl, standardFontDataUrl } = cmapAndFontUrls(pdfjsRoot);
  const loadingTask = getDocument({
    data,
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
  });
  return loadingTask.promise;
}

async function renderPageToCanvas(pdfDocument, pageNumber1Based) {
  const pageCount = pdfDocument.numPages;

  if (pageNumber1Based < 1 || pageNumber1Based > pageCount) {
    throw new Error(`쪽 번호 ${pageNumber1Based} 은(는) 없습니다. PDF 전체 ${pageCount}쪽입니다.`);
  }

  const page = await pdfDocument.getPage(pageNumber1Based);
  const viewport = page.getViewport({ scale: VIEWPORT_SCALE });

  const canvasFactory = pdfDocument.canvasFactory;
  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

  await page
    .render({
      canvasContext: canvasAndContext.context,
      viewport,
    })
    .promise;

  page.cleanup();

  return {
    canvas: canvasAndContext.canvas,
    width: viewport.width,
    height: viewport.height,
  };
}

async function cropToPng(sourceCanvas, rect) {
  const { createCanvas } = await import("@napi-rs/canvas");
  const out = createCanvas(rect.w, rect.h);
  const ctx = out.getContext("2d");
  ctx.drawImage(sourceCanvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return out.encode("png");
}

async function writeStickerRow(canvas, cells, globalIndices1Based) {
  const written = [];
  for (let i = 0; i < SLOT_INDICES_THIS_PAGE.length; i++) {
    const slot = SLOT_INDICES_THIS_PAGE[i];
    const raw = cells[slot];
    if (!raw) {
      throw new Error(`칸 인덱스 ${slot} 이(가) 그리드 범위를 벗어났습니다.`);
    }
    const rect = trimCell(raw);
    const png = await cropToPng(canvas, rect);
    const stickerNum = globalIndices1Based[i];
    const name = `${stickerNum}.png`;
    const dest = path.join(OUT_DIR, name);
    await fs.writeFile(dest, png);
    written.push(path.relative(REPO_ROOT, dest).replace(/\\/g, "/"));
    console.log(`작성: ${dest}`);
  }
  return written;
}

async function main() {
  const argv = process.argv.slice(2);
  const { pdfPath, keepTemp } = parseArgs(argv);

  if (!pdfPath) {
    console.error(
      [
        "사용법: node scripts/extract-mystery-stickers.mjs \"<규칙서.pdf 경로>\" [--keep-temp]",
        "예: node scripts/extract-mystery-stickers.mjs \"C:\\\\Games\\\\King\\\\rulebook.pdf\"",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const resolvedPdf = path.resolve(REPO_ROOT, pdfPath);
  let stat;
  try {
    stat = await fs.stat(resolvedPdf);
  } catch {
    console.error(`PDF를 찾을 수 없습니다: ${resolvedPdf}`);
    process.exitCode = 1;
    return;
  }

  if (!stat.isFile()) {
    console.error(`파일이 아닙니다: ${resolvedPdf}`);
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });

  const pdfBytes = await fs.readFile(resolvedPdf);
  const data = new Uint8Array(pdfBytes);

  let pdfDocument = null;
  let success = false;

  try {
    const { getDocument, pdfjsRoot } = await loadPdfLib();
    pdfDocument = await openPdfDocument(getDocument, pdfjsRoot, data);

    console.log(`렌더 중… ${RULEBOOK_PAGE_STICKERS_1_TO_3}쪽`);
    const r42 = await renderPageToCanvas(pdfDocument, RULEBOOK_PAGE_STICKERS_1_TO_3);
    const png42 = await r42.canvas.encode("png");
    await fs.writeFile(path.join(TMP_DIR, `full-page-${RULEBOOK_PAGE_STICKERS_1_TO_3}.png`), png42);
    console.log(`임시 저장: scripts/.mystery-extract-tmp/full-page-${RULEBOOK_PAGE_STICKERS_1_TO_3}.png`);

    console.log(`렌더 중… ${RULEBOOK_PAGE_STICKERS_4_TO_6}쪽`);
    const r43 = await renderPageToCanvas(pdfDocument, RULEBOOK_PAGE_STICKERS_4_TO_6);
    const png43 = await r43.canvas.encode("png");
    await fs.writeFile(path.join(TMP_DIR, `full-page-${RULEBOOK_PAGE_STICKERS_4_TO_6}.png`), png43);
    console.log(`임시 저장: scripts/.mystery-extract-tmp/full-page-${RULEBOOK_PAGE_STICKERS_4_TO_6}.png`);

    const inner42 = innerRect(r42.width, r42.height);
    const inner43 = innerRect(r43.width, r43.height);
    const cells42 = gridCellRects(inner42);
    const cells43 = gridCellRects(inner43);

    const written = [];
    written.push(...(await writeStickerRow(r42.canvas, cells42, [1, 2, 3])));
    written.push(...(await writeStickerRow(r43.canvas, cells43, [4, 5, 6])));

    console.log("\n완료. 생성된 파일:");
    for (const p of written) {
      console.log(`  ${p}`);
    }

    success = true;
  } catch (err) {
    console.error("추출 실패:", err?.message ?? err);
    if (err?.stack) {
      console.error(err.stack);
    }
    process.exitCode = 1;
  } finally {
    if (pdfDocument) {
      try {
        await pdfDocument.destroy();
      } catch {
        /* noop */
      }
    }

    if (success && !keepTemp) {
      try {
        await fs.rm(TMP_DIR, { recursive: true, force: true });
      } catch {
        /* noop */
      }
    } else if (keepTemp) {
      console.log(`\n전체 페이지 PNG 유지: scripts/.mystery-extract-tmp/`);
    }
  }
}

await main();
