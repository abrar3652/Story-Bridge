import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Howl } from 'howler';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { useTranslation } from 'react-i18next';
import WordCloud from 'react-wordcloud';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Papa from 'papaparse';
import QRCode from 'qrcode.react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, User, Book, Mic, Home, 
  Trophy, Coins, Settings, LogOut, Shield, Users, BarChart3, Check, X,
  Download, Wifi, WifiOff, Globe, Languages, Trash2, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import { offlineStorage, useOfflineStorage } from './lib/indexedDB';
import i18n, { isRTL, getDirection } from './lib/i18n';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for auth
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Enhanced Auth Provider with offline support
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const storage = useOfflineStorage();

  useEffect(() => {
    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Setup offline storage network listener
    offlineStorage.setupNetworkListener(axios);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        if (isOnline) {
          await fetchUser();
        } else {
          // Load user from offline storage
          const userData = await offlineStorage.getUserData();
          if (userData && userData.user) {
            setUser(userData.user);
          }
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();
  }, [token, isOnline]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      
      // Save to offline storage
      await offlineStorage.saveUserData(response.data, token);
    } catch (error) {
      console.error('Auth fetch error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, mfaCode = null) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { 
        email, 
        password, 
        mfa_code: mfaCode 
      });
      
      const { access_token, user: userData, mfa_required } = response.data;
      
      if (mfa_required) {
        return { mfaRequired: true, user: userData };
      }
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Save to offline storage
      await offlineStorage.saveUserData(userData, access_token);
      
      return { user: userData };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email, password, role) => {
    try {
      const response = await axios.post(`${API}/auth/signup`, { email, password, role });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Save to offline storage
      await offlineStorage.saveUserData(userData, access_token);
      
      return userData;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear offline storage
    await offlineStorage.clearUserData();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      loading, 
      isOnline,
      storage 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Enhanced Landing Page with comprehensive guides and RTL support
const LandingPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const direction = getDirection(currentLang);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [expandedGuide, setExpandedGuide] = useState(null);
  
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    document.dir = getDirection(lang);
  };

  // How to Use data for different roles
  const howToUseGuides = {
    end_user: {
      title: "For Students, Parents & Teachers",
      icon: <User className="w-6 h-6" />,
      steps: [
        { icon: <Book className="w-5 h-5" />, text: "Browse story library and choose age-appropriate stories" },
        { icon: <Play className="w-5 h-5" />, text: "Listen to interactive audio stories with voice narration" },
        { icon: <Trophy className="w-5 h-5" />, text: "Complete quizzes and learn new vocabulary words" },
        { icon: <Coins className="w-5 h-5" />, text: "Earn coins and badges for story completion" },
        { icon: <Download className="w-5 h-5" />, text: "Download stories for offline learning anywhere" }
      ]
    },
    creator: {
      title: "For Story Creators",
      icon: <Book className="w-6 h-6" />,
      steps: [
        { icon: <User className="w-5 h-5" />, text: "Sign up as a Story Creator and verify your account" },
        { icon: <Book className="w-5 h-5" />, text: "Write engaging stories following TPRS methodology" },
        { icon: <Globe className="w-5 h-5" />, text: "Add 3-5 vocabulary words repeated 3+ times in your story" },
        { icon: <Check className="w-5 h-5" />, text: "Create interactive quizzes (true/false, multiple choice)" },
        { icon: <Shield className="w-5 h-5" />, text: "Submit for admin review and await publication" }
      ]
    },
    narrator: {
      title: "For Voice Narrators",
      icon: <Mic className="w-6 h-6" />,
      steps: [
        { icon: <User className="w-5 h-5" />, text: "Register as a Voice Narrator with audio experience" },
        { icon: <Book className="w-5 h-5" />, text: "Browse published stories that need narration" },
        { icon: <Mic className="w-5 h-5" />, text: "Record high-quality audio or upload audio files" },
        { icon: <Volume2 className="w-5 h-5" />, text: "Use voice-to-text features for script creation" },
        { icon: <Shield className="w-5 h-5" />, text: "Submit narrations for admin approval" }
      ]
    },
    admin: {
      title: "For Administrators",
      icon: <Shield className="w-6 h-6" />,
      steps: [
        { icon: <Users className="w-5 h-5" />, text: "Manage user accounts and system permissions" },
        { icon: <Check className="w-5 h-5" />, text: "Review and approve story content and narrations" },
        { icon: <BarChart3 className="w-5 h-5" />, text: "Monitor analytics and generate NGO reports" },
        { icon: <Shield className="w-5 h-5" />, text: "Ensure content quality and TPRS compliance" },
        { icon: <Settings className="w-5 h-5" />, text: "Configure platform settings and partnerships" }
      ]
    }
  };

  // PWA Installation Guide
  const pwaGuide = {
    title: "Install StoryBridge App",
    subtitle: "Get the full app experience on your device",
    steps: [
      { 
        platform: "Android (Chrome)",
        icon: <Download className="w-5 h-5" />,
        steps: [
          "Open StoryBridge in Chrome browser",
          "Tap the menu (⋮) in top right corner", 
          "Select 'Add to Home screen'",
          "Tap 'Install' when prompted",
          "Find StoryBridge icon on your home screen"
        ]
      },
      {
        platform: "iOS (Safari)", 
        icon: <Download className="w-5 h-5" />,
        steps: [
          "Open StoryBridge in Safari browser",
          "Tap the share button (□↑) at the bottom",
          "Scroll down and tap 'Add to Home Screen'",
          "Tap 'Add' to confirm installation", 
          "Launch from your home screen icon"
        ]
      }
    ]
  };

  // FAQ data
  const faqs = [
    {
      question: "How does StoryBridge work offline?",
      answer: "Once you download stories to your device, you can access them completely offline. Your progress, coins, and badges are saved locally and sync when you reconnect to the internet."
    },
    {
      question: "What is TPRS methodology?",
      answer: "Teaching Proficiency through Reading and Storytelling (TPRS) uses compelling stories with repetitive vocabulary to help children naturally acquire language skills through context and engagement."
    },
    {
      question: "How do I earn coins and badges?",
      answer: "You earn 10 coins for each completed story and 5 coins for each correct quiz answer. Badges are awarded for milestones like completing your first story (Story Starter) or learning 10 words (Word Wizard)."
    },
    {
      question: "Can I use StoryBridge in different languages?",
      answer: "Yes! StoryBridge supports English and Arabic with full RTL (right-to-left) layout support. Stories are available in both languages for multilingual learning."
    },
    {
      question: "How do I become a Story Creator or Narrator?",
      answer: "Simply sign up with the Creator or Narrator role. Creators can write and submit stories, while Narrators add voice recordings to bring stories to life. All content goes through admin review."
    },
    {
      question: "Is StoryBridge suitable for children with learning disabilities?",
      answer: "Yes! StoryBridge follows WCAG 2.1 accessibility guidelines with screen reader support, audio cues, large touch targets, and simple navigation designed for children with diverse needs."
    },
    {
      question: "How can NGOs partner with StoryBridge?", 
      answer: "NGOs can access free platform usage, co-branded materials, priority support, and detailed analytics reports. Contact us through the partnership section in Settings for more information."
    }
  ];
  
  return (
    <div className={`min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 ${direction === 'rtl' ? 'rtl' : ''}`} dir={direction}>
      <div className="container mx-auto px-4 py-16">
        {/* Language Switcher */}
        <div className="absolute top-4 right-4">
          <Select value={currentLang} onValueChange={changeLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hero Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Book className="w-24 h-24 mx-auto text-orange-500 mb-6" />
          <h1 className="text-6xl font-bold text-gray-800 mb-4">StoryBridge</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Mobile-first, offline-capable PWA delivering TPRS-based educational stories 
            for children aged 4-10 in low-connectivity environments
          </p>
          
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={() => navigate('/auth')} 
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg"
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="px-8 py-3 text-lg"
            >
              Sign In
            </Button>
          </div>
          
          <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <WifiOff className="w-4 h-4 mr-1" />
              Works 100% Offline
            </div>
            <div className="flex items-center">
              <Globe className="w-4 h-4 mr-1" />
              Arabic & English Support
            </div>
          </div>
        </motion.div>

        {/* How to Use Section */}
        <section className="mb-16">
          <motion.h2 
            className="text-3xl font-bold text-center mb-8 text-gray-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            How to Use StoryBridge
          </motion.h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(howToUseGuides).map(([role, guide], index) => (
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4 text-orange-600">
                      {guide.icon}
                      <h3 className="ml-2 font-semibold">{guide.title}</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {guide.steps.map((step, stepIndex) => (
                        <div key={stepIndex} className="flex items-start space-x-2">
                          <div className="text-orange-500 mt-0.5">{step.icon}</div>
                          <p className="text-sm text-gray-600 leading-relaxed">{step.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* PWA Installation Guide */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
              {pwaGuide.title}
            </h2>
            <p className="text-center text-gray-600 mb-8">{pwaGuide.subtitle}</p>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {pwaGuide.steps.map((platform, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4 text-blue-600">
                      {platform.icon}
                      <h3 className="ml-2 font-semibold text-lg">{platform.platform}</h3>
                    </div>
                    
                    <ol className="space-y-2">
                      {platform.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="flex items-start">
                          <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0">
                            {stepIndex + 1}
                          </span>
                          <span className="text-gray-700 text-sm leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-800">
              Frequently Asked Questions
            </h2>
            
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                      className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">{faq.question}</h3>
                        <motion.div
                          animate={{ rotate: expandedFAQ === index ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          ▼
                        </motion.div>
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {expandedFAQ === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="px-6 pb-4">
                            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
};

// Enhanced Auth Page with better error handling
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('end_user');
  const [mfaCode, setMfaCode] = useState('');
  const [showMFA, setShowMFA] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, signup, isOnline } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!isOnline && !isLogin) {
      toast({
        title: "Connection Required",
        description: "You need an internet connection to create an account",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }
    
    try {
      if (isLogin) {
        const result = await login(email, password, showMFA ? mfaCode : null);
        
        if (result.mfaRequired) {
          setShowMFA(true);
          toast({
            title: "MFA Required",
            description: "Please enter your authentication code",
          });
          setLoading(false);
          return;
        }
        
        toast({
          title: "Welcome back!",
          description: "Successfully signed in. Redirecting...",
        });
      } else {
        await signup(email, password, role);
        toast({
          title: "Account Created!",
          description: "Welcome to StoryBridge! Redirecting...",
        });
      }
      
      setTimeout(() => navigate('/dashboard'), 1000);
      
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Something went wrong. Please try again.';
      
      toast({
        title: isLogin ? "Sign In Failed" : "Sign Up Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-4 left-4 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm flex items-center">
          <WifiOff className="w-4 h-4 mr-1" />
          Offline Mode
        </div>
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Book className="w-12 h-12 mx-auto text-orange-500 mb-2" />
            <CardTitle className="text-2xl">
              {isLogin ? "Welcome Back!" : "Join StoryBridge"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!showMFA ? (
                <>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  {!isLogin && (
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="end_user">Student/Parent/Teacher</SelectItem>
                          <SelectItem value="creator">Story Creator</SelectItem>
                          <SelectItem value="narrator">Voice Narrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <Label htmlFor="mfaCode">Authentication Code</Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    required
                    className="mt-1"
                    placeholder="Enter 6-digit code"
                  />
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : (
                  showMFA ? 'Verify Code' : (isLogin ? "Sign In" : "Create Account")
                )}
              </Button>
              
              {!showMFA && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'end_user':
        return <EndUserDashboard />;
      case 'creator':
        return <CreatorDashboard />;
      case 'narrator':
        return <NarratorDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Book className="w-8 h-8 text-orange-500" />
            <h1 className="text-xl font-semibold">StoryBridge</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              {user?.email} ({user?.role})
            </span>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      {getDashboardComponent()}
    </div>
  );
};

// Simplified End User Dashboard
const EndUserDashboard = () => {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [badges, setBadges] = useState([]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchStories();
    loadProgress();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await axios.get(`${API}/stories`);
      setStories(response.data);
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast({
        title: "Error",
        description: "Failed to load stories",
        variant: "destructive",
      });
    }
  };

  const loadProgress = async () => {
    try {
      const [progressRes, badgesRes] = await Promise.all([
        axios.get(`${API}/progress/user`),
        axios.get(`${API}/badges/user`)
      ]);
      
      const progress = progressRes.data;
      const totalCoins = progress.reduce((sum, p) => sum + p.coins_earned, 0);
      setTotalCoins(totalCoins);
      setBadges(badgesRes.data);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  if (selectedStory) {
    return <StoryPlayer story={selectedStory} onComplete={() => setSelectedStory(null)} />;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Story Library</h2>
        <div className="flex items-center space-x-4">
          <div className="bg-yellow-100 px-4 py-2 rounded-full flex items-center">
            <Coins className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="font-semibold">{totalCoins}</span>
          </div>
          {badges.map((badge, index) => (
            <Badge key={index} className="bg-purple-100 text-purple-800">
              <Trophy className="w-4 h-4 mr-1" />
              {badge.badge_type}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story) => (
          <Card key={story.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-2">{story.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{story.text.substring(0, 100)}...</p>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{story.language}</Badge>
                  <Badge variant="outline">{story.age_group}</Badge>
                </div>
                
                <Button 
                  onClick={() => setSelectedStory(story)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Simple Story Player
const StoryPlayer = ({ story, onComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [coins, setCoins] = useState(0);
  
  const { toast } = useToast();

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleQuizAnswer = (answer) => {
    const quiz = story.quizzes[currentQuizIndex];
    const isCorrect = answer === quiz.answer;
    
    if (isCorrect) {
      setCoins(prev => prev + 5);
      toast({
        title: "Correct!",
        description: "+5 coins earned!",
      });
    }
    
    setQuizAnswers({...quizAnswers, [currentQuizIndex]: answer});
    
    if (currentQuizIndex < story.quizzes.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      handleStoryComplete();
    }
  };

  const handleStoryComplete = async () => {
    try {
      const progress = {
        story_id: story.id,
        completed: true,
        time_spent: 300, // 5 minutes
        vocabulary_learned: story.vocabulary.map(word => ({word, learned: true, repetitions: 3})),
        quiz_results: story.quizzes.map((quiz, index) => ({
          question: quiz.question,
          answer: quizAnswers[index],
          correct: quizAnswers[index] === quiz.answer
        })),
        coins_earned: 10 + coins
      };
      
      await axios.post(`${API}/progress`, progress);
      
      toast({
        title: "Story Complete!",
        description: `+${10 + coins} coins earned! Well done!`,
      });
      
      setTimeout(onComplete, 2000);
    } catch (error) {
      console.error('Error saving progress:', error);
      onComplete();
    }
  };

  const currentQuiz = story.quizzes[currentQuizIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={onComplete}
            className="mb-4"
          >
            ← Back to Library
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
          <div className="flex items-center space-x-2 mb-4">
            <Badge>{story.language}</Badge>
            <Badge>{story.age_group}</Badge>
            <div className="flex items-center">
              <Coins className="w-4 h-4 mr-1" />
              <span>{coins} coins</span>
            </div>
          </div>
        </div>

        {!showQuiz ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-lg leading-relaxed mb-6">{story.text}</p>
              
              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={handlePlayPause}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>
                
                <Button 
                  onClick={() => setShowQuiz(true)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  Start Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold mb-4">
                Quiz Question {currentQuizIndex + 1} of {story.quizzes.length}
              </h3>
              
              <p className="text-lg mb-6">{currentQuiz.question}</p>
              
              <div className="space-y-3">
                {currentQuiz.type === 'true_false' ? (
                  <>
                    <Button 
                      onClick={() => handleQuizAnswer(true)}
                      className="w-full bg-green-500 hover:bg-green-600"
                    >
                      True
                    </Button>
                    <Button 
                      onClick={() => handleQuizAnswer(false)}
                      className="w-full bg-red-500 hover:bg-red-600"
                    >
                      False
                    </Button>
                  </>
                ) : currentQuiz.options ? (
                  currentQuiz.options.map((option, index) => (
                    <Button 
                      key={index}
                      onClick={() => handleQuizAnswer(option)}
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      {option}
                    </Button>
                  ))
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Creator Dashboard with SVG Upload
const CreatorDashboard = () => {
  const [stories, setStories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    text: '',
    language: 'en',
    age_group: '4-6',
    vocabulary: '',
    quizzes: ''
  });
  const [uploadedImages, setUploadedImages] = useState([]);
  
  const { toast } = useToast();
  const { isOnline } = useAuth();

  useEffect(() => {
    fetchCreatorStories();
  }, []);

  const fetchCreatorStories = async () => {
    try {
      const response = await axios.get(`${API}/stories/creator`);
      setStories(response.data);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    const validFiles = files.filter(file => {
      if (!file.type.includes('svg')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an SVG file`,
          variant: "destructive"
        });
        return false;
      }
      
      if (file.size > 500 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 500KB limit`,
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });

    if (uploadedImages.length + validFiles.length > 5) {
      toast({
        title: "Too many images",
        description: "Maximum 5 images allowed per story",
        variant: "destructive"
      });
      return;
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = {
          id: Date.now() + Math.random(),
          file: file,
          preview: e.target.result,
          name: file.name
        };
        setUploadedImages(prev => [...prev, imageData]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast({
        title: "Connection Required",
        description: "You need an internet connection to submit stories",
        variant: "destructive",
      });
      return;
    }

    try {
      const formPayload = new FormData();
      
      formPayload.append('title', formData.title);
      formPayload.append('text', formData.text);
      formPayload.append('language', formData.language);
      formPayload.append('age_group', formData.age_group);
      formPayload.append('vocabulary', JSON.stringify(formData.vocabulary.split(',').map(w => w.trim()).filter(w => w)));
      formPayload.append('quizzes', formData.quizzes || '[]');
      
      uploadedImages.forEach((img) => {
        formPayload.append('images', img.file);
      });
      
      const response = await fetch(`${API}/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formPayload
      });
      
      if (!response.ok) throw new Error('Failed to create story');
      
      toast({
        title: "Story created!",
        description: "Your story has been saved as a draft.",
      });
      
      setFormData({title: '', text: '', language: 'en', age_group: '4-6', vocabulary: '', quizzes: ''});
      setUploadedImages([]);
      setShowForm(false);
      fetchCreatorStories();
    } catch (error) {
      console.error('Error submitting story:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create story",
        variant: "destructive",
      });
    }
  };

  const handleSubmitForReview = async (storyId) => {
    try {
      await axios.patch(`${API}/stories/${storyId}/submit`);
      
      toast({
        title: "Story submitted!",
        description: "Your story has been submitted for admin review.",
      });
      
      fetchCreatorStories();
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to submit story",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Stories</h2>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Book className="w-4 h-4 mr-2" />
          Create New Story
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Story</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="text">Story Text</Label>
                <Textarea
                  id="text"
                  value={formData.text}
                  onChange={(e) => setFormData({...formData, text: e.target.value})}
                  required
                  rows={6}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({...formData, language: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="age_group">Age Group</Label>
                  <Select value={formData.age_group} onValueChange={(value) => setFormData({...formData, age_group: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4-6">Ages 4-6</SelectItem>
                      <SelectItem value="7-10">Ages 7-10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="vocabulary">Vocabulary Words (comma-separated)</Label>
                <Input
                  id="vocabulary"
                  value={formData.vocabulary}
                  onChange={(e) => setFormData({...formData, vocabulary: e.target.value})}
                  placeholder="brave, fly, sparrow"
                />
              </div>
              
              <div>
                <Label htmlFor="quizzes">Quiz Questions (JSON format)</Label>
                <Textarea
                  id="quizzes"
                  value={formData.quizzes}
                  onChange={(e) => setFormData({...formData, quizzes: e.target.value})}
                  placeholder='[{"type": "true_false", "question": "The sparrow was brave?", "answer": true}]'
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="images">SVG Images (max 5, 500KB each)</Label>
                <Input
                  id="images"
                  type="file"
                  accept=".svg"
                  multiple
                  onChange={handleImageUpload}
                />
                
                {uploadedImages.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {uploadedImages.map((img) => (
                      <div key={img.id} className="relative border rounded p-2">
                        <p className="text-sm truncate">{img.name}</p>
                        <button
                          type="button"
                          onClick={() => setUploadedImages(prev => prev.filter(i => i.id !== img.id))}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4">
                <Button type="submit" className="bg-green-500 hover:bg-green-600">
                  Save as Draft
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story) => (
          <Card key={story.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg">{story.title}</h3>
                <Badge variant={story.status === 'published' ? 'default' : story.status === 'pending' ? 'secondary' : 'outline'}>
                  {story.status}
                </Badge>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{story.text.substring(0, 100)}...</p>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{story.language}</Badge>
                  <Badge variant="outline">{story.age_group}</Badge>
                </div>
                
                {story.status === 'draft' && (
                  <Button 
                    onClick={() => handleSubmitForReview(story.id)}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Submit for Review
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Simplified Narrator Dashboard
const NarratorDashboard = () => {
  const [stories, setStories] = useState([]);
  const [narrations, setNarrations] = useState([]);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storiesRes, narrationsRes] = await Promise.all([
        axios.get(`${API}/stories?status=published`),
        axios.get(`${API}/narrations/narrator`)
      ]);
      
      setStories(storiesRes.data);
      setNarrations(narrationsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Narrator Dashboard</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Stories Needing Narration</h3>
          <div className="space-y-4">
            {stories.filter(story => !narrations.some(n => n.story_id === story.id)).map((story) => (
              <Card key={story.id}>
                <CardContent className="p-4">
                  <h4 className="font-semibold">{story.title}</h4>
                  <p className="text-sm text-gray-600">{story.text.substring(0, 100)}...</p>
                  <Button className="mt-2" size="sm">
                    Add Narration
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">My Narrations</h3>
          <div className="space-y-4">
            {narrations.map((narration) => (
              <Card key={narration.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Narration #{narration.id.substring(0, 8)}</span>
                    <Badge>{narration.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simplified Admin Dashboard
const AdminDashboard = () => {
  const [pendingContent, setPendingContent] = useState({stories: [], narrations: []});
  const [analytics, setAnalytics] = useState(null);
  
  useEffect(() => {
    fetchPendingContent();
    fetchAnalytics();
  }, []);

  const fetchPendingContent = async () => {
    try {
      const response = await axios.get(`${API}/admin/pending`);
      setPendingContent(response.data);
    } catch (error) {
      console.error('Error fetching pending content:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/ngo`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleApprove = async (type, id) => {
    try {
      await axios.patch(`${API}/admin/content/${type}/${id}/approve`);
      fetchPendingContent();
    } catch (error) {
      console.error('Error approving content:', error);
    }
  };

  const handleReject = async (type, id) => {
    try {
      await axios.patch(`${API}/admin/content/${type}/${id}/reject`, {
        notes: 'Content does not meet quality standards'
      });
      fetchPendingContent();
    } catch (error) {
      console.error('Error rejecting content:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Pending Stories</h3>
          <div className="space-y-4">
            {pendingContent.stories.map((story) => (
              <Card key={story.id}>
                <CardContent className="p-4">
                  <h4 className="font-semibold">{story.title}</h4>
                  <p className="text-sm text-gray-600 mb-4">{story.text.substring(0, 100)}...</p>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleApprove('story', story.id)}
                      size="sm" 
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      onClick={() => handleReject('story', story.id)}
                      size="sm" 
                      variant="destructive"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-4">Analytics Overview</h3>
          {analytics && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Active Users</span>
                    <span className="font-semibold">{analytics.active_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stories Completed</span>
                    <span className="font-semibold">{analytics.stories_completed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Session Time</span>
                    <span className="font-semibold">{analytics.avg_session_time} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vocabulary Retention</span>
                    <span className="font-semibold">{analytics.vocabulary_retention_rate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Book className="w-16 h-16 mx-auto text-orange-500 mb-4 animate-spin" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/auth" replace />;
};

// PWA Install Prompt Component
const PWAInstallPrompt = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  if (!showInstallPrompt) return null;

  return (
    <motion.div 
      className="fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 border"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Book className="w-8 h-8 text-orange-500" />
          <div>
            <p className="font-semibold">Install StoryBridge</p>
            <p className="text-sm text-gray-600">Get the full offline experience</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowInstallPrompt(false)}
            variant="outline"
            size="sm"
          >
            Later
          </Button>
          <Button 
            onClick={handleInstallClick}
            size="sm"
          >
            Install
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// Main App Component with PWA and i18n support
function App() {
  const { t } = useTranslation();

  // Add language direction to document
  useEffect(() => {
    document.dir = getDirection(i18n.language);
  }, []);

  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <PWAInstallPrompt />
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export default App;