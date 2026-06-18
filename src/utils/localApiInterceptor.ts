import { Client, Transaction, DbConfig } from "../types";

const DB_KEY = "mosir_local_db";

interface LocalDb {
  clients: any[];
  transactions: any[];
  users: any[];
  auditLogs: any[];
  staff_permissions: any;
}

const DEFAULT_DB: LocalDb = {
  clients: [
    {
      id: 1,
      name: "أحمد بن علي",
      phone: "0551234567",
      email: "ahmed@example.com",
      notes: "عميل منتظم ملتزم بالسداد",
      createdAt: "2026-06-18T09:59:43.147Z"
    },
    {
      id: 2,
      name: "مؤسسة الوفاء للتجارة",
      phone: "0509876543",
      email: "wafaa@example.com",
      notes: "سقف ائتماني 50,000 ريال",
      createdAt: "2026-06-18T09:59:43.148Z"
    }
  ],
  transactions: [
    {
      id: 1,
      clientId: 1,
      type: "debt",
      amount: 4500,
      date: "2026-06-18",
      description: "صنف بضائع أجهزة كهربائية",
      createdAt: "2026-06-18T09:59:43.148Z"
    },
    {
      id: 2,
      clientId: 1,
      type: "payment",
      amount: 1500,
      date: "2026-06-18",
      description: "دفعة نقدية أولى",
      createdAt: "2026-06-18T09:59:43.148Z"
    },
    {
      id: 3,
      clientId: 2,
      type: "debt",
      amount: 12800,
      date: "2026-06-18",
      description: "فاتورة رقم 1024 - مواد بناء",
      createdAt: "2026-06-18T09:59:43.148Z"
    }
  ],
  users: [
    {
      id: 1,
      username: "مدير النظام",
      pin: "1234",
      role: "admin",
      createdAt: "2026-06-18T09:59:50.767Z"
    },
    {
      id: 2,
      username: "أمين الصندوق",
      pin: "5678",
      role: "staff",
      createdAt: "2026-06-18T09:59:50.767Z"
    }
  ],
  auditLogs: [
    {
      id: 1,
      userId: 1,
      username: "مدير النظام",
      action: "تهيئة النظام",
      details: "تم تشغيل تطبيق المسيرّ وتسجيل دخول تلقائي لتهيئة قاعدة البيانات (مخزن محلياً).",
      timestamp: "2026-06-18T10:08:46.508Z"
    }
  ],
  staff_permissions: {
    add_payment: true,
    add_debt: true,
    add_client: true,
    edit_client: false,
    delete_client: false,
    delete_transaction: false,
    view_stats: true,
    view_server_settings: false
  }
};

function getLocalData(): LocalDb {
  const saved = localStorage.getItem(DB_KEY);
  if (!saved) {
    localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB));
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
  try {
    const parsed = JSON.parse(saved);
    // Backward compatibility checks
    if (!parsed.clients) parsed.clients = [];
    if (!parsed.transactions) parsed.transactions = [];
    if (!parsed.users) parsed.users = DEFAULT_DB.users;
    if (!parsed.auditLogs) parsed.auditLogs = DEFAULT_DB.auditLogs;
    if (!parsed.staff_permissions) parsed.staff_permissions = DEFAULT_DB.staff_permissions;
    return parsed;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveLocalData(data: LocalDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function addLog(userId: number, username: string, action: string, details: string) {
  const data = getLocalData();
  const nextId = data.auditLogs.length > 0 ? Math.max(...data.auditLogs.map(l => l.id)) + 1 : 1;
  const newLog = {
    id: nextId,
    userId,
    username,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  data.auditLogs.push(newLog);
  saveLocalData(data);
}

// Preserve original fetch
const originalFetch = window.fetch;

export function initializeLocalApiInterceptor() {
  // Let the user know the interceptor exists
  console.log("🎯 Applet static-ready helper initialized. Scanning network latency...");

  const isGithubPages = window.location.hostname.endsWith(".github.io") || 
                        window.location.hostname.includes("github.io") ||
                        window.location.pathname.startsWith("/YY");

  if (isGithubPages) {
    console.log("📌 Host is static (GitHub Pages). Force-activating localStorage database engine.");
    setupLocalStorageFetchOverride();
    return;
  }

  // Ping database status with a timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  originalFetch("/api/db/status", { signal: controller.signal })
    .then(async (response) => {
      clearTimeout(timeoutId);
      if (response.ok) {
        try {
          const json = await response.json();
          if (json && typeof json.connected === "boolean") {
            console.log("⚡ Backend API is live & connected. Using cloud database mode.");
            return;
          }
        } catch (e) {}
      }
      throw new Error("API unhealthy or misconfigured");
    })
    .catch((err) => {
      console.warn("⚠️ Backend API unavailable or slow. Switching to robust localStorage fallback.", err);
      setupLocalStorageFetchOverride();
    });
}

function setupLocalStorageFetchOverride() {
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const method = (init?.method || "GET").toUpperCase();
    
    // Parse URL string
    let urlStr = "";
    if (typeof input === "string") {
      urlStr = input;
    } else if (input instanceof URL) {
      urlStr = input.href;
    } else {
      urlStr = (input as Request).url || "";
    }

    // Normalizing URL paths
    let path = urlStr;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      try {
        const parsedUrl = new URL(path);
        path = parsedUrl.pathname + parsedUrl.search;
      } catch (e) {}
    }

    // Remove site prefix like /YY if present
    if (path.startsWith("/YY")) {
      path = path.slice(3);
    }
    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    // If request is not targeting API routes, route to original global fetch (e.g. index.css, assets, etc.)
    if (!path.startsWith("/api/")) {
      return originalFetch(input, init);
    }

    const [pathname, search] = path.split("?");
    const queryParams = new URLSearchParams(search || "");
    
    // Extract headers for audits
    const headers = new Headers(init?.headers);
    const userId = parseInt(headers.get("x-user-id") || "0", 10);
    const username = decodeURIComponent(headers.get("x-username") || "مستخدم مجهول");

    // Parse body parameters
    let body: any = {};
    if (init?.body) {
      try {
        body = JSON.parse(init.body as string);
      } catch (e) {}
    }

    // Helper to log audit in simulation
    const trackAudit = (action: string, details: string) => {
      addLog(userId, username, action, details);
    };

    try {
      // 1. GET /api/db/status
      if (pathname === "/api/db/status" && method === "GET") {
        return new Response(JSON.stringify({
          connected: true,
          type: "local",
          host: "مخزن المتصفح الشخصي (localStorage)",
          port: 80,
          user: "محلي",
          name: "قاعدة المتصفح",
          isStaticClient: true
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // 2. GET /api/db/config
      if (pathname === "/api/db/config" && method === "GET") {
        return new Response(JSON.stringify({
          type: "local",
          host: "مخزن المتصفح الشخصي (localStorage)",
          port: 80,
          user: "محلي",
          pass: "******",
          name: "قاعدة المتصفح"
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // 3. POST /api/db/config
      if (pathname === "/api/db/config" && method === "POST") {
        trackAudit("تعديل إعدادات الداتا", "تم حفظ وتحديث مواءمة النظام للعمل الكلي في المتصفح بنجاح.");
        return new Response(JSON.stringify({
          success: true,
          status: {
            connected: true,
            type: "local",
            isStaticClient: true
          },
          config: {
            type: "local"
          }
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // 4. GET /api/clients
      if (pathname === "/api/clients" && method === "GET") {
        const db = getLocalData();
        const mapped = db.clients.map((c: any) => {
          const clientTrans = db.transactions.filter((t: any) => t.clientId === c.id);
          const totalDebts = clientTrans
            .filter((t: any) => t.type === "debt")
            .reduce((sum, t) => sum + t.amount, 0);
          const totalPayments = clientTrans
            .filter((t: any) => t.type === "payment")
            .reduce((sum, t) => sum + t.amount, 0);

          return {
            ...c,
            totalDebts,
            totalPayments,
            balance: totalDebts - totalPayments
          };
        });

        mapped.sort((a, b) => a.name.localeCompare(b.name, "ar"));
        return new Response(JSON.stringify(mapped), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 5. POST /api/clients
      if (pathname === "/api/clients" && method === "POST") {
        const { name, phone, email, notes } = body;
        if (!name || !name.trim()) {
          return new Response(JSON.stringify({ error: "اسم العميل حقل إجباري" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const db = getLocalData();
        const newId = db.clients.length > 0 ? Math.max(...db.clients.map(c => c.id)) + 1 : 1;
        const newClient = {
          id: newId,
          name: name.trim(),
          phone: phone || "",
          email: email || "",
          notes: notes || "",
          createdAt: new Date().toISOString()
        };

        db.clients.push(newClient);
        saveLocalData(db);

        trackAudit("إضافة عميل", `تم تسجيل عميل جديد بالمتصفح: ${name.trim()}`);

        return new Response(JSON.stringify(newClient), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 6. PUT /api/clients/:id
      if (pathname.startsWith("/api/clients/") && method === "PUT") {
        const id = parseInt(pathname.split("/").pop() || "0", 10);
        const { name, phone, email, notes } = body;
        if (!name || !name.trim()) {
          return new Response(JSON.stringify({ error: "اسم العميل حقل إجباري" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const db = getLocalData();
        const idx = db.clients.findIndex(c => c.id === id);
        if (idx === -1) {
          return new Response(JSON.stringify({ error: "العميل المطلوب غير مسجل" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        const oldName = db.clients[idx].name;
        db.clients[idx] = {
          ...db.clients[idx],
          name: name.trim(),
          phone: phone || "",
          email: email || "",
          notes: notes || ""
        };
        saveLocalData(db);

        trackAudit("تعديل بيانات عميل", `تعديل بيانات العميل (${oldName}) إلى الاسم (${name.trim()})`);

        return new Response(JSON.stringify(db.clients[idx]), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 7. DELETE /api/clients/:id
      if (pathname.startsWith("/api/clients/") && method === "DELETE") {
        const id = parseInt(pathname.split("/").pop() || "0", 10);
        const db = getLocalData();

        const targetClient = db.clients.find(c => c.id === id);
        const clientName = targetClient ? targetClient.name : `رمز #${id}`;

        db.clients = db.clients.filter(c => c.id !== id);
        db.transactions = db.transactions.filter(t => t.clientId !== id);
        saveLocalData(db);

        trackAudit("حذف عميل", `تم حذف العميل الأرشيفي (${clientName}) وإلغاء فواتيره بالكامل.`);

        return new Response(JSON.stringify({ success: true, message: "تم الحذف بنجاح" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 8. GET /api/transactions
      if (pathname === "/api/transactions" && method === "GET") {
        const clientIdQuery = queryParams.get("clientId") ? parseInt(queryParams.get("clientId") || "0", 10) : null;
        const db = getLocalData();

        let list = db.transactions.map((t: any) => {
          const client = db.clients.find(c => c.id === t.clientId);
          return {
            ...t,
            clientName: client ? client.name : "عميل مجهول"
          };
        });

        if (clientIdQuery) {
          list = list.filter(t => t.clientId === clientIdQuery);
        }

        list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

        return new Response(JSON.stringify(list), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 9. POST /api/transactions
      if (pathname === "/api/transactions" && method === "POST") {
        const { clientId, type, amount, date, description } = body;
        if (!clientId) {
          return new Response(JSON.stringify({ error: "الرجاء تحديد العميل" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (!type || (type !== "debt" && type !== "payment")) {
          return new Response(JSON.stringify({ error: "نوع العملية غير معرّف" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        if (amount === undefined || amount <= 0) {
          return new Response(JSON.stringify({ error: "المبلغ يجب أن يكون أكبر من الصفر" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const db = getLocalData();
        const client = db.clients.find(c => c.id === clientId);
        if (!client) {
          return new Response(JSON.stringify({ error: "العميل المحدد غير موجود" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        const newId = db.transactions.length > 0 ? Math.max(...db.transactions.map(t => t.id)) + 1 : 1;
        const newTrans = {
          id: newId,
          clientId,
          type,
          amount: parseFloat(amount),
          date: date || new Date().toISOString().split('T')[0],
          description: description || "",
          createdAt: new Date().toISOString()
        };

        db.transactions.push(newTrans);
        saveLocalData(db);

        const formattedAmt = `${parseFloat(amount).toLocaleString()} ريال`;
        const typeStr = type === "debt" ? "أجل / ذمة جديدة" : "دفعة مستلمة";
        trackAudit("قيد قسيمة", `تسجيل لـ (${client.name}): قيد ${typeStr} بقيمة ${formattedAmt}. الوصف: ${description || ""}`);

        return new Response(JSON.stringify({
          ...newTrans,
          clientName: client.name
        }), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 10. DELETE /api/transactions/:id
      if (pathname.startsWith("/api/transactions/") && method === "DELETE") {
        const id = parseInt(pathname.split("/").pop() || "0", 10);
        const db = getLocalData();

        const trans = db.transactions.find(t => t.id === id);
        if (trans) {
          const client = db.clients.find(c => c.id === trans.clientId);
          const clientName = client ? client.name : "عميل مجهول";
          const desc = trans.description || "دون بيان";
          trackAudit("إلغاء قسيمة", `تم إلغاء عملية للعميل (${clientName}) بقيمة ${trans.amount.toLocaleString()} ريال (${desc})`);
        }

        db.transactions = db.transactions.filter(t => t.id !== id);
        saveLocalData(db);

        return new Response(JSON.stringify({ success: true, message: "تم إلغاء العملية وحفظ البيانات محلياً." }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 11. GET /api/stats
      if (pathname === "/api/stats" && method === "GET") {
        const db = getLocalData();
        let totalDebts = 0;
        let totalPayments = 0;

        db.transactions.forEach((t: any) => {
          if (t.type === "debt") {
            totalDebts += t.amount;
          } else if (t.type === "payment") {
            totalPayments += t.amount;
          }
        });

        return new Response(JSON.stringify({
          totalClients: db.clients.length,
          totalDebts,
          totalPayments,
          remainingBalance: totalDebts - totalPayments
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 12. GET /api/auth/users
      if (pathname === "/api/auth/users" && method === "GET") {
        const db = getLocalData();
        const list = db.users.map(u => ({
          id: u.id,
          username: u.username,
          role: u.role,
          createdAt: u.createdAt
        }));
        list.sort((a, b) => a.username.localeCompare(b.username, "ar"));
        return new Response(JSON.stringify(list), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // 13. POST /api/auth/login
      if (pathname === "/api/auth/login" && method === "POST") {
        const { userId, pin } = body;
        if (!userId || !pin) {
          return new Response(JSON.stringify({ error: "معرف المستخدم والرمز السري PIN مطلوبين" }), { status: 400 });
        }

        const db = getLocalData();
        const user = db.users.find(u => u.id === userId);
        if (!user) {
          return new Response(JSON.stringify({ error: "المستخدم غير مسجل" }), { status: 444 });
        }

        if (user.pin !== pin.trim()) {
          return new Response(JSON.stringify({ error: "رمز الدخول PIN المدخل غير صحيح" }), { status: 401 });
        }

        trackAudit("تسجيل دخول", `تم دخول مستخدم: ${user.username}`);

        return new Response(JSON.stringify({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt
          }
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // 14. GET /api/users
      if (pathname === "/api/users" && method === "GET") {
        const db = getLocalData();
        const list = [...db.users];
        list.sort((a, b) => a.username.localeCompare(b.username, "ar"));
        return new Response(JSON.stringify(list), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // 15. POST /api/users
      if (pathname === "/api/users" && method === "POST") {
        const { username: regUser, pin, role } = body;
        if (!regUser || !regUser.trim()) {
          return new Response(JSON.stringify({ error: "اسم المستخدم حقل مطلوب" }), { status: 400 });
        }
        if (!pin || pin.trim().length !== 4) {
          return new Response(JSON.stringify({ error: "يجب أن يتكون رمز الـ PIN من 4 أرقام دقيقة" }), { status: 400 });
        }

        const db = getLocalData();
        const dup = db.users.find(u => u.username.toLowerCase() === regUser.trim().toLowerCase());
        if (dup) {
          return new Response(JSON.stringify({ error: "الاسم مسجل مسبقاً لمستخدم آخر" }), { status: 400 });
        }

        const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
        const newUser = {
          id: newId,
          username: regUser.trim(),
          pin: pin.trim(),
          role: role === "admin" ? "admin" : "staff",
          createdAt: new Date().toISOString()
        };

        db.users.push(newUser);
        saveLocalData(db);

        trackAudit("إضافة مستخدم", `تم تعيين صلاحيات وحساب لمستخدم جديد: ${regUser.trim()}`);

        return new Response(JSON.stringify(newUser), { status: 201, headers: { "Content-Type": "application/json" } });
      }

      // 16. DELETE /api/users/:id
      if (pathname.startsWith("/api/users/") && method === "DELETE") {
        const id = parseInt(pathname.split("/").pop() || "0", 10);
        const db = getLocalData();

        if (db.users.length <= 1) {
          return new Response(JSON.stringify({ error: "لا يمكن إفراغ النظام من المستخدمين بشكل كامل" }), { status: 400 });
        }

        const targetUser = db.users.find(u => u.id === id);
        const targetUsername = targetUser ? targetUser.username : `رقم #${id}`;

        db.users = db.users.filter(u => u.id !== id);
        saveLocalData(db);

        trackAudit("إقصاء مستخدم", `تم إلغاء حساب وصلاحية الدخول للموظف: ${targetUsername}`);

        return new Response(JSON.stringify({ success: true, message: "تم إلغاء الحساب بنجاح." }), { status: 200 });
      }

      // 17. GET /api/logs
      if (pathname === "/api/logs" && method === "GET") {
        const db = getLocalData();
        const logs = [...db.auditLogs];
        logs.sort((a, b) => b.id - a.id);
        return new Response(JSON.stringify(logs.slice(0, 200)), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // 18. GET /api/roles/permissions
      if (pathname === "/api/roles/permissions" && method === "GET") {
        const db = getLocalData();
        return new Response(JSON.stringify(db.staff_permissions), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // 19. POST /api/roles/permissions
      if (pathname === "/api/roles/permissions" && method === "POST") {
        const { permissions } = body;
        if (!permissions) {
          return new Response(JSON.stringify({ error: "البيانات المطلوبة لتحديث الصلاحيات غير مكتملة" }), { status: 400 });
        }

        const db = getLocalData();
        db.staff_permissions = {
          add_payment: permissions.add_payment !== false,
          add_debt: permissions.add_debt !== false,
          add_client: permissions.add_client !== false,
          edit_client: permissions.edit_client === true,
          delete_client: permissions.delete_client === true,
          delete_transaction: permissions.delete_transaction === true,
          view_stats: permissions.view_stats !== false,
          view_server_settings: permissions.view_server_settings === true
        };
        saveLocalData(db);

        trackAudit("تعديل الصلاحيات", "تم تحديث مصفوفة صلاحيات ومسؤوليات أمناء الصناديق والموظفين محلياً.");

        return new Response(JSON.stringify({ success: true, permissions: db.staff_permissions }), { status: 200 });
      }

      // 20. GET /api/db/backup
      if (pathname === "/api/db/backup" && method === "GET") {
        const db = getLocalData();
        const backupContent = {
          backup_date: new Date().toISOString(),
          source_database_type: "local",
          clients: db.clients,
          transactions: db.transactions,
          users: db.users,
          auditLogs: db.auditLogs,
          staff_permissions: db.staff_permissions
        };
        return new Response(JSON.stringify(backupContent), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // Fallback for unmatched API routes
      return new Response(JSON.stringify({ error: `Not Found: ${pathname}` }), { status: 404 });
    } catch (e: any) {
      console.error("Local mock API error", e);
      return new Response(JSON.stringify({ error: "Internal Server Error", details: e.message }), { status: 500 });
    }
  };
}
