const { useMemo } = React;

const Dashboard = ({ stats, clients }) => {
    const totalPower = useMemo(() => {
        return clients.reduce((sum, client) => {
            const power = parseFloat(String(client.power || '0').replace(',', '.')) || 0;
            return sum + power;
        }, 0).toFixed(2);
    }, [clients]);

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-gray-700">Visão Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Clientes" value={stats.total} color="text-indigo-600" />
                <StatCard title="Em Garantia" value={stats.active} color="text-green-600" />
                <StatCard title="Garantia Expirada" value={stats.expired} color="text-red-600" />
                <StatCard title="Monitoramento" value={stats.monitoring} color="text-blue-600" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <StatCard title="Manutenção Recorrente" value={stats.recurring_maintenance} color="text-purple-600" />
                <StatCard title="O&M Completo" value={stats.om_complete} color="text-orange-600" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                 <h3 className="text-lg font-medium text-gray-900">Potência Total Instalada</h3>
                 <p className="mt-2 text-4xl font-bold text-indigo-600">{totalPower} kWp</p>
            </div>
        </div>
    );
};

window.Dashboard = Dashboard;
