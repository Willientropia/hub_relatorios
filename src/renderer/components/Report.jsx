const { useEffect, useMemo, useRef } = React;

// Preço do kWh para cálculo - pode ser ajustado conforme necessário
const KWH_PRICE = 0.99;

const Report = ({ client, consumerUnits, onReportGenerated }) => {
    const chartRef = useRef(null);
    const reportRef = useRef(null);

    // Agrega os dados para o gráfico e as tabelas
    const processedData = useMemo(() => {
        const monthlyData = {};

        consumerUnits.forEach(uc => {
            if (uc.history) {
                uc.history.forEach(item => {
                    const monthYear = item["Referência"];
                    if (!monthlyData[monthYear]) {
                        monthlyData[monthYear] = { totalConsumption: 0, totalPaid: 0, ucs: {} };
                    }
                    monthlyData[monthYear].totalConsumption += item["Consumo(kWh)"];
                    monthlyData[monthYear].totalPaid += item["Valor"];
                    if (!monthlyData[monthYear].ucs[uc.name]) {
                        monthlyData[monthYear].ucs[uc.name] = 0;
                    }
                    monthlyData[monthYear].ucs[uc.name] += item["Consumo(kWh)"];
                });
            }
        });

        const labels = Object.keys(monthlyData).sort((a, b) => {
             const [m1, y1] = a.split('/');
             const [m2, y2] = b.split('/');
             return new Date(y1, m1 - 1) - new Date(y2, m2 - 1);
        });
        
        const datasets = {};
        labels.forEach(label => {
            const ucsInMonth = monthlyData[label].ucs;
            Object.keys(ucsInMonth).forEach(ucName => {
                if (!datasets[ucName]) {
                    datasets[ucName] = {
                        label: ucName,
                        data: [],
                        backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`
                    };
                }
            });
        });
        Object.values(datasets).forEach(ds => {
            ds.data = labels.map(label => monthlyData[label].ucs[ds.label] || 0);
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

    // Efeito para criar o gráfico e gerar o PDF
    useEffect(() => {
        const chartCtx = chartRef.current.getContext('2d');
        const chartInstance = new Chart(chartCtx, {
            type: 'bar',
            data: {
                labels: processedData.labels,
                datasets: processedData.datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Histórico de Consumo (kWh) por Mês', font: { size: 14 } }, // Fonte menor
                    legend: { position: 'top', labels: { font: { size: 10 } } } // Fonte menor
                },
                scales: {
                    x: { stacked: true, ticks: { font: { size: 10 } } },
                    y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 } } }
                }
            }
        });

        setTimeout(() => {
            html2canvas(reportRef.current, { scale: 2 }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasHeight / canvasWidth;
                const imgHeight = pdfWidth * ratio;

                // Checa se a altura da imagem é maior que a página, se for, divide em páginas
                let heightLeft = imgHeight;
                let position = 0;
                
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                    heightLeft -= pdf.internal.pageSize.getHeight();
                }

                pdf.save(`relatorio-${client.name.replace(/\s/g, '_')}.pdf`);
                onReportGenerated();
            });
        }, 500);

        return () => chartInstance.destroy();
    }, [processedData, onReportGenerated, client.name]);

    return (
        // Estilos para compactar o layout
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '700px', backgroundColor: 'white' }}>
            <div ref={reportRef} style={{ padding: '25px', fontFamily: 'sans-serif', color: '#333', fontSize: '10px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a202c', borderBottom: '2px solid #4f46e5', paddingBottom: '8px', marginBottom: '5px' }}>
                    Relatório de Consumo e Economia
                </h1>
                <p style={{ fontSize: '12px' }}><strong>Cliente:</strong> {client.clientNumber} - {client.name}</p>

                <div style={{ marginTop: '20px' }}>
                    <canvas ref={chartRef}></canvas>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '20px', textAlign: 'center' }}>
                    <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <h3 style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '5px' }}>CUSTO SEM SOLAR</h3>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#e53e3e' }}>
                            {processedData.totals.estimatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                     <div style={{ padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <h3 style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold', marginBottom: '5px' }}>VALOR PAGO</h3>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#4a5568' }}>
                            {processedData.totals.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div style={{ padding: '15px', border: '1px solid #c6f6d5', borderRadius: '8px', backgroundColor: '#f0fff4' }}>
                        <h3 style={{ fontSize: '11px', color: '#2f855a', fontWeight: 'bold', marginBottom: '5px' }}>ECONOMIA GERADA</h3>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#276749' }}>
                           {processedData.totals.savings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>

                <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '25px', borderBottom: '1px solid #cbd5e0', paddingBottom: '6px' }}>
                    Detalhes Mensais Consolidados
                </h2>
                <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f7fafc' }}>
                            <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Mês/Ano</th>
                            <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Consumo (kWh)</th>
                            <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Valor Pago</th>
                            <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Economia Estimada</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.tableRows.map(row => (
                             <tr key={row.label}>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.label}</td>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.consumption.toFixed(2)}</td>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{row.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0', color: '#2f855a' }}>{row.savings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        ))}
                        <tr style={{ backgroundColor: '#edf2f7', fontWeight: 'bold' }}>
                            <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>TOTAIS</td>
                            <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{processedData.totals.consumption.toFixed(2)}</td>
                            <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{processedData.totals.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td style={{ padding: '8px', border: '1px solid #e2e8f0', color: '#276749' }}>{processedData.totals.savings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                    </tbody>
                </table>
                
                 <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '25px', borderBottom: '1px solid #cbd5e0', paddingBottom: '6px' }}>
                    Saldos por Unidade Consumidora
                </h2>
                <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f7fafc' }}>
                            <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Unidade Consumidora</th>
                            <th style={{ padding: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Saldo Atual (kWh)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {consumerUnits.map(uc => (
                            <tr key={uc.id}>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{uc.name}</td>
                                <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{parseFloat(uc.balanceKWH).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

window.Report = Report;