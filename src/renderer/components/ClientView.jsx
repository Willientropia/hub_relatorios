const { useState, useCallback } = React;

const ClientView = ({ clients, userId }) => {
    const [selectedClient, setSelectedClient] = useState(null);
    const [filteredClients, setFilteredClients] = useState(clients);
    const [currentFilters, setCurrentFilters] = useState({});

    // Callback para receber dados filtrados do componente AdvancedFilter
    const handleFilterChange = useCallback((filtered, filters) => {
        setFilteredClients(filtered);
        setCurrentFilters(filters);
    }, []);

    return (
        <div className="space-y-6">
            {/* Componente de Filtros Avançados */}
            <AdvancedFilter 
                clients={clients} 
                onFilterChange={handleFilterChange}
            />
            
            {/* Resultados */}
            {filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredClients.map(client => (
                        <ClientCard key={client.id} client={client} onDetailsClick={() => setSelectedClient(client)} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                    <div className="space-y-4">
                        <div className="text-6xl">🔍</div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nenhum cliente encontrado
                            </h3>
                            <p className="text-gray-500">
                                {currentFilters.search ? 
                                    `Nenhum resultado para "${currentFilters.search}"` : 
                                    'Tente ajustar os filtros para ver mais resultados.'
                                }
                            </p>
                        </div>
                        
                        {(currentFilters.search || 
                          currentFilters.status !== 'all' || 
                          currentFilters.city !== 'all' || 
                          currentFilters.dataCompleteness !== 'all') && (
                            <div className="text-sm text-gray-400">
                                <p>Filtros ativos:</p>
                                <div className="flex flex-wrap justify-center gap-2 mt-2">
                                    {currentFilters.search && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                            Busca: "{currentFilters.search}"
                                        </span>
                                    )}
                                    {currentFilters.status !== 'all' && (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                            Status: {currentFilters.status}
                                        </span>
                                    )}
                                    {currentFilters.city !== 'all' && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                            Cidade: {currentFilters.city}
                                        </span>
                                    )}
                                    {currentFilters.dataCompleteness !== 'all' && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                                            {currentFilters.dataCompleteness === 'incomplete' ? 'Dados Incompletos' : 'Dados Completos'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Detalhes */}
            {selectedClient && (
                 <ClientDetailModal 
                    client={selectedClient} 
                    onClose={() => setSelectedClient(null)} 
                    userId={userId}
                 />
            )}
        </div>
    );
};

window.ClientView = ClientView;