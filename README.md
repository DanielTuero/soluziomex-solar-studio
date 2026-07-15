# Soluziomex Solar Studio

Standalone local development platform for solar projects. It includes an embedded relational database, image uploads, project bills of materials, delivery tracking, soft costs, customer savings, ROI/payback modeling, installer revenue sharing, and an aggregate portfolio dashboard.

## Start locally

Requirements: Node.js 22+ and npm. Docker and a separate database installation are not required.

```powershell
Copy-Item .env.example .env.local
npm install
npm run db:setup
npm run dev
```

Open `http://localhost:3100`. Project data and product images are stored in the private local `data/solar-studio.db` file. Run `npm run db:setup` only for the first setup or when applying a future schema update; existing records are preserved.

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
