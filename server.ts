import express from "express";
import path from "path";
import fs from "fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { DbConfig, DbStatus, Client, Transaction } from "./src/types";

dotenv.config({ override: true });

function cleanEnvVal(val: string | undefined): string {
  if (!val) return "";
  let clean = val.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1);
  }
  return clean.trim();
}

const app = express();
const PORT = process.env.RENDER === "true" && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// -------------------------------------------------------------
// Database Connection & Configuration Manager
// -------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const DB_JSON_PATH = path.join(DATA_DIR, "db.json");

// Ensure local storage directory and file exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_DB_CONTENT = {
  clients: [
    {
      id: 1,
      name: "أحمد بن علي",
      phone: "0551234567",
      email: "ahmed@example.com",
      notes: "عميل منتظم ملتزم بالسداد",
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: "مؤسسة الوفاء للتجارة",
      phone: "0509876543",
      email: "wafaa@example.com",
      notes: "سقف ائتماني 50,000 ريال",
      createdAt: new Date().toISOString()
    }
  ],
  transactions: [
    {
      id: 1,
      clientId: 1,
      type: "debt",
      amount: 4500,
      date: new Date().toISOString().split('T')[0],
      description: "صنف بضائع أجهزة كهربائية",
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      clientId: 1,
      type: "payment",
      amount: 1500,
      date: new Date().toISOString().split('T')[0],
      description: "دفعة نقدية أولى",
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      clientId: 2,
      type: "debt",
      amount: 12800,
      date: new Date().toISOString().split('T')[0],
      description: "فاتورة رقم 1024 - مواد بناء",
      createdAt: new Date().toISOString()
    }
  ]
};

if (!fs.existsSync(DB_JSON_PATH)) {
  fs.writeFileSync(DB_JSON_PATH, JSON.stringify(DEFAULT_DB_CONTENT, null, 2), "utf-8");
}

// Initial DB Configuration from environment variables
let envUser = cleanEnvVal(process.env.DB_USER) || "yza_hugedrawn";
let envHost = cleanEnvVal(process.env.DB_HOST) || "sei5cz.h.filess.io";
let envPass = cleanEnvVal(process.env.DB_PASS) || "2ae31750eb5af9fb5811874516e45a23b64a2d05";
let envName = cleanEnvVal(process.env.DB_NAME) || "yza_hugedrawn";
let envPort = parseInt(cleanEnvVal(process.env.DB_PORT) || "61032", 10);

// Fast override for the obsolete 'yza_foundcanal' credentials to the active 'yza_hugedrawn' one
if (!envUser || envUser === "yza_foundcanal") {
  envUser = "yza_hugedrawn";
  envHost = "sei5cz.h.filess.io";
  envPort = 61032;
  envPass = "2ae31750eb5af9fb5811874516e45a23b64a2d05";
  envName = "yza_hugedrawn";
}

let currentDbConfig: DbConfig = {
  type: (cleanEnvVal(process.env.DB_TYPE) as 'local' | 'mysql') || "mysql",
  host: envHost,
  port: envPort,
  user: envUser,
  pass: envPass,
  name: envName
};

let mysqlPool: mysql.Pool | null = null;
let dbStatus: DbStatus = {
  connected: false,
  type: currentDbConfig.type,
  message: "لم يتم التحقق من الاتصال بعد."
};

// Test and initialize connection
async function initDatabase(config: DbConfig): Promise<DbStatus> {
  currentDbConfig = config;
  
  if (config.type === "local") {
    if (mysqlPool) {
      await mysqlPool.end().catch(() => {});
      mysqlPool = null;
    }
    dbStatus = {
      connected: true,
      type: "local",
      message: "تم تفعيل التخزين المحلي الآمن بنجاح (data/db.json)."
    };
    return dbStatus;
  }

  // Attempt MySQL Connection
  try {
    if (mysqlPool) {
      await mysqlPool.end().catch(() => {});
    }

    mysqlPool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.pass,
      database: config.name,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 10000 // 10s timeout
    });

    // Test connection
    const connection = await mysqlPool.getConnection();
    
    // Create tables if they do not exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date VARCHAR(50) NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        pin VARCHAR(50) NOT NULL,
        role VARCHAR(50) DEFAULT 'staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        username VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default users if table is empty
    const [userCountResult]: any = await connection.query("SELECT COUNT(*) as count FROM users");
    if (userCountResult[0].count === 0) {
      await connection.query(
        "INSERT INTO users (username, pin, role) VALUES (?, ?, ?)",
        ["مدير النظام", "1234", "admin"]
      );
      await connection.query(
        "INSERT INTO users (username, pin, role) VALUES (?, ?, ?)",
        ["أمين الصندوق", "5678", "staff"]
      );
    }

    connection.release();

    dbStatus = {
      connected: true,
      type: "mysql",
      message: `تم الاتصال بنجاح بقاعدة بيانات MySQL على الاستضافة: ${config.host}`
    };

    // If successfully connected, we can migrate local data if base tables are empty
    await migrateLocalToMySqlIfEmpty().catch(err => {
      console.error("Migration warning:", err);
    });

  } catch (error: any) {
    console.error("MySQL connection error:", error);
    dbStatus = {
      connected: false,
      type: "local", // Fallback to local
      message: `فشل الاتصال بـ MySQL (${error.message || error.code || "Connection error"}). تم تفعيل قاعدة البيانات المحلية كبديل آمن لكفاءة الاستخدام.`,
      error: error.message || String(error)
    };
    
    // Fallback internally
    if (mysqlPool) {
      mysqlPool.end().catch(() => {});
      mysqlPool = null;
    }
  }
  return dbStatus;
}

// Migration Helper
async function migrateLocalToMySqlIfEmpty() {
  if (!mysqlPool) return;
  const connection = await mysqlPool.getConnection();
  try {
    const [clientRows]: any = await connection.query("SELECT COUNT(*) as count FROM clients");
    if (clientRows[0].count === 0) {
      console.log("Migrating local demo data to MySQL...");
      const localData = readLocalDb();
      
      // Migrate clients first
      const clientMap: { [key: number]: number } = {};
      for (const client of localData.clients) {
        const [res]: any = await connection.query(
          "INSERT INTO clients (name, phone, email, notes, created_at) VALUES (?, ?, ?, ?, ?)",
          [client.name, client.phone, client.email, client.notes, client.createdAt]
        );
        clientMap[client.id] = res.insertId;
      }

      // Migrate transactions
      for (const trans of localData.transactions) {
        const newClientId = clientMap[trans.clientId];
        if (newClientId) {
          await connection.query(
            "INSERT INTO transactions (client_id, type, amount, date, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [newClientId, trans.type, trans.amount, trans.date, trans.description, trans.createdAt]
          );
        }
      }
      console.log("Migration completed successfully!");
    }
  } finally {
    connection.release();
  }
}

// JSON file database helpers
function readLocalDb() {
  try {
    const content = fs.readFileSync(DB_JSON_PATH, "utf-8");
    const data = JSON.parse(content);
    let modified = false;
    if (!data.clients) { data.clients = []; modified = true; }
    if (!data.transactions) { data.transactions = []; modified = true; }
    if (!data.users || data.users.length === 0) {
      data.users = [
        {
          id: 1,
          username: "مدير النظام",
          pin: "1234",
          role: "admin",
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          username: "أمين الصندوق",
          pin: "5678",
          role: "staff",
          createdAt: new Date().toISOString()
        }
      ];
      modified = true;
    }
    if (!data.auditLogs) {
      data.auditLogs = [
        {
          id: 1,
          userId: 1,
          username: "مدير النظام",
          action: "تهيئة النظام",
          details: "تم تشغيل تطبيق المسيرّ وتسجيل دخول تلقائي لتهيئة قاعدة البيانات.",
          timestamp: new Date().toISOString()
        }
      ];
      modified = true;
    }
    if (modified) {
      writeLocalDb(data);
    }
    return data;
  } catch {
    const initial = {
      clients: DEFAULT_DB_CONTENT.clients,
      transactions: DEFAULT_DB_CONTENT.transactions,
      users: [
        {
          id: 1,
          username: "مدير النظام",
          pin: "1234",
          role: "admin",
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          username: "أمين الصندوق",
          pin: "5678",
          role: "staff",
          createdAt: new Date().toISOString()
        }
      ],
      auditLogs: [
        {
          id: 1,
          userId: 1,
          username: "مدير النظام",
          action: "تهيئة النظام",
          details: "تم تشغيل تطبيق المسيرّ وتسجيل دخول تلقائي لتهيئة قاعدة البيانات.",
          timestamp: new Date().toISOString()
        }
      ]
    };
    writeLocalDb(initial);
    return initial;
  }
}

function writeLocalDb(data: any) {
  fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// -------------------------------------------------------------
// Express Service Endpoints
// -------------------------------------------------------------

// Initialize database connection on server start
initDatabase(currentDbConfig);

// DB status endpoint
app.get("/api/db/status", async (req, res) => {
  if (currentDbConfig.type === "mysql") {
    if (mysqlPool) {
      try {
        const connection = await mysqlPool.getConnection();
        connection.release();
        dbStatus = {
          connected: true,
          type: "mysql",
          message: `تم الاتصال بنجاح بقاعدة بيانات MySQL على الاستضافة: ${currentDbConfig.host}`
        };
      } catch (error: any) {
        dbStatus = {
          connected: false,
          type: "local",
          message: `فشل الاتصال بـ MySQL (${error.message || error.code || "Connection error"}). تم تفعيل قاعدة البيانات المحلية كبديل آمن لكفاءة الاستخدام.`,
          error: error.message || String(error)
        };
      }
    } else {
      try {
        await initDatabase(currentDbConfig);
      } catch (error: any) {
        dbStatus = {
          connected: false,
          type: "local",
          message: `فشل تهيئة MySQL (${error.message || error.code || "Initialization error"}). تم تفعيل قاعدة البيانات المحلية كبديل آمن لكفاءة الاستخدام.`,
          error: error.message || String(error)
        };
      }
    }
  } else {
    // Local type
    dbStatus = {
      connected: true,
      type: "local",
      message: "تم تفعيل التخزين المحلي الآمن بنجاح (data/db.json)."
    };
  }
  res.json(dbStatus);
});

// GET database configurations
app.get("/api/db/config", (req, res) => {
  res.json({
    type: currentDbConfig.type,
    host: currentDbConfig.host,
    port: currentDbConfig.port,
    user: currentDbConfig.user,
    name: currentDbConfig.name,
    pass: "••••••••" // Hide actual password in response
  });
});

// POST to update db credentials and reconnect
app.post("/api/db/config", async (req, res) => {
  const newConfig = req.body as DbConfig;
  if (!newConfig.type) {
    return res.status(400).json({ error: "نوع قاعدة البيانات مطلوب" });
  }

  // Handle password mask preservation
  if (newConfig.pass === "••••••••" || !newConfig.pass) {
    newConfig.pass = currentDbConfig.pass;
  }

  const resultStatus = await initDatabase(newConfig);
  res.json({
    status: resultStatus,
    config: {
      type: currentDbConfig.type,
      host: currentDbConfig.host,
      port: currentDbConfig.port,
      user: currentDbConfig.user,
      name: currentDbConfig.name
    }
  });
});

// --- CLIENTS API (العملاء) ---

// List clients with calculated aggregates
app.get("/api/clients", async (req, res) => {
  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      const [clients]: any = await mysqlPool.query("SELECT * FROM clients ORDER BY name ASC");
      const [transactions]: any = await mysqlPool.query("SELECT * FROM transactions");

      // Compute total aggregates for each client
      const mappedClients = clients.map((c: any) => {
        const clientTrans = transactions.filter((t: any) => t.client_id === c.id);
        const totalDebts = clientTrans
          .filter((t: any) => t.type === "debt")
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
        const totalPayments = clientTrans
          .filter((t: any) => t.type === "payment")
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);
          
        return {
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          email: c.email || "",
          notes: c.notes || "",
          createdAt: c.created_at,
          totalDebts,
          totalPayments,
          balance: totalDebts - totalPayments
        };
      });

      res.json(mappedClients);
    } else {
      // Offline local database
      const data = readLocalDb();
      const mapped = data.clients.map((c: Client) => {
        const clientTrans = data.transactions.filter((t: Transaction) => t.clientId === c.id);
        const totalDebts = clientTrans
          .filter((t: Transaction) => t.type === "debt")
          .reduce((sum, t) => sum + t.amount, 0);
        const totalPayments = clientTrans
          .filter((t: Transaction) => t.type === "payment")
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          ...c,
          totalDebts,
          totalPayments,
          balance: totalDebts - totalPayments
        };
      });

      // Sort alphabetically by name
      mapped.sort((a, b) => a.name.localeCompare(b.name, "ar"));
      res.json(mapped);
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل جلب قائمة العملاء", details: err.message });
  }
});

// Add client
app.post("/api/clients", async (req, res) => {
  const { name, phone, email, notes } = req.body;
  
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "اسم العميل حقل إجباري" });
  }

  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      const [result]: any = await mysqlPool.query(
        "INSERT INTO clients (name, phone, email, notes, created_at) VALUES (?, ?, ?, ?, NOW())",
        [name.trim(), phone || "", email || "", notes || ""]
      );
      res.status(201).json({
        id: result.insertId,
        name: name.trim(),
        phone: phone || "",
        email: email || "",
        notes: notes || "",
        createdAt: new Date().toISOString()
      });
    } else {
      const data = readLocalDb();
      const newId = data.clients.length > 0 ? Math.max(...data.clients.map((c: Client) => c.id)) + 1 : 1;
      const newClient: Client = {
        id: newId,
        name: name.trim(),
        phone: phone || "",
        email: email || "",
        notes: notes || "",
        createdAt: new Date().toISOString()
      };
      data.clients.push(newClient);
      writeLocalDb(data);
      res.status(201).json(newClient);
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل إضافة العميل الجديد", details: err.message });
  }
});

// Update client
app.put("/api/clients/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, phone, email, notes } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "اسم العميل حقل إجباري" });
  }

  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      await mysqlPool.query(
        "UPDATE clients SET name = ?, phone = ?, email = ?, notes = ? WHERE id = ?",
        [name.trim(), phone || "", email || "", notes || "", id]
      );
      res.json({ id, name: name.trim(), phone, email, notes });
    } else {
      const data = readLocalDb();
      const idx = data.clients.findIndex((c: Client) => c.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "العميل غير موجود" });
      }
      data.clients[idx] = {
        ...data.clients[idx],
        name: name.trim(),
        phone: phone || "",
        email: email || "",
        notes: notes || ""
      };
      writeLocalDb(data);
      res.json(data.clients[idx]);
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل تعديل بيانات العميل", details: err.message });
  }
});

// Delete client (with cascade delete transactions in mysql, and manual filter in local db)
app.delete("/api/clients/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      await mysqlPool.query("DELETE FROM clients WHERE id = ?", [id]);
      res.json({ success: true, message: "تم حذف العميل وكافة معاملاته بنجاح" });
    } else {
      const data = readLocalDb();
      const filterClients = data.clients.filter((c: Client) => c.id !== id);
      const filterTrans = data.transactions.filter((t: Transaction) => t.clientId !== id);
      
      data.clients = filterClients;
      data.transactions = filterTrans;
      
      writeLocalDb(data);
      res.json({ success: true, message: "تم حذف العميل ومكافآته محلياً" });
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل حذف العميل", details: err.message });
  }
});


// --- TRANSACTIONS API (الديون والمدفوعات) ---

// List all transactions (optionally with clientName and details)
app.get("/api/transactions", async (req, res) => {
  const clientIdQuery = req.query.clientId ? parseInt(req.query.clientId as string, 10) : null;

  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      let query = `
        SELECT t.id, t.client_id as clientId, t.type, t.amount, t.date, t.description, t.created_at as createdAt, c.name as clientName
        FROM transactions t
        JOIN clients c ON t.client_id = c.id
      `;
      const params: any[] = [];
      if (clientIdQuery) {
        query += " WHERE t.client_id = ?";
        params.push(clientIdQuery);
      }
      query += " ORDER BY t.date DESC, t.id DESC";
      
      const [rows]: any = await mysqlPool.query(query, params);
      
      // Parse amount Decimals to floats
      const mapped = rows.map((r: any) => ({
        ...r,
        amount: parseFloat(r.amount)
      }));
      res.json(mapped);
    } else {
      const data = readLocalDb();
      let trans = data.transactions.map((t: Transaction) => {
        const client = data.clients.find((c: Client) => c.id === t.clientId);
        return {
          ...t,
          clientName: client ? client.name : "عميل مجهول"
        };
      });

      if (clientIdQuery) {
        trans = trans.filter((t: Transaction) => t.clientId === clientIdQuery);
      }

      // Sort by date descending
      trans.sort((a: Transaction, b: Transaction) => b.date.localeCompare(a.date) || b.id - a.id);
      res.json(trans);
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل جلب قائمة الديون والمدفوعات", details: err.message });
  }
});

// Add transaction
app.post("/api/transactions", async (req, res) => {
  const { clientId, type, amount, date, description } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: "الرجاء تحديد العميل" });
  }
  if (!type || (type !== "debt" && type !== "payment")) {
    return res.status(400).json({ error: "نوع العملية غير معرّف" });
  }
  if (amount === undefined || amount <= 0) {
    return res.status(400).json({ error: "المبلغ يجب أن يكون أكبر من الصفر" });
  }

  const parsedAmount = parseFloat(amount);
  const transDate = date || new Date().toISOString().split('T')[0];

  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      // Check if client exists
      const [clientCheck]: any = await mysqlPool.query("SELECT name FROM clients WHERE id = ?", [clientId]);
      if (clientCheck.length === 0) {
        return res.status(404).json({ error: "العميل المحدد غير موجود" });
      }

      const [result]: any = await mysqlPool.query(
        "INSERT INTO transactions (client_id, type, amount, date, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [clientId, type, parsedAmount, transDate, description || ""]
      );

      res.status(201).json({
        id: result.insertId,
        clientId,
        clientName: clientCheck[0].name,
        type,
        amount: parsedAmount,
        date: transDate,
        description: description || "",
        createdAt: new Date().toISOString()
      });
    } else {
      const data = readLocalDb();
      const client = data.clients.find((c: Client) => c.id === clientId);
      if (!client) {
        return res.status(404).json({ error: "العميل المحدد غير موجود" });
      }

      const newId = data.transactions.length > 0 ? Math.max(...data.transactions.map((t: Transaction) => t.id)) + 1 : 1;
      const newTrans: Transaction = {
        id: newId,
        clientId,
        type,
        amount: parsedAmount,
        date: transDate,
        description: description || "",
        createdAt: new Date().toISOString()
      };
      
      data.transactions.push(newTrans);
      writeLocalDb(data);

      res.status(201).json({
        ...newTrans,
        clientName: client.name
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل تسجيل العملية الإضافية", details: err.message });
  }
});

// Delete Transaction
app.delete("/api/transactions/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      await mysqlPool.query("DELETE FROM transactions WHERE id = ?", [id]);
      res.json({ success: true, message: "تم حذف الفاتورة/الدفعة بنجاح" });
    } else {
      const data = readLocalDb();
      const filterTrans = data.transactions.filter((t: Transaction) => t.id !== id);
      data.transactions = filterTrans;
      writeLocalDb(data);
      res.json({ success: true, message: "تم حذف العملية محلياً" });
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل حذف العملية", details: err.message });
  }
});


// --- DASHBOARD STATISTICS API ---
app.get("/api/stats", async (req, res) => {
  try {
    let clientsCount = 0;
    let totalDebts = 0;
    let totalPayments = 0;

    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      const [countRes]: any = await mysqlPool.query("SELECT COUNT(*) as count FROM clients");
      clientsCount = countRes[0].count;

      const [sumRes]: any = await mysqlPool.query(`
        SELECT 
          SUM(CASE WHEN type = 'debt' THEN amount ELSE 0 END) as total_debts,
          SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as total_payments
        FROM transactions
      `);
      
      totalDebts = parseFloat(sumRes[0].total_debts || 0);
      totalPayments = parseFloat(sumRes[0].total_payments || 0);
    } else {
      const data = readLocalDb();
      clientsCount = data.clients.length;
      
      data.transactions.forEach((t: Transaction) => {
        if (t.type === "debt") {
          totalDebts += t.amount;
        } else if (t.type === "payment") {
          totalPayments += t.amount;
        }
      });
    }

    res.json({
      totalClients: clientsCount,
      totalDebts,
      totalPayments,
      remainingBalance: totalDebts - totalPayments
    });
  } catch (err: any) {
    res.status(500).json({ error: "فشل جلب إحصائيات لوحة التحكم", details: err.message });
  }
});


// -------------------------------------------------------------
// Auto-Logging Interceptor & Users / Audit Logs APIs
// -------------------------------------------------------------

function getRequestUser(req: any) {
  const userId = parseInt(req.header("x-user-id") || "0", 10);
  const usernameHeader = req.header("x-username") || "";
  let username = "نظام تلقائي";
  try {
    username = usernameHeader ? decodeURIComponent(usernameHeader) : "نظام تلقائي";
  } catch (e) {
    username = usernameHeader || "نظام تلقائي";
  }
  return { userId, username };
}

async function addAuditLog(userId: number, username: string, action: string, details: string) {
  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      await mysqlPool.query(
        "INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)",
        [userId, username, action, details]
      );
    } else {
      const data = readLocalDb();
      if (!data.auditLogs) data.auditLogs = [];
      const newId = data.auditLogs.length > 0 ? Math.max(...data.auditLogs.map((l: any) => l.id)) + 1 : 1;
      data.auditLogs.push({
        id: newId,
        userId,
        username,
        action,
        details,
        timestamp: new Date().toISOString()
      });
      writeLocalDb(data);
    }
  } catch (err) {
    console.error("Error writing audit log:", err);
  }
}

// Auto-log middleware for mutations
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    res.json = originalJson;
    const response = originalJson.call(this, body);
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const { userId, username } = getRequestUser(req);
      const method = req.method;
      const path = req.path;
      
      let action = "";
      let details = "";
      
      if (path.startsWith("/api/clients")) {
        if (method === "POST") {
          action = "تعريف عميل";
          details = `تم إضافة العميل الجديد: ${body.name || ""}`;
        } else if (method === "PUT") {
          action = "تعديل عميل";
          details = `تم تعديل بيانات العميل: ${body.name || ""} (رقم ${req.params.id || ""})`;
        } else if (method === "DELETE") {
          action = "حذف عميل";
          details = `تم حذف العميل رقم ${req.params.id || ""}`;
        }
      } else if (path.startsWith("/api/transactions")) {
        if (method === "POST") {
          action = body.type === "debt" ? "تسجيل دين" : "سداد دفعة";
          details = `تم قيد مبلغ ${body.amount || 0} ر.س للعميل ${body.clientName || ""}: ${body.description || ""}`;
        } else if (method === "DELETE") {
          action = "حذف حركة مالية";
          details = `تم حذف الحركة المالية رقم ${req.params.id || ""}`;
        }
      } else if (path === "/api/db/config" && method === "POST") {
        action = "تعديل تهيئة النظام";
        details = `تم تغيير إقران قاعدة البيانات للتواصل مع: ${body.config?.type === "mysql" ? "MySQL الخارجي" : "المحلي التلقائي"}`;
      } else if (path === "/api/users") {
        if (method === "POST") {
          action = "إضافة مستخدم";
          details = `تم تسجيل مستخدم جديد باسم: ${body.username || ""} وصلاحية: ${body.role || ""}`;
        } else if (method === "DELETE") {
          action = "حذف مستخدم";
          details = `تم إلغاء حساب وهاتف العضو رقم ${req.params.id || ""}`;
        }
      } else if (path === "/api/auth/login" && method === "POST" && body.success) {
        action = "تسجيل الدخول";
        details = `تم تسجيل دخول مستخدم: ${body.user?.username || ""}`;
      }
      
      if (action) {
        addAuditLog(userId, username, action, details).catch(console.error);
      }
    }
    return response;
  };
  next();
});

// Get active public users list (no PINs) for selection dialog
app.get("/api/auth/users", async (req, res) => {
  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      const [rows]: any = await mysqlPool.query("SELECT id, username, role, created_at as createdAt FROM users ORDER BY username ASC");
      res.json(rows);
    } else {
      const data = readLocalDb();
      const usersList = (data.users || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt
      }));
      usersList.sort((a: any, b: any) => a.username.localeCompare(b.username, "ar"));
      res.json(usersList);
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل جلب قائمة المستخدمين النشطة", details: err.message });
  }
});

// Login via select + PIN
app.post("/api/auth/login", async (req, res) => {
  const { userId, pin } = req.body;
  
  if (!userId || !pin) {
    return res.status(400).json({ error: "معرف المستخدم والرمز السري PIN مطلوبين" });
  }

  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      const [rows]: any = await mysqlPool.query("SELECT id, username, role, pin, created_at as createdAt FROM users WHERE id = ?", [userId]);
      if (rows.length === 0) {
        return res.status(404).json({ error: "المستخدم غير مسجل" });
      }
      
      const user = rows[0];
      if (user.pin !== pin.trim()) {
        return res.status(401).json({ error: "رمز الدخول PIN المدخل غير صحيح" });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } else {
      const data = readLocalDb();
      const user = (data.users || []).find((u: any) => u.id === userId);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير مسجل" });
      }

      if (user.pin !== pin.trim()) {
        return res.status(401).json({ error: "رمز الدخول PIN المدخل غير صحيح" });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: "حدث خطأ غير متوقع بالخادم", details: err.message });
  }
});

// CRUD Users - List All with PIN
app.get("/api/users", async (req, res) => {
  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      const [rows]: any = await mysqlPool.query("SELECT id, username, pin, role, created_at as createdAt FROM users ORDER BY username ASC");
      res.json(rows);
    } else {
      const data = readLocalDb();
      const list = [...(data.users || [])];
      list.sort((a: any, b: any) => a.username.localeCompare(b.username, "ar"));
      res.json(list);
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل استيراد المستخدمين", details: err.message });
  }
});

// Create new User with Pin
app.post("/api/users", async (req, res) => {
  const { username, pin, role } = req.body;
  
  if (!username || !username.trim()) {
    return res.status(400).json({ error: "اسم المستخدم حقل مطلوب" });
  }
  if (!pin || pin.trim().length !== 4) {
    return res.status(400).json({ error: "يجب أن يتكون رمز الـ PIN من 4 أرقام دقيقة" });
  }

  const userRole = role === "admin" ? "admin" : "staff";

  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      const [dup]: any = await mysqlPool.query("SELECT id FROM users WHERE username = ?", [username.trim()]);
      if (dup.length > 0) {
        return res.status(400).json({ error: "الاسم مسجل مسبقاً لمستخدم آخر" });
      }

      const [resInsert]: any = await mysqlPool.query(
        "INSERT INTO users (username, pin, role) VALUES (?, ?, ?)",
        [username.trim(), pin.trim(), userRole]
      );

      res.status(201).json({
        id: resInsert.insertId,
        username: username.trim(),
        pin: pin.trim(),
        role: userRole,
        createdAt: new Date().toISOString()
      });
    } else {
      const data = readLocalDb();
      if (!data.users) data.users = [];
      
      const dup = data.users.find((u: any) => u.username.toLowerCase() === username.trim().toLowerCase());
      if (dup) {
        return res.status(400).json({ error: "الاسم مسجل مسبقاً لمستخدم آخر" });
      }

      const newId = data.users.length > 0 ? Math.max(...data.users.map((u: any) => u.id)) + 1 : 1;
      const newUser = {
        id: newId,
        username: username.trim(),
        pin: pin.trim(),
        role: userRole,
        createdAt: new Date().toISOString()
      };

      data.users.push(newUser);
      writeLocalDb(data);
      res.status(201).json(newUser);
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل حفظ المستخدم الجديد", details: err.message });
  }
});

// Delete user
app.delete("/api/users/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      const [countResult]: any = await mysqlPool.query("SELECT COUNT(*) as count FROM users");
      if (countResult[0].count <= 1) {
        return res.status(400).json({ error: "لا يمكن إفراغ النظام من المستخدمين بشكل كامل" });
      }

      await mysqlPool.query("DELETE FROM users WHERE id = ?", [id]);
      res.json({ success: true, message: "تم إقصاء المستخدم بنجاح" });
    } else {
      const data = readLocalDb();
      if (data.users.length <= 1) {
        return res.status(400).json({ error: "لا يمكن إفراغ النظام من المستخدمين بشكل كامل" });
      }
      
      data.users = data.users.filter((u: any) => u.id !== id);
      writeLocalDb(data);
      res.json({ success: true, message: "تم إلغاء حساب المستخدم محلياً" });
    }
  } catch (err: any) {
    res.status(500).json({ error: "تعذر التخلص من سجل العضو", details: err.message });
  }
});

// Get Audit Logs (السجل)
app.get("/api/logs", async (req, res) => {
  try {
    if (dbStatus.connected && dbStatus.type === "mysql" && mysqlPool) {
      const [rows]: any = await mysqlPool.query("SELECT id, user_id as userId, username, action, details, timestamp FROM audit_logs ORDER BY id DESC LIMIT 200");
      res.json(rows);
    } else {
      const data = readLocalDb();
      const logs = [...(data.auditLogs || [])];
      logs.sort((a: any, b: any) => b.id - a.id);
      res.json(logs.slice(0, 200));
    }
  } catch (err: any) {
    res.status(500).json({ error: "فشل استيراد سجل النظام", details: err.message });
  }
});

// Get customizable staff role permissions
app.get("/api/roles/permissions", async (req, res) => {
  try {
    const data = readLocalDb();
    if (!data.staff_permissions) {
      data.staff_permissions = {
        add_payment: true,
        add_debt: true,
        add_client: true,
        edit_client: false,
        delete_client: false,
        delete_transaction: false,
        view_stats: true,
        view_server_settings: false
      };
      writeLocalDb(data);
    } else if (data.staff_permissions.view_server_settings === undefined) {
      data.staff_permissions.view_server_settings = false;
      writeLocalDb(data);
    }
    res.json(data.staff_permissions);
  } catch (err: any) {
    res.status(500).json({ error: "فشل استيراد جدول الصلاحيات", details: err.message });
  }
});

// Update staff role permissions
app.post("/api/roles/permissions", async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions) {
      return res.status(400).json({ error: "البيانات المطلوبة لتحديث الصلاحيات غير مكتملة" });
    }
    const data = readLocalDb();
    data.staff_permissions = {
      add_payment: permissions.add_payment !== false,
      add_debt: permissions.add_debt !== false,
      add_client: permissions.add_client !== false,
      edit_client: permissions.edit_client === true,
      delete_client: permissions.delete_client === true,
      delete_transaction: permissions.delete_transaction === true,
      view_stats: permissions.view_stats !== false,
      view_server_settings: permissions.view_server_settings === true
    };
    writeLocalDb(data);
    
    // Log the event under audit logs
    const { userId, username } = getRequestUser(req);
    await addAuditLog(
      userId,
      username,
      "تعديل الصلاحيات",
      "تم تحديث مصفوفة صلاحيات ومسؤوليات أمناء الصناديق والموظفين."
    );

    res.json({ success: true, permissions: data.staff_permissions });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تعديل وحفظ مصفوفة الصلاحيات", details: err.message });
  }
});

// Full database backup download endpoint
app.get("/api/db/backup", async (req, res) => {
  try {
    const isMysql = dbStatus.connected && dbStatus.type === "mysql" && mysqlPool;
    let backupContent: any = {
      backup_date: new Date().toISOString(),
      source_database_type: dbStatus.type
    };

    const localData = readLocalDb();
    backupContent.staff_permissions = localData.staff_permissions || {
      add_payment: true,
      add_debt: true,
      add_client: true,
      edit_client: false,
      delete_client: false,
      delete_transaction: false,
      view_stats: true,
      view_server_settings: false
    };

    if (isMysql) {
      const [clients]: any = await mysqlPool.query("SELECT * FROM clients");
      const [transactions]: any = await mysqlPool.query("SELECT * FROM transactions");
      const [users]: any = await mysqlPool.query("SELECT * FROM users");
      const [logs]: any = await mysqlPool.query("SELECT * FROM audit_logs ORDER BY id DESC");
      
      backupContent.clients = clients.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        notes: c.notes || "",
        createdAt: c.created_at
      }));
      backupContent.transactions = transactions.map((t: any) => ({
        id: t.id,
        clientId: t.client_id,
        type: t.type,
        amount: parseFloat(t.amount),
        date: t.date,
        description: t.description || "",
        createdAt: t.created_at
      }));
      backupContent.users = users.map((u: any) => ({
        id: u.id,
        username: u.username,
        pin: u.pin,
        role: u.role,
        createdAt: u.created_at
      }));
      backupContent.auditLogs = logs.map((l: any) => ({
        id: l.id,
        userId: l.user_id,
        username: l.username,
        action: l.action,
        details: l.details,
        timestamp: l.timestamp
      }));
    } else {
      backupContent.clients = localData.clients || [];
      backupContent.transactions = localData.transactions || [];
      backupContent.users = localData.users || [];
      backupContent.auditLogs = localData.auditLogs || [];
    }

    // Add audit log for downloading secure backup
    const { userId, username } = getRequestUser(req);
    await addAuditLog(
      userId,
      username,
      "تنزيل نسخة احتياطية",
      `تم إصدار وتصدير نسخة احتياطية كاملة لقاعدة البيانات بصيغة JSON لغرض التخزين الآمن والمحلي.`
    );

    // Set headers to trigger file download in browser
    const safeDate = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=mosir_backup_${safeDate}.json`);
    res.send(JSON.stringify(backupContent, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: "فشل إنشاء وتوليد النسخة الاحتياطية", details: err.message });
  }
});

// -------------------------------------------------------------
// Vite Middleware Configuration & Listening
// -------------------------------------------------------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use("/YY", express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULL-STACK] Server successfully running at http://0.0.0.0:${PORT}`);
  });
}

start();
