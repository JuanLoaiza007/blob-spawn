This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## PDF output

BlobSpawn can generate local dummy PDFs containing a raster image pattern and custom plain text. PDFs support two mutually exclusive modes: a configured number of pages or an exact final byte size. The interface shows an estimated size before generation; final-size mode uses valid PDF padding and rejects targets smaller than the document's structural minimum.

Each page includes `blob-spawn.vercel.app` in the lower-right area below the content frame. The label is a clickable PDF hyperlink to `https://blob-spawn.vercel.app`. This URL is fixed by the application and cannot be changed through the custom text field.

Custom PDF text is treated as literal text, not HTML or executable content, and is limited to 500 characters and 2,000 UTF-8 bytes. PDF generation and downloads happen in the browser without uploading the text or generated file.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
