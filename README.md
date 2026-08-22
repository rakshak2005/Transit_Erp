# Transit ERP

**Transit ERP** is a full-stack operations management system built to handle the parts of inventory management that become difficult once multiple locations, work orders, transfers, and customer reservations are involved.

The application tracks stock by location and batch, manages work orders, handles inter-location stock transfers, and reserves inventory for customer orders. The backend uses PostgreSQL transactions and row-level locking so inventory remains consistent even when multiple operations happen at the same time.

## Live Application

**Frontend:** https://transit-erp.vercel.app/
**Backend:** https://transit-erp.onrender.com
**API Documentation:** [`docs/api.md`](docs/api.md)

> The deployed application is currently running in developer/testing mode. Any credentials available in the application are intended for testing purposes only.


## Table of Contents

- [Live Application](#live-application)
- [Tech Stack](#tech-stack)
- [Core Modules](#core-modules)
- [Project Setup](#project-setup)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)

## Tech Stack

| Layer             | Technology                   |
| ----------------- | ---------------------------- |
| Frontend          | React, Vite, TypeScript      |
| UI                | Tailwind CSS                 |
| Backend           | Node.js, Express, TypeScript |
| Database          | PostgreSQL                   |
| ORM               | Prisma                       |
| Validation        | Zod                          |
| API Documentation | Swagger                      |
| Testing           | Jest, Supertest              |
| Deployment        | Vercel + Render              |
| Database Hosting  | Neon PostgreSQL              |

## Core Modules

### Inventory

Inventory is maintained at the location level and supports batch-based stock tracking.

The system keeps separate values for:

* Physical quantity
* Reserved quantity
* Available quantity

`Available = Physical Quantity - Reserved Quantity`

This prevents stock from being reserved or transferred beyond what is actually available.

### Work Orders

Work orders are linked to a location and item and can be assigned to users.

Shortages are calculated dynamically from current inventory rather than being stored as a fixed value.

`Shortage = Required Quantity - Available Quantity`

### Stock Transfers

Transfers move stock between locations through two distinct stages:

**Dispatch**

* Source inventory is reduced.
* Destination inventory is not increased yet.
* The transfer remains pending receipt.

**Receipt**

* Destination inventory is increased.
* The transfer is marked as received.
* A completed transfer cannot be received again.

### Customer Reservations

Customer orders reserve available stock without immediately removing the physical inventory.

Reservation operations are protected using database transactions and row-level locking to prevent concurrent requests from overselling the same inventory.

## Project Structure

```text
Transit-ERP/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── ...
│   ├── prisma/
│   └── package.json
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── docs/
│   └── api.md
│
└── README.md
```

## Project Setup

### Prerequisites

Make sure the following are installed:

* Node.js 18+
* npm
* PostgreSQL-compatible database

The deployed version uses **Neon PostgreSQL**, while local development can use either PostgreSQL or another compatible PostgreSQL instance.

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd Transit-ERP
```

### 2. Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd ../frontend
npm install
```

## Database Setup

The project uses Prisma for database schema management and migrations.

From the `backend` directory:

```bash
npm run prisma:migrate
```

Generate the Prisma client when required:

```bash
npx prisma generate
```

Seed the database with initial locations, items, inventory, and users:

```bash
npx prisma db seed
```

For local development, make sure your PostgreSQL database is running before executing the migration.

## Environment Variables

Create a `.env` file inside the `backend/` directory.

```env
DATABASE_URL="your-postgresql-connection-string"
DIRECT_URL="your-direct-postgresql-connection-string"
JWT_SECRET="your-jwt-secret"
PORT=5000
```

Do not commit the real `.env` file or production credentials to Git.

## Running the Application

### Start the backend

```bash
cd backend
npm run dev
```

Backend:

```text
http://localhost:5000
```

Swagger documentation:

```text
http://localhost:5000/api-docs
```

### Start the frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Testing

The backend includes Jest + Supertest integration tests covering the critical inventory flows.

Run the complete test suite:

```bash
cd backend
npm run test
```

The integration tests verify that:

1. Inventory cannot be reserved beyond available stock.
2. Stock cannot be transferred beyond available stock.
3. Destination inventory increases only after a transfer is received.
4. A transfer cannot be received more than once.
5. Restricted operations cannot be performed by unauthorized roles.

These tests focus on business rules that directly affect inventory accuracy and operational safety.

## Database Schema

```mermaid
erDiagram

    USERS {
        uuid id PK
        varchar username
        varchar email UK
        varchar passwordHash
        enum role
        uuid locationId FK
    }

    LOCATIONS {
        uuid id PK
        varchar name
        varchar code UK
    }

    CATEGORIES {
        uuid id PK
        varchar name UK
    }

    ITEMS {
        uuid id PK
        varchar name
        varchar sku UK
        uuid categoryId FK
    }

    INVENTORIES {
        uuid id PK
        uuid itemId FK
        uuid locationId FK
        varchar batchCode
        int physicalQty
        int reservedQty
    }

    WORK_ORDERS {
        uuid id PK
        uuid locationId FK
        uuid itemId FK
        int requiredQty
        uuid assignedUserId FK
        enum status
    }

    STOCK_TRANSFERS {
        uuid id PK
        uuid sourceLocationId FK
        uuid destLocationId FK
        uuid itemId FK
        int quantity
        varchar batchCode
        enum status
    }

    CUSTOMER_ORDERS {
        uuid id PK
        uuid itemId FK
        uuid locationId FK
        int quantity
        int reservedQty
        enum status
    }

    USERS }o--|| LOCATIONS : assigned_to
    ITEMS }o--|| CATEGORIES : categorized_by
    INVENTORIES }o--|| ITEMS : references
    INVENTORIES }o--|| LOCATIONS : stored_at
    WORK_ORDERS }o--|| LOCATIONS : belongs_to
    WORK_ORDERS }o--|| ITEMS : requires
    WORK_ORDERS }o--|| USERS : assigned_to
    STOCK_TRANSFERS }o--|| LOCATIONS : source
    STOCK_TRANSFERS }o--|| LOCATIONS : destination
    STOCK_TRANSFERS }o--|| ITEMS : transfers
    CUSTOMER_ORDERS }o--|| ITEMS : orders
    CUSTOMER_ORDERS }o--|| LOCATIONS : reserved_from
```

## API Documentation

Detailed API documentation is maintained separately in:

[`docs/api.md`](docs/api.md)

Swagger documentation is also available when the backend is running:

```text
http://localhost:5000/api-docs
```

## Business Logic

Core business operations are kept inside dedicated services so inventory rules remain isolated from the API layer.

**InventoryService**
Handles stock availability checks, physical quantity updates, and reservation-related inventory operations.

**WorkOrderService**
Calculates current shortages using the latest inventory state.

**TransferService**
Controls transfer dispatch and receipt transactions, ensuring source and destination stock are updated at the correct stage.

**OrderService**
Handles customer reservations using transactional locking to prevent concurrent requests from reserving the same stock.

## Repository Notes

This project is structured as a production-oriented ERP implementation, but the current deployment is intended for development and testing rather than live business operations.
