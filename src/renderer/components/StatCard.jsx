const StatCard = ({ title, value, color }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
        <p className={`mt-1 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
);

window.StatCard = StatCard;
