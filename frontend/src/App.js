import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Howl } from 'howler';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { get, set, del } from 'idb-keyval';
import Papa from 'papaparse';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, User, Book, Mic, Home, Trophy, Coins, 
  Settings, LogOut, Download, Wifi, WifiOff, CheckCircle, XCircle, Clock, Globe,
  BarChart3, Users, Award, Target, Share2, FileText, UserCheck, Shield, 
  Calendar, Languages, Trash2, Edit3, Plus, Filter, Search, PlayCircle
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
import { Alert, AlertDescription } from './components/ui/alert';
import { Separator } from './components/ui/separator';
import { Switch } from './components/ui/switch';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Offline storage keys
const STORAGE_KEYS = {
  USER_CREDENTIALS: 'storybridge_user_credentials',
  STORY_PACKS: 'storybridge_story_packs',
  USER_PROGRESS: 'storybridge_user_progress',
  OFFLINE_ACTIONS: 'storybridge_offline_actions',
  USER_SETTINGS: 'storybridge_user_settings'
};

// Context for auth
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Audio Recording Hook
const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder, isRecording]);

  return { isRecording, audioBlob, startRecording, stopRecording, setAudioBlob };
};

// Offline Manager Hook
const useOfflineManager = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineActions = async () => {
    if (!isOnline) return;

    try {
      const offlineActions = await get(STORAGE_KEYS.OFFLINE_ACTIONS) || [];
      for (const action of offlineActions) {
        try {
          await axios(action);
        } catch (error) {
          console.error('Failed to sync offline action:', error);
        }
      }
      await del(STORAGE_KEYS.OFFLINE_ACTIONS);
    } catch (error) {
      console.error('Error syncing offline actions:', error);
    }
  };

  const queueOfflineAction = async (action) => {
    const actions = await get(STORAGE_KEYS.OFFLINE_ACTIONS) || [];
    actions.push(action);
    await set(STORAGE_KEYS.OFFLINE_ACTIONS, actions);
  };

  return { isOnline, syncOfflineActions, queueOfflineAction };
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isOnline, syncOfflineActions } = useOfflineManager();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (isOnline && token) {
      syncOfflineActions();
    }
  }, [isOnline, token, syncOfflineActions]);

  const initializeAuth = async () => {
    try {
      // Try to get credentials from localStorage first
      const localToken = localStorage.getItem('token');
      
      // If not found, try IndexedDB (for offline support)
      if (!localToken) {
        const credentials = await get(STORAGE_KEYS.USER_CREDENTIALS);
        if (credentials && credentials.token) {
          setToken(credentials.token);
          setUser(credentials.user);
          localStorage.setItem('token', credentials.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${credentials.token}`;
        }
      } else {
        setToken(localToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${localToken}`;
        if (isOnline) {
          await fetchUser();
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      
      // Store in IndexedDB for offline access
      await set(STORAGE_KEYS.USER_CREDENTIALS, {
        token,
        user: response.data
      });
    } catch (error) {
      logout();
    }
  };

  const login = async (email, password, otpCode = null) => {
    const response = await axios.post(`${API}/auth/login`, { 
      email, 
      password,
      otp_code: otpCode 
    });
    const { access_token, user: userData } = response.data;
    
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    // Store in IndexedDB for offline access
    await set(STORAGE_KEYS.USER_CREDENTIALS, {
      token: access_token,
      user: userData
    });
    
    return userData;
  };

  const signup = async (email, password, role) => {
    const response = await axios.post(`${API}/auth/signup`, { email, password, role });
    const { access_token, user: userData } = response.data;
    
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    // Store in IndexedDB for offline access
    await set(STORAGE_KEYS.USER_CREDENTIALS, {
      token: access_token,
      user: userData
    });
    
    return userData;
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear offline storage
    await del(STORAGE_KEYS.USER_CREDENTIALS);
    await del(STORAGE_KEYS.USER_PROGRESS);
  };

  const updateProfile = async (profileData) => {
    const response = await axios.put(`${API}/auth/profile`, profileData);
    setUser(response.data);
    
    // Update IndexedDB
    const credentials = await get(STORAGE_KEYS.USER_CREDENTIALS);
    if (credentials) {
      credentials.user = response.data;
      await set(STORAGE_KEYS.USER_CREDENTIALS, credentials);
    }
    
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token,
      loading, 
      isOnline,
      login, 
      signup, 
      logout,
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Enhanced Landing Page with Animations
const LandingPage = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto px-4 py-16">
        {/* Language Toggle */}
        <div className="absolute top-4 right-4">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">🇺🇸 English</SelectItem>
              <SelectItem value="ar">🇸🇦 العربية</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div 
            className="mb-8"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Book className="w-24 h-24 mx-auto text-orange-500 mb-4" />
            <h1 className="text-5xl font-bold text-gray-800 mb-4 font-serif">
              {language === 'ar' ? 'جسر القصص' : 'StoryBridge'}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'قصص صوتية تفاعلية تجعل التعلم ممتعاً للأطفال من سن 4-10'
                : 'Interactive audio stories that make learning fun for children aged 4-10'
              }
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
            className="bg-green-100 border border-green-400 rounded-lg p-4 mb-8 inline-block"
          >
            <p className="text-green-800 font-medium flex items-center gap-2">
              <WifiOff className="w-5 h-5" />
              {language === 'ar' ? '✓ يعمل 100% بدون إنترنت بعد التحميل' : '✓ Works 100% offline after download'}
            </p>
          </motion.div>
          
          <motion.div 
            className="space-y-4 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg rounded-xl transition-transform hover:scale-105"
            >
              {language === 'ar' ? 'ابدأ الآن' : 'Get Started'}
            </Button>
            <p className="text-sm text-gray-500">
              {language === 'ar' 
                ? 'انضم لآلاف الأطفال الذين يتعلمون من خلال القصص'
                : 'Join thousands of children learning through stories'
              }
            </p>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          {[
            {
              icon: PlayCircle,
              title: language === 'ar' ? 'قصص تفاعلية' : 'Interactive Stories',
              desc: language === 'ar' ? 'قصص صوتية مع اختبارات ومفردات جذابة' : 'Audio-driven stories with engaging quizzes and vocabulary',
              color: 'blue'
            },
            {
              icon: Coins,
              title: language === 'ar' ? 'اكسب المكافآت' : 'Earn Rewards',
              desc: language === 'ar' ? 'اجمع النقود والشارات لإكمال القصص' : 'Collect coins and badges for completing stories',
              color: 'yellow'
            },
            {
              icon: Volume2,
              title: language === 'ar' ? 'التعلم بدون إنترنت' : 'Offline Learning',
              desc: language === 'ar' ? 'تعلم في أي مكان وأي وقت - لا حاجة للإنترنت' : 'Learn anywhere, anytime - no internet required',
              color: 'green'
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -10 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="text-center h-full hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <feature.icon className={`w-12 h-12 mx-auto text-${feature.color}-500 mb-4`} />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* NGO Partnership Section */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            {language === 'ar' ? 'شراكات المنظمات غير الربحية' : 'NGO Partnerships'}
          </h2>
          <p className="text-gray-600 mb-8">
            {language === 'ar' 
              ? 'ندعم المنظمات غير الربحية بمواد تعليمية مجانية وتقارير تأثير'
              : 'Supporting NGOs with free educational materials and impact reporting'
            }
          </p>
          <div className="w-32 h-16 mx-auto bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
            {language === 'ar' ? 'شعار المنظمة' : 'NGO Logo'}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Enhanced Auth Page
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('end_user');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAdminLogin = location.pathname === '/admin/login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        if (isAdminLogin && !otpCode) {
          setShowMFA(true);
          setLoading(false);
          return;
        }
        await login(email, password, otpCode);
      } else {
        await signup(email, password, role);
      }
      
      toast({
        title: isLogin ? "Welcome back!" : "Account created!",
        description: "Redirecting to your dashboard...",
      });
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Something went wrong",
        variant: "destructive",
      });
      setShowMFA(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {isAdminLogin ? (
              <Shield className="w-12 h-12 mx-auto text-red-500 mb-2" />
            ) : (
              <Book className="w-12 h-12 mx-auto text-orange-500 mb-2" />
            )}
            <CardTitle className="text-2xl">
              {isAdminLogin ? 'Admin Access' : (isLogin ? 'Welcome Back' : 'Join StoryBridge')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              
              {(showMFA || isAdminLogin) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <Label htmlFor="otp">OTP Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required={showMFA || isAdminLogin}
                    className="mt-1"
                  />
                </motion.div>
              )}
              
              {!isLogin && !isAdminLogin && (
                <div>
                  <Label htmlFor="role">I am a...</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end_user">Student/Parent/Teacher</SelectItem>
                      <SelectItem value="creator">Story Creator</SelectItem>
                      <SelectItem value="narrator">Voice Narrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
              
              {!isAdminLogin && (
                <p className="text-center text-sm text-gray-600">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-orange-500 hover:underline"
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
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

// Enhanced Story Player with TPRS and Improved Quiz System
const StoryPlayer = ({ story, onComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [vocabularyProgress, setVocabularyProgress] = useState({});
  const [sound, setSound] = useState(null);
  const [pausePoints, setPausePoints] = useState([]);
  const [showVocabModal, setShowVocabModal] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  
  const { toast } = useToast();
  const { queueOfflineAction } = useOfflineManager();

  // Swipe handlers for mobile navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => skipForward(),
    onSwipedRight: () => skipBackward(),
    onSwipedUp: () => setShowVocabModal(true),
    trackMouse: true
  });

  useEffect(() => {
    // Enhanced mock audio with TPRS pause points
    const mockAudio = new Howl({
      src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzqV3/DFdiABGnze7t+QQQ8OTaXl7apSGQpBnN7zv2oh'], 
      format: ['mp3'],
      onload: () => {
        setDuration(30);
        // Set TPRS pause points (every 7-10 seconds for comprehension checks)
        setPausePoints([10, 20]);
      },
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onend: () => {
        setIsPlaying(false);
        setShowQuiz(true);
      }
    });
    
    setSound(mockAudio);
    
    // Initialize vocabulary progress
    const vocabProgress = {};
    story.vocabulary.forEach(word => {
      vocabProgress[word] = { repetitions: 0, learned: false };
    });
    setVocabularyProgress(vocabProgress);
    
    return () => {
      if (mockAudio) {
        mockAudio.unload();
      }
    };
  }, [story]);

  const togglePlay = () => {
    if (sound) {
      if (isPlaying) {
        sound.pause();
      } else {
        sound.play();
      }
    }
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

  const handleVocabularyClick = (word) => {
    setSelectedWord(word);
    setShowVocabModal(true);
    
    // Update vocabulary progress
    setVocabularyProgress(prev => ({
      ...prev,
      [word]: {
        ...prev[word],
        repetitions: prev[word].repetitions + 1,
        learned: prev[word].repetitions + 1 >= 3
      }
    }));
    
    // Play word pronunciation (mock)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      speechSynthesis.speak(utterance);
    }
  };

  const checkAnswer = (userAnswer, correctAnswer, questionType) => {
    let isCorrect = false;
    
    switch (questionType) {
      case 'true_false':
        isCorrect = userAnswer === correctAnswer;
        break;
      case 'multiple_choice':
        isCorrect = userAnswer === correctAnswer;
        break;
      case 'fill_blank':
        isCorrect = userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        break;
      default:
        isCorrect = false;
    }
    
    return isCorrect;
  };

  const handleQuizAnswer = (answer) => {
    const currentQuiz = story.quizzes[currentQuizIndex];
    const isCorrect = checkAnswer(answer, currentQuiz.answer, currentQuiz.type);
    
    setLastAnswerCorrect(isCorrect);
    setShowFeedback(true);
    
    const newAnswers = [...quizAnswers, { answer, correct: isCorrect }];
    setQuizAnswers(newAnswers);
    
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(isCorrect ? [100] : [100, 100, 100]);
    }
    
    setTimeout(() => {
      setShowFeedback(false);
      
      if (currentQuizIndex < story.quizzes.length - 1) {
        setCurrentQuizIndex(currentQuizIndex + 1);
      } else {
        completeStory(newAnswers);
      }
    }, 2000);
  };

  const completeStory = async (answers) => {
    const correctAnswers = answers.filter(a => a.correct).length;
    const earnedCoins = 10 + (correctAnswers * 5);
    
    // Calculate badges
    const newBadges = [];
    const learnedWords = Object.values(vocabularyProgress).filter(v => v.learned).length;
    
    if (learnedWords >= 3) newBadges.push('Word Wizard');
    if (correctAnswers === answers.length) newBadges.push('Quiz Master');
    
    const progressData = {
      story_id: story.id,
      completed: true,
      time_spent: Math.floor(currentTime),
      vocabulary_learned: Object.entries(vocabularyProgress)
        .filter(([_, progress]) => progress.learned)
        .map(([word, progress]) => ({ word, learned_at: new Date().toISOString(), repetitions: progress.repetitions })),
      quiz_results: answers,
      coins_earned: earnedCoins,
      badges_earned: newBadges
    };
    
    try {
      // Try to sync progress online
      await axios.post(`${API}/progress`, progressData);
    } catch (error) {
      // Queue for offline sync
      await queueOfflineAction({
        method: 'POST',
        url: `${API}/progress`,
        data: progressData
      });
    }
    
    // Store progress in IndexedDB
    const existingProgress = await get(STORAGE_KEYS.USER_PROGRESS) || [];
    const updatedProgress = existingProgress.filter(p => p.story_id !== story.id);
    updatedProgress.push(progressData);
    await set(STORAGE_KEYS.USER_PROGRESS, updatedProgress);
    
    toast({
      title: "Story Completed! 🎉",
      description: `You earned ${earnedCoins} coins and ${newBadges.length} badge(s)!`,
    });
    
    setTimeout(() => {
      onComplete(earnedCoins, newBadges);
    }, 2000);
  };

  if (showQuiz && story.quizzes.length > 0) {
    const currentQuiz = story.quizzes[currentQuizIndex];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4" {...swipeHandlers}>
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">
                  Question {currentQuizIndex + 1} of {story.quizzes.length}
                </CardTitle>
                <Progress value={((currentQuizIndex + 1) / story.quizzes.length) * 100} className="w-full" />
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <p className="text-lg font-medium">{currentQuiz.question}</p>
                
                <AnimatePresence>
                  {showFeedback && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={`p-4 rounded-lg ${lastAnswerCorrect ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'} border`}
                    >
                      {lastAnswerCorrect ? (
                        <div className="flex items-center justify-center gap-2 text-green-800">
                          <CheckCircle className="w-6 h-6" />
                          <span className="font-semibold">Correct! Great job!</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-red-800">
                          <XCircle className="w-6 h-6" />
                          <span className="font-semibold">Incorrect. The answer was: {currentQuiz.answer}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {!showFeedback && (
                  <motion.div className="space-y-3">
                    {currentQuiz.type === 'true_false' && (
                      <>
                        <Button 
                          onClick={() => handleQuizAnswer(true)}
                          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 text-lg"
                          size="lg"
                        >
                          ✓ True
                        </Button>
                        <Button 
                          onClick={() => handleQuizAnswer(false)}
                          className="w-full bg-red-500 hover:bg-red-600 text-white py-3 text-lg"
                          size="lg"
                        >
                          ✗ False
                        </Button>
                      </>
                    )}
                    
                    {currentQuiz.type === 'multiple_choice' && (
                      currentQuiz.options.map((option, index) => (
                        <Button 
                          key={index}
                          onClick={() => handleQuizAnswer(option)}
                          className="w-full py-3 text-lg"
                          variant="outline"
                          size="lg"
                        >
                          {String.fromCharCode(65 + index)}. {option}
                        </Button>
                      ))
                    )}
                    
                    {currentQuiz.type === 'fill_blank' && (
                      <div className="space-y-3">
                        <Input 
                          placeholder="Type your answer..."
                          className="text-lg py-3"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleQuizAnswer(e.target.value);
                            }
                          }}
                          id="fill-blank-answer"
                        />
                        <Button 
                          onClick={() => {
                            const input = document.getElementById('fill-blank-answer');
                            handleQuizAnswer(input.value);
                          }}
                          className="w-full py-3 text-lg"
                          size="lg"
                        >
                          Submit Answer
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
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
          transition={{ duration: 0.6 }}
        >
          <Card className="mb-6">
            <CardHeader className="text-center">
              <div className="flex items-center justify-between mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onComplete(0)}
                >
                  ← Back
                </Button>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {story.age_group} years
                </Badge>
              </div>
              <CardTitle className="text-3xl mb-2">{story.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-8">
                {/* Story Text with Interactive Vocabulary */}
                <div className="bg-white rounded-lg p-8 mb-6 shadow-inner">
                  <Book className="w-24 h-24 mx-auto text-orange-500 mb-4" />
                  <div className="text-lg leading-relaxed text-gray-700 story-text">
                    {story.text.split(' ').map((word, index) => {
                      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
                      const isVocabWord = story.vocabulary.some(v => v.toLowerCase() === cleanWord);
                      
                      return (
                        <span
                          key={index}
                          className={isVocabWord ? 'vocabulary-highlight cursor-pointer hover:bg-yellow-300 transition-colors' : ''}
                          onClick={() => isVocabWord && handleVocabularyClick(cleanWord)}
                        >
                          {word}{' '}
                        </span>
                      );
                    })}
                  </div>
                </div>
                
                {/* Enhanced Audio Controls */}
                <motion.div 
                  className="audio-controls space-y-6"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex justify-center space-x-4">
                    <Button onClick={skipBackward} variant="outline" size="lg" className="p-4">
                      <SkipBack className="w-6 h-6" />
                    </Button>
                    <Button 
                      onClick={togglePlay} 
                      size="lg" 
                      className={`px-8 py-4 ${isPlaying ? 'pulse' : ''}`}
                    >
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                    </Button>
                    <Button onClick={skipForward} variant="outline" size="lg" className="p-4">
                      <SkipForward className="w-6 h-6" />
                    </Button>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <Progress value={(currentTime / duration) * 100} className="h-3 mb-2" />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{Math.floor(currentTime)}s</span>
                      <span>{Math.floor(duration)}s</span>
                    </div>
                  </div>
                  
                  {/* Vocabulary Progress Indicators */}
                  <div className="flex justify-center space-x-2">
                    {story.vocabulary.map((word, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full ${
                          vocabularyProgress[word]?.learned ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={`${word}: ${vocabularyProgress[word]?.repetitions || 0} repetitions`}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
              
              {/* Interactive Vocabulary Section */}
              {story.vocabulary.length > 0 && (
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-lg font-semibold mb-3 flex items-center justify-center gap-2">
                    <Target className="w-5 h-5" />
                    New Words in This Story
                  </h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {story.vocabulary.map((word, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Badge 
                          variant="outline" 
                          className={`text-sm cursor-pointer transition-colors ${
                            vocabularyProgress[word]?.learned 
                              ? 'bg-green-100 border-green-400 text-green-800' 
                              : 'hover:bg-yellow-50'
                          }`}
                          onClick={() => handleVocabularyClick(word)}
                        >
                          {word} {vocabularyProgress[word]?.learned && '✓'}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Tap on words to hear pronunciation and see progress
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Vocabulary Modal */}
      <Dialog open={showVocabModal} onOpenChange={setShowVocabModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              {selectedWord}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">{selectedWord}</div>
              <p className="text-gray-600 mb-4">
                Repetitions: {vocabularyProgress[selectedWord]?.repetitions || 0} / 3
              </p>
              <Progress 
                value={((vocabularyProgress[selectedWord]?.repetitions || 0) / 3) * 100} 
                className="mb-4" 
              />
              <Button 
                onClick={() => handleVocabularyClick(selectedWord)}
                className="w-full"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Play Pronunciation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin/login" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export default App;