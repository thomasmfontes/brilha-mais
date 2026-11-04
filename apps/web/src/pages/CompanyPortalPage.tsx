import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  LogOut,
  Search,
  Filter,
  Users,
  Bookmark,
  Award,
  Clock,
  MapPin,
  FileText,
  Download,
  ExternalLink,
  MessageCircle,
  Sparkles,
  ChevronDown,
  X,
  CheckCircle2,
  Briefcase,
  AlertCircle,
  Phone,
  Mail,
  ShieldCheck,
  Eye,
  UserCheck,
  Archive,
  Kanban,
  LayoutGrid,
  List,
  ArrowRight,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  GripVertical,
  StickyNote,
  Flag,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import api from "../utils/api";
import { toast } from "react-hot-toast";
import logo from "../assets/logo.png";
import LoadingSpinner from "../components/LoadingSpinner";
import CompanyTalentModal, {
  CompanyTalent,
} from "../components/company/CompanyTalentModal";

// Helper to format uppercase availability to title case
function formatAvailability(avail?: string | null) {
  if (!avail) return "";
  const map: Record<string, string> = {
    MANHA: "Manhã",
    TARDE: "Tarde",
    NOITE: "Noite",
    INTEGRAL: "Integral",
    FLEXIVEL: "Flexível",
  };
  return map[avail.toUpperCase()] || avail;
}

// Custom FilterSelect matching Enterprise SaaS
function FilterSelect({
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
}: {
  icon: React.ElementType;
  value: string;
  onChange: (val: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isActive = value !== "ALL" && value !== "all" && value !== "";
  const selectedOption =
    value === "ALL" || value === "all" || value === ""
      ? null
      : options.find((o) => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-colors select-none cursor-pointer
          ${
            isActive
              ? "bg-amber-50/80 border border-amber-300 text-amber-900 shadow-2xs"
              : isOpen
                ? "bg-slate-100 border border-slate-300 text-slate-900"
                : "bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700"
          }
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <div
            className={`shrink-0 transition-colors ${
              isActive ? "text-amber-600" : "text-slate-400"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-left flex-1">
            {isActive && selectedOption ? selectedOption.name : placeholder}
          </span>
        </div>
        <div
          className={`shrink-0 transition-transform duration-200 ${
            isOpen
              ? "rotate-180 text-slate-900"
              : isActive
                ? "text-amber-600"
                : "text-slate-400"
          }`}
        >
          <ChevronDown className="h-3 w-3" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[200px] bg-white border border-slate-200/90 rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const isItemActive =
                (opt.id === "" && (!value || value === "ALL")) ||
                opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isItemActive
                      ? "bg-amber-50 text-amber-900 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate">{opt.name}</span>
                  {isItemActive && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Kanban card order persistence helpers
const PIPELINE_ORDER_KEY = "brilha_mais_pipeline_card_order";

function getSavedPipelineOrder(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(PIPELINE_ORDER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePipelineOrder(pipeline: any) {
  try {
    if (!pipeline) return;
    const orderMap: Record<string, string[]> = {
      SAVED: (pipeline.SAVED || []).map((i: any) => i.talent?.id || i.talentId).filter(Boolean),
      INTERVIEW: (pipeline.INTERVIEW || []).map((i: any) => i.talent?.id || i.talentId).filter(Boolean),
      HIRED: (pipeline.HIRED || []).map((i: any) => i.talent?.id || i.talentId).filter(Boolean),
      ARCHIVED: (pipeline.ARCHIVED || []).map((i: any) => i.talent?.id || i.talentId).filter(Boolean),
    };
    localStorage.setItem(PIPELINE_ORDER_KEY, JSON.stringify(orderMap));
  } catch (e) {
    console.error("Failed to save pipeline order:", e);
  }
}

function applyOrderToPipeline(pipelineData: any) {
  if (!pipelineData?.pipeline) return pipelineData;
  const orderMap = getSavedPipelineOrder();
  const stages = ["SAVED", "INTERVIEW", "HIRED", "ARCHIVED"] as const;
  const newPipeline: Record<string, any[]> = {};

  stages.forEach((stage) => {
    const list = pipelineData.pipeline[stage] || [];
    const order = orderMap[stage];
    if (!order || order.length === 0) {
      newPipeline[stage] = list;
    } else {
      const sorted = [...list].sort((a, b) => {
        const idA = a.talent?.id || a.talentId;
        const idB = b.talent?.id || b.talentId;
        const idxA = order.indexOf(idA);
        const idxB = order.indexOf(idB);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      newPipeline[stage] = sorted;
    }
  });

  return {
    ...pipelineData,
    pipeline: newPipeline,
  };
}

// Applies physics-based tilt while dragging, smoothly straightening when released
function getDraggableCardStyle(style: any, snapshot: any) {
  if (!snapshot.isDragging) {
    return style;
  }
  // While actively dragging: apply 2.5deg tilt and 1.02 scale
  if (!snapshot.isDropAnimating) {
    return {
      ...style,
      transform: style?.transform
        ? `${style.transform} rotate(2.5deg) scale(1.02)`
        : "rotate(2.5deg) scale(1.02)",
      zIndex: 9999,
    };
  }
  // When released (drop animation): smoothly straighten back to 0deg
  return {
    ...style,
    zIndex: 9999,
  };
}

export default function CompanyPortalPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"catalog" | "pipeline">("catalog");
  const [catalogView, setCatalogView] = useState<"grid" | "table">("grid");
  const [pipelineView, setPipelineView] = useState<"kanban" | "list">("kanban");
  const [pipelineFilter, setPipelineFilter] = useState<
    "ALL" | "SAVED" | "INTERVIEW" | "HIRED" | "ARCHIVED"
  >("ALL");

  const [companyProfile, setCompanyProfile] = useState<{
    id: string;
    name: string;
    tradeName?: string;
    contactName: string;
    contactEmail: string;
  } | null>(null);

  const [talents, setTalents] = useState<CompanyTalent[]>([]);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters for catalog
  const [search, setSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedStage, setSelectedStage] = useState("");

  // Pipeline search & Drag and drop
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [draggedTalentId, setDraggedTalentId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Modal
  const [selectedTalent, setSelectedTalent] = useState<CompanyTalent | null>(
    null,
  );
  const [movingTalent, setMovingTalent] = useState<{ id: string; stage: string } | null>(null);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const [profileRes, talentsRes, pipelineRes] = await Promise.all([
        api.get("/company/me"),
        api.get("/company/talents"),
        api.get("/company/pipeline"),
      ]);

      setCompanyProfile(profileRes.data);
      setTalents(talentsRes.data || []);
      setPipelineData(applyOrderToPipeline(pipelineRes.data));
    } catch (err: any) {
      console.error("Failed to load company portal data:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error("Sessão expirada ou acesso restrito a empresas parceiras.");
        localStorage.removeItem("auth_token");
        navigate("/login", { replace: true });
      } else {
        toast.error("Erro ao carregar dados do portal corporativo.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    toast.success("Desconectado com sucesso.");
    navigate("/login", { replace: true });
  };

  // Filtered talents in catalog
  const filteredTalents = useMemo(() => {
    return talents.filter((t) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchName = t.user.name?.toLowerCase().includes(query);
        const matchHeadline = t.headline?.toLowerCase().includes(query);
        const matchBio = t.bio?.toLowerCase().includes(query);
        const matchCity = t.city?.toLowerCase().includes(query);
        const matchArea = t.areasOfInterest?.some((a) => a.toLowerCase().includes(query));
        if (!matchName && !matchHeadline && !matchBio && !matchCity && !matchArea)
          return false;
      }

      if (selectedArea && (!t.areasOfInterest || !t.areasOfInterest.includes(selectedArea))) {
        return false;
      }

      if (selectedAvailability && t.availability !== selectedAvailability) {
        return false;
      }

      if (selectedCity && (!t.city || !t.city.toLowerCase().includes(selectedCity.toLowerCase()))) {
        return false;
      }

      if (selectedStage) {
        if (selectedStage === "NONE") {
          if (t.currentStage) return false;
        } else if (t.currentStage !== selectedStage) {
          return false;
        }
      }

      return true;
    });
  }, [talents, search, selectedArea, selectedAvailability, selectedCity, selectedStage]);

  // Available unique areas from loaded talents
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    talents.forEach((t) => {
      t.areasOfInterest?.forEach((a) => set.add(a));
    });
    return Array.from(set).sort();
  }, [talents]);

  const handleStageChange = (
    talentId: string,
    newStage: string,
    notes?: string,
    hiredRole?: string,
  ) => {
    // 1. Instantly update local catalog talents array
    setTalents((prev) =>
      prev.map((t) =>
        t.id === talentId
          ? {
              ...t,
              currentStage: newStage as any,
              interactionNotes: notes !== undefined ? notes : t.interactionNotes,
              hiredRole: hiredRole !== undefined ? hiredRole : t.hiredRole,
            }
          : t,
      ),
    );

    // 2. Instantly update pipelineData state so Kanban moves immediately without page reload
    setPipelineData((prev: any) => {
      if (!prev) return prev;
      const prevPipeline = prev.pipeline || {
        SAVED: [],
        INTERVIEW: [],
        HIRED: [],
        ARCHIVED: [],
      };

      let itemToMove: any = null;
      const nextPipeline: Record<string, any[]> = {
        SAVED: [],
        INTERVIEW: [],
        HIRED: [],
        ARCHIVED: [],
      };

      // Pull out candidate from whichever column they were previously in
      (["SAVED", "INTERVIEW", "HIRED", "ARCHIVED"] as const).forEach((col) => {
        const list = prevPipeline[col] || [];
        list.forEach((entry: any) => {
          if (entry.talent?.id === talentId || entry.talentId === talentId) {
            itemToMove = {
              ...entry,
              stage: newStage,
              notes: notes !== undefined ? notes : entry.notes,
              hiredRole: hiredRole !== undefined ? hiredRole : entry.hiredRole,
              updatedAt: new Date().toISOString(),
            };
          } else {
            nextPipeline[col].push(entry);
          }
        });
      });

      // If talent was not yet in pipeline (e.g. moved directly from catalog)
      if (!itemToMove && newStage && newStage !== "") {
        const t = talents.find((item) => item.id === talentId);
        if (t) {
          itemToMove = {
            interactionId: `temp-${Date.now()}`,
            stage: newStage,
            notes: notes || "",
            hiredRole: hiredRole || "",
            updatedAt: new Date().toISOString(),
            talent: {
              id: t.id,
              headline: t.headline,
              city: t.city,
              state: t.state,
              availability: t.availability,
              resumeUrl: t.resumeUrl,
              phone: t.phone,
              areasOfInterest: t.areasOfInterest,
              user: {
                id: t.user?.id || t.userId,
                name: t.user?.name || "Aluno",
                avatarUrl: t.user?.avatarUrl,
              },
            },
          };
        }
      }

      // If valid stage, insert at top of destination column
      if (itemToMove && newStage && nextPipeline[newStage]) {
        nextPipeline[newStage].unshift(itemToMove);
      }

      const total =
        nextPipeline.SAVED.length +
        nextPipeline.INTERVIEW.length +
        nextPipeline.HIRED.length +
        nextPipeline.ARCHIVED.length;

      return {
        ...prev,
        pipeline: nextPipeline,
        counts: {
          total,
          saved: nextPipeline.SAVED.length,
          interview: nextPipeline.INTERVIEW.length,
          hired: nextPipeline.HIRED.length,
          archived: nextPipeline.ARCHIVED.length,
        },
      };
    });
  };

  const handleDownloadResume = async (talent: CompanyTalent) => {
    if (!talent.resumeUrl) {
      toast.error("Este candidato ainda não anexou currículo.");
      return;
    }

    try {
      const res = await api.get(`/company/talents/${talent.id}/resume`);
      const url = res.data?.resumeUrl || talent.resumeUrl;
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Download do currículo registrado.");
    } catch {
      toast.error("Erro ao baixar currículo.");
    }
  };

  const handleQuickMove = async (
    talentId: string,
    newStage: "SAVED" | "INTERVIEW" | "HIRED" | "ARCHIVED",
  ) => {
    setMovingTalent({ id: talentId, stage: newStage });

    // 1. Optimistic UI update: candidate card moves instantly in React memory (0ms lag)
    handleStageChange(talentId, newStage);

    try {
      // 2. Persist to PostgreSQL database
      await api.put(`/company/talents/${talentId}/stage`, { stage: newStage });

      const stageMessages: Record<string, string> = {
        SAVED: "Candidato salvo no Radar!",
        INTERVIEW: "Candidato movido para etapa de Entrevista!",
        HIRED: "Candidato registrado como Contratado! Parabéns!",
        ARCHIVED: "Candidato arquivado no Banco de Reserva.",
      };
      toast.success(stageMessages[newStage] || "Etapa atualizada com sucesso!");

      // 3. ONLY after backend PUT succeeds, sync pipeline state from server
      const [pipeRes, talentsRes] = await Promise.all([
        api.get("/company/pipeline"),
        api.get("/company/talents"),
      ]);
      if (pipeRes.data) setPipelineData(applyOrderToPipeline(pipeRes.data));
      if (talentsRes.data) setTalents(talentsRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao atualizar etapa.");
      // Rollback to server state on error
      const [pipeRes, talentsRes] = await Promise.all([
        api.get("/company/pipeline").catch(() => null),
        api.get("/company/talents").catch(() => null),
      ]);
      if (pipeRes?.data) setPipelineData(applyOrderToPipeline(pipeRes.data));
      if (talentsRes?.data) setTalents(talentsRes.data);
    } finally {
      setMovingTalent(null);
    }
  };

  const openTalent = (talent: CompanyTalent, interaction?: any) => {
    const full = talents.find((t) => t.id === talent.id) || talent;

    // Determine the true active stage:
    // 1. interaction?.stage (direct from column if clicked in kanban or list)
    // 2. lookup in pipelineData.pipeline columns
    // 3. full.currentStage
    let activeStage: any = interaction?.stage || null;
    if (!activeStage && pipelineData?.pipeline) {
      for (const [stageKey, list] of Object.entries(pipelineData.pipeline)) {
        if (
          (list as any[]).some(
            (item: any) => (item.talent?.id || item.talentId) === talent.id,
          )
        ) {
          activeStage = stageKey;
          break;
        }
      }
    }
    if (!activeStage) {
      activeStage = full.currentStage || null;
    }

    setSelectedTalent({
      ...full,
      currentStage: activeStage,
      interactionNotes:
        interaction?.notes !== undefined
          ? interaction.notes
          : full.interactionNotes,
      hiredRole:
        interaction?.hiredRole !== undefined
          ? interaction.hiredRole
          : full.hiredRole,
    });
  };

  // Pipeline flat list according to filter & search
  const pipelineCandidates = useMemo(() => {
    if (!pipelineData?.pipeline) return [];
    const p = pipelineData.pipeline;
    let list: any[] = [];
    if (pipelineFilter === "SAVED") list = p.SAVED || [];
    else if (pipelineFilter === "INTERVIEW") list = p.INTERVIEW || [];
    else if (pipelineFilter === "HIRED") list = p.HIRED || [];
    else if (pipelineFilter === "ARCHIVED") list = p.ARCHIVED || [];
    else {
      list = [
        ...(p.SAVED || []),
        ...(p.INTERVIEW || []),
        ...(p.HIRED || []),
        ...(p.ARCHIVED || []),
      ];
    }

    if (!pipelineSearch.trim()) return list;
    const q = pipelineSearch.trim().toLowerCase();
    return list.filter((item: any) => {
      const t = item.talent;
      return (
        t?.user?.name?.toLowerCase().includes(q) ||
        t?.headline?.toLowerCase().includes(q) ||
        t?.city?.toLowerCase().includes(q) ||
        t?.areasOfInterest?.some((a: string) => a.toLowerCase().includes(q))
      );
    });
  }, [pipelineData, pipelineFilter, pipelineSearch]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId as
      | "SAVED"
      | "INTERVIEW"
      | "HIRED"
      | "ARCHIVED";

    // 1. REORDERING WITHIN THE SAME COLUMN (Same Stage)
    if (sourceCol === destCol) {
      setPipelineData((prev: any) => {
        if (!prev?.pipeline?.[sourceCol]) return prev;
        const list = Array.from(prev.pipeline[sourceCol]);
        const sourceIdx = list.findIndex(
          (item: any) => item.talent?.id === draggableId || item.talentId === draggableId,
        );
        if (sourceIdx === -1) return prev;

        const [movedItem] = list.splice(sourceIdx, 1);
        list.splice(destination.index, 0, movedItem);

        const newPipeline = {
          ...prev.pipeline,
          [sourceCol]: list,
        };

        savePipelineOrder(newPipeline);

        return {
          ...prev,
          pipeline: newPipeline,
        };
      });
      return;
    }

    // 2. MOVING ACROSS DIFFERENT COLUMNS (Stage Transition)
    setPipelineData((prev: any) => {
      if (!prev?.pipeline) return prev;
      const sourceList = Array.from(prev.pipeline[sourceCol] || []);
      const destList = Array.from(prev.pipeline[destCol] || []);

      const sourceIdx = sourceList.findIndex(
        (item: any) => item.talent?.id === draggableId || item.talentId === draggableId,
      );
      if (sourceIdx === -1) return prev;

      const [movedItem] = sourceList.splice(sourceIdx, 1) as any[];
      const updatedItem = {
        ...(movedItem as any),
        stage: destCol,
        updatedAt: new Date().toISOString(),
      };

      destList.splice(destination.index, 0, updatedItem);

      const newPipeline = {
        ...prev.pipeline,
        [sourceCol]: sourceList,
        [destCol]: destList,
      };

      savePipelineOrder(newPipeline);

      const total =
        (newPipeline.SAVED?.length || 0) +
        (newPipeline.INTERVIEW?.length || 0) +
        (newPipeline.HIRED?.length || 0) +
        (newPipeline.ARCHIVED?.length || 0);

      return {
        ...prev,
        pipeline: newPipeline,
        counts: {
          total,
          saved: newPipeline.SAVED?.length || 0,
          interview: newPipeline.INTERVIEW?.length || 0,
          hired: newPipeline.HIRED?.length || 0,
          archived: newPipeline.ARCHIVED?.length || 0,
        },
      };
    });

    // Update talents in memory so catalog (Banco de Talentos) syncs IMMEDIATELY
    setTalents((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, currentStage: destCol } : t)),
    );

    // Persist to backend database
    api
      .put(`/company/talents/${draggableId}/stage`, { stage: destCol })
      .then(() => {
        const stageMessages: Record<string, string> = {
          SAVED: "Candidato salvo no Radar!",
          INTERVIEW: "Candidato movido para etapa de Entrevista!",
          HIRED: "Candidato registrado como Contratado! Parabéns!",
          ARCHIVED: "Candidato arquivado no Banco de Reserva.",
        };
        toast.success(stageMessages[destCol] || "Etapa atualizada com sucesso!");

        // Also sync talents in background to guarantee full consistency across views
        api
          .get("/company/talents")
          .then((res) => {
            if (res.data) setTalents(res.data);
          })
          .catch(() => {});
      })
      .catch((err) => {
        console.error("Failed to persist stage change:", err);
        toast.error(err.response?.data?.message || "Erro ao salvar etapa no servidor.");
        fetchCompanyData();
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-medium text-zinc-600">
            Carregando Portal Corporativo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Top Corporate Header - Grounded Enterprise SaaS style */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: Brand & Recruiter profile */}
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/empresa" className="flex items-center gap-3">
                <img src={logo} alt="Brilha Mais" className="h-8 w-auto object-contain" />
                <div className="h-5 w-px bg-slate-200" />
                <div className="leading-tight">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Recrutamento &amp; Seleção
                  </span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {companyProfile?.name || "Empresa Parceira"}
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2.5 pl-3 py-1 text-xs">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs">
                  {companyProfile?.contactName?.charAt(0) || "R"}
                </div>
                <div className="text-left leading-tight">
                  <span className="font-semibold text-slate-900 block">
                    {companyProfile?.contactName || "Gestor de RH"}
                  </span>
                  <span className="text-[11px] text-slate-500">Recrutador(a)</span>
                </div>
              </div>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                title="Sair do Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Nav Tab Strip (Underline Tabs - Real SaaS standard) */}
          <div className="flex items-center justify-between border-t border-slate-100">
            <nav className="flex space-x-8 -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className={`py-3.5 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "catalog"
                    ? "border-amber-600 text-amber-900 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Banco de Talentos</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === "catalog"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {talents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("pipeline")}
                className={`py-3.5 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "pipeline"
                    ? "border-amber-600 text-amber-900 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Kanban className="w-4 h-4" />
                <span>Processos Seletivos (Funil)</span>
                {pipelineData?.counts?.total > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === "pipeline"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {pipelineData.counts.total}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === "catalog" ? (
          /* TAB 1: BANCO DE TALENTOS */
          <div className="space-y-5">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    Banco de Talentos
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {talents.length} disponíveis
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Auditado LGPD
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Estudantes capacitados e avaliados pelo Instituto Brilha Mais disponíveis para recrutamento corporativo.
                </p>
              </div>

              {/* View Switcher: Tabela / Cards */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setCatalogView("table")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    catalogView === "table"
                      ? "bg-slate-900 text-white shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Tabela</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogView("grid")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    catalogView === "grid"
                      ? "bg-slate-900 text-white shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            {/* Filter Bar - Clean Toolbar */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Search */}
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, cargo, habilidades..."
                    className="w-full h-9 pl-9 pr-7 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-white"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Area filter */}
                <FilterSelect
                  icon={Briefcase}
                  value={selectedArea}
                  onChange={setSelectedArea}
                  placeholder="Área de Atuação"
                  options={[
                    { id: "", name: "Todas as Áreas de Atuação" },
                    ...availableAreas.map((area) => ({ id: area, name: area })),
                  ]}
                />

                {/* Availability filter */}
                <FilterSelect
                  icon={Clock}
                  value={selectedAvailability}
                  onChange={setSelectedAvailability}
                  placeholder="Disponibilidade / Turno"
                  options={[
                    { id: "", name: "Qualquer Disponibilidade" },
                    { id: "MANHA", name: "Manhã" },
                    { id: "TARDE", name: "Tarde" },
                    { id: "NOITE", name: "Noite" },
                    { id: "INTEGRAL", name: "Integral" },
                    { id: "FLEXIVEL", name: "Flexível" },
                  ]}
                />

                {/* Status no Funil filter */}
                <FilterSelect
                  icon={Bookmark}
                  value={selectedStage}
                  onChange={setSelectedStage}
                  placeholder="Status no Funil"
                  options={[
                    { id: "", name: "Todos os Status" },
                    { id: "NONE", name: "Sem Etapa / Novos" },
                    { id: "SAVED", name: "Salvos no Radar" },
                    { id: "INTERVIEW", name: "Em Entrevista" },
                    { id: "HIRED", name: "Contratados" },
                    { id: "ARCHIVED", name: "Banco de Reserva" },
                  ]}
                />
              </div>
            </div>

            {/* Filter active feedback & count */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
              <span>
                Exibindo <strong>{filteredTalents.length}</strong> de{" "}
                <strong>{talents.length}</strong> candidatos
              </span>

              {(search || selectedArea || selectedAvailability || selectedCity || selectedStage) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedArea("");
                    setSelectedAvailability("");
                    setSelectedCity("");
                    setSelectedStage("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium hover:underline cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>

            {/* Talent Presentation (Grid or Table View) */}
            {filteredTalents.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-2xs">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Nenhum aluno encontrado com esses filtros
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Tente ajustar os termos de busca ou limpar os filtros de turno e área.
                </p>
              </div>
            ) : catalogView === "table" ? (
              /* Enterprise Data Table */
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Candidato</th>
                        <th className="py-3 px-4">Localização &amp; Turno</th>
                        <th className="py-3 px-4">Áreas de Interesse</th>
                        <th className="py-3 px-4">Status no Funil</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTalents.map((talent) => {
                        const cleanPhone = talent.phone ? talent.phone.replace(/\D/g, "") : "";
                        const whatsappUrl = cleanPhone
                          ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                              talent.user.name || "Aluno",
                            )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
                          : null;

                        return (
                          <tr
                            key={talent.id}
                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                            onClick={() => setSelectedTalent(talent)}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {talent.user.avatarUrl ? (
                                  <img
                                    src={talent.user.avatarUrl}
                                    alt={talent.user.name}
                                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                    {talent.user.name?.charAt(0) || "A"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 group-hover:text-amber-700 block truncate max-w-[220px]">
                                    {talent.user.name}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block truncate max-w-[220px]">
                                    {talent.headline || "Jovem Aprendiz / Aluno"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <div className="flex items-center gap-1 font-medium">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{talent.city ? `${talent.city}${talent.state ? `/${talent.state}` : ""}` : "São Paulo/SP"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formatAvailability(talent.availability) || "Flexível"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {talent.areasOfInterest?.slice(0, 2).map((area, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                                  >
                                    {area}
                                  </span>
                                ))}
                                {talent.areasOfInterest && talent.areasOfInterest.length > 2 && (
                                  <span className="text-[10px] text-slate-400 px-1 py-0.5">
                                    +{talent.areasOfInterest.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              {talent.currentStage ? (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border inline-block whitespace-nowrap ${
                                    talent.currentStage === "HIRED"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : talent.currentStage === "INTERVIEW"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : talent.currentStage === "SAVED"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {talent.currentStage === "HIRED"
                                    ? "Contratado"
                                    : talent.currentStage === "INTERVIEW"
                                      ? "Em Entrevista"
                                      : talent.currentStage === "SAVED"
                                        ? "Salvo no Radar"
                                        : "Banco de Reserva"}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQuickMove(talent.id, "SAVED")}
                                  disabled={movingTalent?.id === talent.id}
                                  className="h-6.5 px-2.5 rounded border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-[11px] font-medium text-slate-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Bookmark className="w-3 h-3 text-slate-400" />
                                  <span>Salvar no Radar</span>
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTalent(talent)}
                                  className="h-7 px-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] transition-colors cursor-pointer"
                                >
                                  Ver Perfil
                                </button>

                                {talent.resumeUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadResume(talent)}
                                    className="h-7 px-2 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                                    title="Baixar Currículo PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {whatsappUrl && (
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-7 px-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                                    title="WhatsApp Direto"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Grid View (Clean Enterprise Cards) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTalents.map((talent) => {
                  const cleanPhone = talent.phone
                    ? talent.phone.replace(/\D/g, "")
                    : "";
                  const whatsappUrl = cleanPhone
                    ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                        talent.user.name || "Aluno",
                      )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
                    : null;

                  return (
                    <div
                      key={talent.id}
                      onClick={() => setSelectedTalent(talent)}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        {/* Header: Circular Avatar, Name & Stage Badge */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            {talent.user.avatarUrl ? (
                              <img
                                src={talent.user.avatarUrl}
                                alt={talent.user.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                {talent.user.name?.charAt(0) || "A"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                                {talent.user.name}
                              </h3>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {talent.headline || "Jovem Aprendiz / Aluno"}
                              </p>
                            </div>
                          </div>

                          {/* Stage Pill */}
                          {talent.currentStage && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 whitespace-nowrap ${
                                talent.currentStage === "HIRED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : talent.currentStage === "INTERVIEW"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : talent.currentStage === "SAVED"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {talent.currentStage === "HIRED"
                                ? "Contratado"
                                : talent.currentStage === "INTERVIEW"
                                  ? "Em Entrevista"
                                  : talent.currentStage === "SAVED"
                                    ? "Salvo no Radar"
                                    : "Banco de Reserva"}
                            </span>
                          )}
                        </div>

                        {/* Location & Turno */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2.5 flex-wrap">
                          {talent.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {talent.city}
                              {talent.state ? `/${talent.state}` : ""}
                            </span>
                          )}
                          {talent.availability && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatAvailability(talent.availability)}
                            </span>
                          )}
                        </div>

                        {/* Bio snippet */}
                        {talent.bio && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                            {talent.bio}
                          </p>
                        )}

                        {/* Areas tags */}
                        {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {talent.areasOfInterest.slice(0, 3).map((area, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                              >
                                {area}
                              </span>
                            ))}
                            {talent.areasOfInterest.length > 3 && (
                              <span className="px-1.5 py-0.5 text-[10px] text-slate-400">
                                +{talent.areasOfInterest.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2.5 border-t border-slate-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTalent(talent)}
                            className="flex-1 h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <span>Ver Perfil</span>
                          </button>

                          {talent.resumeUrl && (
                            <button
                              type="button"
                              onClick={() => handleDownloadResume(talent)}
                              className="h-8 px-2 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                              title="Baixar Currículo PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 px-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                              title="Contato via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Quick action: Save to Radar */}
                        {!talent.currentStage && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuickMove(talent.id, "SAVED")}
                              disabled={movingTalent?.id === talent.id}
                              className="flex-1 h-7 px-2 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[11px] font-medium text-slate-600 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {movingTalent?.id === talent.id && movingTalent.stage === "SAVED" ? (
                                <LoadingSpinner size="xs" variant="current" />
                              ) : (
                                <Bookmark className="w-3 h-3 text-slate-400" />
                              )}
                              <span>Salvar no Radar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickMove(talent.id, "INTERVIEW")}
                              disabled={movingTalent?.id === talent.id}
                              className="flex-1 h-7 px-2 rounded border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-[11px] font-medium text-amber-900 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {movingTalent?.id === talent.id && movingTalent.stage === "INTERVIEW" ? (
                                <LoadingSpinner size="xs" variant="current" />
                              ) : (
                                <Users className="w-3 h-3 text-amber-600" />
                              )}
                              <span>Chamar p/ Entrevista</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: PROCESSOS SELETIVOS (KANBAN PIPELINE - GUPY ATS STANDARD) */
          <div className="space-y-4">
            {/* Header info & Kanban Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Funil de Contratação</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {pipelineData?.counts?.total || 0} candidatos em processo
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acompanhe e movimente os candidatos pelas etapas do processo seletivo da sua empresa.
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                {/* Search within pipeline */}
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={pipelineSearch}
                    onChange={(e) => setPipelineSearch(e.target.value)}
                    placeholder="Filtrar candidatos no funil..."
                    className="w-full h-8 pl-8 pr-6 rounded-md border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-white"
                  />
                  {pipelineSearch && (
                    <button
                      type="button"
                      onClick={() => setPipelineSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* View switcher */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPipelineView("kanban")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      pipelineView === "kanban"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Kanban className="w-3.5 h-3.5" />
                    <span>Quadro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPipelineView("list")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      pipelineView === "list"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Lista</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Kanban or List View */}
            {pipelineView === "kanban" ? (
              /* CLICKUP STYLE KANBAN WITH AUTHENTIC @hello-pangea/dnd */
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                  {[
                    {
                      key: "SAVED",
                      title: "TRIAGEM / RADAR",
                      pillBg: "bg-sky-500 text-white",
                      countColor: "text-sky-700",
                      icon: Bookmark,
                      candidates: pipelineData?.pipeline?.SAVED || [],
                    },
                    {
                      key: "INTERVIEW",
                      title: "EM ENTREVISTA",
                      pillBg: "bg-amber-500 text-white",
                      countColor: "text-amber-700",
                      icon: Clock,
                      candidates: pipelineData?.pipeline?.INTERVIEW || [],
                    },
                    {
                      key: "HIRED",
                      title: "CONTRATADOS",
                      pillBg: "bg-emerald-600 text-white",
                      countColor: "text-emerald-700",
                      icon: CheckCircle2,
                      candidates: pipelineData?.pipeline?.HIRED || [],
                    },
                    {
                      key: "ARCHIVED",
                      title: "BANCO DE RESERVA",
                      pillBg: "bg-slate-600 text-white",
                      countColor: "text-slate-700",
                      icon: Archive,
                      candidates: pipelineData?.pipeline?.ARCHIVED || [],
                    },
                  ].map((column) => {
                    const filteredCandidates = column.candidates.filter((item: any) => {
                      if (!pipelineSearch.trim()) return true;
                      const q = pipelineSearch.trim().toLowerCase();
                      const t = item.talent;
                      return (
                        t?.user?.name?.toLowerCase().includes(q) ||
                        t?.headline?.toLowerCase().includes(q) ||
                        t?.city?.toLowerCase().includes(q) ||
                        t?.areasOfInterest?.some((a: string) => a.toLowerCase().includes(q))
                      );
                    });

                    return (
                      <div
                        key={column.key}
                        className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-2.5 flex flex-col min-h-[640px] shadow-2xs"
                      >
                        {/* ClickUp Column Header */}
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200/60 px-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5 shadow-2xs ${column.pillBg}`}
                            >
                              <column.icon className="w-3 h-3" />
                              <span>{column.title}</span>
                            </span>
                            <span className={`text-xs font-bold ${column.countColor}`}>
                              {column.candidates.length}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab("catalog")}
                            className="w-6 h-6 rounded hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Adicionar candidatos"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Droppable Column Body */}
                        <Droppable droppableId={column.key}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="flex flex-col flex-1 min-h-[220px] rounded-lg p-1"
                            >
                              {filteredCandidates.length === 0 ? (
                                <div
                                  className={`h-28 rounded-xl border border-dashed transition-all duration-150 flex flex-col items-center justify-center text-center p-3 pointer-events-none mb-3 ${
                                    snapshot.isDraggingOver
                                      ? "border-slate-300 bg-slate-200/60 text-slate-700"
                                      : "border-slate-200 bg-white/40 text-slate-400"
                                  }`}
                                >
                                  <Users
                                    className={`w-5 h-5 mb-1 ${
                                      snapshot.isDraggingOver
                                        ? "text-slate-600"
                                        : "text-slate-300"
                                    }`}
                                  />
                                  <p
                                    className={`text-xs font-semibold ${
                                      snapshot.isDraggingOver
                                        ? "text-slate-800"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {snapshot.isDraggingOver
                                      ? "Soltar candidato aqui"
                                      : "Nenhum candidato"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {snapshot.isDraggingOver
                                      ? "Mover para esta etapa"
                                      : "Arraste cards para esta etapa"}
                                  </p>
                                </div>
                              ) : null}

                              {filteredCandidates.map((item: any, index: number) => {
                                  const talent = item.talent;
                                  const cleanPhone = talent.phone ? talent.phone.replace(/\D/g, "") : "";
                                  const whatsappUrl = cleanPhone
                                    ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                                        talent.user.name || "Aluno",
                                      )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
                                    : null;

                                  return (
                                    <Draggable
                                      key={talent.id}
                                      draggableId={talent.id}
                                      index={index}
                                    >
                                      {(dragProvided, dragSnapshot) => (
                                        <div
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          {...dragProvided.dragHandleProps}
                                          onClick={() => openTalent(talent, item)}
                                          style={getDraggableCardStyle(
                                            dragProvided.draggableProps.style,
                                            dragSnapshot,
                                          )}
                                          className={`
                                            bg-white rounded-lg border p-3.5 space-y-2.5 select-none transition-shadow cursor-grab active:cursor-grabbing group mb-3
                                            ${
                                              dragSnapshot.isDragging
                                                ? "shadow-2xl border-slate-300 bg-white ring-1 ring-slate-900/10"
                                                : "border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300"
                                            }
                                          `}
                                        >
                                          {/* ClickUp Card Title & Grip */}
                                          <div className="flex items-start gap-2">
                                            <div
                                              className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5"
                                              title="Arraste para mover de etapa"
                                            >
                                              <GripVertical className="w-3.5 h-3.5" />
                                            </div>
                                            {talent.user.avatarUrl ? (
                                              <img
                                                src={talent.user.avatarUrl}
                                                alt={talent.user.name}
                                                className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 mt-0.5"
                                              />
                                            ) : (
                                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0 mt-0.5">
                                                {talent.user.name?.charAt(0) || "A"}
                                              </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                              <h4 className="text-sm font-semibold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
                                                {talent.user.name}
                                              </h4>
                                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                                {talent.headline || "Jovem Aprendiz"}
                                              </p>
                                            </div>
                                          </div>

                                          {/* ClickUp Micro-Metadata Row (Priority Flag + Location + Turno) */}
                                          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                                            {/* Priority Flag */}
                                            {item.stage === "INTERVIEW" ? (
                                              <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                                                <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                <span>Entrevista</span>
                                              </span>
                                            ) : item.stage === "HIRED" ? (
                                              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                                                <Flag className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                                                <span>Contratado</span>
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-slate-500">
                                                <Flag className="w-3 h-3 text-sky-500 fill-sky-500" />
                                                <span>Radar</span>
                                              </span>
                                            )}

                                            {talent.city && (
                                              <span className="inline-flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                <span className="truncate max-w-[105px]">
                                                  {talent.city}
                                                  {talent.state ? `/${talent.state}` : ""}
                                                </span>
                                              </span>
                                            )}

                                            {talent.availability && (
                                              <span className="inline-flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                <span>{formatAvailability(talent.availability)}</span>
                                              </span>
                                            )}
                                          </div>

                                          {/* ClickUp Style Tags (Solid Colored Chips) */}
                                          {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                                              {talent.areasOfInterest.slice(0, 2).map((area: string, idx: number) => {
                                                const bgColors = [
                                                  "bg-indigo-600 text-white",
                                                  "bg-blue-600 text-white",
                                                  "bg-violet-600 text-white",
                                                  "bg-sky-600 text-white",
                                                ];
                                                return (
                                                  <span
                                                    key={idx}
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide shadow-2xs ${
                                                      bgColors[idx % bgColors.length]
                                                    }`}
                                                  >
                                                    {area}
                                                  </span>
                                                );
                                              })}
                                              {talent.areasOfInterest.length > 2 && (
                                                <span className="text-[10px] text-slate-400 px-1 py-0.5">
                                                  +{talent.areasOfInterest.length - 2}
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {/* Recruiter Notes (ClickUp description snippet) */}
                                          {item.notes && (
                                            <div className="bg-amber-50/70 border border-amber-200/70 rounded-md p-2 text-[11px] text-amber-900/90 flex items-start gap-1.5">
                                              <StickyNote className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                                              <p className="line-clamp-2 italic">{item.notes}</p>
                                            </div>
                                          )}

                                          {/* Hired role celebration badge */}
                                          {item.stage === "HIRED" && item.hiredRole && (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-1.5 text-[11px] text-emerald-900 flex items-center gap-1.5 font-medium">
                                              <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                              <span className="truncate">Cargo: {item.hiredRole}</span>
                                            </div>
                                          )}

                                          {/* ClickUp-Style Action Strip (Quick CV & WhatsApp) */}
                                          {(talent.resumeUrl || whatsappUrl) && (
                                            <div
                                              className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5"
                                              onClick={(e) => e.stopPropagation()}
                                              onMouseDown={(e) => e.stopPropagation()}
                                            >
                                              {/* CV Download */}
                                              {talent.resumeUrl && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleDownloadResume(talent)}
                                                  className="h-7 px-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer shrink-0"
                                                  title="Baixar Currículo PDF"
                                                >
                                                  <Download className="w-3 h-3" />
                                                  <span>Currículo</span>
                                                </button>
                                              )}

                                              {/* WhatsApp */}
                                              {whatsappUrl && (
                                                <a
                                                  href={whatsappUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="h-7 px-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer shrink-0"
                                                  title="WhatsApp Direto"
                                                >
                                                  <MessageCircle className="w-3 h-3" />
                                                  <span>WhatsApp</span>
                                                </a>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>

                        {/* ClickUp "+ Adicionar Candidato" Button */}
                        <button
                          type="button"
                          onClick={() => setActiveTab("catalog")}
                          className="mt-2.5 w-full py-1.5 px-3 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 hover:bg-white text-xs font-medium text-slate-400 hover:text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Candidato</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </DragDropContext>
            ) : (
              /* LIST VIEW MODE BY STAGE */
              <div className="space-y-4">
                {/* Stage Filter Tabs */}
                <div className="flex border-b border-slate-200 space-x-6">
                  {[
                    { key: "ALL", label: `Todos (${pipelineData?.counts?.total || 0})` },
                    {
                      key: "SAVED",
                      label: `Triagem / Radar (${pipelineData?.counts?.saved || 0})`,
                    },
                    {
                      key: "INTERVIEW",
                      label: `Em Entrevista (${pipelineData?.counts?.interview || 0})`,
                    },
                    {
                      key: "HIRED",
                      label: `Contratados (${pipelineData?.counts?.hired || 0})`,
                    },
                    {
                      key: "ARCHIVED",
                      label: `Banco de Reserva (${pipelineData?.counts?.archived || 0})`,
                    },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPipelineFilter(item.key as any)}
                      className={`pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                        pipelineFilter === item.key
                          ? "border-amber-600 text-slate-900 font-semibold"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Candidate List Cards */}
                {pipelineCandidates.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-2xs">
                    <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Nenhum candidato nesta etapa
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Navegue pelo Banco de Talentos para adicionar alunos ao seu radar.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pipelineCandidates.map((item: any) => {
                      const talent = item.talent;
                      const cleanPhone = talent.phone ? talent.phone.replace(/\D/g, "") : "";
                      const whatsappUrl = cleanPhone
                        ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                            talent.user.name || "Aluno",
                          )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
                        : null;

                      return (
                        <div
                          key={item.interactionId}
                          onClick={() => openTalent(talent, item)}
                          className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 shadow-2xs transition-all flex flex-col justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div className="flex items-center gap-3 min-w-0">
                                {talent.user.avatarUrl ? (
                                  <img
                                    src={talent.user.avatarUrl}
                                    alt={talent.user.name}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                    {talent.user.name?.charAt(0) || "A"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-700">
                                    {talent.user.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {talent.headline || "Jovem Aprendiz"}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 whitespace-nowrap ${
                                  item.stage === "HIRED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : item.stage === "INTERVIEW"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : item.stage === "SAVED"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {item.stage === "HIRED"
                                  ? "Contratado"
                                  : item.stage === "INTERVIEW"
                                    ? "Em Entrevista"
                                    : item.stage === "SAVED"
                                      ? "Salvo no Radar"
                                      : "Banco de Reserva"}
                              </span>
                            </div>

                            {item.stage === "HIRED" && item.hiredRole && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 mb-2 text-xs text-emerald-900 flex items-center gap-1.5 font-medium">
                                <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Cargo: <strong>{item.hiredRole}</strong></span>
                              </div>
                            )}

                            {item.notes ? (
                              <div className="bg-slate-50 rounded p-2 border border-slate-200 text-xs text-slate-600 mb-2 leading-relaxed">
                                <span className="font-semibold text-slate-500 block mb-0.5 text-[10px] uppercase tracking-wider">
                                  Anotação Interna:
                                </span>
                                {item.notes}
                              </div>
                            ) : null}

                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
                              {talent.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {talent.city}
                                </span>
                              )}
                              {talent.availability && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {formatAvailability(talent.availability)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => openTalent(talent, item)}
                              className="flex-1 h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors flex items-center justify-center cursor-pointer"
                            >
                              Gerenciar Candidato
                            </button>

                            {talent.resumeUrl && (
                              <button
                                type="button"
                                onClick={() => handleDownloadResume(talent)}
                                className="h-8 px-2 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                                title="Baixar Currículo"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 px-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                                title="Conversar no WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Talent Full Details Modal */}
      {selectedTalent && (
        <CompanyTalentModal
          talent={selectedTalent}
          onClose={() => {
            setSelectedTalent(null);
            Promise.all([
              api.get("/company/pipeline"),
              api.get("/company/talents"),
            ])
              .then(([pipeRes, talentsRes]) => {
                if (pipeRes.data)
                  setPipelineData(applyOrderToPipeline(pipeRes.data));
                if (talentsRes.data) setTalents(talentsRes.data);
              })
              .catch(() => {});
          }}
          onStageChange={handleStageChange}
        />
      )}
    </div>
  );
}
