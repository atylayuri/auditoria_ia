/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Copy, FileText, Check, AlertCircle, RefreshCw, Trash2, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ServiceOrder {
  id: string;
  fechamento: string;
  cliente: string;
  assunto: string;
}

const KNOWN_SUBJECTS = [
  "SEM CONEXÃO",
  "RETIRADA",
  "MUDANÇA DE ENDEREÇO",
  "INSTALAÇÃO",
  "LENTIDÃO",
  "VISTORIA",
  "ROTEADOR ADICIONAL (WIFI PREMIUM)",
  "MUDANÇA DE SENHA WI-FI",
  "MUDANÇA DE PLANO C/ ROTEADOR (COMODATO)",
  "TROCA DE EQUIPAMENTO",
  "MUDANÇA DE CÔMODO",
  "TROCA DE EQUIPAMENTO (ONT)",
  "CONFIGURAÇÃO DE ROTEADOR",
  "REPARO BACKHUAL",
  "EXPANSÃO BACKHUAL",
  "RAMIFICAÇÃO",
  "REPARO BACKBONE"
];

export default function App() {
  const [rawData, setRawData] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedOrders = useMemo(() => {
    if (!rawData.trim()) return [];
    
    setError(null);
    const lines = rawData.split("\n");
    const results: ServiceOrder[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      // Skip headers or non-OS lines
      if (!trimmed || !/^\d{5,}/.test(trimmed)) return;

      const tokens = trimmed.split(/\s+/);
      
      // Standard IXC row should have at least:
      // OS, Abertura(Date, Time), Agendamento(Date, Time), Fechamento(Date, Time), ... , Status
      if (tokens.length < 8) return;

      const id = tokens[0];
      const fechamentoDate = tokens[5]; // index 5 is the date of fechamento
      
      // The rest is Cliente + Assunto + Status
      // Status is the last one
      const status = tokens[tokens.length - 1];
      if (status !== "Finalizado") return;

      const middlePart = tokens.slice(7, tokens.length - 1);
      const middleString = middlePart.join(" ");

      // Detect Subject
      let detectedSubject = "";
      let detectedCliente = middleString;

      // Iterate from the longest known subjects to shortest to avoid partial matches
      const sortedSubjects = [...KNOWN_SUBJECTS].sort((a, b) => b.length - a.length);
      
      for (const subject of sortedSubjects) {
        if (middleString.endsWith(subject)) {
          detectedSubject = subject;
          detectedCliente = middleString.slice(0, middleString.length - subject.length).trim();
          break;
        }
      }

      // If no known subject detected, try to guess (usually uppercase words at the end)
      if (!detectedSubject) {
        // This is a fallback
        detectedSubject = "N/A";
      }

      results.push({
        id,
        fechamento: fechamentoDate,
        cliente: detectedCliente,
        assunto: detectedSubject,
      });
    });

    if (rawData.trim() && results.length === 0) {
      setError("Nenhuma ordem de serviço válida encontrada. Verifique o formato do texto.");
    }

    return results;
  }, [rawData]);

  const outputString = useMemo(() => {
    return parsedOrders
      .map((order) => `${order.id}; ; ${order.fechamento}; ${order.cliente}; ${order.assunto}`)
      .join("\n");
  }, [parsedOrders]);

  const handleCopy = () => {
    navigator.clipboard.writeText(outputString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([outputString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "os_organizada.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearData = () => {
    setRawData("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-indigo-600 text-white rounded-2xl mb-6 shadow-xl shadow-indigo-100"
          >
            <FileText className="w-8 h-8" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl"
          >
            Organizador de OS
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto"
          >
            Cole o relatório bruto do IXCSoft abaixo para estruturar os dados conforme a sequência solicitada.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Input Area */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <label htmlFor="rawInput" className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Dados Originais
              </label>
              <button 
                onClick={clearData}
                disabled={!rawData}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors disabled:opacity-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>
            
            <div className="relative group">
              <textarea
                id="rawInput"
                className="w-full h-[500px] p-6 bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-400 outline-none transition-all resize-none font-mono text-sm leading-relaxed text-slate-700 placeholder:text-slate-300 scrollbar-thin scrollbar-thumb-slate-200"
                placeholder="Cole aqui o texto do relatório..."
                value={rawData}
                onChange={(e) => setRawData(e.target.value)}
              />
              {!rawData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">Aguardando dados...</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm italic"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </motion.div>

          {/* Output Area */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <label className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Pré-visualização e Exportação
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={parsedOrders.length === 0}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
                  title="Baixar CSV"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCopy}
                  disabled={parsedOrders.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-slate-900 text-white font-semibold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar Resultado
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="w-full h-[500px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="absolute inset-0 overflow-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
                <AnimatePresence mode="popLayout">
                  {parsedOrders.length > 0 ? (
                    <motion.div 
                      key="table"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-1"
                    >
                      <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800">OS</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800">Fechamento</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800">Cliente</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-800">Assunto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {parsedOrders.map((order, idx) => (
                            <motion.tr 
                              key={`${order.id}-${idx}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                              className="group hover:bg-slate-800/50 transition-colors"
                            >
                              <td className="px-6 py-4 text-indigo-400 font-mono text-sm">{order.id}</td>
                              <td className="px-6 py-4 text-slate-300 font-mono text-sm">{order.fechamento}</td>
                              <td className="px-6 py-4 text-slate-100 font-medium text-sm">{order.cliente}</td>
                              <td className="px-6 py-4 text-slate-400 text-xs">
                                <span className="px-2 py-1 bg-slate-800 rounded-md group-hover:bg-indigo-900/30 group-hover:text-indigo-300 transition-colors">
                                  {order.assunto}
                                </span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-slate-500 p-8"
                    >
                      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="font-medium">O resultado aparecerá aqui</p>
                      <p className="text-xs opacity-60 mt-2 text-center max-w-[200px]">
                        As colunas serão separadas por ponto e vírgula (;) conforme solicitado.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="px-2 text-[10px] text-slate-400 flex justify-between">
              <span>Total: {parsedOrders.length} registros</span>
              <span>Formato: Ordem; ; Fechamento; Cliente; Assunto</span>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <footer className="py-8 border-t border-slate-200 mt-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm font-medium">
            Desenvolvido para otimização de workflow operacional
          </p>
        </div>
      </footer>
    </div>
  );
}
