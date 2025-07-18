const { useState, useEffect } = React;

// Define a ordem correta e fixa das colunas da tabela.
const TABLE_HEADERS = [
    "Nº",
    "Data Leitura",
    "Leitura",
    "Referência",
    "Consumo(kWh)",
    "Vencimento",
    "Tipo",
    "Valor",
    "Pagamento",
];

const ConsumerUnitHistory = ({ uc, clientId, userId, onClose }) => {
    const [historyText, setHistoryText] = useState('');
    const [parsedHistory, setParsedHistory] = useState(uc.history || []);
    const [isSaving, setIsSaving] = useState(false);

    const parseNumber = (numStr) => {
        if (!numStr) return 0;
        let sanitized = numStr.replace(',', '.');
        sanitized = sanitized.replace(/\.(?=.*\.)/g, '');
        return parseFloat(sanitized) || 0;
    };
    
    // Função para processar o texto colado
    const parseHistoryText = (text) => {
        const cleanedText = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
        const regex = /(\d+)\s*(\d{2}\/\d{2}\/\d{4})\s*(\d+)\s*(\d{1,2}\/\d{4})\s*([\d.,]+)\s*(\d{2}\/\d{2}\/\d{4})\s*([a-zA-Z]+)\s*([\d.,]+)\s*(EM ABERTO|\d{2}\/\d{2}\/\d{4})/g;
        
        const entries = [];
        const seen = new Set();
        let match;

        while ((match = regex.exec(cleanedText)) !== null) {
            const consumo = parseNumber(match[5]);
            const valor = parseNumber(match[8]);
            const referencia = match[4];
            
            const uniqueKey = `${referencia}-${consumo}-${valor}`;

            if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey);
                
                entries.push({
                    "Nº": match[1],
                    "Data Leitura": match[2],
                    "Leitura": match[3],
                    "Referência": referencia,
                    "Consumo(kWh)": consumo,
                    "Vencimento": match[6],
                    "Tipo": match[7],
                    "Valor": valor,
                    "Pagamento": match[9].trim(),
                });
            }
        }
        return entries;
    };

    const handleProcessText = () => {
        const parsed = parseHistoryText(historyText);
        if (parsed.length > 0) {
            const sorted = parsed.sort((a, b) => {
                const [dayA, monthA, yearA] = a["Data Leitura"].split('/');
                const [dayB, monthB, yearB] = b["Data Leitura"].split('/');
                const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
                const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
                return dateB - dateA;
            });
            setParsedHistory(sorted);
        } else {
            alert("Não foi possível extrair dados do texto. Verifique o formato do texto colado.");
        }
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const { getFirestore, doc, updateDoc } = window.firebase;
            const db = getFirestore();
            const ucRef = doc(db, `solar-clients/${clientId}/consumerUnits`, uc.id);
            await updateDoc(ucRef, { history: parsedHistory });
            alert('Histórico salvo com sucesso!');
            onClose();
        } catch (error) {
            console.error("Erro ao salvar histórico:", error);
            alert('Falha ao salvar o histórico. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };
    
    useEffect(() => {
        if (uc.history && uc.history.length > 0) {
            setParsedHistory(uc.history);
        }
    }, [uc.history]);

    // NOVO: Efeito para bloquear scroll da página quando modal está aberto
    useEffect(() => {
        // Bloquear scroll da página
        document.body.style.overflow = 'hidden';
        
        // Cleanup: restaurar scroll quando componente é desmontado
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // CORRIGIDO: Função para lidar com fechamento e limpeza
    const handleClose = () => {
        setHistoryText('');
        setIsSaving(false);
        // Restaurar scroll da página
        document.body.style.overflow = 'unset';
        onClose();
    };

    // CORRIGIDO: Prevenir fechamento quando clica no modal
    const handleModalClick = (e) => {
        e.stopPropagation();
    };

    // NOVO: Estilos inline para garantir cobertura completa
    const modalBackdropStyles = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000000,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem'
    };

    return (
        <div 
            style={modalBackdropStyles}
            onClick={handleClose}
        >
            <div 
                className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                style={{ maxHeight: 'calc(100vh - 2rem)' }}
                onClick={handleModalClick}
            >
                <div className="p-5 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cole os dados do histórico aqui:
                        </label>
                        <textarea
                            className="w-full h-24 p-2 border border-gray-300 rounded-md font-mono"
                            placeholder="Cole o texto completo da sua tabela de faturas aqui..."
                            value={historyText}
                            onChange={(e) => setHistoryText(e.target.value)}
                            autoComplete="off"
                        />
                        <button 
                            onClick={handleProcessText} 
                            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            disabled={!historyText.trim()}
                        >
                            Processar Texto
                        </button>
                    </div>

                    {parsedHistory.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Pré-visualização da Tabela</h4>
                            <div className="overflow-x-auto border rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {TABLE_HEADERS.map(header => (
                                                <th 
                                                    key={header} 
                                                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                >
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {parsedHistory.map((row, index) => (
                                            <tr key={index}>
                                                {TABLE_HEADERS.map(header => (
                                                    <td 
                                                        key={`${index}-${header}`} 
                                                        className="px-4 py-2 whitespace-nowrap text-sm text-gray-700"
                                                    >
                                                        {typeof row[header] === 'number' ? 
                                                            row[header].toFixed(2) : 
                                                            row[header]
                                                        }
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-5 border-t flex justify-end gap-3">
                    <button 
                        onClick={handleClose} 
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                        disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSaveChanges}
                        disabled={isSaving || parsedHistory.length === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Histórico'}
                    </button>
                </div>
            </div>
        </div>
    );
};
