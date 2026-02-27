import React, { useState, useRef, useEffect } from 'react';
import { Calendar, User, Building2, CheckCircle2, Circle, Clock, FileText, MessageSquarePlus, Copy, Check, Trash2, Plus, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Demand, TaskStatus } from '../types';

interface DemandCardProps {
  key?: React.Key;
  demand: Demand;
  onUpdateSubtaskStatus: (demandId: string, taskId: string, subtaskId: string, status: TaskStatus) => void;
  onUpdateSubtaskNote: (demandId: string, taskId: string, subtaskId: string, note: string) => void;
  onDelete: (demandId: string) => void;
  onUpdateField: (demandId: string, field: keyof Demand, value: string) => void;
  onUpdateTaskTitle: (demandId: string, taskId: string, title: string) => void;
  onUpdateSubtaskTitle: (demandId: string, taskId: string, subtaskId: string, title: string) => void;
  onAddSubtask: (demandId: string, taskId: string) => void;
}

export default function DemandCard({ 
  demand, 
  onUpdateSubtaskStatus, 
  onUpdateSubtaskNote,
  onDelete,
  onUpdateField,
  onUpdateTaskTitle,
  onUpdateSubtaskTitle,
  onAddSubtask
}: DemandCardProps) {
  const [copied, setCopied] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(true);
  
  const taskInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const subtaskInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const totalSubtasks = demand.tasks.reduce((acc, task) => acc + task.subtasks.length, 0);
  const completedSubtasks = demand.tasks.reduce((acc, task) => acc + task.subtasks.filter(s => s.status === 'Concluído').length, 0);
  const progress = totalSubtasks === 0 ? 0 : Math.round((completedSubtasks / totalSubtasks) * 100);
  const isCompleted = progress === 100 && totalSubtasks > 0;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isCompleted && isExpanded) {
      timeoutId = setTimeout(() => {
        setIsExpanded(false);
      }, 1500);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isCompleted, isExpanded]);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Concluído':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'Em Andamento':
        return <Clock className="w-5 h-5 text-amber-400" />;
      default:
        return <Circle className="w-5 h-5 text-zinc-600" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Concluído':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Em Andamento':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-800/50 text-zinc-400 border-zinc-800';
    }
  };

  const toggleNote = (subtaskId: string) => {
    setExpandedNotes(prev => ({ ...prev, [subtaskId]: !prev[subtaskId] }));
  };

  const generateReport = () => {
    let report = `*Relatório de Entrega: ${demand.client}*\n`;
    report += `Data: ${demand.startDate} | Responsável: ${demand.responsible}\n\n`;
    
    demand.tasks.forEach(task => {
      const completed = task.subtasks.filter(s => s.status === 'Concluído');
      if (completed.length > 0) {
        report += `*${task.title}*\n`;
        completed.forEach(sub => {
          report += `- ${sub.title}\n`;
          if (sub.note) {
            report += `  > Nota: ${sub.note}\n`;
          }
        });
        report += '\n';
      }
    });

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      layout
      className={`bg-[#111111] rounded-2xl shadow-xl border overflow-hidden mb-6 transition-all duration-500 ${isCompleted ? 'border-emerald-500/50 ring-1 ring-emerald-500/50' : 'border-zinc-800/80 hover:border-zinc-700/80'}`}
    >
      {/* Header / Macro Demand */}
      <div 
        className="p-6 border-b border-zinc-800/80 bg-[#161616] cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-3 rounded-xl border shrink-0 transition-colors duration-500 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800/50 text-zinc-300 border-zinc-700/50'}`}>
              {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
            </div>
            <div className="flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                value={demand.client}
                onChange={(e) => onUpdateField(demand.id, 'client', e.target.value)}
                className="bg-transparent border border-transparent hover:border-zinc-700 focus:border-indigo-500 focus:bg-zinc-900/50 rounded px-2 py-0.5 -ml-2 outline-none w-full text-xl font-semibold text-zinc-100 transition-all"
                placeholder="Nome do Cliente"
              />
              <div className="flex items-center gap-2 mt-1 ml-2">
                <p className="text-sm text-zinc-500 font-medium">Demanda Macro</p>
                <AnimatePresence>
                  {isCompleted && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    >
                      Concluída
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between md:justify-end gap-2 w-full">
              <button 
                onClick={generateReport}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-full text-sm font-medium transition-colors flex-1 md:flex-none"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Gerar Relatório'}
              </button>
              <button
                onClick={() => onDelete(demand.id)}
                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors border border-transparent hover:border-red-500/20 shrink-0"
                title="Excluir Demanda"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap justify-start md:justify-end gap-2 text-sm w-full">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                <Calendar className="w-4 h-4 shrink-0" />
                <input
                  value={demand.startDate}
                  onChange={(e) => onUpdateField(demand.id, 'startDate', e.target.value)}
                  className="bg-transparent border-none p-0 focus:ring-0 outline-none w-24 text-zinc-400 font-medium"
                  placeholder="Data"
                />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                <User className="w-4 h-4 shrink-0" />
                <input
                  value={demand.responsible}
                  onChange={(e) => onUpdateField(demand.id, 'responsible', e.target.value)}
                  className="bg-transparent border-none p-0 focus:ring-0 outline-none w-24 text-zinc-400 font-medium"
                  placeholder="Responsável"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between text-xs font-medium text-zinc-400 mb-2">
            <span>Progresso das Tarefas</span>
            <span>{progress}% ({completedSubtasks}/{totalSubtasks})</span>
          </div>
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {demand.notes && (
          <div className="flex gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm mb-4" onClick={(e) => e.stopPropagation()}>
            <FileText className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500" />
            <p className="leading-relaxed">{demand.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors mt-2 pt-4 border-t border-zinc-800/50">
           <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1">
             {isExpanded ? (
               <><ChevronUp className="w-4 h-4" /> Recolher Tarefas</>
             ) : (
               <><ChevronDown className="w-4 h-4" /> Mostrar Tarefas</>
             )}
           </span>
        </div>
      </div>

      {/* Tasks and Subtasks */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-6">
              <div className="space-y-8">
          {demand.tasks.map((task, index) => (
            <div key={task.id} className="relative">
              <div className="flex items-center gap-3 mb-4 group/task">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-zinc-800 text-zinc-400 text-xs font-bold border border-zinc-700 shrink-0">
                  {index + 1}
                </div>
                <input
                  ref={el => taskInputRefs.current[task.id] = el}
                  value={task.title}
                  onChange={(e) => onUpdateTaskTitle(demand.id, task.id, e.target.value)}
                  className="bg-transparent border border-transparent focus:border-indigo-500 focus:bg-zinc-900/50 rounded px-2 py-1 -ml-2 outline-none w-full text-base font-semibold text-zinc-200 transition-all"
                  placeholder="Título da Tarefa/Módulo"
                />
                <button 
                  onClick={() => taskInputRefs.current[task.id]?.focus()}
                  className="opacity-0 group-hover/task:opacity-100 p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-all shrink-0"
                  title="Editar Título"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 pl-9">
                <AnimatePresence initial={false}>
                  {task.subtasks.map((subtask) => (
                    <motion.div 
                      key={subtask.id} 
                      layout
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, scale: 0.95, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-2 overflow-hidden"
                    >
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-colors group/subtask gap-3 sm:gap-0 ${getStatusColor(subtask.status)}`}>
                        <div className="flex items-center gap-3 flex-1 w-full">
                          <button 
                            onClick={() => {
                              const nextStatus: TaskStatus = 
                                subtask.status === 'Pendente' ? 'Em Andamento' : 
                                subtask.status === 'Em Andamento' ? 'Concluído' : 'Pendente';
                              onUpdateSubtaskStatus(demand.id, task.id, subtask.id, nextStatus);
                            }}
                            className="focus:outline-none hover:scale-110 transition-transform shrink-0"
                          >
                            {getStatusIcon(subtask.status)}
                          </button>
                          <input
                            ref={el => subtaskInputRefs.current[subtask.id] = el}
                            value={subtask.title}
                            onChange={(e) => onUpdateSubtaskTitle(demand.id, task.id, subtask.id, e.target.value)}
                            className={`bg-transparent border border-transparent focus:border-indigo-500 focus:bg-zinc-900/50 rounded px-2 py-1 -ml-2 outline-none w-full text-sm font-medium transition-all ${subtask.status === 'Concluído' ? 'line-through opacity-50 text-zinc-400' : 'text-zinc-200'}`}
                            placeholder="Descrição da subtarefa"
                          />
                          <button 
                            onClick={() => subtaskInputRefs.current[subtask.id]?.focus()}
                            className="opacity-0 group-hover/subtask:opacity-100 p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-all shrink-0"
                            title="Editar Subtarefa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      
                      <div className="flex items-center justify-end gap-3 w-full sm:w-auto pl-9 sm:pl-0">
                        <button 
                          onClick={() => toggleNote(subtask.id)}
                          className={`p-1.5 rounded-md transition-colors ${subtask.note || expandedNotes[subtask.id] ? 'bg-zinc-700/50 text-zinc-300' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}
                          title="Adicionar Nota/Log"
                        >
                          <MessageSquarePlus className="w-4 h-4" />
                        </button>

                        <select
                          value={subtask.status}
                          onChange={(e) => onUpdateSubtaskStatus(demand.id, task.id, subtask.id, e.target.value as TaskStatus)}
                          className={`text-xs font-medium bg-transparent border-none focus:ring-0 cursor-pointer appearance-none text-right outline-none ${subtask.status === 'Concluído' ? 'text-emerald-400' : subtask.status === 'Em Andamento' ? 'text-amber-400' : 'text-zinc-500'}`}
                        >
                          <option value="Pendente" className="bg-zinc-900 text-zinc-300">Pendente</option>
                          <option value="Em Andamento" className="bg-zinc-900 text-amber-400">Em Andamento</option>
                          <option value="Concluído" className="bg-zinc-900 text-emerald-400">Concluído</option>
                        </select>
                      </div>
                    </div>

                    {/* Note Textarea */}
                    {(expandedNotes[subtask.id] || subtask.note) && (
                      <div className={`ml-9 p-3 rounded-xl border ${subtask.status === 'Concluído' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-zinc-900/50 border-zinc-800'}`}>
                        <textarea
                          value={subtask.note || ''}
                          onChange={(e) => onUpdateSubtaskNote(demand.id, task.id, subtask.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                          placeholder="Adicione notas de resolução ou logs aqui... (Pressione Enter para salvar)"
                          className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm text-zinc-300 placeholder:text-zinc-600 outline-none min-h-[60px]"
                        />
                      </div>
                    )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <button
                  onClick={() => onAddSubtask(demand.id, task.id)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-300 mt-4 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors border border-dashed border-zinc-700 hover:border-zinc-600 w-full justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Subtarefa
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
