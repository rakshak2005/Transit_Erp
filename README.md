# Mini Operations ERP

A production-oriented, full-stack Operations ERP application built with Node.js/Express, React, TypeScript, and PostgreSQL. It manages inventory across multiple locations, work orders, stock transfers, and customer stock reservations using robust database-level transactions to ensure stock safety and prevent overselling.

---

## Technical Stack

- **Frontend**: React + Vite + TypeScript, styled using Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (relational database with transaction isolation and row locks)
- **ORM**: Prisma Client
- **Validation**: Built-in request parsing and Zod schema validations
- **Testing**: Jest + Supertest (API Integration Testing)
- **API Documentation**: Swagger UI (rendered at `/api-docs`)

---

## Database Schema Design

The relational database is structured as follows:

```mermaid
erDiagram
    users {
        uuid id PK
        varchar username
        varchar email UK
        varchar passwordHash
        enum role
        uuid locationId FK
    }
    locations {
        uuid id PK
        varchar name
        varchar code UK
    }
    categories {
        uuid id PK
        varchar name UK
    }
    items {
        uuid id PK
        varchar name
        varchar sku UK
        uuid categoryId FK
    }
    inventories {
        uuid id PK
        uuid itemId FK
        uuid locationId FK
        varchar batchCode
        int physicalQty
        int reservedQty
    }
    work_orders {
        uuid id PK
        uuid locationId FK
        uuid itemId FK
        int requiredQty
        uuid assignedUserId FK
        enum status
    }
    stock_transfers {
        uuid id PK
        uuid sourceLocationId FK
        uuid destLocationId FK
        uuid itemId FK
        int quantity
        varchar batchCode
        enum status
    }
    customer_orders {
        uuid id PK
        uuid itemId FK
        uuid locationId FK
        int quantity
        int reservedQty
        enum status
    }

    users }o--|| locations : "assigned to"
    items }o--|| categories : "categorized by"
    inventories }o--|| items : "references item"
    inventories }o--|| locations : "located at"
    work_orders }o--|| locations : "location"
    work_orders }o--|| items : "requires item"
    work_orders }o--|| users : "assigned to user"
    stock_transfers }o--|| locations : "source"
    stock_transfers }o--|| locations : "destination"
    stock_transfers }o--|| items : "transfers item"
    customer_orders }o--|| items : "ordered item"
    customer_orders }o--|| locations : "reserved from"
```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

Create a file named `.env` in the `backend/` directory:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/mini_ops_erp?schema=public"
JWT_SECRET="super-secret-jwt-key"
PORT=5000
```

---

## Project Setup & Running Locally

### Prerequisites

Ensure you have Node.js (v18+) and PostgreSQL database service running locally.

### 1. Database Setup

1. Create a database called `mini_ops_erp` in PostgreSQL or let Prisma create it automatically.
2. In the `backend` folder, run migrations to generate the database schema and tables:
   ```bash
   cd backend
   npm run prisma:migrate
   ```
3. Run the database seed script to populate default locations, items, initial inventory, and role-based users:
   ```bash
   npx prisma db seed
   ```

### 2. Run the Backend Server

```bash
cd backend
npm run dev
```
The server will start on `http://localhost:5000`. You can access the API Swagger docs at `http://localhost:5000/api-docs`.

### 3. Run the Frontend App

```bash
cd frontend
npm install
npm run dev
```
The client app will launch at `http://localhost:5173`.

---

## Running Integration Tests

To run the Jest + Supertest integration suite testing the 5 mandatory business flows:

```bash
cd backend
npm run test
```

### Verified Scenarios:
1. **Test 1**: Cannot reserve more than available inventory.
2. **Test 2**: Cannot transfer more than available inventory.
3. **Test 3**: Destination stock increases only after transfer receipt (remains unchanged during dispatch).
4. **Test 4**: Same transfer cannot be received twice.
5. **Test 5**: Unauthorized user cannot perform restricted operation (role-based router protection).

---

## API Documentation

Swagger API documentation is exposed at `/api-docs` when running the backend:
- Swagger Docs URL: `http://localhost:5000/api-docs`

---

## Service Layer & Live Verification Preparedness

Business logic is isolated into services under `backend/src/services/` to make modification simple:
- **`InventoryService`**: Handles physical updates and availability checks.
- **`WorkOrderService`**: Dynamic calculation of shortages (`Required - Available`).
- **`TransferService`**: Transaction boundaries for stock dispatch (reducing source stock) and receipt (increasing destination stock).
- **`OrderService`**: Transaction protection utilizing database row-level locks (`SELECT ... FOR UPDATE`) to prevent overselling on concurrent customer reservations.
