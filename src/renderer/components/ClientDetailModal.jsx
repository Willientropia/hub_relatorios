const { useState, useEffect, useMemo, useCallback } = React;

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

const ClientDetailModal = ({ client, onClose, userId }) => {
    // --- ESTADOS DO COMPONENTE ---
    const [saving, setSaving] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(client.status || 'expired');
    const [reportSent, setReportSent] = useState(client.reportSent || false); // NOVO ESTADO
    const [consumerUnits, setConsumerUnits] = useState([]);
    const [loadingUCs, setLoadingUCs] = useState(true);
    const [newUcName, setNewUcName] = useState('');
    const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
    
    // Estado para controlar a geração do relatório
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // --- EFEITOS (LIFECYCLE) ---
    useEffect(() => {
        setSelectedStatus(client.status || 'expired');
        setReportSent(client.reportSent || false); // NOVO
    }, [client]);

    useEffect(() => {
        const { getFirestore, collection, query, onSnapshot } = window.firebase;
        const db = getFirestore();
        const ucQuery = query(collection(db, `solar-clients/${client.id}/consumerUnits`));
        const unsubscribe = onSnapshot(ucQuery, (snapshot) => {
            const ucData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setConsumerUnits(ucData);
            setLoadingUCs(false);
        }, (error) => {
            console.error("Erro ao buscar UCs:", error);
            setLoadingUCs(false);
        });
        return () => unsubscribe();
    }, [client.id, userId]);

    // --- FUNÇÕES DE MANIPULAÇÃO ---
    const handleAddConsumerUnit = async () => {
        if (!newUcName.trim()) return;
        const { getFirestore, collection, addDoc, serverTimestamp } = window.firebase;
        const db = getFirestore();
        const ucRef = collection(db, `solar-clients/${client.id}/consumerUnits`);
        await addDoc(ucRef, { name: newUcName.trim(), balanceKWH: 0, history: [], createdAt: serverTimestamp() });
        setNewUcName('');
    };
    
    const handleDeleteConsumerUnit = async (ucId) => {
        if (!confirm('Tem certeza?')) return;
        const { getFirestore, doc, deleteDoc } = window.firebase;
        const db = getFirestore();
        await deleteDoc(doc(db, `solar-clients/${client.id}/consumerUnits`, ucId));
    };

    const debouncedUpdateBalance = useCallback(debounce(async (ucId, balanceToSave) => {
        const { getFirestore, doc, updateDoc } = window.firebase;
        const db = getFirestore();
       await updateDoc(doc(db, `solar-clients/${client.id}/consumerUnits`, ucId), { balanceKWH: parseFloat(balanceToSave) || 0 });
    }, 1000), [userId, client.id]);

    const handleBalanceChange = (ucId, value) => {
        setConsumerUnits(prevUnits => prevUnits.map(unit => unit.id === ucId ? { ...unit, balanceKWH: value } : unit));
        debouncedUpdateBalance(ucId, value);
    };
    
    // ATUALIZADO: Agora salva tanto status quanto reportSent
    const handleUpdateStatus = async () => {
        if (!selectedStatus) return;
        setSaving(true);
        
        try {
            const { getFirestore, doc, updateDoc, serverTimestamp } = window.firebase;
            const db = getFirestore();
            
            // Atualizar tanto o status quanto o reportSent
            await updateDoc(doc(db, 'solar-clients', client.id), { 
                status: selectedStatus,
                reportSent: reportSent,
                updatedAt: serverTimestamp()
            });
            
            // Adicionar ao histórico
            const { collection, addDoc } = window.firebase;
            const historyRef = collection(db, `solar-clients/${client.id}/history`);
            await addDoc(historyRef, {
                event: `Status alterado para: ${selectedStatus}${reportSent ? ' (Relatório enviado)' : ''}`,
                timestamp: serverTimestamp()
            });
            
            alert('Status atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert('Erro ao atualizar status. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const canGenerateReport = useMemo(() => {
        if (!consumerUnits || consumerUnits.length === 0) return false;
        return consumerUnits.every(uc => parseFloat(uc.balanceKWH) > 0 && uc.history && uc.history.length > 0);
    }, [consumerUnits]);

    const handleGenerateReport = () => {
        setIsGeneratingReport(true);
    };
    
    const handleReportGenerated = () => {
        setIsGeneratingReport(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-full overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">
                            {client.clientNumber ? `${client.clientNumber} - ` : ''}{client.name}
                            {/* NOVO: Indicador visual se tem relatório enviado */}
                            {client.reportSent && (
                                <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    📄 Relatório Enviado
                                </span>
                            )}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                    </div>
                    
                    {/* ATUALIZADO: Seção de gerenciamento de status */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Gerenciar Status</h3>
                        
                        <div className="space-y-4">
                            {/* Seletor de Status */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
                                    <select 
                                        value={selectedStatus} 
                                        onChange={(e) => setSelectedStatus(e.target.value)} 
                                        className="w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="active">Em Garantia</option>
                                        <option value="expired">Expirada</option>
                                        <option value="monitoring">Monitoramento</option>
                                        <option value="recurring_maintenance">Manutenção</option>
                                        <option value="om_complete">O&M Completo</option>
                                    </select>
                                </div>
                                
                                {/* NOVO: Checkbox para relatório enviado */}
                                <div className="flex items-center">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={reportSent}
                                            onChange={(e) => setReportSent(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm font-medium text-gray-700">
                                            📄 Relatório enviado
                                        </span>
                                    </label>
                                </div>
                            </div>
                            
                            {/* Botão de salvar */}
                            <div className="flex justify-end">
                                <button 
                                    onClick={handleUpdateStatus} 
                                    disabled={saving} 
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-gray-400"
                                >
                                    {saving ? 'Salvando...' : 'Atualizar Status'}
                                </button>
                            </div>
                            
                            {/* NOVO: Explicação sobre o relatório enviado */}
                            {reportSent && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-sm text-blue-800">
                                        ✅ <strong>Relatório enviado:</strong> Indica que a usina foi entregue ao cliente. 
                                        Este cliente aparecerá nos filtros de "Relatório Enviado".
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">Unidades Consumidoras</h3>
                        <div className="flex gap-2 p-2 bg-gray-50 rounded-md">
                            <input 
                                type="text" 
                                value={newUcName} 
                                onChange={(e) => setNewUcName(e.target.value)} 
                                placeholder="Nome da nova Unidade Consumidora" 
                                className="flex-1 p-2 border border-gray-300 rounded-md"
                            />
                            <button 
                                onClick={handleAddConsumerUnit} 
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Adicionar
                            </button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left text-sm font-semibold text-gray-600">Nome da UC</th>
                                        <th className="p-3 text-left text-sm font-semibold text-gray-600">Saldo (kWh)</th>
                                        <th className="p-3 text-left text-sm font-semibold text-gray-600">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loadingUCs && (
                                        <tr>
                                            <td colSpan="3" className="p-4 text-center">Carregando...</td>
                                        </tr>
                                    )}
                                    {!loadingUCs && consumerUnits.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="p-4 text-center text-gray-500">
                                                Nenhuma unidade consumidora adicionada.
                                            </td>
                                        </tr>
                                    )}
                                    {consumerUnits.map(uc => (
                                        <tr key={uc.id}>
                                            <td className="p-3">{uc.name}</td>
                                            <td className="p-3">
                                                <input 
                                                    type="number" 
                                                    value={uc.balanceKWH} 
                                                    onChange={(e) => handleBalanceChange(uc.id, e.target.value)} 
                                                    className="w-32 p-1 border border-gray-300 rounded-md"
                                                />
                                            </td>
                                            <td className="p-3 flex gap-2">
                                                <button 
                                                    onClick={() => setViewingHistoryFor(uc)} 
                                                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                                >
                                                    Histórico
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteConsumerUnit(uc.id)} 
                                                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                                                >
                                                    Apagar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleGenerateReport} 
                                disabled={!canGenerateReport || isGeneratingReport} 
                                className="px-6 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-gray-400" 
                                title={!canGenerateReport ? "Preencha saldo e histórico de todas as UCs" : ""}
                            >
                                {isGeneratingReport ? 'Gerando PDF...' : 'Gerar Relatório'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {viewingHistoryFor && (
                <ConsumerUnitHistory 
                    uc={viewingHistoryFor} 
                    clientId={client.id} 
                    userId={userId} 
                    onClose={() => setViewingHistoryFor(null)}
                />
            )}
            
            {isGeneratingReport && (
                <Report 
                    client={client} 
                    consumerUnits={consumerUnits} 
                    onReportGenerated={handleReportGenerated} 
                />
            )}
        </div>
    );
};

window.ClientDetailModal = ClientDetailModal;