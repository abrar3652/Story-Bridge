import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Howl } from 'howler';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { useTranslation } from 'react-i18next';
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
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, mfaCode = null) => {
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
  };

  const signup = async (email, password, role) => {
    const response = await axios.post(`${API}/auth/signup`, { email, password, role });
    const { access_token, user: userData } = response.data;
    
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    // Save to offline storage
    await offlineStorage.saveUserData(userData, access_token);
    
    return userData;
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
              <Languages className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Book className="w-24 h-24 mx-auto text-orange-500 mb-4" />
            <h1 className="text-5xl font-bold text-gray-800 mb-4 font-serif">
              {t('landing.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('landing.subtitle')}
            </p>
          </motion.div>
          
          <motion.div 
            className="bg-green-100 border border-green-400 rounded-lg p-4 mb-8 inline-block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <p className="text-green-800 font-medium">{t('landing.offline_badge')}</p>
          </motion.div>
          
          <motion.div 
            className="space-y-4 max-w-md mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg rounded-xl"
            >
              {t('landing.get_started')}
            </Button>
            <p className="text-sm text-gray-500">{t('landing.join_message')}</p>
          </motion.div>
        </div>
        
        {/* Features Grid */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <Play className="w-12 h-12 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('feature.interactive_stories.title')}</h3>
              <p className="text-gray-600">{t('feature.interactive_stories.desc')}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <Coins className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('feature.earn_rewards.title')}</h3>
              <p className="text-gray-600">{t('feature.earn_rewards.desc')}</p>
            </CardContent>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <Volume2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('feature.offline_learning.title')}</h3>
              <p className="text-gray-600">{t('feature.offline_learning.desc')}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* How to Use Section */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">How to Use StoryBridge</h2>
          <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
            StoryBridge is designed for different types of users. Choose your role below to see how to get started.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {Object.entries(howToUseGuides).map(([roleKey, guide]) => (
              <motion.div key={roleKey} whileHover={{ y: -5 }}>
                <Card className="h-full cursor-pointer" onClick={() => setExpandedGuide(expandedGuide === roleKey ? null : roleKey)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center space-x-3 text-lg">
                      {guide.icon}
                      <span>{guide.title}</span>
                      <motion.div 
                        animate={{ rotate: expandedGuide === roleKey ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SkipForward className="w-4 h-4 transform rotate-90" />
                      </motion.div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AnimatePresence>
                      {expandedGuide === roleKey && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="space-y-3">
                            {guide.steps.map((step, index) => (
                              <motion.div 
                                key={index}
                                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                              >
                                <div className="text-orange-500 mt-0.5">{step.icon}</div>
                                <span className="text-sm text-gray-700">{step.text}</span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* PWA Installation Guide */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">{pwaGuide.title}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{pwaGuide.subtitle}</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pwaGuide.steps.map((platform, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    {platform.icon}
                    <span>{platform.platform}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {platform.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center mt-0.5">
                          {stepIndex + 1}
                        </div>
                        <span className="text-sm text-gray-700">{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions about StoryBridge features and functionality.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <motion.div key={index} className="mb-4" whileHover={{ scale: 1.01 }}>
                <Card 
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex justify-between items-center text-lg">
                      <span className="text-left">{faq.question}</span>
                      <motion.div
                        animate={{ rotate: expandedFAQ === index ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SkipForward className="w-5 h-5 transform rotate-90 text-orange-500" />
                      </motion.div>
                    </CardTitle>
                  </CardHeader>
                  <AnimatePresence>
                    {expandedFAQ === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CardContent className="pt-0">
                          <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* NGO Partnership Info */}
        <motion.div 
          className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <Users className="w-16 h-16 mx-auto text-blue-500 mb-4" />
          <h3 className="text-2xl font-bold text-gray-800 mb-4">NGO Partnerships</h3>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            StoryBridge partners with NGOs worldwide to provide free educational content for underserved communities. 
            Get co-branded materials, analytics, and priority support for your educational initiatives.
          </p>
          <Button 
            variant="outline" 
            className="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
            onClick={() => navigate('/auth')}
          >
            Learn About Partnerships
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

// Enhanced Auth Component with MFA support
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
        title: t('error.network'),
        description: t('message.offline_mode'),
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
          title: t('auth.welcome_back'),
          description: "Redirecting to your dashboard...",
        });
      } else {
        await signup(email, password, role);
        toast({
          title: t('message.account_created'),
          description: "Redirecting to your dashboard...",
        });
      }
      
      setTimeout(() => navigate('/dashboard'), 1000);
      
    } catch (error) {
      toast({
        title: t('error.general'),
        description: error.response?.data?.detail || t('error.network'),
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
              {isLogin ? t('auth.welcome_back') : t('auth.join_storybridge')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!showMFA ? (
                <>
                  <div>
                    <Label htmlFor="email">{t('auth.email')}</Label>
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
                    <Label htmlFor="password">{t('auth.password')}</Label>
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
                      <Label htmlFor="role">{t('auth.role')}</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="end_user">{t('auth.role.end_user')}</SelectItem>
                          <SelectItem value="creator">{t('auth.role.creator')}</SelectItem>
                          <SelectItem value="narrator">{t('auth.role.narrator')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <Label htmlFor="mfa">Authentication Code</Label>
                  <Input
                    id="mfa"
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    className="mt-1 text-center text-lg tracking-widest"
                  />
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.please_wait') : (
                  showMFA ? 'Verify Code' : (isLogin ? t('auth.sign_in') : t('auth.create_account'))
                )}
              </Button>
              
              {!showMFA && (
                <p className="text-center text-sm text-gray-600">
                  {isLogin ? t('auth.no_account') : t('auth.have_account')}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-orange-500 hover:underline ml-1"
                  >
                    {isLogin ? t('auth.sign_up') : t('auth.sign_in')}
                  </button>
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

// Enhanced Story Player with real quiz validation and TPRS features
const StoryPlayer = ({ story, onComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [sound, setSound] = useState(null);
  const [vocabularyProgress, setVocabularyProgress] = useState({});
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [tprsCheckpoints, setTprsCheckpoints] = useState([]);
  
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, storage, isOnline } = useAuth();

  // Swipe handlers for mobile navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => skipForward(),
    onSwipedRight: () => skipBackward(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  useEffect(() => {
    loadAudio();
    calculateTRPSCheckpoints();
    
    return () => {
      if (sound) {
        sound.unload();
      }
    };
  }, [story]);

  const loadAudio = async () => {
    try {
      let audioSrc = null;
      
      // Try to get real audio from backend
      if (story.audio_id && isOnline) {
        audioSrc = `${API}/audio/${story.audio_id}`;
      } else if (story.audio_id) {
        // Try cached audio
        const cachedAudio = await storage.getCachedAudioFile(story.audio_id);
        if (cachedAudio) {
          const audioBlob = new Blob([cachedAudio], { type: 'audio/mpeg' });
          audioSrc = URL.createObjectURL(audioBlob);
        }
      }
      
      // Fallback to mock audio if no real audio available
      if (!audioSrc) {
        audioSrc = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzqV3/DFdiABGnze7t+QQQ8OTaXl7apSGQpBnN7zv2oh';
      }
      
      const newSound = new Howl({
        src: [audioSrc],
        format: ['mp3', 'wav'],
        onload: () => {
          setDuration(newSound.duration() || 30); // Fallback to 30 seconds for mock
        },
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onend: () => {
          setIsPlaying(false);
          setShowQuiz(true);
        },
        onloaderror: (id, error) => {
          console.warn('Audio load error, using mock duration:', error);
          setDuration(30);
        }
      });
      
      setSound(newSound);
    } catch (error) {
      console.error('Error loading audio:', error);
      // Create silent mock sound for offline fallback
      const mockSound = {
        play: () => setIsPlaying(true),
        pause: () => setIsPlaying(false),
        seek: () => {},
        duration: () => 30,
        unload: () => {}
      };
      setSound(mockSound);
      setDuration(30);
    }
  };

  const calculateTRPSCheckpoints = () => {
    // Calculate TPRS checkpoints for auto-pause and comprehension checks
    const checkpoints = [];
    const storyWords = story.text.split(' ');
    
    story.vocabulary.forEach(vocabWord => {
      let count = 0;
      storyWords.forEach((word, index) => {
        if (word.toLowerCase().includes(vocabWord.toLowerCase())) {
          count++;
          if (count === 3 || count === 5 || count === 7) {
            // Add checkpoint after 3rd, 5th, and 7th repetition
            checkpoints.push({
              wordIndex: index,
              vocabulary: vocabWord,
              repetition: count,
              timeEstimate: (index / storyWords.length) * (duration || 30)
            });
          }
        }
      });
    });
    
    setTprsCheckpoints(checkpoints);
  };

  const togglePlay = () => {
    if (sound) {
      if (isPlaying) {
        sound.pause();
      } else {
        sound.play();
        
        // Start TPRS checkpoint monitoring
        if (tprsCheckpoints.length > 0) {
          monitorTRPSCheckpoints();
        }
      }
    }
  };

  const monitorTRPSCheckpoints = () => {
    const checkInterval = setInterval(() => {
      if (!isPlaying || !sound) {
        clearInterval(checkInterval);
        return;
      }
      
      const currentPos = sound.seek() || 0;
      
      tprsCheckpoints.forEach(checkpoint => {
        if (Math.abs(currentPos - checkpoint.timeEstimate) < 1 && !checkpoint.triggered) {
          checkpoint.triggered = true;
          
          // Pause and show comprehension check
          sound.pause();
          showComprehensionCheck(checkpoint);
          
          clearInterval(checkInterval);
        }
      });
    }, 1000);
  };

  const showComprehensionCheck = (checkpoint) => {
    toast({
      title: "New Word Alert! 📚",
      description: `You heard "${checkpoint.vocabulary}" ${checkpoint.repetition} times!`,
      duration: 3000,
    });
    
    // Update vocabulary progress
    setVocabularyProgress(prev => ({
      ...prev,
      [checkpoint.vocabulary]: (prev[checkpoint.vocabulary] || 0) + 1
    }));
    
    // Auto-resume after 3 seconds
    setTimeout(() => {
      if (sound) sound.play();
    }, 3000);
  };

  const skipForward = () => {
    if (sound) {
      const newTime = Math.min(currentTime + 15, duration);
      sound.seek(newTime);
      setCurrentTime(newTime);
    }
  };

  const skipBackward = () => {
    if (sound) {
      const newTime = Math.max(currentTime - 15, 0);
      sound.seek(newTime);
      setCurrentTime(newTime);
    }
  };

  const handleQuizAnswer = async (answer) => {
    const currentQuiz = story.quizzes[currentQuizIndex];
    let isCorrect = false;
    
    // Enhanced quiz validation
    switch (currentQuiz.type) {
      case 'true_false':
        isCorrect = answer === currentQuiz.answer;
        break;
      case 'multiple_choice':
        isCorrect = answer === currentQuiz.answer;
        break;
      case 'fill_blank':
        const cleanAnswer = answer.toLowerCase().trim();
        const correctAnswer = currentQuiz.answer.toLowerCase().trim();
        isCorrect = cleanAnswer === correctAnswer || cleanAnswer.includes(correctAnswer);
        break;
      default:
        isCorrect = false;
    }
    
    const newAnswers = [...quizAnswers, { answer, correct: isCorrect }];
    setQuizAnswers(newAnswers);
    
    // Show feedback with animation
    toast({
      title: isCorrect ? "Correct! 🎉" : "Try again! 💪",
      description: isCorrect ? "+5 coins earned!" : "Keep learning!",
      variant: isCorrect ? "default" : "destructive"
    });

    if (currentQuizIndex < story.quizzes.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      // Quiz completed - calculate rewards
      const correctAnswers = newAnswers.filter(qa => qa.correct).length;
      const earnedCoins = 10 + (correctAnswers * 5); // 10 for story + 5 per correct answer
      setCoinsEarned(earnedCoins);
      
      // Save progress offline
      await saveProgressOffline(correctAnswers, newAnswers, earnedCoins);
      
      toast({
        title: t('progress.story_completed'),
        description: t('progress.earned_coins', { coins: earnedCoins }),
      });
      
      setTimeout(() => {
        onComplete(earnedCoins);
      }, 2000);
    }
  };

  const saveProgressOffline = async (correctAnswers, answers, coins) => {
    if (!user) return;
    
    const progressData = {
      story_id: story.id,
      completed: true,
      time_spent: Math.round(currentTime || duration),
      vocabulary_learned: Object.entries(vocabularyProgress).map(([word, reps]) => ({
        word,
        repetitions: reps,
        learned: reps >= 7 // Consider learned after 7 repetitions
      })),
      quiz_results: answers,
      coins_earned: coins,
      badges_earned: [], // Will be calculated by backend
      updated_at: new Date().toISOString()
    };
    
    // Save to offline storage
    await storage.saveProgress(user.id, story.id, progressData);
    
    // Save vocabulary progress
    for (const [word, reps] of Object.entries(vocabularyProgress)) {
      await storage.saveVocab(user.id, word, reps, reps >= 7);
    }
    
    // Add coins offline
    await storage.addCoins(user.id, coins);
    
    // Try to sync if online
    if (isOnline) {
      try {
        await axios.post(`${API}/progress`, progressData);
        console.log('Progress synced successfully');
      } catch (error) {
        console.log('Sync failed, will retry when online');
      }
    }
  };

  const handleVocabularyClick = (word) => {
    setSelectedWord(word);
    setShowVocabModal(true);
    
    // Play word pronunciation (mock)
    if (sound) {
      const wordSound = new Howl({
        src: [`data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a`],
        volume: 0.5
      });
      wordSound.play();
    }
  };

  if (showQuiz && story.quizzes.length > 0) {
    const currentQuiz = story.quizzes[currentQuizIndex];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4" {...swipeHandlers}>
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">
                  {t('player.question_x_of_y', { 
                    current: currentQuizIndex + 1, 
                    total: story.quizzes.length 
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <p className="text-lg">{currentQuiz.question}</p>
                
                <AnimatePresence mode="wait">
                  {currentQuiz.type === 'true_false' && (
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Button 
                        onClick={() => handleQuizAnswer(true)}
                        className="w-full bg-green-500 hover:bg-green-600 text-lg py-4"
                      >
                        {t('player.true')}
                      </Button>
                      <Button 
                        onClick={() => handleQuizAnswer(false)}
                        className="w-full bg-red-500 hover:bg-red-600 text-lg py-4"
                      >
                        {t('player.false')}
                      </Button>
                    </motion.div>
                  )}
                  
                  {currentQuiz.type === 'multiple_choice' && (
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      {currentQuiz.options.map((option, index) => (
                        <Button 
                          key={index}
                          onClick={() => handleQuizAnswer(option)}
                          className="w-full text-lg py-4"
                          variant="outline"
                        >
                          {option}
                        </Button>
                      ))}
                    </motion.div>
                  )}
                  
                  {currentQuiz.type === 'fill_blank' && (
                    <motion.div 
                      className="space-y-3"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Input 
                        placeholder={t('player.type_answer')}
                        className="text-lg py-4"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleQuizAnswer(e.target.value);
                          }
                        }}
                      />
                      <Button 
                        onClick={(e) => {
                          const input = e.target.parentElement.querySelector('input');
                          handleQuizAnswer(input.value);
                        }}
                        className="w-full text-lg py-4"
                      >
                        {t('player.submit_answer')}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4" {...swipeHandlers}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="mb-6">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{story.title}</CardTitle>
              <Badge variant="secondary">{story.age_group} years</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-8">
                <div className="bg-white rounded-lg p-8 mb-6 shadow-inner">
                  <Book className="w-24 h-24 mx-auto text-orange-500 mb-4" />
                  <p className="text-lg leading-relaxed text-gray-700">
                    {story.text}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-center space-x-4">
                    <Button onClick={skipBackward} variant="outline" size="lg">
                      <SkipBack className="w-6 h-6" />
                    </Button>
                    <Button onClick={togglePlay} size="lg" className="px-8">
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                    </Button>
                    <Button onClick={skipForward} variant="outline" size="lg">
                      <SkipForward className="w-6 h-6" />
                    </Button>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <Progress value={(currentTime / duration) * 100} className="h-2" />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>{Math.floor(currentTime)}s</span>
                      <span>{Math.floor(duration)}s</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {story.vocabulary.length > 0 && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-3">{t('player.new_words')}</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {story.vocabulary.map((word, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-sm cursor-pointer hover:bg-orange-100"
                        onClick={() => handleVocabularyClick(word)}
                      >
                        {word}
                        {vocabularyProgress[word] && (
                          <span className="ml-1 text-xs">({vocabularyProgress[word]}x)</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Vocabulary Modal */}
      <Dialog open={showVocabModal} onOpenChange={setShowVocabModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Word: {selectedWord}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Repetitions: {vocabularyProgress[selectedWord] || 0}</p>
            <p>Status: {(vocabularyProgress[selectedWord] || 0) >= 7 ? "Learned ✅" : "Learning 📚"}</p>
            <Button onClick={() => setShowVocabModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Continue with the rest of the enhanced components...
// Enhanced End User Dashboard with offline support
const EndUserDashboard = () => {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [userProgress, setUserProgress] = useState([]);
  const [totalCoins, setTotalCoins] = useState(0);
  const [badges, setBadges] = useState([]);
  const [ageFilter, setAgeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  
  const { user, isOnline, storage } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStories(),
        fetchProgress(),
        loadCoinsAndBadges()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStories = async () => {
    try {
      if (isOnline) {
        // Fetch from server
        const response = await axios.get(`${API}/stories`);
        setStories(response.data);
        
        // Cache stories offline
        for (const story of response.data) {
          await storage.cacheStory(story);
        }
      } else {
        // Load from cache
        const cachedStories = await storage.getCachedStories();
        setStories(cachedStories);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      // Fallback to cached stories
      const cachedStories = await storage.getCachedStories();
      setStories(cachedStories);
    }
  };

  const fetchProgress = async () => {
    try {
      if (isOnline) {
        const response = await axios.get(`${API}/progress/user`);
        setUserProgress(response.data);
      } else {
        const offlineProgress = await storage.getProgress(user.id);
        setUserProgress(Array.isArray(offlineProgress) ? offlineProgress : []);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      const offlineProgress = await storage.getProgress(user.id);
      setUserProgress(Array.isArray(offlineProgress) ? offlineProgress : []);
    }
  };

  const loadCoinsAndBadges = async () => {
    try {
      const coins = await storage.getCoins(user.id);
      const userBadges = await storage.getBadges(user.id);
      
      setTotalCoins(coins);
      setBadges(userBadges);
    } catch (error) {
      console.error('Error loading coins/badges:', error);
    }
  };

  const handleStoryComplete = async (coinsEarned) => {
    const newTotal = await storage.addCoins(user.id, coinsEarned);
    setTotalCoins(newTotal);
    setSelectedStory(null);
    
    // Refresh progress
    await fetchProgress();
    
    // Check for new badges
    checkNewBadges();
    
    toast({
      title: t('progress.story_completed'),
      description: t('progress.earned_coins', { coins: coinsEarned }),
    });
  };

  const checkNewBadges = async () => {
    const completedStories = userProgress.filter(p => p.completed).length;
    const vocabulary = await storage.getVocab(user.id);
    const learnedWords = vocabulary.filter(v => v.learned).length;
    
    const newBadges = [];
    
    if (completedStories >= 1 && !badges.includes('story_starter')) {
      newBadges.push('story_starter');
    }
    if (learnedWords >= 10 && !badges.includes('word_wizard')) {
      newBadges.push('word_wizard');
    }
    if (completedStories >= 5 && !badges.includes('quiz_master')) {
      newBadges.push('quiz_master');
    }
    
    if (newBadges.length > 0) {
      const updatedBadges = [...badges, ...newBadges];
      setBadges(updatedBadges);
      await storage.saveBadges(user.id, updatedBadges);
      
      newBadges.forEach(badge => {
        toast({
          title: t('progress.new_badge'),
          description: `${t(`progress.${badge}`)} earned!`,
        });
      });
    }
  };

  const filteredStories = stories.filter(story => 
    ageFilter === 'all' || story.age_group === ageFilter
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Book className="w-16 h-16 mx-auto text-orange-500 mb-4 animate-spin" />
          <p>{t('action.loading')}</p>
        </div>
      </div>
    );
  }

  if (selectedStory) {
    return <StoryPlayer story={selectedStory} onComplete={handleStoryComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Offline Indicator */}
        {!isOnline && (
          <motion.div 
            className="bg-orange-100 border border-orange-400 rounded-lg p-3 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-center">
              <WifiOff className="w-4 h-4 mr-2 text-orange-600" />
              <span className="text-orange-800">{t('message.offline_mode')}</span>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div 
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{t('dashboard.story_library')}</h1>
            <p className="text-gray-600">{t('dashboard.choose_story')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <motion.div 
              className="flex items-center space-x-2 bg-yellow-100 px-4 py-2 rounded-full"
              whileHover={{ scale: 1.05 }}
            >
              <Coins className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-700">{totalCoins}</span>
            </motion.div>
            <div className="flex items-center space-x-2">
              {badges.map((badge, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Badge className="bg-purple-100 text-purple-800">
                    <Trophy className="w-4 h-4 mr-1" />
                    {t(`progress.${badge}`)}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Age Filter */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('stories.age_filter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('stories.all_ages')}</SelectItem>
              <SelectItem value="4-6">{t('stories.ages_4_6')}</SelectItem>
              <SelectItem value="7-10">{t('stories.ages_7_10')}</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Stories Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatePresence>
            {filteredStories.map((story, index) => {
              const progress = userProgress.find(p => p.story_id === story.id);
              const isCompleted = progress?.completed || false;
              
              return (
                <motion.div
                  key={story.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6" onClick={() => setSelectedStory(story)}>
                      <div className="text-center">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Book className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                        </motion.div>
                        <h3 className="text-lg font-semibold mb-2">{story.title}</h3>
                        <Badge variant="secondary" className="mb-3">{story.age_group} years</Badge>
                        
                        {isCompleted && (
                          <motion.div 
                            className="flex items-center justify-center text-green-600 mb-2"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Trophy className="w-4 h-4 mr-1" />
                            <span className="text-sm">{t('stories.completed')}</span>
                          </motion.div>
                        )}
                        
                        <div className="flex flex-wrap justify-center gap-1 mb-4">
                          {story.vocabulary.slice(0, 3).map((word, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {word}
                            </Badge>
                          ))}
                        </div>
                        
                        <Button className="w-full">
                          {isCompleted ? t('stories.play_again') : t('stories.start_story')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Download More Stories Button */}
        {isOnline && (
          <motion.div 
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button 
              onClick={fetchStories}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download More Stories</span>
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Enhanced Creator Dashboard with SVG upload and draft submission
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
    quizzes: '',
    images: []
  });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [tprsValidation, setTprsValidation] = useState({ valid: true, message: '' });
  
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isOnline } = useAuth();

  useEffect(() => {
    fetchCreatorStories();
  }, []);

  // Real-time TPRS validation
  useEffect(() => {
    validateTprs();
  }, [formData.text, formData.vocabulary]);

  const validateTprs = () => {
    if (!formData.text || !formData.vocabulary) {
      setTprsValidation({ valid: true, message: '' });
      return;
    }

    const words = formData.text.toLowerCase().split(/\W+/).filter(w => w);
    const vocabWords = formData.vocabulary.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
    
    const repetitionCounts = {};
    vocabWords.forEach(word => {
      repetitionCounts[word] = words.filter(w => w === word).length;
    });

    const insufficientReps = Object.entries(repetitionCounts).filter(([word, count]) => count < 3);
    
    if (insufficientReps.length > 0) {
      setTprsValidation({
        valid: false,
        message: `Vocabulary words need 3+ repetitions: ${insufficientReps.map(([word]) => word).join(', ')}`
      });
    } else {
      setTprsValidation({ valid: true, message: 'TPRS validation passed!' });
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate SVG files
    const validFiles = files.filter(file => {
      if (!file.type.includes('svg') && !file.type.includes('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image file`,
          variant: "destructive"
        });
        return false;
      }
      
      if (file.size > 500 * 1024) { // 500KB limit
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

  const removeImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const fetchCreatorStories = async () => {
    try {
      const response = await axios.get(`${API}/stories/creator`);
      setStories(response.data);
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast({
        title: t('error.general'),
        description: t('error.network'),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast({
        title: t('error.network'),
        description: t('message.offline_mode'),
        variant: "destructive",
      });
      return;
    }

    if (!isDraft && !tprsValidation.valid) {
      toast({
        title: "TPRS Validation Failed",
        description: tprsValidation.message,
        variant: "destructive"
      });
      return;
    }

    try {
      const formPayload = new FormData();
      
      // Basic story data
      formPayload.append('title', formData.title);
      formPayload.append('text', formData.text);
      formPayload.append('language', formData.language);
      formPayload.append('age_group', formData.age_group);
      formPayload.append('vocabulary', JSON.stringify(formData.vocabulary.split(',').map(w => w.trim()).filter(w => w)));
      formPayload.append('quizzes', formData.quizzes || '[]');
      
      // Upload images
      uploadedImages.forEach((img, index) => {
        formPayload.append(`image_${index}`, img.file);
      });
      
      // Set status
      const status = isDraft ? 'draft' : 'pending';
      formPayload.append('status', status);
      
      if (editingStory) {
        const response = await fetch(`${API}/stories/${editingStory.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formPayload
        });
        
        if (!response.ok) throw new Error('Failed to update story');
        
        toast({
          title: "Story updated!",
          description: "Your story has been updated successfully.",
        });
      } else {
        const response = await fetch(`${API}/stories`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formPayload
        });
        
        if (!response.ok) throw new Error('Failed to create story');
        
        toast({
          title: isDraft ? "Draft saved!" : "Story submitted!",
          description: isDraft ? "Your story has been saved as a draft." : "Your story has been submitted for review.",
        });
      }
      
      resetForm();
      fetchCreatorStories();
    } catch (error) {
      console.error('Error submitting story:', error);
      toast({
        title: t('error.general'),
        description: error.message || t('error.network'),
        variant: "destructive",
      });
    }
  };

  const handleSubmitToPending = async (storyId) => {
    try {
      await axios.patch(`${API}/stories/${storyId}/status`, null, {
        params: { status: 'pending' }
      });
      
      toast({
        title: "Story submitted!",
        description: "Your story has been submitted for admin review.",
      });
      
      fetchCreatorStories();
    } catch (error) {
      toast({
        title: t('error.general'),
        description: error.response?.data?.detail || t('error.network'),
        variant: "destructive",
      });
    }
  };

  const handleEdit = (story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      text: story.text,
      language: story.language,
      age_group: story.age_group,
      vocabulary: story.vocabulary.join(', '),
      quizzes: JSON.stringify(story.quizzes, null, 2),
      images: story.images || []
    });
    setUploadedImages([]); // Reset uploaded images for editing
    setShowForm(true);
  };

  const handleDelete = async (storyId) => {
    if (!window.confirm('Are you sure you want to delete this story?')) return;
    
    try {
      await axios.delete(`${API}/stories/${storyId}`);
      toast({
        title: "Story deleted",
        description: "Story has been removed successfully.",
      });
      fetchCreatorStories();
    } catch (error) {
      toast({
        title: t('error.general'),
        description: error.response?.data?.detail || t('error.network'),
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingStory(null);
    setPreviewMode(false);
    setUploadedImages([]);
    setFormData({
      title: '',
      text: '',
      language: 'en',
      age_group: '4-6',
      vocabulary: '',
      quizzes: '',
      images: []
    });
    setTprsValidation({ valid: true, message: '' });
  };
      
  if (previewMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Story Preview</span>
                  <Button onClick={() => setPreviewMode(false)} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    Close Preview
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h2 className="text-2xl font-bold mb-4">{formData.title}</h2>
                  <Badge className="mb-4">{formData.age_group} years • {formData.language}</Badge>
                  <div className="prose max-w-none">
                    <p className="leading-relaxed">{formData.text}</p>
                  </div>
                  
                  {uploadedImages.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-3">Images:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {uploadedImages.map((img) => (
                          <div key={img.id} className="border rounded-lg p-2">
                            <img 
                              src={img.preview} 
                              alt={img.name}
                              className="w-full h-24 object-cover rounded"
                            />
                            <p className="text-xs text-gray-500 mt-1 truncate">{img.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">Vocabulary ({formData.vocabulary.split(',').length} words):</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.vocabulary.split(',').map((word, index) => (
                        <Badge key={index} variant="secondary">{word.trim()}</Badge>
                      ))}
                    </div>
                  </div>

                  {formData.quizzes && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">Quiz Questions:</h4>
                      <div className="bg-white p-4 rounded border">
                        <pre className="text-sm overflow-x-auto">{formData.quizzes}</pre>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 p-3 rounded-lg" style={{
                    backgroundColor: tprsValidation.valid ? '#f0fdf4' : '#fef2f2',
                    borderLeft: `4px solid ${tprsValidation.valid ? '#22c55e' : '#ef4444'}`
                  }}>
                    <p className={`text-sm font-medium ${tprsValidation.valid ? 'text-green-700' : 'text-red-700'}`}>
                      {tprsValidation.message || 'TPRS validation not completed'}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button onClick={() => setPreviewMode(false)} variant="outline">
                    Back to Edit
                  </Button>
                  <div className="space-x-2">
                    <Button onClick={(e) => handleSubmit(e, true)} disabled={!isOnline}>
                      Save as Draft
                    </Button>
                    <Button 
                      onClick={(e) => handleSubmit(e, false)} 
                      disabled={!isOnline || !tprsValidation.valid}
                    >
                      Submit for Review
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingStory ? 'Edit Story' : t('stories.create_new')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">{t('stories.story_title')}</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="age_group">{t('stories.age_group')}</Label>
                      <Select value={formData.age_group} onValueChange={(value) => setFormData({...formData, age_group: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4-6">{t('stories.ages_4_6')}</SelectItem>
                          <SelectItem value="7-10">{t('stories.ages_7_10')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="text">{t('stories.story_text')}</Label>
                    <Textarea
                      id="text"
                      value={formData.text}
                      onChange={(e) => setFormData({...formData, text: e.target.value})}
                      rows={8}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="vocabulary">{t('stories.vocabulary')}</Label>
                    <Input
                      id="vocabulary"
                      value={formData.vocabulary}
                      onChange={(e) => setFormData({...formData, vocabulary: e.target.value})}
                      placeholder="brave, sparrow, fly, courage"
                    />
                  </div>
                  
                  {/* SVG Image Upload Section */}
                  <div>
                    <Label htmlFor="images">Story Images (SVG, max 5 files, 500KB each)</Label>
                    <div className="space-y-4">
                      <Input
                        id="images"
                        type="file"
                        multiple
                        accept=".svg,image/svg+xml,image/*"
                        onChange={handleImageUpload}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                      />
                      
                      {/* Display uploaded images */}
                      {uploadedImages.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {uploadedImages.map((img) => (
                            <div key={img.id} className="relative group border border-gray-200 rounded-lg p-2">
                              <img 
                                src={img.preview} 
                                alt={img.name}
                                className="w-full h-24 object-cover rounded"
                              />
                              <p className="text-xs text-gray-500 mt-1 truncate">{img.name}</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(img.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="quizzes">{t('stories.quizzes')}</Label>
                    <Textarea
                      id="quizzes"
                      value={formData.quizzes}
                      onChange={(e) => setFormData({...formData, quizzes: e.target.value})}
                      rows={4}
                      placeholder='[{"type": "true_false", "question": "The sparrow was brave?", "answer": true}]'
                    />
                  </div>
                  
                  {/* TPRS Validation Display */}
                  {formData.text && formData.vocabulary && (
                    <div className={`p-4 rounded-lg border-l-4 ${
                      tprsValidation.valid 
                        ? 'bg-green-50 border-green-400 text-green-700' 
                        : 'bg-red-50 border-red-400 text-red-700'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {tprsValidation.valid ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                        <span className="font-medium">TPRS Validation</span>
                      </div>
                      <p className="text-sm mt-1">{tprsValidation.message}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" onClick={() => setPreviewMode(true)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Story
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={(e) => handleSubmit(e, true)}
                      disabled={!isOnline}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save as Draft
                    </Button>
                    <Button 
                      type="submit"
                      disabled={!isOnline || !tprsValidation.valid}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {editingStory ? 'Update Story' : 'Submit for Review'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      <X className="w-4 h-4 mr-2" />
                      {t('stories.cancel')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{t('dashboard.creator_dashboard')}</h1>
            <p className="text-gray-600">{t('dashboard.manage_stories')}</p>
          </div>
          <Button onClick={() => setShowForm(true)} disabled={!isOnline}>
            {t('stories.create_new')}
          </Button>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Book className="w-12 h-12 mx-auto text-purple-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{story.title}</h3>
                    <Badge 
                      variant={
                        story.status === 'published' ? 'default' : 
                        story.status === 'pending' ? 'secondary' : 
                        story.status === 'rejected' ? 'destructive' : 'outline'
                      }
                      className="mb-3"
                    >
                      {t(`status.${story.status}`)}
                    </Badge>
                    <p className="text-sm text-gray-600 mb-3">
                      {story.text.substring(0, 100)}...
                    </p>
                    {story.status === 'rejected' && story.review_notes && (
                      <p className="text-sm text-red-600 mb-3 italic">
                        {story.review_notes}
                      </p>
                    )}
                    <div className="flex justify-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(story)}
                        disabled={story.status === 'published'}
                      >
                        {t('action.edit')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(story.id)}
                        disabled={story.status !== 'draft'}
                      >
                        {t('action.delete')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

// Enhanced Narrator Dashboard
const NarratorDashboard = () => {
  const [stories, setStories] = useState([]);
  const [narrations, setNarrations] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [voiceText, setVoiceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedBlobs, setRecordedBlobs] = useState([]);
  
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isOnline } = useAuth();

  useEffect(() => {
    fetchStories();
    fetchNarrations();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await axios.get(`${API}/stories?status=published`);
      setStories(response.data);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const fetchNarrations = async () => {
    try {
      const response = await axios.get(`${API}/narrations/narrator`);
      setNarrations(response.data);
    } catch (error) {
      console.error('Error fetching narrations:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      const blobs = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          blobs.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(blobs, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(audioFile);
        setRecordedBlobs(blobs);
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      toast({
        title: "Recording error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleSubmitNarration = async () => {
    if (!selectedStory) return;
    
    if (!isOnline) {
      toast({
        title: t('error.network'),
        description: t('message.offline_mode'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('story_id', selectedStory.id);
      
      if (audioFile) {
        formData.append('audio', audioFile);
      }
      if (voiceText) {
        formData.append('text', voiceText);
      }
      
      await axios.post(`${API}/narrations`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast({
        title: "Narration submitted!",
        description: t('message.narration_submitted'),
      });
      
      // Reset form
      setSelectedStory(null);
      setAudioFile(null);
      setVoiceText('');
      setRecordedBlobs([]);
      
      fetchNarrations();
    } catch (error) {
      toast({
        title: t('error.general'),
        description: error.response?.data?.detail || t('error.network'),
        variant: "destructive",
      });
    }
  };

  const startVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsRecording(true);
        toast({
          title: "Listening...",
          description: "Speak now for voice-to-text",
        });
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setVoiceText(prev => prev + ' ' + finalTranscript);
        }
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognition.onerror = () => {
        setIsRecording(false);
        toast({
          title: "Voice recognition error",
          description: "Could not process speech",
          variant: "destructive",
        });
      };
      
      recognition.start();
    } else {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-4">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-800">{t('dashboard.narrator_dashboard')}</h1>
          <p className="text-gray-600">{t('dashboard.add_voice')}</p>
        </motion.div>

        <Tabs defaultValue="stories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="stories">{t('narration.stories_to_narrate')}</TabsTrigger>
            <TabsTrigger value="narrations">{t('narration.my_narrations')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stories">
            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {stories.map((story, index) => {
                const hasNarration = narrations.some(n => n.story_id === story.id);
                
                return (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className={selectedStory?.id === story.id ? 'ring-2 ring-blue-500' : ''}>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <Mic className="w-12 h-12 mx-auto text-green-500 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">{story.title}</h3>
                          <Badge variant="secondary" className="mb-3">{story.age_group} years</Badge>
                          {hasNarration && (
                            <Badge className="mb-3 bg-green-100 text-green-800">
                              {t('narration.already_narrated')}
                            </Badge>
                          )}
                          <p className="text-sm text-gray-600 mb-4">
                            {story.text.substring(0, 100)}...
                          </p>
                          <Button 
                            onClick={() => setSelectedStory(story)}
                            disabled={hasNarration || !isOnline}
                          >
                            {hasNarration ? t('narration.narrated') : t('narration.select_to_narrate')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
            
            {selectedStory && (
              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{t('narration.add_narration_for', { title: selectedStory.title })}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>{t('narration.story_text_to_narrate')}</Label>
                      <div className="bg-gray-50 p-4 rounded-lg mt-2 max-h-40 overflow-y-auto">
                        <p className="text-gray-700">{selectedStory.text}</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="audio">{t('narration.upload_audio')}</Label>
                        <div className="space-y-3 mt-2">
                          <Input
                            id="audio"
                            type="file"
                            accept="audio/*"
                            onChange={(e) => setAudioFile(e.target.files[0])}
                          />
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              onClick={isRecording ? stopRecording : startRecording}
                              variant={isRecording ? "destructive" : "outline"}
                              className="flex items-center space-x-2"
                            >
                              <Mic className="w-4 h-4" />
                              <span>
                                {isRecording ? 'Stop Recording' : 'Record Audio'}
                              </span>
                            </Button>
                            {audioFile && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const url = URL.createObjectURL(audioFile);
                                  const audio = new Audio(url);
                                  audio.play();
                                }}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label>{t('narration.voice_to_text')}</Label>
                        <div className="mt-2 space-y-2">
                          <Button
                            type="button"
                            onClick={startVoiceRecognition}
                            disabled={isRecording}
                            variant="outline"
                            className="w-full"
                          >
                            {isRecording ? t('narration.recording') : t('narration.start_recording')}
                          </Button>
                          <Textarea
                            value={voiceText}
                            onChange={(e) => setVoiceText(e.target.value)}
                            placeholder={t('narration.type_narration')}
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button onClick={handleSubmitNarration} disabled={!audioFile && !voiceText}>
                        {t('narration.submit_narration')}
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedStory(null)}>
                        {t('stories.cancel')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>
          
          <TabsContent value="narrations">
            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {narrations.map((narration, index) => {
                const story = stories.find(s => s.id === narration.story_id);
                
                return (
                  <motion.div
                    key={narration.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <Volume2 className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                          <h3 className="text-lg font-semibold mb-2">{story?.title || 'Story'}</h3>
                          <Badge 
                            variant={
                              narration.status === 'published' ? 'default' : 
                              narration.status === 'pending' ? 'secondary' : 'outline'
                            }
                            className="mb-3"
                          >
                            {t(`status.${narration.status}`)}
                          </Badge>
                          <div className="flex justify-center space-x-2">
                            <Button variant="outline" size="sm">{t('action.edit')}</Button>
                            <Button variant="outline" size="sm">{t('action.delete')}</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Continue with the rest...
// Admin Dashboard Component
const AdminDashboard = () => {
  const [pendingContent, setPendingContent] = useState({ stories: [], narrations: [] });
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchPendingContent();
    fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  const handleApprove = async (contentType, contentId, notes = '') => {
    try {
      await axios.patch(`${API}/admin/content/${contentType}/${contentId}/approve`, null, {
        params: { notes }
      });
      
      toast({
        title: "Content approved",
        description: `${contentType} has been published successfully.`,
      });
      
      fetchPendingContent();
    } catch (error) {
      toast({
        title: t('error.general'),
        description: error.response?.data?.detail || t('error.network'),
        variant: "destructive",
      });
    }
  };

  const handleReject = async (contentType, contentId, notes) => {
    if (!notes) {
      toast({
        title: "Review notes required",
        description: "Please provide feedback for rejection.",
        variant: "destructive",
      });
      return;
    }

    try {
      await axios.patch(`${API}/admin/content/${contentType}/${contentId}/reject`, null, {
        params: { notes }
      });
      
      toast({
        title: "Content rejected",
        description: `${contentType} has been rejected with feedback.`,
      });
      
      fetchPendingContent();
    } catch (error) {
      toast({
        title: t('error.general'),
        description: error.response?.data?.detail || t('error.network'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user ${userName}?`)) return;

    try {
      await axios.delete(`${API}/admin/users/${userId}`);
      toast({
        title: "User deleted",
        description: "User account has been removed successfully.",
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: t('error.general'),
        description: error.response?.data?.detail || t('error.network'),
        variant: "destructive",
      });
    }
  };

  const exportAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'storybridge_analytics.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({
        title: "Export successful",
        description: "Analytics data has been downloaded.",
      });
    } catch (error) {
      toast({
        title: t('error.general'),
        description: "Failed to export analytics data.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-800">{t('dashboard.admin_dashboard')}</h1>
          <p className="text-gray-600">{t('dashboard.manage_content')}</p>
        </motion.div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">Pending Content</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          {/* Pending Content Tab */}
          <TabsContent value="pending">
            <div className="space-y-8">
              {/* Pending Stories */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Pending Stories</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingContent.stories.map((story) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -5 }}
                    >
                      <Card>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold">{story.title}</h4>
                              <Badge variant="secondary">{story.age_group} years</Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {story.text.substring(0, 150)}...
                            </p>
                            <div>
                              <p className="text-xs text-gray-500">Vocabulary:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {story.vocabulary.map((word, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {word}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleApprove('story', story.id)}
                                className="flex items-center space-x-1"
                              >
                                <Check className="w-4 h-4" />
                                <span>Approve</span>
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject Story: {story.title}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Textarea 
                                      placeholder="Provide feedback for rejection..."
                                      id={`reject-notes-${story.id}`}
                                    />
                                    <Button 
                                      onClick={() => {
                                        const notes = document.getElementById(`reject-notes-${story.id}`).value;
                                        handleReject('story', story.id, notes);
                                      }}
                                      variant="destructive"
                                    >
                                      Reject Story
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Pending Narrations */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Pending Narrations</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingContent.narrations.map((narration) => (
                    <motion.div
                      key={narration.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -5 }}
                    >
                      <Card>
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Volume2 className="w-8 h-8 text-blue-500" />
                              <Badge variant="secondary">Narration</Badge>
                            </div>
                            {narration.audio_id && (
                              <div>
                                <audio controls className="w-full">
                                  <source src={`${API}/audio/${narration.audio_id}`} type="audio/mpeg" />
                                  Your browser does not support the audio element.
                                </audio>
                              </div>
                            )}
                            {narration.text && (
                              <div>
                                <p className="text-xs text-gray-500">Text:</p>
                                <p className="text-sm">{narration.text}</p>
                              </div>
                            )}
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleApprove('narration', narration.id)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject Narration</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Textarea 
                                      placeholder="Provide feedback for rejection..."
                                      id={`reject-narration-${narration.id}`}
                                    />
                                    <Button 
                                      onClick={() => {
                                        const notes = document.getElementById(`reject-narration-${narration.id}`).value;
                                        handleReject('narration', narration.id, notes);
                                      }}
                                      variant="destructive"
                                    >
                                      Reject Narration
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Platform Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Badge variant="outline">{user.role}</Badge>
                          <span>•</span>
                          <span>{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Analytics Tab */}
          <TabsContent value="analytics">
            {analytics && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Platform Analytics</h3>
                  <Button onClick={exportAnalytics} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                        <h4 className="text-2xl font-bold">{analytics.active_users}</h4>
                        <p className="text-sm text-gray-600">Active Users</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Book className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <h4 className="text-2xl font-bold">{analytics.stories_completed}</h4>
                        <p className="text-sm text-gray-600">Stories Completed</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <BarChart3 className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                        <h4 className="text-2xl font-bold">{analytics.avg_session_time}min</h4>
                        <p className="text-sm text-gray-600">Avg Session Time</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Trophy className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                        <h4 className="text-2xl font-bold">{analytics.vocabulary_retention_rate}%</h4>
                        <p className="text-sm text-gray-600">Vocabulary Retention</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardContent className="p-6">
                    <h4 className="text-lg font-semibold mb-4">Quiz Performance</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Quiz Attempts</p>
                        <p className="text-2xl font-bold">{analytics.total_quiz_attempts}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold">{analytics.quiz_success_rate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Profile Management Component
const ProfilePage = () => {
  const [profileData, setProfileData] = useState({
    email: '',
    language: 'en',
    avatar_url: ''
  });
  const [loading, setLoading] = useState(false);
  
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email || '',
        language: user.language || 'en',
        avatar_url: user.avatar_url || ''
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/auth/profile`, profileData);
      
      // Update language if changed
      if (profileData.language !== i18n.language) {
        i18n.changeLanguage(profileData.language);
        document.dir = getDirection(profileData.language);
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: t('error.general'),
        description: error.response?.data?.detail || t('error.network'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API}/auth/me`);
      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully.",
      });
      logout();
      navigate('/');
    } catch (error) {
      toast({
        title: t('error.general'),
        description: error.response?.data?.detail || t('error.network'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-6 h-6" />
                <span>Profile Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={profileData.language} 
                    onValueChange={(value) => setProfileData({...profileData, language: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="avatar">Avatar URL (optional)</Label>
                  <Input
                    id="avatar"
                    type="url"
                    value={profileData.avatar_url}
                    onChange={(e) => setProfileData({...profileData, avatar_url: e.target.value})}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? t('action.loading') : t('action.save')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                    Cancel
                  </Button>
                </div>
              </form>
              
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                <Button 
                  onClick={handleDeleteAccount}
                  variant="destructive"
                  className="w-full"
                >
                  Delete Account
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

// Settings Component
const SettingsPage = () => {
  const [storageInfo, setStorageInfo] = useState({ itemCount: 0, totalSizeMB: '0.00' });
  const [syncStatus, setSyncStatus] = useState('idle');
  
  const { storage, isOnline, user } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await storage.getStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const handleClearExpiredData = async () => {
    if (!window.confirm('Clear data older than 30 days?')) return;

    try {
      await storage.clearExpired(30);
      await loadStorageInfo();
      toast({
        title: "Data cleared",
        description: "Expired offline data has been removed.",
      });
    } catch (error) {
      toast({
        title: t('error.general'),
        description: "Failed to clear expired data.",
        variant: "destructive",
      });
    }
  };

  const handleForceSync = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot sync while offline.",
        variant: "destructive",
      });
      return;
    }

    setSyncStatus('syncing');
    try {
      const success = await storage.syncWithServer(axios, localStorage.getItem('token'));
      
      setSyncStatus(success ? 'success' : 'error');
      toast({
        title: success ? "Sync completed" : "Sync failed",
        description: success ? t('message.sync_complete') : "Some items could not be synced.",
        variant: success ? "default" : "destructive",
      });
    } catch (error) {
      setSyncStatus('error');
      toast({
        title: "Sync failed",
        description: t('error.network'),
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleResetAllData = async () => {
    if (!window.confirm('This will delete ALL offline data. Are you sure?')) return;

    try {
      await storage.clearAllData();
      await loadStorageInfo();
      toast({
        title: "Data reset",
        description: "All offline data has been cleared.",
      });
    } catch (error) {
      toast({
        title: t('error.general'),
        description: "Failed to reset data.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-6 h-6" />
                <span>Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Language Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Language & Localization</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Current Language</Label>
                    <Select value={i18n.language} onValueChange={(lang) => {
                      i18n.changeLanguage(lang);
                      document.dir = getDirection(lang);
                    }}>
                      <SelectTrigger className="w-48">
                        <Globe className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (LTR)</SelectItem>
                        <SelectItem value="ar">العربية (RTL)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Storage Management */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Offline Storage</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span>Storage Used</span>
                      <span className="font-semibold">{storageInfo.totalSizeMB} MB</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span>Items Stored</span>
                      <span className="font-semibold">{storageInfo.itemCount}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={loadStorageInfo} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Refresh
                      </Button>
                      <Button onClick={handleClearExpiredData} variant="outline" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear Old Data
                      </Button>
                      <Button onClick={handleResetAllData} variant="destructive" size="sm">
                        Reset All Data
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Settings */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Data Synchronization</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">Connection Status</p>
                      <p className="text-sm text-gray-600">
                        {isOnline ? (
                          <span className="flex items-center text-green-600">
                            <Wifi className="w-4 h-4 mr-1" />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center text-orange-600">
                            <WifiOff className="w-4 h-4 mr-1" />
                            Offline
                          </span>
                        )}
                      </p>
                    </div>
                    <Button 
                      onClick={handleForceSync}
                      disabled={!isOnline || syncStatus === 'syncing'}
                      variant="outline"
                    >
                      {syncStatus === 'syncing' ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Force Sync
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* App Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">About StoryBridge</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Version: 1.0.0</p>
                  <p>Offline Support: Enabled</p>
                  <p>PWA Compatible: Yes</p>
                  {user && <p>User Role: {user.role}</p>}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex space-x-4 pt-4 border-t">
                <Button onClick={() => navigate('/dashboard')}>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
                <Button onClick={() => navigate('/profile')} variant="outline">
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

// Mobile-friendly Dashboard with sidebar navigation
const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
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
        return <EndUserDashboard />;
    }
  };

  // Navigation menu items based on role
  const getMenuItems = () => {
    const baseItems = [
      { icon: Home, label: t('nav.home'), onClick: () => navigate('/dashboard') },
      { icon: Settings, label: t('nav.settings'), onClick: () => navigate('/settings') },
      { icon: User, label: t('nav.profile'), onClick: () => navigate('/profile') }
    ];

    const roleSpecific = {
      end_user: [
        { icon: Book, label: 'Stories', onClick: () => navigate('/dashboard') },
        { icon: Trophy, label: 'Progress', onClick: () => {} }
      ],
      creator: [
        { icon: Book, label: 'My Stories', onClick: () => navigate('/dashboard') }
      ],
      narrator: [
        { icon: Mic, label: 'Narrations', onClick: () => navigate('/dashboard') }
      ],
      admin: [
        { icon: Shield, label: 'Admin Panel', onClick: () => navigate('/dashboard') },
        { icon: Users, label: 'Users', onClick: () => {} },
        { icon: BarChart3, label: 'Analytics', onClick: () => {} }
      ]
    };

    return [...(roleSpecific[user?.role] || []), ...baseItems];
  };

  return (
    <div className="relative min-h-screen">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Book className="w-6 h-6 text-orange-500" />
          <span className="font-semibold text-gray-800">StoryBridge</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="p-2"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <div className="fixed left-4 top-4 bottom-4 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 z-40">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <Book className="w-8 h-8 text-orange-500" />
              <div>
                <h2 className="font-semibold text-gray-800">StoryBridge</h2>
                <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              {getMenuItems().map((item, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start text-left hover:bg-orange-50 hover:text-orange-600"
                  onClick={item.onClick}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start text-left text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                {t('nav.logout')}
              </Button>
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 md:hidden"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <Book className="w-8 h-8 text-orange-500" />
                    <div>
                      <h2 className="font-semibold text-gray-800">StoryBridge</h2>
                      <p className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <nav className="space-y-2">
                  {getMenuItems().map((item, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start text-left hover:bg-orange-50 hover:text-orange-600"
                      onClick={() => {
                        item.onClick();
                        setSidebarOpen(false);
                      }}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left text-red-600 hover:bg-red-50"
                    onClick={() => {
                      handleLogout();
                      setSidebarOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    {t('nav.logout')}
                  </Button>
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="md:ml-72 min-h-screen">
        {getDashboardComponent()}
      </div>
    </div>
  );
};

// Protected Route Component with offline support
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
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <SettingsPage />
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