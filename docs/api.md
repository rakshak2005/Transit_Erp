# API Documentation

The backend exposes a Swagger UI at **`/api-docs`** when the server is running (e.g. `http://localhost:5000/api-docs`). Below is a concise reference of the primary REST endpoints.

---

## Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login with `{ email, password }`, returns a JWT. |
| `POST` | `/api/auth/register` | Register a new user (admin‑only). |

---

## Users (admin only for list)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users (admin). |
| `GET` | `/api/users/:id` | Get a single user. |
| `PUT` | `/api/users/:id` | Update user data. |
| `DELETE` | `/api/users/:id` | Delete a user. |

---

## Locations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/locations` | Retrieve all locations. |
| `POST` | `/api/locations` | Create a location (admin). |
| `PUT` | `/api/locations/:id` | Update a location. |
| `DELETE` | `/api/locations/:id` | Delete a location. |

---

## Items & Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/items` | List items. |
| `POST` | `/api/items` | Create a new item. |
| `GET` | `/api/inventories` | View inventory across locations. |
| `PATCH` | `/api/inventories/:id` | Internal stock updates (used by services). |

---

## Work Orders (Operations role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/work-orders` | Create a work order for the caller’s branch. |
| `GET` | `/api/work-orders` | List work orders visible to the caller. |
| `PATCH` | `/api/work-orders/:id` | Update status (e.g., `PENDING → COMPLETED`). |

---

## Stock Transfers
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/stock-transfers` | Initiate a transfer; source must be caller’s branch. |
| `GET` | `/api/stock-transfers` | List transfers. |

---

## Customer Orders (Sales role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/customer-orders` | Reserve stock for a customer; limited to caller’s branch. |
| `GET` | `/api/customer-orders` | List customer orders. |

---

All endpoints are protected by JWT authentication and role‑based middleware (`ADMIN`, `OPERATIONS`, `SALES`). Errors follow a consistent JSON shape:
```json
{ "error": "Message", "code": 400 }
```

For a full interactive view, start the backend (`npm run dev` in `backend`) and navigate to **`http://localhost:5000/api-docs`**.
