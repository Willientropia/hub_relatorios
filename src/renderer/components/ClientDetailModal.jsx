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
    // --- ESTADOS GERAIS ---
    const [isEditing, setIsEditing] = useState(false);
    const [viewingHistoryFor, setViewingHistoryFor] = useState(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // --- ESTADOS DA VIEW DE DETALHES ---
    const [saving, setSaving] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(client.status || 'expired');
    const [reportSent, setReportSent] = useState(client.reportSent || false);
    const [consumerUnits, setConsumerUnits] = useState([]);
    const [loadingUCs, setLoadingUCs] = useState(true);
    const [newUcName, setNewUcName] = useState('');

    // --- ESTADOS DA VIEW DE EDIÇÃO ---
    const [formData, setFormData] = useState({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');

    // --- EFEITOS ---
    useEffect(() => {
        setSelectedStatus(client.status || 'expired');
        setReportSent(client.reportSent || false);
        setFormData({
            clientNumber: client.clientNumber || '',
            name: client.name || '',
            address: client.address || '',
            installDate: client.installDate || '',
            panels: client.panels || 0,
            power: String(client.power || '0').replace('.', ','),
        });
    }, [client]);

    useEffect(() => {
        if (isEditing) return; // Não carrega UCs enquanto edita
        const { getFirestore, collection, query, onSnapshot } = window.firebase;
        const db = getFirestore();
        const ucQuery = query(collection(db, `solar-clients/${client.id}/consumerUnits`));
        const unsubscribe = onSnapshot(ucQuery, (snapshot) => {
            setConsumerUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingUCs(false);
        }, (error) => {
            console.error("Erro ao buscar UCs:", error);
            setLoadingUCs(false);
        });
        return () => unsubscribe();
    }, [client.id, isEditing]);

    // --- FUNÇÕES DA VIEW DE DETALHES ---
    const handleAddConsumerUnit = async () => {
        if (!newUcName.trim()) return;
        const { getFirestore, collection, addDoc, serverTimestamp } = window.firebase;
        const db = getFirestore();
        await addDoc(collection(db, `solar-clients/${client.id}/consumerUnits`), { name: newUcName.trim(), balanceKWH: 0, history: [], createdAt: serverTimestamp() });
        setNewUcName('');
    };
    
    const handleDeleteConsumerUnit = async (ucId) => {
        if (!confirm('Tem certeza?')) return;
        const { getFirestore, doc, deleteDoc } = window.firebase;
        const db = getFirestore();
        await deleteDoc(doc(db, `solar-clients/${client.id}/consumerUnits`, ucId));
    };

    const debouncedUpdateBalance = useCallback(debounce(async (ucId, balance) => {
        const { getFirestore, doc, updateDoc } = window.firebase;
        const db = getFirestore();
        await updateDoc(doc(db, `solar-clients/${client.id}/consumerUnits`, ucId), { balanceKWH: parseFloat(balance) || 0 });
    }, 1000), [client.id]);

    const handleBalanceChange = (ucId, value) => {
        setConsumerUnits(prev => prev.map(unit => unit.id === ucId ? { ...unit, balanceKWH: value } : unit));
        debouncedUpdateBalance(ucId, value);
    };
    
    const handleUpdateStatus = async () => {
        setSaving(true);
        try {
            const { getFirestore, doc, updateDoc, collection, addDoc, serverTimestamp } = window.firebase;
            const db = getFirestore();
            await updateDoc(doc(db, 'solar-clients', client.id), { status: selectedStatus, reportSent, updatedAt: serverTimestamp() });
            await addDoc(collection(db, `solar-clients/${client.id}/history`), { event: `Status alterado para: ${selectedStatus}${reportSent ? ' (Relatório enviado)' : ''}`, timestamp: serverTimestamp() });
            alert('Status atualizado com sucesso!');
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert('Erro ao atualizar o status.');
        } finally {
            setSaving(false);
        }
    };

    const canGenerateReport = useMemo(() => consumerUnits.length > 0 && consumerUnits.every(uc => parseFloat(uc.balanceKWH) > 0 && uc.history?.length > 0), [consumerUnits]);

    // --- FUNÇÕES DA VIEW DE EDIÇÃO ---
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveEdits = async () => {
        if (!formData.name || !formData.clientNumber) {
            setEditError('O número e o nome do cliente são obrigatórios.');
            return;
        }
        setIsSavingEdit(true);
        setEditError('');

        try {
            const { getFirestore, doc, updateDoc, serverTimestamp, collection, addDoc } = window.firebase;
            const db = getFirestore();
            const clientRef = doc(db, 'solar-clients', client.id);
            const powerAsNumber = parseFloat(String(formData.power).replace(',', '.')) || 0;
            
            await updateDoc(clientRef, {
                clientNumber: formData.clientNumber,
                name: formData.name,
                address: formData.address,
                installDate: formData.installDate,
                panels: Number(formData.panels) || 0,
                power: powerAsNumber,
                updatedAt: serverTimestamp()
            });

            const historyRef = collection(db, `solar-clients/${client.id}/history`);
            await addDoc(historyRef, { event: 'Dados do cliente atualizados.', timestamp: serverTimestamp() });
            
            alert('Cliente atualizado com sucesso!');
            setIsEditing(false);
        } catch (err) {
            console.error("Erro ao atualizar cliente:", err);
            setEditError('Falha ao salvar as alterações. Tente novamente.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-full flex flex-col">
                    <div className="p-6 border-b flex justify-between items-start">
                        <div>
                             <h2 className="text-xl font-bold text-gray-900">
                                {isEditing ? 'Editar Cliente' : `${client.clientNumber ? `${client.clientNumber} - ` : ''}${client.name}`}
                            </h2>
                            {!isEditing && client.reportSent && (
                                <span className="mt-1 inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    📄 Relatório Enviado
                                </span>
                            )}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none -mt-1 -mr-2 p-1">&times;</button>
                    </div>

                    {isEditing ? (
                        <>
                            <div className="p-6 space-y-4 overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nº do Cliente</label>
                                    <input type="text" name="clientNumber" value={formData.clientNumber} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Endereço</label>
                                    <input type="text" name="address" value={formData.address} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Data de Instalação (DD/MM/AAAA)</label>
                                    <input type="text" name="installDate" value={formData.installDate} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700">Nº de Placas</label>
                                    <input type="number" name="panels" value={formData.panels} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Potência (kWp)</label>
                                    <input type="text" name="power" value={formData.power} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Ex: 4,55"/>
                                </div>
                                {editError && <p className="text-red-500 mt-2 text-sm">{editError}</p>}
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg border-t">
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</button>
                                <button onClick={handleSaveEdits} disabled={isSavingEdit} className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-gray-400">
                                    {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="p-6 overflow-y-auto">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="mb-6 px-3 py-1 bg-gray-200 text-gray-800 text-sm font-semibold rounded-md hover:bg-gray-300"
                            >
                                ✏️ Editar Dados do Cliente
                            </button>
                             
                             <div className="mb-6 p-4 bg-gray-50 rounded-md">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Gerenciar Status</h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
                                            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                                                <option value="active">Em Garantia</option>
                                                <option value="expired">Expirada</option>
                                                <option value="monitoring">Monitoramento</option>
                                                <option value="recurring_maintenance">Manutenção</option>
                                                <option value="om_complete">O&M Completo</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center">
                                            <label className="flex items-center cursor-pointer">
                                                <input type="checkbox" checked={reportSent} onChange={(e) => setReportSent(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                                                <span className="ml-2 text-sm font-medium text-gray-700">📄 Relatório enviado</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={handleUpdateStatus} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-gray-400">
                                            {saving ? 'Salvando...' : 'Atualizar Status'}
                                        </button>
                                    </div>
                                </div>
                             </div>
                             
                             <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800">Unidades Consumidoras</h3>
                                <div className="flex gap-2 p-2 bg-gray-50 rounded-md">
                                    <input type="text" value={newUcName} onChange={(e) => setNewUcName(e.target.value)} placeholder="Nome da nova Unidade Consumidora" className="flex-1 p-2 border border-gray-300 rounded-md" />
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
                                            {loadingUCs && (<tr><td colSpan="3" className="p-4 text-center">Carregando...</td></tr>)}
                                            {!loadingUCs && consumerUnits.length === 0 && (<tr><td colSpan="3" className="p-4 text-center text-gray-500">Nenhuma unidade consumidora adicionada.</td></tr>)}
                                            {consumerUnits.map(uc => (
                                                <tr key={uc.id}>
                                                    <td className="p-3">{uc.name}</td>
                                                    <td className="p-3"><input type="number" value={uc.balanceKWH} onChange={(e) => handleBalanceChange(uc.id, e.target.value)} className="w-32 p-1 border border-gray-300 rounded-md" /></td>
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
                                    <button onClick={() => setIsGeneratingReport(true)} disabled={!canGenerateReport || isGeneratingReport} className="px-6 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-gray-400" title={!canGenerateReport ? "Preencha saldo e histórico de todas as UCs" : ""}>
                                        {isGeneratingReport ? 'Gerando PDF...' : 'Gerar Relatório'}
                                    </button>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {viewingHistoryFor && <ConsumerUnitHistory uc={viewingHistoryFor} clientId={client.id} userId={userId} onClose={() => setViewingHistoryFor(null)} />}
            {isGeneratingReport && <Report client={client} consumerUnits={consumerUnits} onReportGenerated={() => setIsGeneratingReport(false)} />}
        </>
    );
};

window.ClientDetailModal = ClientDetailModal;