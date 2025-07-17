const { useEffect, useMemo, useRef } = React;

// Preço do kWh para cálculo (ajustável)
const KWH_PRICE = 0.99;

// --- CORES DO TEMA (Ajustadas para um visual mais profissional) ---
const COLORS = {
    primary: '#007BFF',    // Azul mais corporativo
    secondary: '#FFA500',  // Laranja
    text: '#343a40',       // Texto principal (quase preto)
    textLight: '#6c757d',  // Texto secundário (cinza)
    background: '#f8f9fa', // Fundo de linhas da tabela
    white: '#FFFFFF',
    border: '#dee2e6'      // Bordas
};

const Report = ({ client, consumerUnits, onReportGenerated }) => {
    const chartRef = useRef(null);
    const page1Ref = useRef(null);
    const page2Ref = useRef(null);

    const processedData = useMemo(() => {
        const monthlyData = {};
        if (consumerUnits) {
            consumerUnits.forEach(uc => {
                if (uc.history) {
                    uc.history.forEach(item => {
                        const monthYear = item["Referência"];
                        // Validação para garantir que é um mês/ano válido
                        if (monthYear && typeof monthYear === 'string' && monthYear.includes('/')) {
                            if (!monthlyData[monthYear]) {
                                monthlyData[monthYear] = { totalConsumption: 0, totalPaid: 0, ucs: {} };
                            }
                            monthlyData[monthYear].totalConsumption += parseFloat(item["Consumo(kWh)"]) || 0;
                            monthlyData[monthYear].totalPaid += parseFloat(item["Valor"]) || 0;
                            if (!monthlyData[monthYear].ucs[uc.name]) {
                                monthlyData[monthYear].ucs[uc.name] = 0;
                            }
                            monthlyData[monthYear].ucs[uc.name] += parseFloat(item["Consumo(kWh)"]) || 0;
                        }
                    });
                }
            });
        }

        const labels = Object.keys(monthlyData).sort((a, b) => {
             const [m1, y1] = a.split('/');
             const [m2, y2] = b.split('/');
             return new Date(y1, m1 - 1) - new Date(y2, m2 - 1);
        });

        const ucColors = [COLORS.primary, COLORS.secondary, '#FFC107', '#28A745', '#6F42C1'];
        const datasets = {};
        let colorIndex = 0;
        
        labels.forEach(label => {
            const ucsInMonth = monthlyData[label].ucs;
            Object.keys(ucsInMonth).forEach(ucName => {
                if (!datasets[ucName]) {
                    datasets[ucName] = {
                        label: ucName,
                        data: [],
                        backgroundColor: ucColors[colorIndex % ucColors.length]
                    };
                    colorIndex++;
                }
            });
        });

        Object.values(datasets).forEach(ds => {
            ds.data = labels.map(label => (monthlyData[label] && monthlyData[label].ucs[ds.label]) || 0);
        });

        const tableRows = labels.map(label => {
            const consumption = monthlyData[label].totalConsumption;
            const paid = monthlyData[label].totalPaid;
            const estimatedCost = consumption * KWH_PRICE;
            const savings = estimatedCost - paid;
            return { label, consumption, paid, savings };
        });

        const totals = tableRows.reduce((acc, row) => {
            acc.consumption += row.consumption;
            acc.paid += row.paid;
            acc.savings += row.savings;
            return acc;
        }, { consumption: 0, paid: 0, savings: 0 });
        
        totals.estimatedCost = totals.consumption * KWH_PRICE;

        return { labels, datasets: Object.values(datasets), tableRows, totals };
    }, [client, consumerUnits]);

    useEffect(() => {
        const generatePdf = async () => {
            const chartCtx = chartRef.current.getContext('2d');
            const chartInstance = new Chart(chartCtx, {
                type: 'bar',
                data: {
                    labels: processedData.labels,
                    datasets: processedData.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        title: { display: false },
                        legend: { position: 'bottom', labels: { font: { size: 10, family: 'Arial' }, color: COLORS.text } }
                    },
                    scales: {
                        x: { stacked: true, ticks: { font: { size: 10, family: 'Arial' }, color: COLORS.textLight }, grid: { display: false } },
                        y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10, family: 'Arial' }, color: COLORS.textLight }, grid: { color: COLORS.border } }
                    }
                }
            });

            await new Promise(resolve => setTimeout(resolve, 500));
            
            const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            
            const addPageAsImage = async (ref, pageNumber) => {
                const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: null });
                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;

                if (pageNumber > 1) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            };

            await addPageAsImage(page1Ref, 1);
            
            if (processedData.tableRows.length > 0) {
                await addPageAsImage(page2Ref, 2);
            }
            
            pdf.save(`relatorio-${client.name.replace(/\s/g, '_')}.pdf`);
            chartInstance.destroy();
            onReportGenerated();
        };

        generatePdf();
    }, [processedData, onReportGenerated, client.name]);
    
    // --- COMPONENTES DE ESTILO ---
    
    const Header = ({ title, clientName }) => (
        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 30px', backgroundColor: COLORS.primary, color: COLORS.white }}>
            <img src="./assets/logo.png" alt="Logo" style={{ width: '80px', height: '80px', marginRight: '20px' }} />
            <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{title}</h1>
                <p style={{ fontSize: '12px', margin: '5px 0 0 0' }}>{clientName}</p>
            </div>
        </div>
    );

    const StatCard = ({ title, value, color }) => (
        <div style={{
            padding: '15px',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            textAlign: 'center',
            backgroundColor: COLORS.white,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
            <h3 style={{ fontSize: '11px', color: COLORS.textLight, fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>{title}</h3>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: color, margin: 0 }}>{value}</p>
        </div>
    );
    
    const commonStyles = {
        page: { fontFamily: 'Arial, sans-serif', color: COLORS.text, fontSize: '10px', backgroundColor: COLORS.white },
        content: { padding: '20px 30px 30px 30px' },
        h2: { fontSize: '16px', fontWeight: 'bold', color: COLORS.primary, borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: '6px', marginBottom: '15px' },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '10px' },
        th: { padding: '10px', borderBottom: `2px solid ${COLORS.border}`, textAlign: 'left', backgroundColor: '#f2f2f2', fontWeight: 'bold'},
        td: { padding: '10px', borderBottom: `1px solid ${COLORS.border}` },
    };

    return (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '700px' }}>
            
            {/* --- PÁGINA 1 --- */}
            <div ref={page1Ref} style={commonStyles.page}>
                <Header title="Relatório de Consumo e Economia" clientName={`${client.clientNumber} - ${client.name}`} />
                <div style={commonStyles.content}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                        <StatCard title="Custo Sem Solar" value={processedData.totals.estimatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} color={COLORS.text} />
                        <StatCard title="Valor Pago" value={processedData.totals.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} color={COLORS.primary} />
                        <StatCard title="Economia Gerada" value={processedData.totals.savings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} color={COLORS.secondary} />
                    </div>
                    
                    <h2 style={commonStyles.h2}>Consumo Mensal (kWh)</h2>
                    <div style={{ height: '250px', marginBottom: '30px' }}>
                        <canvas ref={chartRef}></canvas>
                    </div>

                    <h2 style={commonStyles.h2}>Saldos por Unidade Consumidora</h2>
                    <table style={commonStyles.table}>
                        <thead>
                            <tr>
                                <th style={commonStyles.th}>Unidade Consumidora</th>
                                <th style={commonStyles.th}>Saldo Atual (kWh)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consumerUnits.map((uc, index) => (
                                <tr key={uc.id} style={{ backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.background }}>
                                    <td style={commonStyles.td}>{uc.name}</td>
                                    <td style={commonStyles.td}>{parseFloat(uc.balanceKWH).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- PÁGINA 2 --- */}
            <div ref={page2Ref} style={commonStyles.page}>
                <Header title="Histórico Detalhado de Faturas" clientName={`${client.clientNumber} - ${client.name}`} />
                <div style={commonStyles.content}>
                    <table style={commonStyles.table}>
                        <thead>
                            <tr>
                                <th style={commonStyles.th}>Mês/Ano</th>
                                <th style={commonStyles.th}>Consumo (kWh)</th>
                                <th style={commonStyles.th}>Valor Pago</th>
                                <th style={commonStyles.th}>Economia Estimada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.tableRows.map((row, index) => (
                                <tr key={row.label} style={{ backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.background }}>
                                    <td style={commonStyles.td}>{row.label}</td>
                                    <td style={commonStyles.td}>{row.consumption.toFixed(2)}</td>
                                    <td style={commonStyles.td}>{row.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td style={{...commonStyles.td, color: COLORS.secondary, fontWeight: 'bold' }}>{row.savings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                            ))}
                            <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                                <td style={commonStyles.td}>TOTAIS</td>
                                <td style={commonStyles.td}>{processedData.totals.consumption.toFixed(2)}</td>
                                <td style={commonStyles.td}>{processedData.totals.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td style={{...commonStyles.td, color: COLORS.secondary }}>{processedData.totals.savings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

window.Report = Report;