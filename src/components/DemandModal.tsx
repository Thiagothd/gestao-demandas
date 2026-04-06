import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { getLocalDateString } from '../utils';
import { Profile, DemandPriority, Demand, ChecklistItem, ChecklistSubItem, Attachment } from '../types';
import { X, Plus, Link as LinkIcon, Tag, CheckSquare, AlertCircle, Save, Wand2, Upload, Trash2, Edit2, Loader2, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import * as mammoth from 'mammoth';
import { GoogleGenAI, Type } from '@google/genai';

interface DemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  demandToEdit?: Demand | null;
}

export default function DemandModal({ isOpen, onClose, onSuccess, demandToEdit }: DemandModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [client, setClient] = useState('');
  const [requester, setRequester] = useState('');
  const [requestType, setRequestType] = useState('');
  const [priority, setPriority] = useState<DemandPriority>('Média');
  const [sla, setSla] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [quickChecklistInput, setQuickChecklistInput] = useState('');
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      if (demandToEdit) {
        setTitle(demandToEdit.title);
        setDescription(demandToEdit.description || '');
        setClient(demandToEdit.client || '');
        setRequester(demandToEdit.requester || '');
        setRequestType(demandToEdit.request_type || '');
        setPriority(demandToEdit.priority as DemandPriority);
        setSla(demandToEdit.sla ? getLocalDateString(new Date(demandToEdit.sla)) : '');
        setAssignedTo(demandToEdit.assigned_to || '');
        setChecklistItems(demandToEdit.checklist || []);
        setAttachments(demandToEdit.attachments || []);
      } else {
        // Reset form
        setTitle('');
        setDescription('');
        setClient('');
        setRequester('');
        setRequestType('');
        setPriority('Média');
        setSla('');
        setAssignedTo('');
        setChecklistItems([]);
        setAttachments([]);
        setShowSmartImport(true);
      }
      setErrorMessage(null);
    }
  }, [isOpen, demandToEdit]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
      
    if (!error && data) {
      setEmployees(data as Profile[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const demandId = demandToEdit ? demandToEdit.id : crypto.randomUUID();

      const demandData = {
        title,
        description,
        client: client || null,
        requester: requester || null,
        request_type: requestType || null,
        priority,
        sla: sla || null,
        assigned_to: assignedTo || null,
        checklist: checklistItems.length > 0 ? checklistItems : null,
        attachments: attachments.length > 0 ? attachments : null
      };

      let demandError;

      if (demandToEdit) {
        const { error } = await supabase
          .from('demands')
          .update(demandData)
          .eq('id', demandId);
        demandError = error;
      } else {
        const { error } = await supabase
          .from('demands')
          .insert([
            {
              id: demandId,
              ...demandData,
              status: 'A Fazer'
            }
          ]);
        demandError = error;
      }

      if (demandError) {
        console.error('Error saving demand:', demandError);
        let errorDetails = '';
        try {
          errorDetails = JSON.stringify(demandError, null, 2);
        } catch (e) {
          errorDetails = demandError.message || String(demandError);
        }
        setErrorMessage(`Erro do Supabase:\n${errorDetails}\n\nDica: Verifique se você rodou o script SQL para adicionar as colunas 'client', 'requester', 'request_type', 'checklist' e 'attachments' na tabela demands.`);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Unexpected error:', err);
      setErrorMessage(`Erro inesperado: ${err.message || 'Falha na conexão'}`);
      setIsSubmitting(false);
    }
  };

  const parseChecklistText = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newChecklist: ChecklistItem[] = [];
    let currentGroup: ChecklistItem | null = null;

    const groupRegex = /^(\d+[\.\-\)]\s*)/;
    const subItemRegex = /^([a-zA-Z][\.\-\)]\s*|[\-\•]\s*)/;

    lines.forEach(line => {
      if (groupRegex.test(line)) {
        const title = line.replace(groupRegex, '').trim();
        const newGroup: ChecklistItem = {
          id: crypto.randomUUID(),
          title,
          isGroup: true,
          subItems: []
        };
        newChecklist.push(newGroup);
        currentGroup = newGroup;
      } else if (subItemRegex.test(line)) {
        const title = line.replace(subItemRegex, '').trim();
        const subItem: ChecklistSubItem = {
          id: crypto.randomUUID(),
          title,
          completed: false
        };
        if (currentGroup) {
          currentGroup.subItems.push(subItem);
        } else {
          const defaultGroup: ChecklistItem = {
            id: crypto.randomUUID(),
            title: 'Geral',
            isGroup: true,
            subItems: [subItem]
          };
          newChecklist.push(defaultGroup);
          currentGroup = defaultGroup;
        }
      } else {
        if (currentGroup) {
          currentGroup.subItems.push({
            id: crypto.randomUUID(),
            title: line,
            completed: false
          });
        } else {
          const newGroup: ChecklistItem = {
            id: crypto.randomUUID(),
            title: line,
            isGroup: true,
            subItems: []
          };
          newChecklist.push(newGroup);
          currentGroup = newGroup;
        }
      }
    });

    setChecklistItems(prev => [...prev, ...newChecklist]);
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleAddQuickItem = () => {
    if (!quickChecklistInput.trim()) return;

    const newItem: ChecklistSubItem = {
      id: crypto.randomUUID(),
      title: quickChecklistInput.trim(),
      completed: false
    };

    setChecklistItems(prev => {
      const geralGroupIndex = prev.findIndex(g => g.title === 'Geral');
      if (geralGroupIndex >= 0) {
        // Add to existing 'Geral' group
        const newChecklist = [...prev];
        newChecklist[geralGroupIndex] = {
          ...newChecklist[geralGroupIndex],
          subItems: [...newChecklist[geralGroupIndex].subItems, newItem]
        };
        return newChecklist;
      } else {
        // Create 'Geral' group
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            title: 'Geral',
            isGroup: true,
            subItems: [newItem]
          }
        ];
      }
    });

    setQuickChecklistInput('');
  };

  const handleSmartImport = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("Chave da API do Gemini não configurada. Verifique o arquivo .env");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Você é um assistente especialista em organizar demandas e criar checklists inteligentes. Analise o texto a seguir e extraia um checklist hierárquico. 
        
        REGRAS IMPORTANTES:
        1. Ignore comentários, ruídos, saudações, introduções ou textos que não representem ações claras a serem feitas.
        2. Estruture o checklist em grupos principais (ex: "1. Preparação", "Fase A") e subtarefas (ex: "a) Revisar documento", "- Enviar email").
        3. SEJA INTELIGENTE: Não coloque um grupo inteiro como um único item de checklist se ele tiver subtarefas. O grupo deve ser apenas o título agregador.
        4. As subtarefas devem ser ações claras, concisas e diretas que podem ser marcadas como concluídas.
        5. Se o texto descrever um fluxo ou processo, divida-o logicamente em etapas (grupos) e ações (subtarefas).
        6. Se o texto for apenas uma lista simples sem hierarquia clara, crie um grupo chamado "Geral" e adicione os itens como subtarefas.
        7. Extraia o máximo de valor acionável do texto, mas não crie tarefas que não foram mencionadas ou implícitas.
        
        Texto:
        ${aiPrompt}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "O título do grupo principal (ex: '1. Preparação')",
                },
                subItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.STRING,
                    description: "O título da subtarefa acionável (ex: 'a) Revisar documento')",
                  },
                  description: "Lista de subtarefas pertencentes a este grupo",
                },
              },
              required: ["title", "subItems"],
            },
          },
        },
      });

      const jsonStr = response.text?.trim() || "[]";
      let parsedData = JSON.parse(jsonStr);
      
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        // Fallback if AI returns empty or invalid format
        parsedData = [{
          title: "Geral",
          subItems: aiPrompt.split('\n').filter(line => line.trim().length > 0)
        }];
      }
      
      const newChecklist: ChecklistItem[] = parsedData.map((group: any) => ({
        id: crypto.randomUUID(),
        title: group.title || 'Grupo sem título',
        isGroup: true,
        subItems: (group.subItems || []).map((subTitle: string) => ({
          id: crypto.randomUUID(),
          title: subTitle,
          completed: false
        }))
      }));

      setChecklistItems(prev => [...prev, ...newChecklist]);
      
      // Expand new groups by default
      const newExpandedState: Record<string, boolean> = {};
      newChecklist.forEach(g => {
        newExpandedState[g.id] = true;
      });
      setExpandedGroups(prev => ({ ...prev, ...newExpandedState }));
    } catch (err: any) {
      console.error('Error generating checklist:', err);
      setErrorMessage(`Erro ao gerar checklist com IA: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let text = '';
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }
      
      if (text) {
        setAiPrompt(text);
      }
      // We don't auto-generate here, we let the user review the text and click generate
    } catch (err) {
      console.error('Error parsing file:', err);
      alert('Erro ao ler o arquivo. Certifique-se de que é um arquivo válido (.docx, .txt).');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingFile(true);
    setErrorMessage(null);

    try {
      const newAttachments: Attachment[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `demand-attachments/${fileName}`;

        // Ensure the bucket exists or handle the error gracefully
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        newAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: publicUrl
        });
      }

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (err: any) {
      console.error('Error uploading attachment:', err);
      setErrorMessage(`Erro ao fazer upload do anexo: ${err.message}. Certifique-se de que o bucket 'attachments' existe no Supabase e é público.`);
    } finally {
      setIsUploadingFile(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const removeGroup = (groupId: string) => {
    setChecklistItems(prev => prev.filter(g => g.id !== groupId));
  };

  const removeSubItem = (groupId: string, subItemId: string) => {
    setChecklistItems(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, subItems: g.subItems.filter(s => s.id !== subItemId) };
      }
      return g;
    }));
  };

  const updateGroupTitle = (groupId: string, newTitle: string) => {
    setChecklistItems(prev => prev.map(g => g.id === groupId ? { ...g, title: newTitle } : g));
  };

  const updateSubItemTitle = (groupId: string, subItemId: string, newTitle: string) => {
    setChecklistItems(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          subItems: g.subItems.map(s => s.id === subItemId ? { ...s, title: newTitle } : s)
        };
      }
      return g;
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 shrink-0">
          <h2 className="text-xl font-semibold text-zinc-100">{demandToEdit ? 'Editar Demanda' : 'Nova Demanda'}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-6 space-y-6 custom-scrollbar">
          {errorMessage && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-400 whitespace-pre-wrap">
                <p className="font-semibold mb-1">Falha ao salvar:</p>
                {errorMessage}
              </div>
            </div>
          )}

          <form id="demand-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Informações</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Título *</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Ex: Atualização do Sistema"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Cliente</label>
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Ex: Empresa XYZ"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Solicitante</label>
                <input
                  type="text"
                  value={requester}
                  onChange={(e) => setRequester(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Tipo de Solicitação</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                >
                  <option value="">Selecione...</option>
                  <option value="Bug">Bug</option>
                  <option value="Atualização">Atualização</option>
                  <option value="Ajuste">Ajuste</option>
                  <option value="Nova Funcionalidade">Nova Funcionalidade</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configurações */}
          <div className="space-y-4 pt-4 border-t border-zinc-800/50">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Configurações</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as DemandPriority)}
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Prazo (SLA)</label>
                <input
                  type="date"
                  value={sla}
                  onChange={(e) => setSla(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Desenvolvedor</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                >
                  <option value="">Selecione...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Detalhes Adicionais */}
          <div className="space-y-4 pt-4 border-t border-zinc-800/50">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Detalhes Adicionais</h3>
            
            {/* Description Field - Always visible */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                placeholder="Detalhes da demanda..."
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-zinc-500" />
                Anexos
              </label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    multiple
                    ref={attachmentInputRef}
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={isUploadingFile}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors border border-zinc-700/50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isUploadingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {isUploadingFile ? 'Enviando...' : 'Adicionar Anexos'}
                  </button>
                </div>
                
                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center justify-between bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-2.5 group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                            <LinkIcon className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <a 
                              href={attachment.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-zinc-200 hover:text-indigo-400 truncate transition-colors"
                            >
                              {attachment.name}
                            </a>
                            <span className="text-xs text-zinc-500">
                              {(attachment.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Remover anexo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-zinc-500" />
                  Checklist
                </label>
                {checklistItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja apagar o checklist atual e gerar um novo?')) {
                        setChecklistItems([]);
                      }
                    }}
                    className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors font-medium border border-red-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar Checklist
                  </button>
                )}
              </div>

              {/* Quick Checklist Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={quickChecklistInput}
                  onChange={(e) => setQuickChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuickItem();
                    }
                  }}
                  placeholder="Adicionar item rápido (Ex: Menu - Vendas - Proposta: Erro ao abrir)"
                  className="flex-1 bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={handleAddQuickItem}
                  disabled={!quickChecklistInput.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar
                </button>
              </div>

              {/* Smart Import Accordion */}
              <div className="bg-[#1A1A1A] border border-indigo-500/30 rounded-xl overflow-hidden mb-4">
                <button
                  type="button"
                  onClick={() => setShowSmartImport(!showSmartImport)}
                  className="w-full flex items-center justify-between p-4 bg-[#111111] hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-indigo-300">Gerar Checklist Inteligente</span>
                  </div>
                  {showSmartImport ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                </button>
                
                {showSmartImport && (
                  <div className="p-4 space-y-4 border-t border-indigo-500/30">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-indigo-500/30 rounded-lg hover:bg-indigo-500/5 hover:border-indigo-500/50 transition-colors"
                      >
                        <Upload className="w-6 h-6 text-indigo-400" />
                        <span className="text-sm font-medium text-indigo-300">Fazer Upload de .docx ou .txt</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".docx,.txt"
                        className="hidden"
                      />
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] font-medium tracking-wider uppercase">
                        <span className="bg-[#1A1A1A] px-2 text-zinc-400">Ou digite/cole o texto</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={6}
                        className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none text-sm placeholder:text-zinc-600"
                        placeholder="Cole o conteúdo do documento, e-mail ou anotações aqui para gerar um checklist inteligente..."
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSmartImport}
                          disabled={!aiPrompt.trim() || isGenerating}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Analisando e Gerando...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4" />
                              Gerar Checklist com IA
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {checklistItems.length > 0 && (
                <div className="space-y-4 mt-6 pt-6 border-t border-zinc-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                      Checklist Gerado
                    </h4>
                    <span className="text-xs font-medium text-zinc-400 tracking-wide bg-zinc-800/50 px-2 py-1 rounded-md">
                      {checklistItems.reduce((acc, group) => acc + group.subItems.length, 0)} itens
                    </span>
                  </div>
                  {checklistItems.map((group) => (
                    <div key={group.id} className="bg-[#1A1A1A] border border-zinc-800/80 rounded-xl overflow-hidden shadow-md transition-all duration-200 hover:border-zinc-700/80">
                      <div className="flex items-center gap-3 p-3 border-b border-zinc-800/50 bg-[#111111] hover:bg-zinc-800/30 transition-colors">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-all duration-200"
                        >
                          {expandedGroups[group.id] !== false ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div className={`w-1.5 h-4 rounded-full transition-colors duration-300 ${expandedGroups[group.id] !== false ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-zinc-600'}`} />
                        <input
                          type="text"
                          value={group.title}
                          onChange={(e) => updateGroupTitle(group.id, e.target.value)}
                          className="flex-1 bg-transparent border-none text-sm font-semibold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1.5 hover:bg-zinc-800/50 transition-all"
                          placeholder="Nome do Grupo"
                        />
                        <span className="text-xs text-indigo-300 font-medium px-2.5 py-1 bg-indigo-500/10 rounded-md border border-indigo-500/20">
                          {group.subItems.length} {group.subItems.length === 1 ? 'item' : 'itens'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeGroup(group.id)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-200"
                          title="Remover grupo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div 
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          expandedGroups[group.id] !== false ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="p-4 pl-12 space-y-2.5 bg-[#1A1A1A]">
                          {group.subItems.map((subItem) => (
                            <div key={subItem.id} className="flex items-start gap-3 group/item p-1 -ml-1 rounded-lg hover:bg-zinc-800/30 transition-colors">
                              <div className="w-4 h-4 rounded border border-zinc-600 bg-zinc-900/50 shrink-0 mt-1 flex items-center justify-center shadow-inner">
                                {/* Placeholder for checkbox to show it's a task */}
                              </div>
                              <input
                                type="text"
                                value={subItem.title}
                                onChange={(e) => updateSubItemTitle(group.id, subItem.id, e.target.value)}
                                className="flex-1 bg-transparent border-none text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 hover:bg-zinc-800/50 transition-all"
                                placeholder="Descrição da tarefa"
                              />
                              <button
                                type="button"
                                onClick={() => removeSubItem(group.id, subItem.id)}
                                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-200 opacity-0 group-hover/item:opacity-100"
                                title="Remover tarefa"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newSubItem = { id: crypto.randomUUID(), title: '', completed: false };
                              setChecklistItems(prev => prev.map(g => g.id === group.id ? { ...g, subItems: [...g.subItems, newSubItem] } : g));
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-md hover:bg-indigo-500/10 transition-all duration-200 w-fit font-medium border border-transparent hover:border-indigo-500/20"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar Tarefa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newGroup = { id: crypto.randomUUID(), title: 'Novo Grupo', isGroup: true, subItems: [] };
                      setChecklistItems(prev => [...prev, newGroup]);
                    }}
                    className="w-full py-3 border border-dashed border-zinc-700/50 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Novo Grupo
                  </button>
                </div>
              )}
            </div>
          </div>

          </form>
        </div>

        <div className="p-6 border-t border-zinc-800 shrink-0 flex justify-end gap-3 bg-[#111111] rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="demand-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : demandToEdit ? (
              <Save className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {isSubmitting ? 'Salvando...' : demandToEdit ? 'Salvar Alterações' : 'Criar Demanda'}
          </button>
        </div>
      </div>
    </div>
  );
}
