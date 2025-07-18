const { useState, useEffect, useMemo } = React;

// Componente Principal FINAL - SEM INFORMAÇÕES EXTRAS
function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    
    // Inicialização do Firebase e Autenticação
    useEffect(() => {
        const { getAuth, onAuthStateChanged, signInAnonymously } = window.firebase;
        const auth = getAuth();
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                signInAnonymously(auth).catch(error => console.error("Erro no login anônimo:", error));
            }
            setAuthReady(true);
        });
    }, []);

    // Carregamento de dados do Firestore em tempo real
    useEffect(() => {
        if (!authReady || !userId) return;

        setLoading(true);
        const { getFirestore, collection, query, onSnapshot } = window.firebase;
        const db = getFirestore();
        const q = query(collection(db, 'solar-clients')); 

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const clientsData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Converte o timestamp do Firebase para uma string de data legível
                let installDateStr = data.installDate;
                if (installDateStr && typeof installDateStr.toDate === 'function') {
                    installDateStr = installDateStr.toDate().toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                    });
                }

                clientsData.push({ 
                    id: doc.id, 
                    ...data,
                    installDate: installDateStr,
                    // Garantir que reportSent existe (após migração)
                    reportSent: data.reportSent || false
                });
            });
            
            const processedClients = clientsData.map(client => ({
                ...client,
                status: calculateStatus(client.installDate, client.status)
            }));

            setClients(processedClients);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar clientes:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authReady, userId]);

    const calculateStatus = (installDateStr, currentStatus) => {
        // Valida se o status é válido, senão define como 'expired'
        const validStatuses = ['active', 'expired', 'monitoring', 'recurring_maintenance', 'om_complete'];
        
        if (validStatuses.includes(currentStatus)) {
            return currentStatus;
        }

        return 'expired';
    };

    const stats = useMemo(() => {
        return {
            total: clients.length,
            active: clients.filter(c => c.status === 'active').length,
            expired: clients.filter(c => c.status === 'expired').length,
            monitoring: clients.filter(c => c.status === 'monitoring').length,
            recurring_maintenance: clients.filter(c => c.status === 'recurring_maintenance').length,
            om_complete: clients.filter(c => c.status === 'om_complete').length,
            reportSent: clients.filter(c => c.reportSent === true).length
        };
    }, [clients]);

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                        <span className="text-3xl mr-3">☀️</span>
                        Gestão de Clientes Solares
                    </h1>
                    {userId && <span className="text-xs text-gray-400">ID do Usuário: {userId}</span>}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <Tab id="dashboard" activeTab={activeTab} setActiveTab={setActiveTab} count={null}>Dashboard</Tab>
                        <Tab id="clients" activeTab={activeTab} setActiveTab={setActiveTab} count={stats.total}>Clientes</Tab>
                        <Tab id="import" activeTab={activeTab} setActiveTab={setActiveTab}>Importar</Tab>
                    </nav>
                </div>
            </div>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {loading && <div className="text-center p-10">Carregando dados...</div>}
                {!loading && activeTab === 'dashboard' && <Dashboard stats={stats} clients={clients} />}
                {!loading && activeTab === 'clients' && <ClientView clients={clients} userId={userId} />}
                {!loading && activeTab === 'import' && <ImportView userId={userId} setActiveTab={setActiveTab} />}
            </main>
        </div>
    );
}

window.App = App;