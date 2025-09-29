# Shadcn-UI Template Usage Instructions

## technology stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

All shadcn/ui components have been downloaded under `@/components/ui`.

## File Structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.js` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/app.tsx` - Root component of the project
- `src/main.tsx` - Project entry point
- `src/index.css` - Existing CSS configuration
- `src/pages/Index.tsx` - Home page logic

## Components

- All shadcn/ui components are pre-downloaded and available at `@/components/ui`

## Styling

- Add global styles to `src/index.css` or create new CSS files as needed
- Use Tailwind classes for styling components

## Development

# Sunucu üzerinden Nodemailer kullanımı

VITE_MAIL_API_BASE=http://localhost:8787
VITE_MAIL_API_KEY=change-this-key

Server klasöründe `.env` oluşturup SMTP bilgilerinizi girin ve sunucuyu başlatın:

```
cd ../server
cp .env.example .env
# .env içinde SMTP_HOST, SMTP_PORT=465, SMTP_USER=noreply@varmi.com, SMTP_PASS=*** ayarlayın
pnpm i
pnpm dev
```

Ardından frontend `.env.local` içinde VITE_MAIL_API_BASE ve VITE_MAIL_API_KEY tanımlıysa e-postalar backend üzerinden gönderilir.

- Import components from `@/components/ui` in your React components
- Customize the UI by modifying the Tailwind configuration

## Note

- The `@/` path alias points to the `src/` directory
- In your typescript code, don't re-export types that you're already importing

# Commands

**Install Dependencies**

```shell
pnpm i
```

**Add Dependencies**

````shell
pnpm add some_new_dependency

**Start Preview**

```shell
pnpm run dev
````

**To build**

```shell
pnpm run build
```
