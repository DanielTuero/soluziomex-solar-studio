# Soluziomex Solar Studio

Standalone desktop-style platform for solar projects. It includes an embedded relational database, image uploads, project bills of materials, delivery tracking, soft costs, customer savings, ROI/payback modeling, installer revenue sharing, and an aggregate portfolio dashboard.

## Install as a desktop app (Windows)

Requirements: Windows, Node.js 22+, npm, and Google Chrome. Docker and a separate database installation are not required.

After cloning the repository, run:

```powershell
Copy-Item .env.example .env.local
npm install
npm run desktop:install
```

This adds **Solar Studio** to the Desktop and Start menu with the Solar Studio icon. Open that shortcut to launch a dedicated app window without browser tabs or an address bar. The launcher prepares the database, builds new Git revisions when needed, starts the private local service, and enforces one Solar Studio window at a time.

The application still uses a private local web service internally, but users never need to open or manage a `localhost` browser tab. Project data and product images remain in the private local `data/solar-studio.db` file.

You can also launch the desktop window directly from the repository:

```powershell
npm run desktop
```

## Development mode

Requirements: Node.js 22+ and npm. Docker and a separate database installation are not required.

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:setup
npm run dev
```

Development mode is available at `http://localhost:3100`. Run `npm run db:setup` only for the first setup or when applying a future schema update; existing records are preserved.

To enable the local passcode gate, set a passcode only for the setup command and then remove it from the shell session:

```powershell
$env:SOLAR_STUDIO_PASSCODE='choose-your-own-passcode'
npm run security:set-passcode
Remove-Item Env:SOLAR_STUDIO_PASSCODE
```

## Included in this first release

- Portfolio economics and pipeline dashboard
- Project creation and status tracking
- Product catalog by category, manufacturer, model, price, and availability
- Product editing and safe removal from the active catalog
- Product image uploads stored in the local SQLite database
- Editable project stages and sourcing fulfillment statuses
- Per-project inventory, suppliers, quantities, delivery dates, and fulfillment status
- Installation and maintenance cost categories, with bill-of-materials totals automatically represented as Materials
- 15–40 year electricity, fee, savings, ROI, NPV, and payback model
- Installer, maintenance reserve, and Soluziomex revenue-share designer
- Installer, electrician, CFE technician, and CFE office contact directory with commercial terms, active projects, and quote history
- Manual and automatic dated database backups with safe restore controls
- Automatic audit history across projects, products, sourcing, costs, economics, and partners
- Seeded sample projects and commercial solar products
