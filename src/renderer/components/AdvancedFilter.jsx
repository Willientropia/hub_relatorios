const { useState, useEffect, useMemo } = React;

const AdvancedFilter = ({ clients, onFilterChange }) => {
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        sortBy: 'clientNumber',
        sortOrder: 'asc',
        city: 'all',
        dataCompleteness: 'all',
        reportSent: 'all',
        missingFields: []
    });

    const [isExpanded, setIsExpanded] = useState(false);

    // Extrair lista única de cidades dos clientes
    const cities = useMemo(() => {
        const citySet = new Set();
        clients.forEach(client => {
            if (client.address && client.address !== 'N/A') {
                const parts = client.address.split(',');
                if (parts.length > 1) {
                    const city = parts[parts.length - 1].trim();
                    if (city && city !== 'N/A') {
                        citySet.add(city);
                    }
                } else {
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

        // Filtro de relatório enviado
        if (filters.reportSent !== 'all') {
            result = result.filter(client => {
                const hasReportSent = client.reportSent === true;
                return filters.reportSent === 'sent' ? hasReportSent : !hasReportSent;
            });
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
        const reportSentClients = clients.filter(client => client.reportSent === true);
        
        return {
            total: filteredAndSortedClients.length,
            totalClients: clients.length,
            incompleteCount: incompleteClients.length,
            reportSentCount: reportSentClients.length,
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
            reportSent: 'all',
            missingFields: []
        });
    };

    const hasActiveFilters = () => {
        return filters.search !== '' || 
               filters.status !== 'all' || 
               filters.city !== 'all' || 
               filters.dataCompleteness !== 'all' ||
               filters.reportSent !== 'all' ||
               filters.sortBy !== 'clientNumber' ||
               filters.sortOrder !== 'asc';
    };

    // Função para estilizar botões
    const getButtonClass = (isActive, variant = 'default') => {
        if (isActive) {
            switch (variant) {
                case 'success':
                    return "px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white border border-green-600 shadow-sm";
                case 'danger':
                    return "px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white border border-red-600 shadow-sm";
                case 'warning':
                    return "px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white border border-orange-600 shadow-sm";
                case 'info':
                    return "px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white border border-purple-600 shadow-sm";
                case 'primary':
                    return "px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white border border-blue-600 shadow-sm";
                default:
                    return "px-4 py-2 text-sm font-medium rounded-lg bg-gray-600 text-white border border-gray-600 shadow-sm";
            }
        } else {
            return "px-4 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50";
        }
    };

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
            {/* Header do Filtro */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Campo de Busca */}
                    <div className="flex-1">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="🔍 Buscar por número, nome ou endereço..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Controles */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            ⚙️ Filtros Avançados {isExpanded ? '🔼' : '🔽'}
                        </button>
                        
                        {hasActiveFilters() && (
                            <button
                                onClick={resetFilters}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                ✕ Limpar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filtros Principais - APENAS STATUS DA GARANTIA */}
            <div className="px-6 py-4">
                {/* Status */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Status da Garantia</label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleFilterChange('status', 'all')}
                            className={getButtonClass(filters.status === 'all')}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => handleFilterChange('status', 'active')}
                            className={getButtonClass(filters.status === 'active', 'success')}
                        >
                            Em Garantia
                        </button>
                        <button
                            onClick={() => handleFilterChange('status', 'expired')}
                            className={getButtonClass(filters.status === 'expired', 'danger')}
                        >
                            Expirada
                        </button>
                        <button
                            onClick={() => handleFilterChange('status', 'monitoring')}
                            className={getButtonClass(filters.status === 'monitoring', 'primary')}
                        >
                            Monitoramento
                        </button>
                        <button
                            onClick={() => handleFilterChange('status', 'recurring_maintenance')}
                            className={getButtonClass(filters.status === 'recurring_maintenance', 'info')}
                        >
                            Manutenção
                        </button>
                        <button
                            onClick={() => handleFilterChange('status', 'om_complete')}
                            className={getButtonClass(filters.status === 'om_complete', 'warning')}
                        >
                            O&M Completo
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtros Avançados - AGORA INCLUINDO RELATÓRIOS E DADOS */}
            {isExpanded && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    {/* Relatórios */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Relatórios</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleFilterChange('reportSent', 'all')}
                                className={getButtonClass(filters.reportSent === 'all')}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => handleFilterChange('reportSent', 'sent')}
                                className={getButtonClass(filters.reportSent === 'sent', 'primary')}
                            >
                                📄 Relatório Enviado
                                {filterStats.reportSentCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                        {filterStats.reportSentCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => handleFilterChange('reportSent', 'not_sent')}
                                className={getButtonClass(filters.reportSent === 'not_sent')}
                            >
                                Sem Relatório
                            </button>
                        </div>
                    </div>

                    {/* Dados dos Clientes */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Completude dos Dados</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleFilterChange('dataCompleteness', 'all')}
                                className={getButtonClass(filters.dataCompleteness === 'all')}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => handleFilterChange('dataCompleteness', 'complete')}
                                className={getButtonClass(filters.dataCompleteness === 'complete', 'success')}
                            >
                                ✅ Dados Completos
                            </button>
                            <button
                                onClick={() => handleFilterChange('dataCompleteness', 'incomplete')}
                                className={getButtonClass(filters.dataCompleteness === 'incomplete', 'warning')}
                            >
                                ⚠️ Dados Incompletos
                                {filterStats.incompleteCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">
                                        {filterStats.incompleteCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Controles de Ordenação e Cidade */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Ordenação */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ordenar por
                            </label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="clientNumber">Número do Cliente</option>
                                <option value="name">Nome</option>
                                <option value="city">Cidade</option>
                                <option value="installDate">Data de Instalação</option>
                            </select>
                        </div>

                        {/* Ordem */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ordem
                            </label>
                            <select
                                value={filters.sortOrder}
                                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="asc">Crescente (A-Z, 1-9)</option>
                                <option value="desc">Decrescente (Z-A, 9-1)</option>
                            </select>
                        </div>

                        {/* Cidade */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cidade
                            </label>
                            <select
                                value={filters.city}
                                onChange={(e) => handleFilterChange('city', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">Todas as Cidades ({cities.length})</option>
                                {cities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer com Estatísticas */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
                    <div className="flex flex-wrap items-center gap-4">
                        <span>
                            <span className="font-medium text-gray-900">{filterStats.total}</span> de {filterStats.totalClients} clientes
                        </span>
                        
                        {filterStats.reportSentCount > 0 && (
                            <span>
                                <span className="font-medium text-blue-600">{filterStats.reportSentCount}</span> com relatório
                            </span>
                        )}
                        
                        {filterStats.incompleteCount > 0 && (
                            <span>
                                <span className="font-medium text-orange-600">{filterStats.incompleteCount}</span> incompletos
                            </span>
                        )}
                        
                        <span>
                            <span className="font-medium text-gray-900">{filterStats.citiesCount}</span> cidades
                        </span>
                    </div>

                    {hasActiveFilters() && (
                        <div className="flex items-center text-blue-600">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            <span className="font-medium">Filtros ativos</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

window.AdvancedFilter = AdvancedFilter;