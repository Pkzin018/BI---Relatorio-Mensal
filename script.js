let charts = {};

// Gerencia a persistência e o redimensionamento
window.onload = function() {
    const savedData = localStorage.getItem('vsm_bi_cache');
    if (savedData) processarCSV(savedData, true);
};

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    event.currentTarget.classList.add('active');
    
    // Corrige o bug dos gráficos "caindo" ao trocar de aba
    Object.values(charts).forEach(chart => chart.resize());
}

function importarArquivo() {
    const input = document.getElementById('arquivo_csv');
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        localStorage.setItem('vsm_bi_cache', e.target.result);
        processarCSV(e.target.result);
    };
    reader.readAsText(input.files[0]);
}

function processarCSV(csv, isCache = false) {
    const linhas = csv.trim().split("\n");
    if (linhas.length <= 1) return;
    linhas.shift();
    const dados = linhas.reduce((acc, linha) => {
        const colunas = linha.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (colunas.length >= 2) {
            acc[colunas[0].replace(/"/g, "").trim()] = colunas[1].replace(/"/g, "").trim();
        }
        return acc;
    }, {});
    
    atualizarDashboard(dados);
    document.getElementById('status-carga').innerText = isCache ? "Sistema Online (Cache)" : "Dados Atualizados";
}

function atualizarDashboard(dados) {
    const impT = parseInt(dados["1. Quantidade Novos Implantados"]) || 0;
    const canT = parseInt(dados["4. Quantidade cliente cancelados"]) || 0;
    
    document.getElementById('val-implantados').innerText = impT;
    document.getElementById('val-cancelados').innerText = canT;
    document.getElementById('last-update').innerText = "Carga: " + new Date().toLocaleTimeString();

    gerarGraficoBarras('chartImplantados', parseFormat(dados["3. Quantidade por produto implantado"]), '#38bdf8');
    gerarGraficoPizza('chartMotivos', parseFormat(dados["7. Motivo de cancelamento"]));
    renderizarDetalhes(dados["6. Quantidade de cancelamento por produto"]);
    gerarResumoExecutivo(dados);
    gerarRelatorioFinal(dados);
}

function gerarRelatorioFinal(dados) {
    const container = document.getElementById('relatorio-texto');
    const impT = parseInt(dados["1. Quantidade Novos Implantados"]) || 0;
    const canT = parseInt(dados["4. Quantidade cliente cancelados"]) || 0;
    const saldo = impT - canT;
    const evasao = impT > 0 ? ((canT / impT) * 100).toFixed(1) : 0;
    
    const impProds = Object.entries(parseFormat(dados["3. Quantidade por produto implantado"])).sort((a,b)=>b[1]-a[1]);
    const canProds = Object.entries(parseFormat(dados["6. Quantidade de cancelamento por produto"])).sort((a,b)=>b[1]-a[1]);
    const motivos = Object.entries(parseFormat(dados["7. Motivo de cancelamento"])).sort((a,b)=>b[1]-a[1]);

    const topProd = impProds[0]?.[0] || "N/A";
    const piorProd = canProds[0]?.[0] || "N/A";
    const principalMotivo = motivos[0]?.[0] || "não identificado";

    container.innerHTML = `
        <div class="report-section">
            <h3><i class="fas fa-chart-line"></i> 1. Panorama de Expansão e Vendas</h3>
            <p>A operação atual demonstra um vigor comercial de <span class="text-positive">${impT} novas unidades implantadas</span>. O grande destaque deste período é o produto <span class="text-positive">${topProd}</span>, que lidera o ranking de adesão. Este movimento sugere uma forte aceitação desta solução específica pelo mercado ou uma campanha comercial bem-sucedida focada neste segmento.</p>
        </div>

        <div class="report-section">
            <h3><i class="fas fa-user-shield"></i> 2. Retenção e Saúde da Base</h3>
            <p>Registramos a saída de <span class="text-negative">${canT} clientes</span> no período analisado. Realizando o balanço matemático de <span class="text-positive">Implantados (${impT})</span> menos <span class="text-negative">Cancelados (${canT})</span>, chegamos a um <b>Saldo Líquido de <span class="${saldo>=0?'text-positive':'text-negative'}">${saldo} clientes</span></b>. Embora o saldo seja um indicador vital, notamos que o produto <span class="text-negative">${piorProd}</span> é o que mais sofre com desligamentos, o que exige uma auditoria de qualidade ou de usabilidade.</p>
        </div>

        <div class="report-section">
            <h3><i class="fas fa-exclamation-circle"></i> 3. Diagnóstico Qualitativo de Perdas</h3>
            <p>A <b>Taxa de Evasão</b> está calculada em <span class="${evasao > 15 ? 'text-negative' : 'text-positive'}">${evasao}%</span>. Ao analisarmos o "porquê" dessas perdas, o fator <span class="text-negative">"${principalMotivo}"</span> aparece como o principal detrator. Isso indica que a solução para reduzir o cancelamento não é apenas técnica, mas possivelmente processual ou de atendimento ligada a este motivo específico.</p>
        </div>

        <div class="report-section">
            <h3><i class="fas fa-lightbulb"></i> 4. Recomendações Estratégicas</h3>
            <p>Para o próximo ciclo, a recomendação é focar na proteção da base de clientes do produto <span class="text-negative">${piorProd}</span>. Além disso, manter o fôlego nas implantações de <span class="text-positive">${topProd}</span> garantirá que o saldo líquido permaneça positivo, desde que a causa raiz <span class="text-negative">"${principalMotivo}"</span> seja endereçada pela equipe de Customer Success.</p>
        </div>
    `;
}

function gerarResumoExecutivo(dados) {
    const container = document.getElementById('ai-insights');
    const impT = parseInt(dados["1. Quantidade Novos Implantados"]) || 0;
    const canT = parseInt(dados["4. Quantidade cliente cancelados"]) || 0;
    const saldo = impT - canT;
    const taxaEvasao = impT > 0 ? ((canT/impT)*100).toFixed(1) : 0;

    container.innerHTML = `
        <div class="insight-item" style="grid-column: span 2; border-left: 4px solid var(--accent-blue);">
            <h4>Balanço Geral (Cálculo Linear)</h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); text-align: center;">
                <div><small>Implantados</small><br><strong class="text-positive">${impT}</strong></div>
                <div><small>Cancelados</small><br><strong class="text-negative">${canT}</strong></div>
                <div><small>Saldo Líquido</small><br><strong style="color:${saldo >= 0 ? '#00ff88' : '#fb7185'}">${saldo}</strong></div>
                <div><small>Taxa de Evasão</small><br><strong>${taxaEvasao}%</strong></div>
            </div>
        </div>
        <div class="insight-item">
            <h4>Ranking de Motivos</h4>
            <table>${Object.entries(parseFormat(dados["7. Motivo de cancelamento"])).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${k}</td><td style="text-align:right"><b>${v}</b></td></tr>`).join('')}</table>
        </div>
        <div class="insight-item">
            <h4>Performance Prod.</h4>
            <table>${Object.keys({...parseFormat(dados["3. Quantidade por produto implantado"]), ...parseFormat(dados["6. Quantidade de cancelamento por produto"])}).map(p=>`<tr><td>${p}</td><td style="text-align:center;color:var(--accent-blue)">${parseFormat(dados["3. Quantidade por produto implantado"])[p]||0}</td><td style="text-align:right;color:var(--accent-red)">${parseFormat(dados["6. Quantidade de cancelamento por produto"])[p]||0}</td></tr>`).join('')}</table>
        </div>`;
}

// Helpers e Gráficos estáveis
function parseFormat(t) {
    const obj = {};
    if (t && t !== '0') t.split('|').forEach(i => { const [n, q] = i.split('='); if(n) obj[n.trim()] = parseInt(q); });
    return obj;
}

function gerarGraficoBarras(id, dados, cor) {
    if (charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id).getContext('2d');
    charts[id] = new Chart(ctx, {
        type: 'bar',
        data: { labels: Object.keys(dados), datasets: [{ data: Object.values(dados), backgroundColor: cor, borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function gerarGraficoPizza(id, dados) {
    if (charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id).getContext('2d');
    charts[id] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: Object.keys(dados), datasets: [{ data: Object.values(dados), backgroundColor: ['#fb7185', '#38bdf8', '#818cf8', '#fbbf24', '#34d399'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'right', labels: { color: '#f8fafc' } } } }
    });
}

function renderizarDetalhes(texto) {
    const container = document.getElementById('badge-container');
    container.innerHTML = "";
    const lista = parseFormat(texto);
    const maximo = Math.max(...Object.values(lista), 1);
    Object.entries(lista).forEach(([nome, qtd]) => {
        const card = document.createElement('div');
        card.className = 'detail-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between"><span>${nome}</span><span class="text-negative">${qtd}</span></div>
            <div class="progress-bg"><div class="progress-fill" style="width: ${(qtd/maximo)*100}%"></div></div>`;
        container.appendChild(card);
    });
}