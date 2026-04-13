import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAdmin } from '../lib/adminAuth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('dyego.vnunes@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInAdmin(email, password);
      navigate('/paineladmin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">{'\u26A1'}</span>
          <h1 className="text-white text-2xl font-bold mt-2">Yaya Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            placeholder="Email"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            placeholder="Senha"
            autoComplete="current-password"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-purple-600 text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 active:bg-purple-700"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
