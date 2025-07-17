// Em src/renderer/components/ClientCard.jsx

const ClientCard = ({ client, onDetailsClick }) => {
    // ALTERADO: Mapeamento de status e estilos
    const statusStyles = {
        expired: { bg: 'bg-red-100', text: 'text-red-800', label: 'Vencido' },
        report_sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Relatório Enviado' },
        om_sold: { bg: 'bg-green-100', text: 'text-green-800', label: 'O&M Vendido' },
        
        // Mantendo os antigos para compatibilidade, se houver
        active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Em Garantia' },
        monitoring: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Monitoramento' },
        recurring_maintenance: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Manutenção' },
        om_complete: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'O&M Completo' }
    };
    
    // O padrão será 'Vencido'
    const style = statusStyles[client.status] || statusStyles.expired;

    return (
        <div className="bg-white rounded-lg shadow-md p-5 flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
            <div>
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-800 pr-2">
                        {client.clientNumber ? `${client.clientNumber} - ` : ''}{client.name || 'Nome não informado'}
                    </h3>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>📍 Local:</strong> {client.address || 'N/A'}</p>
                    <p><strong>📅 Instalação:</strong> {client.installDate || 'N/A'}</p>
                    <p><strong>⚡ Potência:</strong> {client.power || 'N/A'} kWp</p>
                </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
                <button 
                    onClick={onDetailsClick}
                    className="w-full bg-indigo-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-indigo-600 transition-colors duration-200"
                >
                    Ver Detalhes e UCs
                </button>
            </div>
        </div>
    );
};

window.ClientCard = ClientCard;