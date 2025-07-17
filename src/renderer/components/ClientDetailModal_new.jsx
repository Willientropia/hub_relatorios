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
    const [consumerUnits, setConsumerUnits] = useState([]);
    const [loadingUCs, setLoadingUCs] = useState(true);
    const [newUcName, setNewUcName] = useState('');
    const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
    
    // NOVO: Estado para controlar a geração do relatório
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // --- EFEITOS (LIFECYCLE) ---
    useEffect(() => {
        setSelectedStatus(client.status || 'expired');
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
    
    const handleUpdateStatus = async () => {
        if (!selectedStatus) return;
        setSaving(true);
        const { getFirestore, doc, updateDoc } = window.firebase;
        const db = getFirestore();
        await updateDoc(doc(db, 'solar-clients', client.id), { status: selectedStatus });
        setSaving(false);
        alert('Status atualizado!');
    };

    const canGenerateReport = useMemo(() => {
        if (!consumerUnits || consumerUnits.length === 0) return false;
        return consumerUnits.every(uc => parseFloat(uc.balanceKWH) > 0 && uc.history && uc.history.length > 0);
    }, [consumerUnits]);

    // ALTERADO: Apenas ativa o modo de geração
    const handleGenerateReport = () => {
        setIsGeneratingReport(true);
    };
    
    // NOVO: Função chamada pelo componente Report quando o PDF é gerado
    const handleReportGenerated = () => {
        setIsGeneratingReport(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-full overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">{client.clientNumber ? `${client.clientNumber} - ` : ''}{client.name}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                    </div>
                    <div className="mb-6 p-4 bg-gray-50 rounded-md">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Gerenciar Status</h3>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="flex-1 p-2 border border-gray-300 rounded-md">
                                <option value="expired">Vencido</option>
                                <option value="report_sent">Enviado Relatório</option>
                                <option value="om_sold">Vendido O&M</option>
                            </select>
                            <button onClick={handleUpdateStatus} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-gray-400">
                                {saving ? 'Salvando...' : 'Atualizar Status'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800">Unidades Consumidoras</h3>
                        <div className="flex gap-2 p-2 bg-gray-50 rounded-md">
                            <input type="text" value={newUcName} onChange={(e) => setNewUcName(e.target.value)} placeholder="Nome da nova Unidade Consumidora" className="flex-1 p-2 border border-gray-300 rounded-md"/>
                            <button onClick={handleAddConsumerUnit} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Adicionar</button>
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
                                    {loadingUCs && <tr><td colSpan="3" className="p-4 text-center">Carregando...</td></tr>}
                                    {!loadingUCs && consumerUnits.length === 0 && <tr><td colSpan="3" className="p-4 text-center text-gray-500">Nenhuma unidade consumidora adicionada.</td></tr>}
                                    {consumerUnits.map(uc => (
                                        <tr key={uc.id}>
                                            <td className="p-3">{uc.name}</td>
                                            <td className="p-3">
                                                <input type="number" value={uc.balanceKWH} onChange={(e) => handleBalanceChange(uc.id, e.target.value)} className="w-32 p-1 border border-gray-300 rounded-md"/>
                                            </td>
                                            <td className="p-3 flex gap-2">
                                                <button onClick={() => setViewingHistoryFor(uc)} className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200">Histórico</button>
                                                <button onClick={() => handleDeleteConsumerUnit(uc.id)} className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200">Apagar</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleGenerateReport} disabled={!canGenerateReport || isGeneratingReport} className="px-6 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-gray-400" title={!canGenerateReport ? "Preencha saldo e histórico de todas as UCs" : ""}>
                                {isGeneratingReport ? 'Gerando PDF...' : 'Gerar Relatório'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {viewingHistoryFor && <ConsumerUnitHistory uc={viewingHistoryFor} clientId={client.id} userId={userId} onClose={() => setViewingHistoryFor(null)}/>}
            
            {/* NOVO: Renderização condicional do componente de relatório */}
            {isGeneratingReport && <Report client={client} consumerUnits={consumerUnits} onReportGenerated={handleReportGenerated} />}
        </div>
    );
};

window.ClientDetailModal = ClientDetailModal;
