import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import cron from "node-cron";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("backup.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS backup_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_path TEXT NOT NULL,
    destination_path TEXT NOT NULL,
    destination_type TEXT NOT NULL,
    backup_type TEXT NOT NULL,
    schedule_days TEXT,
    schedule_time TEXT,
    last_run TEXT,
    status TEXT DEFAULT 'IDLE',
    email_notifications INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS backup_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT,
    message TEXT,
    report TEXT,
    FOREIGN KEY(task_id) REFERENCES backup_tasks(id)
  );
`);

// Migration: Garantir que a coluna 'report' exista
try {
  db.prepare("SELECT report FROM backup_logs LIMIT 1").get();
} catch (e) {
  try {
    db.exec("ALTER TABLE backup_logs ADD COLUMN report TEXT");
    console.log("Coluna 'report' adicionada com sucesso.");
  } catch (err) {
    console.error("Erro ao migrar banco de dados:", err);
  }
}

import fs from "fs";

const app = express();
app.use(express.json());

// Rota para exportar o código-fonte completo do projeto
app.get("/api/export-project", async (req, res) => {
  try {
    const filesToExport = [
      "package.json",
      "server.ts",
      "src/App.tsx",
      "src/main.tsx",
      "src/index.css",
      "index.html",
      "vite.config.ts",
      "tsconfig.json",
      "metadata.json"
    ];

    const projectBundle: Record<string, string> = {};

    for (const file of filesToExport) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        projectBundle[file] = fs.readFileSync(filePath, "utf-8");
      }
    }

    res.json({
      projectName: "SafeGuard Backup Pro",
      version: "1.0.0",
      files: projectBundle,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao exportar projeto:", error);
    res.status(500).json({ error: "Falha ao gerar pacote do projeto" });
  }
});

// Mock Backup Execution
async function runBackup(task: any) {
  try {
    console.log(`Iniciando backup para a tarefa: ${task.name}`);
    db.prepare("UPDATE backup_tasks SET status = 'RUNNING' WHERE id = ?").run(task.id);
    
    // Log de Início
    db.prepare("INSERT INTO backup_logs (task_id, status, message) VALUES (?, ?, ?)").run(
      task.id, 
      'INICIADO', 
      `Processo de backup iniciado para ${task.source_path}`
    );

    if (task.email_notifications) {
      console.log(`[NOTIFICAÇÃO POR EMAIL] Tarefa ${task.name}: INICIADO - O backup começou.`);
    }

    // Simular processamento de arquivos
    await new Promise(resolve => setTimeout(resolve, 4000));

    const success = Math.random() > 0.1; 
    const status = success ? 'SUCESSO' : 'FALHA';
    const message = success 
      ? `Backup concluído com sucesso para ${task.destination_path}` 
      : `Falha ao acessar ${task.destination_type} em ${task.destination_path}`;

    // Simular relatório de arquivos
    const mockFiles = [
      { name: 'documento_v1.pdf', size: '2.4MB', status: 'OK' },
      { name: 'planilha_financeira.xlsx', size: '1.1MB', status: 'OK' },
      { name: 'foto_backup.jpg', size: '4.8MB', status: success ? 'OK' : 'ERRO' },
      { name: 'projeto_final.zip', size: '156MB', status: success ? 'OK' : 'ERRO' }
    ];
    const report = JSON.stringify(mockFiles);

    db.prepare("INSERT INTO backup_logs (task_id, status, message, report) VALUES (?, ?, ?, ?)").run(
      task.id, 
      status, 
      message,
      report
    );
    
    db.prepare("UPDATE backup_tasks SET status = 'IDLE', last_run = CURRENT_TIMESTAMP WHERE id = ?").run(task.id);

    if (task.email_notifications) {
      console.log(`[NOTIFICAÇÃO POR EMAIL] Tarefa ${task.name}: ${status} - ${message}`);
      if (success) {
        console.log(`[RELATÓRIO DE ARQUIVOS] Enviando lista de ${mockFiles.length} arquivos processados.`);
      }
    }
  } catch (error) {
    console.error("Erro durante execução do backup:", error);
    try {
      db.prepare("UPDATE backup_tasks SET status = 'IDLE' WHERE id = ?").run(task.id);
    } catch (e) {}
  }
}

// Scheduler
cron.schedule("* * * * *", () => {
  try {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5);

    const tasks = db.prepare("SELECT * FROM backup_tasks").all();
    tasks.forEach((task: any) => {
      const days = JSON.parse(task.schedule_days || "[]");
      if (days.includes(currentDay) && task.schedule_time === currentTime) {
        runBackup(task);
      }
    });
  } catch (error) {
    console.error("Erro no agendador:", error);
  }
});

async function startServer() {
  // Log de todas as requisições para depuração
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.url}`);
    }
    next();
  });

  // API Routes
  app.get("/api/tasks", (req, res) => {
    try {
      const tasks = db.prepare("SELECT * FROM backup_tasks").all();
      res.json(tasks);
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
      res.status(500).json({ error: "Erro ao buscar tarefas" });
    }
  });

  app.post("/api/tasks", (req, res) => {
    try {
      const { name, source_path, destination_path, destination_type, backup_type, schedule_days, schedule_time, email_notifications } = req.body;
      const info = db.prepare(`
        INSERT INTO backup_tasks (name, source_path, destination_path, destination_type, backup_type, schedule_days, schedule_time, email_notifications)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, source_path, destination_path, destination_type, backup_type, JSON.stringify(schedule_days), schedule_time, email_notifications ? 1 : 0);
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      res.status(500).json({ error: "Erro ao criar tarefa" });
    }
  });

  app.delete("/api/tasks/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM backup_tasks WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      res.status(500).json({ error: "Erro ao excluir tarefa" });
    }
  });

  app.get("/api/logs", (req, res) => {
    try {
      const logs = db.prepare(`
        SELECT l.*, t.name as task_name 
        FROM backup_logs l 
        JOIN backup_tasks t ON l.task_id = t.id 
        ORDER BY l.timestamp DESC LIMIT 50
      `).all();
      res.json(logs);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
      res.status(500).json({ error: "Erro ao buscar logs" });
    }
  });

  app.post("/api/tasks/:id/run", (req, res) => {
    try {
      const task = db.prepare("SELECT * FROM backup_tasks WHERE id = ?").get(req.params.id);
      if (task) {
        runBackup(task);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Tarefa não encontrada" });
      }
    } catch (error) {
      console.error("Erro ao disparar backup:", error);
      res.status(500).json({ error: "Erro ao disparar backup" });
    }
  });

  // Garantir que qualquer rota /api não encontrada retorne JSON 404, não HTML
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Rota de API não encontrada" });
  });

  // Vite ou Static Files (DEPOIS das rotas da API)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Falha ao iniciar o servidor:", err);
});
