import React, { useState, useEffect, useMemo } from 'react';
import { User, CurrencyCode, CURRENCIES, Transaction, FilterRange, CATEGORIES, Prediction } from './types';
import { 
  auth,
  onAuthStateChanged, 
  signOut,
  db,
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  getAvailableProfiles,
  createProfile,
  loginAsUser,
  updateUserProfile
} from './firebase';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  LogOut, 
  Download, 
  AlertTriangle, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Trash2,
  Edit2,
  Search,
  BarChart2,
  Smartphone,
  CalendarClock
} from 'lucide-react';
import { Button } from './components/Button';
import { analyzeRecurringBills } from './services/predictionService';
import { generateCSV } from './services/csvService';

// --- Sub-Components ---

const ProfileSelector = ({ onLogin }: { onLogin: () => void }) => {
  const [profiles, setProfiles] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>('USD');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const users = await getAvailableProfiles();
    setProfiles(users);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    await createProfile(newName, newCurrency);
    setIsCreating(false);
    loadProfiles();
  };

  const handleSelect = async (user: User) => {
    await loginAsUser(user);
    onLogin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-white relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]"></div>
      
      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Who is using Nova?</h1>
          <p className="text-gray-400 mt-2">Select a profile or add a new account.</p>
        </div>

        {!isCreating ? (
          <div className="grid grid-cols-2 gap-4">
            {profiles.map(user => (
              <button 
                key={user.uid}
                onClick={() => handleSelect(user)}
                className="glass-card p-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-white/5 transition-all active:scale-95 group"
              >
                <img src={user.photoURL || ''} className="w-16 h-16 rounded-full border-2 border-transparent group-hover:border-primary transition-colors" alt={user.displayName} />
                <span className="font-medium text-lg">{user.displayName}</span>
              </button>
            ))}
            
            <button 
              onClick={() => setIsCreating(true)}
              className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border-dashed border-2 border-white/20 hover:border-primary/50 hover:bg-primary/10 transition-all active:scale-95 text-gray-400 hover:text-primary"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <PlusCircle size={32} />
              </div>
              <span className="font-medium">Add Profile</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="glass-card p-8 rounded-3xl space-y-4 animate-fade-in">
             <h2 className="text-xl font-bold mb-4">Create Profile</h2>
             <div>
               <label className="block text-xs text-gray-400 mb-1">Name</label>
               <input 
                 value={newName}
                 onChange={e => setNewName(e.target.value)}
                 className="w-full bg-surface border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                 placeholder="e.g. John Doe"
                 required
               />
             </div>
             <div>
               <label className="block text-xs text-gray-400 mb-1">Currency</label>
               <select 
                 value={newCurrency}
                 onChange={e => setNewCurrency(e.target.value as CurrencyCode)}
                 className="w-full bg-surface border border-white/10 rounded-xl p-3 focus:border-primary outline-none appearance-none"
               >
                 {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.symbol})</option>)}
               </select>
             </div>
             <div className="flex gap-3 pt-2">
               <Button type="button" variant="secondary" onClick={() => setIsCreating(false)} className="flex-1">Cancel</Button>
               <Button type="submit" className="flex-1">Create</Button>
             </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface TransactionItemProps {
  t: Transaction;
  symbol: string;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ t, symbol, onEdit, onDelete }) => (
  <div className="glass-card p-4 rounded-xl flex items-center justify-between mb-3 group">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        t.type === 'income' ? 'bg-income/20 text-income' : 'bg-expense/20 text-expense'
      }`}>
        {t.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      </div>
      <div>
        <p className="font-medium text-white">{t.description}</p>
        <p className="text-xs text-gray-400">{t.date} • {t.category}</p>
      </div>
    </div>
    <div className="text-right flex items-center gap-3">
      <div>
        <p className={`font-semibold ${t.type === 'income' ? 'text-income' : 'text-white'}`}>
          {t.type === 'income' ? '+' : '-'}{symbol}{t.amount.toFixed(2)}
        </p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t.accountName}</p>
      </div>
      <div className="flex gap-1">
        <button 
          onClick={() => onEdit(t)}
          className="text-gray-600 hover:text-primary transition-colors p-2"
        >
          <Edit2 size={16} />
        </button>
        <button 
          onClick={() => onDelete(t.id)}
          className="text-gray-600 hover:text-red-500 transition-colors p-2"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'add' | 'settings'>('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterRange>('month');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // PWA & Chart State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Animation State
  const [addButtonAnimate, setAddButtonAnimate] = useState(false);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [account, setAccount] = useState('Personal');

  // Initialization
  useEffect(() => {
    // Check PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }
    
    // Capture install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadTransactions(currentUser.uid);
      } else {
        setTransactions([]);
        setLoading(false);
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      unsubscribe();
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleAddButtonPress = () => {
    setAddButtonAnimate(true);
    setTimeout(() => {
      setAddButtonAnimate(false);
      setEditingId(null); 
      setAmount(''); 
      setDesc(''); 
      setView('add');
    }, 200); // Wait for animation
  };

  const loadTransactions = async (uid: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, `users/${uid}/transactions`), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const loaded: Transaction[] = [];
      querySnapshot.forEach((doc: any) => {
        loaded.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      setTransactions(loaded);
      
      const pred = analyzeRecurringBills(loaded);
      setPrediction(pred);

    } catch (error: any) {
      console.error("Error loading docs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setView('home');
    setTransactions([]);
  };

  const getCurrencySymbol = () => {
    return CURRENCIES.find(c => c.code === user?.currency)?.symbol || '$';
  };

  const handleEditInit = (t: Transaction) => {
    setEditingId(t.id);
    setAmount(t.amount.toString());
    setDesc(t.description);
    setCategory(t.category);
    setType(t.type);
    setAccount(t.accountName);
    setView('add');
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !desc) return;

    const txData = {
      amount: parseFloat(amount),
      description: desc,
      category,
      type,
      accountName: account,
      date: editingId ? transactions.find(t => t.id === editingId)?.date : new Date().toISOString().split('T')[0], // Keep original date if editing
      createdAt: editingId ? undefined : Date.now() // Only set created at for new
    };

    try {
      if (editingId) {
        // Update
        await updateDoc(doc(db, `users/${user.uid}/transactions/${editingId}`), txData);
      } else {
        // Create
        await addDoc(`users/${user.uid}/transactions`, {
          ...txData,
          date: new Date().toISOString().split('T')[0], // New transactions are always today
          createdAt: Date.now()
        });
      }
      
      // Reset Form
      setEditingId(null);
      setAmount('');
      setDesc('');
      setView('home');
      loadTransactions(user.uid);
    } catch (error) {
      console.error("Error saving doc", error);
    }
  };

  const deleteTransaction = async (id: string) => {
    if(!user) return;
    if(!confirm("Delete this transaction?")) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/transactions/${id}`));
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCurrencyChange = async (code: CurrencyCode) => {
    if (!user) return;
    const updatedUser = await updateUserProfile(user.uid, { currency: code });
    setUser(updatedUser);
  };

  // --- Derived State & Computations ---

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    // First apply range filter
    let filtered = transactions.filter(t => {
      const txDate = new Date(t.date);
      if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= weekAgo;
      } else if (filter === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else {
        return txDate.getFullYear() === now.getFullYear();
      }
    });

    // Then apply Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(q) || 
        t.category.toLowerCase().includes(q) ||
        t.accountName.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [transactions, filter, searchQuery]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if(t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const pieChartData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort highest expense first
  }, [filteredTransactions]);

  // Trend Chart Data (Bar + Line)
  const trendData = useMemo(() => {
    const data: { name: string; income: number; expense: number; net: number }[] = [];
    const today = new Date();
    
    if (chartPeriod === 'week') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            
            let inc = 0, exp = 0;
            transactions.forEach(t => {
                if (t.date === dateStr) {
                     t.type === 'income' ? inc += t.amount : exp += t.amount;
                }
            });
            data.push({ name: dayName, income: inc, expense: exp, net: inc - exp });
        }
    } else if (chartPeriod === 'month') {
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = d.toLocaleDateString('en-US', { month: 'short' });
            
            let inc = 0, exp = 0;
            transactions.forEach(t => {
                 const tDate = new Date(t.date);
                 if (tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear()) {
                     t.type === 'income' ? inc += t.amount : exp += t.amount;
                 }
            });
            data.push({ name: monthName, income: inc, expense: exp, net: inc - exp });
        }
    } else {
        // Last 5 years
        for (let i = 4; i >= 0; i--) {
            const year = today.getFullYear() - i;
            let inc = 0, exp = 0;
            transactions.forEach(t => {
                if (new Date(t.date).getFullYear() === year) {
                    t.type === 'income' ? inc += t.amount : exp += t.amount;
                }
            });
            data.push({ name: year.toString(), income: inc, expense: exp, net: inc - exp });
        }
    }
    return data;
  }, [transactions, chartPeriod]);

  const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#06B6D4', '#E11D48'];

  if (!user) {
    return <ProfileSelector onLogin={() => {}} />;
  }

  const symbol = getCurrencySymbol();

  return (
    <div className="min-h-screen bg-background text-white pb-24 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src={user.photoURL || ''} alt="User" className="w-10 h-10 rounded-full border border-white/20 bg-surface" />
             <div>
               <h2 className="text-xs text-gray-400">Welcome,</h2>
               <p className="text-sm font-bold">{user.displayName}</p>
             </div>
          </div>
          <div className="flex gap-2">
             {/* Filter Buttons */}
             {(['week', 'month', 'year'] as FilterRange[]).map((f) => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)} 
                  className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-full border transition-all ${filter===f ? 'bg-white text-black border-white' : 'border-white/20 text-gray-400 hover:border-white/40'}`}
                >
                  {f[0]}
                </button>
             ))}
          </div>
        </div>

        {view === 'home' && (
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
             <input 
                type="text" 
                placeholder="Search transactions..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 text-white placeholder-gray-600 transition-colors"
             />
           </div>
        )}
      </header>

      {view === 'home' && (
        <main className="p-6 space-y-6 animate-fade-in">
          
          {/* Dashboard Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2 glass-card p-5 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-black border border-white/10">
               <p className="text-gray-400 text-sm mb-1">Total Balance</p>
               <h2 className={`text-4xl font-bold ${stats.balance < 0 ? 'text-expense' : 'text-white'}`}>
                 {symbol}{stats.balance.toFixed(2)}
               </h2>
             </div>
             <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-income"></div>
                  <p className="text-xs text-gray-400">Income</p>
                </div>
                <p className="text-xl font-semibold text-income">+{symbol}{stats.income.toFixed(0)}</p>
             </div>
             <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-expense"></div>
                  <p className="text-xs text-gray-400">Expense</p>
                </div>
                <p className="text-xl font-semibold text-expense">-{symbol}{stats.expense.toFixed(0)}</p>
             </div>
          </div>

          {/* Smart Prediction Box (Pattern Learning) */}
          {prediction && (
             <div className="glass-card glow-yellow p-4 rounded-xl flex items-start gap-3 relative overflow-hidden animate-slide-up">
               {/* Background Pattern */}
               <div className="absolute top-[-20%] right-[-10%] opacity-10 rotate-12">
                 <CalendarClock size={100} className="text-yellow-500" />
               </div>
               
               <div className="bg-yellow-500/20 p-2.5 rounded-xl text-yellow-500 shadow-inner">
                 <AlertTriangle size={24} />
               </div>
               
               <div className="flex-1 z-10">
                 <div className="flex justify-between items-start">
                   <h3 className="font-bold text-yellow-500 text-xs uppercase tracking-wider mb-1">Upcoming Recurring Bill</h3>
                   <button onClick={() => setPrediction(null)} className="text-gray-500 hover:text-white transition-colors">
                     &times;
                   </button>
                 </div>
                 <p className="text-sm text-gray-300 leading-snug">
                   <span className="text-white font-bold">{prediction.description}</span> appears due in <span className="text-white font-bold">{prediction.daysRemaining} days</span>.
                 </p>
                 <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/20">
                      Est. {symbol}{prediction.avgAmount.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-gray-500 italic">Based on history</span>
                 </div>
               </div>
             </div>
          )}

          {/* Financial Trends */}
          <div className="glass-card p-5 rounded-2xl">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                  <BarChart2 size={16} className="text-primary"/> Financial Trends
                </h3>
                <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                  {(['week', 'month', 'year'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      className={`text-[10px] px-2 py-1 rounded-md transition-all ${chartPeriod === p ? 'bg-primary text-white' : 'text-gray-500 hover:text-white'}`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
             </div>
             <div className="h-[250px] w-full text-xs">
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={trendData} margin={{top: 10, right: 0, left: -20, bottom: 0}}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                   <XAxis dataKey="name" stroke="#666" tickLine={false} axisLine={false} dy={10} />
                   <YAxis stroke="#666" tickLine={false} axisLine={false} />
                   <ReTooltip 
                     contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px' }}
                     itemStyle={{ fontSize: '12px' }}
                     formatter={(value: number) => `${symbol}${value}`}
                   />
                   <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                   <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                   <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                   <Line type="monotone" dataKey="net" name="Net Balance" stroke="#3B82F6" strokeWidth={2} dot={{r:3}} />
                 </ComposedChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Charts Section (Breakdown) */}
          <div className="space-y-4">
            
            {/* Pie Chart */}
            {pieChartData.length > 0 && (
              <div className="glass-card p-5 rounded-2xl flex flex-col items-center">
                <h3 className="text-sm font-bold text-gray-300 self-start mb-4 flex items-center gap-2">
                  <PieChart size={16} className="text-primary"/> Expense Breakdown
                </h3>
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip 
                        contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => `${symbol}${value}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Category List */}
                <div className="w-full mt-4 space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {pieChartData.map((entry, index) => (
                    <div key={index} className="flex justify-between items-center text-sm group hover:bg-white/5 p-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-gray-300 font-medium">{entry.name}</span>
                      </div>
                      <span className="font-mono text-white font-semibold">{symbol}{entry.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div>
            <div className="flex justify-between items-end mb-4">
               <h3 className="text-lg font-bold">Recent Activity</h3>
            </div>
            
            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading...</div>
            ) : filteredTransactions.length === 0 ? (
               <div className="text-center py-10 text-gray-500 glass-card rounded-xl">No transactions found.</div>
            ) : (
              filteredTransactions.map(t => (
                <TransactionItem 
                  key={t.id} 
                  t={t} 
                  symbol={symbol}
                  onEdit={handleEditInit} 
                  onDelete={deleteTransaction} 
                />
              ))
            )}
          </div>
        </main>
      )}

      {view === 'add' && (
        <main className="p-6">
          <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <form onSubmit={handleSaveTransaction} className="space-y-6">
            
            {/* Amount Input */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-500">{symbol}</span>
                <input 
                  type="number" 
                  step="0.01" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-2xl p-4 pl-10 text-3xl font-bold text-white focus:outline-none focus:border-primary transition-colors placeholder-gray-700" 
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-3 bg-surface p-1 rounded-xl border border-white/10">
               <button 
                type="button"
                onClick={() => setType('expense')}
                className={`py-3 rounded-lg font-medium transition-all ${type === 'expense' ? 'bg-expense text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
               >
                 Expense
               </button>
               <button 
                type="button"
                onClick={() => setType('income')}
                className={`py-3 rounded-lg font-medium transition-all ${type === 'income' ? 'bg-income text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
               >
                 Income
               </button>
            </div>

            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Description (e.g. Netflix, Rent)" 
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full bg-surface border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary"
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary appearance-none"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary appearance-none"
                >
                  <option value="Personal">Personal</option>
                  <option value="Business">Business</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="button" variant="secondary" onClick={() => { setView('home'); setEditingId(null); setAmount(''); setDesc(''); }} className="flex-1">Cancel</Button>
              <Button type="submit" className="flex-[2]">{editingId ? 'Update' : 'Save'}</Button>
            </div>
          </form>
        </main>
      )}

      {view === 'settings' && (
        <main className="p-6 space-y-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
             <img src={user.photoURL || ''} className="w-16 h-16 rounded-full border border-white/10" />
             <div>
               <p className="font-bold text-lg">{user.displayName}</p>
               <p className="text-gray-400 text-sm">{user.uid.slice(0,8)}...</p>
             </div>
          </div>

          <div className="space-y-3">
             <h3 className="text-gray-400 text-sm uppercase tracking-wider font-bold ml-1">Preferences</h3>
             
             <div className="glass-card p-4 rounded-xl flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-lg text-primary"><Wallet size={20} /></div>
                  <span>Currency</span>
               </div>
               <select 
                 value={user.currency}
                 onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                 className="bg-black/50 border border-white/20 rounded-lg py-1 px-3 text-sm focus:outline-none"
               >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
               </select>
             </div>
          </div>

          <div className="space-y-3">
             <h3 className="text-gray-400 text-sm uppercase tracking-wider font-bold ml-1">Data</h3>
             <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => generateCSV(transactions, stats.balance)}
                className="justify-between group"
              >
                <span className="flex items-center gap-3"><Download size={20} /> Download CSV Report</span>
             </Button>
          </div>

          {/* PWA Install Section */}
          {!isStandalone && installPrompt && (
            <div className="space-y-3">
               <h3 className="text-gray-400 text-sm uppercase tracking-wider font-bold ml-1">App</h3>
               <Button 
                  onClick={handleInstall}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg"
                >
                  <Smartphone size={20} /> Install App
               </Button>
            </div>
          )}

          <div className="pt-4 pb-8 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-green-500 mb-2">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <span>Offline Database Active</span>
            </div>
            <Button variant="danger" fullWidth onClick={handleLogout}>
              <LogOut size={20} /> Switch Profile
            </Button>
            <p className="text-center text-gray-600 text-xs mt-4">Version 1.4.1 (Stable)</p>
          </div>
        </main>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full glass pb-safe pt-2 px-6 flex justify-around items-center z-50 h-20">
        <button 
          onClick={() => setView('home')}
          className={`flex flex-col items-center gap-1 p-2 transition-all ${view === 'home' ? 'text-primary scale-110' : 'text-gray-500'}`}
        >
          <LayoutDashboard size={24} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        
        <button 
          onClick={handleAddButtonPress}
          className={`bg-primary text-white rounded-full p-4 mb-8 shadow-lg shadow-blue-500/30 border-4 border-black transition-all duration-200 ${
            addButtonAnimate ? 'scale-125 ring-4 ring-primary/40 shadow-blue-500/60' : 'hover:scale-105'
          }`}
        >
          <PlusCircle size={32} />
        </button>

        <button 
          onClick={() => setView('settings')}
          className={`flex flex-col items-center gap-1 p-2 transition-all ${view === 'settings' ? 'text-primary scale-110' : 'text-gray-500'}`}
        >
          <Settings size={24} />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>
    </div>
  );
}