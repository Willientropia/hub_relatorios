const { useState, useEffect, useMemo } = React;

const AdvancedFilter = ({ clients, onFilterChange }) => {
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        sortBy: 'clientNumber', // clientNumber, name, city, installDate
        sortOrder: 'asc', // asc, desc
        city: 'all',
        dataCompleteness: 'all', // all, complete, incomplete
        missingFields: [] // array de campos específicos que estão faltando
    });

    const [isExpanded, setIsExpanded] = useState(false);

    // Extrair lista única de cidades dos clientes
    const cities = useMemo(() => {
        const citySet = new Set();
        clients.forEach(client => {
            if (client.address && client.address !== 'N/A') {
                // Tentar extrair cidade do endereço (pega a última parte após vírgula)
                const parts = client.address.split(',');
                if (parts.length > 1) {
                    const city = parts[parts.length - 1].trim();
                    if (city && city !== 'N/A') {
                        citySet.add(city);
                    }
                } else {
                    // Se não tem vírgula, usa o endereço inteiro como cidade
                    citySet.add(client.address.trim());
                }
            }
        });
        return Array.from(citySet).sort();
    }, [clients]);

    // Função para verificar se um cliente tem dados incompletos
    const hasIncompleteData = (client) => {
        const requiredFields = ['name', 'address', 'installDate', 'panels', 'power'];
        return requiredFields.some(field => {
            const value = client[field];
            return !value || 
                   value === 'N/A' || 
                   value === 'Não informado' || 
                   String(value).trim() === '' ||
                   (field === 'panels' && (value === 0 || value === '0')) ||
                   (field === 'power' && (value === 0 || value === '0'));
        });
    };

    // Função para obter campos faltantes de um cliente
    const getMissingFields = (client) => {
        const fields = {
            name: 'Nome',
            address: 'Endereço', 
            installDate: 'Data de Instalação',
            panels: 'Nº de Placas',
            power: 'Potência'
        };
        
        const missing = [];
        Object.keys(fields).forEach(field => {
            const value = client[field];
            if (!value || 
                value === 'N/A' || 
                value === 'Não informado' || 
                String(value).trim() === '' ||
                (field === 'panels' && (value === 0 || value === '0')) ||
                (field === 'power' && (value === 0 || value === '0'))) {
                missing.push(fields[field]);
            }
        });
        return missing;
    };

    // Extrair cidade do endereço do cliente
    const getClientCity = (client) => {
        if (!client.address || client.address === 'N/A') return '';
        const parts = client.address.split(',');
        if (parts.length > 1) {
            return parts[parts.length - 1].trim();
        }
        return client.address.trim();
    };

    // Aplicar todos os filtros
    const filteredAndSortedClients = useMemo(() => {
        let result = [...clients];

        // Filtro de busca
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            result = result.filter(client => {
                const name = String(client.name || '').toLowerCase();
                const address = String(client.address || '').toLowerCase();
                const clientNumber = String(client.clientNumber || '').toLowerCase();
                
                return name.includes(searchLower) ||
                       address.includes(searchLower) ||
                       clientNumber.includes(searchLower);
            });
        }

        // Filtro de status
        if (filters.status !== 'all') {
            result = result.filter(client => client.status === filters.status);
        }

        // Filtro de cidade
        if (filters.city !== 'all') {
            result = result.filter(client => getClientCity(client) === filters.city);
        }

        // Filtro de completude de dados
        if (filters.dataCompleteness === 'incomplete') {
            result = result.filter(client => hasIncompleteData(client));
        } else if (filters.dataCompleteness === 'complete') {
            result = result.filter(client => !hasIncompleteData(client));
        }

        // Ordenação
        result.sort((a, b) => {
            let valueA, valueB;

            switch (filters.sortBy) {
                case 'clientNumber':
                    valueA = parseInt(String(a.clientNumber || '0')) || 0;
                    valueB = parseInt(String(b.clientNumber || '0')) || 0;
                    break;
                case 'name':
                    valueA = String(a.name || '').toLowerCase();
                    valueB = String(b.name || '').toLowerCase();
                    break;
                case 'city':
                    valueA = getClientCity(a).toLowerCase();
                    valueB = getClientCity(b).toLowerCase();
                    break;
                case 'installDate':
                    // Converter data DD/MM/YYYY para ordenação
                    const parseDate = (dateStr) => {
                        if (!dateStr || dateStr === 'N/A') return new Date(0);
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                        }
                        return new Date(0);
                    };
                    valueA = parseDate(a.installDate);
                    valueB = parseDate(b.installDate);
                    break;
                default:
                    valueA = a[filters.sortBy] || '';
                    valueB = b[filters.sortBy] || '';
            }

            if (filters.sortOrder === 'desc') {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            } else {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            }
        });

        return result;
    }, [clients, filters]);

    // Estatísticas dos filtros aplicados
    const filterStats = useMemo(() => {
        const incompleteClients = clients.filter(hasIncompleteData);
        return {
            total: filteredAndSortedClients.length,
            totalClients: clients.length,
            incompleteCount: incompleteClients.length,
            citiesCount: cities.length
        };
    }, [filteredAndSortedClients, clients, cities]);

    // Notificar mudanças para o componente pai
    useEffect(() => {
        onFilterChange(filteredAndSortedClients, filters);
    }, [filteredAndSortedClients, filters, onFilterChange]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            search: '',
            status: 'all',
            sortBy: 'clientNumber',
            sortOrder: 'asc',
            city: 'all',
            dataCompleteness: 'all',
            missingFields: []
        });
    };

    const hasActiveFilters = () => {
        return filters.search !== '' || 
               filters.status !== 'all' || 
               filters.city !== 'all' || 
               filters.dataCompleteness !== 'all' ||
               filters.sortBy !== 'clientNumber' ||
               filters.sortOrder !== 'asc';
    };

    // Função para garantir que todos os botões de status sejam sempre renderizados
    const getStatusButtonClass = (statusValue, isActive) => {
        const baseClass = "px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200";
        
        if (isActive) {
            switch (statusValue) {
                case 'all':
                    return `${baseClass} bg-indigo-600 text-white`;
                case 'active':
                    return `${baseClass} bg-green-600 text-white`;
                case 'expired':
                    return `${baseClass} bg-red-600 text-white`;
                case 'monitoring':
                    return `${baseClass} bg-blue-600 text-white`;
                case 'recurring_maintenance':
                    return `${baseClass} bg-purple-600 text-white`;
                case 'om_complete':
                    return `${baseClass} bg-orange-600 text-white`;
                default:
                    return `${baseClass} bg-gray-600 text-white`;
            }
        } else {
            return `${baseClass} bg-white text-gray-700 hover:bg-gray-50 border border-gray-300`;
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            {/* Linha Principal de Filtros */}
            <div className="space-y-4">
                {/* Busca e Botões de Ação */}
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                    {/* Busca */}
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            placeholder="🔍 Buscar por nº, nome ou endereço..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center"
                        >
                            ⚙️ Filtros {isExpanded ? '🔼' : '🔽'}
                        </button>
                        
                        {hasActiveFilters() && (
                            <button
                                onClick={resetFilters}
                                className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                            >
                                🗑️ Limpar
                            </button>
                        )}
                    </div>
                </div>

                {/* Filtros de Status (sempre visíveis e completos) */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleFilterChange('status', 'all')}
                        className={getStatusButtonClass('all', filters.status === 'all')}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => handleFilterChange('status', 'active')}
                        className={getStatusButtonClass('active', filters.status === 'active')}
                    >
                        Em Garantia
                    </button>
                    <button
                        onClick={() => handleFilterChange('status', 'expired')}
                        className={getStatusButtonClass('expired', filters.status === 'expired')}
                    >
                        Expirada
                    </button>
                    <button
                        onClick={() => handleFilterChange('status', 'monitoring')}
                        className={getStatusButtonClass('monitoring', filters.status === 'monitoring')}
                    >
                        Monitoramento
                    </button>
                    <button
                        onClick={() => handleFilterChange('status', 'recurring_maintenance')}
                        className={getStatusButtonClass('recurring_maintenance', filters.status === 'recurring_maintenance')}
                    >
                        Manutenção
                    </button>
                    <button
                        onClick={() => handleFilterChange('status', 'om_complete')}
                        className={getStatusButtonClass('om_complete', filters.status === 'om_complete')}
                    >
                        O&M Completo
                    </button>
                </div>
            </div>

            {/* Filtros Avançados (Expandidos) */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Ordenação */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ordenar por
                            </label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="clientNumber">Número do Cliente</option>
                                <option value="name">Nome</option>
                                <option value="city">Cidade</option>
                                <option value="installDate">Data de Instalação</option>
                            </select>
                        </div>

                        {/* Ordem */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ordem
                            </label>
                            <select
                                value={filters.sortOrder}
                                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="asc">Crescente (A-Z, 1-9)</option>
                                <option value="desc">Decrescente (Z-A, 9-1)</option>
                            </select>
                        </div>

                        {/* Cidade */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cidade
                            </label>
                            <select
                                value={filters.city}
                                onChange={(e) => handleFilterChange('city', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="all">Todas as Cidades ({cities.length})</option>
                                {cities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Segunda linha para Completude dos Dados */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrar por Dados dos Clientes
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleFilterChange('dataCompleteness', 'all')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                                    filters.dataCompleteness === 'all' 
                                        ? 'bg-gray-600 text-white' 
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                            >
                                Todos os Dados
                            </button>
                            <button
                                onClick={() => handleFilterChange('dataCompleteness', 'complete')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                                    filters.dataCompleteness === 'complete' 
                                        ? 'bg-green-600 text-white' 
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                            >
                                ✅ Dados Completos
                            </button>
                            <button
                                onClick={() => handleFilterChange('dataCompleteness', 'incomplete')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 flex items-center ${
                                    filters.dataCompleteness === 'incomplete' 
                                        ? 'bg-orange-600 text-white' 
                                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                            >
                                ⚠️ Dados Incompletos
                                {filterStats.incompleteCount > 0 && (
                                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                        filters.dataCompleteness === 'incomplete' 
                                            ? 'bg-orange-500 text-white' 
                                            : 'bg-orange-100 text-orange-800'
                                    }`}>
                                        {filterStats.incompleteCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Estatísticas dos Filtros com visual mais elegante */}
            <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span className="text-gray-700">
                            <strong className="text-gray-900">{filterStats.total}</strong> de {filterStats.totalClients} clientes
                        </span>
                    </div>
                    
                    {filterStats.incompleteCount > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-gray-700">
                                <strong className="text-orange-600">{filterStats.incompleteCount}</strong> com dados incompletos
                            </span>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-gray-700">
                            <strong className="text-gray-900">{filterStats.citiesCount}</strong> cidades
                        </span>
                    </div>

                    {hasActiveFilters() && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-blue-600 font-medium">Filtros ativos</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de Clientes com Dados Incompletos (quando filtro ativo) */}
            {filters.dataCompleteness === 'incomplete' && filteredAndSortedClients.length > 0 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <h4 className="text-sm font-semibold text-orange-800 mb-2">
                        ⚠️ Clientes com Dados Incompletos:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {filteredAndSortedClients.slice(0, 6).map(client => {
                            const missing = getMissingFields(client);
                            return (
                                <div key={client.id} className="text-orange-700">
                                    <strong>{client.clientNumber ? `${client.clientNumber} - ` : ''}{client.name}</strong>
                                    <br />
                                    <span className="text-orange-600">Faltando: {missing.join(', ')}</span>
                                </div>
                            );
                        })}
                        {filteredAndSortedClients.length > 6 && (
                            <div className="text-orange-600 italic">
                                ... e mais {filteredAndSortedClients.length - 6} clientes
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

window.AdvancedFilter = AdvancedFilter;