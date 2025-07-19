// Componente LoadingSpinner melhorado
const LoadingSpinner = ({ message = "Carregando...", size = "medium" }) => {
    const sizeClasses = {
        small: "w-4 h-4",
        medium: "w-8 h-8", 
        large: "w-12 h-12"
    };

    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`}></div>
            <p className="mt-4 text-gray-600 text-sm">{message}</p>
        </div>
    );
};

// Componente de Loading para listas
const ListLoading = ({ count = 6 }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-5 animate-pulse">
                <div className="flex justify-between items-start mb-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
                <div className="mt-5 pt-4 border-t">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            </div>
        ))}
    </div>
);

window.LoadingSpinner = LoadingSpinner;
window.ListLoading = ListLoading;
