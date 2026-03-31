import React, { useState, useEffect } from 'react';
import { Demand, Comment } from '../types';
import { X, Calendar, User, Tag, Paperclip, CheckSquare, Square, Building2, AlignLeft, Link as LinkIcon, Trash2, Edit2, AlertTriangle, Play, CheckCircle2, Clock, MessageSquare, Send, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface DemandDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  demand: Demand | null;
  onUpdate: () => void;
  onEdit: () => void;
}

export default function DemandDetailsModal({ isOpen, onClose, demand, onUpdate, onEdit }: DemandDetailsModalProps) {
  const { profile } = useAuth();
  const [updatingSubItemId, setUpdatingSubItemId] = useState<string | null>(null);
  const [completingSubItem, setCompletingSubItem] = useState<{groupId: string, subItemId: string} | null>(null);
  const [subItemHours, setSubItemHours] = useState('');
  const [subItemObservation, setSubItemObservation] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedSubItems, setExpandedSubItems] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleGroup = (groupId: string, currentState: boolean) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !currentState
    }));
  };
  
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [loggedHours, setLoggedHours] = useState<string>('');
  const [finalObservations, setFinalObservations] = useState('');

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (isOpen && demand) {
      fetchComments();
      setCompletingSubItem(null);
      setSubItemHours('');
      setSubItemObservation('');
    }
  }, [isOpen, demand]);

  const fetchComments = async () => {
    if (!demand) return;
    const { data, error } = await supabase
      .from('demand_comments')
      .select('*')
      .eq('demand_id', demand.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setComments(data as Comment[]);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !demand || !profile) return;
    
    setIsSubmittingComment(true);
    const { error } = await supabase
      .from('demand_comments')
      .insert([
        {
          demand_id: demand.id,
          user_name: profile.name,
          content: newComment.trim()
        }
      ]);
    
    setIsSubmittingComment(false);
    if (!error) {
      setNewComment('');
      fetchComments();
    } else {
      console.error('Error adding comment:', error);
      alert('Erro ao adicionar comentário.');
    }
  };

  const allChecklistItemsCompleted = demand?.checklist && demand.checklist.length > 0
    ? demand.checklist.every(g => g.subItems.length > 0 && g.subItems.every(s => s.completed)) 
    : true;

  if (!isOpen || !demand) return null;

  const toggleSubItem = async (groupId: string, subItemId: string, currentCompletedStatus: boolean, currentInProgressStatus?: boolean) => {
    if (!demand || !demand.checklist) return;
    
    if (demand.status === 'A Fazer') {
      alert('Inicie o atendimento da demanda para interagir com o checklist.');
      return;
    }

    if (!currentCompletedStatus && !currentInProgressStatus) {
      // Move from Pending to In Progress
      setUpdatingSubItemId(subItemId);
      const newChecklist = demand.checklist.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            subItems: g.subItems.map(s => s.id === subItemId ? { ...s, in_progress: true, completed: false } : s)
          };
        }
        return g;
      });

      const { error } = await supabase
        .from('demands')
        .update({ checklist: newChecklist })
        .eq('id', demand.id);
      
      if (!error) {
        onUpdate();
      }
      setUpdatingSubItemId(null);
      return;
    }

    if (!currentCompletedStatus && currentInProgressStatus) {
      // Move from In Progress to Completed (Open Form)
      if (completingSubItem?.subItemId === subItemId) {
        setCompletingSubItem(null);
      } else {
        setCompletingSubItem({ groupId, subItemId });
        setSubItemHours('');
        setSubItemObservation('');
      }
      return;
    }

    // Move from Completed to Pending
    setUpdatingSubItemId(subItemId);
    
    const newChecklist = demand.checklist.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          subItems: g.subItems.map(s => s.id === subItemId ? { ...s, completed: false, in_progress: false, logged_hours: undefined, observation: undefined, completed_at: undefined } : s)
        };
      }
      return g;
    });

    const { error } = await supabase
      .from('demands')
      .update({ checklist: newChecklist })
      .eq('id', demand.id);
    
    if (!error) {
      onUpdate(); // Refresh data in parent
    }
    setUpdatingSubItemId(null);
  };

  const confirmSubItemCompletion = async () => {
    if (!demand || !demand.checklist || !completingSubItem) return;
    
    const { groupId, subItemId } = completingSubItem;
    setUpdatingSubItemId(subItemId);
    
    const hours = subItemHours ? Number(subItemHours) : undefined;
    
    const newChecklist = demand.checklist.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          subItems: g.subItems.map(s => s.id === subItemId ? { 
            ...s, 
            completed: true, 
            in_progress: false,
            logged_hours: hours, 
            observation: subItemObservation || undefined,
            completed_at: new Date().toISOString()
          } : s)
        };
      }
      return g;
    });

    const updatedGroup = newChecklist.find(g => g.id === groupId);
    const isNowCompleted = updatedGroup && updatedGroup.subItems.length > 0 && updatedGroup.subItems.every(s => s.completed);
    
    if (isNowCompleted) {
      setExpandedGroups(prev => ({ ...prev, [groupId]: false }));
    }

    const { error } = await supabase
      .from('demands')
      .update({ checklist: newChecklist })
      .eq('id', demand.id);
    
    if (!error) {
      onUpdate();
    }
    setUpdatingSubItemId(null);
    setCompletingSubItem(null);
  };

  const toggleAllSubItems = async (groupId: string, forceComplete: boolean) => {
    if (!demand || !demand.checklist) return;
    
    if (demand.status === 'A Fazer') {
      alert('Inicie o atendimento da demanda para interagir com o checklist.');
      return;
    }

    const newChecklist = demand.checklist.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          subItems: g.subItems.map(s => ({ 
            ...s, 
            completed: forceComplete,
            in_progress: false,
            ...(forceComplete ? { completed_at: new Date().toISOString() } : { logged_hours: undefined, observation: undefined, completed_at: undefined })
          }))
        };
      }
      return g;
    });

    if (forceComplete) {
      setExpandedGroups(prev => ({ ...prev, [groupId]: false }));
    } else {
      setExpandedGroups(prev => ({ ...prev, [groupId]: true }));
    }

    const { error } = await supabase
      .from('demands')
      .update({ checklist: newChecklist })
      .eq('id', demand.id);
    
    if (!error) {
      onUpdate();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await supabase
      .from('demands')
      .delete()
      .eq('id', demand.id);
    
    setIsDeleting(false);
    if (!error) {
      onUpdate();
      onClose();
    } else {
      console.error('Error deleting demand:', error);
      alert('Erro ao excluir demanda.');
    }
  };

  const handleStartWork = async () => {
    setIsUpdatingStatus(true);
    const { error } = await supabase
      .from('demands')
      .update({ status: 'Em Andamento' })
      .eq('id', demand.id);
    
    setIsUpdatingStatus(false);
    if (!error) {
      onUpdate();
    } else {
      console.error('Error starting work:', error);
      alert('Erro ao iniciar atendimento.');
    }
  };

  const handleOpenFinishForm = () => {
    if (demand?.checklist) {
      let totalHours = 0;
      demand.checklist.forEach(group => {
        group.subItems.forEach(item => {
          if (item.logged_hours) {
            totalHours += item.logged_hours;
          }
        });
      });
      if (totalHours > 0) {
        setLoggedHours(totalHours.toString());
      }
    }
    setShowFinishForm(true);
  };

  const handleFinishWork = async () => {
    if (!loggedHours || isNaN(Number(loggedHours))) {
      alert('Por favor, insira um número válido para as horas gastas.');
      return;
    }

    setIsUpdatingStatus(true);
    const { error } = await supabase
      .from('demands')
      .update({ 
        status: 'Concluído',
        logged_hours: Number(loggedHours),
        final_observations: finalObservations,
        completed_at: new Date().toISOString()
      })
      .eq('id', demand.id);
    
    setIsUpdatingStatus(false);
    if (!error) {
      setShowFinishForm(false);
      onUpdate();
      onClose();
    } else {
      console.error('Error finishing work:', error);
      alert('Erro ao finalizar demanda.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Alta': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Média': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Baixa': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getTagColor = (index: number) => {
    const colors = [
      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'bg-rose-500/10 text-rose-400 border-rose-500/20',
      'bg-amber-500/10 text-amber-400 border-amber-500/20',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-zinc-800/80 shrink-0">
          <div className="space-y-3 pr-4">
            <div className="flex items-center gap-3">
              {demand.ticket_id && (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  #{demand.ticket_id}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getPriorityColor(demand.priority)}`}>
                {demand.priority}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                {demand.status}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-zinc-100 leading-tight">{demand.title}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {demand.status !== 'Concluído' && (
              <button 
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                title="Editar Demanda"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Excluir Demanda"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-zinc-800 mx-1"></div>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="bg-red-500/10 border-b border-red-500/20 p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">Tem certeza que deseja excluir esta demanda?</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-8 custom-scrollbar">
          
          {/* Workflow Actions */}
          {demand.status === 'A Fazer' && (
            <div className="flex justify-end">
              <button
                onClick={handleStartWork}
                disabled={isUpdatingStatus}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
              >
                <Play className="w-4 h-4" />
                {isUpdatingStatus ? 'Iniciando...' : 'Iniciar Atendimento'}
              </button>
            </div>
          )}

          {demand.status === 'Em Andamento' && !showFinishForm && (
            <div className="flex justify-end">
              <button
                onClick={handleOpenFinishForm}
                disabled={!allChecklistItemsCompleted}
                title={!allChecklistItemsCompleted ? 'Conclua todos os itens do checklist para finalizar' : ''}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg ${
                  allChecklistItemsCompleted 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' 
                    : 'bg-zinc-700 text-zinc-400 cursor-not-allowed shadow-none'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                Finalizar Demanda
              </button>
            </div>
          )}

          {/* Finish Form */}
          {showFinishForm && (
            <div className="bg-[#0A0A0A] border border-emerald-500/30 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Finalizar Demanda
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" /> Horas Gastas
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={loggedHours}
                    onChange={(e) => setLoggedHours(e.target.value)}
                    placeholder="Ex: 2.5"
                    className="w-full px-3 py-2 bg-[#111111] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-zinc-500" /> Observações de Conclusão
                  </label>
                  <textarea
                    value={finalObservations}
                    onChange={(e) => setFinalObservations(e.target.value)}
                    placeholder="Descreva o que foi feito..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#111111] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowFinishForm(false)}
                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFinishWork}
                    disabled={isUpdatingStatus || !allChecklistItemsCompleted}
                    title={!allChecklistItemsCompleted ? 'Conclua todos os itens do checklist para finalizar' : ''}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg ${
                      allChecklistItemsCompleted
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 disabled:opacity-50'
                        : 'bg-zinc-700 text-zinc-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isUpdatingStatus ? 'Salvando...' : 'Confirmar Conclusão'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> Cliente</span>
              <p className="text-sm text-zinc-200 font-medium">{demand.client || 'Não informado'}</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Solicitante</span>
              <p className="text-sm text-zinc-200 font-medium">{demand.requester || 'Não informado'}</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> Tipo de Solicitação</span>
              <p className="text-sm text-zinc-200 font-medium">{demand.request_type || 'Não informado'}</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Desenvolvedor</span>
              <p className="text-sm text-zinc-200 font-medium">{demand.assignee?.name || 'Não atribuído'}</p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Prazo (SLA)</span>
              <p className="text-sm text-zinc-200 font-medium">{demand.sla && !isNaN(new Date(demand.sla).getTime()) ? new Date(demand.sla).toLocaleDateString('pt-BR') : 'Sem prazo'}</p>
            </div>
          </div>

          {/* Finalization Details (if completed) */}
          {demand.status === 'Concluído' && (demand.logged_hours || demand.final_observations || demand.completed_at) && (
            <>
              <div className="h-px bg-zinc-800/50 w-full"></div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Detalhes da Conclusão
                </h3>
                <div className="space-y-4">
                  {demand.completed_at && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Data de Conclusão</span>
                      <p className="text-sm text-zinc-200 font-medium">{new Date(demand.completed_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  )}
                  {demand.logged_hours && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Horas Gastas</span>
                      <p className="text-sm text-zinc-200 font-medium">{demand.logged_hours}h</p>
                    </div>
                  )}
                  {demand.final_observations && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5"/> Observações</span>
                      <div className="bg-[#0A0A0A] border border-zinc-800/80 rounded-lg p-3 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {demand.final_observations}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-zinc-800/50 w-full"></div>

          {/* Description */}
          {demand.description && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-zinc-400" /> Descrição
              </h3>
              <div className="bg-[#0A0A0A] border border-zinc-800/80 rounded-xl p-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {demand.description}
              </div>
            </div>
          )}

          {/* Checklist */}
          {demand.checklist && demand.checklist.length > 0 && (
            <>
              <div className="h-px bg-zinc-800/50 w-full"></div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-zinc-400" /> Checklist
                  </h3>
                  <span className="text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                    {demand.checklist.reduce((acc, g) => acc + g.subItems.filter(s => s.completed).length, 0)} de {demand.checklist.reduce((acc, g) => acc + g.subItems.length, 0)} concluídas
                  </span>
                </div>
                <div className="space-y-3">
                  {demand.checklist.map(group => {
                    const isGroupCompleted = group.subItems.length > 0 && group.subItems.every(s => s.completed);
                    const isGroupInProgress = group.subItems.some(s => s.completed || s.in_progress) && !isGroupCompleted;
                    const isExpanded = expandedGroups[group.id] !== undefined ? expandedGroups[group.id] : !isGroupCompleted;
                    
                    return (
                      <div key={group.id} className="bg-[#1A1A1A] border border-zinc-800/80 rounded-xl overflow-hidden">
                        <div 
                          className={`p-3 flex items-center justify-between border-b border-zinc-800/80 transition-colors ${
                            isGroupCompleted ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 
                            isGroupInProgress ? 'bg-amber-500/10 hover:bg-amber-500/20' : 
                            'bg-[#111111] hover:bg-zinc-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleGroup(group.id, isExpanded); }}
                              className="p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAllSubItems(group.id, !isGroupCompleted);
                              }}
                              className="mt-0.5"
                              title={isGroupCompleted ? "Desmarcar todos" : "Marcar todos como concluídos"}
                            >
                              {isGroupCompleted ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500 transition-transform duration-200 scale-110" />
                              ) : isGroupInProgress ? (
                                <CheckSquare className="w-4 h-4 text-amber-500 hover:text-amber-400 transition-colors" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-400 transition-colors" />
                              )}
                            </button>

                            <span 
                              onClick={(e) => { e.stopPropagation(); toggleGroup(group.id, isExpanded); }}
                              className={`text-sm font-semibold cursor-pointer ${
                                isGroupCompleted ? 'text-emerald-400' : 
                                isGroupInProgress ? 'text-amber-400' : 
                                'text-zinc-200'
                              }`}
                            >
                              {group.title}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ml-2 ${isGroupCompleted ? 'bg-emerald-500/20 text-emerald-400' : isGroupInProgress ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                              {isGroupCompleted ? 'Concluído' : isGroupInProgress ? 'Em Andamento' : 'Pendente'}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-md">
                            {group.subItems.filter(s => s.completed).length}/{group.subItems.length}
                          </span>
                        </div>
                        <div 
                          className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="p-2 space-y-1">
                            {group.subItems.map(subItem => (
                              <div key={subItem.id} className="flex flex-col w-full">
                                <div 
                                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-all duration-200 group ${
                                    subItem.completed 
                                      ? 'bg-emerald-500/5 hover:bg-emerald-500/10' 
                                      : subItem.in_progress
                                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                        : 'hover:bg-zinc-800/50'
                                  } ${updatingSubItemId === subItem.id ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!updatingSubItemId) toggleSubItem(group.id, subItem.id, subItem.completed, subItem.in_progress);
                                    }}
                                    className="mt-0.5 shrink-0 cursor-pointer focus:outline-none hover:scale-110 transition-transform"
                                  >
                                    {subItem.completed ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-500 transition-transform duration-200 scale-110" />
                                    ) : subItem.in_progress ? (
                                      <Play className="w-4 h-4 text-amber-500 transition-transform duration-200 scale-110" />
                                    ) : (
                                      <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-400 transition-colors" />
                                    )}
                                  </button>
                                  <div className="flex-1 flex items-center justify-between">
                                    <span className={`text-sm transition-all duration-200 ${subItem.completed ? 'text-zinc-500' : 'text-zinc-300 group-hover:text-zinc-200'}`}>
                                      {subItem.title}
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                                        subItem.completed ? 'bg-emerald-500/20 text-emerald-400' : 
                                        subItem.in_progress ? 'bg-amber-500/20 text-amber-400' : 
                                        'bg-zinc-800 text-zinc-400'
                                      }`}>
                                        {subItem.completed ? 'Concluído' : subItem.in_progress ? 'Em Andamento' : 'Pendente'}
                                      </span>
                                      {subItem.completed && (subItem.logged_hours || subItem.observation || subItem.completed_at) && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedSubItems(prev => ({ ...prev, [subItem.id]: !prev[subItem.id] }));
                                          }}
                                          className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                                          title={expandedSubItems[subItem.id] ? "Ocultar detalhes" : "Mostrar detalhes"}
                                        >
                                          {expandedSubItems[subItem.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Display logged hours and observation if completed */}
                                {subItem.completed && (subItem.logged_hours || subItem.observation || subItem.completed_at) && expandedSubItems[subItem.id] && (
                                  <div className="ml-9 mb-2 p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-xs text-zinc-400 space-y-1">
                                    {subItem.completed_at && <div><span className="font-semibold text-zinc-300">Data:</span> {new Date(subItem.completed_at).toLocaleDateString('pt-BR')}</div>}
                                    {subItem.logged_hours && <div><span className="font-semibold text-zinc-300">Horas:</span> {subItem.logged_hours}h</div>}
                                    {subItem.observation && <div><span className="font-semibold text-zinc-300">Obs:</span> {subItem.observation}</div>}
                                  </div>
                                )}

                                {/* Inline Form */}
                                {completingSubItem?.subItemId === subItem.id && (
                                  <div className="ml-9 mb-2 p-3 bg-[#0A0A0A] border border-zinc-800 rounded-lg space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div className="sm:col-span-1">
                                        <label className="text-xs text-zinc-400 mb-1 block">Horas Gastas</label>
                                        <input type="number" step="0.5" min="0" value={subItemHours} onChange={e => setSubItemHours(e.target.value)} className="w-full bg-[#111111] border border-zinc-800 rounded-md px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500" placeholder="Ex: 1.5" />
                                      </div>
                                      <div className="sm:col-span-2">
                                        <label className="text-xs text-zinc-400 mb-1 block">Observação (opcional)</label>
                                        <input type="text" value={subItemObservation} onChange={e => setSubItemObservation(e.target.value)} className="w-full bg-[#111111] border border-zinc-800 rounded-md px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500" placeholder="O que foi feito?" />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button onClick={() => setCompletingSubItem(null)} className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors">Cancelar</button>
                                      <button onClick={confirmSubItemCompletion} disabled={updatingSubItemId === subItem.id} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors disabled:opacity-50">Confirmar</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Comments Section */}
          <div className="h-px bg-zinc-800/50 w-full"></div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-zinc-400" /> Comentários
            </h3>
            
            {/* Add Comment Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Adicione um comentário..."
                className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmittingComment}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-3 mt-4">
              {comments.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-4">Nenhum comentário ainda.</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="bg-[#0A0A0A] border border-zinc-800/80 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-400">{comment.user_name}</span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(comment.created_at).toLocaleString('pt-BR', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
