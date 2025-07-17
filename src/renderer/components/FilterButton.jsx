const FilterButton = ({ current, status, setStatus, children }) => (
    <button
        onClick={() => setStatus(status)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
            current === status ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
    >
        {children}
    </button>
);

window.FilterButton = FilterButton;
