// Componente para migração de dados - Executar UMA VEZ
const { useState } = React;

const MigrationComponent = ({ userId }) => {
    const [migrationStatus, setMigrationStatus] = useState('ready'); // ready, running, completed, error
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [migrationLog, setMigrationLog] = useState([]);

    const addLog = (message) => {
        setMigrationLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const runMigration = async () => {
        setMigrationStatus('running');
        setProgress({ current: 0, total: 0 });
        setMigrationLog([]);
        
        try {
            const { getFirestore, collection, query, getDocs, doc, updateDoc, serverTimestamp } = window.firebase;
            const db = getFirestore();
            
            addLog('🚀 Iniciando migração de status dos clientes...');
            
            // Buscar todos os clientes
            const clientsRef = collection(db, 'solar-clients');
            const querySnapshot = await getDocs(clientsRef);
            
            const clients = [];
            querySnapshot.forEach((doc) => {
                clients.push({ id: doc.id, ...doc.data() });
            });
            
            setProgress({ current: 0, total: clients.length });
            addLog(`📊 Encontrados ${clients.length} clientes para migração`);
            
            let migratedCount = 0;
            let skippedCount = 0;
            
            for (let i = 0; i < clients.length; i++) {
                const client = clients[i];
                setProgress({ current: i + 1, total: clients.length });
                
                let needsUpdate = false;
                let newData = {};
                
                // Mapear status antigos para novos
                switch (client.status) {
                    case 'expired':
                        // Já está correto, apenas garantir que reportSent existe
                        if (client.reportSent === undefined) {
                            newData.reportSent = false;
                            needsUpdate = true;
                        }
                        break;
                        
                    case 'report_sent':
                        newData.status = 'expired';
                        newData.reportSent = true;
                        needsUpdate = true;
                        addLog(`🔄 Cliente ${client.clientNumber || client.name}: report_sent → expired + reportSent`);
                        break;
                        
                    case 'om_sold':
                        newData.status = 'expired';
                        newData.reportSent = true;
                        needsUpdate = true;
                        addLog(`🔄 Cliente ${client.clientNumber || client.name}: om_sold → expired + reportSent`);
                        break;
                        
                    case 'active':
                    case 'monitoring':
                    case 'recurring_maintenance':
                    case 'om_complete':
                        // Manter como estão, apenas garantir que reportSent existe
                        if (client.reportSent === undefined) {
                            newData.reportSent = false;
                            needsUpdate = true;
                        }
                        break;
                        
                    default:
                        // Status desconhecido - definir como expired
                        newData.status = 'expired';
                        newData.reportSent = false;
                        needsUpdate = true;
                        addLog(`⚠️ Cliente ${client.clientNumber || client.name}: status '${client.status}' → expired`);
                }
                
                if (needsUpdate) {
                    try {
                        await updateDoc(doc(db, 'solar-clients', client.id), {
                            ...newData,
                            migratedAt: serverTimestamp()
                        });
                        migratedCount++;
                    } catch (error) {
                        addLog(`❌ Erro ao migrar ${client.clientNumber || client.name}: ${error.message}`);
                    }
                } else {
                    skippedCount++;
                }
                
                // Pequena pausa para não sobrecarregar o Firebase
                if (i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            addLog(`✅ Migração concluída!`);
            addLog(`📈 ${migratedCount} clientes migrados`);
            addLog(`⏭️ ${skippedCount} clientes já estavam corretos`);
            
            setMigrationStatus('completed');
            
        } catch (error) {
            addLog(`❌ Erro na migração: ${error.message}`);
            setMigrationStatus('error');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
                🔄 Migração de Status dos Clientes
            </h2>
            
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ ATENÇÃO - Executar apenas UMA VEZ</h3>
                <p className="text-sm text-yellow-700">
                    Esta migração irá alterar os status dos clientes existentes:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                    <li><strong>report_sent</strong> → <strong>expired</strong> + reportSent = true</li>
                    <li><strong>om_sold</strong> → <strong>expired</strong> + reportSent = true</li>
                    <li>Outros status mantidos + adicionar campo reportSent</li>
                </ul>
            </div>

            {migrationStatus === 'ready' && (
                <button
                    onClick={runMigration}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700"
                >
                    🚀 Iniciar Migração
                </button>
            )}

            {migrationStatus === 'running' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Progresso:</span>
                        <span className="text-sm font-medium">
                            {progress.current} / {progress.total}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                        ></div>
                    </div>
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
            )}

            {(migrationStatus === 'completed' || migrationStatus === 'error') && (
                <div className={`p-4 rounded-md ${migrationStatus === 'completed' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <h3 className={`font-semibold ${migrationStatus === 'completed' ? 'text-green-800' : 'text-red-800'}`}>
                        {migrationStatus === 'completed' ? '✅ Migração Concluída!' : '❌ Erro na Migração'}
                    </h3>
                </div>
            )}

            {migrationLog.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">📋 Log da Migração:</h4>
                    <div className="bg-gray-100 p-3 rounded-md max-h-60 overflow-y-auto">
                        {migrationLog.map((log, index) => (
                            <div key={index} className="text-xs text-gray-700 font-mono">
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

window.MigrationComponent = MigrationComponent;