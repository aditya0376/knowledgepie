/**
 * Generate a DOCX checklist for Knowledgepie website images
 * Run: node generate-docx.js
 */
const docx = require('docx');
const fs = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, BorderStyle,
  WidthType, ShadingType, TableOfContents, PageBreak,
  Header, Footer, ImageRun
} = docx;

// ─── Color constants ───
const COLORS = {
  primary: '0B3D91',
  accent: '00B4D8',
  dark: '1A1A2E',
  white: 'FFFFFF',
  lightGray: 'F0F4F8',
  border: 'E2E8F0',
  red: 'DC2626',
  orange: 'EA580C',
  green: '16A34A',
  gray: '6B7280',
};

// ─── Helper: create a styled cell ───
function cell(text, options = {}) {
  const runs = [];
  if (typeof text === 'string') {
    runs.push(new TextRun({
      text,
      bold: options.bold || false,
      size: options.size || 20,
      color: options.color || COLORS.dark,
      font: { name: options.font || 'Inter' },
    }));
  } else if (Array.isArray(text)) {
    text.forEach(t => {
      if (typeof t === 'string') {
        runs.push(new TextRun({ text: t, size: options.size || 20, font: { name: 'Inter' } }));
      } else {
        runs.push(new TextRun({ ...t, size: t.size || options.size || 20, font: { name: 'Inter' } }));
      }
    });
  }

  return new TableCell({
    children: [
      new Paragraph({
        children: runs,
        spacing: { before: 40, after: 40 },
        alignment: options.alignment || AlignmentType.LEFT,
      }),
    ],
    width: options.width ? { size: options.width, type: WidthType.DPT } : undefined,
    shading: options.shading ? { fill: options.shading, type: ShadingType.CLEAR } : undefined,
    verticalAlign: 'center',
  });
}

// ─── Helper: header cell ───
function headerCell(text, width) {
  return cell(text, {
    bold: true,
    color: COLORS.white,
    size: 20,
    shading: COLORS.primary,
    width,
  });
}

// ─── Helper: priority badge ───
function priorityBadge(level) {
  const config = {
    'P0': { color: COLORS.white, shading: COLORS.red, text: 'P0 — MUST' },
    'P1': { color: COLORS.white, shading: COLORS.orange, text: 'P1 — HIGH' },
    'P2': { color: COLORS.white, shading: COLORS.green, text: 'P2 — MEDIUM' },
    'P3': { color: COLORS.white, shading: COLORS.gray, text: 'P3 — LOW' },
  };
  const c = config[level];
  return c.text;
}

// ─── Build a section table ───
function buildImageTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    children: headers.map((h, i) => headerCell(h, colWidths[i])),
    tableHeader: true,
  });

  const dataRows = rows.map((rowData, idx) => {
    const isEven = idx % 2 === 0;
    return new TableRow({
      children: rowData.map((cellData, i) => {
        if (cellData.priority) {
          const config = {
            'P0': { color: COLORS.white, shading: COLORS.red, text: 'P0 — MUST' },
            'P1': { color: COLORS.white, shading: COLORS.orange, text: 'P1 — HIGH' },
            'P2': { color: COLORS.white, shading: COLORS.green, text: 'P2 — MEDIUM' },
            'P3': { color: COLORS.white, shading: COLORS.gray, text: 'P3 — LOW' },
          };
          const c = config[cellData.priority];
          return cell(c.text, {
            bold: true,
            color: c.color,
            size: 18,
            shading: c.shading,
            width: colWidths[i],
            alignment: AlignmentType.CENTER,
          });
        }
        return cell(cellData, {
          size: 18,
          shading: isEven ? COLORS.lightGray : COLORS.white,
          width: colWidths[i],
        });
      }),
    });
  });

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ────────────────────────────────────────────
// DATA
// ────────────────────────────────────────────

const logoImages = [
  ['logo.png', '512×512 px (PNG) or SVG', 'Navbar · Footer · Favicon · Social share (OG) · Apple touch icon', 'P0'],
];

const homeImages = [
  ['banner1.jpg', '1920×1080 px (16:9)', 'Hero carousel slide 1 — "Imaging the Future"', 'P0'],
  ['banner2.jpg', '1920×1080 px (16:9)', 'Hero carousel slide 2 — "Xeuj® Safe Contrast Agent"', 'P0'],
  ['applications.png', '600×500 px', 'Applications section', 'P3'],
  ['environentment friendly.jpg', '600×400 px (3:2)', 'Uniqueness card — "Environment Friendly"', 'P2'],
  ['Advantages related to NSF.jpg', '600×400 px (3:2)', 'Uniqueness card — "NSF Advantages"', 'P2'],
  ['Make-in-India.jpg', '600×400 px (3:2)', 'Uniqueness card — "First Make In India"', 'P2'],
  ['partner1.jpg', '320×160 px', 'Partners carousel', 'P3'],
  ['partner2.jpg', '320×160 px', 'Partners carousel', 'P3'],
  ['partner3.png', '320×160 px', 'Partners carousel', 'P3'],
  ['partner4.jpg', '320×160 px', 'Partners carousel', 'P3'],
  ['partner5.png', '320×160 px', 'Partners carousel', 'P3'],
  ['partner6.png', '320×160 px', 'Partners carousel', 'P3'],
  ['partner7.png', '320×160 px', 'Partners carousel', 'P3'],
  ['partner8.jpeg', '320×160 px', 'Partners carousel', 'P3'],
];

const newsImages = [
  ['(uploaded via Admin)', '1200×630 px (1.91:1) recommended', 'Blog post feature image — uploaded through Admin panel at /admin', 'P2'],
  ['(uploaded via Admin)', 'Any size (auto-resized to fit)', 'Inline images within blog post content', 'P3'],
];

const aboutImages = [
  ['patent1.jpg', '600×800 px (portrait)', 'Product patents section', 'P3'],
  ['Make-in-India.jpg', '600×400 px (3:2)', 'USP card — "First Indigenous Contrast Agent"', 'P2'],
  ['eco=friendly.jpg', '600×400 px (3:2)', 'USP card — "Eco-Friendly Synthesis"', 'P2'],
  ['nephrogenic.jpg', '600×400 px (3:2)', 'USP card — "NSF-Free & Safer"', 'P2'],
  ['kidney-disease-human-anatomy.avif', '600×400 px (3:2)', 'USP card — "Safe for Renal Patients"', 'P2'],
];

const investorsImages = [
  ['(various)', 'Various sizes', 'Investor page — uses existing media assets (logo, banners, team photos, gallery images)', 'P2'],
];

const teamImages = [
  ['madhulekha.jpg', '800×900 px (portrait ~1:1)', 'Founder hero — Dr. Madhulekha Gogoi', 'P1'],
  ['aditya.jpg', '400×450 px (3:4 portrait)', 'Team card — Mr. Aditya Man Borborah', 'P1'],
  ['rituporna.jpg', '400×450 px (3:4 portrait)', 'Team card — Ms. Rituporna Borgohain', 'P1'],
  ['anusuya.jpg', '400×450 px (3:4 portrait)', 'Team card — Ms. Anusuya Dutta', 'P1'],
  ['lakshi-saikia.jpg', '300×300 px (1:1 square)', 'Advisor card — Dr. Lakshi Saikia', 'P3'],
  ['suman-hazarika.jpg', '300×300 px (1:1 square)', 'Advisor card — Dr. Suman Hazarika', 'P3'],
  ['himangshu-bora.jpg', '300×300 px (1:1 square)', 'Advisor card — Dr. Himangshu K. Bora', 'P3'],
  ['rituraj-konwar.jpg', '300×300 px (1:1 square)', 'Advisor card — Dr. Rituraj Konwar', 'P3'],
  ['Manash Saikia.jpeg', '300×300 px (1:1 square)', 'Advisor card — Dr. Manash Saikia', 'P3'],
  ['DR Ilias Ali.jpg', '300×300 px (1:1 square)', 'Advisor card — Dr. Ilias Ali', 'P3'],
  ['Dr Samiron Phukan.jpg', '300×300 px (1:1 square)', 'Advisor card — Dr. Samiron Phukan', 'P3'],
];

// ─── Build sections ───
function sectionHeading(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: COLORS.primary,
        font: { name: 'Inter' },
      }),
    ],
    spacing: { before: 600, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.accent },
    },
  });
}

function bodyText(text, options = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: options.size || 22,
        color: options.color || COLORS.dark,
        bold: options.bold || false,
        font: { name: 'Inter' },
      }),
    ],
    spacing: { before: 100, after: options.after || 100 },
    alignment: options.alignment || AlignmentType.LEFT,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${'  '.repeat(level)}•  ${text}`,
        size: 20,
        color: COLORS.dark,
        font: { name: 'Inter' },
      }),
    ],
    spacing: { before: 60, after: 60 },
  });
}

// ────────────────────────────────────────────
// BUILD DOCUMENT
// ────────────────────────────────────────────

const colWidths = [2400, 2400, 3400, 1400]; // DPX

const doc = new Document({
  title: 'Knowledgepie Website - Image Checklist',
  description: 'Complete image requirements for the Knowledgepie website',
  creator: 'Knowledgepie Dev Team',
  styles: {
    default: {
      document: {
        run: { font: 'Inter', size: 22 },
        paragraph: { spacing: { after: 100 } },
      },
    },
  },
  sections: [
    // ═══════════════ COVER PAGE ═══════════════
    {
      children: [
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'KNOWLEDGEPIE',
              bold: true,
              size: 56,
              color: COLORS.primary,
              font: { name: 'Inter' },
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Website Image Checklist',
              bold: true,
              size: 44,
              color: COLORS.accent,
              font: { name: 'Inter' },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Complete guide for collecting and placing all website photographs',
              size: 24,
              color: COLORS.gray,
              font: { name: 'Inter' },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 1000 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'www.knowledgepie.in', size: 22, color: COLORS.primary, font: { name: 'Inter' } }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`,
              size: 20, color: COLORS.gray, font: { name: 'Inter' },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 500 },
        }),

        // Priority Legend
        new Paragraph({ spacing: { before: 800 } }),
        bodyText('PRIORITY LEGEND', { bold: true, size: 24, color: COLORS.dark }),
        bullet('P0 — MUST: Appears on every page, every device. Highest priority.'),
        bullet('P1 — HIGH: Large prominent display (hero sections, founder, core team).'),
        bullet('P2 — MEDIUM: Card layouts on home/about pages.'),
        bullet('P3 — LOW: Small thumbnails (advisors, partners) or rarely seen.'),

        new Paragraph({
          children: [
            new TextRun({ text: '', size: 10 }),
          ],
          spacing: { before: 400 },
        }),
      ],
    },

    // ═══════════════ INSTRUCTIONS ═══════════════
    {
      children: [
        sectionHeading('HOW TO USE THIS CHECKLIST'),
        bodyText('Step 1: Gather all photographs as per the tables below.'),
        bodyText('Step 2: Rename each file to match the exact filename listed.'),
        bodyText('Step 3: Place files in the correct sub-folder under:'),
        bullet('D:\\openwork\\knowledgepie\\public\\media\\'),
        bodyText('Step 4: Maintain the folder structure — index/, news/, about/, team/'),
        bodyText(''),
        bodyText('WHAT HAS CHANGED (v2.0):', { bold: true, color: COLORS.primary }),
        bullet('OLD "Gallery" page has been replaced with a NEWS / BLOG section.'),
        bullet('NEW: Hidden Admin panel at /admin to create/edit posts (password-protected).'),
        bullet('Images for blog posts can be uploaded directly through the Admin panel.'),
        bullet('Admin-uploaded images go to public/uploads/ automatically.'),
        bullet('Pre-existing images (logos, team, banners) still go in public/media/ as listed below.'),
        bodyText(''),
        bodyText('IMPORTANT NOTES:', { bold: true, color: COLORS.red }),
        bullet('Use JPEG (.jpg) for photos, PNG (.png) for logos/graphics with transparency.'),
        bullet('Keep file sizes reasonable (< 500 KB per image). Larger images slow down the site.'),
        bullet('Portrait photos should be well-lit and in focus — they will be displayed prominently.'),
        bullet('For the logo, an SVG vector file is best. If not available, a high-res PNG (512×512) works.'),
        bullet('Advisor photos should be clear headshots — they appear as small circular thumbnails.'),
        bullet('Partner logos should be clean, preferably on transparent background.'),
        bullet('The site currently proxies missing images from the live site (www.knowledgepie.in), but local files will be used once placed.'),
      ],
    },

    // ═══════════════ LOGO ═══════════════
    {
      children: [
        sectionHeading('1. LOGO — public/media/'),
        buildImageTable(
          ['File Name', 'Recommended Size', 'Where It Appears', 'Priority'],
          logoImages,
          colWidths
        ),
      ],
    },

    // ═══════════════ HOME INDEX ═══════════════
    {
      children: [
        sectionHeading('2. HOME PAGE — public/media/index/'),
        buildImageTable(
          ['File Name', 'Recommended Size', 'Where It Appears', 'Priority'],
          homeImages,
          colWidths
        ),
      ],
    },

    // ═══════════════ NEWS / BLOG ═══════════════
    {
      children: [
        sectionHeading('3. NEWS / BLOG POSTS — public/uploads/'),
        bodyText('The site now has a News/Blog system replacing the old Gallery page. Blog post images are uploaded through the admin panel:'),
        bullet('Go to http://localhost:3000/admin (password: knowledgepie2024)'),
        bullet('Create a new post and upload an image via the form.'),
        bullet('Images are stored in public/uploads/ automatically by Multer.'),
        bodyText(''),
        bodyText('Recommended image dimensions for blog posts:', { bold: true }),
        buildImageTable(
          ['Usage', 'Recommended Size', 'Note', 'Priority'],
          newsImages,
          colWidths
        ),
        new Paragraph({ spacing: { before: 200 } }),
        bodyText('Note: You do NOT need to manually place blog images in the file system. The admin panel handles uploads automatically.', { italic: true, color: COLORS.gray }),
      ],
    },

    // ═══════════════ ABOUT ═══════════════
    {
      children: [
        sectionHeading('4. ABOUT PAGE — public/media/about/'),
        buildImageTable(
          ['File Name', 'Recommended Size', 'Where It Appears', 'Priority'],
          aboutImages,
          colWidths
        ),
      ],
    },

    // ═══════════════ TEAM ═══════════════
    {
      children: [
        sectionHeading('5. TEAM PAGE — public/media/team/'),
        buildImageTable(
          ['File Name', 'Recommended Size', 'Where It Appears', 'Priority'],
          teamImages,
          colWidths
        ),
      ],
    },

    // ═══════════════ INVESTORS ═══════════════
    {
      children: [
        sectionHeading('6. INVESTORS PAGE — (reuses existing assets)'),
        bodyText('The Investors page (v2.0 — data-driven, enhanced June 2026) is a comprehensive fundraising pitch page. It does NOT require new images — it reuses existing assets:'),
        bullet('Logo from public/media/logo.png'),
        bullet('Hero section uses gradient background (no image needed)'),
        bullet('Founder photo from public/media/team/madhulekha.jpg'),
        bullet('Gallery/event photos from public/media/gallery/'),
        bullet('Banners from public/media/index/'),
        bodyText(''),
        bodyText('NEW SECTIONS ADDED (v2.0):', { bold: true, color: COLORS.primary }),
        bullet('Executive Summary — 4-card investment thesis'),
        bullet('Market Analysis — bar charts with global market data ($2.5B → $4.7B by 2032), regional breakdown'),
        bullet('Renal Opportunity — CKD data (788M global, 138M India patients), prevalence charts, regulatory tailwinds'),
        bullet('Competitive Landscape — comparison table vs GBCAs and Ferabright™'),
        bullet('Use of Funds — CSS-based donut chart with 5 allocation categories'),
        bullet('Path to Profitability — inflection timeline with financial projections table (2026-2030)'),
        bullet('Exit Strategy — acquisition, licensing, IPO paths with comparable transactions'),
        bullet('All data sourced from Grand View Research, The Lancet GBD 2023, FDA, EMA, ESUR guidelines'),
        bodyText('No additional image collection needed for this page.', { italic: true, color: COLORS.gray }),
      ],
    },

    // ═══════════════ SUMMARY ═══════════════
    {
      children: [
        sectionHeading('SUMMARY'),
        bodyText(`Total images to collect: ${logoImages.length + homeImages.length + newsImages.length + aboutImages.length + teamImages.length}`),
        bodyText('Folders:'),
        bullet('public/media/ — 1 file (logo)'),
        bullet('public/media/index/ — 14 files (banners, uniqueness, partners)'),
        bullet('public/uploads/ — Blog post images (uploaded via Admin panel; no manual placement needed)'),
        bullet('public/media/about/ — 5 files (patent, USPs)'),
        bullet('public/media/team/ — 11 files (founder, members, advisors)'),
        bullet('NEW: /investors page — reuses existing assets, no new images needed.'),
        bodyText(''),
        bodyText('Once all images are in place, restart the Node.js server:', { bold: true }),
        bodyText('  npm start', { font: 'monospace', size: 20 }),
        bodyText('  Then visit: http://localhost:3000', { font: 'monospace', size: 20 }),
        bodyText(''),
        bodyText('All images will be served locally. No internet connection needed.', { color: COLORS.green }),
      ],
    },
  ],
});

// ════════════════════════════════════════════
// GENERATE FILE
// ════════════════════════════════════════════
const outPath = path.join(__dirname, 'Knowledgepie-Website-Image-Checklist.docx');

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ DOCX created successfully!`);
  console.log(`   File: ${outPath}`);
  console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error('❌ Error generating DOCX:', err.message);
  process.exit(1);
});
