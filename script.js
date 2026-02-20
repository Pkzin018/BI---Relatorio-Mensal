let charts = {};

window.onload = function() {
    const savedData = localStorage.getItem('vsm_bi_cache');
    if (savedData) processarCSV(savedData, true);
};

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(valor) || 0);
}

function parseFormat(t) {
    const obj = {};
    if (t && t !== '0') {
        t.split('|').forEach(i => {
            const parts = i.split('=');
            if (parts.length === 2) obj[parts[0].trim()] = parseInt(parts[1].trim());
        });
    }
    return obj;
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    event.currentTarget.classList.add('active');
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
            const chave = colunas[0].replace(/"/g, "").trim();
            const valor = colunas[1].replace(/"/g, "").trim();
            acc[chave] = valor;
        }
        return acc;
    }, {});
    
    atualizarDashboard(dados);
    document.getElementById('status-carga').innerText = isCache ? "Sistema Online (Cache)" : "Dados Atualizados";
}

function atualizarDashboard(dados) {
    // Mapeamento direto das chaves do SQL
    const impQtd = dados["1. Quantidade Novos Implantados"] || 0;
    const impVal = dados["2. Valor total implantado"] || 0;
    const canQtd = dados["4. Quantidade cliente cancelados"] || 0;
    const canVal = dados["5. Valor total cancelado"] || 0;

    document.getElementById('val-implantados').innerText = impQtd;
    document.getElementById('fin-implantados').innerText = formatarMoeda(impVal);
    document.getElementById('val-cancelados').innerText = canQtd;
    document.getElementById('fin-cancelados').innerText = formatarMoeda(canVal);
    document.getElementById('last-update').innerText = "Carga: " + new Date().toLocaleTimeString();

    gerarGraficoBarras('chartImplantados', parseFormat(dados["3. Quantidade por produto implantado"]), '#38bdf8');
    gerarGraficoPizza('chartMotivos', parseFormat(dados["7. Motivo de cancelamento"]));
    renderizarDetalhes(dados["6. Quantidade de cancelamento por produto"]);
    gerarResumoExecutivo(dados);
    gerarRelatorioFinal(dados);
}

function gerarResumoExecutivo(dados) {
    const container = document.getElementById('ai-insights');
    const vImp = parseFloat(dados["2. Valor total implantado"]) || 0;
    const vCan = parseFloat(dados["5. Valor total cancelado"]) || 0;
    const saldo = vImp - vCan;

    container.innerHTML = `
        <div class="insight-item" style="grid-column: span 2; border-left: 4px solid var(--accent-blue);">
            <h4>Balanço Financeiro Consolidado</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); text-align: center;">
                <div><small>Novas Receitas</small><br><strong class="text-positive">${formatarMoeda(vImp)}</strong></div>
                <div><small>Churn (Perda)</small><br><strong class="text-negative">${formatarMoeda(vCan)}</strong></div>
                <div><small>Saldo Líquido</small><br><strong style="color:${saldo >= 0 ? '#00ff88' : '#fb7185'}">${formatarMoeda(saldo)}</strong></div>
            </div>
        </div>
        <div class="insight-item">
            <h4>Ranking de Motivos</h4>
            <table>${Object.entries(parseFormat(dados["7. Motivo de cancelamento"])).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${k}</td><td style="text-align:right"><b>${v}</b></td></tr>`).join('')}</table>
        </div>
        <div class="insight-item">
            <h4>Performance Prod. (Imp x Can)</h4>
            <table>${Object.keys({...parseFormat(dados["3. Quantidade por produto implantado"]), ...parseFormat(dados["6. Quantidade de cancelamento por produto"])}).map(p=>`<tr><td>${p}</td><td style="color:var(--accent-blue); text-align:right">${parseFormat(dados["3. Quantidade por produto implantado"])[p]||0}</td><td style="color:var(--accent-red); text-align:right">${parseFormat(dados["6. Quantidade de cancelamento por produto"])[p]||0}</td></tr>`).join('')}</table>
        </div>`;
}

function gerarRelatorioFinal(dados) {
    const container = document.getElementById('relatorio-texto');
    const impT = parseInt(dados["1. Quantidade Novos Implantados"]) || 0;
    const canT = parseInt(dados["4. Quantidade cliente cancelados"]) || 0;
    const vImp = parseFloat(dados["2. Valor total implantado"]) || 0;
    const vCan = parseFloat(dados["5. Valor total cancelado"]) || 0;
    const churnRate = impT > 0 ? ((canT / impT) * 100).toFixed(1) : 0;
    
    const impProds = Object.entries(parseFormat(dados["3. Quantidade por produto implantado"])).sort((a,b)=>b[1]-a[1]);
    const topProd = impProds[0]?.[0] || "N/A";
    const motivos = Object.entries(parseFormat(dados["7. Motivo de cancelamento"])).sort((a,b)=>b[1]-a[1]);
    const principalMotivo = motivos[0]?.[0] || "não identificado";

    container.innerHTML = `
        <div class="report-section">
            <h3><i class="fas fa-rocket"></i> 1. Desempenho e Expansão</h3>
            <p>Neste ciclo, a operação registrou <span class="text-positive">${impT} novas implantações</span>, o que representa um incremento de <strong>${formatarMoeda(vImp)}</strong> em nossa receita recorrente. O destaque absoluto foi o produto <span class="text-positive">${topProd}</span>, que segue liderando a preferência do mercado e validando nossa estratégia comercial para este segmento.</p>
        </div>
        <div class="report-section">
            <h3><i class="fas fa-balance-scale"></i> 2. Saúde da Base e Retenção</h3>
            <p>Do lado da retenção, enfrentamos a saída de <span class="text-negative">${canT} clientes</span>, totalizando uma perda financeira de <span class="text-negative">${formatarMoeda(vCan)}</span>. Com uma taxa de evasão operacional de <strong>${churnRate}%</strong>, o balanço final entre entradas e saídas permanece no azul, mas exige atenção aos pontos de fricção.</p>
        </div>
        <div class="report-section">
            <h3><i class="fas fa-exclamation-triangle"></i> 3. Diagnóstico Qualitativo</h3>
            <p>Ao analisarmos o "porquê" das saídas, o motivo <strong>"${principalMotivo}"</strong> surge como o principal detrator. Isso indica que não estamos perdendo clientes apenas por preço ou mercado, mas possivelmente por uma questão específica que o time de Customer Success pode atacar diretamente.</p>
        </div>
        <div class="report-section">
            <h3><i class="fas fa-lightbulb"></i> 4. Recomendações Estratégicas</h3>
            <p>O foco para o próximo período deve ser duplo: manter a tração de vendas do <strong>${topProd}</strong> e implementar uma força-tarefa para mitigar o motivo <strong>"${principalMotivo}"</strong>. Reduzir essa perda é, atualmente, o caminho mais rápido para aumentar o saldo líquido sem necessariamente elevar o custo de aquisição de novos clientes.</p>
        </div>
    `;
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
