import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, Users, CreditCard, DoorOpen, Cpu, ShieldCheck, Radio, Plus, Pencil, Trash2, X } from 'lucide-react';
import api from './services/api';
import './style.css';

const resourceConfigs = {
  usuarios: {
    label: 'Usuários',
    icon: Users,
    idField: 'idUser',
    createTitle: 'Adicionar usuário',
    editTitle: 'Editar usuário',
    fields: [
      { name: 'nome', label: 'Nome', required: true },
      { name: 'matricula', label: 'Matrícula', required: true },
      { name: 'role', label: 'Perfil', type: 'select', required: true, options: ['Porteiro', 'Docente', 'Servidor', 'Discente'], defaultValue: 'Docente' },
      { name: 'senha', label: 'Senha do porteiro', type: 'password', help: 'Obrigatória apenas para usuários Porteiro. Em edição, deixe em branco para manter a senha atual.' }
    ],
    columns: [
      ['idUser', 'ID'], ['nome', 'Nome'], ['matricula', 'Matrícula'], ['role', 'Perfil'], ['createdAt', 'Criado em']
    ]
  },
  cartoes: {
    label: 'Cartões',
    icon: CreditCard,
    idField: 'idCartao',
    createTitle: 'Adicionar cartão',
    editTitle: 'Editar cartão',
    fields: [
      { name: 'idHex', label: 'UID / ID Hexadecimal', required: true, placeholder: 'Ex.: E6 97 A7 1A' },
      { name: 'idUser', label: 'Usuário vinculado', type: 'relation', resource: 'usuarios', valueKey: 'idUser', labelKeys: ['nome', 'matricula'], nullable: true },
      { name: 'status', label: 'Status', type: 'boolean', defaultValue: true }
    ],
    columns: [
      ['idCartao', 'ID'], ['idUser', 'ID usuário'], ['idHex', 'UID'], ['status', 'Ativo'], ['createdAt', 'Criado em']
    ]
  },
  laboratorios: {
    label: 'Laboratórios',
    icon: DoorOpen,
    idField: 'idLab',
    createTitle: 'Adicionar laboratório',
    editTitle: 'Editar laboratório',
    fields: [
      { name: 'predio', label: 'Prédio', required: true, placeholder: 'Ex.: CT' },
      { name: 'sala', label: 'Sala', required: true, placeholder: 'Ex.: 321' },
      { name: 'status', label: 'Status', type: 'select', required: true, options: ['Aberto', 'Fechado'], defaultValue: 'Fechado' }
    ],
    columns: [
      ['idLab', 'ID'], ['predio', 'Prédio'], ['sala', 'Sala'], ['status', 'Status'], ['createdAt', 'Criado em']
    ]
  },
  dispositivos: {
    label: 'Dispositivos',
    icon: Cpu,
    idField: 'idDisp',
    createTitle: 'Adicionar dispositivo ESP32',
    editTitle: 'Editar dispositivo ESP32',
    fields: [
      { name: 'macAddress', label: 'MAC Address', required: true },
      { name: 'tokenAuth', label: 'Token de autenticação', required: true },
      { name: 'idLab', label: 'Laboratório', type: 'relation', resource: 'laboratorios', valueKey: 'idLab', labelKeys: ['predio', 'sala'], nullable: true },
      { name: 'idFirm', label: 'Firmware', type: 'relation', resource: 'firmware', valueKey: 'idFirm', labelKeys: ['versao'], nullable: true },
      { name: 'status', label: 'Status', defaultValue: 'OFFLINE' },
      { name: 'firmwareAtual', label: 'Firmware atual' }
    ],
    columns: [
      ['idDisp', 'ID'], ['idLab', 'ID lab'], ['macAddress', 'MAC'], ['tokenAuth', 'Token'], ['status', 'Status'], ['firmwareAtual', 'Firmware']
    ]
  },
  firmware: {
    label: 'Firmware',
    icon: Radio,
    idField: 'idFirm',
    createTitle: 'Adicionar firmware',
    editTitle: 'Editar firmware',
    fields: [
      { name: 'data_upload', label: 'Data de upload', type: 'date', required: true },
      { name: 'versao', label: 'Versão', required: true, placeholder: 'Ex.: 1.0.1' },
      { name: 'url', label: 'URL do arquivo .bin', required: true },
      { name: 'obrigatorio', label: 'Atualização obrigatória', type: 'boolean', defaultValue: false }
    ],
    columns: [
      ['idFirm', 'ID'], ['data_upload', 'Data'], ['versao', 'Versão'], ['url', 'URL'], ['obrigatorio', 'Obrigatório']
    ]
  },
  permissoes: {
    label: 'Permissões',
    icon: ShieldCheck,
    idField: 'idAcess',
    createTitle: 'Atribuir permissão',
    editTitle: null,
    noEdit: true,
    fields: [
      { name: 'idUser', label: 'Usuário', type: 'relation', resource: 'usuarios', valueKey: 'idUser', labelKeys: ['nome', 'matricula'], required: true },
      { name: 'idLab', label: 'Laboratório', type: 'relation', resource: 'laboratorios', valueKey: 'idLab', labelKeys: ['predio', 'sala'], required: true },
      { name: 'data_inic', label: 'Data inicial', type: 'date', required: true },
      { name: 'data_fim', label: 'Data final', type: 'date', required: true }
    ],
    columns: [
      ['idAcess', 'ID'], ['nome', 'Usuário'], ['matricula', 'Matrícula'], ['predio', 'Prédio'], ['sala', 'Sala'], ['data_inic', 'Início'], ['data_fim', 'Fim']
    ]
  }
};

const resources = Object.entries(resourceConfigs).map(([key, config]) => [key, config.label, config.icon]);

function formatValue(value, key, config) {
  if (value === null || value === undefined || value === '') return '-';

  const field = config?.fields?.find(item => item.name === key);
  const isBooleanField = field?.type === 'boolean';

  // Mostra Sim/Não somente em colunas que foram configuradas como booleanas.
  // Isso evita que IDs numéricos como 1, 2, 3 apareçam como "Sim".
  if (isBooleanField) {
    return value === true || value === 1 || value === '1' || value === 'true' ? 'Sim' : 'Não';
  }

  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();

  return String(value);
}

function Login({ onLogin }) {
  const [matricula, setMatricula] = useState('admin');
  const [senha, setSenha] = useState('admin123');
  const [erro, setErro] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErro('');
    try {
      const { data } = await api.post('/auth/login', { matricula, senha });
      localStorage.setItem('token', data.token);
      onLogin(data.usuario);
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao entrar.');
    }
  }

  return <main className="login">
    <form onSubmit={submit} className="card login-card">
      <h1>LabFlow-CT</h1>
      <p>Controle de acesso dos laboratórios</p>
      <input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Matrícula" />
      <input value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" type="password" />
      {erro && <div className="alert error">{erro}</div>}
      <button>Entrar</button>
    </form>
  </main>;
}

function Dashboard() {
  const [data, setData] = useState(null);
  const load = async () => setData((await api.get('/dashboard')).data);

  useEffect(() => {
    load();
    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001');
    socket.on('access:new', load);
    return () => socket.disconnect();
  }, []);

  if (!data) return <p>Carregando...</p>;
  return <section>
    <div className="stats">
      <div className="card"><span>Laboratórios</span><strong>{data.labs}</strong></div>
      <div className="card"><span>Cartões ativos</span><strong>{data.cards}</strong></div>
      <div className="card"><span>Acessos hoje</span><strong>{data.logsToday}</strong></div>
    </div>
    <div className="card chart-card">
      <h2>Acessos por laboratório</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data.accessByLab}><XAxis dataKey="laboratorio" /><YAxis /><Tooltip /><Bar dataKey="total" /></BarChart>
      </ResponsiveContainer>
    </div>
    <div className="card">
      <h2>Últimos eventos</h2>
      <div className="table-wrap">
        <table><thead><tr><th>Horário</th><th>Lab</th><th>Evento</th><th>Resultado</th></tr></thead><tbody>
          {data.lastLogs.map(log => <tr key={log.id}><td>{new Date(log.timeStamp).toLocaleString()}</td><td>{log.predio}-{log.sala}</td><td>{log.evento}</td><td>{log.autorizado ? 'Autorizado' : 'Negado'}</td></tr>)}
        </tbody></table>
      </div>
    </div>
  </section>;
}

function initialForm(config) {
  const obj = {};
  for (const field of config.fields) {
    obj[field.name] = field.defaultValue ?? '';
  }
  return obj;
}

function normalizeForEdit(row, config) {
  const obj = initialForm(config);
  for (const field of config.fields) {
    let value = row[field.name];
    if (field.type === 'date' && typeof value === 'string') value = value.slice(0, 10);
    if (field.type === 'boolean') value = value === true || value === 1;
    if (field.name === 'senha') value = '';
    obj[field.name] = value ?? '';
  }
  return obj;
}

function optionLabel(option, labelKeys) {
  return labelKeys.map(key => option[key]).filter(Boolean).join(' - ');
}

function ResourceForm({ config, form, setForm, options }) {
  function update(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  return <div className="form-grid">
    {config.fields.map(field => {
      const value = form[field.name] ?? '';
      if (field.type === 'select') {
        return <label key={field.name}>{field.label}
          <select value={value} required={field.required} onChange={e => update(field.name, e.target.value)}>
            <option value="">Selecione...</option>
            {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>;
      }
      if (field.type === 'relation') {
        const list = options[field.resource] || [];
        return <label key={field.name}>{field.label}
          <select value={value ?? ''} required={field.required} onChange={e => update(field.name, e.target.value)}>
            {field.nullable && <option value="">Sem vínculo</option>}
            {!field.nullable && <option value="">Selecione...</option>}
            {list.map(opt => <option key={opt[field.valueKey]} value={opt[field.valueKey]}>{optionLabel(opt, field.labelKeys)}</option>)}
          </select>
        </label>;
      }
      if (field.type === 'boolean') {
        return <label key={field.name}>{field.label}
          <select value={value ? 'true' : 'false'} onChange={e => update(field.name, e.target.value === 'true')}>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </label>;
      }
      return <label key={field.name}>{field.label}
        <input
          type={field.type || 'text'}
          value={value}
          required={field.required}
          placeholder={field.placeholder || ''}
          onChange={e => update(field.name, e.target.value)}
        />
        {field.help && <small>{field.help}</small>}
      </label>;
    })}
  </div>;
}

function ResourcePage({ resource }) {
  const config = resourceConfigs[resource];
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({});
  const [form, setForm] = useState(initialForm(config));
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const relationResources = useMemo(() => [...new Set(config.fields.filter(f => f.type === 'relation').map(f => f.resource))], [config]);

  async function load() {
    const { data } = await api.get(`/${resource}`);
    setRows(data);
  }

  async function loadOptions() {
    const entries = await Promise.all(relationResources.map(async rel => [rel, (await api.get(`/${rel}`)).data]));
    setOptions(Object.fromEntries(entries));
  }

  useEffect(() => {
    setRows([]);
    setMessage(null);
    setEditing(null);
    setForm(initialForm(config));
    load();
    loadOptions();
  }, [resource]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm(config));
    setModalOpen(true);
    setMessage(null);
  }

  function openEdit(row) {
    setEditing(row);
    setForm(normalizeForEdit(row, config));
    setModalOpen(true);
    setMessage(null);
  }

  function buildPayload() {
    const payload = {};
    for (const field of config.fields) {
      let value = form[field.name];
      if (field.name === 'senha' && !value) continue;
      if (field.type === 'relation') value = value === '' ? null : Number(value);
      if (field.type === 'boolean') value = Boolean(value);
      if (value === '' && field.nullable) value = null;
      payload[field.name] = value;
    }
    return payload;
  }

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = buildPayload();
      if (editing) {
        await api.put(`/${resource}/${editing[config.idField]}`, payload);
        setMessage({ type: 'success', text: 'Registro atualizado com sucesso.' });
      } else {
        await api.post(`/${resource}`, payload);
        setMessage({ type: 'success', text: 'Registro criado com sucesso.' });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao salvar registro.' });
    } finally {
      setLoading(false);
    }
  }

  async function remove(row) {
    const id = row[config.idField];
    if (!confirm(`Excluir registro #${id}?`)) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.delete(`/${resource}/${id}`);
      setMessage({ type: 'success', text: 'Registro excluído com sucesso.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erro ao excluir registro.' });
    } finally {
      setLoading(false);
    }
  }

  return <section>
    <div className="page-header">
      <div>
        <h2>{config.label}</h2>
        <p>Cadastre, edite, exclua e liste registros deste módulo.</p>
      </div>
      <button className="primary" onClick={openCreate}><Plus size={18}/> {config.createTitle}</button>
    </div>

    {message && <div className={`alert ${message.type}`}>{message.text}</div>}

    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr>{config.columns.map(([key, label]) => <th key={key}>{label}</th>)}<th>Ações</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={config.columns.length + 1}>Nenhum registro cadastrado.</td></tr>}
            {rows.map(row => <tr key={row[config.idField]}>
              {config.columns.map(([key]) => <td key={key}>{formatValue(row[key], key, config)}</td>)}
              <td className="actions">
                {!config.noEdit && <button className="icon-btn" title="Editar" onClick={() => openEdit(row)}><Pencil size={16}/></button>}
                <button className="icon-btn danger" title="Excluir" onClick={() => remove(row)}><Trash2 size={16}/></button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>

    {modalOpen && <div className="modal-backdrop">
      <form className="modal card" onSubmit={save}>
        <div className="modal-header">
          <h3>{editing ? config.editTitle : config.createTitle}</h3>
          <button type="button" className="icon-btn" onClick={() => setModalOpen(false)}><X size={18}/></button>
        </div>
        <ResourceForm config={config} form={form} setForm={setForm} options={options} />
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </div>}
  </section>;
}

function App() {
  const [logged, setLogged] = useState(!!localStorage.getItem('token'));
  const [page, setPage] = useState('dashboard');

  if (!logged) return <Login onLogin={() => setLogged(true)} />;

  return <div className="app">
    <aside>
      <h1>LabFlow-CT</h1>
      <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}><LayoutDashboard size={18}/> Dashboard</button>
      {resources.map(([key, label, Icon]) => <button key={key} className={page === key ? 'active' : ''} onClick={() => setPage(key)}><Icon size={18}/> {label}</button>)}
      <button className="logout" onClick={() => { localStorage.removeItem('token'); setLogged(false); }}>Sair</button>
    </aside>
    <main className="content">{page === 'dashboard' ? <Dashboard /> : <ResourcePage resource={page} />}</main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
