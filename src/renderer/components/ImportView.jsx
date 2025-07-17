const { useState } = React;

const ImportView = ({ userId, setActiveTab }) => {
    const [fileName, setFileName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [processedCount, setProcessedCount] = useState(0);

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setIsProcessing(true);
        setError('');
        setSuccess('');
        setProcessedCount(0);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                    header: ["id_col", "installDate", "name", "address", "panels", "power"],
                    range: 1 
                });

                const { getFirestore, collection, addDoc, setDoc, doc, serverTimestamp, query, where, getDocs } = window.firebase;
                const db = getFirestore();
                
                let successCount = 0;
                let errorCount = 0;
                
                for (const row of jsonData) {
                    try {
                        // Validar e converter datas do Excel
                        let installDateStr = '';
                        
                        if (row.installDate) {
                            // Se for um número serial do Excel, converter para data
                            if (typeof row.installDate === 'number') {
                                const excelDate = new Date((row.installDate - 25569) * 86400 * 1000);
                                if (!isNaN(excelDate.getTime())) {
                                    installDateStr = excelDate.toLocaleDateString('pt-BR', {
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric'
                                    });
                                }
                            }
                            // Se for uma string, tentar converter
                            else if (typeof row.installDate === 'string') {
                                const cleanDateStr = row.installDate.trim();
                                
                                // Tentar formato DD/MM/YYYY
                                const parts = cleanDateStr.split('/');
                                if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
                                    const testDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                                    if (!isNaN(testDate.getTime()) && testDate.getFullYear() > 1900 && testDate.getFullYear() < 2100) {
                                        installDateStr = cleanDateStr;
                                    }
                                }
                                // Se não conseguiu converter, tentar outros formatos
                                else {
                                    const testDate = new Date(cleanDateStr);
                                    if (!isNaN(testDate.getTime()) && testDate.getFullYear() > 1900 && testDate.getFullYear() < 2100) {
                                        installDateStr = testDate.toLocaleDateString('pt-BR', {
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric'
                                        });
                                    }
                                }
                            }
                            // Se for objeto Date do Excel
                            else if (row.installDate instanceof Date && !isNaN(row.installDate.getTime())) {
                                installDateStr = row.installDate.toLocaleDateString('pt-BR', {
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric'
                                });
                            }
                        }
                        
                        const clientData = {
                            clientNumber: row.id_col || 'N/A',
                            name: row.name || 'Não informado',
                            address: row.address || 'Não informado',
                            installDate: installDateStr, // Sempre string no formato DD/MM/YYYY ou vazio
                            panels: row.panels || 0,
                            power: row.power || 0,
                            status: 'new',
                            createdAt: serverTimestamp()
                        };

                        const clientsRef = collection(db, `solar-clients/${userId}/clients`);
                        const q = query(clientsRef, 
                            where("clientNumber", "==", clientData.clientNumber)
                        );
                        const existingClients = await getDocs(q);
                        
                        let clientId;
                        let isNewClient = true;
                        
                        if (!existingClients.empty) {
                            const existingDoc = existingClients.docs[0];
                            clientId = existingDoc.id;
                            await setDoc(existingDoc.ref, { 
                                ...clientData,
                                createdAt: existingDoc.data().createdAt || serverTimestamp()
                            }, { merge: true });
                            isNewClient = false;
                        } else {
                            const newClientRef = await addDoc(clientsRef, clientData);
                            clientId = newClientRef.id;
                        }
                        
                        const historyRef = collection(db, `solar-clients/${userId}/clients/${clientId}/history`);
                        await addDoc(historyRef, {
                            event: isNewClient ? "Cliente importado da planilha." : "Dados do cliente atualizados via planilha.",
                            timestamp: serverTimestamp()
                        });
                        
                        successCount++;
                        setProcessedCount(successCount);
                        
                    } catch (rowError) {
                        console.error(`Erro ao processar linha ${errorCount + successCount + 1}:`, rowError);
                        errorCount++;
                    }
                }

                setIsProcessing(false);
                
                if (successCount > 0) {
                    setSuccess(`✅ ${successCount} cliente(s) importado(s) com sucesso!`);
                    if (errorCount === 0) {
                        setTimeout(() => setActiveTab('clients'), 2000);
                    }
                }
                
                if (errorCount > 0) {
                    setError(`⚠️ ${errorCount} linha(s) com erro. ${successCount} importadas com sucesso.`);
                }
            } catch (err) {
                console.error("Erro ao processar o arquivo:", err);
                setError(`Falha ao ler o arquivo: ${err.message}. Verifique o formato e tente novamente.`);
                setIsProcessing(false);
            }
        };
        reader.onerror = () => {
            setError("Não foi possível ler o arquivo.");
            setIsProcessing(false);
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Importar Planilha de Clientes</h2>
            <p className="text-gray-600 mb-6">Selecione um arquivo Excel (.xlsx) com os dados dos seus clientes.</p>
            
            <label htmlFor="file-upload" className="w-full cursor-pointer inline-flex justify-center items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                📁 {isProcessing ? `Processando... (${processedCount} processados)` : (fileName || "Escolher Arquivo")}
            </label>
            <input
                id="file-upload"
                type="file"
                className="sr-only"
                accept=".xlsx"
                onChange={handleFileUpload}
                disabled={isProcessing}
            />

            {error && <p className="text-red-500 mt-4">{error}</p>}
            {success && <p className="text-green-500 mt-4">{success}</p>}

            <div className="mt-8 text-left text-sm text-gray-500 bg-gray-50 p-4 rounded-md">
                <h4 className="font-semibold text-gray-700 mb-2">Ordem das Colunas na Planilha:</h4>
                <p>Para que a importação funcione, sua planilha deve seguir esta ordem de colunas:</p>
                <ul className="list-disc list-inside mt-2">
                    <li>Coluna A: N° (Número do Cliente)</li>
                    <li>Coluna B: DATA</li>
                    <li>Coluna C: NOME</li>
                    <li>Coluna D: ENDERECO</li>
                    <li>Coluna E: N° PLACA</li>
                    <li>Coluna F: POTENCIA</li>
                </ul>
            </div>
        </div>
    );
};

window.ImportView = ImportView;
