const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.log("DB Error:", err);
  } else {
    console.log("SQLite DB connected");
  }
});
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS Products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cloudId TEXT,
      title TEXT,
      price REAL,
      stock INTEGER,
      category TEXT,
      seller TEXT,
      description TEXT,
      image TEXT,
      sold INTEGER
    )
  `);

db.run(`
  CREATE TABLE IF NOT EXISTS Orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId TEXT UNIQUE,
    userName TEXT,
    total REAL,
    orderDate TEXT,
    status TEXT,
    address TEXT,
    items TEXT
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS Users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userName TEXT UNIQUE,
    password TEXT,
    role TEXT,
    address TEXT
  )
`);
});
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// READ products
app.get("/products", (req, res) => {
  db.all("SELECT * FROM Products", [], (err, rows) => {
    if (err) {
      return res.json([]);
    }
    res.json(rows);
  });
});

// CREATE product
app.post("/products", (req, res) => {
  const p = {...req.body,cloudId: req.body.cloudId || "PROD-" + Date.now(),
  sold: req.body.sold || 0,};

  db.run(
    `INSERT INTO Products (cloudId, title, price, stock, category, seller, description, image, sold)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      p.cloudId,
      p.title,
      p.price,
      p.stock,
      p.category,
      p.seller,
      p.description,
      p.image,
      p.sold
    ],
    function (err) {
      if (err) {
        return res.json({ success: false, error: err });
      }

      io.emit("productCreated", p);

      res.json({ success: true, product: p });
    }
  );
});

// UPDATE product
app.put("/products/:cloudId", (req, res) => {
  const { cloudId } = req.params;
  const p = req.body;

  db.run(
    `UPDATE Products
     SET title=?, price=?, stock=?, category=?, seller=?, description=?, image=?, sold=?
     WHERE cloudId=?`,
    [
      p.title,
      p.price,
      p.stock,
      p.category,
      p.seller,
      p.description,
      p.image,
      p.sold,
      cloudId
    ],
    function (err) {
      if (err) {
        return res.json({ success: false });
      }

      io.emit("productUpdated", { ...p, cloudId });

      res.json({ success: true });
    }
  );
});

// DELETE product
app.delete("/products/:cloudId", (req, res) => {
  const { cloudId } = req.params;

  db.run(
    `DELETE FROM Products WHERE cloudId=?`,
    [cloudId],
    function (err) {
      if (err) {
        return res.json({ success: false });
      }

      io.emit("productDeleted", cloudId);

      res.json({ success: true });
    }
  );
});
// update quantity
app.put("/products/:cloudId/purchase", (req, res) => {
  const { cloudId } = req.params;
  const { quantity } = req.body;

  db.get(
    "SELECT * FROM Products WHERE cloudId = ?",
    [cloudId],
    (err, product) => {
      if (err || !product) {
        return res.json({ success: false, message: "Product not found" });
      }

      const newStock = Math.max((product.stock || 0) - quantity, 0);
      const newSold = (product.sold || 0) + quantity;

      db.run(
        "UPDATE Products SET stock = ?, sold = ? WHERE cloudId = ?",
        [newStock, newSold, cloudId],
        function (err) {
          if (err) {
            return res.json({ success: false, error: err.message });
          }

          const updatedProduct = {
            ...product,
            stock: newStock,
            sold: newSold,
          };

          io.emit("productUpdated", updatedProduct);

          res.json({
            success: true,
            product: updatedProduct,
          });
        }
      );
    }
  );
});
//create order
app.post("/orders", (req, res) => {
  const o = req.body;

  const order = {
    orderId: o.orderId || "ORD-" + Date.now(),
    userName: o.userName || "Unknown",
    total: o.total || 0,
    orderDate: o.orderDate || new Date().toISOString(),
    status: o.status || "Pending",
    address: o.address || "",
    items: o.items || [],
  };

  db.run(
    `
    INSERT INTO Orders (orderId, userName, total, orderDate, status, address, items)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      order.orderId,
      order.userName,
      order.total,
      order.orderDate,
      order.status,
      order.address,
      JSON.stringify(order.items),
    ],
    function (err) {
      if (err) {
        console.log("Insert order error:", err.message);
        return res.json({ success: false, error: err.message });
      }

      io.emit("orderCreated", order);

      res.json({
        success: true,
        order,
      });
    }
  );
});

//get all order
app.get("/orders", (req, res) => {
  db.all("SELECT * FROM Orders ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.log("Get orders error:", err.message);
      return res.json([]);
    }

    const orders = rows.map((row) => ({
      ...row,
      items: row.items ? JSON.parse(row.items) : [],
    }));

    res.json(orders);
  });
});
app.put("/orders/:orderId/status", (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  db.run(
    `
    UPDATE Orders
    SET status = ?
    WHERE orderId = ?
    `,
    [status, orderId],
    function (err) {
      if (err) {
        console.log("Update order status error:", err.message);
        return res.json({ success: false, error: err.message });
      }

      db.get(
        "SELECT * FROM Orders WHERE orderId = ?",
        [orderId],
        (err, row) => {
          if (err || !row) {
            return res.json({ success: false });
          }

          const updatedOrder = {
            ...row,
            items: row.items ? JSON.parse(row.items) : [],
          };

          io.emit("orderStatusUpdated", updatedOrder);

          res.json({
            success: true,
            order: updatedOrder,
          });
        }
      );
    }
  );
});

//delete order
app.delete("/orders/:orderId", (req, res) => {
  const { orderId } = req.params;

  db.run(
    "DELETE FROM Orders WHERE orderId = ?",
    [orderId],
    function (err) {
      if (err) {
        return res.json({ success: false, error: err.message });
      }

      io.emit("orderDeleted", orderId);

      res.json({
        success: true,
        deletedId: orderId,
      });
    }
  );
});

//register new user
app.post("/users/register", (req, res) => {
  const { userName, password, role } = req.body;

  db.run(
    `INSERT INTO Users (userName, password, role, address)
     VALUES (?, ?, ?, ?)`,
    [userName, password, role || "customer", ""],
    function (err) {
      if (err) {
        return res.json({
          success: false,
          message: "Username already exists",
        });
      }

      res.json({
        success: true,
        user: {
          userName,
          role: role || "customer",
          address: "",
        },
      });
    }
  );
});

//login
app.post("/users/login", (req, res) => {
  const { userName, password } = req.body;

  db.get(
    `SELECT userName, role, address FROM Users
     WHERE userName = ? AND password = ?`,
    [userName, password],
    (err, row) => {
      if (err || !row) {
        return res.json({
          success: false,
          message: "Invalid username or password",
        });
      }

      res.json({
        success: true,
        user: row,
      });
    }
  );
});
app.get("/users/view", (req, res) => {
  db.all("SELECT userName, role, address FROM Users", [], (err, rows) => {
    if (err) return res.send("Error loading users");

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Users View</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f4f6f8;
            padding: 30px;
          }

          h1 {
            color: #2c3e50;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }

          th {
            background: #2c3e50;
            color: white;
            padding: 12px;
            text-align: left;
          }

          td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
            vertical-align: top;
          }

          tr:hover {
            background: #f1f1f1;
          }

          .role {
            font-weight: bold;
            color: #2980b9;
          }

          .address {
            max-width: 500px;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .empty {
            color: #999;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <h1>Users</h1>
        <table>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Address</th>
          </tr>
    `;

    rows.forEach(u => {
      html += `
        <tr>
          <td>${u.userName}</td>
          <td class="role">${u.role || "-"}</td>
          <td class="address">
            ${u.address ? u.address : '<span class="empty">No address saved</span>'}
          </td>
        </tr>
      `;
    });

    html += `
        </table>
      </body>
      </html>
    `;

    res.send(html);
  });
});
//read user
app.get("/users/:userName", (req, res) => {
  const { userName } = req.params;

  db.get(
    `SELECT userName, role, address FROM Users WHERE userName = ?`,
    [userName],
    (err, row) => {
      if (err || !row) {
        return res.json({ success: false });
      }

      res.json({
        success: true,
        user: row,
      });
    }
  );
});

//update address
app.put("/users/:userName/address", (req, res) => {
  const { userName } = req.params;
  const { address } = req.body;

  const cleanUserName = userName.toLowerCase();

  db.run(
    `INSERT OR IGNORE INTO Users (userName, password, role, address)
     VALUES (?, ?, ?, ?)`,
    [cleanUserName, "", "customer", address],
    function (insertErr) {
      if (insertErr) {
        return res.json({ success: false, error: insertErr.message });
      }

      db.run(
        `UPDATE Users SET address = ? WHERE userName = ?`,
        [address, cleanUserName],
        function (updateErr) {
          if (updateErr) {
            return res.json({ success: false, error: updateErr.message });
          }

          const updatedUser = {
            userName: cleanUserName,
            address,
          };

          io.emit("userAddressUpdated", updatedUser);

          res.json({
            success: true,
            user: updatedUser,
            rowsAffected: this.changes,
          });
        }
      );
    }
  );
});
app.delete('/users/:userName', (req, res) => {
  const userName = req.params.userName?.trim().toLowerCase();

  if (!userName) {
    return res.json({
      success: false,
      message: 'Missing username',
    });
  }

  db.run(
    `DELETE FROM users WHERE LOWER(userName) = LOWER(?)`,
    [userName],
    function (err) {
      if (err) {
        return res.json({
          success: false,
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.json({
          success: false,
          message: 'User not found in cloud',
        });
      }

      return res.json({
        success: true,
        message: 'User deleted from cloud successfully',
      });
    }
  );
});
app.put("/users/:userName/password", (req, res) => {
  const userName = req.params.userName?.trim().toLowerCase();
  const { password } = req.body;

  if (!userName || !password) {
    return res.json({
      success: false,
      message: "Missing username or password",
    });
  }
  app.delete('/users/:userName', (req, res) => {
  const userName = req.params.userName?.trim().toLowerCase();

  if (!userName) {
    return res.json({
      success: false,
      message: 'Missing username',
    });
  }

  db.run(
    `DELETE FROM users WHERE LOWER(userName) = LOWER(?)`,
    [userName],
    function (err) {
      if (err) {
        return res.json({
          success: false,
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.json({
          success: false,
          message: 'User not found in cloud',
        });
      }

      return res.json({
        success: true,
        message: 'User deleted from cloud successfully',
      });
    }
  );
});

  db.run(
    `UPDATE users SET password = ? WHERE LOWER(userName) = LOWER(?)`,
    [password, userName],
    function (err) {
      if (err) {
        return res.json({
          success: false,
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.json({
          success: false,
          message: "Username not found",
        });
      }

      return res.json({
        success: true,
        message: "Password updated successfully",
      });
    }
  );
});

app.get("/users", (req, res) => {
  db.all("SELECT userName, role, address FROM Users", [], (err, rows) => {
    if (err) {
      return res.json([]);
    }
    res.json(rows);
  });
});
app.get("/products/view", (req, res) => {
  db.all("SELECT * FROM Products", [], (err, rows) => {
    if (err) return res.send("Error loading products");

    let html = `
      <html>
      <head>
        <style>
          body { font-family: Arial; background:#f4f6f8; padding:30px; }
          h1 { color:#2c3e50; }
          table { width:100%; border-collapse: collapse; background:white; }
          th { background:#2c3e50; color:white; padding:12px; }
          td { padding:12px; border-bottom:1px solid #ddd; }
          tr:hover { background:#f1f1f1; }
        </style>
      </head>
      <body>
        <h1>Products</h1>
        <table>
          <tr>
            <th>Title</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Sold</th>
            <th>Cloud ID</th>
          </tr>
    `;

    rows.forEach(p => {
      html += `
        <tr>
          <td>${p.title}</td>
          <td>RM ${p.price}</td>
          <td>${p.stock}</td>
          <td>${p.sold}</td>
          <td>${p.cloudId}</td>
        </tr>
      `;
    });

    html += `</table></body></html>`;
    res.send(html);
  });
});
app.get("/orders/view", (req, res) => {
  db.all("SELECT * FROM Orders ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.send("Error loading orders");

    let html = `
      <html>
      <head>
        <style>
          body { font-family: Arial; background:#f4f6f8; padding:30px; }
          h1 { color:#2c3e50; }
          .card {
            background:white;
            padding:15px;
            margin-bottom:15px;
            border-radius:8px;
            box-shadow:0 2px 8px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <h1>Orders</h1>
    `;

    rows.forEach(o => {
      const items = JSON.parse(o.items || "[]");

      html += `
        <div class="card">
          <strong>${o.orderId}</strong><br/>
          User: ${o.userName}<br/>
          Status: ${o.status}<br/>
          Total: RM ${o.total}<br/>
          Address: ${o.address || "-"}<br/>
          <ul>
      `;

      items.forEach(i => {
        html += `<li>${i.title || i.name} × ${i.quantity}</li>`;
      });

      html += `</ul></div>`;
    });

    html += `</body></html>`;
    res.send(html);
  });
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Backend running on http://localhost:3000");
});