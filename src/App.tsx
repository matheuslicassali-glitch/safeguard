import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Settings, 
  Database, 
  Clock, 
  Mail, 
  Play, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  HardDrive,
  Network,
  Usb,
  Server,
  History,
  ChevronRight,
  Download,
  Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type BackupType = 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
type DestType = 'NAS' | 'RDX' | 'USB' | 'NETWORK';

interface BackupTask {
  id: number;
  name: string;
  source_path: string;
  destination_path: string;
  destination_type: DestType;
  backup_type: BackupType;
  schedule_days: string; // JSON string
  schedule_time: string;
  last_run: string | null;
  status: 'IDLE' | 'RUNNING';
  email_notifications: number;
}

interface BackupLog {
  id: number;
  task_id: number;
  task_name: string;
  timestamp: string;
  status: 'SUCESSO' | 'FALHA' | 'INICIADO';
  message: string;
  report?: string; // JSON string of files
}

const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

export default function App() {
  const [tasks, setTasks] = useState<BackupTask[]>([]);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<BackupLog | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    source_path: '',
    destination_path: '',
    destination_type: 'NAS' as DestType,
    backup_type: 'FULL' as BackupType,
    schedule_days: [] as string[],
    schedule_time: '00:00',
    email_notifications: true
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, logsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/logs')
      ]);
      const tasksData = await tasksRes.json();
      const logsData = await logsRes.json();
      setTasks(tasksData);
      setLogs(logsData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          source_path: '',
          destination_path: '',
          destination_type: 'NAS',
          backup_type: 'FULL',
          schedule_days: [],
          schedule_time: '00:00',
          email_notifications: true
        });
        fetchData();
      }
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  const deleteTask = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
    }
  };

  const runTask = async (id: number) => {
    try {
      await fetch(`/api/tasks/${id}/run`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error('Erro ao executar tarefa:', error);
    }
  };

  const exportData = () => {
    const data = {
      tasks,
      logs,
      exportDate: new Date().toISOString(),
      system: 'SafeGuard Pro'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safeguard-backup-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportProject = async () => {
    try {
      const res = await fetch('/api/export-project');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `safeguard-project-bundle.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar projeto:', error);
      alert('Falha ao exportar o código do projeto.');
    }
  };

  const getDestIcon = (type: DestType) => {
    switch (type) {
      case 'NAS': return <Server className="w-4 h-4" />;
      case 'RDX': return <HardDrive className="w-4 h-4" />;
      case 'USB': return <Usb className="w-4 h-4" />;
      case 'NETWORK': return <Network className="w-4 h-4" />;
    }
  };

  const translateBackupType = (type: BackupType) => {
    switch (type) {
      case 'FULL': return 'Completo';
      case 'INCREMENTAL': return 'Incremental';
      case 'DIFFERENTIAL': return 'Diferencial';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">SafeGuard Pro</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sistema de Backup Empresarial</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportData}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
              title="Exportar Dados (JSON)"
            >
              <Download className="w-5 h-5" />
            </button>
            <button 
              onClick={exportProject}
              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-all"
              title="Exportar Projeto para Antigravity (Código)"
            >
              <Code2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-md shadow-indigo-100 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Tasks List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Tarefas de Backup
                <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full ml-2">
                  {tasks.length} Total
                </span>
              </h2>
            </div>

            <div className="grid gap-4">
              {tasks.length === 0 && !loading && (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Database className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Nenhuma tarefa ainda</h3>
                  <p className="text-slate-500 mt-1 mb-6">Crie sua primeira tarefa para começar a proteger seus dados.</p>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Adicionar tarefa agora →
                  </button>
                </div>
              )}

              {tasks.map((task) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={task.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        task.status === 'RUNNING' ? "bg-indigo-100 text-indigo-600 animate-pulse" : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                      )}>
                        {getDestIcon(task.destination_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          {task.name}
                          {task.status === 'RUNNING' && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">Executando</span>
                          )}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <ChevronRight className="w-3 h-3" />
                            {translateBackupType(task.backup_type)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {task.schedule_time}
                          </span>
                          {task.email_notifications === 1 && (
                            <Mail className="w-3 h-3 text-indigo-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => runTask(task.id)}
                        disabled={task.status === 'RUNNING'}
                        className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors disabled:opacity-50"
                        title="Executar Agora"
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                        title="Excluir Tarefa"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-medium">
                    <div className="flex gap-4">
                      <div className="text-slate-400">
                        Origem: <span className="text-slate-600 font-mono">{task.source_path}</span>
                      </div>
                      <div className="text-slate-400">
                        Destino: <span className="text-slate-600 font-mono">{task.destination_path}</span>
                      </div>
                    </div>
                    <div className="text-slate-400">
                      Última execução: <span className="text-slate-600">{task.last_run ? new Date(task.last_run).toLocaleString('pt-BR') : 'Nunca'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar - Activity Logs */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Logs de Atividade
            </h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
                {logs.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Nenhuma atividade registrada ainda.
                  </div>
                )}
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    onClick={() => log.report && setSelectedLog(log)}
                    className={cn(
                      "p-4 transition-colors",
                      log.report ? "cursor-pointer hover:bg-indigo-50/50" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {log.status === 'SUCESSO' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                      ) : log.status === 'INICIADO' ? (
                        <Play className="w-4 h-4 text-indigo-500 mt-0.5 animate-pulse" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold truncate">{log.task_name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{log.message}</p>
                        {log.report && (
                          <span className="text-[10px] text-indigo-600 font-bold mt-2 inline-block">Ver Relatório de Arquivos →</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Info */}
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Status do Sistema
              </h3>
              <div className="space-y-3 text-sm opacity-90">
                <div className="flex justify-between">
                  <span>Motor de Dados</span>
                  <span className="font-mono">SQLite 3</span>
                </div>
                <div className="flex justify-between">
                  <span>Agendador</span>
                  <span className="font-mono">Ativo</span>
                </div>
                <div className="flex justify-between">
                  <span>Desempenho</span>
                  <span className="font-mono">Ilimitado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Nova Tarefa de Backup</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={createTask} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Tarefa</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="ex: Financeiro Diário"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Caminho de Origem</label>
                      <input 
                        required
                        type="text" 
                        value={formData.source_path}
                        onChange={e => setFormData({...formData, source_path: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                        placeholder="/home/usuario/dados"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Caminho de Destino</label>
                      <input 
                        required
                        type="text" 
                        value={formData.destination_path}
                        onChange={e => setFormData({...formData, destination_path: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                        placeholder="192.168.1.50/backups"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Unidade de Armazenamento</label>
                      <select 
                        value={formData.destination_type}
                        onChange={e => setFormData({...formData, destination_type: e.target.value as DestType})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value="NAS">Armazenamento NAS</option>
                        <option value="RDX">Unidade RDX</option>
                        <option value="USB">USB Externo</option>
                        <option value="NETWORK">Computador na Rede</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Backup</label>
                      <select 
                        value={formData.backup_type}
                        onChange={e => setFormData({...formData, backup_type: e.target.value as BackupType})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value="FULL">Backup Completo</option>
                        <option value="INCREMENTAL">Incremental</option>
                        <option value="DIFFERENTIAL">Diferencial</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Dias de Agendamento</label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const newDays = formData.schedule_days.includes(day)
                                ? formData.schedule_days.filter(d => d !== day)
                                : [...formData.schedule_days, day];
                              setFormData({...formData, schedule_days: newDays});
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                              formData.schedule_days.includes(day)
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300"
                            )}
                          >
                            {day.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Horário de Execução</label>
                      <input 
                        type="time" 
                        value={formData.schedule_time}
                        onChange={e => setFormData({...formData, schedule_time: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-8">
                      <input 
                        type="checkbox" 
                        id="email_notif"
                        checked={formData.email_notifications}
                        onChange={e => setFormData({...formData, email_notifications: e.target.checked})}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="email_notif" className="text-sm font-bold text-slate-700">Notificações por E-mail</label>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all"
                    >
                      Criar Tarefa
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Relatório de Backup</h2>
                    <p className="text-sm text-slate-500">{selectedLog.task_name} • {new Date(selectedLog.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                  <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-bold text-slate-700">Arquivo</th>
                        <th className="px-4 py-3 font-bold text-slate-700">Tamanho</th>
                        <th className="px-4 py-3 font-bold text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {JSON.parse(selectedLog.report || '[]').map((file: any, i: number) => (
                        <tr key={i} className="hover:bg-white transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{file.name}</td>
                          <td className="px-4 py-3 text-slate-500">{file.size}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              file.status === 'OK' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {file.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl transition-all"
                  >
                    Fechar Relatório
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
