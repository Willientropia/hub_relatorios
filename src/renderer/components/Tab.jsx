const Tab = ({ id, activeTab, setActiveTab, count, children }) => (
    <button
        onClick={() => setActiveTab(id)}
        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
            ${activeTab === id ? 'tab-active' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`
        }
    >
        {children} {count !== null && <span className="bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 ml-2">{count}</span>}
    </button>
);

window.Tab = Tab;
