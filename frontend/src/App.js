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

// Enhanced Landing Page with RTL support
const LandingPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const direction = getDirection(currentLang);
  
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    document.dir = getDirection(lang);
  };
  
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
        
        <motion.div 
          className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto"
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
// This is getting quite large, so I'll split into multiple parts