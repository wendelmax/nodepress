# NodePress

> **The Modern, Open-Source CMS built on Next.js**

NodePress is a full-featured Content Management System inspired by WordPress, built entirely with modern web technologies. It gives developers and content creators the familiar CMS experience — posts, pages, taxonomies, plugins, themes — while leveraging the performance and developer experience of Next.js and PostgreSQL.

---

## ✨ Features

- **5-Minute Install** — Web-based setup wizard. No config files to edit manually.
- **Visual Page Builder** — Drag-and-drop page building powered by [Puck](https://github.com/measuredco/puck), replacing clunky shortcodes.
- **Native Forms & Leads** — Built-in form builder with a dedicated leads management dashboard and CSV export (no Contact Form 7 needed).
- **Enterprise-Grade Caching** — Next.js App Router Static Site Generation (SSG) with automatic on-demand cache invalidation (ISR) via `revalidatePath`.
- **Post & Page Management** — Full CRUD for posts and pages, with draft, scheduled, and publish states.
- **Revision History** — Every saved edit creates a revision; restore any previous version instantly.
- **Taxonomy System** — Categories and Tags with full admin management.
- **Plugin System** — Hook-based plugin architecture (`addAction` / `addFilter`) inspired by WordPress hooks.
- **Theme System** — Swap frontend themes from the admin panel without touching code.
- **Custom Fields (ACF-style)** — Define field groups and attach custom metadata to any post or page.
- **SEO & Analytics** — Built-in SEO meta fields and Google Analytics 4 integration.
- **Permalink Management** — Configure URL structures for your content.
- **Multi-language Ready** — i18n support in both the setup wizard and admin panel (pt-BR, en, and more).
- **Secure by Default** — Password hashing with bcrypt, session management via NextAuth.js.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) |
| **Database** | PostgreSQL |
| **ORM** | [Prisma](https://www.prisma.io) |
| **Auth** | [NextAuth.js](https://next-auth.js.org) |
| **Language** | TypeScript |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/nodepress.git
   cd nodepress
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

5. **Follow the Setup Wizard** — NodePress will guide you through:
   - Selecting your language
   - Connecting to your PostgreSQL database
   - Creating your admin account

That's it! Your NodePress site is ready.

---

## 🐳 Running with Docker (PostgreSQL)

If you don't have a local PostgreSQL instance, spin one up quickly with Docker:

```bash
docker run -d \
  --name postgres-nodepress \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=nodepress \
  -p 5432:5432 \
  postgres:16
```

Then in the setup wizard, use:
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `nodepress`
- **Username:** `admin`
- **Password:** `admin123`

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (web)/           # Public-facing routes (blog, pages, admin)
│   │   ├── admin/       # Admin dashboard
│   │   └── setup-config/ # Installation wizard
│   └── api/             # REST API routes
├── lib/                 # Core utilities (auth, prisma, i18n, etc.)
├── plugins/             # Plugin registry and built-in plugins
├── services/            # Business logic layer
├── themes/              # Theme registry and default theme
└── hooks/               # React hooks for admin UI
prisma/
└── schema.prisma        # Database schema
```

---

## 🔌 Plugin Development

NodePress features a hook system similar to WordPress. Create a plugin in `src/plugins/your-plugin/`:

```tsx
// src/plugins/my-plugin/index.tsx
import { HookService } from '@/services/hook.service';

HookService.addAction('admin_top_bar', () => {
  return <div>Hello from My Plugin!</div>;
}, 10);
```

Then register it in `src/plugins/registry.ts`:

```ts
import './my-plugin';
```

---

## 🎨 Theme Development

Create a custom theme in `src/themes/my-theme/` and register it in `src/themes/registry.ts`. Themes define three React Server Components: `SinglePost`, `SinglePage`, and `Archive`.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

## 📄 License

MIT © NodePress Contributors
