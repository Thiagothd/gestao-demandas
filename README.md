<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sistema de Gestão de Demandas — Jidd Sistemas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f4f6f9;
      color: #1a1a2e;
      padding: 40px 20px;
    }

    .container {
      max-width: 860px;
      margin: 0 auto;
    }

    /* CAPA */
    .cover {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
      color: white;
      border-radius: 16px;
      padding: 60px 50px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 240px; height: 240px;
      background: rgba(99,102,241,0.15);
      border-radius: 50%;
    }
    .cover::after {
      content: '';
      position: absolute;
      bottom: -40px; left: -40px;
      width: 160px; height: 160px;
      background: rgba(99,102,241,0.10);
      border-radius: 50%;
    }
    .cover .tag {
      display: inline-block;
      background: rgba(99,102,241,0.3);
      border: 1px solid rgba(99,102,241,0.5);
      color: #a5b4fc;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 24px;
    }
    .cover h1 {
      font-size: 36px;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 16px;
    }
    .cover h1 span { color: #818cf8; }
    .cover p {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1.6;
      max-width: 520px;
    }
    .cover .link-box {
      margin-top: 32px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(99,102,241,0.2);
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: 10px;
      padding: 12px 20px;
      color: #a5b4fc;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    .cover .link-box:hover { background: rgba(99,102,241,0.3); }
    .cover .link-box svg { width: 16px; height: 16px; }

    /* SEÇÕES */
    .section {
      background: white;
      border-radius: 14px;
      padding: 36px 40px;
      margin-bottom: 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #6366f1;
      margin-bottom: 8px;
    }
    .section h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 20px;
    }
    .section p {
      color: #475569;
      line-height: 1.7;
      font-size: 15px;
    }

    /* PROBLEMA */
    .problem-list {
      list-style: none;
      margin-top: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .problem-list li {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      padding: 14px 16px;
      font-size: 14px;
      color: #991b1b;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .problem-list li .icon { font-size: 18px; flex-shrink: 0; }

    /* FEATURES */
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 8px;
    }
    .feature-card {
      background: #f8faff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
    }
    .feature-card .icon {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .feature-card h3 {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .feature-card ul {
      list-style: none;
      padding: 0;
    }
    .feature-card ul li {
      font-size: 13px;
      color: #64748b;
      padding: 3px 0;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .feature-card ul li::before {
      content: '✓';
      color: #6366f1;
      font-weight: 700;
      flex-shrink: 0;
    }

    /* TABELA COMPARAÇÃO */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 14px;
    }
    thead tr {
      background: #1a1a2e;
      color: white;
    }
    thead th {
      padding: 14px 18px;
      text-align: left;
      font-weight: 600;
    }
    thead th:first-child { border-radius: 10px 0 0 0; }
    thead th:last-child { border-radius: 0 10px 0 0; }
    tbody tr { border-bottom: 1px solid #f1f5f9; }
    tbody tr:hover { background: #f8faff; }
    tbody td {
      padding: 13px 18px;
      color: #475569;
    }
    tbody td:first-child { color: #ef4444; font-weight: 500; }
    tbody td:last-child { color: #16a34a; font-weight: 500; }

    /* ACESSO */
    .access-box {
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border-radius: 12px;
      padding: 28px 32px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 8px;
    }
    .access-box .text h3 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .access-box .text p {
      font-size: 14px;
      color: #c7d2fe;
    }
    .access-box a {
      background: white;
      color: #4f46e5;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 8px;
      white-space: nowrap;
    }
    .access-box a:hover { background: #f0f0ff; }

    /* TECH */
    .tech-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    .tech-tag {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 20px;
    }

    /* FOOTER */
    .footer {
      text-align: center;
      color: #94a3b8;
      font-size: 13px;
      margin-top: 16px;
      padding: 20px;
    }

    @media print {
      body { background: white; padding: 0; }
      .cover { border-radius: 0; }
      .section { box-shadow: none; border: 1px solid #e2e8f0; }
      a { color: inherit; }
    }

    @media (max-width: 600px) {
      .features-grid, .problem-list { grid-template-columns: 1fr; }
      .cover { padding: 40px 28px; }
      .cover h1 { font-size: 26px; }
      .section { padding: 24px; }
    }
  </style>
</head>
<body>
<div class="container">

  <!-- CAPA -->
  <div class="cover">
    <div class="tag">Proposta Interna — Jidd Sistemas</div>
    <h1>Sistema de <span>Gestão de Demandas</span></h1>
    <p>Uma solução desenvolvida pela própria equipe para substituir planilhas Excel e centralizar o controle de projetos, horas e horas extras em um único sistema web.</p>
    <a class="link-box" href="https://gestao-demandas-lyart.vercel.app" target="_blank">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      gestao-demandas-lyart.vercel.app
    </a>
  </div>

  <!-- PROBLEMA -->
  <div class="section">
    <div class="section-label">O Problema</div>
    <h2>Como gerenciamos hoje</h2>
    <p>Atualmente toda a operação é feita via planilhas Excel, o que gera gargalos no dia a dia da equipe:</p>
    <ul class="problem-list">
      <li><span class="icon">📊</span> Planilhas descentralizadas e frequentemente desatualizadas</li>
      <li><span class="icon">⏰</span> Sem visibilidade de prazos e SLAs em tempo real</li>
      <li><span class="icon">🔢</span> Cálculo manual de horas extras — sujeito a erros</li>
      <li><span class="icon">🔍</span> Dificuldade em rastrear o status de cada demanda</li>
    </ul>
  </div>

  <!-- FUNCIONALIDADES -->
  <div class="section">
    <div class="section-label">A Solução</div>
    <h2>O que o sistema oferece</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="icon">📋</div>
        <h3>Painel de Demandas</h3>
        <ul>
          <li>Kanban: A Fazer → Em Andamento → Concluído</li>
          <li>Arrastar e soltar entre etapas</li>
          <li>Filtros por dev, cliente e prazo</li>
          <li>Alerta visual de SLA vencido</li>
          <li>Checklist inteligente por demanda</li>
        </ul>
      </div>
      <div class="feature-card">
        <div class="icon">⏱️</div>
        <h3>Controle de Horas</h3>
        <ul>
          <li>Apontamento por atividade e cliente</li>
          <li>Integração automática com checklists</li>
          <li>Exportação para Excel</li>
          <li>Histórico completo por desenvolvedor</li>
        </ul>
      </div>
      <div class="feature-card">
        <div class="icon">💰</div>
        <h3>Horas Extras</h3>
        <ul>
          <li>Cálculo automático (úteis e fins de semana)</li>
          <li>Controle de pagamentos por dev</li>
          <li>Horas pagas destacadas visualmente</li>
          <li>Exportação para planilha</li>
        </ul>
      </div>
      <div class="feature-card">
        <div class="icon">👥</div>
        <h3>Gestão de Usuários</h3>
        <ul>
          <li>Dois papéis: Gerente e Funcionário</li>
          <li>Gerentes criam e gerenciam contas</li>
          <li>Funcionários veem apenas seus dados</li>
          <li>Troca de senha e papel pelo sistema</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- COMPARAÇÃO -->
  <div class="section">
    <div class="section-label">Comparativo</div>
    <h2>Excel vs. Sistema</h2>
    <table>
      <thead>
        <tr>
          <th>Situação</th>
          <th>Excel (Hoje)</th>
          <th>Sistema (Proposto)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Visibilidade de projetos</td>
          <td>Planilhas manuais</td>
          <td>Kanban em tempo real</td>
        </tr>
        <tr>
          <td>Controle de prazo (SLA)</td>
          <td>Sem alertas</td>
          <td>Alertas visuais automáticos</td>
        </tr>
        <tr>
          <td>Apontamento de horas</td>
          <td>Preenchimento manual</td>
          <td>Integrado ao checklist</td>
        </tr>
        <tr>
          <td>Cálculo de horas extras</td>
          <td>Manual, sujeito a erros</td>
          <td>Automático e auditável</td>
        </tr>
        <tr>
          <td>Acesso à informação</td>
          <td>Quem tem o arquivo</td>
          <td>Qualquer navegador, qualquer lugar</td>
        </tr>
        <tr>
          <td>Controle de acesso</td>
          <td>Nenhum</td>
          <td>Por papel (Gerente / Funcionário)</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ACESSO -->
  <div class="section">
    <div class="section-label">Acesso</div>
    <h2>Disponível agora</h2>
    <div class="access-box">
      <div class="text">
        <h3>Sistema em produção</h3>
        <p>Hospedado em nuvem — sem instalação, funciona em qualquer navegador.</p>
      </div>
      <a href="https://gestao-demandas-lyart.vercel.app" target="_blank">Acessar o Sistema →</a>
    </div>
  </div>

  <!-- TECNOLOGIA -->
  <div class="section">
    <div class="section-label">Tecnologia</div>
    <h2>Desenvolvido internamente</h2>
    <p>Construído pela própria equipe Jidd, com tecnologias modernas e de código aberto — sem custo de licença.</p>
    <div class="tech-tags">
      <span class="tech-tag">React 19</span>
      <span class="tech-tag">TypeScript</span>
      <span class="tech-tag">Supabase (PostgreSQL)</span>
      <span class="tech-tag">Tailwind CSS</span>
      <span class="tech-tag">Vercel (Hospedagem)</span>
      <span class="tech-tag">Controle de Acesso por Papel</span>
      <span class="tech-tag">Exportação Excel</span>
    </div>
  </div>

  <div class="footer">
    Jidd Sistemas · Sistema de Gestão de Demandas · gestao-demandas-lyart.vercel.app
  </div>

</div>
</body>
</html>

